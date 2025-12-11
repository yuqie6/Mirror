package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// SiliconFlowClient 硅基流动 API 客户端
type SiliconFlowClient struct {
	apiKey         string
	baseURL        string
	embeddingModel string
	rerankerModel  string
	client         *http.Client
}

// SiliconFlowConfig 配置
type SiliconFlowConfig struct {
	APIKey         string
	BaseURL        string
	EmbeddingModel string
	RerankerModel  string
}

// NewSiliconFlowClient 创建客户端
func NewSiliconFlowClient(cfg *SiliconFlowConfig) *SiliconFlowClient {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.siliconflow.cn/v1"
	}
	if cfg.EmbeddingModel == "" {
		cfg.EmbeddingModel = "BAAI/bge-large-zh-v1.5"
	}
	if cfg.RerankerModel == "" {
		cfg.RerankerModel = "BAAI/bge-reranker-v2-m3"
	}

	return &SiliconFlowClient{
		apiKey:         cfg.APIKey,
		baseURL:        cfg.BaseURL,
		embeddingModel: cfg.EmbeddingModel,
		rerankerModel:  cfg.RerankerModel,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// EmbeddingRequest 嵌入请求
type SFEmbeddingRequest struct {
	Model          string   `json:"model"`
	Input          []string `json:"input"`
	EncodingFormat string   `json:"encoding_format,omitempty"`
}

// EmbeddingResponse 嵌入响应
type SFEmbeddingResponse struct {
	Object string            `json:"object"`
	Data   []SFEmbeddingData `json:"data"`
	Model  string            `json:"model"`
	Usage  SFEmbeddingUsage  `json:"usage"`
}

// EmbeddingData 嵌入数据
type SFEmbeddingData struct {
	Object    string    `json:"object"`
	Index     int       `json:"index"`
	Embedding []float32 `json:"embedding"`
}

// EmbeddingUsage 用量
type SFEmbeddingUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// Embed 生成文本嵌入
func (c *SiliconFlowClient) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	if !c.IsConfigured() {
		return nil, fmt.Errorf("SiliconFlow API 未配置")
	}

	req := SFEmbeddingRequest{
		Model: c.embeddingModel,
		Input: texts,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		slog.Error("SiliconFlow Embedding API 错误", "status", resp.StatusCode, "body", string(respBody))
		return nil, fmt.Errorf("API 错误: %s", resp.Status)
	}

	var embResp SFEmbeddingResponse
	if err := json.Unmarshal(respBody, &embResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	embeddings := make([][]float32, len(embResp.Data))
	for _, d := range embResp.Data {
		embeddings[d.Index] = d.Embedding
	}

	slog.Debug("SiliconFlow Embedding 完成", "count", len(texts), "tokens", embResp.Usage.TotalTokens)

	return embeddings, nil
}

// RerankRequest 重排请求
type SFRerankRequest struct {
	Model     string   `json:"model"`
	Query     string   `json:"query"`
	Documents []string `json:"documents"`
	TopN      int      `json:"top_n,omitempty"`
}

// RerankResponse 重排响应
type SFRerankResponse struct {
	Model   string           `json:"model"`
	Results []SFRerankResult `json:"results"`
}

// RerankResult 重排结果
type SFRerankResult struct {
	Index          int     `json:"index"`
	RelevanceScore float64 `json:"relevance_score"`
	Document       string  `json:"document,omitempty"`
}

// Rerank 重排文档
func (c *SiliconFlowClient) Rerank(ctx context.Context, query string, documents []string, topN int) ([]SFRerankResult, error) {
	if !c.IsConfigured() {
		return nil, fmt.Errorf("SiliconFlow API 未配置")
	}

	if topN <= 0 {
		topN = 5
	}

	req := SFRerankRequest{
		Model:     c.rerankerModel,
		Query:     query,
		Documents: documents,
		TopN:      topN,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/rerank", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		slog.Error("SiliconFlow Rerank API 错误", "status", resp.StatusCode, "body", string(respBody))
		return nil, fmt.Errorf("API 错误: %s", resp.Status)
	}

	var rerankResp SFRerankResponse
	if err := json.Unmarshal(respBody, &rerankResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	slog.Debug("SiliconFlow Rerank 完成", "docs", len(documents), "topN", topN)

	return rerankResp.Results, nil
}

// IsConfigured 检查是否已配置
func (c *SiliconFlowClient) IsConfigured() bool {
	return c.apiKey != ""
}
