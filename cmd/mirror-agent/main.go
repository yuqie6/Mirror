//go:build windows

package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/yuqie6/mirror/internal/bootstrap"
	"github.com/yuqie6/mirror/internal/handler"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	rt, err := bootstrap.NewAgentRuntime(ctx, "")
	if err != nil {
		slog.Error("启动 Agent 失败", "error", err)
		os.Exit(1)
	}
	defer rt.Close()

	slog.Info("Mirror Agent 启动中...", "name", rt.Cfg.App.Name, "version", rt.Cfg.App.Version)
	slog.Info("Mirror Agent 已启动")

	// ========== 系统托盘 ==========
	quitChan := make(chan struct{})

	tray := handler.NewTrayHandler(&handler.TrayConfig{
		AppName: rt.Cfg.App.Name,
		OnOpen: func() {
			slog.Info("打开 UI 面板")
			handler.OpenUI()
		},
		OnQuit: func() {
			slog.Info("从托盘退出")
			close(quitChan)
		},
	})

	// 监听系统信号
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		select {
		case <-sigChan:
			slog.Info("收到系统退出信号")
			tray.Quit()
		case <-quitChan:
			// 从托盘菜单退出
		}
	}()

	// 运行托盘（阻塞）
	tray.Run()

	slog.Info("正在关闭...")

	cancel()
	slog.Info("Mirror Agent 已退出")
}
