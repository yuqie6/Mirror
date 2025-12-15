package prompts

import "fmt"

func weeklyLabelsZH(periodType string) (periodScope, periodLabel, nextLabel string) {
	periodScope = "一周"
	periodLabel = "本周"
	nextLabel = "下周"
	if periodType == "month" {
		periodScope = "一个月"
		periodLabel = "本月"
		nextLabel = "下月"
	}
	return periodScope, periodLabel, nextLabel
}

func weeklyLabelsEN(periodType string) (periodScope, periodLabel, nextLabel string) {
	periodScope = "this week"
	periodLabel = "this week's"
	nextLabel = "next week's"
	if periodType == "month" {
		periodScope = "this month"
		periodLabel = "this month's"
		nextLabel = "next month's"
	}
	return periodScope, periodLabel, nextLabel
}

func WeeklySummarySystem(periodType, lang string) string {
	if lang == "en" {
		periodScope, _, _ := weeklyLabelsEN(periodType)
		return baseSystemPrompt(lang, "personal growth assistant") +
			fmt.Sprintf("Task: review %s work/learning and provide an in-depth analysis.\n", periodScope)
	}
	periodScope, _, _ := weeklyLabelsZH(periodType)
	return baseSystemPrompt(lang, "个人成长助手") +
		fmt.Sprintf("任务：回顾%s的工作/学习，并给出有深度的分析与建设性建议。\n", periodScope)
}

func WeeklySummaryUser(periodType, startDate, endDate string, totalCoding, totalDiffs int, dailyDetails, lang string) string {
	if lang == "en" {
		return weeklySummaryUserEN(periodType, startDate, endDate, totalCoding, totalDiffs, dailyDetails)
	}
	return weeklySummaryUserZH(periodType, startDate, endDate, totalCoding, totalDiffs, dailyDetails)
}

func weeklySummaryUserZH(periodType, startDate, endDate string, totalCoding, totalDiffs int, dailyDetails string) string {
	periodScope, periodLabel, nextLabel := weeklyLabelsZH(periodType)
	return fmt.Sprintf(`请分析以下%s的工作记录，生成阶段汇总：

时间范围: %s 至 %s
总编码时长: %d 分钟
总代码变更: %d 次

每日记录:
%s

请用 JSON 格式返回（不要 markdown 代码块）:
{
  "overview": "%s整体概述（请根据数据量自适应：轻量期 3-5 句；中等 6-10 句；高强度 10-16 句。尽量引用具体证据：哪几天在做什么、主要语言/主题变化、节奏变化。）",
  "achievements": ["主要成就（请按重要性给 3-8 条，不要固定 3 条；每条尽量具体）"],
  "patterns": "学习模式分析（请写成一段有观点的分析：投入/产出、节奏、语言/技能迁移、反复出现的问题）",
  "suggestions": "%s建议（请给 3-7 条可执行建议；如果数据偏少，也要说明原因并给出补数据/改流程建议；如涉及编码建议，优先遵循 SOLID/KISS/DRY/YAGNI）",
  "top_skills": ["%s重点技能（按重要性排序，允许 3-12 个；不要固定数量）"]
}
注意：如果这是月汇总，请不要使用"本周/下周"的措辞。`, periodScope, startDate, endDate, totalCoding, totalDiffs, dailyDetails, periodLabel, nextLabel, periodLabel)
}

func weeklySummaryUserEN(periodType, startDate, endDate string, totalCoding, totalDiffs int, dailyDetails string) string {
	periodScope, periodLabel, nextLabel := weeklyLabelsEN(periodType)
	return fmt.Sprintf(`Analyze the following %s work records and generate a period summary:

Time Range: %s to %s
Total Coding Time: %d minutes
Total Code Changes: %d times

Daily Records:
%s

Return in JSON format (no markdown code blocks):
{
  "overview": "%s overall overview (adapt to data volume: light period 3-5 sentences; medium 6-10 sentences; high intensity 10-16 sentences. Reference specific evidence: what was done on which days, major language/theme changes, rhythm variations.)",
  "achievements": ["Main achievements (provide 3-8 items by importance, not fixed count; be specific for each)"],
  "patterns": "Work pattern analysis (write an opinionated paragraph: input/output, rhythm, language/skill transitions, recurring issues)",
  "suggestions": "%s suggestions (provide 3-7 actionable suggestions; if data is sparse, explain why and suggest data/process improvements; if it includes coding advice, prefer SOLID/KISS/DRY/YAGNI)",
  "top_skills": ["%s key skills (sorted by importance, allow 3-12 items; not fixed count)"]
}
Note: If this is a monthly summary, avoid using "this week/next week" terminology.`, periodScope, startDate, endDate, totalCoding, totalDiffs, dailyDetails, periodLabel, nextLabel, periodLabel)
}
