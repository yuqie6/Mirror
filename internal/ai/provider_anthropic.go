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

// AnthropicProvider Anthropic Claude 格式的 LLM 供应商
type AnthropicProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// AnthropicProviderConfig Anthropic 供应商配置
type AnthropicProviderConfig struct {
	APIKey  string
	BaseURL string // 默认 "https://api.anthropic.com"
	Model   string // 如 "claude-sonnet-4-20250514"
}

// NewAnthropicProvider 创建 Anthropic 供应商
func NewAnthropicProvider(cfg *AnthropicProviderConfig) *AnthropicProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.anthropic.com"
	}
	model := cfg.Model
	if model == "" {
		model = "claude-sonnet-4-20250514"
	}

	return &AnthropicProvider{
		apiKey:  cfg.APIKey,
		baseURL: strings.TrimSuffix(baseURL, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// anthropicMessage Anthropic 消息格式
type anthropicMessage struct {
	Role    string `json:"role"` // "user" 或 "assistant"
	Content string `json:"content"`
}

// anthropicRequest Anthropic 请求结构
type anthropicRequest struct {
	Model       string             `json:"model"`
	MaxTokens   int                `json:"max_tokens"`
	System      string             `json:"system,omitempty"` // system 消息单独字段
	Messages    []anthropicMessage `json:"messages"`
	Temperature float64            `json:"temperature,omitempty"`
}

// anthropicResponse Anthropic 响应结构
type anthropicResponse struct {
	ID           string                  `json:"id"`
	Type         string                  `json:"type"`
	Role         string                  `json:"role"`
	Content      []anthropicContentBlock `json:"content"`
	Model        string                  `json:"model"`
	StopReason   string                  `json:"stop_reason"`
	StopSequence *string                 `json:"stop_sequence"`
	Usage        anthropicUsage          `json:"usage"`
	Error        *anthropicError         `json:"error,omitempty"`
}

type anthropicContentBlock struct {
	Type string `json:"type"` // "text"
	Text string `json:"text"`
}

type anthropicUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type anthropicError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// Chat 发送聊天请求（使用默认参数）
func (p *AnthropicProvider) Chat(ctx context.Context, messages []Message) (string, error) {
	return p.ChatWithOptions(ctx, messages, DefaultChatOptions())
}

// ChatWithOptions 带参数的聊天请求
func (p *AnthropicProvider) ChatWithOptions(ctx context.Context, messages []Message, opts ChatOptions) (string, error) {
	// 分离 system 消息和其他消息
	var systemPrompt string
	var anthropicMsgs []anthropicMessage

	for _, msg := range messages {
		if msg.Role == "system" {
			// Anthropic 的 system 消息需要单独处理
			if systemPrompt != "" {
				systemPrompt += "\n\n"
			}
			systemPrompt += msg.Content
		} else {
			anthropicMsgs = append(anthropicMsgs, anthropicMessage{
				Role:    msg.Role,
				Content: msg.Content,
			})
		}
	}

	// Anthropic 要求 messages 不能为空，且第一条必须是 user
	if len(anthropicMsgs) == 0 {
		return "", fmt.Errorf("Anthropic API 要求至少有一条 user 消息")
	}

	req := anthropicRequest{
		Model:       p.model,
		MaxTokens:   opts.MaxTokens,
		System:      systemPrompt,
		Messages:    anthropicMsgs,
		Temperature: opts.Temperature,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	endpoint := p.baseURL + "/v1/messages"
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	var anthropicResp anthropicResponse
	if err := json.Unmarshal(respBody, &anthropicResp); err != nil {
		slog.Error("解析响应失败", "provider", "Anthropic", "status", resp.StatusCode, "body", string(respBody))
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	// 检查 API 错误
	if anthropicResp.Error != nil {
		slog.Error("API 错误", "provider", "Anthropic", "error", anthropicResp.Error.Message, "type", anthropicResp.Error.Type)
		return "", fmt.Errorf("API 错误: %s", anthropicResp.Error.Message)
	}

	if resp.StatusCode != http.StatusOK {
		slog.Error("HTTP 错误", "provider", "Anthropic", "status", resp.StatusCode, "body", string(respBody))
		return "", fmt.Errorf("HTTP 错误: %s", resp.Status)
	}

	// 提取文本内容
	var result strings.Builder
	for _, block := range anthropicResp.Content {
		if block.Type == "text" {
			result.WriteString(block.Text)
		}
	}

	if result.Len() == 0 {
		return "", fmt.Errorf("无响应内容")
	}

	slog.Debug("LLM 调用成功",
		"provider", "Anthropic",
		"model", p.model,
		"input_tokens", anthropicResp.Usage.InputTokens,
		"output_tokens", anthropicResp.Usage.OutputTokens,
	)

	return result.String(), nil
}

// IsConfigured 检查是否已配置
func (p *AnthropicProvider) IsConfigured() bool {
	return p.apiKey != ""
}

// Name 返回供应商名称
func (p *AnthropicProvider) Name() string {
	return "Anthropic"
}
