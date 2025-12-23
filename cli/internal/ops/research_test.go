package ops

import (
	"testing"
)

func TestIsBinary_Extensions(t *testing.T) {
	tests := []struct {
		path     string
		expected bool
	}{
		{"image.png", true},
		{"image.jpg", true},
		{"image.jpeg", true},
		{"image.gif", true},
		{"document.pdf", true},
		{"archive.zip", true},
		{"archive.tar", true},
		{"archive.gz", true},
		{"program.exe", true},
		{"data.bin", true},
		{"icon.ico", true},
		// Non-binary
		{"code.go", false},
		{"script.py", false},
		{"config.yaml", false},
		{"README.md", false},
		{"data.json", false},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got := isBinary(tt.path)
			if got != tt.expected {
				t.Errorf("isBinary(%s) = %v; want %v", tt.path, got, tt.expected)
			}
		})
	}
}

func TestSearchResult_Struct(t *testing.T) {
	result := SearchResult{
		File:    "test.go",
		Line:    42,
		Content: "func TestSomething()",
	}

	if result.File != "test.go" {
		t.Errorf("Expected file 'test.go', got '%s'", result.File)
	}
	if result.Line != 42 {
		t.Errorf("Expected line 42, got %d", result.Line)
	}
	if result.Content != "func TestSomething()" {
		t.Errorf("Expected specific content, got '%s'", result.Content)
	}
}
