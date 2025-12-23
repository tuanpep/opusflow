package ops

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetNextPlanIndex_Empty(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-plan-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	idx := getNextPlanIndex(tmpDir)
	if idx != 1 {
		t.Errorf("Expected index 1 for empty dir, got %d", idx)
	}
}

func TestGetNextPlanIndex_WithExisting(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-plan-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create some plan files
	files := []string{
		"plan-01-auth.md",
		"plan-02-feature.md",
		"plan-03-bugfix.md",
	}
	for _, f := range files {
		if err := os.WriteFile(filepath.Join(tmpDir, f), []byte("# Plan"), 0644); err != nil {
			t.Fatal(err)
		}
	}

	idx := getNextPlanIndex(tmpDir)
	if idx != 4 {
		t.Errorf("Expected index 4, got %d", idx)
	}
}

func TestGetNextPlanIndex_NonSequential(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-plan-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create non-sequential plan files
	files := []string{
		"plan-01-first.md",
		"plan-05-fifth.md",
		"plan-10-tenth.md",
	}
	for _, f := range files {
		if err := os.WriteFile(filepath.Join(tmpDir, f), []byte("# Plan"), 0644); err != nil {
			t.Fatal(err)
		}
	}

	idx := getNextPlanIndex(tmpDir)
	if idx != 11 {
		t.Errorf("Expected index 11 (max+1), got %d", idx)
	}
}

func TestGetNextPlanIndex_InvalidDir(t *testing.T) {
	idx := getNextPlanIndex("/nonexistent/dir/12345")
	if idx != 1 {
		t.Errorf("Expected index 1 for invalid dir, got %d", idx)
	}
}

func TestCreatePlan_Integration(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "opusflow-plan-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// Create project structure
	if err := os.MkdirAll(filepath.Join(tmpDir, ".agent"), 0755); err != nil {
		t.Fatal(err)
	}
	plansDir := filepath.Join(tmpDir, "opusflow-planning", "plans")
	if err := os.MkdirAll(plansDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Change to temp dir
	oldWd, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(oldWd)

	result, err := CreatePlan("Add Authentication", "Implement OAuth2 login")
	if err != nil {
		t.Fatalf("CreatePlan failed: %v", err)
	}

	if result.Filename == "" {
		t.Error("Expected non-empty filename")
	}
	if result.FullPath == "" {
		t.Error("Expected non-empty full path")
	}

	// Verify file exists
	if _, err := os.Stat(result.FullPath); os.IsNotExist(err) {
		t.Error("Plan file was not created")
	}
}
