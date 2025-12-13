package main

import "errors"

// SkillNodeDTO 技能节点 DTO
type SkillNodeDTO struct {
	Key        string `json:"key"`
	Name       string `json:"name"`
	Category   string `json:"category"`
	ParentKey  string `json:"parent_key"` // 父技能 Key
	Level      int    `json:"level"`
	Experience int    `json:"experience"`
	Progress   int    `json:"progress"`
	Status     string `json:"status"`
	LastActive int64  `json:"last_active"` // 最后活跃时间戳
}

// SkillEvidenceDTO 技能证据 DTO
type SkillEvidenceDTO struct {
	Source              string `json:"source"`
	EvidenceID          int64  `json:"evidence_id"`
	Timestamp           int64  `json:"timestamp"`
	ContributionContext string `json:"contribution_context"`
	FileName            string `json:"file_name"`
}

// GetSkillTree 获取技能树
func (a *App) GetSkillTree() ([]SkillNodeDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Services.Skills == nil {
		return nil, errors.New("技能服务未初始化")
	}

	skillTree, err := a.core.Services.Skills.GetSkillTree(a.ctx)
	if err != nil {
		return nil, err
	}

	var result []SkillNodeDTO
	for category, skills := range skillTree.Categories {
		for _, skill := range skills {
			result = append(result, SkillNodeDTO{
				Key:        skill.Key,
				Name:       skill.Name,
				Category:   category,
				ParentKey:  skill.ParentKey,
				Level:      skill.Level,
				Experience: int(skill.Exp),
				Progress:   int(skill.Progress),
				Status:     skill.Trend,
				LastActive: skill.LastActive.UnixMilli(),
			})
		}
	}
	return result, nil
}

// GetSkillEvidence 获取技能最近证据（Phase B drill-down）
func (a *App) GetSkillEvidence(skillKey string) ([]SkillEvidenceDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Services.Skills == nil {
		return nil, errors.New("技能服务未初始化")
	}
	evs, err := a.core.Services.Skills.GetSkillEvidence(a.ctx, skillKey, 3)
	if err != nil {
		return nil, err
	}
	result := make([]SkillEvidenceDTO, len(evs))
	for i, e := range evs {
		result[i] = SkillEvidenceDTO{
			Source:              e.Source,
			EvidenceID:          e.EvidenceID,
			Timestamp:           e.Timestamp,
			ContributionContext: e.ContributionContext,
			FileName:            e.FileName,
		}
	}
	return result, nil
}
