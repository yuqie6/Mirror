package main

import (
	"errors"
	"time"

	"github.com/yuqie6/mirror/internal/service"
)

// TrendReportDTO 趋势报告 DTO
type TrendReportDTO struct {
	Period          string             `json:"period"`
	StartDate       string             `json:"start_date"`
	EndDate         string             `json:"end_date"`
	TotalDiffs      int64              `json:"total_diffs"`
	TotalCodingMins int64              `json:"total_coding_mins"`
	AvgDiffsPerDay  float64            `json:"avg_diffs_per_day"`
	TopLanguages    []LanguageTrendDTO `json:"top_languages"`
	TopSkills       []SkillTrendDTO    `json:"top_skills"`
	Bottlenecks     []string           `json:"bottlenecks"`
}

// LanguageTrendDTO 语言趋势 DTO
type LanguageTrendDTO struct {
	Language   string  `json:"language"`
	DiffCount  int64   `json:"diff_count"`
	Percentage float64 `json:"percentage"`
}

// SkillTrendDTO 技能趋势 DTO
type SkillTrendDTO struct {
	SkillName  string `json:"skill_name"`
	Status     string `json:"status"`
	DaysActive int    `json:"days_active"`
}

// GetTrends 获取趋势报告
func (a *App) GetTrends(days int) (*TrendReportDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Services.Trends == nil {
		return nil, errors.New("趋势服务未初始化")
	}

	period := service.TrendPeriod7Days
	if days == 30 {
		period = service.TrendPeriod30Days
	}

	report, err := a.core.Services.Trends.GetTrendReport(a.ctx, period)
	if err != nil {
		return nil, err
	}

	languages := make([]LanguageTrendDTO, len(report.TopLanguages))
	for i, l := range report.TopLanguages {
		languages[i] = LanguageTrendDTO{
			Language:   l.Language,
			DiffCount:  l.DiffCount,
			Percentage: l.Percentage,
		}
	}

	skills := make([]SkillTrendDTO, len(report.TopSkills))
	for i, s := range report.TopSkills {
		skills[i] = SkillTrendDTO{
			SkillName:  s.SkillName,
			Status:     s.Status,
			DaysActive: s.DaysActive,
		}
	}

	return &TrendReportDTO{
		Period:          string(report.Period),
		StartDate:       report.StartDate,
		EndDate:         report.EndDate,
		TotalDiffs:      report.TotalDiffs,
		TotalCodingMins: report.TotalCodingMins,
		AvgDiffsPerDay:  report.AvgDiffsPerDay,
		TopLanguages:    languages,
		TopSkills:       skills,
		Bottlenecks:     report.Bottlenecks,
	}, nil
}

// AppStatsDTO 应用统计 DTO
type AppStatsDTO struct {
	AppName       string `json:"app_name"`
	TotalDuration int    `json:"total_duration"`
	EventCount    int64  `json:"event_count"`
	IsCodeEditor  bool   `json:"is_code_editor"`
}

// GetAppStats 获取应用统计
func (a *App) GetAppStats() ([]AppStatsDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	now := time.Now()
	startTime := now.AddDate(0, 0, -7).UnixMilli()
	endTime := now.UnixMilli()

	if a.core == nil {
		return nil, errors.New("数据库未初始化")
	}

	stats, err := a.core.Repos.Event.GetAppStats(a.ctx, startTime, endTime)
	if err != nil {
		return nil, err
	}

	result := make([]AppStatsDTO, len(stats))
	for i, s := range stats {
		result[i] = AppStatsDTO{
			AppName:       s.AppName,
			TotalDuration: s.TotalDuration,
			EventCount:    s.EventCount,
			IsCodeEditor:  service.IsCodeEditor(s.AppName),
		}
	}
	return result, nil
}

// DiffDetailDTO Diff 详情 DTO
type DiffDetailDTO struct {
	ID           int64    `json:"id"`
	FileName     string   `json:"file_name"`
	Language     string   `json:"language"`
	DiffContent  string   `json:"diff_content"`
	Insight      string   `json:"insight"`
	Skills       []string `json:"skills"`
	LinesAdded   int      `json:"lines_added"`
	LinesDeleted int      `json:"lines_deleted"`
	Timestamp    int64    `json:"timestamp"`
}

// GetDiffDetail 获取 Diff 详情
func (a *App) GetDiffDetail(id int64) (*DiffDetailDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Repos.Diff == nil {
		return nil, errors.New("Diff 仓储未初始化")
	}

	diff, err := a.core.Repos.Diff.GetByID(a.ctx, id)
	if err != nil {
		return nil, err
	}
	if diff == nil {
		return nil, errors.New("Diff not found")
	}

	var skills []string
	if len(diff.SkillsDetected) > 0 {
		skills = []string(diff.SkillsDetected)
	}

	return &DiffDetailDTO{
		ID:           diff.ID,
		FileName:     diff.FileName,
		Language:     diff.Language,
		DiffContent:  diff.DiffContent,
		Insight:      diff.AIInsight,
		Skills:       skills,
		LinesAdded:   diff.LinesAdded,
		LinesDeleted: diff.LinesDeleted,
		Timestamp:    diff.Timestamp,
	}, nil
}
