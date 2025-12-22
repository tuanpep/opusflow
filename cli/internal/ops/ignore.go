package ops

import (
	"os"
	"path/filepath"
	"strings"
	"sync"

	ignore "github.com/sabhiram/go-gitignore"
)

// Default directories to always skip
var defaultSkipDirs = map[string]bool{
	"node_modules": true,
	"vendor":       true,
	".git":         true,
	"dist":         true,
	"build":        true,
	".next":        true,
	"__pycache__":  true,
	".venv":        true,
	"venv":         true,
	".tox":         true,
	".cache":       true,
	".idea":        true,
	".vscode":      true,
	"coverage":     true,
	".nyc_output":  true,
	"target":       true, // Rust/Java
	"bin":          true,
	"obj":          true, // C#
}

// IgnoreHandler handles file ignoring logic including default ignores and .gitignore
type IgnoreHandler struct {
	root        string
	rootIgnorer *ignore.GitIgnore
	subIgnorers map[string]*ignore.GitIgnore
	mu          sync.RWMutex
}

// NewIgnoreHandler creates a new handler for the given project root
func NewIgnoreHandler(root string) *IgnoreHandler {
	handler := &IgnoreHandler{
		root:        root,
		subIgnorers: make(map[string]*ignore.GitIgnore),
	}

	// Load root .gitignore
	gitignorePath := filepath.Join(root, ".gitignore")
	if _, err := os.Stat(gitignorePath); err == nil {
		if ignorer, err := ignore.CompileIgnoreFile(gitignorePath); err == nil {
			handler.rootIgnorer = ignorer
		}
	}

	return handler
}

// ShouldIgnore checks if a path should be ignored
// path can be absolute or relative to project root
func (h *IgnoreHandler) ShouldIgnore(path string, isDir bool) bool {
	// Normalize path to be relative to root
	relPath := path
	if filepath.IsAbs(path) {
		var err error
		relPath, err = filepath.Rel(h.root, path)
		if err != nil {
			// If we can't make it relative, assume it's outside project and ignore?
			// Or just process it blindly. Let's process safely.
			return false
		}
	}

	// 1. Check default directory ignores
	baseName := filepath.Base(path)
	if isDir {
		if defaultSkipDirs[baseName] {
			return true
		}
		// Skip hidden directories (except .agent, .github, etc.)
		if strings.HasPrefix(baseName, ".") && baseName != "." && baseName != ".agent" && baseName != ".github" && baseName != ".opusflow" {
			return true
		}
	} else {
		// Example: ignore .DS_Store
		if baseName == ".DS_Store" || baseName == "Thumbs.db" {
			return true
		}
	}

	// 2. Check root .gitignore
	if h.rootIgnorer != nil {
		if h.rootIgnorer.MatchesPath(relPath) {
			return true
		}
		if isDir && h.rootIgnorer.MatchesPath(relPath+string(os.PathSeparator)) {
			return true
		}
	}

	// 3. Find applicable nested .gitignore files
	// We need to check all parent directories of relPath for .gitignore files
	// This is slightly expensive, so we might want to optimize traverse order or caching
	// For now, simpler approach: as we walk, we usually load.
	// But `ShouldIgnore` is stateless regarding traversal order.

	// Check against loaded sub-ignorers
	h.mu.RLock()
	defer h.mu.RUnlock()
	for subRoot, ignorer := range h.subIgnorers {
		if strings.HasPrefix(path, subRoot) {
			subRelPath, _ := filepath.Rel(subRoot, path)
			if ignorer.MatchesPath(subRelPath) {
				return true
			}
			if isDir && ignorer.MatchesPath(subRelPath+string(os.PathSeparator)) {
				return true
			}
		}
	}

	return false
}

// TrackDirectory is called when entering a directory to potentially load its .gitignore
// This makes the handler stateful but efficient during walk
func (h *IgnoreHandler) TrackDirectory(path string) {
	gitignorePath := filepath.Join(path, ".gitignore")
	if _, err := os.Stat(gitignorePath); err == nil {
		if ignorer, err := ignore.CompileIgnoreFile(gitignorePath); err == nil {
			h.mu.Lock()
			// Use absolute path as key for simpler matching
			// or make sure 'path' passed here is consistent with 'path' passed to ShouldIgnore
			h.subIgnorers[path] = ignorer
			h.mu.Unlock()
		}
	}
}
