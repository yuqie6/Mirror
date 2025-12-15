package prompts

import (
	"fmt"
	"strings"
)

// SessionSummarySystem 返回会话摘要的系统 prompt
func SessionSummarySystem(lang string) string {
	// 注意：系统 prompt 负责“不可妥协的行为约束”（证据、隐私、JSON 严格性、语言）。
	// 具体输出 schema 由 user prompt 定义，避免在 system/user 里重复冲突的约束。
	if lang == "en" {
		return baseSystemPrompt(lang, "personal growth assistant") + "Task: generate an explainable session summary.\n"
	}
	return baseSystemPrompt(lang, "个人成长分析助手") + "任务：生成可解释的会话摘要。\n"
}

type SessionSummaryUserInput struct {
	Date            string
	TimeRange       string
	PrimaryApp      string
	SummaryGuidance string

	AppLines         []string
	WindowTitleLines []string
	DiffLines        []string
	BrowserLines     []string
	SkillsHintLines  []string
	MemoryLines      []string
}

func SessionSummaryUser(in SessionSummaryUserInput, lang string) string {
	if lang == "en" {
		return sessionSummaryUserEN(in)
	}
	return sessionSummaryUserZH(in)
}

func sessionSummaryUserZH(in SessionSummaryUserInput) string {
	var b strings.Builder
	b.WriteString("请基于以下本地行为证据，生成一个可解释的会话摘要。\n")
	b.WriteString("要求：\n")
	b.WriteString(fmt.Sprintf("1) summary 用中文 %s（尽量具体，避免空泛；引用具体的文件名、技术名称、网站等证据）\n", in.SummaryGuidance))
	b.WriteString("2) category 只能是 technical/learning/exploration/other\n")
	b.WriteString("3) skills_involved 最多 8 个，尽量使用用户已有技能树中的标准名称（如 Go、Redis、React）\n")
	b.WriteString("4) tags 最多 6 个，用中文短标签（如 并发、性能、数据库、文档阅读）\n")
	b.WriteString("5) 面向经验丰富的开发者：结论优先、信息密度高\n")
	b.WriteString("6) 必须可追溯：summary 应对应下面的 diff/browser/app 证据，不要胡编\n")
	b.WriteString("7) 隐私最小披露：不要输出任何完整 URL/Token/密钥/长段代码，仅做必要摘要\n")
	b.WriteString("8) 输出必须是严格 JSON：只输出一个对象；不要输出任何 JSON 之外的字符；不要多余字段\n\n")

	b.WriteString(fmt.Sprintf("日期: %s\n时间: %s\n主应用: %s\n\n", in.Date, in.TimeRange, in.PrimaryApp))

	if len(in.AppLines) > 0 {
		b.WriteString("应用使用:\n")
		for _, line := range in.AppLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.WindowTitleLines) > 0 {
		b.WriteString("窗口标题（Top，已脱敏，可用于判断“具体在做什么”）:\n")
		for _, line := range in.WindowTitleLines {
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

func sessionSummaryUserEN(in SessionSummaryUserInput) string {
	var b strings.Builder
	b.WriteString("Generate an explainable session summary based on the following local behavior evidence.\n")
	b.WriteString("Requirements:\n")
	b.WriteString(fmt.Sprintf("1) summary in English %s (be specific, avoid vagueness; cite specific file names, technical terms, websites as evidence)\n", in.SummaryGuidance))
	b.WriteString("2) category must be technical/learning/exploration/other\n")
	b.WriteString("3) skills_involved max 8 items, prefer standard names from user's skill tree (e.g. Go, Redis, React)\n")
	b.WriteString("4) tags max 6 items, in English short tags (e.g. concurrency, performance, database, documentation)\n")
	b.WriteString("5) For an experienced developer: conclusion-first, high information density\n")
	b.WriteString("6) Must be traceable: summary should match the diff/browser/app evidence below, don't make things up\n")
	b.WriteString("7) Privacy by minimization: do not output full URLs/tokens/keys/long code; only necessary summaries\n")
	b.WriteString("8) Output must be strict JSON: output a single object only; no extra characters; no unrequested fields\n\n")

	b.WriteString(fmt.Sprintf("Date: %s\nTime: %s\nPrimary App: %s\n\n", in.Date, in.TimeRange, in.PrimaryApp))

	if len(in.AppLines) > 0 {
		b.WriteString("App Usage:\n")
		for _, line := range in.AppLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.WindowTitleLines) > 0 {
		b.WriteString("Window Titles (Top, sanitized; use as evidence of what the user was doing):\n")
		for _, line := range in.WindowTitleLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.DiffLines) > 0 {
		b.WriteString("Code Changes:\n")
		for _, line := range in.DiffLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.BrowserLines) > 0 {
		b.WriteString("Browser History:\n")
		for _, line := range in.BrowserLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.SkillsHintLines) > 0 {
		b.WriteString("Skill Hints (for reference):\n")
		for _, line := range in.SkillsHintLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	if len(in.MemoryLines) > 0 {
		b.WriteString("Related History (for reference, don't invent non-existent content):\n")
		for _, line := range in.MemoryLines {
			b.WriteString("- " + strings.TrimSpace(line) + "\n")
		}
		b.WriteString("\n")
	}

	b.WriteString("Return in JSON format (no markdown code blocks):\n")
	b.WriteString("{\n")
	b.WriteString("  \"summary\": \"...\",\n")
	b.WriteString("  \"category\": \"technical\",\n")
	b.WriteString("  \"skills_involved\": [\"...\"],\n")
	b.WriteString("  \"tags\": [\"...\"]\n")
	b.WriteString("}\n")
	return b.String()
}
