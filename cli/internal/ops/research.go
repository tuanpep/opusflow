package ops

import (
	"bufio"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	ignore "github.com/sabhiram/go-gitignore"
	"github.com/tuanpep/oplusflow/internal/manager"
)

type SearchResult struct {
	File    string `json:"file"`
	Line    int    `json:"line"`
	Content string `json:"content"`
}

func SearchCodebase(query string) ([]SearchResult, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	// Load root .gitignore if exists
	rootIgnorer, _ := ignore.CompileIgnoreFile(filepath.Join(root, ".gitignore"))

	// Cache for subproject .gitignore files
	subIgnorers := make(map[string]*ignore.GitIgnore)

	var results []SearchResult
	// Limit total files to prevent timeout
	filesSearched := 0
	maxFiles := 5000

	err = filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		relPath, _ := filepath.Rel(root, path)

		// Always skip certain directories
		if d.IsDir() {
			if alwaysSkipDirs[d.Name()] {
				return filepath.SkipDir
			}
			// Skip hidden directories (except .agent, .github, etc.)
			if strings.HasPrefix(d.Name(), ".") && d.Name() != "." && d.Name() != ".agent" && d.Name() != ".github" {
				return filepath.SkipDir
			}
			// Check if this directory has its own .gitignore and cache it
			gitignorePath := filepath.Join(path, ".gitignore")
			if _, statErr := os.Stat(gitignorePath); statErr == nil {
				if ignorer, compileErr := ignore.CompileIgnoreFile(gitignorePath); compileErr == nil {
					subIgnorers[path] = ignorer
				}
			}
		}

		// Check root .gitignore
		if rootIgnorer != nil && rootIgnorer.MatchesPath(relPath) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Check subproject .gitignore files
		for subRoot, ignorer := range subIgnorers {
			if strings.HasPrefix(path, subRoot) {
				subRelPath, _ := filepath.Rel(subRoot, path)
				if ignorer.MatchesPath(subRelPath) {
					if d.IsDir() {
						return filepath.SkipDir
					}
					return nil
				}
			}
		}

		if !d.Type().IsRegular() {
			return nil
		}

		filesSearched++
		if filesSearched > maxFiles {
			return filepath.SkipAll
		}

		// Skip binary files (simple heuristic)
		if isBinary(path) {
			return nil
		}

		// Read file
		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		lineNum := 1
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(strings.ToLower(line), strings.ToLower(query)) {
				trimmedLine := strings.TrimSpace(line)
				if len(trimmedLine) > 500 {
					trimmedLine = trimmedLine[:500] + "..."
				}

				results = append(results, SearchResult{
					File:    relPath,
					Line:    lineNum,
					Content: trimmedLine,
				})
			}
			lineNum++
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return results, nil
}

func isBinary(path string) bool {
	// Check extension
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz", ".exe", ".bin":
		return true
	}

	// Check content (first 512 bytes)
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()

	b := make([]byte, 512)
	n, err := f.Read(b)
	if err != nil {
		return false
	}

	return !utf8.Valid(b[:n])
}
