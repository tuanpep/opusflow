package ops

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIgnoreHandler(t *testing.T) {
	// Create a temporary directory structure
	tmpDir, err := os.MkdirTemp("", "opusflow-ignore-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create root .gitignore
	if err := os.WriteFile(filepath.Join(tmpDir, ".gitignore"), []byte("ignored_root/\n*.log"), 0644); err != nil {
		t.Fatal(err)
	}

	// Create nested structure
	dirs := []string{
		"node_modules",
		"src",
		"ignored_root",
		"src/nested/deep",
		"src/ignored_sub",
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(filepath.Join(tmpDir, dir), 0755); err != nil {
			t.Fatal(err)
		}
	}

	// Create nested .gitignore
	if err := os.WriteFile(filepath.Join(tmpDir, "src", ".gitignore"), []byte("ignored_sub/\n*.tmp"), 0644); err != nil {
		t.Fatal(err)
	}

	handler := NewIgnoreHandler(tmpDir)
	// Simulate walking to load nested ignores
	handler.TrackDirectory(filepath.Join(tmpDir, "src"))

	tests := []struct {
		path   string
		isDir  bool
		expect bool
		name   string
	}{
		{"node_modules", true, true, "Default ignore dir"},
		{"node_modules/foo.js", false, false, "File in optional check? (ShouldIgnore doesn't recurse parents, caller must check parent)"},
		// Ideally ShouldIgnore should be called on parents first by walker.
		// But let's check basic path matching
		{"src", true, false, "Valid dir"},
		{"ignored_root", true, true, "Root gitignore"},
		{"test.log", false, true, "Root gitignore wildcard"},
		{"test.txt", false, false, "Valid file"},
		{"src/ignored_sub", true, true, "Nested gitignore dir"},
		{"src/test.tmp", false, true, "Nested gitignore wildcard"},
		{"src/nested/deep/clean.go", false, false, "Deep valid file"},
		{".git", true, true, "Dot git"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fullPath := filepath.Join(tmpDir, tt.path)
			got := handler.ShouldIgnore(fullPath, tt.isDir)
			if got != tt.expect {
				t.Errorf("ShouldIgnore(%q, %v) = %v; want %v", tt.path, tt.isDir, got, tt.expect)
			}
		})
	}
}
