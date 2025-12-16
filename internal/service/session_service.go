package service

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/yuqie6/WorkMirror/internal/repository"
	"github.com/yuqie6/WorkMirror/internal/schema"
)

// SessionService 基于事件流切分会话（工程规则优先）
type SessionService struct {
	eventRepo       EventRepository
	diffRepo        DiffRepository
	browserRepo     BrowserEventRepository
	sessionRepo     SessionRepository
	sessionDiffRepo SessionDiffRepository
	cfg             *SessionServiceConfig

	lastSplitAt  atomic.Int64
	splitErrors  atomic.Int64
	lastErrorAt  atomic.Int64
	lastErrorMsg atomic.Value // string
}

// SessionServiceConfig 会话服务配置
type SessionServiceConfig struct {
	IdleGapMinutes    int // 空闲间隔分钟数，超过则切分会话
	MinSessionMinutes int // 会话最小时长（分钟），低于此值且无证据的会话将被过滤
}

// NewSessionService 创建会话服务
func NewSessionService(
	eventRepo EventRepository,
	diffRepo DiffRepository,
	browserRepo BrowserEventRepository,
	sessionRepo SessionRepository,
	sessionDiffRepo SessionDiffRepository,
	cfg *SessionServiceConfig,
) *SessionService {
	if cfg == nil {
		cfg = &SessionServiceConfig{
			IdleGapMinutes:    10, // 增加到10分钟，减少碎片化
			MinSessionMinutes: 2,  // 过滤掉短且无证据的碎片会话
		}
	}
	if cfg.IdleGapMinutes <= 0 {
		cfg.IdleGapMinutes = 10
	}
	if cfg.MinSessionMinutes <= 0 {
		cfg.MinSessionMinutes = 2
	}
	return &SessionService{
		eventRepo:       eventRepo,
		diffRepo:        diffRepo,
		browserRepo:     browserRepo,
		sessionRepo:     sessionRepo,
		sessionDiffRepo: sessionDiffRepo,
		cfg:             cfg,
	}
}

// BuildSessionsIncremental 从最近一次会话结束处增量切分
func (s *SessionService) BuildSessionsIncremental(ctx context.Context) (int, error) {
	last, err := s.sessionRepo.GetLastSession(ctx)
	if err != nil {
		s.noteError(err)
		return 0, err
	}
	start := int64(0)
	if last != nil && last.EndTime > 0 {
		start = last.EndTime
	} else {
		// 冷启动：避免从 0 纪元扫全库，先回溯最近 24h
		start = time.Now().Add(-24 * time.Hour).UnixMilli()
	}
	end := time.Now().UnixMilli()
	created, buildErr := s.BuildSessionsForRange(ctx, start, end)
	if buildErr != nil {
		s.noteError(buildErr)
		return 0, buildErr
	}
	if created > 0 {
		s.lastSplitAt.Store(time.Now().UnixMilli())
	}
	return created, nil
}

// BuildSessionsForDate 按日期全量切分
func (s *SessionService) BuildSessionsForDate(ctx context.Context, date string) (int, error) {
	loc := time.Local
	t, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		return 0, fmt.Errorf("解析日期失败: %w", err)
	}
	start := t.UnixMilli()
	end := t.Add(24*time.Hour).UnixMilli() - 1
	created, err := s.buildSessionsForRange(ctx, start, end, nil)
	if err != nil {
		s.noteError(err)
		return 0, err
	}
	if created > 0 {
		s.lastSplitAt.Store(time.Now().UnixMilli())
	}
	return created, nil
}

// RebuildSessionsForDate 重建某天会话：创建一个更高的切分版本，以“覆盖展示”方式清理旧碎片（不删除旧数据）
func (s *SessionService) RebuildSessionsForDate(ctx context.Context, date string) (int, error) {
	loc := time.Local
	t, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		return 0, fmt.Errorf("解析日期失败: %w", err)
	}
	start := t.UnixMilli()
	end := t.Add(24*time.Hour).UnixMilli() - 1

	targetDate := strings.TrimSpace(date)
	created, err := s.buildSessionsForRange(ctx, start, end, func(d string, max int) int {
		if d == targetDate {
			if max <= 0 {
				return 1
			}
			return max + 1
		}
		if max <= 0 {
			return 1
		}
		return max
	})
	if err != nil {
		s.noteError(err)
		return 0, err
	}
	if created > 0 {
		s.lastSplitAt.Store(time.Now().UnixMilli())
	}
	return created, nil
}

