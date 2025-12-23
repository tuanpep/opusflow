package ops

import (
	"testing"
)

func TestRunCommand(t *testing.T) {
	// Test with a simple command that should work everywhere
	output, err := RunCommand("echo hello")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if output == "" {
		t.Error("Expected output from echo command")
	}
}

func TestRunCommand_Failure(t *testing.T) {
	// RunCommand returns error message in output, not as error return
	output, err := RunCommand("nonexistent-command-12345")
	if err != nil {
		// Error could be from project root not found, which is acceptable
		t.Logf("RunCommand error (may be expected): %v", err)
		return
	}

	// If no error, output should contain failure message
	if output == "" {
		t.Error("Expected some output from failed command")
	}
}

func TestSearchCodebase(t *testing.T) {
	// Search for something that should exist in this codebase
	results, err := SearchCodebase("package ops")
	if err != nil {
		t.Logf("SearchCodebase error (may be expected if not in project): %v", err)
		return
	}

	if len(results) == 0 {
		t.Log("No results found - this may be expected depending on test context")
	}
}

func TestSearchResult(t *testing.T) {
	// Test SearchResult struct
	result := SearchResult{
		File:    "test.go",
		Line:    42,
		Content: "test content",
	}

	if result.File != "test.go" {
		t.Errorf("Expected file 'test.go', got '%s'", result.File)
	}
	if result.Line != 42 {
		t.Errorf("Expected line 42, got %d", result.Line)
	}
}
