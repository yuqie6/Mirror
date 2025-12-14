package service

import (
	"sort"
	"strings"
	"time"
)

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// truncateRunes 按 rune 数量截断字符串
// 正确处理 Unicode 字符，超过 max 长度时添加省略号
func truncateRunes(s string, max int) string {
	if max <= 0 || s == "" {
		return ""
	}
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "..."
}

// FormatTimeRangeMs 将毫秒时间戳格式化为时间范围字符串
func FormatTimeRangeMs(startMs, endMs int64) string {
	if startMs <= 0 || endMs <= 0 || endMs <= startMs {
		return ""
	}
	start := time.UnixMilli(startMs).Format("15:04")
	end := time.UnixMilli(endMs).Format("15:04")
	return start + "-" + end
}

// topKeysByCount 返回按计数排序的 TopN 键（计数<=0与空 key 会被过滤）
func topKeysByCount(m map[string]int, limit int) []string {
	type kv struct {
		k string
		v int
	}

	items := make([]kv, 0, len(m))
	for k, v := range m {
		if strings.TrimSpace(k) == "" || v <= 0 {
			continue
		}
		items = append(items, kv{k: k, v: v})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].v == items[j].v {
			return items[i].k < items[j].k
		}
		return items[i].v > items[j].v
	})

	if limit <= 0 || limit > len(items) {
		limit = len(items)
	}
	out := make([]string, 0, limit)
	for i := 0; i < limit; i++ {
		out = append(out, items[i].k)
	}
	return out
}
