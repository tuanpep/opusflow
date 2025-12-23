package ops

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewIgnoreHandler(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-ignore-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	handler := NewIgnoreHandler(tmpDir)
	if handler == nil {
		t.Fatal("Expected non-nil handler")
	}
}

func TestIgnoreHandler_DefaultIgnores(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-ignore-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	handler := NewIgnoreHandler(tmpDir)

	// Test default ignored directories
	defaultIgnored := []string{
		"node_modules",
		".git",
		"__pycache__",
		".venv",
		"vendor",
		"dist",
		".next",
	}

	for _, dir := range defaultIgnored {
		path := filepath.Join(tmpDir, dir)
		if !handler.ShouldIgnore(path, true) {
			t.Errorf("Expected '%s' to be ignored by default", dir)
		}
	}
}

func TestIgnoreHandler_GitignoreRespected(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-ignore-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create .gitignore
	gitignoreContent := "*.log\nbuild/\nsecrets.txt"
	if err := os.WriteFile(filepath.Join(tmpDir, ".gitignore"), []byte(gitignoreContent), 0644); err != nil {
		t.Fatal(err)
	}

	handler := NewIgnoreHandler(tmpDir)

	tests := []struct {
		path   string
		isDir  bool
		ignore bool
	}{
		{"test.log", false, true},
		{"app.log", false, true},
		{"test.txt", false, false},
		{"build", true, true},
		{"secrets.txt", false, true},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			fullPath := filepath.Join(tmpDir, tt.path)
			got := handler.ShouldIgnore(fullPath, tt.isDir)
			if got != tt.ignore {
				t.Errorf("ShouldIgnore(%s) = %v; want %v", tt.path, got, tt.ignore)
			}
		})
	}
}

func TestIgnoreHandler_NestedGitignore(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-ignore-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create src directory
	srcDir := filepath.Join(tmpDir, "src")
	if err := os.MkdirAll(srcDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Create nested .gitignore in src/
	nestedGitignore := "*.tmp\ngenerated/"
	if err := os.WriteFile(filepath.Join(srcDir, ".gitignore"), []byte(nestedGitignore), 0644); err != nil {
		t.Fatal(err)
	}

	handler := NewIgnoreHandler(tmpDir)
	handler.TrackDirectory(srcDir)

	// Files in src/ should respect nested .gitignore
	if !handler.ShouldIgnore(filepath.Join(srcDir, "test.tmp"), false) {
		t.Error("Expected *.tmp to be ignored in src/")
	}

	// Files in root should not be affected by nested .gitignore
	if handler.ShouldIgnore(filepath.Join(tmpDir, "test.tmp"), false) {
		t.Error("Expected *.tmp to NOT be ignored in root")
	}
}

func TestIgnoreHandler_DotFiles(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-ignore-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	handler := NewIgnoreHandler(tmpDir)

	// .git should be ignored
	if !handler.ShouldIgnore(filepath.Join(tmpDir, ".git"), true) {
		t.Error("Expected .git to be ignored")
	}

	// .gitignore should NOT be ignored (it's a config file)
	// Actually, files are not directories, so default handler might not ignore them
}

func TestIgnoreHandler_ValidFiles(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-ignore-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	handler := NewIgnoreHandler(tmpDir)

	validFiles := []string{
		"main.go",
		"README.md",
		"src/app.ts",
		"config/settings.yaml",
	}

	for _, file := range validFiles {
		path := filepath.Join(tmpDir, file)
		if handler.ShouldIgnore(path, false) {
			t.Errorf("Expected '%s' to NOT be ignored", file)
		}
	}
}
