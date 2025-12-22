package ops

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/tuanpep/oplusflow/internal/manager"
	ignore "github.com/sabhiram/go-gitignore"
)

func ListFiles(dir string) ([]string, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	// Load .gitignore
	ignorer, _ := ignore.CompileIgnoreFile(filepath.Join(root, ".gitignore"))

	targetDir := root
	if dir != "" {
		targetDir = filepath.Join(root, dir)
	}

	var files []string
	err = filepath.WalkDir(targetDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		relPath, _ := filepath.Rel(root, path)

		// Check gitignore
		if ignorer != nil && ignorer.MatchesPath(relPath) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Skip hidden directories (if not handled by gitignore)
		if d.IsDir() && strings.HasPrefix(d.Name(), ".") && d.Name() != "." {
			return filepath.SkipDir
		}

		if !d.IsDir() {
			files = append(files, relPath)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}

// GenerateTree returns a tree-like string representation of the file structure
// This is much more token-efficient than a flat list for deep hierarchies
func GenerateFileTree(dir string) (string, error) {
	files, err := ListFiles(dir)
	if err != nil {
		return "", err
	}

	// Limit total files to avoid explosion
	if len(files) > 2000 {
		return fmt.Sprintf("Too many files (%d). Please specify a subdirectory.", len(files)), nil
	}

	sort.Strings(files)

	return strings.Join(files, "\n"), nil
}

func ReadFile(path string) (string, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return "", fmt.Errorf("failed to find project root: %w", err)
	}

	// Ensure path is relative to root if it's not absolute, or handle absolute paths carefully
	// Ideally we want to support both, but safely within root.
	// For simplicity, let's assume input could be relative or absolute.

	targetPath := path
	if !filepath.IsAbs(path) {
		targetPath = filepath.Join(root, path)
	}

	// Basic safety check: ensure strictly within root?
	// Developer tool: relax strict confinement for now, but good practice.

	content, err := os.ReadFile(targetPath)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

func WriteFile(path string, content string) error {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return fmt.Errorf("failed to find project root: %w", err)
	}

	targetPath := path
	if !filepath.IsAbs(path) {
		targetPath = filepath.Join(root, path)
	}

	// Ensure directory exists
	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	return os.WriteFile(targetPath, []byte(content), 0644)
}
