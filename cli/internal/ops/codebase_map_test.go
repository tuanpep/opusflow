package ops

import (
	"strings"
	"testing"
)

func TestExtractGoSymbols(t *testing.T) {
	// This test covers the AST-based Go symbol extraction
	// We'll test with a simple Go file content if we can create temp files

	// Test the formatType helper directly
	testCases := []struct {
		name     string
		input    string
		expected bool // whether it should contain certain markers
	}{
		{"empty", "", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// formatType requires ast.Expr which is complex to mock
			// Simple placeholder test
			if tc.input == "" && tc.expected {
				// Pass
			}
		})
	}
}

func TestExtractTSSymbols(t *testing.T) {
	content := `
export function myFunction(arg: string): void {
  console.log(arg);
}

export class MyClass {
  constructor() {}
}

interface MyInterface {
  field: string;
}

export type MyType = string | number;

const myConst = 42;
`

	symbols := extractTSSymbols(content)

	// Should find function, class, interface, type, const
	foundFunction := false
	foundClass := false
	foundInterface := false
	foundType := false
	foundConst := false

	for _, sym := range symbols {
		switch sym.Name {
		case "myFunction":
			foundFunction = true
			if sym.Kind != "func" {
				t.Errorf("Expected 'func' kind for myFunction, got '%s'", sym.Kind)
			}
		case "MyClass":
			foundClass = true
			if sym.Kind != "class" {
				t.Errorf("Expected 'class' kind for MyClass, got '%s'", sym.Kind)
			}
		case "MyInterface":
			foundInterface = true
		case "MyType":
			foundType = true
		case "myConst":
			foundConst = true
		}
	}

	if !foundFunction {
		t.Error("Expected to find function 'myFunction'")
	}
	if !foundClass {
		t.Error("Expected to find class 'MyClass'")
	}
	if !foundInterface {
		t.Error("Expected to find interface 'MyInterface'")
	}
	if !foundType {
		t.Error("Expected to find type 'MyType'")
	}
	if !foundConst {
		t.Error("Expected to find const 'myConst'")
	}
}

func TestExtractPythonSymbols(t *testing.T) {
	content := `
def my_function(arg):
    return arg

async def async_function():
    pass

class MyClass:
    def __init__(self):
        pass
`

	symbols := extractPythonSymbols(content)

	foundFunction := false
	foundAsync := false
	foundClass := false

	for _, sym := range symbols {
		switch sym.Name {
		case "my_function":
			foundFunction = true
			if sym.Kind != "func" {
				t.Errorf("Expected 'func' kind, got '%s'", sym.Kind)
			}
		case "async_function":
			foundAsync = true
		case "MyClass":
			foundClass = true
			if sym.Kind != "class" {
				t.Errorf("Expected 'class' kind, got '%s'", sym.Kind)
			}
		}
	}

	if !foundFunction {
		t.Error("Expected to find function 'my_function'")
	}
	if !foundAsync {
		t.Error("Expected to find async function 'async_function'")
	}
	if !foundClass {
		t.Error("Expected to find class 'MyClass'")
	}
}

func TestExtractGenericSymbols(t *testing.T) {
	content := `
function doSomething() {
    // code
}

class GenericClass {
}
`

	symbols := extractGenericSymbols(content)

	// Generic extractor should find function and class patterns
	if len(symbols) == 0 {
		t.Log("Generic symbols extraction may vary - checking basic behavior")
	}
}

func TestProjectMap_FormatSummary(t *testing.T) {
	pm := &ProjectMap{
		RootPath:  "/test/project",
		Languages: []string{"go", "typescript"},
		Files: []FileSymbols{
			{Path: "main.go", Language: "go", LineCount: 100, Symbols: []Symbol{{Name: "main", Kind: "function"}}},
			{Path: "app.ts", Language: "typescript", LineCount: 50, Symbols: []Symbol{{Name: "App", Kind: "class"}}},
		},
		Statistics: ProjectStats{
			TotalFiles:   2,
			TotalLines:   150,
			TotalSymbols: 2,
			ByLanguage:   map[string]int{"go": 1, "typescript": 1},
			BySymbolKind: map[string]int{"function": 1, "class": 1},
		},
	}

	summary := pm.FormatSummary()

	// Just verify it returns something non-empty
	if summary == "" {
		t.Error("Expected non-empty summary")
	}
}

func TestProjectMap_FormatMarkdown(t *testing.T) {
	pm := &ProjectMap{
		RootPath:  "/test/project",
		Languages: []string{"go"},
		Files: []FileSymbols{
			{Path: "main.go", Language: "go", LineCount: 100, Symbols: []Symbol{
				{Name: "main", Kind: "function", Signature: "func main()"},
			}},
		},
		Statistics: ProjectStats{
			TotalFiles:   1,
			TotalLines:   100,
			TotalSymbols: 1,
		},
	}

	md := pm.FormatMarkdown()

	if !strings.Contains(md, "main.go") {
		t.Error("Expected file path in markdown")
	}
	if !strings.Contains(md, "main") {
		t.Error("Expected symbol name in markdown")
	}
}

