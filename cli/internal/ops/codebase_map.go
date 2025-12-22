package ops

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/tuanpep/oplusflow/internal/manager"
)

// ProjectMap represents a compressed view of the entire codebase
type ProjectMap struct {
	RootPath   string        `json:"root_path"`
	Languages  []string      `json:"languages"`
	Files      []FileSymbols `json:"files"`
	Statistics ProjectStats  `json:"statistics"`
}

// FileSymbols represents symbols extracted from a single file
type FileSymbols struct {
	Path      string   `json:"path"`
	Language  string   `json:"language"`
	Symbols   []Symbol `json:"symbols"`
	LineCount int      `json:"line_count"`
}

// Symbol represents a code symbol (function, type, class, etc.)
type Symbol struct {
	Name      string   `json:"name"`
	Kind      string   `json:"kind"` // func, type, interface, class, method, const, var
	Signature string   `json:"signature,omitempty"`
	StartLine int      `json:"start_line"`
	EndLine   int      `json:"end_line"`
	Children  []Symbol `json:"children,omitempty"`
}

// ProjectStats contains aggregate statistics
type ProjectStats struct {
	TotalFiles   int            `json:"total_files"`
	TotalLines   int            `json:"total_lines"`
	TotalSymbols int            `json:"total_symbols"`
	ByLanguage   map[string]int `json:"by_language"`
	BySymbolKind map[string]int `json:"by_symbol_kind"`
}

// languageExtensions maps file extensions to language names
var languageExtensions = map[string]string{
	".go":   "go",
	".ts":   "typescript",
	".tsx":  "typescript",
	".js":   "javascript",
	".jsx":  "javascript",
	".py":   "python",
	".rs":   "rust",
	".java": "java",
	".c":    "c",
	".cpp":  "cpp",
	".h":    "c",
	".hpp":  "cpp",
}

// GenerateCodebaseMap generates a compressed map of the codebase
func GenerateCodebaseMap(rootDir string, includePatterns, excludePatterns []string) (*ProjectMap, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	if rootDir == "" {
		rootDir = root
	} else if !filepath.IsAbs(rootDir) {
		rootDir = filepath.Join(root, rootDir)
	}

	pm := &ProjectMap{
		RootPath: rootDir,
		Files:    []FileSymbols{},
		Statistics: ProjectStats{
			ByLanguage:   make(map[string]int),
			BySymbolKind: make(map[string]int),
		},
	}

	languageSet := make(map[string]bool)

	err = filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't access
		}

		// Skip directories
		if info.IsDir() {
			// Skip common ignored directories
			name := info.Name()
			if name == ".git" || name == "node_modules" || name == "vendor" ||
				name == "__pycache__" || name == ".vscode" || name == "dist" ||
				name == "build" || name == ".idea" {
				return filepath.SkipDir
			}
			return nil
		}

		// Check if file matches language extensions
		ext := filepath.Ext(path)
		lang, supported := languageExtensions[ext]
		if !supported {
			return nil
		}

		// Apply include/exclude patterns
		relPath, _ := filepath.Rel(rootDir, path)
		if !matchPatterns(relPath, includePatterns, excludePatterns) {
			return nil
		}

		// Extract symbols from file
		fs, err := extractSymbols(path, lang)
		if err != nil {
			// Log but don't fail on individual file errors
			return nil
		}

		fs.Path = relPath
		pm.Files = append(pm.Files, *fs)
		pm.Statistics.TotalFiles++
		pm.Statistics.TotalLines += fs.LineCount
		pm.Statistics.TotalSymbols += len(fs.Symbols)
		pm.Statistics.ByLanguage[lang]++
		languageSet[lang] = true

		for _, sym := range fs.Symbols {
			pm.Statistics.BySymbolKind[sym.Kind]++
			for _, child := range sym.Children {
				pm.Statistics.BySymbolKind[child.Kind]++
				pm.Statistics.TotalSymbols++
			}
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	// Sort languages
	for lang := range languageSet {
		pm.Languages = append(pm.Languages, lang)
	}
	sort.Strings(pm.Languages)

	return pm, nil
}

