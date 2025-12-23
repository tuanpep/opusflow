package ops

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/tuanpep/oplusflow/internal/manager"
)

// VerificationResult represents the result of a verification check
type VerificationResult struct {
	PlanRef      string          `json:"plan_ref"`
	SpecRef      string          `json:"spec_ref,omitempty"`
	VerifiedAt   time.Time       `json:"verified_at"`
	Status       string          `json:"status"` // passed, failed, partial
	TotalChecks  int             `json:"total_checks"`
	PassedChecks int             `json:"passed_checks"`
	Comments     []VerifyComment `json:"comments,omitempty"`
	DiffSummary  string          `json:"diff_summary,omitempty"`
	BuildStatus  string          `json:"build_status,omitempty"`
	TestStatus   string          `json:"test_status,omitempty"`
}

// VerifyComment represents a single verification comment
type VerifyComment struct {
	Number      int      `json:"number"`
	Severity    string   `json:"severity"` // critical, major, minor, outdated
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Files       []string `json:"files,omitempty"`
}

// VerifySeverity constants
const (
	SeverityCritical = "critical"
	SeverityMajor    = "major"
	SeverityMinor    = "minor"
	SeverityOutdated = "outdated"
)

// AutoVerifyPlan performs automated verification against a plan
func AutoVerifyPlan(planPath string) (*VerificationResult, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	result := &VerificationResult{
		PlanRef:    filepath.Base(planPath),
		VerifiedAt: time.Now(),
		Comments:   []VerifyComment{},
	}

	// 1. Capture git diff
	diffOutput, err := captureFullGitDiff(root)
	if err == nil && diffOutput != "" {
		result.DiffSummary = summarizeDiff(diffOutput)
	}

	// 2. Run build verification
	buildOutput, buildErr := runBuildCheck(root)
	if buildErr != nil {
		result.BuildStatus = "❌ Failed"
		result.Comments = append(result.Comments, VerifyComment{
			Number:      len(result.Comments) + 1,
			Severity:    SeverityCritical,
			Title:       "Build Failed",
			Description: fmt.Sprintf("Build verification failed:\n%s", buildOutput),
		})
	} else {
		result.BuildStatus = "✅ Passed"
		result.PassedChecks++
	}
	result.TotalChecks++

	// 3. Run test verification
	testOutput, testErr := runTestCheck(root)
	if testErr != nil {
		result.TestStatus = "❌ Failed"
		result.Comments = append(result.Comments, VerifyComment{
			Number:      len(result.Comments) + 1,
			Severity:    SeverityMajor,
			Title:       "Tests Failed",
			Description: fmt.Sprintf("Test verification failed:\n%s", testOutput),
		})
	} else {
		result.TestStatus = "✅ Passed"
		result.PassedChecks++
	}
	result.TotalChecks++

	// 4. Check if plan files were created/modified
	planContent, err := ReadFile(planPath)
	if err == nil {
		filesFromPlan := extractFilesFromPlan(planContent)
		for _, f := range filesFromPlan {
			exists, _ := fileExists(filepath.Join(root, f))
			if !exists {
				result.Comments = append(result.Comments, VerifyComment{
					Number:      len(result.Comments) + 1,
					Severity:    SeverityMajor,
					Title:       fmt.Sprintf("Missing file: %s", f),
					Description: "A file specified in the plan was not created.",
					Files:       []string{f},
				})
			} else {
				result.PassedChecks++
			}
			result.TotalChecks++
		}
	}

	// Determine overall status
	if len(result.Comments) == 0 {
		result.Status = "passed"
	} else {
		hasCritical := false
		for _, c := range result.Comments {
			if c.Severity == SeverityCritical {
				hasCritical = true
				break
			}
		}
		if hasCritical {
			result.Status = "failed"
		} else {
			result.Status = "partial"
		}
	}

	return result, nil
}

// captureFullGitDiff captures the detailed git diff
func captureFullGitDiff(root string) (string, error) {
	cmd := exec.Command("git", "diff", "HEAD")
	cmd.Dir = root

	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	return string(output), nil
}

