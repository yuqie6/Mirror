package main

import (
	"context"
	"sync"

	"github.com/yuqie6/mirror/internal/bootstrap"
	"github.com/yuqie6/mirror/internal/pkg/config"
)

// App struct
type App struct {
	mu   sync.RWMutex
	ctx  context.Context
	cfg  *config.Config
	core *bootstrap.Core
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.mu.Lock()
	a.ctx = ctx
	a.mu.Unlock()

	startAgentOnStartup()

	core, err := bootstrap.NewCore("")
	a.mu.Lock()
	defer a.mu.Unlock()
	if err != nil {
		// UI 启动时不 panic，改为延迟报错
		a.core = nil
		a.cfg = &config.Config{}
		return
	}
	a.core = core
	a.cfg = core.Cfg
}
