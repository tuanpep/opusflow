package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/ops"
)

var decomposeCmd = &cobra.Command{
	Use:   "decompose [plan-file]",
	Short: "Break a plan into atomic tasks",
	Long: `Decompose an implementation plan into atomic, non-overlapping tasks.

The Commander reads your PLAN.md and extracts implementation steps as 
individual tasks with dependencies. This enables:
- Step-by-step execution
- Progress tracking
- Parallel work where dependencies allow

Examples:
  opusflow decompose plan-01-auth.md
  opusflow decompose opusflow-planning/plans/plan-2024-01-01-feature.md`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		planPath := args[0]

		tq, err := ops.QuickDecomposeFromFile(planPath)
		if err != nil {
			return fmt.Errorf("failed to decompose plan: %w", err)
		}

		fmt.Printf("✅ Decomposed plan into %d tasks\n\n", len(tq.Tasks))
		fmt.Println(tq.FormatTaskList())

		return nil
	},
}

var tasksCmd = &cobra.Command{
	Use:   "tasks",
	Short: "Manage task queue",
	Long:  `Commands for managing the task queue from a decomposed plan.`,
}

var tasksListCmd = &cobra.Command{
	Use:   "list [plan-ref]",
	Short: "List tasks from a plan",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		planRef := args[0]

		tq, err := ops.LoadTaskQueue(planRef)
		if err != nil {
			return fmt.Errorf("failed to load task queue: %w", err)
		}

		fmt.Println(tq.FormatTaskList())
		return nil
	},
}

var tasksNextCmd = &cobra.Command{
	Use:   "next [plan-ref]",
	Short: "Get the next pending task",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		planRef := args[0]

		tq, err := ops.LoadTaskQueue(planRef)
		if err != nil {
			return fmt.Errorf("failed to load task queue: %w", err)
		}

		task := tq.GetNextTask()
		if task == nil {
			fmt.Println("🎉 All tasks completed!")
			return nil
		}

		fmt.Printf("# Next Task: %s\n\n", task.Title)
		fmt.Printf("**ID**: %s\n", task.ID)
		fmt.Printf("**Step**: %d\n\n", task.StepNumber)

		if len(task.Files) > 0 {
			fmt.Println("**Files**:")
			for _, f := range task.Files {
				fmt.Printf("- `%s`\n", f)
			}
			fmt.Println()
		}

		// Read plan content for prompt generation
		planContent, _ := ops.ReadFile(tq.PlanPath)
		prompt := ops.GenerateTaskPrompt(task, planContent)

		generatePrompt, _ := cmd.Flags().GetBool("prompt")
		if generatePrompt {
			fmt.Println()
			fmt.Println("--- AI Prompt ---")
			fmt.Println()
			fmt.Println(prompt)
		}

		return nil
	},
}

var tasksCompleteCmd = &cobra.Command{
	Use:   "complete [plan-ref] [task-id]",
	Short: "Mark a task as complete",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		planRef := args[0]
		taskID := args[1]

		tq, err := ops.LoadTaskQueue(planRef)
		if err != nil {
			return fmt.Errorf("failed to load task queue: %w", err)
		}

		if err := tq.CompleteTask(taskID); err != nil {
			return err
		}

		if err := tq.Save(); err != nil {
			return fmt.Errorf("failed to save: %w", err)
		}

		fmt.Printf("✅ Marked %s as complete\n", taskID)
		fmt.Println(tq.GetProgress())

		return nil
	},
}

var tasksStartCmd = &cobra.Command{
	Use:   "start [plan-ref] [task-id]",
	Short: "Mark a task as in progress",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		planRef := args[0]
		taskID := args[1]

		tq, err := ops.LoadTaskQueue(planRef)
		if err != nil {
			return fmt.Errorf("failed to load task queue: %w", err)
		}

		if err := tq.StartTask(taskID); err != nil {
			return err
		}

		if err := tq.Save(); err != nil {
			return fmt.Errorf("failed to save: %w", err)
		}

		fmt.Printf("🔄 Started %s\n", taskID)

		return nil
	},
}

func init() {
	rootCmd.AddCommand(decomposeCmd)
	rootCmd.AddCommand(tasksCmd)

	tasksCmd.AddCommand(tasksListCmd)
	tasksCmd.AddCommand(tasksNextCmd)
	tasksCmd.AddCommand(tasksCompleteCmd)
	tasksCmd.AddCommand(tasksStartCmd)

	tasksNextCmd.Flags().Bool("prompt", false, "Generate an AI prompt for the task")
}
