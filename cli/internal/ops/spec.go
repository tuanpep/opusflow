package ops

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/tuanpep/oplusflow/internal/manager"
)

// SpecResult contains the result of creating a spec
type SpecResult struct {
	Title    string
	Filename string
	FullPath string
	Query    string
}

// CreateSpec creates a new feature specification from a user query
func CreateSpec(title, query string, contextFiles []string) (*SpecResult, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	planDir, _, err := manager.GetPlanningDirs(root)
	if err != nil {
		return nil, fmt.Errorf("failed to get planning dirs: %w", err)
	}

	// Create specs directory if it doesn't exist
	specsDir := filepath.Join(filepath.Dir(planDir), "specs")
	if err := os.MkdirAll(specsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create specs directory: %w", err)
	}

	// Generate filename
	timestamp := time.Now().Format("2006-01-02")
	slug := slugify(title)
	filename := fmt.Sprintf("spec-%s-%s.md", timestamp, slug)
	fullPath := filepath.Join(specsDir, filename)

	// Generate codebase map for context
	codebaseMap, _ := GenerateCodebaseMap("", nil, nil)
	var codebaseSummary string
	if codebaseMap != nil {
		codebaseSummary = codebaseMap.FormatSummary()
	}

	// Read context files
	var contextContent strings.Builder
	for _, cf := range contextFiles {
		content, err := ReadFile(cf)
		if err == nil {
			contextContent.WriteString(fmt.Sprintf("\n### %s\n```\n%s\n```\n", cf, truncateContent(content, 500)))
		}
	}

	// Generate spec content
	content := generateSpecContent(title, query, codebaseSummary, contextContent.String())

	// Write spec file
	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return nil, fmt.Errorf("failed to write spec: %w", err)
	}

	return &SpecResult{
		Title:    title,
		Filename: filename,
		FullPath: fullPath,
		Query:    query,
	}, nil
}

