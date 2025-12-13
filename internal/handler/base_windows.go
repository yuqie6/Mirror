//go:build windows

package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/yuqie6/mirror/internal/bootstrap"
	"github.com/yuqie6/mirror/internal/eventbus"
)

type API struct {
	rt        *bootstrap.AgentRuntime
	hub       *eventbus.Hub
	startTime time.Time
}

func NewAPI(rt *bootstrap.AgentRuntime, hub *eventbus.Hub) *API {
	return &API{
		rt:        rt,
		hub:       hub,
		startTime: time.Now(),
	}
}

func (a *API) HandleHealth(w http.ResponseWriter, r *http.Request) {
	if a == nil || a.rt == nil || a.rt.Cfg == nil {
		WriteError(w, http.StatusServiceUnavailable, "rt 未初始化")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"name":       a.rt.Cfg.App.Name,
		"version":    a.rt.Cfg.App.Version,
		"started_at": a.startTime.Format(time.RFC3339),
	})
}

func (a *API) HandleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		WriteError(w, http.StatusInternalServerError, "stream not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	if a == nil || a.hub == nil {
		WriteError(w, http.StatusServiceUnavailable, "hub 未初始化")
		return
	}

	ctx := r.Context()
	sub := a.hub.Subscribe(ctx, 32)

	_, _ = io.WriteString(w, "event: ready\n")
	_, _ = io.WriteString(w, "data: {}\n\n")
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_, _ = io.WriteString(w, "event: ping\n")
			_, _ = io.WriteString(w, "data: {}\n\n")
			flusher.Flush()
		case evt, ok := <-sub:
			if !ok {
				return
			}
			b, _ := json.Marshal(evt)
			_, _ = io.WriteString(w, "event: "+sanitizeSSEName(evt.Type)+"\n")
			_, _ = io.WriteString(w, "data: ")
			_, _ = w.Write(b)
			_, _ = io.WriteString(w, "\n\n")
			flusher.Flush()
		}
	}
}

func sanitizeSSEName(name string) string {
	n := strings.TrimSpace(name)
	if n == "" {
		return "message"
	}
	n = strings.ReplaceAll(n, "\n", "")
	n = strings.ReplaceAll(n, "\r", "")
	return n
}

func (a *API) Subscribe(ctx context.Context, buffer int) <-chan eventbus.Event {
	if a == nil || a.hub == nil {
		ch := make(chan eventbus.Event)
		close(ch)
		return ch
	}
	return a.hub.Subscribe(ctx, buffer)
}