// BuildSessionsForRange 按时间范围切分并写入 sessions 表
func (s *SessionService) BuildSessionsForRange(ctx context.Context, startTime, endTime int64) (int, error) {
	created, err := s.buildSessionsForRange(ctx, startTime, endTime, nil)
	if err != nil {
		s.noteError(err)
		return 0, err
	}
	if created > 0 {
		s.lastSplitAt.Store(time.Now().UnixMilli())
	}
	return created, nil
}

// buildSessionsForRange 内部方法：按时间范围切分会话并写入
func (s *SessionService) buildSessionsForRange(
	ctx context.Context,
	startTime, endTime int64,
	versionStrategy func(date string, maxVersion int) int,
) (int, error) {
	if startTime >= endTime {
		return 0, nil
	}

	events, err := s.eventRepo.GetByTimeRange(ctx, startTime, endTime)
	if err != nil {
		return 0, err
	}
	diffs, err := s.diffRepo.GetByTimeRange(ctx, startTime, endTime)
	if err != nil {
		return 0, err
	}
	browserEvents, err := s.browserRepo.GetByTimeRange(ctx, startTime, endTime)
	if err != nil {
		return 0, err
	}

	sessions := s.splitSessions(events, diffs, startTime, endTime)
	if len(sessions) == 0 {
		return 0, nil
	}

	// 证据归并：diff/browser 仅用于证据，不参与切分（切分只依赖 window + idle gap + diff 活动点）
	s.attachDiffs(sessions, diffs)
	s.attachBrowserEvents(sessions, browserEvents)
	sessions = s.finalizeSessions(events, sessions, startTime, endTime)
	if len(sessions) == 0 {
		return 0, nil
	}
	for _, sess := range sessions {
		if sess == nil {
			continue
		}
		if sess.Metadata == nil {
			sess.Metadata = make(schema.JSONMap)
		}
		diffCount := len(getSessionDiffIDs(sess.Metadata))
		browserCount := len(getSessionBrowserEventIDs(sess.Metadata))
		setSessionMetaString(sess.Metadata, schema.SessionMetaEvidenceHint, EvidenceHintFromCounts(diffCount, browserCount))
		setSessionMetaString(sess.Metadata, schema.SessionMetaSemanticVersion, "v1")
	}

	if err := s.assignSessionVersions(ctx, sessions, versionStrategy); err != nil {
		return 0, err
	}

	created := 0
	for _, sess := range sessions {
		createdNow, err := s.sessionRepo.Create(ctx, sess)
		if err != nil {
			slog.Warn("创建会话失败", "error", err)
			continue
		}
		if !createdNow {
			// 已存在的会话不重复写入证据关联，避免重复数据。
			continue
		}
		if s.sessionDiffRepo != nil && sess.Metadata != nil {
			diffIDs := getSessionDiffIDs(sess.Metadata)
			if len(diffIDs) > 0 {
				_ = s.sessionDiffRepo.BatchInsert(ctx, sess.ID, diffIDs)
			}
		}
		created++
	}
	if created > 0 {
		slog.Info("会话切分完成", "created", created, "start", startTime, "end", endTime)
	}
	return created, nil
}

type SessionServiceStats struct {
	LastSplitAt int64  `json:"last_split_at"`
	SplitErrors int64  `json:"split_errors"`
	LastErrorAt int64  `json:"last_error_at"`
	LastError   string `json:"last_error"`
}

type EvidenceRepairResult struct {
	OrphanDiffs      int `json:"orphan_diffs"`
	OrphanBrowser    int `json:"orphan_browser"`
	AttachedDiffs    int `json:"attached_diffs"`
	AttachedBrowser  int `json:"attached_browser"`
	UpdatedSessions  int `json:"updated_sessions"`
	AttachGapMinutes int `json:"attach_gap_minutes"`
}

