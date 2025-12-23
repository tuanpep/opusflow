package cmd

import (
	"bytes"
	"testing"

	"github.com/spf13/cobra"
)

func TestRootCommand(t *testing.T) {
	// Test that root command exists and has expected configuration
	if rootCmd.Use != "opusflow" {
		t.Errorf("Expected 'opusflow' use, got '%s'", rootCmd.Use)
	}

	if rootCmd.Short == "" {
		t.Error("Expected short description")
	}
}

func TestRootCommand_Version(t *testing.T) {
	// Version should be set (either from ldflags or default)
	if Version == "" {
		t.Error("Expected Version to be set")
	}

	if rootCmd.Version != Version {
		t.Errorf("Expected root version to match Version variable")
	}
}

func TestRootCommand_HasSubcommands(t *testing.T) {
	commands := rootCmd.Commands()

	expectedCommands := []string{"plan", "verify", "prompt", "mcp", "spec"}
	foundCommands := make(map[string]bool)

	for _, cmd := range commands {
		foundCommands[cmd.Use] = true
	}

	for _, expected := range expectedCommands {
		// Check prefix match since some commands have arguments in Use
		found := false
		for use := range foundCommands {
			if len(use) >= len(expected) && use[:len(expected)] == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected command '%s' not found", expected)
		}
	}
}

func executeCommand(root *cobra.Command, args ...string) (output string, err error) {
	buf := new(bytes.Buffer)
	root.SetOut(buf)
	root.SetErr(buf)
	root.SetArgs(args)

	err = root.Execute()
	return buf.String(), err
}

func TestRootCommand_Help(t *testing.T) {
	output, err := executeCommand(rootCmd, "--help")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if output == "" {
		t.Error("Expected help output")
	}
}

func TestRootCommand_VersionFlag(t *testing.T) {
	// Reset args after test
	originalVersion := Version
	Version = "test-version"
	rootCmd.Version = Version
	defer func() {
		Version = originalVersion
		rootCmd.Version = originalVersion
	}()

	output, err := executeCommand(rootCmd, "--version")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if output == "" {
		t.Error("Expected version output")
	}
}