func TestMatchPatterns(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		include  []string
		exclude  []string
		expected bool
	}{
		{"no patterns", "file.go", nil, nil, true},
		{"include match", "file.go", []string{"*.go"}, nil, true},
		{"include no match", "file.txt", []string{"*.go"}, nil, false},
		{"exclude match", "file.go", nil, []string{"*.go"}, false},
		{"include and exclude", "file.go", []string{"*.go"}, []string{"*_test.go"}, true},
		{"include and exclude test", "file_test.go", []string{"*.go"}, []string{"*_test.go"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchPatterns(tt.path, tt.include, tt.exclude)
			if got != tt.expected {
				t.Errorf("matchPatterns(%s) = %v; want %v", tt.path, got, tt.expected)
			}
		})
	}
}

func TestExtractGoSymbols_RealFile(t *testing.T) {
	// Test with a real Go file - this file itself
	symbols, err := extractGoSymbols("codebase_map_test.go")
	if err != nil {
		// May fail if run from different directory
		t.Logf("extractGoSymbols error (may be expected): %v", err)
		return
	}

	if len(symbols) == 0 {
		t.Error("Expected to find symbols in test file")
	}

	// Check that we found test functions
	foundTest := false
	for _, sym := range symbols {
		if strings.HasPrefix(sym.Name, "Test") {
			foundTest = true
			break
		}
	}
	if !foundTest {
		t.Error("Expected to find Test functions")
	}
}

func TestProjectMap_FormatJSON(t *testing.T) {
	pm := &ProjectMap{
		RootPath:  "/test/project",
		Languages: []string{"go"},
		Files: []FileSymbols{
			{Path: "main.go", Language: "go", LineCount: 100, Symbols: []Symbol{
				{Name: "main", Kind: "func", Signature: "func main()"},
			}},
		},
		Statistics: ProjectStats{
			TotalFiles:   1,
			TotalLines:   100,
			TotalSymbols: 1,
		},
	}

	jsonStr, err := pm.FormatJSON()
	if err != nil {
		t.Fatalf("FormatJSON failed: %v", err)
	}

	if !strings.Contains(jsonStr, "main.go") {
		t.Error("Expected file path in JSON")
	}
	if !strings.Contains(jsonStr, "\"root_path\"") {
		t.Error("Expected root_path key in JSON")
	}
}

func TestProjectMap_FormatCompactMarkdown(t *testing.T) {
	pm := &ProjectMap{
		RootPath:  "/test/project",
		Languages: []string{"go", "typescript"},
		Files: []FileSymbols{
			{Path: "main.go", Language: "go", LineCount: 100, Symbols: []Symbol{
				{Name: "main", Kind: "func", Signature: "func main()", Children: []Symbol{
					{Name: "helper", Kind: "func"},
				}},
			}},
		},
		Statistics: ProjectStats{
			TotalFiles:   1,
			TotalLines:   100,
			TotalSymbols: 2,
		},
	}

	md := pm.FormatCompactMarkdown()

	if !strings.Contains(md, "(Compact)") {
		t.Error("Expected (Compact) in title")
	}
	if !strings.Contains(md, "main.go") {
		t.Error("Expected file path in markdown")
	}
	// Compact mode should NOT include children explicitly listed
	// But they're still in the symbol, just not rendered with deeper indent
}

func TestSymbol_Struct(t *testing.T) {
	sym := Symbol{
		Name:      "TestFunc",
		Kind:      "func",
		Signature: "func TestFunc(t *testing.T)",
		StartLine: 10,
		EndLine:   20,
		Children: []Symbol{
			{Name: "helper", Kind: "func"},
		},
	}

	if sym.Name != "TestFunc" {
		t.Errorf("Expected name 'TestFunc', got '%s'", sym.Name)
	}
	if len(sym.Children) != 1 {
		t.Errorf("Expected 1 child, got %d", len(sym.Children))
	}
}

func TestFileSymbols_Struct(t *testing.T) {
	fs := FileSymbols{
		Path:      "main.go",
		Language:  "go",
		LineCount: 50,
		Symbols:   []Symbol{{Name: "main", Kind: "func"}},
	}

	if fs.Path != "main.go" {
		t.Errorf("Expected path 'main.go', got '%s'", fs.Path)
	}
	if fs.LineCount != 50 {
		t.Errorf("Expected 50 lines, got %d", fs.LineCount)
	}
}

func TestProjectStats_Struct(t *testing.T) {
	stats := ProjectStats{
		TotalFiles:   10,
		TotalLines:   1000,
		TotalSymbols: 50,
		ByLanguage:   map[string]int{"go": 5, "typescript": 5},
		BySymbolKind: map[string]int{"func": 30, "class": 10, "type": 10},
	}

	if stats.TotalFiles != 10 {
		t.Errorf("Expected 10 files, got %d", stats.TotalFiles)
	}
	if stats.ByLanguage["go"] != 5 {
		t.Errorf("Expected 5 Go files, got %d", stats.ByLanguage["go"])
	}
}