func (s *SessionService) Stats() SessionServiceStats {
	if s == nil {
		return SessionServiceStats{}
	}
	raw := s.lastErrorMsg.Load()
	msg, _ := raw.(string)
	return SessionServiceStats{
		LastSplitAt: s.lastSplitAt.Load(),
		SplitErrors: s.splitErrors.Load(),
		LastErrorAt: s.lastErrorAt.Load(),
		LastError:   msg,
	}
}

func (s *SessionService) noteError(err error) {
	if s == nil || err == nil {
		return
	}
	s.splitErrors.Add(1)
	s.lastErrorAt.Store(time.Now().UnixMilli())
	s.lastErrorMsg.Store(err.Error())
}

// RepairEvidenceForDate 尝试把“未归并证据”挂回到最邻近的 Session（不创建新 session、不删除旧数据）。
// v0.3 P0：先解决“Evidence First 断链”与 orphan 指标长期不收敛问题。
func (s *SessionService) RepairEvidenceForDate(ctx context.Context, date string, attachGapMinutes, limit int) (EvidenceRepairResult, error) {
	if s == nil || s.sessionRepo == nil {
		return EvidenceRepairResult{}, nil
	}
	if attachGapMinutes <= 0 {
		attachGapMinutes = 10
	}
	if limit <= 0 {
		limit = 500
	}

	start, end, err := repository.DayRange(date)
	if err != nil {
		return EvidenceRepairResult{}, err
	}

	sessions, err := s.sessionRepo.GetByTimeRange(ctx, start, end)
	if err != nil {
		return EvidenceRepairResult{}, err
	}
	if len(sessions) == 0 {
		return EvidenceRepairResult{AttachGapMinutes: attachGapMinutes}, nil
	}

	type sessRef struct {
		id    int64
		start int64
		end   int64
		meta  schema.JSONMap
	}
	refs := make([]sessRef, 0, len(sessions))
	refDiffIDs := make(map[int64]struct{}, 512)
	refBrowserIDs := make(map[int64]struct{}, 512)
	for _, sess := range sessions {
		meta := sess.Metadata
		refs = append(refs, sessRef{id: sess.ID, start: sess.StartTime, end: sess.EndTime, meta: meta})
		for _, id := range getSessionDiffIDs(meta) {
			if id > 0 {
				refDiffIDs[id] = struct{}{}
			}
		}
		for _, id := range getSessionBrowserEventIDs(meta) {
			if id > 0 {
				refBrowserIDs[id] = struct{}{}
			}
		}
	}

	findBestSession := func(ts int64) (sessRef, int64, bool) {
		var best sessRef
		bestGap := int64(0)
		found := false
		for _, r := range refs {
			if r.id == 0 {
				continue
			}
			gap := int64(0)
			switch {
			case ts < r.start:
				gap = r.start - ts
			case ts > r.end:
				gap = ts - r.end
			default:
				gap = 0
			}
			if !found || gap < bestGap {
				best = r
				bestGap = gap
				found = true
				if bestGap == 0 {
					break
				}
			}
		}
		return best, bestGap, found
	}

	gapMs := int64(attachGapMinutes) * 60 * 1000
	updatedMeta := make(map[int64]schema.JSONMap, 16)
	addedDiffIDs := make(map[int64][]int64, 16)

	result := EvidenceRepairResult{AttachGapMinutes: attachGapMinutes}

	if s.diffRepo != nil {
		diffs, err := s.diffRepo.GetByTimeRange(ctx, start, end)
		if err != nil {
			return EvidenceRepairResult{}, err
		}
		for _, d := range diffs {
			if d.ID <= 0 {
				continue
			}
			if _, ok := refDiffIDs[d.ID]; ok {
				continue
			}
			result.OrphanDiffs++
			if limit > 0 && result.AttachedDiffs >= limit {
				continue
			}
			best, gap, ok := findBestSession(d.Timestamp)
			if !ok || gap > gapMs {
				continue
			}
			meta := updatedMeta[best.id]
			if meta == nil {
				meta = best.meta
				if meta == nil {
					meta = make(schema.JSONMap)
				}
			}
			ids := append(getSessionDiffIDs(meta), d.ID)
			setSessionDiffIDs(meta, ids)
			setSessionMetaString(meta, schema.SessionMetaEvidenceHint, EvidenceHintFromCounts(len(getSessionDiffIDs(meta)), len(getSessionBrowserEventIDs(meta))))
			setSessionMetaString(meta, schema.SessionMetaSemanticVersion, "v1")
			updatedMeta[best.id] = meta
			addedDiffIDs[best.id] = append(addedDiffIDs[best.id], d.ID)
			refDiffIDs[d.ID] = struct{}{}
			result.AttachedDiffs++
		}
	}

	if s.browserRepo != nil {
		events, err := s.browserRepo.GetByTimeRange(ctx, start, end)
		if err != nil {
			return EvidenceRepairResult{}, err
		}
		for _, e := range events {
			if e.ID <= 0 {
				continue
			}
			if _, ok := refBrowserIDs[e.ID]; ok {
				continue
			}
			result.OrphanBrowser++
			if limit > 0 && (result.AttachedDiffs+result.AttachedBrowser) >= limit {
				continue
			}
			best, gap, ok := findBestSession(e.Timestamp)
			if !ok || gap > gapMs {
				continue
			}
			meta := updatedMeta[best.id]
			if meta == nil {
				meta = best.meta
				if meta == nil {
					meta = make(schema.JSONMap)
				}
			}
			ids := append(getSessionBrowserEventIDs(meta), e.ID)
			setSessionBrowserEventIDs(meta, ids)
			setSessionMetaString(meta, schema.SessionMetaEvidenceHint, EvidenceHintFromCounts(len(getSessionDiffIDs(meta)), len(getSessionBrowserEventIDs(meta))))
			setSessionMetaString(meta, schema.SessionMetaSemanticVersion, "v1")
			updatedMeta[best.id] = meta
			refBrowserIDs[e.ID] = struct{}{}
			result.AttachedBrowser++
		}
	}

	for sessionID, meta := range updatedMeta {
		if sessionID == 0 || meta == nil {
			continue
		}
		if err := s.sessionRepo.UpdateSemantic(ctx, sessionID, schema.SessionSemanticUpdate{Metadata: meta}); err != nil {
			return EvidenceRepairResult{}, err
		}
		if s.sessionDiffRepo != nil {
			if ids := addedDiffIDs[sessionID]; len(ids) > 0 {
				_ = s.sessionDiffRepo.BatchInsert(ctx, sessionID, ids)
			}
		}
		result.UpdatedSessions++
	}

	return result, nil
}

