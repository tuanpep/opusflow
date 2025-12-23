package ops

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReadFile_NonExistent(t *testing.T) {
	_, err := ReadFile("nonexistent-file-12345.txt")
	if err == nil {
		t.Error("Expected error for non-existent file")
	}
}

func TestWriteFile_CreateDir(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-files-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create a .agent marker to make it a project root
	agentDir := filepath.Join(tmpDir, ".agent")
	if err := os.MkdirAll(agentDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Save current dir and change to tmpDir
	oldWd, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(oldWd)

	// Test writing to a nested path that doesn't exist
	nestedPath := filepath.Join("subdir", "nested", "file.txt")
	err = WriteFile(nestedPath, "test content")
	if err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	// Verify file was created
	content, err := os.ReadFile(filepath.Join(tmpDir, nestedPath))
	if err != nil {
		t.Fatalf("Failed to read created file: %v", err)
	}
	if string(content) != "test content" {
		t.Errorf("Expected 'test content', got '%s'", string(content))
	}
}

func TestListFiles_Integration(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-files-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create project structure
	if err := os.MkdirAll(filepath.Join(tmpDir, ".agent"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "file1.go"), []byte("package main"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "file2.go"), []byte("package main"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(tmpDir, "src"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "src", "app.go"), []byte("package src"), 0644); err != nil {
		t.Fatal(err)
	}

	// Change to temp dir
	oldWd, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(oldWd)

	files, err := ListFiles("")
	if err != nil {
		t.Fatalf("ListFiles failed: %v", err)
	}

	if len(files) < 3 {
		t.Errorf("Expected at least 3 files, got %d: %v", len(files), files)
	}
}

func TestGenerateFileTree_Integration(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-tree-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create project structure
	if err := os.MkdirAll(filepath.Join(tmpDir, ".agent"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "main.go"), []byte("package main"), 0644); err != nil {
		t.Fatal(err)
	}

	// Change to temp dir
	oldWd, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(oldWd)

	tree, err := GenerateFileTree("")
	if err != nil {
		t.Fatalf("GenerateFileTree failed: %v", err)
	}

	if tree == "" {
		t.Error("Expected non-empty tree output")
	}
}
