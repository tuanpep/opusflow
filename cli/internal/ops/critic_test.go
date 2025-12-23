package ops

import (
	"strings"
	"testing"
)

func TestExtractFilesFromPlan(t *testing.T) {
	planContent := `# Plan

## Steps

### Step 1
**File**: ` + "`src/main.go`" + `

### Step 2
**File:** ` + "`config/config.yaml`" + `

### Step 3
No file here.

### Step 4
**File**: ` + "`src/utils.go`" + `
`

	files := extractFilesFromPlan(planContent)

	if len(files) != 3 {
		t.Errorf("Expected 3 files, got %d: %v", len(files), files)
	}

	expected := map[string]bool{
		"src/main.go":        true,
		"config/config.yaml": true,
		"src/utils.go":       true,
	}

	for _, f := range files {
		if !expected[f] {
			t.Errorf("Unexpected file: %s", f)
		}
	}
}

func TestExtractFilesFromPlan_NoDuplicates(t *testing.T) {
	planContent := `
**File**: ` + "`same.go`" + `
**File**: ` + "`same.go`" + `
**File**: ` + "`different.go`" + `
`

	files := extractFilesFromPlan(planContent)

	if len(files) != 2 {
		t.Errorf("Expected 2 unique files, got %d: %v", len(files), files)
	}
}

func TestSummarizeDiff(t *testing.T) {
	diff := `diff --git a/file1.go b/file1.go
index abc123..def456 100644
--- a/file1.go
+++ b/file1.go
@@ -1,3 +1,5 @@
 unchanged
+added line 1
+added line 2
-removed line
 more unchanged
`

	summary := summarizeDiff(diff)

	if !strings.Contains(summary, "file1.go") {
		t.Error("Expected file name in summary")
	}
	if !strings.Contains(summary, "+2") {
		t.Error("Expected addition count in summary")
	}
	if !strings.Contains(summary, "-1") {
		t.Error("Expected deletion count in summary")
	}
}

func TestVerificationResult_FormatMarkdown(t *testing.T) {
	result := &VerificationResult{
		PlanRef:      "plan-01-test.md",
		Status:       "passed",
		TotalChecks:  3,
		PassedChecks: 3,
		BuildStatus:  "✅ Passed",
		TestStatus:   "✅ Passed",
		DiffSummary:  "2 files changed",
		Comments:     []VerifyComment{},
	}

	md := result.FormatMarkdown()

	if !strings.Contains(md, "plan-01-test.md") {
		t.Error("Expected plan reference in output")
	}
	if !strings.Contains(md, "✅") {
		t.Error("Expected success emoji in output")
	}
	if !strings.Contains(md, "3/3 passed") {
		t.Error("Expected check count in output")
	}
}

func TestVerificationResult_FormatMarkdown_WithComments(t *testing.T) {
	result := &VerificationResult{
		PlanRef:      "plan-01-test.md",
		Status:       "failed",
		TotalChecks:  3,
		PassedChecks: 1,
		BuildStatus:  "❌ Failed",
		TestStatus:   "✅ Passed",
		Comments: []VerifyComment{
			{
				Number:      1,
				Severity:    SeverityCritical,
				Title:       "Build Error",
				Description: "Compilation failed",
				Files:       []string{"main.go"},
			},
		},
	}

	md := result.FormatMarkdown()

	if !strings.Contains(md, "Issues Found") {
		t.Error("Expected 'Issues Found' section")
	}
	if !strings.Contains(md, "Build Error") {
		t.Error("Expected issue title")
	}
	if !strings.Contains(md, "main.go") {
		t.Error("Expected file reference")
	}
}

func TestGenerateVerificationPrompt(t *testing.T) {
	// This test requires a file system setup, so we test error cases
	_, err := GenerateVerificationPrompt("nonexistent.md", "", "")
	if err == nil {
		t.Error("Expected error for non-existent plan file")
	}
}

func TestVerifySeverityConstants(t *testing.T) {
	// Ensure constants have expected values
	if SeverityCritical != "critical" {
		t.Errorf("Expected 'critical', got '%s'", SeverityCritical)
	}
	if SeverityMajor != "major" {
		t.Errorf("Expected 'major', got '%s'", SeverityMajor)
	}
	if SeverityMinor != "minor" {
		t.Errorf("Expected 'minor', got '%s'", SeverityMinor)
	}
	if SeverityOutdated != "outdated" {
		t.Errorf("Expected 'outdated', got '%s'", SeverityOutdated)
	}
}
