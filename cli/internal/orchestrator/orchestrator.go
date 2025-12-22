package orchestrator

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/tuanpep/oplusflow/internal/manager"
)

// WorkflowState represents the current state of an SDD workflow
type WorkflowState struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
	CurrentPhase   Phase             `json:"current_phase"`
	SpecPath       string            `json:"spec_path,omitempty"`
	PlanPath       string            `json:"plan_path,omitempty"`
	TaskQueuePath  string            `json:"task_queue_path,omitempty"`
	VerifyPath     string            `json:"verify_path,omitempty"`
	Context        map[string]string `json:"context,omitempty"`
	History        []PhaseTransition `json:"history,omitempty"`
	VerifyAttempts int               `json:"verify_attempts"`
	MaxRetries     int               `json:"max_retries"`
}

// Phase represents a state in the SDD workflow
type Phase string

const (
	PhaseIdle      Phase = "idle"
	PhaseSpec      Phase = "specification"
	PhasePlan      Phase = "planning"
	PhaseDecompose Phase = "decomposition"
	PhaseExecute   Phase = "execution"
	PhaseVerify    Phase = "verification"
	PhaseComplete  Phase = "complete"
	PhaseFailed    Phase = "failed"
)

// PhaseTransition records a state transition
type PhaseTransition struct {
	From      Phase     `json:"from"`
	To        Phase     `json:"to"`
	Timestamp time.Time `json:"timestamp"`
	Reason    string    `json:"reason,omitempty"`
}

// NewWorkflowState creates a new workflow state
func NewWorkflowState(name string) *WorkflowState {
	return &WorkflowState{
		ID:           fmt.Sprintf("wf-%d", time.Now().UnixNano()),
		Name:         name,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		CurrentPhase: PhaseIdle,
		Context:      make(map[string]string),
		History:      []PhaseTransition{},
		MaxRetries:   3,
	}
}

// Transition moves to a new phase
func (ws *WorkflowState) Transition(to Phase, reason string) error {
	if !isValidTransition(ws.CurrentPhase, to) {
		return fmt.Errorf("invalid transition from %s to %s", ws.CurrentPhase, to)
	}

	transition := PhaseTransition{
		From:      ws.CurrentPhase,
		To:        to,
		Timestamp: time.Now(),
		Reason:    reason,
	}

	ws.History = append(ws.History, transition)
	ws.CurrentPhase = to
	ws.UpdatedAt = time.Now()

	return nil
}

// isValidTransition checks if a phase transition is valid
func isValidTransition(from, to Phase) bool {
	validTransitions := map[Phase][]Phase{
		PhaseIdle:      {PhaseSpec, PhasePlan}, // Can skip spec
		PhaseSpec:      {PhasePlan, PhaseFailed},
		PhasePlan:      {PhaseDecompose, PhaseFailed},
		PhaseDecompose: {PhaseExecute, PhaseFailed},
		PhaseExecute:   {PhaseVerify, PhaseFailed},
		PhaseVerify:    {PhaseComplete, PhasePlan, PhaseExecute, PhaseFailed}, // Can loop back
		PhaseComplete:  {PhaseIdle},                                           // Can start new workflow
		PhaseFailed:    {PhaseIdle, PhaseSpec, PhasePlan},                     // Can retry
	}

	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}

	for _, p := range allowed {
		if p == to {
			return true
		}
	}
	return false
}

// GetNextPhase returns the suggested next phase
func (ws *WorkflowState) GetNextPhase() Phase {
	switch ws.CurrentPhase {
	case PhaseIdle:
		return PhaseSpec
	case PhaseSpec:
		return PhasePlan
	case PhasePlan:
		return PhaseDecompose
	case PhaseDecompose:
		return PhaseExecute
	case PhaseExecute:
		return PhaseVerify
	case PhaseVerify:
		return PhaseComplete
	default:
		return PhaseIdle
	}
}

// Save persists the workflow state to disk
func (ws *WorkflowState) Save() error {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return fmt.Errorf("failed to find project root: %w", err)
	}

	stateDir := filepath.Join(root, ".opusflow")
	if err := os.MkdirAll(stateDir, 0755); err != nil {
		return fmt.Errorf("failed to create state directory: %w", err)
	}

	ws.UpdatedAt = time.Now()

	data, err := json.MarshalIndent(ws, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	filePath := filepath.Join(stateDir, "workflow-state.json")
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write state: %w", err)
	}

	return nil
}

// LoadWorkflowState loads the current workflow state
func LoadWorkflowState() (*WorkflowState, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	filePath := filepath.Join(root, ".opusflow", "workflow-state.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// Return new state if none exists
			return NewWorkflowState("default"), nil
		}
		return nil, fmt.Errorf("failed to read state: %w", err)
	}

	var ws WorkflowState
	if err := json.Unmarshal(data, &ws); err != nil {
		return nil, fmt.Errorf("failed to unmarshal state: %w", err)
	}

	return &ws, nil
}

// FormatStatus returns a formatted status string
func (ws *WorkflowState) FormatStatus() string {
	phaseEmoji := map[Phase]string{
		PhaseIdle:      "⏸️",
		PhaseSpec:      "📝",
		PhasePlan:      "📋",
		PhaseDecompose: "🔨",
		PhaseExecute:   "⚡",
		PhaseVerify:    "🔍",
		PhaseComplete:  "✅",
		PhaseFailed:    "❌",
	}

	emoji := phaseEmoji[ws.CurrentPhase]
	if emoji == "" {
		emoji = "❓"
	}

	next := ws.GetNextPhase()

	return fmt.Sprintf(`# Workflow Status: %s

%s **Current Phase**: %s
**Name**: %s
**Created**: %s
**Updated**: %s

## Artifacts
- Spec: %s
- Plan: %s
- Tasks: %s
- Verification: %s

## Next Step
Suggested next phase: **%s**

## History
%d transitions recorded
`,
		ws.ID,
		emoji,
		ws.CurrentPhase,
		ws.Name,
		ws.CreatedAt.Format("2006-01-02 15:04"),
		ws.UpdatedAt.Format("2006-01-02 15:04"),
		nvl(ws.SpecPath, "(none)"),
		nvl(ws.PlanPath, "(none)"),
		nvl(ws.TaskQueuePath, "(none)"),
		nvl(ws.VerifyPath, "(none)"),
		next,
		len(ws.History),
	)
}

func nvl(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

// SetContext stores a context value
func (ws *WorkflowState) SetContext(key, value string) {
	ws.Context[key] = value
	ws.UpdatedAt = time.Now()
}

// GetContext retrieves a context value
func (ws *WorkflowState) GetContext(key string) string {
	return ws.Context[key]
}

// CanRetry checks if verification can be retried
func (ws *WorkflowState) CanRetry() bool {
	return ws.VerifyAttempts < ws.MaxRetries
}

// IncrementRetry increments the retry counter
func (ws *WorkflowState) IncrementRetry() {
	ws.VerifyAttempts++
}

// ResetRetries resets the retry counter
func (ws *WorkflowState) ResetRetries() {
	ws.VerifyAttempts = 0
}
