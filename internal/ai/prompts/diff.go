package prompts

import "fmt"

const DiffAnalysisSystem = "你是一个代码分析助手，擅长从代码变更中推断开发者的学习和成长。你能看到用户当前的技能树，请合理判断技能归属。回复必须是纯 JSON，不要 markdown。"

func DiffAnalysisUser(filePath, language, skillTreeContext, diffContent string) string {
	return fmt.Sprintf(`分析以下代码变更，推断开发者学习或实践了什么。

文件: %s
语言: %s
%s
Diff:
%s

请用 JSON 格式返回（不要 markdown 代码块）:
{
  "insight": "一句话描述这次修改学到了什么或做了什么（中文）",
  "skills": [
    {"name": "技能名", "category": "分类", "parent": "父技能名（可选）"}
  ],
  "difficulty": 0.3,
  "category": "learning"
}

技能层级规则：
1. 如果技能已存在于技能树中，使用**完全相同的名称**
2. 编程语言是顶级技能（parent 留空）
3. 框架/库归属到对应语言（如 Gin → Go, React → JavaScript）
4. category 可选值: language/framework/database/devops/tool/concept/other
5. 变更分类: learning/refactoring/bugfix/feature`, filePath, language, skillTreeContext, diffContent)
}
