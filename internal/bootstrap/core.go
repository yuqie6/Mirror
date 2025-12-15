package bootstrap

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/yuqie6/WorkMirror/internal/ai"
	"github.com/yuqie6/WorkMirror/internal/pkg/config"
	"github.com/yuqie6/WorkMirror/internal/repository"
	"github.com/yuqie6/WorkMirror/internal/service"
)

func ptrBool(v bool) *bool { return &v }

// Core 持有跨二进制共享的核心依赖
type Core struct {
	Cfg       *config.Config
	DB        *repository.Database
	LogCloser io.Closer

	Repos struct {
		Diff          *repository.DiffRepository
		Event         *repository.EventRepository
		Summary       *repository.SummaryRepository
		Skill         *repository.SkillRepository
		SkillActivity *repository.SkillActivityRepository
		Browser       *repository.BrowserEventRepository
		Session       *repository.SessionRepository
		SessionDiff   *repository.SessionDiffRepository
		PeriodSummary *repository.PeriodSummaryRepository
	}

	Services struct {
		Skills          *service.SkillService
		AI              *service.AIService
		Trends          *service.TrendService
		Sessions        *service.SessionService
		SessionSemantic *service.SessionSemanticService
	}

	Clients struct {
		LLM         ai.LLMProvider // 主 LLM 供应商（根据配置选择）
		SiliconFlow *ai.SiliconFlowClient
	}
}

// NewCore 构建核心依赖（不启动采集）
func NewCore(cfgPath string) (*Core, error) {
	cfg, err := config.Load(cfgPath)
	if err != nil {
		return nil, err
	}
	logCloser, _ := config.SetupLogger(config.LoggerOptions{
		Level:     cfg.App.LogLevel,
		Path:      cfg.App.LogPath,
		Component: filepath.Base(os.Args[0]),
	})

	db, err := repository.NewDatabase(cfg.Storage.DBPath)
	if err != nil {
		if logCloser != nil {
			_ = logCloser.Close()
		}
		return nil, err
	}

	c := &Core{Cfg: cfg, DB: db, LogCloser: logCloser}

	// Repos
	c.Repos.Diff = repository.NewDiffRepository(db.DB)
	c.Repos.Event = repository.NewEventRepository(db.DB)
	c.Repos.Summary = repository.NewSummaryRepository(db.DB)
	c.Repos.Skill = repository.NewSkillRepository(db.DB)
	c.Repos.SkillActivity = repository.NewSkillActivityRepository(db.DB)
	c.Repos.Browser = repository.NewBrowserEventRepository(db.DB)
	c.Repos.Session = repository.NewSessionRepository(db.DB)
	c.Repos.SessionDiff = repository.NewSessionDiffRepository(db.DB)
	c.Repos.PeriodSummary = repository.NewPeriodSummaryRepository(db.DB)

	// Clients / Analyzer
	c.Clients.LLM = selectLLMProvider(cfg)
	var analyzer service.Analyzer
	if c.Clients.LLM != nil && c.Clients.LLM.IsConfigured() {
		analyzer = ai.NewDiffAnalyzer(c.Clients.LLM, cfg.App.Language)
		slog.Info("LLM Provider 已配置", "provider", c.Clients.LLM.Name())
	} else {
		slog.Warn("LLM Provider 未配置，AI 功能将不可用")
	}

	// Services
	c.Services.Skills = service.NewSkillService(c.Repos.Skill, c.Repos.Diff, c.Repos.SkillActivity, service.DefaultExpPolicy{})
	c.Services.AI = service.NewAIService(analyzer, c.Repos.Diff, c.Repos.Event, c.Repos.Summary, c.Services.Skills)
	c.Services.Trends = service.NewTrendService(c.Repos.Skill, c.Repos.SkillActivity, c.Repos.Diff, c.Repos.Event, c.Repos.Session)
	c.Services.Sessions = service.NewSessionService(
		c.Repos.Event,
		c.Repos.Diff,
		c.Repos.Browser,
		c.Repos.Session,
		c.Repos.SessionDiff,
		&service.SessionServiceConfig{IdleGapMinutes: cfg.Collector.SessionIdleMin},
	)
	c.Services.SessionSemantic = service.NewSessionSemanticService(
		analyzer,
		c.Repos.Session,
		c.Repos.Diff,
		c.Repos.Event,
		c.Repos.Browser,
	)

	// Optional SiliconFlow client 由 Agent 侧按需启动 RAG
	if cfg.AI.SiliconFlow.APIKey != "" {
		c.Clients.SiliconFlow = ai.NewSiliconFlowClient(&ai.SiliconFlowConfig{
			APIKey:         cfg.AI.SiliconFlow.APIKey,
			BaseURL:        cfg.AI.SiliconFlow.BaseURL,
			EmbeddingModel: cfg.AI.SiliconFlow.EmbeddingModel,
			RerankerModel:  cfg.AI.SiliconFlow.RerankerModel,
		})
	}

	return c, nil
}