// matchPatterns checks if a path matches include/exclude patterns
func matchPatterns(path string, include, exclude []string) bool {
	// If include patterns exist, path must match at least one
	if len(include) > 0 {
		matched := false
		for _, pattern := range include {
			if m, _ := filepath.Match(pattern, path); m {
				matched = true
				break
			}
			// Also check if pattern matches any parent directory
			if strings.Contains(path, pattern) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}

	// Path must not match any exclude pattern
	for _, pattern := range exclude {
		if m, _ := filepath.Match(pattern, path); m {
			return false
		}
		if strings.Contains(path, pattern) {
			return false
		}
	}

	return true
}

// extractSymbols extracts symbols from a file based on language
func extractSymbols(path, lang string) (*FileSymbols, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	lines := strings.Count(string(content), "\n") + 1

	fs := &FileSymbols{
		Path:      path,
		Language:  lang,
		LineCount: lines,
		Symbols:   []Symbol{},
	}

	switch lang {
	case "go":
		fs.Symbols, err = extractGoSymbols(path)
	case "typescript", "javascript":
		fs.Symbols = extractTSSymbols(string(content))
	case "python":
		fs.Symbols = extractPythonSymbols(string(content))
	default:
		// Generic regex-based extraction for other languages
		fs.Symbols = extractGenericSymbols(string(content))
	}

	return fs, err
}

// extractGoSymbols uses go/ast to extract Go symbols
func extractGoSymbols(path string) ([]Symbol, error) {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	var symbols []Symbol

	for _, decl := range node.Decls {
		switch d := decl.(type) {
		case *ast.FuncDecl:
			sym := Symbol{
				Name:      d.Name.Name,
				Kind:      "func",
				StartLine: fset.Position(d.Pos()).Line,
				EndLine:   fset.Position(d.End()).Line,
			}

			// Build signature
			var sig strings.Builder
			sig.WriteString(d.Name.Name)
			sig.WriteString("(")
			if d.Type.Params != nil {
				params := []string{}
				for _, p := range d.Type.Params.List {
					ptype := formatType(p.Type)
					for _, name := range p.Names {
						params = append(params, name.Name+" "+ptype)
					}
					if len(p.Names) == 0 {
						params = append(params, ptype)
					}
				}
				sig.WriteString(strings.Join(params, ", "))
			}
			sig.WriteString(")")

			if d.Type.Results != nil && len(d.Type.Results.List) > 0 {
				results := []string{}
				for _, r := range d.Type.Results.List {
					results = append(results, formatType(r.Type))
				}
				if len(results) == 1 {
					sig.WriteString(" " + results[0])
				} else {
					sig.WriteString(" (" + strings.Join(results, ", ") + ")")
				}
			}
			sym.Signature = sig.String()

			// Check if it's a method (has receiver)
			if d.Recv != nil && len(d.Recv.List) > 0 {
				sym.Kind = "method"
				recvType := formatType(d.Recv.List[0].Type)
				sym.Signature = "(" + recvType + ") " + sym.Signature
			}

			symbols = append(symbols, sym)

		case *ast.GenDecl:
			for _, spec := range d.Specs {
				switch s := spec.(type) {
				case *ast.TypeSpec:
					sym := Symbol{
						Name:      s.Name.Name,
						StartLine: fset.Position(s.Pos()).Line,
						EndLine:   fset.Position(s.End()).Line,
					}

					switch t := s.Type.(type) {
					case *ast.InterfaceType:
						sym.Kind = "interface"
						sym.Signature = "interface " + s.Name.Name
						// Extract interface methods
						if t.Methods != nil {
							for _, m := range t.Methods.List {
								if len(m.Names) > 0 {
									child := Symbol{
										Name:      m.Names[0].Name,
										Kind:      "method",
										StartLine: fset.Position(m.Pos()).Line,
										EndLine:   fset.Position(m.End()).Line,
									}
									sym.Children = append(sym.Children, child)
								}
							}
						}
					case *ast.StructType:
						sym.Kind = "struct"
						sym.Signature = "struct " + s.Name.Name
						// Count fields
						if t.Fields != nil {
							sym.Signature += fmt.Sprintf(" (%d fields)", len(t.Fields.List))
						}
					default:
						sym.Kind = "type"
						sym.Signature = "type " + s.Name.Name
					}

					symbols = append(symbols, sym)

				case *ast.ValueSpec:
					kind := "var"
					if d.Tok == token.CONST {
						kind = "const"
					}
					for _, name := range s.Names {
						sym := Symbol{
							Name:      name.Name,
							Kind:      kind,
							StartLine: fset.Position(s.Pos()).Line,
							EndLine:   fset.Position(s.End()).Line,
						}
						if s.Type != nil {
							sym.Signature = kind + " " + name.Name + " " + formatType(s.Type)
						} else {
							sym.Signature = kind + " " + name.Name
						}
						symbols = append(symbols, sym)
					}
				}
			}
		}
	}

	return symbols, nil
}

// formatType formats an AST type expression as a string
func formatType(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return "*" + formatType(t.X)
	case *ast.ArrayType:
		return "[]" + formatType(t.Elt)
	case *ast.MapType:
		return "map[" + formatType(t.Key) + "]" + formatType(t.Value)
	case *ast.SelectorExpr:
		return formatType(t.X) + "." + t.Sel.Name
	case *ast.InterfaceType:
		return "interface{}"
	case *ast.FuncType:
		return "func(...)"
	case *ast.ChanType:
		return "chan " + formatType(t.Value)
	case *ast.Ellipsis:
		return "..." + formatType(t.Elt)
	default:
		return "any"
	}
}

