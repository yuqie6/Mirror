package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/yuqie6/mirror/internal/model"
)

// DailySummaryDTO 每日总结 DTO
type DailySummaryDTO struct {
	Date         string   `json:"date"`
	Summary      string   `json:"summary"`
	Highlights   string   `json:"highlights"`
	Struggles    string   `json:"struggles"`
	SkillsGained []string `json:"skills_gained"`
	TotalCoding  int      `json:"total_coding"`
	TotalDiffs   int      `json:"total_diffs"`
}

// GetTodaySummary 获取今日总结
func (a *App) GetTodaySummary() (*DailySummaryDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	// 添加超时防止长时间阻塞
	ctx, cancel := context.WithTimeout(a.ctx, 30*time.Second)
	defer cancel()

	if a.core == nil || a.core.Services.AI == nil {
		return nil, errors.New("AI 服务未初始化，请检查配置与数据库")
	}

	today := time.Now().Format("2006-01-02")
	summary, err := a.core.Services.AI.GenerateDailySummary(ctx, today)
	if err != nil {
		return nil, err
	}

	return &DailySummaryDTO{
		Date:         summary.Date,
		Summary:      summary.Summary,
		Highlights:   summary.Highlights,
		Struggles:    summary.Struggles,
		SkillsGained: summary.SkillsGained,
		TotalCoding:  summary.TotalCoding,
		TotalDiffs:   summary.TotalDiffs,
	}, nil
}

// SummaryIndexDTO 日报索引（用于历史侧边栏）
type SummaryIndexDTO struct {
	Date       string `json:"date"`
	HasSummary bool   `json:"has_summary"`
	Preview    string `json:"preview"` // 摘要前40字
}

// ListSummaryIndex 获取所有已生成的日报索引（只返回有数据的日期）
func (a *App) ListSummaryIndex(limit int) ([]SummaryIndexDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Repos.Summary == nil {
		return nil, errors.New("总结仓储未初始化")
	}
	if limit <= 0 {
		limit = 365 // 最多一年
	}

	ctx, cancel := context.WithTimeout(a.ctx, 5*time.Second)
	defer cancel()

	// 只获取已生成日报的预览（按日期倒序）
	previews, err := a.core.Repos.Summary.ListSummaryPreviews(ctx, limit)
	if err != nil {
		return nil, err
	}

	// 只返回有数据的日期
	result := make([]SummaryIndexDTO, 0, len(previews))
	for _, p := range previews {
		result = append(result, SummaryIndexDTO{
			Date:       p.Date,
			HasSummary: true,
			Preview:    p.Preview,
		})
	}
	return result, nil
}

// GetDailySummary 获取指定日期总结（优先读取缓存，必要时生成）
func (a *App) GetDailySummary(date string) (*DailySummaryDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	ctx, cancel := context.WithTimeout(a.ctx, 30*time.Second)
	defer cancel()

	if a.core == nil || a.core.Services.AI == nil {
		return nil, errors.New("AI 服务未初始化，请检查配置与数据库")
	}
	if date == "" {
		return nil, errors.New("date 不能为空")
	}

	summary, err := a.core.Services.AI.GenerateDailySummary(ctx, date)
	if err != nil {
		return nil, err
	}

	return &DailySummaryDTO{
		Date:         summary.Date,
		Summary:      summary.Summary,
		Highlights:   summary.Highlights,
		Struggles:    summary.Struggles,
		SkillsGained: summary.SkillsGained,
		TotalCoding:  summary.TotalCoding,
		TotalDiffs:   summary.TotalDiffs,
	}, nil
}

// PeriodSummaryDTO 阶段汇总 DTO
type PeriodSummaryDTO struct {
	Type         string   `json:"type"` // "week" | "month"
	StartDate    string   `json:"start_date"`
	EndDate      string   `json:"end_date"`
	Overview     string   `json:"overview"`
	Achievements []string `json:"achievements"`
	Patterns     string   `json:"patterns"`
	Suggestions  string   `json:"suggestions"`
	TopSkills    []string `json:"top_skills"`
	TotalCoding  int      `json:"total_coding"`
	TotalDiffs   int      `json:"total_diffs"`
}

