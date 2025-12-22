package cmd

import (
	"fmt"
	"strings"

	"github.com/ergonml/opusflow/internal/ops"
	"github.com/spf13/cobra"
)

var planCmd = &cobra.Command{
	Use:   "plan [title]",
	Short: "Create a new implementation plan",
	Args:  cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		title := strings.Join(args, " ")

		result, err := ops.CreatePlan(title)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			return
		}

		fmt.Printf("Created plan: %s\n", result.FullPath)
		fmt.Printf("To fill this plan, run:\n")
		fmt.Printf("  opusflow prompt plan %s\n", result.Filename)
	},
}

func init() {
	rootCmd.AddCommand(planCmd)
}
