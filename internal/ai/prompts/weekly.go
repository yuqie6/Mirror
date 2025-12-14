package prompts

import "fmt"

func weeklyLabels(periodType string) (periodScope, periodLabel, nextLabel string) {
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

func WeeklySummarySystem(periodType string) string {
	periodScope, _, _ := weeklyLabels(periodType)
	return fmt.Sprintf("你是一个个人成长助手，帮助用户回顾%s的工作和学习，提供有深度的分析和建设性的反馈。回复必须是纯 JSON。", periodScope)
}

func WeeklySummaryUser(periodType, startDate, endDate string, totalCoding, totalDiffs int, dailyDetails string) string {
	periodScope, periodLabel, nextLabel := weeklyLabels(periodType)
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
  "suggestions": "%s建议（请给 3-7 条可执行建议；如果数据偏少，也要说明原因并给出补数据/改流程建议）",
  "top_skills": ["%s重点技能（按重要性排序，允许 3-12 个；不要固定数量）"]
}
注意：如果这是月汇总，请不要使用“本周/下周”的措辞。`, periodScope, startDate, endDate, totalCoding, totalDiffs, dailyDetails, periodLabel, nextLabel, periodLabel)
}
