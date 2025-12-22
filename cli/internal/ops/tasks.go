package ops

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/tuanpep/oplusflow/internal/manager"
)

// Task represents a single atomic task from a plan
type Task struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	StepNumber   int      `json:"step_number"`
	Files        []string `json:"files"`
	Dependencies []string `json:"dependencies"`
	Status       string   `json:"status"` // pending, in_progress, done, failed, skipped
	Order        int      `json:"order"`
	Actions      []string `json:"actions,omitempty"`
}

// TaskQueue represents a queue of tasks from a plan
type TaskQueue struct {
	PlanRef        string    `json:"plan_ref"`
	PlanPath       string    `json:"plan_path"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Tasks          []Task    `json:"tasks"`
	CurrentIdx     int       `json:"current_idx"`
	TotalSteps     int       `json:"total_steps"`
	CompletedSteps int       `json:"completed_steps"`
}

// TaskStatus constants
const (
	TaskStatusPending    = "pending"
	TaskStatusInProgress = "in_progress"
	TaskStatusDone       = "done"
	TaskStatusFailed     = "failed"
	TaskStatusSkipped    = "skipped"
)

// DecomposePlan parses a plan file and extracts atomic tasks
func DecomposePlan(planPath string) (*TaskQueue, error) {
	content, err := ReadFile(planPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read plan: %w", err)
	}

	// Parse the plan to extract implementation steps
	tasks := extractTasksFromPlan(content)

	queue := &TaskQueue{
		PlanRef:    filepath.Base(planPath),
		PlanPath:   planPath,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		Tasks:      tasks,
		CurrentIdx: 0,
		TotalSteps: len(tasks),
	}

	return queue, nil
}

// extractTasksFromPlan parses markdown plan and extracts implementation steps
func extractTasksFromPlan(content string) []Task {
	var tasks []Task

	// Regex patterns for parsing
	stepPattern := regexp.MustCompile(`(?m)^###\s+Step\s+(\d+):\s*(.+)$`)
	filePattern := regexp.MustCompile(`(?m)\*\*File\*\*:\s*\x60([^\x60]+)\x60`)
	actionPattern := regexp.MustCompile(`(?m)\*\*Action\*\*:\s*(\w+)`)

	lines := strings.Split(content, "\n")

	var currentTask *Task
	var currentDescription strings.Builder
	inStep := false
	stepNumber := 0

	for i, line := range lines {
		// Check for new step
		if matches := stepPattern.FindStringSubmatch(line); matches != nil {
			// Save previous task if exists
			if currentTask != nil {
				currentTask.Description = strings.TrimSpace(currentDescription.String())
				tasks = append(tasks, *currentTask)
			}

			stepNumber++
			currentTask = &Task{
				ID:           fmt.Sprintf("task-%d", stepNumber),
				Title:        strings.TrimSpace(matches[2]),
				StepNumber:   stepNumber,
				Status:       TaskStatusPending,
				Order:        stepNumber,
				Files:        []string{},
				Dependencies: []string{},
				Actions:      []string{},
			}
			currentDescription.Reset()
			inStep = true

			// Check for dependencies based on step order
			if stepNumber > 1 {
				currentTask.Dependencies = append(currentTask.Dependencies, fmt.Sprintf("task-%d", stepNumber-1))
			}
			continue
		}

		// Check for file references
		if inStep && currentTask != nil {
			if matches := filePattern.FindStringSubmatch(line); matches != nil {
				filePath := matches[1]
				if !contains(currentTask.Files, filePath) {
					currentTask.Files = append(currentTask.Files, filePath)
				}
			}

			// Check for action type
			if matches := actionPattern.FindStringSubmatch(line); matches != nil {
				action := matches[1]
				if !contains(currentTask.Actions, action) {
					currentTask.Actions = append(currentTask.Actions, action)
				}
			}

			// Check for horizontal rule or next section (end of step)
			if strings.HasPrefix(line, "---") || (strings.HasPrefix(line, "## ") && i > 0) {
				if currentTask != nil {
					currentTask.Description = strings.TrimSpace(currentDescription.String())
					tasks = append(tasks, *currentTask)
					currentTask = nil
					inStep = false
				}
				continue
			}

			// Accumulate description
			currentDescription.WriteString(line)
			currentDescription.WriteString("\n")
		}
	}

	// Don't forget the last task
	if currentTask != nil {
		currentTask.Description = strings.TrimSpace(currentDescription.String())
		tasks = append(tasks, *currentTask)
	}

	return tasks
}

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// SaveTaskQueue saves the task queue to a file
func (tq *TaskQueue) Save() error {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return fmt.Errorf("failed to find project root: %w", err)
	}

	// Save to .opusflow directory
	stateDir := filepath.Join(root, ".opusflow")
	if err := os.MkdirAll(stateDir, 0755); err != nil {
		return fmt.Errorf("failed to create state directory: %w", err)
	}

	tq.UpdatedAt = time.Now()

	data, err := json.MarshalIndent(tq, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal task queue: %w", err)
	}

	filename := fmt.Sprintf("tasks-%s.json", strings.TrimSuffix(tq.PlanRef, filepath.Ext(tq.PlanRef)))
	filePath := filepath.Join(stateDir, filename)

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write task queue: %w", err)
	}

	return nil
}

