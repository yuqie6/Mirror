package service

import (
	"context"
	"strings"
)

// DiffContributor 从已分析 Diff 生成技能贡献（Phase B 预留）
type DiffContributor struct {
	diffRepo DiffRepository
}

func NewDiffContributor(diffRepo DiffRepository) *DiffContributor {
	return &DiffContributor{diffRepo: diffRepo}
}

func (c *DiffContributor) Contribute(ctx context.Context, startTime, endTime int64) ([]SkillContribution, error) {
	diffs, err := c.diffRepo.GetByTimeRange(ctx, startTime, endTime)
	if err != nil {
		return nil, err
	}
	contribs := make([]SkillContribution, 0, len(diffs))
	for _, d := range diffs {
		if d.AIInsight == "" || len(d.SkillsDetected) == 0 {
			continue
		}
		lines := d.LinesAdded + d.LinesDeleted
		baseExp := 1.0 + float64(lines)/10.0
		perSkillExp := baseExp / float64(len(d.SkillsDetected))
		for _, name := range d.SkillsDetected {
			key := normalizeKey(name)
			ctxText := strings.TrimSpace(d.AIInsight)
			if ctxText == "" {
				ctxText = d.FileName
			}
			contribs = append(contribs, SkillContribution{
				Source:              "diff",
				SkillKey:            key,
				SkillName:           name,
				Exp:                 perSkillExp,
				EvidenceID:          d.ID,
				ContributionContext: ctxText,
				Timestamp:           d.Timestamp,
			})
		}
	}
	return contribs, nil
}

var _ Contributor = (*DiffContributor)(nil)
