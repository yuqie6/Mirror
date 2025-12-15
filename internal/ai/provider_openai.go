package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// OpenAIProvider OpenAI 兼容格式的 LLM 供应商
// 支持所有 OpenAI 兼容 API：DeepSeek、OpenRouter、硅基流动、NewAPI 等
type OpenAIProvider struct {
	name          string // 供应商显示名称
	apiKey        string
	baseURL       string
	model         string
	requireAPIKey bool
	client        *http.Client
}

// OpenAIProviderConfig OpenAI 兼容供应商配置
type OpenAIProviderConfig struct {
	Name    string // 供应商显示名称（如 "DeepSeek"、"OpenRouter"）
	APIKey  string
	BaseURL string // 如 "https://api.deepseek.com" 或 "https://openrouter.ai/api"
	Model   string // 如 "deepseek-chat"、"gpt-4o"
	// RequireAPIKey 指示是否必须提供 APIKey；默认 true。
	// 用于作者自建的匿名 NewAPI（或网关侧鉴权）场景。
	RequireAPIKey *bool
}

// NewOpenAIProvider 创建 OpenAI 兼容格式的供应商
func NewOpenAIProvider(cfg *OpenAIProviderConfig) *OpenAIProvider {
	if cfg == nil {
		cfg = &OpenAIProviderConfig{}
	}

	name := cfg.Name
	if name == "" {
		name = "OpenAI"
	}
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	model := cfg.Model
	if model == "" {
		model = "gpt-4o-mini"
	}

	requireAPIKey := true
	if cfg.RequireAPIKey != nil {
		requireAPIKey = *cfg.RequireAPIKey
	}

	return &OpenAIProvider{
		name:          name,
		apiKey:        cfg.APIKey,
		baseURL:       strings.TrimSuffix(baseURL, "/"),
		model:         model,
		requireAPIKey: requireAPIKey,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// openaiChatRequest OpenAI 聊天请求结构
type openaiChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Stream      *bool     `json:"stream,omitempty"`
}

// openaiChatResponse OpenAI 聊天响应结构
type openaiChatResponse struct {
	ID      string             `json:"id"`
	Choices []openaiChatChoice `json:"choices"`
	Usage   openaiChatUsage    `json:"usage"`
	Error   *openaiError       `json:"error,omitempty"`
}

type openaiChatChoice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

type openaiChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type openaiError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

type openaiErrorEnvelope struct {
	Error any `json:"error"`
}

type openaiErrorEnvelopeV2 struct {
	Message string `json:"message"`
	Error   any    `json:"error"`
}

func extractOpenAIErrorMessage(respBody []byte) string {
	var env openaiErrorEnvelope
	if err := json.Unmarshal(respBody, &env); err == nil {
		switch v := env.Error.(type) {
		case map[string]any:
			if msg, ok := v["message"].(string); ok && strings.TrimSpace(msg) != "" {
				return strings.TrimSpace(msg)
			}
		case string:
			if strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
	}

	var env2 openaiErrorEnvelopeV2
	if err := json.Unmarshal(respBody, &env2); err == nil {
		if strings.TrimSpace(env2.Message) != "" {
			return strings.TrimSpace(env2.Message)
		}
		switch v := env2.Error.(type) {
		case map[string]any:
			if msg, ok := v["message"].(string); ok && strings.TrimSpace(msg) != "" {
				return strings.TrimSpace(msg)
			}
		case string:
			if strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
	}

	return ""
}

// Chat 发送聊天请求（使用默认参数）
func (p *OpenAIProvider) Chat(ctx context.Context, messages []Message) (string, error) {
	return p.ChatWithOptions(ctx, messages, DefaultChatOptions())
}

// ChatWithOptions 带参数的聊天请求
func (p *OpenAIProvider) ChatWithOptions(ctx context.Context, messages []Message, opts ChatOptions) (string, error) {
	stream := false
	req := openaiChatRequest{
		Model:       p.model,
		Messages:    messages,
		Temperature: opts.Temperature,
		MaxTokens:   opts.MaxTokens,
		// 显式关闭流式输出，避免网关默认返回流式导致 message.content 为空。
		Stream: &stream,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	endpoint := p.baseURL + "/v1/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(p.apiKey) != "" {
		httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		msg := extractOpenAIErrorMessage(respBody)
		if msg == "" {
			msg = strings.TrimSpace(string(respBody))
		}
		slog.Error("HTTP 错误", "provider", p.name, "status", resp.StatusCode, "body", string(respBody))
		if msg != "" {
			return "", fmt.Errorf("HTTP 错误: %s: %s", resp.Status, msg)
		}
		return "", fmt.Errorf("HTTP 错误: %s", resp.Status)
	}

	// 仅在 200 时解析 OpenAI 响应结构
	var chatResp openaiChatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		slog.Error("解析响应失败", "provider", p.name, "status", resp.StatusCode, "body", string(respBody))
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	// 检查 API 错误
	if chatResp.Error != nil {
		slog.Error("API 错误", "provider", p.name, "error", chatResp.Error.Message, "type", chatResp.Error.Type)
		return "", fmt.Errorf("API 错误: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("无响应内容")
	}

	slog.Debug("LLM 调用成功",
		"provider", p.name,
		"model", p.model,
		"tokens", chatResp.Usage.TotalTokens,
	)

	return chatResp.Choices[0].Message.Content, nil
}

// IsConfigured 检查是否已配置
func (p *OpenAIProvider) IsConfigured() bool {
	if p.requireAPIKey {
		return strings.TrimSpace(p.apiKey) != ""
	}
	return strings.TrimSpace(p.baseURL) != ""
}

// Name 返回供应商名称
func (p *OpenAIProvider) Name() string {
	return p.name
}