// LoadTaskQueue loads a task queue from file
func LoadTaskQueue(planRef string) (*TaskQueue, error) {
	root, err := manager.FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	filename := fmt.Sprintf("tasks-%s.json", strings.TrimSuffix(planRef, filepath.Ext(planRef)))
	filePath := filepath.Join(root, ".opusflow", filename)

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read task queue: %w", err)
	}

	var tq TaskQueue
	if err := json.Unmarshal(data, &tq); err != nil {
		return nil, fmt.Errorf("failed to unmarshal task queue: %w", err)
	}

	return &tq, nil
}

// GetNextTask returns the next pending task
func (tq *TaskQueue) GetNextTask() *Task {
	for i := range tq.Tasks {
		if tq.Tasks[i].Status == TaskStatusPending {
			return &tq.Tasks[i]
		}
	}
	return nil
}

// CompleteTask marks a task as done
func (tq *TaskQueue) CompleteTask(taskID string) error {
	for i := range tq.Tasks {
		if tq.Tasks[i].ID == taskID {
			tq.Tasks[i].Status = TaskStatusDone
			tq.CompletedSteps++
			tq.UpdatedAt = time.Now()
			return nil
		}
	}
	return fmt.Errorf("task not found: %s", taskID)
}

// FailTask marks a task as failed
func (tq *TaskQueue) FailTask(taskID, reason string) error {
	for i := range tq.Tasks {
		if tq.Tasks[i].ID == taskID {
			tq.Tasks[i].Status = TaskStatusFailed
			tq.Tasks[i].Description += "\n\n**Failure Reason**: " + reason
			tq.UpdatedAt = time.Now()
			return nil
		}
	}
	return fmt.Errorf("task not found: %s", taskID)
}

// StartTask marks a task as in progress
func (tq *TaskQueue) StartTask(taskID string) error {
	for i := range tq.Tasks {
		if tq.Tasks[i].ID == taskID {
			tq.Tasks[i].Status = TaskStatusInProgress
			tq.UpdatedAt = time.Now()
			return nil
		}
	}
	return fmt.Errorf("task not found: %s", taskID)
}

// GetProgress returns progress info
func (tq *TaskQueue) GetProgress() string {
	pending := 0
	inProgress := 0
	done := 0
	failed := 0

	for _, t := range tq.Tasks {
		switch t.Status {
		case TaskStatusPending:
			pending++
		case TaskStatusInProgress:
			inProgress++
		case TaskStatusDone:
			done++
		case TaskStatusFailed:
			failed++
		}
	}

	return fmt.Sprintf("Progress: %d/%d done | %d pending | %d in progress | %d failed",
		done, tq.TotalSteps, pending, inProgress, failed)
}

// FormatTaskList returns a formatted list of tasks
func (tq *TaskQueue) FormatTaskList() string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# Task Queue: %s\n\n", tq.PlanRef))
	sb.WriteString(fmt.Sprintf("**Created**: %s\n", tq.CreatedAt.Format("2006-01-02 15:04")))
	sb.WriteString(fmt.Sprintf("**Progress**: %s\n\n", tq.GetProgress()))

	for _, task := range tq.Tasks {
		status := getStatusEmoji(task.Status)
		sb.WriteString(fmt.Sprintf("## %s %s: %s\n\n", status, task.ID, task.Title))

		if len(task.Files) > 0 {
			sb.WriteString("**Files**:\n")
			for _, f := range task.Files {
				sb.WriteString(fmt.Sprintf("- `%s`\n", f))
			}
			sb.WriteString("\n")
		}

		if len(task.Dependencies) > 0 {
			sb.WriteString(fmt.Sprintf("**Depends on**: %s\n\n", strings.Join(task.Dependencies, ", ")))
		}

		sb.WriteString("---\n\n")
	}

	return sb.String()
}

func getStatusEmoji(status string) string {
	switch status {
	case TaskStatusPending:
		return "⬜"
	case TaskStatusInProgress:
		return "🔄"
	case TaskStatusDone:
		return "✅"
	case TaskStatusFailed:
		return "❌"
	case TaskStatusSkipped:
		return "⏭️"
	default:
		return "❓"
	}
}

// GenerateTaskPrompt generates a prompt for executing a specific task
func GenerateTaskPrompt(task *Task, planContent string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# Execute Task: %s\n\n", task.Title))
	sb.WriteString(fmt.Sprintf("**Task ID**: %s\n", task.ID))
	sb.WriteString(fmt.Sprintf("**Step Number**: %d\n\n", task.StepNumber))

	sb.WriteString("## Instructions\n\n")
	sb.WriteString("Implement ONLY this specific step. Do not implement other steps.\n\n")

	if len(task.Files) > 0 {
		sb.WriteString("**Files to modify/create**:\n")
		for _, f := range task.Files {
			sb.WriteString(fmt.Sprintf("- `%s`\n", f))
		}
		sb.WriteString("\n")
	}

	sb.WriteString("## Task Details\n\n")
	sb.WriteString(task.Description)
	sb.WriteString("\n\n")

	sb.WriteString("## After Completion\n\n")
	sb.WriteString("When done, verify:\n")
	sb.WriteString("1. All files listed above have been created/modified\n")
	sb.WriteString("2. Code compiles without errors\n")
	sb.WriteString("3. No unrelated changes were made\n")

	return sb.String()
}

// QuickDecomposeFromFile is a helper to decompose and save
func QuickDecomposeFromFile(planPath string) (*TaskQueue, error) {
	tq, err := DecomposePlan(planPath)
	if err != nil {
		return nil, err
	}

	if err := tq.Save(); err != nil {
		return nil, fmt.Errorf("failed to save task queue: %w", err)
	}

	return tq, nil
}
