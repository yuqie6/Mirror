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

// ZhipuProvider 智谱 BigModel v4 格式的 LLM 供应商
// 典型上游端点：https://open.bigmodel.cn/api/paas/v4/chat/completions
type ZhipuProvider struct {
	name          string
	apiKey        string
	baseURL       string
	model         string
	requireAPIKey bool
	client        *http.Client
}

type ZhipuProviderConfig struct {
	Name          string
	APIKey        string
	BaseURL       string // 例如 "https://open.bigmodel.cn/api/paas/v4"
	Model         string // 例如 "glm-4.5-flash"
	RequireAPIKey *bool  // 默认 true；default 内置服务可设为 false（由网关侧鉴权/匿名）
}

func NewZhipuProvider(cfg *ZhipuProviderConfig) *ZhipuProvider {
	if cfg == nil {
		cfg = &ZhipuProviderConfig{}
	}

	name := cfg.Name
	if strings.TrimSpace(name) == "" {
		name = "Zhipu"
	}
	baseURL := strings.TrimSuffix(strings.TrimSpace(cfg.BaseURL), "/")
	if baseURL == "" {
		baseURL = "https://open.bigmodel.cn/api/paas/v4"
	}
	model := strings.TrimSpace(cfg.Model)
	if model == "" {
		model = "glm-4.5-flash"
	}

	requireAPIKey := true
	if cfg.RequireAPIKey != nil {
		requireAPIKey = *cfg.RequireAPIKey
	}

	return &ZhipuProvider{
		name:          name,
		apiKey:        strings.TrimSpace(cfg.APIKey),
		baseURL:       baseURL,
		model:         model,
		requireAPIKey: requireAPIKey,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

type zhipuChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Stream      *bool     `json:"stream,omitempty"`
}

type zhipuChatResponse struct {
	ID      string             `json:"id"`
	Choices []openaiChatChoice `json:"choices"`
	Usage   openaiChatUsage    `json:"usage"`
	Error   any                `json:"error,omitempty"`
	Message string             `json:"message,omitempty"`
}

func (p *ZhipuProvider) Chat(ctx context.Context, messages []Message) (string, error) {
	return p.ChatWithOptions(ctx, messages, DefaultChatOptions())
}

func (p *ZhipuProvider) ChatWithOptions(ctx context.Context, messages []Message, opts ChatOptions) (string, error) {
	stream := false
	req := zhipuChatRequest{
		Model:       p.model,
		Messages:    messages,
		Temperature: opts.Temperature,
		MaxTokens:   opts.MaxTokens,
		// 显式关闭流式输出，确保返回 message.content（避免服务端默认返回 delta 导致 content 为空）。
		Stream: &stream,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	endpoint := p.baseURL
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(p.apiKey) != "" {
		// 智谱 v4 官方接口可直接使用 API Key（形如 "id.secret"）作为 Bearer Token。
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
			var env zhipuChatResponse
			if err := json.Unmarshal(respBody, &env); err == nil {
				if strings.TrimSpace(env.Message) != "" {
					msg = strings.TrimSpace(env.Message)
				}
			}
		}
		if msg == "" {
			msg = strings.TrimSpace(string(respBody))
		}
		slog.Error("HTTP 错误", "provider", p.name, "status", resp.StatusCode, "body", string(respBody))
		if msg != "" {
			return "", fmt.Errorf("HTTP 错误: %s: %s", resp.Status, msg)
		}
		return "", fmt.Errorf("HTTP 错误: %s", resp.Status)
	}

	var chatResp zhipuChatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		slog.Error("解析响应失败", "provider", p.name, "status", resp.StatusCode, "body", string(respBody))
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("无响应内容")
	}
	content := strings.TrimSpace(chatResp.Choices[0].Message.Content)
	if content == "" {
		slog.Warn("LLM 返回空内容",
			"provider", p.name,
			"model", p.model,
			"finish_reason", chatResp.Choices[0].FinishReason,
			"has_delta", bytes.Contains(respBody, []byte("\"delta\"")),
			"has_message", bytes.Contains(respBody, []byte("\"message\"")),
		)
		return "", fmt.Errorf("无响应内容")
	}

	slog.Debug("LLM 调用成功",
		"provider", p.name,
		"model", p.model,
		"tokens", chatResp.Usage.TotalTokens,
	)

	return content, nil
}

func (p *ZhipuProvider) IsConfigured() bool {
	if p.requireAPIKey {
		return strings.TrimSpace(p.apiKey) != ""
	}
	return strings.TrimSpace(p.baseURL) != ""
}

func (p *ZhipuProvider) Name() string {
	return p.name
}