// assignSessionVersions 为会话分配切分版本号
func (s *SessionService) assignSessionVersions(
	ctx context.Context,
	sessions []*schema.Session,
	versionStrategy func(date string, maxVersion int) int,
) error {
	if len(sessions) == 0 || s.sessionRepo == nil {
		return nil
	}
	if versionStrategy == nil {
		versionStrategy = func(_ string, max int) int {
			if max <= 0 {
				return 1
			}
			return max
		}
	}

	uniqueDates := make(map[string]struct{}, 2)
	for _, sess := range sessions {
		if sess == nil {
			continue
		}
		d := strings.TrimSpace(sess.Date)
		if d == "" {
			d = formatDate(sess.StartTime)
			sess.Date = d
		}
		uniqueDates[d] = struct{}{}
	}

	maxByDate := make(map[string]int, len(uniqueDates))
	for d := range uniqueDates {
		maxV, err := s.sessionRepo.GetMaxSessionVersionByDate(ctx, d)
		if err != nil {
			return err
		}
		maxByDate[d] = maxV
	}

	for _, sess := range sessions {
		if sess == nil {
			continue
		}
		d := strings.TrimSpace(sess.Date)
		if d == "" {
			d = formatDate(sess.StartTime)
			sess.Date = d
		}
		sess.SessionVersion = versionStrategy(d, maxByDate[d])
		if sess.SessionVersion <= 0 {
			sess.SessionVersion = 1
		}
	}
	return nil
}