// generateSpecContent generates the SPEC.md content
func generateSpecContent(title, query, codebaseSummary, contextContent string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# Feature Specification: %s\n\n", title))
	sb.WriteString(fmt.Sprintf("**Created**: %s\n", time.Now().Format("2006-01-02 15:04")))
	sb.WriteString("**Status**: 📝 Draft\n\n")

	sb.WriteString("---\n\n")

	// Goal section
	sb.WriteString("## Goal\n\n")
	sb.WriteString(fmt.Sprintf("> %s\n\n", query))
	sb.WriteString("<!-- Describe the high-level objective. What are we building and why? -->\n\n")
	sb.WriteString("[TODO: Expand the goal description here]\n\n")

	// User Stories
	sb.WriteString("## User Stories\n\n")
	sb.WriteString("<!-- Define user stories in the format: As a [role], I want [feature] so that [benefit] -->\n\n")
	sb.WriteString("- [ ] As a **[role]**, I want **[feature]** so that **[benefit]**\n")
	sb.WriteString("- [ ] As a **[role]**, I want **[feature]** so that **[benefit]**\n\n")

	// Requirements
	sb.WriteString("## Requirements\n\n")
	sb.WriteString("### Functional Requirements\n\n")
	sb.WriteString("<!-- What must the system do? -->\n\n")
	sb.WriteString("- [ ] **FR1**: [Requirement description]\n")
	sb.WriteString("- [ ] **FR2**: [Requirement description]\n")
	sb.WriteString("- [ ] **FR3**: [Requirement description]\n\n")

	sb.WriteString("### Non-Functional Requirements\n\n")
	sb.WriteString("<!-- Performance, security, scalability constraints -->\n\n")
	sb.WriteString("| Category | Requirement |\n")
	sb.WriteString("|----------|-------------|\n")
	sb.WriteString("| **Performance** | [e.g., Response time < 200ms] |\n")
	sb.WriteString("| **Security** | [e.g., Input validation required] |\n")
	sb.WriteString("| **Scalability** | [e.g., Support 1000 concurrent users] |\n\n")

	// Architecture Constraints
	sb.WriteString("## Architecture Constraints\n\n")
	sb.WriteString("<!-- What existing patterns, services, or constraints must be followed? -->\n\n")
	sb.WriteString("- Must integrate with: [existing service/component]\n")
	sb.WriteString("- Must follow pattern: [e.g., repository pattern, DI]\n")
	sb.WriteString("- Must use: [specific technology/library]\n\n")

	// Codebase Context
	if codebaseSummary != "" {
		sb.WriteString("## Codebase Context\n\n")
		sb.WriteString("```\n")
		sb.WriteString(codebaseSummary)
		sb.WriteString("```\n\n")
	}

	// Additional Context
	if contextContent != "" {
		sb.WriteString("## Additional Context\n\n")
		sb.WriteString(contextContent)
		sb.WriteString("\n")
	}

	// Edge Cases
	sb.WriteString("## Edge Cases\n\n")
	sb.WriteString("<!-- Document edge cases and expected behavior -->\n\n")
	sb.WriteString("| Edge Case | Expected Behavior |\n")
	sb.WriteString("|-----------|-------------------|\n")
	sb.WriteString("| [Empty input] | [Return validation error] |\n")
	sb.WriteString("| [Duplicate entry] | [Return 409 conflict] |\n")
	sb.WriteString("| [Unauthorized access] | [Return 401/403] |\n\n")

	// Out of Scope
	sb.WriteString("## Out of Scope\n\n")
	sb.WriteString("<!-- Explicitly list what is NOT included in this feature -->\n\n")
	sb.WriteString("- ❌ [Feature/capability not included]\n")
	sb.WriteString("- ❌ [Another exclusion]\n\n")

	// Success Criteria
	sb.WriteString("## Success Criteria\n\n")
	sb.WriteString("<!-- Measurable criteria to verify the feature is complete -->\n\n")
	sb.WriteString("- [ ] **SC1**: [e.g., All unit tests pass]\n")
	sb.WriteString("- [ ] **SC2**: [e.g., API returns expected response for happy path]\n")
	sb.WriteString("- [ ] **SC3**: [e.g., Error cases return appropriate status codes]\n")
	sb.WriteString("- [ ] **SC4**: [e.g., Documentation is updated]\n\n")

	// Open Questions
	sb.WriteString("## Open Questions\n\n")
	sb.WriteString("<!-- Questions that need answers before implementation -->\n\n")
	sb.WriteString("1. [Question about requirement/design]\n")
	sb.WriteString("2. [Question about integration]\n\n")

	sb.WriteString("---\n\n")
	sb.WriteString("> ⚠️ **Note**: This spec must be reviewed and approved before generating a PLAN.md\n")

	return sb.String()
}

// slugify converts a title to a URL-friendly slug
func slugify(title string) string {
	title = strings.ToLower(title)
	title = strings.ReplaceAll(title, " ", "-")
	// Remove special characters
	var result strings.Builder
	for _, r := range title {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	slug := result.String()
	// Limit length
	if len(slug) > 40 {
		slug = slug[:40]
	}
	return slug
}

// truncateContent truncates content to a maximum length
func truncateContent(content string, maxLen int) string {
	if len(content) <= maxLen {
		return content
	}
	return content[:maxLen] + "\n... (truncated)"
}

// GenerateSpecPrompt generates a prompt for an AI to fill in the spec
func GenerateSpecPrompt(specFile string) (string, error) {
	content, err := ReadFile(specFile)
	if err != nil {
		return "", fmt.Errorf("failed to read spec file: %w", err)
	}

	prompt := `You are The Architect - a system design expert. Your job is to complete the feature specification below.

CRITICAL RULES:
1. DO NOT write any code
2. DO NOT suggest implementation details
3. ONLY define WHAT should be built, not HOW
4. Be thorough with edge cases and requirements
5. All requirements must be testable/verifiable

Review and complete the following specification. Fill in all [TODO] sections and expand the placeholder content with specific, actionable requirements.

---
` + content + `
---

Complete this specification by:
1. Expanding the Goal with clear business context
2. Writing specific User Stories
3. Defining measurable Functional Requirements
4. Identifying realistic Non-Functional Requirements
5. Documenting Architecture Constraints based on the codebase
6. Listing comprehensive Edge Cases
7. Defining clear Success Criteria

Output the completed SPEC.md content.`

	return prompt, nil
}
