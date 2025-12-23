package ops

import (
	"strings"
	"testing"
)

func TestAgentTypeConstants(t *testing.T) {
	// Verify agent type constants
	if AgentCursor != "cursor" {
		t.Errorf("Expected 'cursor', got '%s'", AgentCursor)
	}
	if AgentAider != "aider" {
		t.Errorf("Expected 'aider', got '%s'", AgentAider)
	}
	if AgentClaudeCode != "claude-code" {
		t.Errorf("Expected 'claude-code', got '%s'", AgentClaudeCode)
	}
	if AgentGemini != "gemini" {
		t.Errorf("Expected 'gemini', got '%s'", AgentGemini)
	}
	if AgentPrompt != "prompt" {
		t.Errorf("Expected 'prompt', got '%s'", AgentPrompt)
	}
}

func TestDefaultAgent(t *testing.T) {
	if DefaultAgent != AgentCursor {
		t.Errorf("Expected default agent to be Cursor, got '%s'", DefaultAgent)
	}
}

func TestGetAgentCatalog(t *testing.T) {
	catalog := GetAgentCatalog()

	if len(catalog) < 4 {
		t.Errorf("Expected at least 4 agents, got %d", len(catalog))
	}

	// Check Cursor is in catalog
	foundCursor := false
	for _, agent := range catalog {
		if agent.Type == AgentCursor {
			foundCursor = true
			if len(agent.Models) == 0 {
				t.Error("Expected Cursor to have models")
			}
			if agent.Command != "cursor-agent" {
				t.Errorf("Expected Cursor command 'cursor-agent', got '%s'", agent.Command)
			}
		}
	}
	if !foundCursor {
		t.Error("Expected Cursor agent in catalog")
	}
}

func TestGetAvailableModels(t *testing.T) {
	// Test Cursor models
	cursorModels := GetAvailableModels(AgentCursor)
	if len(cursorModels) == 0 {
		t.Error("Expected Cursor to have models")
	}

	// Check for default model
	hasDefault := false
	for _, m := range cursorModels {
		if m.IsDefault {
			hasDefault = true
		}
	}
	if !hasDefault {
		t.Error("Expected Cursor to have a default model")
	}

	// Test Prompt has no models
	promptModels := GetAvailableModels(AgentPrompt)
	if len(promptModels) != 0 {
		t.Errorf("Expected Prompt to have no models, got %d", len(promptModels))
	}
}

func TestGetDefaultModel(t *testing.T) {
	cursorDefault := GetDefaultModel(AgentCursor)
	if cursorDefault == "" {
		t.Error("Expected non-empty default model for Cursor")
	}

	aiderDefault := GetDefaultModel(AgentAider)
	if aiderDefault == "" {
		t.Error("Expected non-empty default model for Aider")
	}

	promptDefault := GetDefaultModel(AgentPrompt)
	if promptDefault != "" {
		t.Errorf("Expected empty default model for Prompt, got '%s'", promptDefault)
	}
}

func TestDefaultAgentConfig_Cursor(t *testing.T) {
	config := DefaultAgentConfig(AgentCursor)

	if config.Type != AgentCursor {
		t.Errorf("Expected type '%s', got '%s'", AgentCursor, config.Type)
	}
	if config.Model == "" {
		t.Error("Expected default model for Cursor")
	}
}

func TestDefaultAgentConfig_Aider(t *testing.T) {
	config := DefaultAgentConfig(AgentAider)

	if config.Type != AgentAider {
		t.Errorf("Expected type '%s', got '%s'", AgentAider, config.Type)
	}
	if config.Model == "" {
		t.Error("Expected default model for Aider")
	}

	// Check for expected flags
	hasYesAlways := false
	hasNoAutoCommits := false
	for _, flag := range config.ExtraFlags {
		if flag == "--yes-always" {
			hasYesAlways = true
		}
		if flag == "--no-auto-commits" {
			hasNoAutoCommits = true
		}
	}
	if !hasYesAlways {
		t.Error("Expected --yes-always flag for Aider")
	}
	if !hasNoAutoCommits {
		t.Error("Expected --no-auto-commits flag for Aider")
	}
}

func TestDefaultAgentConfig_Prompt(t *testing.T) {
	config := DefaultAgentConfig(AgentPrompt)

	if config.Type != AgentPrompt {
		t.Errorf("Expected type '%s', got '%s'", AgentPrompt, config.Type)
	}
}

func TestGetSupportedAgents(t *testing.T) {
	agents := GetSupportedAgents()

	if len(agents) < 4 {
		t.Errorf("Expected at least 4 supported agents, got %d", len(agents))
	}

	expected := map[string]bool{
		"cursor":      true,
		"aider":       true,
		"claude-code": true,
		"prompt":      true,
	}

	for _, agent := range agents {
		if !expected[agent] {
			t.Logf("Found agent: %s", agent)
		}
	}
}

func TestCheckAgentAvailable_Prompt(t *testing.T) {
	// Prompt should always be available
	if !CheckAgentAvailable(AgentPrompt) {
		t.Error("AgentPrompt should always be available")
	}
}

