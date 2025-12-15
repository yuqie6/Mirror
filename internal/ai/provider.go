package ai

import (
	"context"
)

// LLMProvider LLM 供应商接口
// 所有 LLM 客户端（OpenAI 兼容、Anthropic、Google 等）都实现此接口
type LLMProvider interface {
	// Chat 发送聊天请求（使用默认参数）
	Chat(ctx context.Context, messages []Message) (string, error)

	// ChatWithOptions 带参数的聊天请求
	ChatWithOptions(ctx context.Context, messages []Message, opts ChatOptions) (string, error)

	// IsConfigured 检查是否已配置（API Key 等）
	IsConfigured() bool

	// Name 返回供应商名称（用于日志和诊断）
	Name() string
}

// ChatOptions 聊天请求参数
type ChatOptions struct {
	Temperature float64 // 温度，0-1，默认 0.3
	MaxTokens   int     // 最大 token 数，默认 2000
}

// DefaultChatOptions 返回默认聊天参数
func DefaultChatOptions() ChatOptions {
	return ChatOptions{
		Temperature: 0.3,
		MaxTokens:   2000,
	}
}
