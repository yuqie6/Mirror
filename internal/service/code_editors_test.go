package service

import "testing"

func TestIsCodeEditor(t *testing.T) {
	if !IsCodeEditor("code.exe") {
		t.Fatalf("code.exe should be code editor")
	}
	if !IsCodeEditor("CoDe.ExE") {
		t.Fatalf("case insensitive match failed")
	}
	if IsCodeEditor("chrome.exe") {
		t.Fatalf("chrome.exe should not be code editor")
	}
}

