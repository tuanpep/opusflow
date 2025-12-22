package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/ops"
)

var verifyCmd = &cobra.Command{
	Use:   "verify [plan-file]",
	Short: "Verify implementation against a plan",
	Long: `Verify that the implementation matches the plan.

The Critic phase checks:
- Build status
- Test status  
- Files mentioned in plan exist
- Git diff summary

Examples:
  opusflow verify plan-01-auth.md           # Auto verify
  opusflow verify plan.md --prompt          # Generate LLM prompt
  opusflow verify plan.md --spec spec.md    # Include spec context`,
	Args: cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		planFile := args[0]

		generatePrompt, _ := cmd.Flags().GetBool("prompt")
		specFile, _ := cmd.Flags().GetString("spec")

		if generatePrompt {
			// Generate LLM verification prompt
			diffContent, _ := ops.RunCommand("git diff HEAD")
			prompt, err := ops.GenerateVerificationPrompt(planFile, specFile, diffContent)
			if err != nil {
				return fmt.Errorf("failed to generate prompt: %w", err)
			}
			fmt.Println(prompt)
			return nil
		}

		// Run automated verification
		fmt.Println("Running automated verification...")
		result, err := ops.AutoVerifyPlan(planFile)
		if err != nil {
			return fmt.Errorf("verification failed: %w", err)
		}

		// Save report
		reportPath, err := result.Save()
		if err != nil {
			fmt.Printf("Warning: couldn't save report: %v\n", err)
		} else {
			fmt.Printf("📄 Report saved: %s\n\n", reportPath)
		}

		// Display result
		fmt.Println(result.FormatMarkdown())

		return nil
	},
}

func init() {
	rootCmd.AddCommand(verifyCmd)

	verifyCmd.Flags().Bool("prompt", false, "Generate an LLM verification prompt instead of auto-verifying")
	verifyCmd.Flags().String("spec", "", "Path to the spec file for additional context")
}
