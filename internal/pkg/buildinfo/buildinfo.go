package buildinfo

// Version 在 Release 构建时通过 -ldflags 注入，例如：
// -X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.Version=v0.2.0-alpha.2
var Version = "v0.2.0-alpha.2"

// Commit 在 Release 构建时可选注入 git commit，例如：
// -X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.Commit=abcdef1
var Commit = "unknown"

// DefaultLLMBaseURL 用于内置服务（OpenAI 兼容）默认端点，可在 Release 构建时通过 -ldflags 注入，例如：
// -X github.com/yuqie6/WorkMirror/internal/pkg/buildinfo.DefaultLLMBaseURL=https://example.com
var DefaultLLMBaseURL = ""

// DefaultLLMAPIKey 用于内置免费服务默认 Key（可选），可在 Release 构建时通过 -ldflags 注入。
// 注意：把 Key 写进二进制会增加泄露风险；更推荐服务端匿名访问或用环境变量/配置文件注入。
var DefaultLLMAPIKey = ""

// DefaultLLMModel 用于内置免费服务默认模型（可选），可在 Release 构建时通过 -ldflags 注入。
var DefaultLLMModel = ""
