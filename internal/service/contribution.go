package service

// SkillContribution 技能贡献统一表示
// Diff/Browser/Session 只需要输出贡献列表，SkillService 不关心来源细节。
type SkillContribution struct {
	Source              string  `json:"source"` // diff/browser/session
	SkillKey            string  `json:"skill_key"`
	SkillName           string  `json:"skill_name"`
	Category            string  `json:"category,omitempty"`
	ParentName          string  `json:"parent_name,omitempty"`
	Exp                 float64 `json:"exp"`
	EvidenceID          int64   `json:"evidence_id"`
	ContributionContext string  `json:"contribution_context"`
	Timestamp           int64   `json:"timestamp"`
}
