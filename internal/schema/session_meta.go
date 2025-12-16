package schema

// Session 元数据字段（存储在 Session.Metadata JSONMap 中）。
//
// 这些 key 会在 handler/service/observability 等多处使用；集中定义避免字符串漂移。
const (
	SessionMetaDiffIDs         = "diff_ids"
	SessionMetaBrowserEventIDs = "browser_event_ids"
	SessionMetaSkillKeys       = "skill_keys"

	SessionMetaSemanticSource  = "semantic_source"  // ai | rule
	SessionMetaSemanticVersion = "semantic_version" // e.g. "v1"
	SessionMetaEvidenceHint    = "evidence_hint"    // diff+browser | diff | browser | window_only
	SessionMetaDegradedReason  = "degraded_reason"  // not_configured | provider_error | rate_limited | ...
)
