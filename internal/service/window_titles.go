package service

import (
	"sort"
	"strings"

	"github.com/yuqie6/WorkMirror/internal/ai"
	"github.com/yuqie6/WorkMirror/internal/schema"
)

type windowTitleAgg struct {
	app   string
	title string
	sec   int
	cnt   int
}

// TopWindowTitleInfosFromEvents 从窗口事件中聚合“标题证据”。
// - 仅用于摘要/解释性证据；不是精确时间轴。
// - 会过滤空 app/title，并做最小化 trim。
func TopWindowTitleInfosFromEvents(events []schema.Event, limit int) []ai.WindowTitleInfo {
	if len(events) == 0 || limit == 0 {
		return nil
	}
	if limit < 0 {
		limit = 0
	}

	byKey := make(map[string]*windowTitleAgg, 64)
	for _, e := range events {
		app := strings.TrimSpace(e.AppName)
		title := strings.TrimSpace(e.Title)
		if app == "" || title == "" {
			continue
		}
		sec := e.Duration
		if sec < 0 {
			sec = 0
		}
		key := app + "\n" + title
		it, ok := byKey[key]
		if !ok {
			byKey[key] = &windowTitleAgg{app: app, title: title, sec: sec, cnt: 1}
			continue
		}
		it.sec += sec
		it.cnt++
	}

	items := make([]windowTitleAgg, 0, len(byKey))
	for _, it := range byKey {
		if it == nil {
			continue
		}
		items = append(items, *it)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].sec == items[j].sec {
			if items[i].app == items[j].app {
				return items[i].title < items[j].title
			}
			return items[i].app < items[j].app
		}
		return items[i].sec > items[j].sec
	})

	if limit > 0 && limit < len(items) {
		items = items[:limit]
	}

	out := make([]ai.WindowTitleInfo, 0, len(items))
	for _, it := range items {
		out = append(out, ai.WindowTitleInfo{
			AppName:     it.app,
			Title:       it.title,
			DurationSec: it.sec,
			SampleCount: it.cnt,
		})
	}
	return out
}
