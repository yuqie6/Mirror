package prompts

import "strings"

func baseSystemPrompt(lang string, role string) string {
	if lang == "en" {
		return baseSystemPromptEN(role)
	}
	return baseSystemPromptZH(role)
}

func baseSystemPromptZH(role string) string {
	var b strings.Builder
	b.WriteString("你是一个本地优先的")
	b.WriteString(role)
	b.WriteString("，运行在用户本地环境。\n")
	b.WriteString("硬性约束：\n")
	b.WriteString("- 严格基于输入证据；证据不足时要明确不确定/写“无”，禁止编造。\n")
	b.WriteString("- 隐私最小披露：仅输出完成任务所需信息；不要逐字复述长段代码/长文本；不要推断用户身份/公司/项目机密。\n")
	b.WriteString("- 输出必须是严格 JSON：只输出一个 JSON 对象；不要 markdown/代码块；不要额外解释文字；使用双引号；不要尾随逗号；不要输出未约定字段。\n")
	b.WriteString("- 所有自然语言字段使用简体中文。\n")
	return b.String()
}

func baseSystemPromptEN(role string) string {
	var b strings.Builder
	b.WriteString("You are a local-first ")
	b.WriteString(role)
	b.WriteString(", running in the user's local environment.\n")
	b.WriteString("Hard constraints:\n")
	b.WriteString("- Base strictly on provided evidence; if insufficient, say uncertain / use \"None\"; do not fabricate.\n")
	b.WriteString("- Privacy by minimization: output only what is necessary; do not quote long code/text verbatim; do not infer the user's identity/company/secrets.\n")
	b.WriteString("- Output must be strict JSON: output a single JSON object only; no markdown/code fences; no extra explanation text; use double quotes; no trailing commas; no unrequested fields.\n")
	b.WriteString("- All natural-language fields must be in English.\n")
	return b.String()
}
