package manager

import (
	"fmt"
	"os"
	"path/filepath"
)

// FindProjectRoot looks for opusflow-planning directory or .git directory to denote root.
// If no markers are found, it falls back to the current working directory and auto-initializes.
func FindProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	startDir := dir
	// First pass: look for opusflow-planning or .agent
	for {
		if _, err := os.Stat(filepath.Join(dir, "opusflow-planning")); err == nil {
			return dir, nil
		} else if _, err := os.Stat(filepath.Join(dir, ".agent")); err == nil {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	// Second pass: check for .git
	dir = startDir
	for {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break // No .git found, proceed to auto-init
		}
		dir = parent
	}

	// No markers found - auto-initialize at the starting directory
	return initProjectRoot(startDir)
}

// initProjectRoot creates the necessary marker directories at the given root.
// This enables OpusFlow to work in fresh projects without manual setup.
func initProjectRoot(rootDir string) (string, error) {
	// Create .agent/workflows for workflow definitions
	agentDir := filepath.Join(rootDir, ".agent", "workflows")
	if err := os.MkdirAll(agentDir, 0755); err != nil {
		return "", fmt.Errorf("failed to initialize .agent directory: %w", err)
	}

	// Create opusflow-planning directories
	planningDirs := []string{
		filepath.Join(rootDir, "opusflow-planning", "plans"),
		filepath.Join(rootDir, "opusflow-planning", "phases"),
		filepath.Join(rootDir, "opusflow-planning", "verifications"),
	}

	for _, dir := range planningDirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return "", fmt.Errorf("failed to initialize opusflow-planning: %w", err)
		}
	}

	// Log to stderr so it doesn't break JSON-RPC on stdout
	fmt.Fprintf(os.Stderr, "OpusFlow: Auto-initialized project at %s\n", rootDir)
	fmt.Fprintf(os.Stderr, "  Created: .agent/workflows/\n")
	fmt.Fprintf(os.Stderr, "  Created: opusflow-planning/{plans,phases,verifications}/\n")

	return rootDir, nil
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
