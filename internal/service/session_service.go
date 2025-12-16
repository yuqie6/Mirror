package service

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync/atomic"
	"time"

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
		// 增量构建也回溯一小段时间：吸收“晚到证据”（窗口/浏览等）并减少 orphan。
		start = last.EndTime - s.incrementalLookbackMs()
		if start < 0 {
			start = 0
		}
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

	sessions := s.splitSessions(events, diffs, browserEvents, startTime, endTime)
	if len(sessions) == 0 {
		return 0, nil
	}

	// 证据归并：diff/browser 作为“活动点”参与切分，同时也写入证据索引（用于 drill-down 与报告追溯）。
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
		if createdNow {
			if s.sessionDiffRepo != nil && sess.Metadata != nil {
				diffIDs := getSessionDiffIDs(sess.Metadata)
				if len(diffIDs) > 0 {
					_ = s.sessionDiffRepo.BatchInsert(ctx, sess.ID, diffIDs)
				}
			}
			created++
			continue
		}
		// 已存在会话：合并“晚到证据”到 metadata（避免 Evidence First 断链）。
		if err := s.mergeEvidenceMetadata(ctx, sess); err != nil {
			slog.Debug("合并会话证据失败（跳过）", "id", sess.ID, "error", err)
		}
	}
	if created > 0 {
		slog.Info("会话切分完成", "created", created, "start", startTime, "end", endTime)
	}
	return created, nil
}

func (s *SessionService) incrementalLookbackMs() int64 {
	if s == nil || s.cfg == nil {
		return 0
	}
	// KISS：回溯窗口用于吸收晚到证据；上限避免扫描过大。
	minMins := 30
	maxMins := 180
	minFromIdle := s.cfg.IdleGapMinutes * 2
	if minFromIdle < minMins {
		minFromIdle = minMins
	}
	if minFromIdle > maxMins {
		minFromIdle = maxMins
	}
	return int64(minFromIdle) * 60 * 1000
}