// summarizeDiff creates a summary of the diff
func summarizeDiff(diff string) string {
	lines := strings.Split(diff, "\n")

	additions := 0
	deletions := 0
	files := make(map[string]bool)

	for _, line := range lines {
		if strings.HasPrefix(line, "+++ b/") {
			files[strings.TrimPrefix(line, "+++ b/")] = true
		} else if strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "+++") {
			additions++
		} else if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "---") {
			deletions++
		}
	}

	fileList := make([]string, 0, len(files))
	for f := range files {
		fileList = append(fileList, f)
	}

	return fmt.Sprintf("%d files changed, +%d -%d\nFiles: %s",
		len(files), additions, deletions, strings.Join(fileList, ", "))
}

// runBuildCheck attempts to build the project
func runBuildCheck(root string) (string, error) {
	// Try common build commands
	buildCommands := []struct {
		Cmd  string
		Args []string
	}{
		{"go", []string{"build", "./..."}},
		{"npm", []string{"run", "build"}},
		{"make", []string{"build"}},
	}

	for _, bc := range buildCommands {
		if _, err := exec.LookPath(bc.Cmd); err == nil {
			cmd := exec.Command(bc.Cmd, bc.Args...)
			cmd.Dir = root

			output, err := cmd.CombinedOutput()
			if err == nil {
				return string(output), nil
			}
			// If command exists but fails, report that
			return string(output), err
		}
	}

	return "No build system detected", nil
}

// runTestCheck attempts to run tests
func runTestCheck(root string) (string, error) {
	testCommands := []struct {
		Cmd  string
		Args []string
	}{
		{"go", []string{"test", "./...", "-short"}},
		{"npm", []string{"test"}},
		{"make", []string{"test"}},
	}

	for _, tc := range testCommands {
		if _, err := exec.LookPath(tc.Cmd); err == nil {
			cmd := exec.Command(tc.Cmd, tc.Args...)
			cmd.Dir = root

			output, err := cmd.CombinedOutput()
			// Even if tests fail, we have output
			return string(output), err
		}
	}

	return "No test system detected", nil
}

// extractFilesFromPlan extracts file paths mentioned in a plan
func extractFilesFromPlan(content string) []string {
	var files []string
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		// Look for **File**: patterns
		if strings.Contains(line, "**File**:") || strings.Contains(line, "**File:**") {
			// Extract path between backticks
			start := strings.Index(line, "`")
			end := strings.LastIndex(line, "`")
			if start != -1 && end > start {
				path := line[start+1 : end]
				if path != "" && !slices.Contains(files, path) {
					files = append(files, path)
				}
			}
		}
	}

	return files
}

// fileExists checks if a file exists
func fileExists(path string) (bool, error) {
	_, err := exec.Command("test", "-f", path).Output()
	return err == nil, nil
}

// FormatVerificationResult formats the result as markdown
func (vr *VerificationResult) FormatMarkdown() string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# Verification Report: %s\n\n", vr.PlanRef))
	sb.WriteString(fmt.Sprintf("**Verified At**: %s\n", vr.VerifiedAt.Format("2006-01-02 15:04")))

	statusEmoji := "⚠️"
	switch vr.Status {
	case "passed":
		statusEmoji = "✅"
	case "failed":
		statusEmoji = "❌"
	}
	sb.WriteString(fmt.Sprintf("**Status**: %s %s\n\n", statusEmoji, strings.Title(vr.Status)))

	sb.WriteString(fmt.Sprintf("**Checks**: %d/%d passed\n", vr.PassedChecks, vr.TotalChecks))
	sb.WriteString(fmt.Sprintf("**Build**: %s\n", vr.BuildStatus))
	sb.WriteString(fmt.Sprintf("**Tests**: %s\n\n", vr.TestStatus))

	if vr.DiffSummary != "" {
		sb.WriteString("## Changes Summary\n\n")
		sb.WriteString("```\n")
		sb.WriteString(vr.DiffSummary)
		sb.WriteString("\n```\n\n")
	}

	if len(vr.Comments) > 0 {
		sb.WriteString("## Issues Found\n\n")
		for _, c := range vr.Comments {
			emoji := "🔴"
			switch c.Severity {
			case SeverityMajor:
				emoji = "🟠"
			case SeverityMinor:
				emoji = "🟡"
			case SeverityOutdated:
				emoji = "⚪"
			}

			sb.WriteString(fmt.Sprintf("### %s Comment %d: %s\n\n", emoji, c.Number, c.Title))
			sb.WriteString(c.Description)
			sb.WriteString("\n\n")

			if len(c.Files) > 0 {
				sb.WriteString("**Referred Files:**\n")
				for _, f := range c.Files {
					sb.WriteString(fmt.Sprintf("- `%s`\n", f))
				}
				sb.WriteString("\n")
			}

			sb.WriteString("---\n\n")
		}
	} else {
		sb.WriteString("## Result\n\n")
		sb.WriteString("All checks passed. Implementation matches the plan. ✅\n")
	}

	return sb.String()
}

