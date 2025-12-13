package service

import (
	"path"
	"strings"
)

// DefaultCodeEditors 默认代码编辑器列表（单一来源）
// 注意：全部使用小写，匹配时进行大小写不敏感比较
var DefaultCodeEditors = []string{
	// VS Code & forks
	"code.exe", "code-insiders.exe", "cursor.exe", "vscodium.exe", "codium.exe", "antigravity.exe",

	// JetBrains
	"idea64.exe", "idea.exe",
	"goland64.exe", "goland.exe",
	"pycharm64.exe", "pycharm.exe",
	"webstorm64.exe", "webstorm.exe",
	"phpstorm64.exe", "phpstorm.exe",
	"clion64.exe", "clion.exe",
	"rider64.exe", "rider.exe",
	"datagrip64.exe", "datagrip.exe",
	"rubymine64.exe", "rubymine.exe",
	"rustrover64.exe", "rustrover.exe",
	"fleet.exe",

	// Microsoft
	"devenv.exe",

	// Zed
	"zed.exe",

	// Others
	"studio64.exe", "studio.exe", // Android Studio
	"sublime_text.exe", "notepad++.exe", "atom.exe",
	"vim.exe", "gvim.exe", "nvim.exe", "emacs.exe",
}

var defaultCodeEditorSet = func() map[string]struct{} {
	set := make(map[string]struct{}, len(DefaultCodeEditors))
	for _, editor := range DefaultCodeEditors {
		editor = strings.TrimSpace(strings.ToLower(editor))
		if editor == "" {
			continue
		}
		set[editor] = struct{}{}
	}
	return set
}()

// IsCodeEditor 判断是否是代码编辑器（大小写不敏感）
func IsCodeEditor(appName string) bool {
	normalized := normalizeProcessName(appName)
	_, ok := defaultCodeEditorSet[normalized]
	return ok
}

// normalizeProcessName 标准化进程名称
func normalizeProcessName(appName string) string {
	s := strings.TrimSpace(strings.ToLower(appName))
	if s == "" {
		return ""
	}
	s = strings.ReplaceAll(s, "\\", "/")
	return path.Base(s)
}
