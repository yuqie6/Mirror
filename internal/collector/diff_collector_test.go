//go:build windows

package collector

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDiffCollector_findGitRoot_supportsGitFile(t *testing.T) {
	tmp := t.TempDir()
	repoRoot := filepath.Join(tmp, "repo")
	if err := os.MkdirAll(repoRoot, 0o755); err != nil {
		t.Fatalf("mkdir repoRoot: %v", err)
	}

	// worktree/submodule 形态：.git 为文件
	if err := os.WriteFile(filepath.Join(repoRoot, ".git"), []byte("gitdir: dummy\n"), 0o644); err != nil {
		t.Fatalf("write .git file: %v", err)
	}

	srcDir := filepath.Join(repoRoot, "src")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatalf("mkdir srcDir: %v", err)
	}
	target := filepath.Join(srcDir, "main.go")
	if err := os.WriteFile(target, []byte("package main\n"), 0o644); err != nil {
		t.Fatalf("write target: %v", err)
	}

	root, ok := (&DiffCollector{}).findGitRoot(target)
	if !ok {
		t.Fatalf("expected ok=true, got ok=false")
	}
	if root != repoRoot {
		t.Fatalf("expected root=%q, got %q", repoRoot, root)
	}
}

func TestDiffCollector_findGitRoot_supportsGitDir(t *testing.T) {
	tmp := t.TempDir()
	repoRoot := filepath.Join(tmp, "repo")
	if err := os.MkdirAll(filepath.Join(repoRoot, ".git"), 0o755); err != nil {
		t.Fatalf("mkdir .git dir: %v", err)
	}

	target := filepath.Join(repoRoot, "a", "b", "c.go")
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		t.Fatalf("mkdir target dir: %v", err)
	}
	if err := os.WriteFile(target, []byte("package a\n"), 0o644); err != nil {
		t.Fatalf("write target: %v", err)
	}

	root, ok := (&DiffCollector{}).findGitRoot(target)
	if !ok {
		t.Fatalf("expected ok=true, got ok=false")
	}
	if root != repoRoot {
		t.Fatalf("expected root=%q, got %q", repoRoot, root)
	}
}