// Regex patterns for TypeScript/JavaScript
var (
	tsFuncPattern      = regexp.MustCompile(`(?m)^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[<(]`)
	tsClassPattern     = regexp.MustCompile(`(?m)^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)`)
	tsInterfacePattern = regexp.MustCompile(`(?m)^(?:export\s+)?interface\s+(\w+)`)
	tsTypePattern      = regexp.MustCompile(`(?m)^(?:export\s+)?type\s+(\w+)\s*=`)
	tsConstPattern     = regexp.MustCompile(`(?m)^(?:export\s+)?const\s+(\w+)\s*[=:]`)
	tsMethodPattern    = regexp.MustCompile(`(?m)^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]`)
)

// extractTSSymbols extracts symbols from TypeScript/JavaScript using regex
func extractTSSymbols(content string) []Symbol {
	var symbols []Symbol
	lines := strings.Split(content, "\n")

	for i, line := range lines {
		lineNum := i + 1

		if matches := tsFuncPattern.FindStringSubmatch(line); matches != nil {
			symbols = append(symbols, Symbol{
				Name:      matches[1],
				Kind:      "func",
				StartLine: lineNum,
				EndLine:   lineNum, // Simplified, would need brace matching for accurate end
			})
		}

		if matches := tsClassPattern.FindStringSubmatch(line); matches != nil {
			symbols = append(symbols, Symbol{
				Name:      matches[1],
				Kind:      "class",
				StartLine: lineNum,
				EndLine:   lineNum,
			})
		}

		if matches := tsInterfacePattern.FindStringSubmatch(line); matches != nil {
			symbols = append(symbols, Symbol{
				Name:      matches[1],
				Kind:      "interface",
				StartLine: lineNum,
				EndLine:   lineNum,
			})
		}

		if matches := tsTypePattern.FindStringSubmatch(line); matches != nil {
			symbols = append(symbols, Symbol{
				Name:      matches[1],
				Kind:      "type",
				StartLine: lineNum,
				EndLine:   lineNum,
			})
		}

		if matches := tsConstPattern.FindStringSubmatch(line); matches != nil {
			// Skip if it's inside a class/function (starts with whitespace)
			if !strings.HasPrefix(line, " ") && !strings.HasPrefix(line, "\t") {
				symbols = append(symbols, Symbol{
					Name:      matches[1],
					Kind:      "const",
					StartLine: lineNum,
					EndLine:   lineNum,
				})
			}
		}
	}

	return symbols
}

// Regex patterns for Python
var (
	pyFuncPattern  = regexp.MustCompile(`(?m)^(?:async\s+)?def\s+(\w+)\s*\(`)
	pyClassPattern = regexp.MustCompile(`(?m)^class\s+(\w+)`)
)

// extractPythonSymbols extracts symbols from Python using regex
func extractPythonSymbols(content string) []Symbol {
	var symbols []Symbol
	lines := strings.Split(content, "\n")

	for i, line := range lines {
		lineNum := i + 1

		if matches := pyFuncPattern.FindStringSubmatch(line); matches != nil {
			kind := "func"
			// Check if it's a method (indented)
			if strings.HasPrefix(line, "    ") || strings.HasPrefix(line, "\t") {
				kind = "method"
			}
			symbols = append(symbols, Symbol{
				Name:      matches[1],
				Kind:      kind,
				StartLine: lineNum,
				EndLine:   lineNum,
			})
		}

		if matches := pyClassPattern.FindStringSubmatch(line); matches != nil {
			symbols = append(symbols, Symbol{
				Name:      matches[1],
				Kind:      "class",
				StartLine: lineNum,
				EndLine:   lineNum,
			})
		}
	}

	return symbols
}

