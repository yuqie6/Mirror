package prompts

import "fmt"

// DailySummarySystem 返回日报的系统 prompt
func DailySummarySystem(lang string) string {
	if lang == "en" {
		return "You are a personal growth assistant helping users review their daily work and learning, providing constructive feedback. Response must be pure JSON."
	}
	return "你是一个个人成长助手，帮助用户回顾每天的工作和学习，提供有建设性的反馈。回复必须是纯 JSON。"
}

func DailySummaryUser(
	date string,
	windowTotalMinutes int,
	windowTopN int,
	diffCountTotal int,
	linesChangedTotal int,
	diffTopN int,
	windowSummary string,
	diffSummary string,
	historySummary string,
	lang string,
) string {
	if lang == "en" {
		return dailySummaryUserEN(date, windowTotalMinutes, windowTopN, diffCountTotal, linesChangedTotal, diffTopN, windowSummary, diffSummary, historySummary)
	}
	return dailySummaryUserZH(date, windowTotalMinutes, windowTopN, diffCountTotal, linesChangedTotal, diffTopN, windowSummary, diffSummary, historySummary)
}

func dailySummaryUserZH(
	date string,
	windowTotalMinutes int,
	windowTopN int,
	diffCountTotal int,
	linesChangedTotal int,
	diffTopN int,
	windowSummary string,
	diffSummary string,
	historySummary string,
) string {
	return fmt.Sprintf(`根据以下行为数据，生成今日工作/学习总结。
%s
日期: %s

统计概览:
- 应用使用总时长: %d 分钟（下方仅展示 Top %d）
- 代码变更: %d 次（共 %d 行变更；下方仅展示前 %d 条）

应用使用时长:
%s

代码变更:
%s

请用 JSON 格式返回（不要 markdown 代码块）:
{
  "summary": "今日总结（请根据数据量自适应篇幅：轻量日 2-3 句；中等 5-8 句；高强度/多变更 10-16 句。尽量引用具体证据：应用名/文件名/语言/技能，避免套话。）",
  "highlights": "今日亮点（2-6 条要点，用换行分隔；每条尽量具体。若确实没有，写'无'）",
  "struggles": "今日困难（0-5 条要点，用换行分隔；没有就写'无'）",
  "skills_gained": ["今日涉及的技能（按重要性排序，允许 0-12 个）"],
  "suggestions": "明日建议（2-6 条要点，用换行分隔；优先给可执行的小动作）"
}`, historySummary, date, windowTotalMinutes, windowTopN, diffCountTotal, linesChangedTotal, diffTopN, windowSummary, diffSummary)
}

func dailySummaryUserEN(
	date string,
	windowTotalMinutes int,
	windowTopN int,
	diffCountTotal int,
	linesChangedTotal int,
	diffTopN int,
	windowSummary string,
	diffSummary string,
	historySummary string,
) string {
	return fmt.Sprintf(`Generate a daily work/learning summary based on the following behavioral data.
%s
Date: %s

Statistics Overview:
- Total app usage: %d minutes (showing top %d below)
- Code changes: %d times (total %d lines changed; showing top %d below)

App Usage Duration:
%s

Code Changes:
%s

Return in JSON format (no markdown code blocks):
{
  "summary": "Daily summary (adapt length to data volume: light day 2-3 sentences; medium 5-8 sentences; high intensity/many changes 10-16 sentences. Reference specific evidence: app names/file names/languages/skills, avoid generic statements.)",
  "highlights": "Daily highlights (2-6 key points, separated by newlines; be specific. If none, write 'None')",
  "struggles": "Daily challenges (0-5 key points, separated by newlines; if none, write 'None')",
  "skills_gained": ["Skills involved today (sorted by importance, allow 0-12 items)"],
  "suggestions": "Tomorrow's suggestions (2-6 key points, separated by newlines; prioritize actionable small steps)"
}`, historySummary, date, windowTotalMinutes, windowTopN, diffCountTotal, linesChangedTotal, diffTopN, windowSummary, diffSummary)
}
