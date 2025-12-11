package repository

import (
	"context"
	"fmt"

	"github.com/yuqie6/mirror/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SummaryRepository 每日总结仓储
type SummaryRepository struct {
	db *gorm.DB
}

// NewSummaryRepository 创建仓储
func NewSummaryRepository(db *gorm.DB) *SummaryRepository {
	return &SummaryRepository{db: db}
}

// Upsert 插入或更新
func (r *SummaryRepository) Upsert(ctx context.Context, summary *model.DailySummary) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "date"}},
		UpdateAll: true,
	}).Create(summary).Error
}

// GetByDate 按日期获取
func (r *SummaryRepository) GetByDate(ctx context.Context, date string) (*model.DailySummary, error) {
	var summary model.DailySummary
	err := r.db.WithContext(ctx).Where("date = ?", date).First(&summary).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("查询总结失败: %w", err)
	}
	return &summary, nil
}

// GetRecent 获取最近的总结
func (r *SummaryRepository) GetRecent(ctx context.Context, days int) ([]model.DailySummary, error) {
	var summaries []model.DailySummary
	err := r.db.WithContext(ctx).
		Order("date DESC").
		Limit(days).
		Find(&summaries).Error
	if err != nil {
		return nil, fmt.Errorf("查询总结失败: %w", err)
	}
	return summaries, nil
}
