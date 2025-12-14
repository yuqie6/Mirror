package prompts

import (
	"strings"
	"testing"
)

// TestSessionSummarySystem 测试会话摘要系统 prompt 的中英文切换
func TestSessionSummarySystem(t *testing.T) {
	tests := []struct {
		name     string
		lang     string
		contains string
	}{
		{
			name:     "中文 prompt",
			lang:     "zh",
			contains: "本地优先",
		},
		{
			name:     "英文 prompt",
			lang:     "en",
			contains: "local-first",
		},
		{
			name:     "未知语言默认中文",
			lang:     "fr",
			contains: "本地优先",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SessionSummarySystem(tt.lang)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("SessionSummarySystem(%s) 应包含 %q，实际结果: %s", tt.lang, tt.contains, result)
			}
		})
	}
}

// TestSessionSummaryUser 测试会话摘要用户 prompt 的中英文切换
func TestSessionSummaryUser(t *testing.T) {
	input := SessionSummaryUserInput{
		Date:            "2025-12-15",
		TimeRange:       "10:00-12:00",
		PrimaryApp:      "VSCode",
		SummaryGuidance: "详细描述",
		AppLines:        []string{"VSCode: 120分钟"},
		DiffLines:       []string{"main.go (Go): 添加了国际化支持"},
		BrowserLines:    []string{"github.com: 查看文档"},
	}

	tests := []struct {
		name     string
		lang     string
		contains string
	}{
		{
			name:     "中文 prompt",
			lang:     "zh",
			contains: "应用使用:",
		},
		{
			name:     "英文 prompt",
			lang:     "en",
			contains: "App Usage:",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SessionSummaryUser(input, tt.lang)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("SessionSummaryUser(%s) 应包含 %q", tt.lang, tt.contains)
			}
			// 验证包含输入数据
			if !strings.Contains(result, input.Date) {
				t.Errorf("SessionSummaryUser 应包含日期 %s", input.Date)
			}
		})
	}
}

// TestDailySummarySystem 测试日报系统 prompt
func TestDailySummarySystem(t *testing.T) {
	tests := []struct {
		name     string
		lang     string
		contains string
	}{
		{
			name:     "中文日报 prompt",
			lang:     "zh",
			contains: "个人成长",
		},
		{
			name:     "英文日报 prompt",
			lang:     "en",
			contains: "personal growth",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DailySummarySystem(tt.lang)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("DailySummarySystem(%s) 应包含 %q", tt.lang, tt.contains)
			}
		})
	}
}

// TestDailySummaryUser 测试日报用户 prompt
func TestDailySummaryUser(t *testing.T) {
	tests := []struct {
		name     string
		lang     string
		contains string
	}{
		{
			name:     "中文日报",
			lang:     "zh",
			contains: "统计概览",
		},
		{
			name:     "英文日报",
			lang:     "en",
			contains: "Statistics Overview",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DailySummaryUser(
				"2025-12-15",
				120, 10,
				5, 100, 5,
				"VSCode: 120分钟",
				"main.go (Go): 添加功能",
				"",
				tt.lang,
			)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("DailySummaryUser(%s) 应包含 %q", tt.lang, tt.contains)
			}
		})
	}
}

// TestDiffAnalysisSystem 测试 Diff 分析系统 prompt
func TestDiffAnalysisSystem(t *testing.T) {
	tests := []struct {
		name     string
		lang     string
		contains string
	}{
		{
			name:     "中文 Diff prompt",
			lang:     "zh",
			contains: "代码分析",
		},
		{
			name:     "英文 Diff prompt",
			lang:     "en",
			contains: "code analysis",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DiffAnalysisSystem(tt.lang)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("DiffAnalysisSystem(%s) 应包含 %q", tt.lang, tt.contains)
			}
		})
	}
}

// TestDiffAnalysisUser 测试 Diff 分析用户 prompt
func TestDiffAnalysisUser(t *testing.T) {
	tests := []struct {
		name     string
		lang     string
		contains string
	}{
		{
			name:     "中文 Diff 分析",
			lang:     "zh",
			contains: "文件:",
		},
		{
			name:     "英文 Diff 分析",
			lang:     "en",
			contains: "File:",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DiffAnalysisUser(
				"main.go",
				"Go",
				"技能树: Go, React",
				"+ added line\n- removed line",
				tt.lang,
			)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("DiffAnalysisUser(%s) 应包含 %q", tt.lang, tt.contains)
			}
		})
	}
}

// TestWeeklySummarySystem 测试周报系统 prompt
func TestWeeklySummarySystem(t *testing.T) {
	tests := []struct {
		name     string
		period   string
		lang     string
		contains string
	}{
		{
			name:     "中文周报",
			period:   "week",
			lang:     "zh",
			contains: "一周",
		},
		{
			name:     "英文周报",
			period:   "week",
			lang:     "en",
			contains: "this week",
		},
		{
			name:     "中文月报",
			period:   "month",
			lang:     "zh",
			contains: "一个月",
		},
		{
			name:     "英文月报",
			period:   "month",
			lang:     "en",
			contains: "this month",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := WeeklySummarySystem(tt.period, tt.lang)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("WeeklySummarySystem(%s, %s) 应包含 %q", tt.period, tt.lang, tt.contains)
			}
		})
	}
}

// TestWeeklySummaryUser 测试周报用户 prompt
func TestWeeklySummaryUser(t *testing.T) {
	tests := []struct {
		name     string
		period   string
		lang     string
		contains string
	}{
		{
			name:     "中文周报",
			period:   "week",
			lang:     "zh",
			contains: "时间范围",
		},
		{
			name:     "英文周报",
			period:   "week",
			lang:     "en",
			contains: "Time Range",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := WeeklySummaryUser(
				tt.period,
				"2025-12-09",
				"2025-12-15",
				600,
				20,
				"2025-12-15: 完成开发\n2025-12-14: 测试",
				tt.lang,
			)
			if !strings.Contains(result, tt.contains) {
				t.Errorf("WeeklySummaryUser(%s, %s) 应包含 %q", tt.period, tt.lang, tt.contains)
			}
		})
	}
}

// TestPromptLanguageFallback 测试语言回退逻辑
func TestPromptLanguageFallback(t *testing.T) {
	// 测试未知语言是否默认为中文
	invalidLangs := []string{"", "fr", "de", "jp", "unknown"}

	for _, lang := range invalidLangs {
		t.Run("语言回退_"+lang, func(t *testing.T) {
			result := SessionSummarySystem(lang)
			// 应该包含中文内容
			if !strings.Contains(result, "本地优先") {
				t.Errorf("未知语言 %q 应回退到中文，但结果为: %s", lang, result)
			}
		})
	}
}
