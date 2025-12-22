package ops

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"text/template"

	"github.com/ergonml/opusflow/internal/manager"
	"github.com/ergonml/opusflow/internal/templates"
)

type CreatePlanResult struct {
	Filename string
	FullPath string
}

func CreatePlan(rawTitle string) (*CreatePlanResult, error) {
	title := strings.Join(strings.Fields(rawTitle), "-")
	// Sanitize title
	reg, _ := regexp.Compile("[^a-zA-Z0-9-]+")
	title = reg.ReplaceAllString(title, "")
	title = strings.ToLower(title)

	rootDir, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	plansDir, _, err := manager.GetPlanningDirs(rootDir)
	if err != nil {
		return nil, fmt.Errorf("failed to get planning directories: %w", err)
	}

	// Calculate index
	idx := getNextPlanIndex(plansDir)
	filename := fmt.Sprintf("plan-%02d-%s.md", idx, title)
	fullPath := filepath.Join(plansDir, filename)

	// Create file
	f, err := os.Create(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer f.Close()

	// Template data
	data := struct {
		Dependencies string
		Context      string
		Environment  string
		Strategy     string
	}{
		Dependencies: "TBD",
		Context:      "TBD",
		Environment:  "TBD",
		Strategy:     "TBD",
	}

	tmpl, err := template.New("plan").Parse(templates.PlanTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to parse template: %w", err)
	}

	err = tmpl.Execute(f, data)
	if err != nil {
		return nil, fmt.Errorf("failed to execute template: %w", err)
	}

	return &CreatePlanResult{
		Filename: filename,
		FullPath: fullPath,
	}, nil
}

func getNextPlanIndex(dir string) int {
	files, err := os.ReadDir(dir)
	if err != nil {
		return 1
	}

	maxIdx := 0
	re := regexp.MustCompile(`plan-(\d+)-`)

	for _, f := range files {
		if f.IsDir() {
			continue
		}
		matches := re.FindStringSubmatch(f.Name())
		if len(matches) > 1 {
			idx, _ := strconv.Atoi(matches[1])
			if idx > maxIdx {
				maxIdx = idx
			}
		}
	}
	return maxIdx + 1
}
