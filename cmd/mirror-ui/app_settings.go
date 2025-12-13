package main

import (
	"errors"

	"github.com/yuqie6/mirror/internal/bootstrap"
	"github.com/yuqie6/mirror/internal/pkg/config"
)

// SettingsDTO 设置页读取 DTO
type SettingsDTO struct {
	ConfigPath string `json:"config_path"`

	DeepSeekAPIKeySet bool   `json:"deepseek_api_key_set"`
	DeepSeekBaseURL   string `json:"deepseek_base_url"`
	DeepSeekModel     string `json:"deepseek_model"`

	SiliconFlowAPIKeySet      bool   `json:"siliconflow_api_key_set"`
	SiliconFlowBaseURL        string `json:"siliconflow_base_url"`
	SiliconFlowEmbeddingModel string `json:"siliconflow_embedding_model"`
	SiliconFlowRerankerModel  string `json:"siliconflow_reranker_model"`

	DBPath             string   `json:"db_path"`
	DiffWatchPaths     []string `json:"diff_watch_paths"`
	BrowserHistoryPath string   `json:"browser_history_path"`
}

// SaveSettingsRequestDTO 设置页保存 DTO（指针表示可选字段）
type SaveSettingsRequestDTO struct {
	DeepSeekAPIKey  *string `json:"deepseek_api_key"`
	DeepSeekBaseURL *string `json:"deepseek_base_url"`
	DeepSeekModel   *string `json:"deepseek_model"`

	SiliconFlowAPIKey         *string `json:"siliconflow_api_key"`
	SiliconFlowBaseURL        *string `json:"siliconflow_base_url"`
	SiliconFlowEmbeddingModel *string `json:"siliconflow_embedding_model"`
	SiliconFlowRerankerModel  *string `json:"siliconflow_reranker_model"`

	DBPath             *string   `json:"db_path"`
	DiffWatchPaths     *[]string `json:"diff_watch_paths"`
	BrowserHistoryPath *string   `json:"browser_history_path"`
}

func (a *App) GetSettings() (*SettingsDTO, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.core == nil || a.core.Cfg == nil {
		return nil, errors.New("配置未初始化")
	}

	path, err := config.DefaultConfigPath()
	if err != nil {
		return nil, err
	}

	cfg := a.core.Cfg
	dto := &SettingsDTO{
		ConfigPath: path,

		DeepSeekAPIKeySet: cfg.AI.DeepSeek.APIKey != "",
		DeepSeekBaseURL:   cfg.AI.DeepSeek.BaseURL,
		DeepSeekModel:     cfg.AI.DeepSeek.Model,

		SiliconFlowAPIKeySet:      cfg.AI.SiliconFlow.APIKey != "",
		SiliconFlowBaseURL:        cfg.AI.SiliconFlow.BaseURL,
		SiliconFlowEmbeddingModel: cfg.AI.SiliconFlow.EmbeddingModel,
		SiliconFlowRerankerModel:  cfg.AI.SiliconFlow.RerankerModel,

		DBPath:             cfg.Storage.DBPath,
		DiffWatchPaths:     append([]string(nil), cfg.Diff.WatchPaths...),
		BrowserHistoryPath: cfg.Browser.HistoryPath,
	}
	return dto, nil
}

func (a *App) SaveSettings(req SaveSettingsRequestDTO) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.core == nil || a.core.Cfg == nil {
		return errors.New("配置未初始化")
	}

	path, err := config.DefaultConfigPath()
	if err != nil {
		return err
	}

	next := *a.core.Cfg
	if req.DeepSeekAPIKey != nil {
		next.AI.DeepSeek.APIKey = *req.DeepSeekAPIKey
	}
	if req.DeepSeekBaseURL != nil {
		next.AI.DeepSeek.BaseURL = *req.DeepSeekBaseURL
	}
	if req.DeepSeekModel != nil {
		next.AI.DeepSeek.Model = *req.DeepSeekModel
	}

	if req.SiliconFlowAPIKey != nil {
		next.AI.SiliconFlow.APIKey = *req.SiliconFlowAPIKey
	}
	if req.SiliconFlowBaseURL != nil {
		next.AI.SiliconFlow.BaseURL = *req.SiliconFlowBaseURL
	}
	if req.SiliconFlowEmbeddingModel != nil {
		next.AI.SiliconFlow.EmbeddingModel = *req.SiliconFlowEmbeddingModel
	}
	if req.SiliconFlowRerankerModel != nil {
		next.AI.SiliconFlow.RerankerModel = *req.SiliconFlowRerankerModel
	}

	if req.DBPath != nil {
		next.Storage.DBPath = *req.DBPath
	}
	if req.DiffWatchPaths != nil {
		next.Diff.WatchPaths = append([]string(nil), (*req.DiffWatchPaths)...)
	}
	if req.BrowserHistoryPath != nil {
		next.Browser.HistoryPath = *req.BrowserHistoryPath
	}

	if err := config.WriteFile(path, &next); err != nil {
		return err
	}

	newCore, err := bootstrap.NewCore(path)
	if err != nil {
		return err
	}

	oldCore := a.core
	a.core = newCore
	a.cfg = newCore.Cfg

	_ = oldCore.Close()
	return nil
}
