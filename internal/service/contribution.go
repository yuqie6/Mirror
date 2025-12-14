package service

// SkillContribution 技能贡献统一表示
// Diff/Browser/Session 只需要输出贡献列表，SkillService 不关心来源细节。
type SkillContribution struct {
	Source              string // diff/browser/session
	SkillKey            string
	SkillName           string
	Category            string
	ParentName          string
	Exp                 float64
	EvidenceID          int64
	ContributionContext string
	Timestamp           int64
}
