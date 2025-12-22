package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/ops"
)

var specCmd = &cobra.Command{
	Use:   "spec \"description\"",
	Short: "Create a feature specification (SPEC.md)",
	Long: `Create a high-level feature specification from a description.

The Architect phase focuses on WHAT to build, not HOW. 
No code is written - only requirements, constraints, and success criteria.

The generated SPEC.md includes:
- Goal and user stories
- Functional and non-functional requirements
- Architecture constraints
- Edge cases
- Success criteria

Examples:
  opusflow spec "Add user authentication with OAuth2"
  opusflow spec "Implement caching layer for API responses" -c config.yaml
  opusflow spec "Build dashboard analytics" --context src/analytics/`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		description := args[0]

		title, _ := cmd.Flags().GetString("title")
		if title == "" {
			// Use first 50 chars of description as title
			title = description
			if len(title) > 50 {
				title = title[:50]
			}
		}

		contextFiles, _ := cmd.Flags().GetStringSlice("context")
		generatePrompt, _ := cmd.Flags().GetBool("prompt")

		result, err := ops.CreateSpec(title, description, contextFiles)
		if err != nil {
			return fmt.Errorf("failed to create spec: %w", err)
		}

		fmt.Println("✅ Created specification:")
		fmt.Printf("   📄 File: %s\n", result.FullPath)
		fmt.Printf("   📝 Title: %s\n", result.Title)

		if generatePrompt {
			fmt.Println("\n--- AI Prompt ---")
			prompt, err := ops.GenerateSpecPrompt(result.FullPath)
			if err != nil {
				return fmt.Errorf("failed to generate prompt: %w", err)
			}
			fmt.Println(prompt)
		} else {
			fmt.Println("\n💡 Next steps:")
			fmt.Println("   1. Review and fill in the spec template")
			fmt.Println("   2. Use 'opusflow spec --prompt' to generate AI assistance")
			fmt.Println("   3. Once approved, create a plan: opusflow plan \"<title>\"")
		}

		return nil
	},
}

var specPromptCmd = &cobra.Command{
	Use:   "prompt [spec-file]",
	Short: "Generate an AI prompt to complete a spec",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		specFile := args[0]

		prompt, err := ops.GenerateSpecPrompt(specFile)
		if err != nil {
			return fmt.Errorf("failed to generate prompt: %w", err)
		}

		output, _ := cmd.Flags().GetString("output")
		if output != "" {
			if err := os.WriteFile(output, []byte(prompt), 0644); err != nil {
				return fmt.Errorf("failed to write prompt: %w", err)
			}
			fmt.Printf("Prompt written to: %s\n", output)
		} else {
			fmt.Println(prompt)
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(specCmd)

	specCmd.Flags().StringP("title", "t", "", "Custom title for the spec (default: derived from description)")
	specCmd.Flags().StringSliceP("context", "c", nil, "Context files to include in the spec")
	specCmd.Flags().Bool("prompt", false, "Also generate an AI prompt to complete the spec")

	// Add subcommand for generating prompts from existing specs
	specCmd.AddCommand(specPromptCmd)
	specPromptCmd.Flags().StringP("output", "o", "", "Output file for the prompt")
}
