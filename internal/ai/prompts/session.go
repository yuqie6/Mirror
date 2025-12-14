package prompts

import (
	"fmt"
	"strings"
)

const SessionSummarySystem = "你是一个本地优先的个人成长分析助手。你必须严格基于证据生成摘要，回复必须是纯 JSON。"

type SessionSummaryUserInput struct {
	Date            string
	TimeRange       string
	PrimaryApp      string
	SummaryGuidance string

	AppLines        []string
	DiffLines       []string
	BrowserLines    []string
	SkillsHintLines []string
	MemoryLines     []string
}

func SessionSummaryUser(in SessionSummaryUserInput) string {
	var b strings.Builder
	b.WriteString("请基于以下本地行为证据，生成一个可解释的会话摘要。\n")
	b.WriteString("要求：\n")
	b.WriteString(fmt.Sprintf("1) summary 用中文 %s（尽量具体，避免空泛；引用具体的文件名、技术名称、网站等证据）\n", in.SummaryGuidance))
	b.WriteString("2) category 只能是 technical/learning/exploration/other\n")
	b.WriteString("3) skills_involved 最多 8 个，尽量使用用户已有技能树中的标准名称（如 Go、Redis、React）\n")
	b.WriteString("4) tags 最多 6 个，用中文短标签（如 并发、性能、数据库、文档阅读）\n")
	b.WriteString("5) 必须可追溯：summary 应对应下面的 diff/browser/app 证据，不要胡编\n\n")

	b.WriteString(fmt.Sprintf("日期: %s\n时间: %s\n主应用: %s\n\n", in.Date, in.TimeRange, in.PrimaryApp))

	if len(in.AppLines) > 0 {
		b.WriteString("应用使用:\n")
		for _, line := range in.AppLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.DiffLines) > 0 {
		b.WriteString("代码变更:\n")
		for _, line := range in.DiffLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.BrowserLines) > 0 {
		b.WriteString("浏览记录:\n")
		for _, line := range in.BrowserLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.SkillsHintLines) > 0 {
		b.WriteString("技能提示（可参考）:\n")
		for _, line := range in.SkillsHintLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.MemoryLines) > 0 {
		b.WriteString("相关历史记忆（可参考，不要编造不存在的内容）:\n")
		for _, line := range in.MemoryLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	b.WriteString("请用 JSON 格式返回（不要 markdown 代码块）:\n")
	b.WriteString("{\n")
	b.WriteString("  \"summary\": \"...\",\n")
	b.WriteString("  \"category\": \"technical\",\n")
	b.WriteString("  \"skills_involved\": [\"...\"],\n")
	b.WriteString("  \"tags\": [\"...\"]\n")
	b.WriteString("}\n")
	return b.String()
}
