package ops

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
	"text/template"

	"github.com/tuanpep/oplusflow/internal/manager"
)

// AgentType represents supported external agents
type AgentType string

const (
	AgentCursor     AgentType = "cursor" // Default agent
	AgentAider      AgentType = "aider"
	AgentClaudeCode AgentType = "claude-code"
	AgentGemini     AgentType = "gemini" // Gemini CLI
	AgentPrompt     AgentType = "prompt" // Just generate prompt, no execution
)

// DefaultAgent is the default agent type
const DefaultAgent = AgentCursor

// ExecutionResult contains the result of executing a task with an agent
type ExecutionResult struct {
	TaskID     string
	AgentType  AgentType
	Success    bool
	Output     string
	DiffOutput string
	Error      string
}

// AgentConfig contains configuration for an agent
type AgentConfig struct {
	Type       AgentType
	Model      string   // e.g., "claude-4-sonnet", "gpt-4o"
	ExtraFlags []string // Additional CLI flags
}

// ModelInfo describes an available model for an agent
type ModelInfo struct {
	ID          string `json:"id"`          // e.g., "claude-4-sonnet"
	Name        string `json:"name"`        // e.g., "Claude 4 Sonnet"
	Description string `json:"description"` // e.g., "Fast, affordable coding"
	IsDefault   bool   `json:"is_default"`
}

