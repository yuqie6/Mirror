package service

import "testing"

func TestIsCodeEditor(t *testing.T) {
	if !IsCodeEditor("code.exe") {
		t.Fatalf("code.exe should be code editor")
	}
	if !IsCodeEditor("CoDe.ExE") {
		t.Fatalf("case insensitive match failed")
	}
	if !IsCodeEditor("C:\\Program Files\\Microsoft VS Code\\Code.exe") {
		t.Fatalf("path normalization match failed")
	}
	if !IsCodeEditor("code-insiders.exe") {
		t.Fatalf("code-insiders.exe should be code editor")
	}
	if !IsCodeEditor("clion64.exe") {
		t.Fatalf("clion64.exe should be code editor")
	}
	if !IsCodeEditor("studio64.exe") {
		t.Fatalf("studio64.exe should be code editor")
	}
	if IsCodeEditor("chrome.exe") {
		t.Fatalf("chrome.exe should not be code editor")
	}
	if !IsCodeEditor("antigravity.exe") {
		t.Fatalf("antigravity.exe should be code editor")
	}
}
