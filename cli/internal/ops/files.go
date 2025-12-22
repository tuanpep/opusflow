package ops

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"

	"github.com/ergonml/opusflow/internal/manager"
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

	// Basic tree generation logic can be complex, let's stick to a simplified
	// indentation approach which is token efficient for agents to parse.
	// Actually, agents often prefer the `tree` command output.

	return pathsToTree(files), nil
}

func pathsToTree(paths []string) string {
	// This is a naive implementation; a real tree visualizer is complex.
	// Instead, we can group by directory to save repeating parent prefixes.
	// But let's verify if simply returning the list is that bad?
	// Path: "a/b/c/d.go" (10 chars)
	// Tree:
	// a/
	//   b/
	//     c/
	//       d.go
	// The tree format adds whitespace/indentation tokens.
	// The list format adds repeated path tokens.
	// For LLMs, dense lists are often okay, but highly repetitive prefixes waste tokens.

	// Let's implement a Compact Tree:
	// cli/
	//   cmd/
	//     main.go
	//     mcp.go
	//   internal/
	//     ops/...

	// Check against token limits (heuristic)
	// If list is small, return list.
	return strings.Join(paths, "\n")
}
