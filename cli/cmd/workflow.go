package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/orchestrator"
)

var workflowCmd = &cobra.Command{
	Use:   "workflow",
	Short: "Manage SDD workflow state",
	Long: `Manage the Spec-Driven Development workflow state machine.

The workflow orchestrates the SDD phases:
  idle → spec → plan → decompose → execute → verify → complete

If verification fails, it can loop back to planning.`,
}

var workflowStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current workflow status",
	RunE: func(cmd *cobra.Command, args []string) error {
		ws, err := orchestrator.LoadWorkflowState()
		if err != nil {
			return fmt.Errorf("failed to load workflow: %w", err)
		}

		fmt.Println(ws.FormatStatus())
		return nil
	},
}

var workflowStartCmd = &cobra.Command{
	Use:   "start [name]",
	Short: "Start a new workflow",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := "default"
		if len(args) > 0 {
			name = args[0]
		}

		ws := orchestrator.NewWorkflowState(name)
		if err := ws.Save(); err != nil {
			return fmt.Errorf("failed to save workflow: %w", err)
		}

		fmt.Printf("✅ Started new workflow: %s\n", ws.ID)
		fmt.Printf("Current phase: %s\n", ws.CurrentPhase)
		fmt.Printf("Next step: opusflow spec \"description\" to create specification\n")

		return nil
	},
}

var workflowNextCmd = &cobra.Command{
	Use:   "next",
	Short: "Get guidance for the next step",
	RunE: func(cmd *cobra.Command, args []string) error {
		ws, err := orchestrator.LoadWorkflowState()
		if err != nil {
			return fmt.Errorf("failed to load workflow: %w", err)
		}

		next := ws.GetNextPhase()

		fmt.Printf("Current phase: %s\n", ws.CurrentPhase)
		fmt.Printf("Suggested next: %s\n\n", next)

		// Provide specific guidance
		guidance := map[orchestrator.Phase]string{
			orchestrator.PhaseSpec: `Next: Create a specification
  opusflow spec "Your feature description"`,
			orchestrator.PhasePlan: `Next: Create an implementation plan
  opusflow plan "Plan title"`,
			orchestrator.PhaseDecompose: `Next: Decompose the plan into tasks
  opusflow decompose <plan-file>`,
			orchestrator.PhaseExecute: `Next: Execute tasks
  opusflow exec next <plan-ref>`,
			orchestrator.PhaseVerify: `Next: Verify the implementation
  opusflow verify <plan-file>`,
			orchestrator.PhaseComplete: `🎉 Workflow complete!
  opusflow workflow start to begin a new one`,
		}

		if g, ok := guidance[next]; ok {
			fmt.Println(g)
		}

		return nil
	},
}

var workflowTransitionCmd = &cobra.Command{
	Use:   "transition [phase]",
	Short: "Manually transition to a phase",
	Long:  `Valid phases: idle, specification, planning, decomposition, execution, verification, complete, failed`,
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		phase := orchestrator.Phase(args[0])
		reason, _ := cmd.Flags().GetString("reason")

		ws, err := orchestrator.LoadWorkflowState()
		if err != nil {
			return fmt.Errorf("failed to load workflow: %w", err)
		}

		if err := ws.Transition(phase, reason); err != nil {
			return fmt.Errorf("transition failed: %w", err)
		}

		if err := ws.Save(); err != nil {
			return fmt.Errorf("failed to save: %w", err)
		}

		fmt.Printf("✅ Transitioned to: %s\n", phase)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(workflowCmd)

	workflowCmd.AddCommand(workflowStatusCmd)
	workflowCmd.AddCommand(workflowStartCmd)
	workflowCmd.AddCommand(workflowNextCmd)
	workflowCmd.AddCommand(workflowTransitionCmd)

	workflowTransitionCmd.Flags().String("reason", "", "Reason for the transition")
}
