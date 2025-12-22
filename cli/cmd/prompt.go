package cmd

import (
	"fmt"

	"github.com/ergonml/opusflow/internal/ops"
	"github.com/spf13/cobra"
)

var promptCmd = &cobra.Command{
	Use:   "prompt [action] [file]",
	Short: "Generate a prompt for your AI agent",
	Long:  `Generates a copy-pasteable prompt for Antigravity or Cursor to execute the next step.`,
	Example: `  opusflow prompt plan plan-01-feature.md
  opusflow prompt verify plan-01-feature.md`,
	Args: cobra.MinimumNArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		action := args[0]
		file := args[1]

		prompt, err := ops.GeneratePrompt(action, file)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			return
		}
		fmt.Print(prompt)
	},
}

func init() {
	rootCmd.AddCommand(promptCmd)
}
