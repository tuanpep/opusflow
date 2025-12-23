package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/ops"
)

var planCmd = &cobra.Command{
	Use:   "plan [title]",
	Short: "Create a new implementation plan",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		title := strings.Join(args, " ")

		// For CLI usage, we default the goal to the title or empty if we don't prompt for it.
		// A better CLI experience might flag for it. For now, let's just use the title as the goal.
		goal := title

		result, err := ops.CreatePlan(title, goal)
		if err != nil {
			return fmt.Errorf("failed to create plan: %w", err)
		}

		fmt.Printf("Created plan: %s\n", result.FullPath)
		fmt.Printf("To fill this plan, run:\n")
		fmt.Printf("  opusflow prompt plan %s\n", result.Filename)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(planCmd)
}