// splitSessions 根据空闲间隔切分会话
func (s *SessionService) splitSessions(events []schema.Event, diffs []schema.Diff, startTime, endTime int64) []*schema.Session {
	idleMs := int64(s.cfg.IdleGapMinutes) * 60 * 1000

	// 确保按时间排序
	sort.Slice(events, func(i, j int) bool { return events[i].Timestamp < events[j].Timestamp })
	sort.Slice(diffs, func(i, j int) bool { return diffs[i].Timestamp < diffs[j].Timestamp })

	// 没有 window events 时不切分：避免仅靠 diff 产生“碎片会话”，且 window 事件可能是晚到数据。
	if len(events) == 0 {
		return nil
	}

	clamp := func(v, lo, hi int64) int64 {
		if v < lo {
			return lo
		}
		if v > hi {
			return hi
		}
		return v
	}

	var sessions []*schema.Session

	var currentStart int64
	var lastActivityEnd int64
	hasWindow := false

	openSession := func(start int64) {
		start = clamp(start, startTime, endTime)
		if start <= 0 || start > endTime {
			currentStart = 0
			lastActivityEnd = 0
			hasWindow = false
			return
		}
		currentStart = start
		lastActivityEnd = start
		hasWindow = false
	}

	closeSession := func(end int64) {
		if currentStart == 0 {
			return
		}
		end = clamp(end, startTime, endTime)
		if end <= currentStart {
			currentStart = 0
			hasWindow = false
			return
		}
		// 不产生纯 diff 会话：window 事件是会话锚点，否则容易因事件晚到导致碎片化/重复。
		if !hasWindow {
			currentStart = 0
			hasWindow = false
			return
		}

		sessions = append(sessions, &schema.Session{
			StartTime: currentStart,
			EndTime:   end,
			Metadata:  make(schema.JSONMap),
		})
		currentStart = 0
		hasWindow = false
	}

	handleDiff := func(ts int64) {
		if ts <= 0 {
			return
		}
		if ts < startTime || ts > endTime {
			return
		}
		if currentStart == 0 {
			openSession(ts)
		} else if ts < currentStart && currentStart-ts <= idleMs {
			// 允许 diff 轻微“提前”到第一个 window event 之前（例如窗口事件晚到/边界截断）。
			currentStart = ts
		} else if ts-lastActivityEnd >= idleMs {
			closeSession(lastActivityEnd)
			openSession(ts)
		}
		if ts > lastActivityEnd {
			lastActivityEnd = ts
		}
	}

	openSession(events[0].Timestamp)
	diffIdx := 0

	for _, ev := range events {
		evStart := clamp(ev.Timestamp, startTime, endTime)
		evEnd := clamp(ev.Timestamp+int64(ev.Duration)*1000, startTime, endTime)
		if evEnd <= evStart {
			continue
		}

		// 先处理落在当前窗口开始前的 diffs（可能在 idle gap 内）
		for diffIdx < len(diffs) && diffs[diffIdx].Timestamp < evStart {
			handleDiff(diffs[diffIdx].Timestamp)
			diffIdx++
		}

		// idle hard boundary（不产生 idle session）
		if evStart-lastActivityEnd >= idleMs {
			closeSession(lastActivityEnd)
			openSession(evStart)
		} else if currentStart == 0 {
			openSession(evStart)
		}

		hasWindow = true
		if evEnd > lastActivityEnd {
			lastActivityEnd = evEnd
		}
	}

	// 处理剩余 diffs（在最后窗口之后）
	for diffIdx < len(diffs) {
		handleDiff(diffs[diffIdx].Timestamp)
		diffIdx++
	}

	closeSession(lastActivityEnd)
	return sessions
}

