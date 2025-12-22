package manager

import (
	"fmt"
	"os"
	"path/filepath"
)

// FindProjectRoot looks for opusflow-planning directory or .git directory to denote root
func FindProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	startDir := dir
	// First pass: look for check for opusflow-planning
	for {
		if _, err := os.Stat(filepath.Join(dir, "opusflow-planning")); err == nil {
			return dir, nil
		} else if _, err := os.Stat(filepath.Join(dir, ".agent")); err == nil {
			// Also check for .agent which is standard
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	// Reset and check for .git
	dir = startDir
	for {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("project root not found (no opusflow-planning, .agent, or .git directory)")
		}
		dir = parent
	}
}

// GetPlanningDirs returns paths to plans and verifications dirs, creating them if needed
func GetPlanningDirs(rootDir string) (string, string, error) {
	plansDir := filepath.Join(rootDir, "opusflow-planning", "plans")
	verifyDir := filepath.Join(rootDir, "opusflow-planning", "verifications")

	if err := os.MkdirAll(plansDir, 0755); err != nil {
		return "", "", err
	}
	if err := os.MkdirAll(verifyDir, 0755); err != nil {
		return "", "", err
	}

	return plansDir, verifyDir, nil
}