// Close 关闭核心依赖资源
func (c *Core) Close() error {
	if c == nil {
		return nil
	}
	var dbErr error
	if c.DB != nil {
		dbErr = c.DB.Close()
	}
	if c.LogCloser != nil {
		_ = c.LogCloser.Close()
	}
	return dbErr
}

// RequireAIConfigured 检查 AI 是否已配置
func (c *Core) RequireAIConfigured() error {
	if c.Clients.LLM == nil || !c.Clients.LLM.IsConfigured() {
		return fmt.Errorf("LLM API 未配置")
	}
	return nil
}

// selectLLMProvider 根据配置选择 LLM 供应商
func selectLLMProvider(cfg *config.Config) ai.LLMProvider {
	provider := strings.ToLower(strings.TrimSpace(cfg.AI.Provider))

	switch provider {
	case "openai":
		if cfg.AI.OpenAI.APIKey == "" {
			slog.Warn("OpenAI 兼容格式已选择，但未配置 API Key")
			return nil
		}
		return ai.NewOpenAIProvider(&ai.OpenAIProviderConfig{
			Name:    "OpenAI",
			APIKey:  cfg.AI.OpenAI.APIKey,
			BaseURL: cfg.AI.OpenAI.BaseURL,
			Model:   cfg.AI.OpenAI.Model,
			// OpenAI 兼容的第三方多数需要 Key；此处保持严格，避免误调用导致反复 401。
			RequireAPIKey: ptrBool(true),
		})

	case "anthropic":
		if cfg.AI.Anthropic.APIKey == "" {
			slog.Warn("Anthropic 已选择，但未配置 API Key")
			return nil
		}
		return ai.NewAnthropicProvider(&ai.AnthropicProviderConfig{
			APIKey:  cfg.AI.Anthropic.APIKey,
			BaseURL: cfg.AI.Anthropic.BaseURL,
			Model:   cfg.AI.Anthropic.Model,
		})

	case "google":
		if cfg.AI.Google.APIKey == "" {
			slog.Warn("Google Gemini 已选择，但未配置 API Key")
			return nil
		}
		return ai.NewGoogleProvider(&ai.GoogleProviderConfig{
			APIKey:  cfg.AI.Google.APIKey,
			BaseURL: cfg.AI.Google.BaseURL,
			Model:   cfg.AI.Google.Model,
		})

	case "zhipu":
		if cfg.AI.Zhipu.APIKey == "" {
			slog.Warn("Zhipu 已选择，但未配置 API Key")
			return nil
		}
		return ai.NewZhipuProvider(&ai.ZhipuProviderConfig{
			Name:          "Zhipu",
			APIKey:        cfg.AI.Zhipu.APIKey,
			BaseURL:       cfg.AI.Zhipu.BaseURL,
			Model:         cfg.AI.Zhipu.Model,
			RequireAPIKey: ptrBool(true),
		})

	case "default", "":
		// 使用内置免费服务
		if !cfg.AI.Default.Enabled {
			slog.Info("内置免费服务已禁用")
			return nil
		}
		// 检查是否配置了内置服务（base_url 由作者/构建注入，api_key 可选）
		if strings.TrimSpace(cfg.AI.Default.BaseURL) == "" {
			slog.Warn("内置免费服务未配置（需要提供 base_url）")
			return nil
		}
		// default 内置服务（作者提供的 OpenAI 兼容网关）
		return ai.NewOpenAIProvider(&ai.OpenAIProviderConfig{
			Name:    "WorkMirror 内置服务",
			APIKey:  cfg.AI.Default.APIKey,
			BaseURL: cfg.AI.Default.BaseURL,
			Model:   cfg.AI.Default.Model,
			// 允许作者侧按需做匿名/网关鉴权，不强制用户配置 Key。
			RequireAPIKey: ptrBool(false),
		})

	default:
		slog.Warn("未知的 LLM Provider", "provider", provider)
		return nil
	}
}