type SessionServiceStats struct {
	LastSplitAt int64  `json:"last_split_at"`
	SplitErrors int64  `json:"split_errors"`
	LastErrorAt int64  `json:"last_error_at"`
	LastError   string `json:"last_error"`
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
func (s *SessionService) splitSessions(events []schema.Event, diffs []schema.Diff, browserEvents []schema.BrowserEvent, startTime, endTime int64) []*schema.Session {
	idleMs := int64(s.cfg.IdleGapMinutes) * 60 * 1000

	// 确保按时间排序
	sort.Slice(events, func(i, j int) bool { return events[i].Timestamp < events[j].Timestamp })
	sort.Slice(diffs, func(i, j int) bool { return diffs[i].Timestamp < diffs[j].Timestamp })
	sort.Slice(browserEvents, func(i, j int) bool { return browserEvents[i].Timestamp < browserEvents[j].Timestamp })

	// 没有任何证据则不产生会话。
	if len(events) == 0 && len(diffs) == 0 && len(browserEvents) == 0 {
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

	openSession := func(start int64) {
		start = clamp(start, startTime, endTime)
		if start <= 0 || start > endTime {
			currentStart = 0
			lastActivityEnd = 0
			return
		}
		currentStart = start
		lastActivityEnd = start
	}

	closeSession := func(end int64) {
		if currentStart == 0 {
			return
		}
		end = clamp(end, startTime, endTime)
		if end <= currentStart {
			// 纯瞬时证据（单 diff / 单 URL）也需要一个合法区间，便于落库与 UI 展示。
			// endTime 为闭区间上限，因此 +1 后仍需 clamp。
			end = clamp(currentStart+1000, startTime, endTime)
		}
		if end <= currentStart {
			currentStart = 0
			return
		}

		sessions = append(sessions, &schema.Session{
			StartTime: currentStart,
			EndTime:   end,
			Metadata:  make(schema.JSONMap),
		})
		currentStart = 0
	}

	handleActivity := func(ts, end int64) {
		if ts <= 0 {
			return
		}
		if ts < startTime || ts > endTime {
			return
		}
		if currentStart == 0 {
			openSession(ts)
		} else if ts-lastActivityEnd >= idleMs {
			closeSession(lastActivityEnd)
			openSession(ts)
		}
		if end > lastActivityEnd {
			lastActivityEnd = end
		}
	}

	const maxInt64 = int64(^uint64(0) >> 1)
	iEv, iDiff, iBrowser := 0, 0, 0

	for {
		nextEv := maxInt64
		if iEv < len(events) {
			nextEv = events[iEv].Timestamp
		}
		nextDiff := maxInt64
		if iDiff < len(diffs) {
			nextDiff = diffs[iDiff].Timestamp
		}
		nextBrowser := maxInt64
		if iBrowser < len(browserEvents) {
			nextBrowser = browserEvents[iBrowser].Timestamp
		}

		if nextEv == maxInt64 && nextDiff == maxInt64 && nextBrowser == maxInt64 {
			break
		}

		switch {
		case nextEv <= nextDiff && nextEv <= nextBrowser:
			ev := events[iEv]
			iEv++
			evStart := clamp(ev.Timestamp, startTime, endTime)
			evEnd := clamp(ev.Timestamp+int64(ev.Duration)*1000, startTime, endTime)
			if evEnd < evStart {
				continue
			}
			// duration=0 的 window event 视为瞬时活动点
			handleActivity(evStart, evEnd)

		case nextDiff <= nextBrowser:
			d := diffs[iDiff]
			iDiff++
			ts := clamp(d.Timestamp, startTime, endTime)
			handleActivity(ts, ts)

		default:
			be := browserEvents[iBrowser]
			iBrowser++
			ts := clamp(be.Timestamp, startTime, endTime)
			handleActivity(ts, ts)
		}
	}

	closeSession(lastActivityEnd)
	return sessions
}

func (s *SessionService) mergeEvidenceMetadata(ctx context.Context, sess *schema.Session) error {
	if s == nil || s.sessionRepo == nil || sess == nil || sess.ID == 0 || sess.Metadata == nil {
		return nil
	}
	existing, err := s.sessionRepo.GetByID(ctx, sess.ID)
	if err != nil || existing == nil {
		return err
	}
	merged := existing.Metadata
	if merged == nil {
		merged = make(schema.JSONMap)
	}

	curDiff := getSessionDiffIDs(merged)
	curBrowser := getSessionBrowserEventIDs(merged)

	newDiff := getSessionDiffIDs(sess.Metadata)
	newBrowser := getSessionBrowserEventIDs(sess.Metadata)

	changed := false
	if len(newDiff) > 0 {
		seen := make(map[int64]struct{}, len(curDiff))
		for _, id := range curDiff {
			if id > 0 {
				seen[id] = struct{}{}
			}
		}
		for _, id := range newDiff {
			if id <= 0 {
				continue
			}
			if _, ok := seen[id]; !ok {
				changed = true
				break
			}
		}
	}
	if !changed && len(newBrowser) > 0 {
		seen := make(map[int64]struct{}, len(curBrowser))
		for _, id := range curBrowser {
			if id > 0 {
				seen[id] = struct{}{}
			}
		}
		for _, id := range newBrowser {
			if id <= 0 {
				continue
			}
			if _, ok := seen[id]; !ok {
				changed = true
				break
			}
		}
	}
	if !changed {
		return nil
	}

	setSessionDiffIDs(merged, append(curDiff, newDiff...))
	setSessionBrowserEventIDs(merged, append(curBrowser, newBrowser...))
	setSessionMetaString(merged, schema.SessionMetaEvidenceHint, EvidenceHintFromCounts(len(getSessionDiffIDs(merged)), len(getSessionBrowserEventIDs(merged))))
	return s.sessionRepo.UpdateSemantic(ctx, sess.ID, schema.SessionSemanticUpdate{Metadata: merged})
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