func (s *SessionService) attachDiffs(sessions []*schema.Session, diffs []schema.Diff) {
	if len(sessions) == 0 || len(diffs) == 0 {
		return
	}
	sort.Slice(diffs, func(i, j int) bool { return diffs[i].Timestamp < diffs[j].Timestamp })
	sort.Slice(sessions, func(i, j int) bool { return sessions[i].StartTime < sessions[j].StartTime })

	sessIdx := 0
	for _, d := range diffs {
		if d.ID <= 0 || d.Timestamp <= 0 {
			continue
		}
		for sessIdx < len(sessions) && d.Timestamp > sessions[sessIdx].EndTime {
			sessIdx++
		}
		if sessIdx >= len(sessions) {
			break
		}
		sess := sessions[sessIdx]
		if sess == nil {
			continue
		}
		if d.Timestamp < sess.StartTime || d.Timestamp > sess.EndTime {
			continue
		}
		if sess.Metadata == nil {
			sess.Metadata = make(schema.JSONMap)
		}
		raw := getSessionDiffIDs(sess.Metadata)
		raw = append(raw, d.ID)
		setSessionDiffIDs(sess.Metadata, raw)
	}
}

func (s *SessionService) finalizeSessions(events []schema.Event, sessions []*schema.Session, startTime, endTime int64) []*schema.Session {
	if len(sessions) == 0 {
		return nil
	}
	minDurationMs := int64(s.cfg.MinSessionMinutes) * 60 * 1000

	// 先做基础清理与过滤（避免短且无证据的碎片会话污染主链路）
	cleaned := sessions[:0]
	for _, sess := range sessions {
		if sess == nil {
			continue
		}
		if sess.StartTime <= 0 || sess.EndTime <= 0 || sess.EndTime <= sess.StartTime {
			continue
		}
		if sess.StartTime < startTime {
			sess.StartTime = startTime
		}
		if sess.EndTime > endTime {
			sess.EndTime = endTime
		}
		if sess.EndTime <= sess.StartTime {
			continue
		}
		if sess.Metadata == nil {
			sess.Metadata = make(schema.JSONMap)
		}
		hasDiff := len(getSessionDiffIDs(sess.Metadata)) > 0
		hasBrowser := len(getSessionBrowserEventIDs(sess.Metadata)) > 0
		hasEvidence := hasDiff || hasBrowser

		duration := sess.EndTime - sess.StartTime
		if duration < minDurationMs && !hasEvidence {
			continue
		}
		cleaned = append(cleaned, sess)
	}
	if len(cleaned) == 0 {
		return nil
	}

	s.fillPrimaryApp(cleaned, events)

	// 补齐派生字段并做最终兜底过滤（避免 primary_app 与证据都为空的“空洞会话”）
	out := cleaned[:0]
	for _, sess := range cleaned {
		if sess == nil {
			continue
		}
		hasDiff := len(getSessionDiffIDs(sess.Metadata)) > 0
		hasBrowser := len(getSessionBrowserEventIDs(sess.Metadata)) > 0
		hasEvidence := hasDiff || hasBrowser
		if strings.TrimSpace(sess.PrimaryApp) == "" && !hasEvidence {
			continue
		}
		sess.Date = formatDate(sess.StartTime)
		sess.TimeRange = FormatTimeRangeMs(sess.StartTime, sess.EndTime)
		out = append(out, sess)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartTime < out[j].StartTime })
	return out
}