// extractGenericSymbols provides basic extraction for unsupported languages
func extractGenericSymbols(content string) []Symbol {
	// Generic patterns that might work across C-like languages
	funcPattern := regexp.MustCompile(`(?m)^\s*(?:pub(?:lic)?\s+)?(?:static\s+)?(?:async\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*[{:]`)

	var symbols []Symbol
	lines := strings.Split(content, "\n")

	for i, line := range lines {
		if matches := funcPattern.FindStringSubmatch(line); matches != nil {
			symbols = append(symbols, Symbol{
				Name:      matches[1],
				Kind:      "func",
				StartLine: i + 1,
				EndLine:   i + 1,
			})
		}
	}

	return symbols
}

// FormatProjectMapJSON returns JSON format
func (pm *ProjectMap) FormatJSON() (string, error) {
	data, err := json.MarshalIndent(pm, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FormatProjectMapMarkdown returns human-readable markdown format
func (pm *ProjectMap) FormatMarkdown() string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# Project: %s\n\n", filepath.Base(pm.RootPath)))
	sb.WriteString(fmt.Sprintf("**Languages**: %s\n", strings.Join(pm.Languages, ", ")))
	sb.WriteString(fmt.Sprintf("**Files**: %d | **Lines**: %d | **Symbols**: %d\n\n",
		pm.Statistics.TotalFiles, pm.Statistics.TotalLines, pm.Statistics.TotalSymbols))

	sb.WriteString("---\n\n")

	// Group files by directory
	dirFiles := make(map[string][]FileSymbols)
	for _, f := range pm.Files {
		dir := filepath.Dir(f.Path)
		if dir == "." {
			dir = "/"
		}
		dirFiles[dir] = append(dirFiles[dir], f)
	}

	// Sort directories
	var dirs []string
	for d := range dirFiles {
		dirs = append(dirs, d)
	}
	sort.Strings(dirs)

	for _, dir := range dirs {
		files := dirFiles[dir]
		sb.WriteString(fmt.Sprintf("## %s\n\n", dir))

		for _, f := range files {
			if len(f.Symbols) == 0 {
				continue
			}

			sb.WriteString(fmt.Sprintf("### %s (%d lines)\n\n", filepath.Base(f.Path), f.LineCount))

			for _, sym := range f.Symbols {
				if sym.Signature != "" {
					sb.WriteString(fmt.Sprintf("- `%s` :%d\n", sym.Signature, sym.StartLine))
				} else {
					sb.WriteString(fmt.Sprintf("- `%s %s` :%d\n", sym.Kind, sym.Name, sym.StartLine))
				}

				for _, child := range sym.Children {
					sb.WriteString(fmt.Sprintf("  - `%s` :%d\n", child.Name, child.StartLine))
				}
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// FormatProjectMapSummary returns a very compact summary
func (pm *ProjectMap) FormatSummary() string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("Project: %s\n", filepath.Base(pm.RootPath)))
	sb.WriteString(fmt.Sprintf("Languages: %s\n", strings.Join(pm.Languages, ", ")))
	sb.WriteString(fmt.Sprintf("Files: %d, Lines: %d, Symbols: %d\n\n",
		pm.Statistics.TotalFiles, pm.Statistics.TotalLines, pm.Statistics.TotalSymbols))

	sb.WriteString("Symbol breakdown:\n")
	for kind, count := range pm.Statistics.BySymbolKind {
		sb.WriteString(fmt.Sprintf("  %s: %d\n", kind, count))
	}

	sb.WriteString("\nKey symbols:\n")

	// Show first 50 top-level symbols
	count := 0
	for _, f := range pm.Files {
		for _, sym := range f.Symbols {
			if count >= 50 {
				sb.WriteString("  ... (truncated)\n")
				return sb.String()
			}
			sb.WriteString(fmt.Sprintf("  %s.%s (%s)\n", filepath.Base(f.Path), sym.Name, sym.Kind))
			count++
		}
	}

	return sb.String()
}
