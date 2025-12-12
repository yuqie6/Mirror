package repository

import (
	"context"
	"testing"
	"time"

	"github.com/yuqie6/mirror/internal/model"
	"github.com/yuqie6/mirror/internal/testutil"
)

func TestEventRepositoryBatchInsertAndStats(t *testing.T) {
	db := testutil.OpenTestDB(t)
	repo := NewEventRepository(db)
	ctx := context.Background()

	now := time.Now()
	events := []model.Event{
		{AppName: "code.exe", Duration: 120, Timestamp: now.UnixMilli()},
		{AppName: "code.exe", Duration: 240, Timestamp: now.UnixMilli()},
		{AppName: "chrome.exe", Duration: 600, Timestamp: now.UnixMilli()},
	}
	if err := repo.BatchInsert(ctx, events); err != nil {
		t.Fatalf("BatchInsert error: %v", err)
	}

	stats, err := repo.GetAppStats(ctx, now.Add(-time.Hour).UnixMilli(), now.Add(time.Hour).UnixMilli())
	if err != nil || len(stats) != 2 {
		t.Fatalf("GetAppStats err=%v stats=%v", err, stats)
	}
}

func TestEventRepositoryDeleteOldEvents(t *testing.T) {
	db := testutil.OpenTestDB(t)
	repo := NewEventRepository(db)
	ctx := context.Background()

	old := model.Event{AppName: "code.exe", Duration: 10, Timestamp: time.Now().Add(-10 * 24 * time.Hour).UnixMilli()}
	newer := model.Event{AppName: "code.exe", Duration: 10, Timestamp: time.Now().Add(-1 * 24 * time.Hour).UnixMilli()}
	_ = repo.BatchInsert(ctx, []model.Event{old, newer})

	deleted, err := repo.DeleteOldEvents(ctx, 7)
	if err != nil {
		t.Fatalf("DeleteOldEvents error: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("deleted=%d, want 1", deleted)
	}
}

