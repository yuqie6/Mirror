package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/yuqie6/WorkMirror/internal/ai"
	"github.com/yuqie6/WorkMirror/internal/ai/prompts"
)

type chatRequest struct {
	Model       string       `json:"model"`
	Messages    []ai.Message `json:"messages"`
	Temperature float64      `json:"temperature,omitempty"`
	MaxTokens   int          `json:"max_tokens,omitempty"`
	Stream      bool         `json:"stream"`
}

type chatResponse struct {
	Choices []struct {
		Message ai.Message `json:"message"`
		Delta   struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error any `json:"error"`
}

func main() {
	var (
		baseURL  = flag.String("base-url", "", "OpenAI-compatible base URL, e.g. https://gpt.devbin.de/proxy/mirror")
		apiKey   = flag.String("api-key", "", "API key (or set env WORKMIRROR_LLM_API_KEY)")
		model    = flag.String("model", "", "model name")
		lang     = flag.String("lang", "zh", "prompt language: zh/en")
		mode     = flag.String("mode", "diff", "probe mode: diff/daily/simple")
		timeout  = flag.Duration("timeout", 120*time.Second, "request timeout")
		temp     = flag.Float64("temperature", 0.2, "temperature")
		maxTok   = flag.Int("max-tokens", 500, "max_tokens")
		endpoint = flag.String("endpoint", "", "override full endpoint (default: {base-url}/v1/chat/completions)")

		diffFilePath = flag.String("file-path", "config.go", "diff file path (for mode=diff)")
		diffLang     = flag.String("file-lang", "Go", "diff language label (for mode=diff)")
		diffTextPath = flag.String("diff-path", "", "path to diff text file (for mode=diff)")
	)
	flag.Parse()

	key := strings.TrimSpace(*apiKey)
	if key == "" {
		key = strings.TrimSpace(os.Getenv("WORKMIRROR_LLM_API_KEY"))
	}
	if strings.TrimSpace(*baseURL) == "" {
		fmt.Fprintln(os.Stderr, "missing -base-url")
		os.Exit(2)
	}
	if strings.TrimSpace(*model) == "" {
		fmt.Fprintln(os.Stderr, "missing -model")
		os.Exit(2)
	}
	if strings.TrimSpace(key) == "" {
		fmt.Fprintln(os.Stderr, "missing -api-key (or env WORKMIRROR_LLM_API_KEY)")
		os.Exit(2)
	}

	msgs, err := buildMessages(strings.ToLower(strings.TrimSpace(*mode)), *lang, *diffFilePath, *diffLang, *diffTextPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "build messages:", err)
		os.Exit(2)
	}

	req := chatRequest{
		Model:       strings.TrimSpace(*model),
		Messages:    msgs,
		Temperature: *temp,
		MaxTokens:   *maxTok,
		Stream:      false,
	}

	payload, err := json.MarshalIndent(req, "", "  ")
	if err != nil {
		fmt.Fprintln(os.Stderr, "marshal request:", err)
		os.Exit(1)
	}

	url := strings.TrimSpace(*endpoint)
	if url == "" {
		url = strings.TrimSuffix(strings.TrimSpace(*baseURL), "/") + "/v1/chat/completions"
	}

	fmt.Println("=== Request ===")
	fmt.Println("endpoint:", url)
	fmt.Println("model:", req.Model)
	fmt.Println("api_key_prefix:", maskKey(key))
	fmt.Println(string(payload))

	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		fmt.Fprintln(os.Stderr, "new request:", err)
		os.Exit(1)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+key)

	client := &http.Client{Timeout: *timeout}
	resp, err := client.Do(httpReq)
	if err != nil {
		fmt.Fprintln(os.Stderr, "do:", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	fmt.Println("\n=== Response ===")
	fmt.Println("status:", resp.Status)
	fmt.Println(string(respBody))

	var parsed chatResponse
	if err := json.Unmarshal(respBody, &parsed); err == nil {
		if len(parsed.Choices) > 0 {
			fmt.Println("\n=== Extracted ===")
			content := strings.TrimSpace(parsed.Choices[0].Message.Content)
			delta := strings.TrimSpace(parsed.Choices[0].Delta.Content)
			if content != "" {
				fmt.Println("message.content:")
				fmt.Println(content)
			} else if delta != "" {
				fmt.Println("delta.content (looks like streaming payload):")
				fmt.Println(delta)
			} else {
				fmt.Println("no content found in choices[0]")
			}
		}
	}
}

func maskKey(key string) string {
	key = strings.TrimSpace(key)
	if len(key) <= 8 {
		return key
	}
	return key[:4] + "..." + key[len(key)-4:]
}

func buildMessages(mode, lang, filePath, fileLang, diffTextPath string) ([]ai.Message, error) {
	if lang != "zh" && lang != "en" {
		lang = "zh"
	}

	switch mode {
	case "diff":
		diffText := "diff --git a/config.go b/config.go\nindex 0000000..1111111 100644\n--- a/config.go\n+++ b/config.go\n@@\n-// old\n+// new\n"
		if strings.TrimSpace(diffTextPath) != "" {
			b, err := os.ReadFile(diffTextPath)
			if err != nil {
				return nil, err
			}
			diffText = string(b)
		}
		user := prompts.DiffAnalysisUser(filePath, fileLang, "", diffText, lang)
		return []ai.Message{
			{Role: "system", Content: prompts.DiffAnalysisSystem(lang)},
			{Role: "user", Content: user},
		}, nil

	case "daily":
		user := prompts.DailySummaryUser(
			time.Now().Format("2006-01-02"),
			480,
			8,
			12,
			320,
			10,
			"- Code.exe: 240 分钟\n- Chrome.exe: 120 分钟\n",
			"- config.go (Go): 重构配置加载\n- provider_openai.go (Go): 修复响应解析\n",
			"",
			lang,
		)
		return []ai.Message{
			{Role: "system", Content: prompts.DailySummarySystem(lang)},
			{Role: "user", Content: user},
		}, nil

	case "simple":
		return []ai.Message{
			{Role: "system", Content: "你必须只输出一个 JSON 对象，不要 markdown。"},
			{Role: "user", Content: `{"ping":"pong"}`},
		}, nil

	default:
		return nil, fmt.Errorf("unknown mode: %s", mode)
	}
}
