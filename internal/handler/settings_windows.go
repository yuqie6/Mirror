//go:build windows

package handler

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/yuqie6/WorkMirror/internal/dto"
	"github.com/yuqie6/WorkMirror/internal/eventbus"
	"github.com/yuqie6/WorkMirror/internal/pkg/buildinfo"
	"github.com/yuqie6/WorkMirror/internal/pkg/config"
)

func (a *API) HandleSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.getSettings(w, r)
	case http.MethodPost:
		a.saveSettings(w, r)
	default:
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (a *API) getSettings(w http.ResponseWriter, r *http.Request) {
	path, err := config.DefaultConfigPath()
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	cfg, err := config.Load(path)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, &dto.SettingsDTO{
		ConfigPath: path,

		Language: cfg.App.Language,

		AI: dto.AISettingsDTO{
			Provider: cfg.AI.Provider,
			Default: dto.AIProviderSettingsDTO{
				Enabled:       cfg.AI.Default.Enabled,
				APIKeySet:     cfg.AI.Default.APIKey != "",
				BaseURL:       cfg.AI.Default.BaseURL,
				Model:         cfg.AI.Default.Model,
				APIKeyLocked:  strings.TrimSpace(buildinfo.DefaultLLMAPIKey) != "",
				BaseURLLocked: strings.TrimSpace(buildinfo.DefaultLLMBaseURL) != "",
				ModelLocked:   strings.TrimSpace(buildinfo.DefaultLLMModel) != "",
			},
			OpenAI: dto.AIProviderSettingsDTO{
				APIKeySet: cfg.AI.OpenAI.APIKey != "",
				BaseURL:   cfg.AI.OpenAI.BaseURL,
				Model:     cfg.AI.OpenAI.Model,
			},
			Anthropic: dto.AIProviderSettingsDTO{
				APIKeySet: cfg.AI.Anthropic.APIKey != "",
				BaseURL:   cfg.AI.Anthropic.BaseURL,
				Model:     cfg.AI.Anthropic.Model,
			},
			Google: dto.AIProviderSettingsDTO{
				APIKeySet: cfg.AI.Google.APIKey != "",
				BaseURL:   cfg.AI.Google.BaseURL,
				Model:     cfg.AI.Google.Model,
			},
			Zhipu: dto.AIProviderSettingsDTO{
				APIKeySet: cfg.AI.Zhipu.APIKey != "",
				BaseURL:   cfg.AI.Zhipu.BaseURL,
				Model:     cfg.AI.Zhipu.Model,
			},
			SiliconFlow: dto.SiliconFlowSettingsDTO{
				APIKeySet:      cfg.AI.SiliconFlow.APIKey != "",
				BaseURL:        cfg.AI.SiliconFlow.BaseURL,
				EmbeddingModel: cfg.AI.SiliconFlow.EmbeddingModel,
				RerankerModel:  cfg.AI.SiliconFlow.RerankerModel,
			},
		},

		DBPath:             cfg.Storage.DBPath,
		DiffEnabled:        cfg.Diff.Enabled,
		DiffWatchPaths:     append([]string{}, cfg.Diff.WatchPaths...),
		BrowserEnabled:     cfg.Browser.Enabled,
		BrowserHistoryPath: cfg.Browser.HistoryPath,

		PrivacyEnabled:  cfg.Privacy.Enabled,
		PrivacyPatterns: append([]string{}, cfg.Privacy.Patterns...),
	})
}

