package ops

import (
	"strings"
	"testing"
)

func TestSlugify(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Hello World", "hello-world"},
		{"Add User Authentication", "add-user-authentication"},
		{"Feature: OAuth2 Support", "feature-oauth2-support"},
		{"Fix Bug #123", "fix-bug-123"},
		{"Simple", "simple"},
		{"", ""},
		{"a b c d e", "a-b-c-d-e"},
		{"Special!@#$%Chars", "specialchars"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := slugify(tt.input)
			if got != tt.expected {
				t.Errorf("slugify(%q) = %q; want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestSlugify_LengthLimit(t *testing.T) {
	longTitle := "This is a very long title that should be truncated to fit within forty characters"
	result := slugify(longTitle)

	if len(result) > 40 {
		t.Errorf("slugify should limit length to 40, got %d", len(result))
	}
}

func TestTruncateContent(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		maxLen   int
		expected string
	}{
		{"short content", "hello", 10, "hello"},
		{"exact length", "hello", 5, "hello"},
		{"needs truncation", "hello world", 5, "hello\n... (truncated)"},
		{"empty", "", 10, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncateContent(tt.content, tt.maxLen)
			if got != tt.expected {
				t.Errorf("truncateContent(%q, %d) = %q; want %q", tt.content, tt.maxLen, got, tt.expected)
			}
		})
	}
}

func TestGenerateSpecContent(t *testing.T) {
	content := generateSpecContent(
		"Add OAuth2",
		"Add OAuth2 authentication to the API",
		"10 files, 500 lines",
		"### config.yaml\n```yaml\nkey: value\n```",
	)

	// Check key sections exist
	sections := []string{
		"# Feature Specification: Add OAuth2",
		"## Goal",
		"## User Stories",
		"## Requirements",
		"## Functional Requirements",
		"## Non-Functional Requirements",
		"## Architecture Constraints",
		"## Edge Cases",
		"## Success Criteria",
		"## Open Questions",
	}

	for _, section := range sections {
		if !strings.Contains(content, section) {
			t.Errorf("Expected section '%s' in spec content", section)
		}
	}

	// Check query is included
	if !strings.Contains(content, "Add OAuth2 authentication to the API") {
		t.Error("Expected query in spec content")
	}

	// Check codebase summary is included
	if !strings.Contains(content, "10 files, 500 lines") {
		t.Error("Expected codebase summary in spec content")
	}
}

func TestGenerateSpecPrompt_Error(t *testing.T) {
	// Test with non-existent file
	_, err := GenerateSpecPrompt("nonexistent-file.md")
	if err == nil {
		t.Error("Expected error for non-existent spec file")
	}
}
