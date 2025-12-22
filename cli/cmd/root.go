package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:     "opusflow",
	Short:   "OpusFlow Workflow CLI",
	Long:    `OpusFlow: A spec-driven development tool to orchestrate coding agents.`,
	Version: "1.1.1",
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	// Global flags can be added here
}