// AgentInfo describes a supported agent
type AgentInfo struct {
	Type        AgentType   `json:"type"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Command     string      `json:"command"`      // CLI command to check
	InstallHint string      `json:"install_hint"` // How to install
	Models      []ModelInfo `json:"models"`
}

// GetAgentCatalog returns information about all supported agents
func GetAgentCatalog() []AgentInfo {
	return []AgentInfo{
		{
			Type:        AgentCursor,
			Name:        "Cursor Agent",
			Description: "AI-powered coding assistant from Cursor IDE",
			Command:     "cursor-agent",
			InstallHint: "curl https://cursor.com/install -fsS | bash",
			Models: []ModelInfo{
				{ID: "auto", Name: "Auto", Description: "Automatically selects best model", IsDefault: true},
				{ID: "claude-4-sonnet", Name: "Claude 4 Sonnet", Description: "Fast, affordable, high quality"},
				{ID: "claude-4.5-sonnet", Name: "Claude 4.5 Sonnet", Description: "Strong reasoning, 1M context"},
				{ID: "claude-4-opus", Name: "Claude 4 Opus", Description: "Top performance, deep reasoning"},
				{ID: "gpt-4o", Name: "GPT-4o", Description: "OpenAI multimodal model"},
				{ID: "gemini-2.5-pro", Name: "Gemini 2.5 Pro", Description: "Google's 1M context model"},
			},
		},
		{
			Type:        AgentAider,
			Name:        "Aider",
			Description: "AI pair programming in your terminal",
			Command:     "aider",
			InstallHint: "pip install aider-chat",
			Models: []ModelInfo{
				{ID: "claude-3-5-sonnet-20241022", Name: "Claude 3.5 Sonnet", Description: "Best for coding tasks", IsDefault: true},
				{ID: "gpt-4", Name: "GPT-4", Description: "OpenAI GPT-4"},
				{ID: "gpt-4-turbo", Name: "GPT-4 Turbo", Description: "Faster GPT-4"},
				{ID: "deepseek-coder", Name: "DeepSeek Coder", Description: "Open source code model"},
			},
		},
		{
			Type:        AgentClaudeCode,
			Name:        "Claude Code",
			Description: "Anthropic's official coding CLI",
			Command:     "claude",
			InstallHint: "npm install -g @anthropic-ai/claude-code",
			Models: []ModelInfo{
				{ID: "claude-sonnet-4-20250514", Name: "Claude Sonnet 4", Description: "Latest Claude Sonnet", IsDefault: true},
				{ID: "claude-opus-4-20250514", Name: "Claude Opus 4", Description: "Most capable Claude"},
			},
		},
		{
			Type:        AgentGemini,
			Name:        "Gemini CLI",
			Description: "Google's Gemini AI in terminal",
			Command:     "gemini",
			InstallHint: "npm install -g @anthropic-ai/gemini", // Update with correct install
			Models: []ModelInfo{
				{ID: "gemini-2.5-pro", Name: "Gemini 2.5 Pro", Description: "1M context, strong reasoning", IsDefault: true},
				{ID: "gemini-2.5-flash", Name: "Gemini 2.5 Flash", Description: "Fast and efficient"},
			},
		},
		{
			Type:        AgentPrompt,
			Name:        "Prompt Only",
			Description: "Generate prompt for manual use",
			Command:     "",
			InstallHint: "Always available",
			Models:      []ModelInfo{},
		},
	}
}

// GetAvailableModels returns models available for a specific agent
func GetAvailableModels(agentType AgentType) []ModelInfo {
	for _, agent := range GetAgentCatalog() {
		if agent.Type == agentType {
			return agent.Models
		}
	}
	return []ModelInfo{}
}

// GetDefaultModel returns the default model for an agent
func GetDefaultModel(agentType AgentType) string {
	models := GetAvailableModels(agentType)
	for _, m := range models {
		if m.IsDefault {
			return m.ID
		}
	}
	if len(models) > 0 {
		return models[0].ID
	}
	return ""
}

// DefaultAgentConfig returns default configuration for an agent
func DefaultAgentConfig(agentType AgentType) *AgentConfig {
	switch agentType {
	case AgentCursor:
		return &AgentConfig{
			Type:       AgentCursor,
			Model:      GetDefaultModel(AgentCursor),
			ExtraFlags: []string{},
		}
	case AgentAider:
		return &AgentConfig{
			Type:       AgentAider,
			Model:      GetDefaultModel(AgentAider),
			ExtraFlags: []string{"--yes-always", "--no-auto-commits"},
		}
	case AgentClaudeCode:
		return &AgentConfig{
			Type:       AgentClaudeCode,
			Model:      GetDefaultModel(AgentClaudeCode),
			ExtraFlags: []string{},
		}
	case AgentGemini:
		return &AgentConfig{
			Type:       AgentGemini,
			Model:      GetDefaultModel(AgentGemini),
			ExtraFlags: []string{},
		}
	default:
		return &AgentConfig{
			Type: AgentPrompt,
		}
	}
}

// GenerateAgentCommand generates the command to execute for a specific agent
func GenerateAgentCommand(task *Task, config *AgentConfig, planPath string) (string, []string, error) {
	prompt := GenerateTaskPrompt(task, "")

	switch config.Type {
	case AgentCursor:
		return generateCursorCommand(task, config, prompt)
	case AgentAider:
		return generateAiderCommand(task, config, prompt)
	case AgentClaudeCode:
		return generateClaudeCodeCommand(task, config, prompt)
	case AgentGemini:
		return generateGeminiCommand(task, config, prompt)
	default:
		return "", nil, fmt.Errorf("unsupported agent type: %s", config.Type)
	}
}

// generateCursorCommand generates a cursor-agent command
func generateCursorCommand(task *Task, config *AgentConfig, prompt string) (string, []string, error) {
	args := []string{
		"-p", prompt, // print mode, non-interactive
	}

	// Add model if specified
	if config.Model != "" {
		args = append(args, "--model", config.Model)
	}

	// Add extra flags
	args = append(args, config.ExtraFlags...)

	return "cursor-agent", args, nil
}

// generateAiderCommand generates an aider command
func generateAiderCommand(task *Task, config *AgentConfig, prompt string) (string, []string, error) {
	args := []string{}

	// Add model
	if config.Model != "" {
		args = append(args, "--model", config.Model)
	}

	// Add extra flags
	args = append(args, config.ExtraFlags...)

	// Add files to edit
	for _, f := range task.Files {
		args = append(args, "--file", f)
	}

	// Add message
	args = append(args, "--message", prompt)

	return "aider", args, nil
}

// generateClaudeCodeCommand generates a claude-code command
func generateClaudeCodeCommand(task *Task, config *AgentConfig, prompt string) (string, []string, error) {
	args := []string{
		"-p", prompt, // print mode, non-interactive
	}

	// Add model if specified
	if config.Model != "" {
		args = append(args, "--model", config.Model)
	}

	args = append(args, config.ExtraFlags...)

	return "claude", args, nil
}

// generateGeminiCommand generates a gemini command
func generateGeminiCommand(task *Task, config *AgentConfig, prompt string) (string, []string, error) {
	args := []string{
		"-p", prompt,
	}

	if config.Model != "" {
		args = append(args, "--model", config.Model)
	}

	args = append(args, config.ExtraFlags...)

	return "gemini", args, nil
}

// ExecuteWithAgent executes a task using an external agent
func ExecuteWithAgent(task *Task, config *AgentConfig, planPath string) (*ExecutionResult, error) {
	if config.Type == AgentPrompt {
		// Just return the prompt, don't execute
		prompt := GenerateTaskPrompt(task, "")
		return &ExecutionResult{
			TaskID:    task.ID,
			AgentType: AgentPrompt,
			Success:   true,
			Output:    prompt,
		}, nil
	}

	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	cmdName, args, err := GenerateAgentCommand(task, config, planPath)
	if err != nil {
		return nil, err
	}

	// Execute the command
	cmd := exec.Command(cmdName, args...)
	cmd.Dir = root

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()

	result := &ExecutionResult{
		TaskID:    task.ID,
		AgentType: config.Type,
		Output:    stdout.String(),
	}

	if err != nil {
		result.Success = false
		result.Error = stderr.String()
		if result.Error == "" {
			result.Error = err.Error()
		}
	} else {
		result.Success = true
	}

	// Capture git diff for verification
	diffOutput, _ := captureGitDiff(root)
	result.DiffOutput = diffOutput

	return result, nil
}

// captureGitDiff captures the current git diff
func captureGitDiff(root string) (string, error) {
	cmd := exec.Command("git", "diff", "--stat")
	cmd.Dir = root

	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	return string(output), nil
}

// GenerateHandoffPrompt generates a prompt for manual handoff to any agent
func GenerateHandoffPrompt(task *Task, planContent string) string {
	tmpl := `# Task Handoff: {{.Title}}

## Context
You are implementing step {{.StepNumber}} of a larger plan.
Focus ONLY on this task. Do not implement other steps.

## Task Details
**ID**: {{.ID}}
**Title**: {{.Title}}

{{if .Files}}
## Files to Modify/Create
{{range .Files}}
- ` + "`{{.}}`" + `
{{end}}
{{end}}

{{if .Dependencies}}
## Dependencies
This task depends on: {{range .Dependencies}}{{.}} {{end}}
Make sure those are complete first.
{{end}}

## Instructions
{{.Description}}

## Verification
After completing this task:
1. Ensure all listed files are created/modified
2. Code compiles without errors
3. Run any specified tests
4. Do NOT make changes outside this task's scope

## Completion
When done, report what was changed and any issues encountered.
`

	t, err := template.New("handoff").Parse(tmpl)
	if err != nil {
		return fmt.Sprintf("Error generating prompt: %v", err)
	}

	var buf bytes.Buffer
	err = t.Execute(&buf, task)
	if err != nil {
		return fmt.Sprintf("Error generating prompt: %v", err)
	}

	return buf.String()
}

// GetSupportedAgents returns list of supported agents
func GetSupportedAgents() []string {
	agents := GetAgentCatalog()
	result := make([]string, len(agents))
	for i, a := range agents {
		result[i] = string(a.Type)
	}
	return result
}

// CheckAgentAvailable checks if an agent is available on the system
func CheckAgentAvailable(agentType AgentType) bool {
	for _, agent := range GetAgentCatalog() {
		if agent.Type == agentType {
			if agent.Command == "" {
				return true // prompt is always available
			}
			_, err := exec.LookPath(agent.Command)
			return err == nil
		}
	}
	return false
}

// FormatAgentStatus returns a formatted status of available agents
func FormatAgentStatus() string {
	var sb strings.Builder
	sb.WriteString("# Agent Availability\n\n")

	for _, agent := range GetAgentCatalog() {
		available := CheckAgentAvailable(agent.Type)
		status := "❌ Not installed"
		if available {
			status = "✅ Available"
		}

		defaultMark := ""
		if agent.Type == DefaultAgent {
			defaultMark = " (default)"
		}

		sb.WriteString(fmt.Sprintf("## %s%s\n", agent.Name, defaultMark))
		sb.WriteString(fmt.Sprintf("**Status**: %s\n", status))
		sb.WriteString(fmt.Sprintf("**Description**: %s\n", agent.Description))

		if !available && agent.InstallHint != "" {
			sb.WriteString(fmt.Sprintf("**Install**: `%s`\n", agent.InstallHint))
		}

		if len(agent.Models) > 0 {
			sb.WriteString("\n**Models**:\n")
			for _, m := range agent.Models {
				defaultStr := ""
				if m.IsDefault {
					defaultStr = " ⭐"
				}
				sb.WriteString(fmt.Sprintf("- `%s`%s - %s\n", m.ID, defaultStr, m.Description))
			}
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FormatModelsTable returns a table of models for a specific agent
func FormatModelsTable(agentType AgentType) string {
	models := GetAvailableModels(agentType)
	if len(models) == 0 {
		return fmt.Sprintf("No models available for agent: %s\n", agentType)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# Models for %s\n\n", agentType))
	sb.WriteString("| Model ID | Name | Description |\n")
	sb.WriteString("|----------|------|-------------|\n")

	for _, m := range models {
		defaultMark := ""
		if m.IsDefault {
			defaultMark = " ⭐"
		}
		sb.WriteString(fmt.Sprintf("| `%s`%s | %s | %s |\n", m.ID, defaultMark, m.Name, m.Description))
	}

	return sb.String()
}
