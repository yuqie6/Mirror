package repository

import (
	"context"
	"testing"

	"github.com/yuqie6/mirror/internal/model"
	"github.com/yuqie6/mirror/internal/testutil"
)

func TestSkillRepositoryUpsertAndGet(t *testing.T) {
	db := testutil.OpenTestDB(t)
	repo := NewSkillRepository(db)
	ctx := context.Background()

	skill := model.NewSkillNode("go", "Go", "language")
	skill.Exp = 10

	if err := repo.Upsert(ctx, skill); err != nil {
		t.Fatalf("Upsert error: %v", err)
	}

	got, err := repo.GetByKey(ctx, "go")
	if err != nil {
		t.Fatalf("GetByKey error: %v", err)
	}
	if got == nil || got.Name != "Go" || got.Exp != 10 {
		t.Fatalf("got=%+v, want name Go exp 10", got)
	}
}

func TestSkillRepositoryUpsertBatchUpdatesExisting(t *testing.T) {
	db := testutil.OpenTestDB(t)
	repo := NewSkillRepository(db)
	ctx := context.Background()

	skill := model.NewSkillNode("go", "Go", "language")
	if err := repo.Upsert(ctx, skill); err != nil {
		t.Fatalf("Upsert error: %v", err)
	}

	updated := model.NewSkillNode("go", "Go", "language")
	updated.Exp = 42
	newSkill := model.NewSkillNode("react", "React", "framework")
	if err := repo.UpsertBatch(ctx, []*model.SkillNode{updated, newSkill}); err != nil {
		t.Fatalf("UpsertBatch error: %v", err)
	}

	got, _ := repo.GetByKey(ctx, "go")
	if got.Exp != 42 {
		t.Fatalf("exp=%v, want 42", got.Exp)
	}
}

