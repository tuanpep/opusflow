package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/ops"
)

var mapCmd = &cobra.Command{
	Use:   "map [directory]",
	Short: "Generate a compressed map of the codebase",
	Long: `Generate a compressed map of the codebase showing all key symbols
(functions, types, classes, interfaces) without the full source code.

This allows AI agents to "see" the whole project structure in a fraction
of the tokens needed for the full source code.

Examples:
  opusflow map                    # Map current project
  opusflow map src/               # Map specific directory
  opusflow map -f json            # Output as JSON
  opusflow map -f markdown        # Output as Markdown (default)
  opusflow map -o map.json        # Save to file`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		dir := ""
		if len(args) > 0 {
			dir = args[0]
		}

		format, _ := cmd.Flags().GetString("format")
		output, _ := cmd.Flags().GetString("output")
		include, _ := cmd.Flags().GetStringSlice("include")
		exclude, _ := cmd.Flags().GetStringSlice("exclude")
		maxFiles, _ := cmd.Flags().GetInt("max-files")

		pm, err := ops.GenerateCodebaseMap(dir, include, exclude, maxFiles)
		if err != nil {
			return fmt.Errorf("failed to generate map: %w", err)
		}

		var result string
		switch strings.ToLower(format) {
		case "json":
			result, err = pm.FormatJSON()
			if err != nil {
				return fmt.Errorf("failed to format JSON: %w", err)
			}
		case "summary":
			result = pm.FormatSummary()
		case "markdown", "md":
			compact, _ := cmd.Flags().GetBool("compact")
			if compact {
				result = pm.FormatCompactMarkdown()
			} else {
				result = pm.FormatMarkdown()
			}
		default:
			result = pm.FormatMarkdown()
		}

		if output != "" {
			err = os.WriteFile(output, []byte(result), 0644)
			if err != nil {
				return fmt.Errorf("failed to write output: %w", err)
			}
			fmt.Printf("Codebase map written to: %s\n", output)
			fmt.Printf("Files: %d | Symbols: %d | Languages: %s\n",
				pm.Statistics.TotalFiles, pm.Statistics.TotalSymbols,
				strings.Join(pm.Languages, ", "))
		} else {
			fmt.Println(result)
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(mapCmd)

	mapCmd.Flags().StringP("format", "f", "markdown", "Output format: json, markdown, summary")
	mapCmd.Flags().StringP("output", "o", "", "Output file (default: stdout)")
	mapCmd.Flags().StringSlice("include", nil, "Include patterns (glob)")
	mapCmd.Flags().StringSlice("exclude", nil, "Exclude patterns (glob)")
	mapCmd.Flags().Int("max-files", 2000, "Maximum number of files to process")
	mapCmd.Flags().BoolP("compact", "c", false, "Compact output (hide child symbols)")
}
