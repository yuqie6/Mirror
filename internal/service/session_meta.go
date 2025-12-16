package service

import "github.com/yuqie6/WorkMirror/internal/schema"

const (
	sessionSemanticVersionV2         = "v2"
	degradedReasonDiffInsightPending = "diff_insight_pending"
)

func getSessionDiffIDs(meta schema.JSONMap) []int64 {
	return schema.GetInt64Slice(meta, schema.SessionMetaDiffIDs)
}

func setSessionDiffIDs(meta schema.JSONMap, ids []int64) {
	schema.SetInt64Slice(meta, schema.SessionMetaDiffIDs, ids)
}

func getSessionBrowserEventIDs(meta schema.JSONMap) []int64 {
	return schema.GetInt64Slice(meta, schema.SessionMetaBrowserEventIDs)
}

func setSessionBrowserEventIDs(meta schema.JSONMap, ids []int64) {
	schema.SetInt64Slice(meta, schema.SessionMetaBrowserEventIDs, ids)
}

func getSessionMetaString(meta schema.JSONMap, key string) string {
	if meta == nil {
		return ""
	}
	raw, ok := meta[key]
	if !ok || raw == nil {
		return ""
	}
	s, _ := raw.(string)
	return s
}

func setSessionMetaString(meta schema.JSONMap, key, value string) {
	if meta == nil {
		return
	}
	if value == "" {
		delete(meta, key)
		return
	}
	meta[key] = value
}
