package bootstrap

import (
	"fmt"

	"github.com/yuqie6/mirror/internal/ai"
	"github.com/yuqie6/mirror/internal/pkg/config"
	"github.com/yuqie6/mirror/internal/repository"
	"github.com/yuqie6/mirror/internal/service"
)

// Core 持有跨二进制共享的核心依赖
type Core struct {
	Cfg *config.Config
	DB  *repository.Database

	Repos struct {
		Diff    *repository.DiffRepository
		Event   *repository.EventRepository
		Summary *repository.SummaryRepository
		Skill   *repository.SkillRepository
		Browser *repository.BrowserEventRepository
	}

	Services struct {
		Skills *service.SkillService
		AI     *service.AIService
		Trends *service.TrendService
	}

	Clients struct {
		DeepSeek    *ai.DeepSeekClient
		SiliconFlow *ai.SiliconFlowClient
	}
}

// NewCore 构建核心依赖（不启动采集）
func NewCore(cfgPath string) (*Core, error) {
	cfg, err := config.Load(cfgPath)
	if err != nil {
		return nil, err
	}
	config.SetupLogger(cfg.App.LogLevel)

	db, err := repository.NewDatabase(cfg.Storage.DBPath)
	if err != nil {
		return nil, err
	}

	c := &Core{Cfg: cfg, DB: db}

	// Repos
	c.Repos.Diff = repository.NewDiffRepository(db.DB)
	c.Repos.Event = repository.NewEventRepository(db.DB)
	c.Repos.Summary = repository.NewSummaryRepository(db.DB)
	c.Repos.Skill = repository.NewSkillRepository(db.DB)
	c.Repos.Browser = repository.NewBrowserEventRepository(db.DB)

	// Clients / Analyzer
	c.Clients.DeepSeek = ai.NewDeepSeekClient(&ai.DeepSeekConfig{
		APIKey:  cfg.AI.DeepSeek.APIKey,
		BaseURL: cfg.AI.DeepSeek.BaseURL,
		Model:   cfg.AI.DeepSeek.Model,
	})
	analyzer := ai.NewDiffAnalyzer(c.Clients.DeepSeek)

	// Services
	c.Services.Skills = service.NewSkillService(c.Repos.Skill, c.Repos.Diff)
	c.Services.AI = service.NewAIService(analyzer, c.Repos.Diff, c.Repos.Event, c.Repos.Summary, c.Services.Skills)
	c.Services.Trends = service.NewTrendService(c.Repos.Skill, c.Repos.Diff, c.Repos.Event)

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

func (c *Core) Close() error {
	if c == nil || c.DB == nil {
		return nil
	}
	return c.DB.Close()
}

func (c *Core) RequireAIConfigured() error {
	if c.Clients.DeepSeek == nil || !c.Clients.DeepSeek.IsConfigured() {
		return fmt.Errorf("DeepSeek API 未配置")
	}
	return nil
}

