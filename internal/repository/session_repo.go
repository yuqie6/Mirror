package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/yuqie6/mirror/internal/model"
	"gorm.io/gorm"
)

// SessionRepository 会话仓储
type SessionRepository struct {
	db *gorm.DB
}

// NewSessionRepository 创建会话仓储
func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// Create 创建会话（会话结束后写入，不可变）
func (r *SessionRepository) Create(ctx context.Context, session *model.Session) error {
	if err := r.db.WithContext(ctx).Create(session).Error; err != nil {
		return fmt.Errorf("创建会话失败: %w", err)
	}
	return nil
}

// UpdateSummaryOnly 仅更新 summary/metadata（不修改 start/end）
func (r *SessionRepository) UpdateSummaryOnly(ctx context.Context, id int64, summary string, metadata model.JSONMap) error {
	updates := map[string]interface{}{}
	if summary != "" {
		updates["summary"] = summary
	}
	if metadata != nil {
		updates["metadata"] = metadata
	}
	if len(updates) == 0 {
		return nil
	}
	if err := r.db.WithContext(ctx).Model(&model.Session{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return fmt.Errorf("更新会话摘要失败: %w", err)
	}
	return nil
}

// GetByDate 按日期查询会话
func (r *SessionRepository) GetByDate(ctx context.Context, date string) ([]model.Session, error) {
	loc := time.Local
	t, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		return nil, fmt.Errorf("解析日期失败: %w", err)
	}
	startTime := t.UnixMilli()
	endTime := t.Add(24*time.Hour).UnixMilli() - 1
	return r.GetByTimeRange(ctx, startTime, endTime)
}

// GetByTimeRange 按时间范围查询会话
func (r *SessionRepository) GetByTimeRange(ctx context.Context, startTime, endTime int64) ([]model.Session, error) {
	var sessions []model.Session
	if err := r.db.WithContext(ctx).
		Where("start_time >= ? AND start_time <= ?", startTime, endTime).
		Order("start_time ASC").
		Find(&sessions).Error; err != nil {
		return nil, fmt.Errorf("查询会话失败: %w", err)
	}
	return sessions, nil
}

// GetLastSession 获取最近一次会话（按 end_time）
func (r *SessionRepository) GetLastSession(ctx context.Context) (*model.Session, error) {
	var session model.Session
	err := r.db.WithContext(ctx).Order("end_time DESC").First(&session).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("查询最近会话失败: %w", err)
	}
	return &session, nil
}