func (s *SessionService) fillPrimaryApp(sessions []*schema.Session, events []schema.Event) {
	if len(sessions) == 0 || len(events) == 0 {
		return
	}
	sort.Slice(sessions, func(i, j int) bool { return sessions[i].StartTime < sessions[j].StartTime })
	sort.Slice(events, func(i, j int) bool { return events[i].Timestamp < events[j].Timestamp })

	secRounded := func(ms int64) int {
		if ms <= 0 {
			return 0
		}
		return int((ms + 500) / 1000)
	}

	durBySess := make([]map[string]int, len(sessions))
	cntBySess := make([]map[string]int, len(sessions))

	sessIdx := 0
	for _, ev := range events {
		if ev.Timestamp <= 0 || strings.TrimSpace(ev.AppName) == "" || ev.Duration <= 0 {
			continue
		}
		evStart := ev.Timestamp
		evEndExcl := ev.Timestamp + int64(ev.Duration)*1000
		if evEndExcl <= evStart {
			continue
		}

		for sessIdx < len(sessions) && evStart > sessions[sessIdx].EndTime {
			sessIdx++
		}
		if sessIdx >= len(sessions) {
			break
		}

		for i := sessIdx; i < len(sessions); i++ {
			sess := sessions[i]
			if sess == nil {
				continue
			}
			// sessions 已按 start_time 升序且不重叠，event 不可能与更晚的 session 相交
			if evEndExcl <= sess.StartTime {
				break
			}
			if evStart > sess.EndTime {
				continue
			}

			// 计算与会话区间的重叠秒数（会话 end 为闭区间，因此 +1 转半开区间）
			sessStart := sess.StartTime
			sessEndExcl := sess.EndTime + 1
			overlapStart := evStart
			if sessStart > overlapStart {
				overlapStart = sessStart
			}
			overlapEnd := evEndExcl
			if sessEndExcl < overlapEnd {
				overlapEnd = sessEndExcl
			}
			overlapMs := overlapEnd - overlapStart
			if overlapMs <= 0 {
				continue
			}

			if durBySess[i] == nil {
				durBySess[i] = make(map[string]int)
			}
			if cntBySess[i] == nil {
				cntBySess[i] = make(map[string]int)
			}
			durBySess[i][ev.AppName] += secRounded(overlapMs)
			cntBySess[i][ev.AppName]++

			// event 不跨会话（collector maxDuration=60s，且会话之间有 idle gap），提前结束内层扫描
			break
		}
	}

	for i, sess := range sessions {
		if sess == nil {
			continue
		}
		durMap := durBySess[i]
		cntMap := cntBySess[i]
		if len(durMap) == 0 && len(cntMap) == 0 {
			continue
		}

		type cand struct {
			app string
			dur int
			cnt int
		}
		cands := make([]cand, 0, len(durMap)+len(cntMap))
		seen := make(map[string]struct{}, len(durMap)+len(cntMap))
		for app, dur := range durMap {
			seen[app] = struct{}{}
			cands = append(cands, cand{app: app, dur: dur, cnt: cntMap[app]})
		}
		for app, cnt := range cntMap {
			if _, ok := seen[app]; ok {
				continue
			}
			cands = append(cands, cand{app: app, dur: durMap[app], cnt: cnt})
		}
		sort.Slice(cands, func(i, j int) bool {
			if cands[i].dur != cands[j].dur {
				return cands[i].dur > cands[j].dur
			}
			if cands[i].cnt != cands[j].cnt {
				return cands[i].cnt > cands[j].cnt
			}
			return cands[i].app < cands[j].app
		})
		if len(cands) > 0 && strings.TrimSpace(cands[0].app) != "" {
			sess.PrimaryApp = cands[0].app
		}
	}
}

// attachBrowserEvents 将浏览器事件绑定到对应的会话
func (s *SessionService) attachBrowserEvents(sessions []*schema.Session, events []schema.BrowserEvent) {
	if len(sessions) == 0 || len(events) == 0 {
		return
	}
	sort.Slice(events, func(i, j int) bool { return events[i].Timestamp < events[j].Timestamp })

	sessIdx := 0
	for _, be := range events {
		for sessIdx < len(sessions) && be.Timestamp > sessions[sessIdx].EndTime {
			sessIdx++
		}
		if sessIdx >= len(sessions) {
			break
		}
		sess := sessions[sessIdx]
		if be.Timestamp < sess.StartTime || be.Timestamp > sess.EndTime {
			continue
		}
		if sess.Metadata == nil {
			sess.Metadata = make(schema.JSONMap)
		}
		raw := getSessionBrowserEventIDs(sess.Metadata)
		raw = append(raw, be.ID)
		setSessionBrowserEventIDs(sess.Metadata, raw)
	}
}

// formatDate 将时间戳格式化为日期字符串
func formatDate(ts int64) string {
	return time.UnixMilli(ts).Format("2006-01-02")
}
