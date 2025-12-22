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
	AgentAider      AgentType = "aider"
	AgentClaudeCode AgentType = "claude-code"
	AgentCursor     AgentType = "cursor"
	AgentPrompt     AgentType = "prompt" // Just generate prompt, no execution
)

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
	Model      string   // e.g., "claude-3-5-sonnet", "gpt-4"
	ExtraFlags []string // Additional CLI flags
}

// DefaultAgentConfig returns default configuration for an agent
func DefaultAgentConfig(agentType AgentType) *AgentConfig {
	switch agentType {
	case AgentAider:
		return &AgentConfig{
			Type:       AgentAider,
			Model:      "claude-3-5-sonnet-20241022",
			ExtraFlags: []string{"--yes-always", "--no-auto-commits"},
		}
	case AgentClaudeCode:
		return &AgentConfig{
			Type:       AgentClaudeCode,
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
	case AgentAider:
		return generateAiderCommand(task, config, prompt)
	case AgentClaudeCode:
		return generateClaudeCodeCommand(task, config, prompt)
	default:
		return "", nil, fmt.Errorf("unsupported agent type: %s", config.Type)
	}
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

	args = append(args, config.ExtraFlags...)

	return "claude", args, nil
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
	return []string{
		string(AgentAider),
		string(AgentClaudeCode),
		string(AgentCursor),
		string(AgentPrompt),
	}
}

// CheckAgentAvailable checks if an agent is available on the system
func CheckAgentAvailable(agentType AgentType) bool {
	var cmd string
	switch agentType {
	case AgentAider:
		cmd = "aider"
	case AgentClaudeCode:
		cmd = "claude"
	default:
		return true // prompt is always available
	}

	_, err := exec.LookPath(cmd)
	return err == nil
}

// FormatAgentStatus returns a formatted status of available agents
func FormatAgentStatus() string {
	var sb strings.Builder
	sb.WriteString("# Agent Availability\n\n")

	agents := []struct {
		Type    AgentType
		Name    string
		Install string
	}{
		{AgentAider, "Aider", "pip install aider-chat"},
		{AgentClaudeCode, "Claude Code", "npm install -g @anthropic/claude-code"},
		{AgentCursor, "Cursor", "Download from cursor.sh"},
		{AgentPrompt, "Prompt Only", "Always available"},
	}

	for _, a := range agents {
		available := CheckAgentAvailable(a.Type)
		status := "❌ Not installed"
		if available {
			status = "✅ Available"
		}
		sb.WriteString(fmt.Sprintf("- **%s**: %s\n", a.Name, status))
		if !available && a.Install != "" {
			sb.WriteString(fmt.Sprintf("  Install: `%s`\n", a.Install))
		}
	}

	return sb.String()
}
