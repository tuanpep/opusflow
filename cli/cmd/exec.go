package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/ops"
)

var execCmd = &cobra.Command{
	Use:   "exec [task-id|next] [plan-ref]",
	Short: "Execute a task with an external agent",
	Long: `Execute a task using an external coding agent.

The Builder phase executes atomic tasks from a decomposed plan. 
Supports integration with:
- aider: AI pair programming tool
- claude-code: Claude Code CLI
- prompt: Generate prompt only (no execution)

Examples:
  opusflow exec next plan-01-auth.md           # Execute next pending task
  opusflow exec task-3 plan-01-auth.md         # Execute specific task
  opusflow exec next plan.md --agent aider     # Use Aider
  opusflow exec next plan.md --agent prompt    # Just show prompt`,
	Args: cobra.RangeArgs(1, 2),
	RunE: func(cmd *cobra.Command, args []string) error {
		taskSpec := args[0]
		planRef := ""
		if len(args) > 1 {
			planRef = args[1]
		}

		agentName, _ := cmd.Flags().GetString("agent")
		agentType := ops.AgentType(agentName)
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		// Determine which task to execute
		var task *ops.Task
		var tq *ops.TaskQueue

		if planRef != "" {
			var err error
			tq, err = ops.LoadTaskQueue(planRef)
			if err != nil {
				return fmt.Errorf("failed to load task queue: %w", err)
			}
		}

		if taskSpec == "next" {
			if tq == nil {
				return fmt.Errorf("plan-ref required when using 'next'")
			}
			task = tq.GetNextTask()
			if task == nil {
				fmt.Println("🎉 All tasks completed!")
				return nil
			}
		} else {
			// Find specific task
			if tq == nil {
				return fmt.Errorf("plan-ref required to find task")
			}
			for i := range tq.Tasks {
				if tq.Tasks[i].ID == taskSpec {
					task = &tq.Tasks[i]
					break
				}
			}
			if task == nil {
				return fmt.Errorf("task not found: %s", taskSpec)
			}
		}

		fmt.Printf("# Executing: %s\n", task.Title)
		fmt.Printf("**Task ID**: %s\n", task.ID)
		fmt.Printf("**Agent**: %s\n\n", agentType)

		config := ops.DefaultAgentConfig(agentType)

		if dryRun || agentType == ops.AgentPrompt {
			// Just show the prompt
			prompt := ops.GenerateHandoffPrompt(task, "")
			fmt.Println(prompt)
			return nil
		}

		// Check if agent is available
		if !ops.CheckAgentAvailable(agentType) {
			fmt.Printf("❌ Agent '%s' is not installed.\n", agentType)
			fmt.Println(ops.FormatAgentStatus())
			return nil
		}

		// Execute with agent
		fmt.Println("Executing task...")
		result, err := ops.ExecuteWithAgent(task, config, tq.PlanPath)
		if err != nil {
			return fmt.Errorf("execution failed: %w", err)
		}

		// Display result
		if result.Success {
			fmt.Println("✅ Task completed successfully!")

			// Mark task as done
			if tq != nil {
				tq.CompleteTask(task.ID)
				tq.Save()
			}
		} else {
			fmt.Println("❌ Task failed!")
			fmt.Printf("Error: %s\n", result.Error)
		}

		if result.DiffOutput != "" {
			fmt.Println("\n## Changes Made:")
			fmt.Println(result.DiffOutput)
		}

		if len(result.Output) > 0 {
			fmt.Println("\n## Agent Output:")
			// Truncate long output
			output := result.Output
			if len(output) > 2000 {
				output = output[:2000] + "\n... (truncated)"
			}
			fmt.Println(output)
		}

		return nil
	},
}

var agentsCmd = &cobra.Command{
	Use:   "agents",
	Short: "Check available agents",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println(ops.FormatAgentStatus())
		fmt.Println("\n## Supported Agents:")
		for _, a := range ops.GetSupportedAgents() {
			fmt.Printf("- %s\n", a)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(execCmd)
	rootCmd.AddCommand(agentsCmd)

	execCmd.Flags().String("agent", "prompt", "Agent to use: aider, claude-code, prompt")
	execCmd.Flags().Bool("dry-run", false, "Show what would be executed without running")
}