func normalizeToMonday(t time.Time) time.Time {
	dayStart := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
	weekday := int(dayStart.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return dayStart.AddDate(0, 0, -(weekday - 1))
}

func normalizeToMonthStart(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

// GetPeriodSummary 生成周/月汇总（带缓存，月汇总基于周汇总）
// startDate 可选：指定起始日期，为空则使用当前周/月
func (a *App) GetPeriodSummary(periodType string, startDateStr string) (*PeriodSummaryDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Services.AI == nil {
		return nil, errors.New("AI 服务未初始化")
	}

	ctx, cancel := context.WithTimeout(a.ctx, 90*time.Second)
	defer cancel()

	// 确定时间范围
	var startDate, endDate time.Time
	now := time.Now()

	if startDateStr != "" {
		// 使用指定日期
		parsed, err := time.ParseInLocation("2006-01-02", startDateStr, now.Location())
		if err != nil {
			return nil, errors.New("日期格式错误，请使用 YYYY-MM-DD")
		}
		startDate = parsed
	}

	switch periodType {
	case "week":
		if startDateStr == "" {
			startDate = now
		}
		startDate = normalizeToMonday(startDate)
		if startDate.After(now) {
			return nil, errors.New("startDate 不能是未来日期")
		}
		// 自然周周日为结束（用于稳定缓存 key）
		endDate = startDate.AddDate(0, 0, 6)
	case "month":
		if startDateStr == "" {
			startDate = now
		}
		startDate = normalizeToMonthStart(startDate)
		if startDate.After(now) {
			return nil, errors.New("startDate 不能是未来日期")
		}
		// 自然月月末为结束（用于稳定缓存 key）
		endDate = startDate.AddDate(0, 1, -1)
	default:
		return nil, errors.New("不支持的周期类型，请使用 week 或 month")
	}

	startStr := startDate.Format("2006-01-02")
	endStr := endDate.Format("2006-01-02")

	// 实际数据截止日期（避免未来日期）
	dataEnd := endDate
	if dataEnd.After(now) {
		dataEnd = now
	}
	dataEndStr := dataEnd.Format("2006-01-02")

	// 检查缓存（自然周期维度 key）
	if a.core.Repos.PeriodSummary != nil {
		cached, err := a.core.Repos.PeriodSummary.GetByTypeAndRange(ctx, periodType, startStr, endStr, 365*24*time.Hour)
		if err == nil && cached != nil {
			return a.periodSummaryToDTO(cached), nil
		}
	}

	// 周/月汇总：从日报生成
	summaries, err := a.core.Repos.Summary.GetByDateRange(ctx, startStr, dataEndStr)
	if err != nil {
		return nil, err
	}

	if len(summaries) == 0 {
		return nil, errors.New("该周期内没有日报数据")
	}

	var totalCoding, totalDiffs int
	for _, s := range summaries {
		totalCoding += s.TotalCoding
		totalDiffs += s.TotalDiffs
	}

	aiResult, err := a.core.Services.AI.GeneratePeriodSummary(ctx, startStr, dataEndStr, summaries)
	if err != nil {
		return nil, err
	}

	overview := aiResult.Overview
	if dataEndStr != endStr {
		overview = fmt.Sprintf("（截至 %s）%s", dataEndStr, overview)
	}

	result := &PeriodSummaryDTO{
		Type:         periodType,
		StartDate:    startStr,
		EndDate:      endStr,
		Overview:     overview,
		Achievements: aiResult.Achievements,
		Patterns:     aiResult.Patterns,
		Suggestions:  aiResult.Suggestions,
		TopSkills:    aiResult.TopSkills,
		TotalCoding:  totalCoding,
		TotalDiffs:   totalDiffs,
	}

	// 保存到缓存
	a.savePeriodSummary(ctx, result)

	return result, nil
}

func (a *App) periodSummaryToDTO(ps *model.PeriodSummary) *PeriodSummaryDTO {
	return &PeriodSummaryDTO{
		Type:         ps.Type,
		StartDate:    ps.StartDate,
		EndDate:      ps.EndDate,
		Overview:     ps.Overview,
		Achievements: []string(ps.Achievements),
		Patterns:     ps.Patterns,
		Suggestions:  ps.Suggestions,
		TopSkills:    []string(ps.TopSkills),
		TotalCoding:  ps.TotalCoding,
		TotalDiffs:   ps.TotalDiffs,
	}
}

func (a *App) savePeriodSummary(ctx context.Context, dto *PeriodSummaryDTO) {
	if a.core.Repos.PeriodSummary == nil {
		return
	}
	_ = a.core.Repos.PeriodSummary.Upsert(ctx, &model.PeriodSummary{
		Type:         dto.Type,
		StartDate:    dto.StartDate,
		EndDate:      dto.EndDate,
		Overview:     dto.Overview,
		Achievements: model.JSONArray(dto.Achievements),
		Patterns:     dto.Patterns,
		Suggestions:  dto.Suggestions,
		TopSkills:    model.JSONArray(dto.TopSkills),
		TotalCoding:  dto.TotalCoding,
		TotalDiffs:   dto.TotalDiffs,
	})
}

// PeriodSummaryIndexDTO 历史汇总索引
type PeriodSummaryIndexDTO struct {
	Type      string `json:"type"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

// ListPeriodSummaryIndex 获取历史周/月汇总列表
func (a *App) ListPeriodSummaryIndex(periodType string, limit int) ([]PeriodSummaryIndexDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Repos.PeriodSummary == nil {
		return nil, errors.New("仓储未初始化")
	}
	if limit <= 0 {
		limit = 20
	}

	ctx, cancel := context.WithTimeout(a.ctx, 5*time.Second)
	defer cancel()

	summaries, err := a.core.Repos.PeriodSummary.ListByType(ctx, periodType, limit)
	if err != nil {
		return nil, err
	}

	result := make([]PeriodSummaryIndexDTO, 0, len(summaries))
	for _, s := range summaries {
		result = append(result, PeriodSummaryIndexDTO{
			Type:      s.Type,
			StartDate: s.StartDate,
			EndDate:   s.EndDate,
		})
	}
	return result, nil
}