func TestGenerateHandoffPrompt(t *testing.T) {
	task := &Task{
		ID:           "task-1",
		Title:        "Implement Auth",
		StepNumber:   1,
		Description:  "Add authentication module",
		Files:        []string{"auth.go", "middleware.go"},
		Dependencies: []string{},
	}

	prompt := GenerateHandoffPrompt(task, "plan content")

	if !strings.Contains(prompt, "task-1") {
		t.Error("Expected task ID in handoff prompt")
	}
	if !strings.Contains(prompt, "Implement Auth") {
		t.Error("Expected task title in handoff prompt")
	}
	if !strings.Contains(prompt, "auth.go") {
		t.Error("Expected file list in handoff prompt")
	}
}

func TestGenerateAgentCommand_Cursor(t *testing.T) {
	task := &Task{
		ID:    "task-1",
		Title: "Test Task",
		Files: []string{"file1.go"},
	}
	config := DefaultAgentConfig(AgentCursor)

	cmd, args, err := GenerateAgentCommand(task, config, "plan.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if cmd != "cursor-agent" {
		t.Errorf("Expected command 'cursor-agent', got '%s'", cmd)
	}

	// Check args contain -p
	hasPrintFlag := false
	for _, arg := range args {
		if arg == "-p" {
			hasPrintFlag = true
		}
	}
	if !hasPrintFlag {
		t.Error("Expected -p flag in args")
	}
}

func TestGenerateAgentCommand_Aider(t *testing.T) {
	task := &Task{
		ID:    "task-1",
		Title: "Test Task",
		Files: []string{"file1.go", "file2.go"},
	}
	config := DefaultAgentConfig(AgentAider)

	cmd, args, err := GenerateAgentCommand(task, config, "plan.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if cmd != "aider" {
		t.Errorf("Expected command 'aider', got '%s'", cmd)
	}

	// Check args contain model
	hasModel := false
	for i, arg := range args {
		if arg == "--model" && i+1 < len(args) {
			hasModel = true
		}
	}
	if !hasModel {
		t.Error("Expected --model flag in args")
	}
}

func TestGenerateAgentCommand_ClaudeCode(t *testing.T) {
	task := &Task{
		ID:    "task-1",
		Title: "Test Task",
	}
	config := DefaultAgentConfig(AgentClaudeCode)

	cmd, _, err := GenerateAgentCommand(task, config, "plan.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if cmd != "claude" {
		t.Errorf("Expected command 'claude', got '%s'", cmd)
	}
}

func TestGenerateAgentCommand_Unsupported(t *testing.T) {
	task := &Task{ID: "task-1"}
	config := &AgentConfig{Type: "unsupported"}

	_, _, err := GenerateAgentCommand(task, config, "plan.md")
	if err == nil {
		t.Error("Expected error for unsupported agent type")
	}
}

func TestFormatAgentStatus(t *testing.T) {
	status := FormatAgentStatus()

	if !strings.Contains(status, "# Agent Availability") {
		t.Error("Expected header in agent status")
	}
	if !strings.Contains(status, "Cursor Agent") {
		t.Error("Expected Cursor Agent in status")
	}
	if !strings.Contains(status, "(default)") {
		t.Error("Expected default marker in status")
	}
	if !strings.Contains(status, "Models") {
		t.Error("Expected models section in status")
	}
}

func TestFormatModelsTable(t *testing.T) {
	table := FormatModelsTable(AgentCursor)

	if !strings.Contains(table, "# Models for cursor") {
		t.Error("Expected header in models table")
	}
	if !strings.Contains(table, "Model ID") {
		t.Error("Expected table header in models table")
	}
	if !strings.Contains(table, "claude-4-sonnet") {
		t.Error("Expected model ID in table")
	}
}

func TestFormatModelsTable_NoModels(t *testing.T) {
	table := FormatModelsTable(AgentPrompt)

	if !strings.Contains(table, "No models available") {
		t.Error("Expected 'No models available' message")
	}
}

func TestExecuteWithAgent_PromptMode(t *testing.T) {
	task := &Task{
		ID:          "task-1",
		Title:       "Test Task",
		Description: "Test description",
	}
	config := DefaultAgentConfig(AgentPrompt)

	result, err := ExecuteWithAgent(task, config, "plan.md")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if !result.Success {
		t.Error("Expected success for prompt mode")
	}
	if result.AgentType != AgentPrompt {
		t.Errorf("Expected agent type '%s', got '%s'", AgentPrompt, result.AgentType)
	}
	if result.Output == "" {
		t.Error("Expected prompt output")
	}
}

func TestModelInfo_Struct(t *testing.T) {
	model := ModelInfo{
		ID:          "claude-4-sonnet",
		Name:        "Claude 4 Sonnet",
		Description: "Fast and capable",
		IsDefault:   true,
	}

	if model.ID != "claude-4-sonnet" {
		t.Errorf("Expected ID 'claude-4-sonnet', got '%s'", model.ID)
	}
	if !model.IsDefault {
		t.Error("Expected model to be default")
	}
}

func TestAgentInfo_Struct(t *testing.T) {
	agent := AgentInfo{
		Type:        AgentCursor,
		Name:        "Cursor",
		Description: "AI coding agent",
		Command:     "cursor-agent",
		InstallHint: "curl ...",
		Models:      []ModelInfo{{ID: "model1"}},
	}

	if agent.Type != AgentCursor {
		t.Errorf("Expected type Cursor, got '%s'", agent.Type)
	}
	if len(agent.Models) != 1 {
		t.Errorf("Expected 1 model, got %d", len(agent.Models))
	}
}
