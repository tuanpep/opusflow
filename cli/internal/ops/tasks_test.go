package ops

import (
	"strings"
	"testing"
)

func TestExtractTasksFromPlan(t *testing.T) {
	planContent := `# Implementation Plan

## Goal
Test goal

## Implementation Steps

### Step 1: Setup project structure

**File**: ` + "`src/main.go`" + `
**Action**: Create

Create the main entry point.

### Step 2: Add configuration

**File**: ` + "`config/config.yaml`" + `
**Action**: Create

Add configuration file.

---

## Verification
Run tests.
`

	tasks := extractTasksFromPlan(planContent)

	if len(tasks) != 2 {
		t.Errorf("Expected 2 tasks, got %d", len(tasks))
	}

	if len(tasks) > 0 {
		if tasks[0].ID != "task-1" {
			t.Errorf("Expected task ID 'task-1', got '%s'", tasks[0].ID)
		}
		if tasks[0].Title != "Setup project structure" {
			t.Errorf("Expected title 'Setup project structure', got '%s'", tasks[0].Title)
		}
		if len(tasks[0].Files) != 1 || tasks[0].Files[0] != "src/main.go" {
			t.Errorf("Expected files ['src/main.go'], got %v", tasks[0].Files)
		}
		if tasks[0].Status != TaskStatusPending {
			t.Errorf("Expected status 'pending', got '%s'", tasks[0].Status)
		}
	}

	if len(tasks) > 1 {
		if tasks[1].ID != "task-2" {
			t.Errorf("Expected task ID 'task-2', got '%s'", tasks[1].ID)
		}
		if len(tasks[1].Dependencies) != 1 || tasks[1].Dependencies[0] != "task-1" {
			t.Errorf("Expected dependencies ['task-1'], got %v", tasks[1].Dependencies)
		}
	}
}

func TestExtractTasksFromPlan_Empty(t *testing.T) {
	tasks := extractTasksFromPlan("")
	if len(tasks) != 0 {
		t.Errorf("Expected 0 tasks for empty content, got %d", len(tasks))
	}
}

func TestExtractTasksFromPlan_NoSteps(t *testing.T) {
	planContent := `# Implementation Plan

## Goal
Some goal without steps.

## Notes
Just notes.
`
	tasks := extractTasksFromPlan(planContent)
	if len(tasks) != 0 {
		t.Errorf("Expected 0 tasks, got %d", len(tasks))
	}
}

func TestTaskQueue_GetNextTask(t *testing.T) {
	tq := &TaskQueue{
		Tasks: []Task{
			{ID: "task-1", Status: TaskStatusDone},
			{ID: "task-2", Status: TaskStatusPending},
			{ID: "task-3", Status: TaskStatusPending},
		},
	}

	next := tq.GetNextTask()
	if next == nil {
		t.Fatal("Expected a task, got nil")
	}
	if next.ID != "task-2" {
		t.Errorf("Expected 'task-2', got '%s'", next.ID)
	}
}

func TestTaskQueue_GetNextTask_AllComplete(t *testing.T) {
	tq := &TaskQueue{
		Tasks: []Task{
			{ID: "task-1", Status: TaskStatusDone},
			{ID: "task-2", Status: TaskStatusDone},
		},
	}

	next := tq.GetNextTask()
	if next != nil {
		t.Errorf("Expected nil when all tasks complete, got %v", next)
	}
}

func TestTaskQueue_CompleteTask(t *testing.T) {
	tq := &TaskQueue{
		Tasks: []Task{
			{ID: "task-1", Status: TaskStatusPending},
			{ID: "task-2", Status: TaskStatusPending},
		},
		TotalSteps: 2,
	}

	err := tq.CompleteTask("task-1")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if tq.Tasks[0].Status != TaskStatusDone {
		t.Errorf("Expected status 'done', got '%s'", tq.Tasks[0].Status)
	}
	if tq.CompletedSteps != 1 {
		t.Errorf("Expected 1 completed step, got %d", tq.CompletedSteps)
	}
}

func TestTaskQueue_CompleteTask_NotFound(t *testing.T) {
	tq := &TaskQueue{
		Tasks: []Task{
			{ID: "task-1", Status: TaskStatusPending},
		},
	}

	err := tq.CompleteTask("task-999")
	if err == nil {
		t.Error("Expected error for non-existent task")
	}
}

func TestTaskQueue_FailTask(t *testing.T) {
	tq := &TaskQueue{
		Tasks: []Task{
			{ID: "task-1", Status: TaskStatusPending, Description: "Original"},
		},
	}

	err := tq.FailTask("task-1", "Build failed")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if tq.Tasks[0].Status != TaskStatusFailed {
		t.Errorf("Expected status 'failed', got '%s'", tq.Tasks[0].Status)
	}
	if !strings.Contains(tq.Tasks[0].Description, "Build failed") {
		t.Errorf("Expected failure reason in description")
	}
}

func TestTaskQueue_StartTask(t *testing.T) {
	tq := &TaskQueue{
		Tasks: []Task{
			{ID: "task-1", Status: TaskStatusPending},
		},
	}

	err := tq.StartTask("task-1")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if tq.Tasks[0].Status != TaskStatusInProgress {
		t.Errorf("Expected status 'in_progress', got '%s'", tq.Tasks[0].Status)
	}
}

func TestTaskQueue_GetProgress(t *testing.T) {
	tq := &TaskQueue{
		Tasks: []Task{
			{ID: "task-1", Status: TaskStatusDone},
			{ID: "task-2", Status: TaskStatusInProgress},
			{ID: "task-3", Status: TaskStatusPending},
			{ID: "task-4", Status: TaskStatusFailed},
		},
		TotalSteps: 4,
	}

	progress := tq.GetProgress()
	if !strings.Contains(progress, "1/4 done") {
		t.Errorf("Expected '1/4 done' in progress, got '%s'", progress)
	}
	if !strings.Contains(progress, "1 pending") {
		t.Errorf("Expected '1 pending' in progress, got '%s'", progress)
	}
}

func TestGetStatusEmoji(t *testing.T) {
	tests := []struct {
		status   string
		expected string
	}{
		{TaskStatusPending, "⬜"},
		{TaskStatusInProgress, "🔄"},
		{TaskStatusDone, "✅"},
		{TaskStatusFailed, "❌"},
		{TaskStatusSkipped, "⏭️"},
		{"unknown", "❓"},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			got := getStatusEmoji(tt.status)
			if got != tt.expected {
				t.Errorf("getStatusEmoji(%s) = %s; want %s", tt.status, got, tt.expected)
			}
		})
	}
}

func TestGenerateTaskPrompt(t *testing.T) {
	task := &Task{
		ID:           "task-1",
		Title:        "Test Task",
		StepNumber:   1,
		Description:  "Do something",
		Files:        []string{"file1.go", "file2.go"},
		Dependencies: []string{},
	}

	prompt := GenerateTaskPrompt(task, "plan content")

	if !strings.Contains(prompt, "Test Task") {
		t.Error("Expected title in prompt")
	}
	if !strings.Contains(prompt, "task-1") {
		t.Error("Expected task ID in prompt")
	}
	if !strings.Contains(prompt, "file1.go") {
		t.Error("Expected file list in prompt")
	}
}
