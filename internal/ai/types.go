package ai

// 注意：本文件集中定义 AI 层的输入/输出类型。
// - 这里的 json tag 用于"AI 生成的 JSON"与"供应商 HTTP payload"的解析/序列化（不属于 HTTP API DTO）。

// Message LLM 消息
type Message struct {
	Role    string `json:"role"`    // "system", "user", "assistant"
	Content string `json:"content"` // 消息内容
}

// SkillWithCategory 带分类的技能（AI 返回）
type SkillWithCategory struct {
	Name     string `json:"name"`             // 技能名称（标准名称如 Go, React）
	Category string `json:"category"`         // 分类: language/framework/database/devops/tool/concept/other
	Parent   string `json:"parent,omitempty"` // 父技能名（AI 决定），如 Gin → Go
}

// SkillInfo 简化的技能信息（传给 AI 作为上下文）
type SkillInfo struct {
	Name     string `json:"name"`
	Category string `json:"category"`
	Parent   string `json:"parent,omitempty"`
}

// DiffInsight Diff 解读结果
type DiffInsight struct {
	Insight    string              `json:"insight"`    // AI 解读
	Skills     []SkillWithCategory `json:"skills"`     // 涉及技能（带分类和层级）
	Difficulty float64             `json:"difficulty"` // 难度 0-1
	Category   string              `json:"category"`   // 代码变更分类: learning, refactoring, bugfix, feature
}

// DailySummaryRequest 每日总结请求
type DailySummaryRequest struct {
	Date            string            // 日期
	WindowEvents    []WindowEventInfo // 窗口事件摘要
	Diffs           []DiffInfo        // Diff 摘要
	HistoryMemories []string          // 相关历史记忆（来自 RAG）
}

// WindowEventInfo 窗口事件信息
type WindowEventInfo struct {
	AppName  string
	Duration int // 分钟
}

// DiffInfo Diff 信息
type DiffInfo struct {
	FileName     string
	Language     string
	Insight      string // 预分析的解读（可能为空）
	DiffContent  string // 原始 diff 内容
	LinesChanged int
}

// DailySummaryResult 每日总结结果
type DailySummaryResult struct {
	Summary      string   `json:"summary"`       // 总结
	Highlights   string   `json:"highlights"`    // 亮点
	Struggles    string   `json:"struggles"`     // 困难
	SkillsGained []string `json:"skills_gained"` // 获得技能
	Suggestions  string   `json:"suggestions"`   // 建议
}

// SessionSummaryRequest 会话摘要请求
type SessionSummaryRequest struct {
	SessionID  int64             `json:"session_id"`
	Date       string            `json:"date"`
	TimeRange  string            `json:"time_range"`
	PrimaryApp string            `json:"primary_app"`
	AppUsage   []WindowEventInfo `json:"app_usage"`
	Diffs      []DiffInfo        `json:"diffs"`
	Browser    []BrowserInfo     `json:"browser"`
	SkillsHint []string          `json:"skills_hint"`
	Memories   []string          `json:"memories"`
}

type BrowserInfo struct {
	Domain string `json:"domain"`
	Title  string `json:"title"`
	URL    string `json:"url"`
}

// SessionSummaryResult 会话摘要结果
type SessionSummaryResult struct {
	Summary        string   `json:"summary"`
	Category       string   `json:"category"` // technical/learning/exploration/other
	SkillsInvolved []string `json:"skills_involved"`
	Tags           []string `json:"tags"`
}

// WeeklySummaryRequest 周报请求
type WeeklySummaryRequest struct {
	PeriodType     string // week/month（为空按 week）
	StartDate      string
	EndDate        string
	DailySummaries []DailySummaryInfo
	TotalCoding    int
	TotalDiffs     int
}

// DailySummaryInfo 日报信息
type DailySummaryInfo struct {
	Date       string
	Summary    string
	Highlights string
	Skills     []string
}

// WeeklySummaryResult 周报结果
type WeeklySummaryResult struct {
	Overview     string   `json:"overview"`     // 本周整体概述
	Achievements []string `json:"achievements"` // 主要成就
	Patterns     string   `json:"patterns"`     // 学习模式分析
	Suggestions  string   `json:"suggestions"`  // 下周建议
	TopSkills    []string `json:"top_skills"`   // 本周重点技能
}
