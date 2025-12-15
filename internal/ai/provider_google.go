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

// GoogleProvider Google Gemini 格式的 LLM 供应商
// 使用 Gemini REST API（2024 年新版）
type GoogleProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// GoogleProviderConfig Google 供应商配置
type GoogleProviderConfig struct {
	APIKey  string
	BaseURL string // 默认 "https://generativelanguage.googleapis.com"
	Model   string // 如 "gemini-1.5-flash"、"gemini-1.5-pro"
}

// NewGoogleProvider 创建 Google Gemini 供应商
func NewGoogleProvider(cfg *GoogleProviderConfig) *GoogleProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}
	model := cfg.Model
	if model == "" {
		model = "gemini-1.5-flash"
	}

	return &GoogleProvider{
		apiKey:  cfg.APIKey,
		baseURL: strings.TrimSuffix(baseURL, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// geminiContent Gemini 内容格式
type geminiContent struct {
	Role  string       `json:"role,omitempty"` // "user" 或 "model"
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

// geminiRequest Gemini 请求结构
type geminiRequest struct {
	Contents          []geminiContent         `json:"contents"`
	SystemInstruction *geminiContent          `json:"systemInstruction,omitempty"`
	GenerationConfig  *geminiGenerationConfig `json:"generationConfig,omitempty"`
}

type geminiGenerationConfig struct {
	Temperature     float64 `json:"temperature,omitempty"`
	MaxOutputTokens int     `json:"maxOutputTokens,omitempty"`
}

// geminiResponse Gemini 响应结构
type geminiResponse struct {
	Candidates    []geminiCandidate `json:"candidates"`
	UsageMetadata *geminiUsage      `json:"usageMetadata,omitempty"`
	Error         *geminiError      `json:"error,omitempty"`
}

type geminiCandidate struct {
	Content       geminiContent `json:"content"`
	FinishReason  string        `json:"finishReason"`
	SafetyRatings []interface{} `json:"safetyRatings,omitempty"`
}

type geminiUsage struct {
	PromptTokenCount     int `json:"promptTokenCount"`
	CandidatesTokenCount int `json:"candidatesTokenCount"`
	TotalTokenCount      int `json:"totalTokenCount"`
}

type geminiError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Status  string `json:"status"`
}

// Chat 发送聊天请求（使用默认参数）
func (p *GoogleProvider) Chat(ctx context.Context, messages []Message) (string, error) {
	return p.ChatWithOptions(ctx, messages, DefaultChatOptions())
}

// ChatWithOptions 带参数的聊天请求
func (p *GoogleProvider) ChatWithOptions(ctx context.Context, messages []Message, opts ChatOptions) (string, error) {
	// 分离 system 消息和对话消息
	var systemInstruction *geminiContent
	var contents []geminiContent

	for _, msg := range messages {
		if msg.Role == "system" {
			// Gemini 的 system instruction
			if systemInstruction == nil {
				systemInstruction = &geminiContent{
					Parts: []geminiPart{{Text: msg.Content}},
				}
			} else {
				// 追加到已有的 system instruction
				systemInstruction.Parts = append(systemInstruction.Parts, geminiPart{Text: msg.Content})
			}
		} else {
			// 转换 role：OpenAI 的 "assistant" -> Gemini 的 "model"
			role := msg.Role
			if role == "assistant" {
				role = "model"
			}
			contents = append(contents, geminiContent{
				Role:  role,
				Parts: []geminiPart{{Text: msg.Content}},
			})
		}
	}

	if len(contents) == 0 {
		return "", fmt.Errorf("Google Gemini API 要求至少有一条消息")
	}

	req := geminiRequest{
		Contents:          contents,
		SystemInstruction: systemInstruction,
		GenerationConfig: &geminiGenerationConfig{
			Temperature:     opts.Temperature,
			MaxOutputTokens: opts.MaxTokens,
		},
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	// Gemini API 端点格式：/v1beta/models/{model}:generateContent
	endpoint := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s",
		p.baseURL, p.model, p.apiKey)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(respBody, &geminiResp); err != nil {
		slog.Error("解析响应失败", "provider", "Google", "status", resp.StatusCode, "body", string(respBody))
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	// 检查 API 错误
	if geminiResp.Error != nil {
		slog.Error("API 错误", "provider", "Google", "error", geminiResp.Error.Message, "code", geminiResp.Error.Code)
		return "", fmt.Errorf("API 错误: %s", geminiResp.Error.Message)
	}

	if resp.StatusCode != http.StatusOK {
		slog.Error("HTTP 错误", "provider", "Google", "status", resp.StatusCode, "body", string(respBody))
		return "", fmt.Errorf("HTTP 错误: %s", resp.Status)
	}

	if len(geminiResp.Candidates) == 0 {
		return "", fmt.Errorf("无响应内容")
	}

	// 提取文本内容
	var result strings.Builder
	for _, part := range geminiResp.Candidates[0].Content.Parts {
		result.WriteString(part.Text)
	}

	if result.Len() == 0 {
		return "", fmt.Errorf("无响应内容")
	}

	if geminiResp.UsageMetadata != nil {
		slog.Debug("LLM 调用成功",
			"provider", "Google",
			"model", p.model,
			"tokens", geminiResp.UsageMetadata.TotalTokenCount,
		)
	}

	return result.String(), nil
}

// IsConfigured 检查是否已配置
func (p *GoogleProvider) IsConfigured() bool {
	return p.apiKey != ""
}

// Name 返回供应商名称
func (p *GoogleProvider) Name() string {
	return "Google"
}