// GenerateVerificationPrompt generates a prompt for LLM-based verification
func GenerateVerificationPrompt(planPath, specPath, diffContent string) (string, error) {
	planContent, err := ReadFile(planPath)
	if err != nil {
		return "", fmt.Errorf("failed to read plan: %w", err)
	}

	var specContent string
	if specPath != "" {
		specContent, _ = ReadFile(specPath)
	}

	var sb strings.Builder

	sb.WriteString("# Verification Request\n\n")
	sb.WriteString("You are The Critic - a code reviewer. Compare the implementation against the plan.\n\n")

	sb.WriteString("## Original Plan\n\n")
	sb.WriteString("```markdown\n")
	sb.WriteString(planContent)
	sb.WriteString("\n```\n\n")

	if specContent != "" {
		sb.WriteString("## Original Specification\n\n")
		sb.WriteString("```markdown\n")
		// Truncate if too long
		if len(specContent) > 5000 {
			specContent = specContent[:5000] + "\n... (truncated)"
		}
		sb.WriteString(specContent)
		sb.WriteString("\n```\n\n")
	}

	if diffContent != "" {
		sb.WriteString("## Implementation Changes (Git Diff)\n\n")
		sb.WriteString("```diff\n")
		// Truncate if too long
		if len(diffContent) > 10000 {
			diffContent = diffContent[:10000] + "\n... (truncated)"
		}
		sb.WriteString(diffContent)
		sb.WriteString("\n```\n\n")
	}

	sb.WriteString(`## Your Task

You are The Critic. specific job is to catch bugs, omissions, and hallucinations.

CHECKLIST:
1.  **Plan Alignment**: Does the implementation match all steps in the plan?
2.  **Spec Alignment**: Does it meet all requirements in the spec (if provided)?
3.  **Scope**: Are there any unexpected or unrelated changes? (Safety check)
4.  **Quality**: Are there any obvious bugs or security issues?

Format your response as:

## Verification Status: [PASS/FAIL/PARTIAL]

### Comment 1: [Issue title]
**Severity**: [critical/major/minor]
[Description of the issue and how to fix it]

### Comment 2: ...
(continue for each issue)

If everything is correct, strictly output:
## Verification Status: PASS
All implementation steps verified successfully.
`)

	return sb.String(), nil
}

// SaveVerificationReport saves the verification report to file
func (vr *VerificationResult) Save() (string, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return "", fmt.Errorf("failed to find project root: %w", err)
	}

	planDir, _, err := manager.GetPlanningDirs(root)
	if err != nil {
		return "", err
	}

	verifyDir := filepath.Join(filepath.Dir(planDir), "verifications")

	timestamp := time.Now().Format("2006-01-02")
	filename := fmt.Sprintf("verify-%s-%s.md",
		strings.TrimSuffix(vr.PlanRef, filepath.Ext(vr.PlanRef)),
		timestamp)
	filePath := filepath.Join(verifyDir, filename)

	content := vr.FormatMarkdown()
	if err := WriteFile(filePath, content); err != nil {
		return "", fmt.Errorf("failed to write report: %w", err)
	}

	return filePath, nil
}