func (a *API) saveSettings(w http.ResponseWriter, r *http.Request) {
	var req dto.SaveSettingsRequestDTO
	if err := readJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	path, err := config.DefaultConfigPath()
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	cur, err := config.Load(path)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	next := *cur
	if req.Language != nil {
		lang := strings.ToLower(strings.TrimSpace(*req.Language))
		if lang == "en" || lang == "zh" {
			next.App.Language = lang
		}
	}
	if req.AI != nil {
		if req.AI.Provider != nil {
			p := strings.ToLower(strings.TrimSpace(*req.AI.Provider))
			switch p {
			case "", "default", "openai", "anthropic", "google", "zhipu":
				if p == "" {
					p = "default"
				}
				next.AI.Provider = p
			}
		}

		if req.AI.Default != nil {
			if req.AI.Default.Enabled != nil {
				next.AI.Default.Enabled = *req.AI.Default.Enabled
			}
			if req.AI.Default.APIKey != nil {
				if strings.TrimSpace(buildinfo.DefaultLLMAPIKey) == "" {
					next.AI.Default.APIKey = strings.TrimSpace(*req.AI.Default.APIKey)
				}
			}
			if req.AI.Default.BaseURL != nil {
				if strings.TrimSpace(buildinfo.DefaultLLMBaseURL) == "" {
					next.AI.Default.BaseURL = strings.TrimSpace(*req.AI.Default.BaseURL)
				}
			}
			if req.AI.Default.Model != nil {
				if strings.TrimSpace(buildinfo.DefaultLLMModel) == "" {
					next.AI.Default.Model = strings.TrimSpace(*req.AI.Default.Model)
				}
			}
		}

		if req.AI.OpenAI != nil {
			if req.AI.OpenAI.APIKey != nil {
				next.AI.OpenAI.APIKey = strings.TrimSpace(*req.AI.OpenAI.APIKey)
			}
			if req.AI.OpenAI.BaseURL != nil {
				next.AI.OpenAI.BaseURL = strings.TrimSpace(*req.AI.OpenAI.BaseURL)
			}
			if req.AI.OpenAI.Model != nil {
				next.AI.OpenAI.Model = strings.TrimSpace(*req.AI.OpenAI.Model)
			}
		}

		if req.AI.Anthropic != nil {
			if req.AI.Anthropic.APIKey != nil {
				next.AI.Anthropic.APIKey = strings.TrimSpace(*req.AI.Anthropic.APIKey)
			}
			if req.AI.Anthropic.BaseURL != nil {
				next.AI.Anthropic.BaseURL = strings.TrimSpace(*req.AI.Anthropic.BaseURL)
			}
			if req.AI.Anthropic.Model != nil {
				next.AI.Anthropic.Model = strings.TrimSpace(*req.AI.Anthropic.Model)
			}
		}

		if req.AI.Google != nil {
			if req.AI.Google.APIKey != nil {
				next.AI.Google.APIKey = strings.TrimSpace(*req.AI.Google.APIKey)
			}
			if req.AI.Google.BaseURL != nil {
				next.AI.Google.BaseURL = strings.TrimSpace(*req.AI.Google.BaseURL)
			}
			if req.AI.Google.Model != nil {
				next.AI.Google.Model = strings.TrimSpace(*req.AI.Google.Model)
			}
		}

		if req.AI.Zhipu != nil {
			if req.AI.Zhipu.APIKey != nil {
				next.AI.Zhipu.APIKey = strings.TrimSpace(*req.AI.Zhipu.APIKey)
			}
			if req.AI.Zhipu.BaseURL != nil {
				next.AI.Zhipu.BaseURL = strings.TrimSpace(*req.AI.Zhipu.BaseURL)
			}
			if req.AI.Zhipu.Model != nil {
				next.AI.Zhipu.Model = strings.TrimSpace(*req.AI.Zhipu.Model)
			}
		}

		if req.AI.SiliconFlow != nil {
			if req.AI.SiliconFlow.APIKey != nil {
				next.AI.SiliconFlow.APIKey = strings.TrimSpace(*req.AI.SiliconFlow.APIKey)
			}
			if req.AI.SiliconFlow.BaseURL != nil {
				next.AI.SiliconFlow.BaseURL = strings.TrimSpace(*req.AI.SiliconFlow.BaseURL)
			}
			if req.AI.SiliconFlow.EmbeddingModel != nil {
				next.AI.SiliconFlow.EmbeddingModel = strings.TrimSpace(*req.AI.SiliconFlow.EmbeddingModel)
			}
			if req.AI.SiliconFlow.RerankerModel != nil {
				next.AI.SiliconFlow.RerankerModel = strings.TrimSpace(*req.AI.SiliconFlow.RerankerModel)
			}
		}
	}

	if req.DBPath != nil {
		next.Storage.DBPath = *req.DBPath
	}
	if req.DiffEnabled != nil {
		next.Diff.Enabled = *req.DiffEnabled
	}
	if req.DiffWatchPaths != nil {
		paths := make([]string, 0, len(*req.DiffWatchPaths))
		for _, p := range *req.DiffWatchPaths {
			v := strings.TrimSpace(p)
			if v == "" {
				continue
			}
			if err := validateDirExists(v); err != nil {
				WriteAPIError(w, http.StatusBadRequest, APIError{
					Error: "diff watch path 无效: " + v,
					Code:  "invalid_diff_watch_path",
					Hint:  err.Error(),
				})
				return
			}
			paths = append(paths, v)
		}
		next.Diff.WatchPaths = paths
	}
	if req.BrowserEnabled != nil {
		next.Browser.Enabled = *req.BrowserEnabled
	}
	if req.BrowserHistoryPath != nil {
		p := strings.TrimSpace(*req.BrowserHistoryPath)
		if p != "" {
			if err := validateFileExists(p); err != nil {
				WriteAPIError(w, http.StatusBadRequest, APIError{
					Error: "browser history path 无效",
					Code:  "invalid_browser_history_path",
					Hint:  err.Error(),
				})
				return
			}
		}
		next.Browser.HistoryPath = p
	}
	if req.PrivacyEnabled != nil {
		next.Privacy.Enabled = *req.PrivacyEnabled
	}
	if req.PrivacyPatterns != nil {
		next.Privacy.Patterns = append([]string(nil), (*req.PrivacyPatterns)...)
	}

	if err := config.WriteFile(path, &next); err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if a.hub != nil {
		a.hub.Publish(eventbus.Event{Type: "settings_updated"})
		a.hub.Publish(eventbus.Event{Type: "pipeline_status_changed"})
	}
	WriteJSON(w, http.StatusOK, &dto.SaveSettingsResponseDTO{RestartRequired: true})
}

func validateDirExists(p string) error {
	info, err := os.Stat(p)
	if err != nil {
		return fmt.Errorf("路径不存在或不可访问: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("不是目录")
	}
	return nil
}

func validateFileExists(p string) error {
	info, err := os.Stat(p)
	if err != nil {
		return fmt.Errorf("文件不存在或不可访问: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("是目录，不是文件")
	}
	return nil
}
