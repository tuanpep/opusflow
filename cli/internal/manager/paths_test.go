package manager

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFindProjectRoot(t *testing.T) {
	// Create a temporary directory structure for testing
	baseDir := t.TempDir()

	// Case 1: Root with .agent
	agentDir := filepath.Join(baseDir, "repo_with_agent")
	if err := os.MkdirAll(filepath.Join(agentDir, ".agent"), 0755); err != nil {
		t.Fatal(err)
	}

	// Case 2: Root with opusflow-planning
	planDir := filepath.Join(baseDir, "repo_with_planning")
	if err := os.MkdirAll(filepath.Join(planDir, "opusflow-planning"), 0755); err != nil {
		t.Fatal(err)
	}

	// Case 3: Root with .git
	gitDir := filepath.Join(baseDir, "repo_with_git")
	if err := os.MkdirAll(filepath.Join(gitDir, ".git"), 0755); err != nil {
		t.Fatal(err)
	}

	// Case 4: Deeply nested
	nestedDir := filepath.Join(agentDir, "src", "deep", "nested")
	if err := os.MkdirAll(nestedDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Case 5: No root markers (will be auto-initialized)
	noRootDir := filepath.Join(baseDir, "no_root")
	if err := os.MkdirAll(noRootDir, 0755); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name          string
		cwd           string
		want          string
		wantErr       bool
		checkAutoInit bool
	}{
		{
			name:    "Root found via .agent",
			cwd:     agentDir,
			want:    agentDir,
			wantErr: false,
		},
		{
			name:    "Root found via opusflow-planning",
			cwd:     planDir,
			want:    planDir,
			wantErr: false,
		},
		{
			name:    "Root found via .git",
			cwd:     gitDir,
			want:    gitDir,
			wantErr: false,
		},
		{
			name:    "Nested directory finds root via .agent",
			cwd:     nestedDir,
			want:    agentDir,
			wantErr: false,
		},
		{
			name:          "No root markers - auto-initializes",
			cwd:           noRootDir,
			want:          noRootDir,
			wantErr:       false,
			checkAutoInit: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Save current wd and defer restore
			oldWd, _ := os.Getwd()
			defer os.Chdir(oldWd)

			if err := os.Chdir(tt.cwd); err != nil {
				t.Fatalf("failed to chdir: %v", err)
			}

			got, err := FindProjectRoot()
			if (err != nil) != tt.wantErr {
				t.Errorf("FindProjectRoot() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			// On some systems /private/var vs /var can cause issues, so we evaluate symlinks if needed
			// For this simple test, exact string match or suffix match usually suffices
			if !tt.wantErr {
				evalGot, _ := filepath.EvalSymlinks(got)
				evalWant, _ := filepath.EvalSymlinks(tt.want)
				if evalGot != evalWant {
					t.Errorf("FindProjectRoot() = %v, want %v", got, tt.want)
				}

				// Verify auto-init created the expected directories
				if tt.checkAutoInit {
					expectedDirs := []string{
						filepath.Join(got, ".agent", "workflows"),
						filepath.Join(got, "opusflow-planning", "plans"),
						filepath.Join(got, "opusflow-planning", "phases"),
						filepath.Join(got, "opusflow-planning", "verifications"),
					}
					for _, dir := range expectedDirs {
						if _, err := os.Stat(dir); os.IsNotExist(err) {
							t.Errorf("Auto-init did not create expected directory: %s", dir)
						}
					}
				}
			}
		})
	}
}
