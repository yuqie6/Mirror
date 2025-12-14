package privacy

import (
	"net/url"
	"regexp"
	"strings"
)

// Sanitizer 负责对可能包含敏感信息的文本做最小化脱敏处理。
// 目标：默认不泄露 URL query/fragment、账号信息等，同时尽量保留可解释性（域名/应用名仍可用于证据链）。
type Sanitizer struct {
	enabled  bool
	patterns []*regexp.Regexp
}

func New(enabled bool, patterns []string) *Sanitizer {
	s := &Sanitizer{enabled: enabled}
	if !enabled || len(patterns) == 0 {
		return s
	}

	s.patterns = make([]*regexp.Regexp, 0, len(patterns))
	for _, raw := range patterns {
		p := strings.TrimSpace(raw)
		if p == "" {
			continue
		}
		re, err := regexp.Compile(p)
		if err != nil {
			continue
		}
		s.patterns = append(s.patterns, re)
	}
	return s
}

func (s *Sanitizer) Enabled() bool {
	return s != nil && s.enabled
}

func (s *Sanitizer) SanitizeWindowTitle(title string) string {
	return s.SanitizeText(title)
}

func (s *Sanitizer) SanitizeBrowserTitle(title string) string {
	return s.SanitizeText(title)
}

func (s *Sanitizer) SanitizeText(input string) string {
	in := strings.TrimSpace(input)
	if s == nil || !s.enabled || in == "" {
		return in
	}

	out := in
	for _, re := range s.patterns {
		if re == nil {
			continue
		}
		out = re.ReplaceAllString(out, "***")
	}
	return strings.TrimSpace(out)
}

// SanitizeURL 默认只保留 scheme/host，并清空 query/fragment，避免泄露参数与锚点。
// path 会被替换为 "/..."（保留“这是一个路径”这一事实，且避免 URL 编码噪音）。
func (s *Sanitizer) SanitizeURL(raw string) string {
	in := strings.TrimSpace(raw)
	if s == nil || !s.enabled || in == "" {
		return in
	}

	parsed, err := url.Parse(in)
	if err != nil || parsed == nil {
		// 粗暴兜底：移除 query/fragment 后再走通用脱敏
		cut := in
		if i := strings.IndexAny(cut, "?#"); i >= 0 {
			cut = cut[:i]
		}
		return s.SanitizeText(cut)
	}

	parsed.User = nil
	parsed.RawQuery = ""
	parsed.ForceQuery = false
	parsed.Fragment = ""
	if strings.TrimSpace(parsed.Host) != "" {
		parsed.Path = "/..."
		parsed.RawPath = ""
	}

	return s.SanitizeText(parsed.String())
}
