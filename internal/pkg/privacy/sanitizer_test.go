package privacy

import "testing"

func TestSanitizeText_Disabled(t *testing.T) {
	s := New(false, []string{`secret`})
	if got := s.SanitizeText(" secret "); got != "secret" {
		t.Fatalf("got %q", got)
	}
}

func TestSanitizeText_WithPatterns(t *testing.T) {
	s := New(true, []string{`(?i)password=[^&\s]+`, `\b\d{11}\b`})
	in := "password=abc123 13800138000"
	got := s.SanitizeText(in)
	if got == in {
		t.Fatalf("expected redacted, got %q", got)
	}
	if got != "*** ***" {
		t.Fatalf("got %q", got)
	}
}

func TestSanitizeURL_StripsQueryAndFragment(t *testing.T) {
	s := New(true, nil)
	in := "https://example.com/path/to?a=1&token=xyz#frag"
	got := s.SanitizeURL(in)
	if got != "https://example.com/..." {
		t.Fatalf("got %q", got)
	}
}

func TestSanitizeURL_InvalidURLFallback(t *testing.T) {
	s := New(true, []string{`token=[^\\s]+`})
	in := "not a url token=abc"
	got := s.SanitizeURL(in)
	if got == in {
		t.Fatalf("expected redacted, got %q", got)
	}
}
