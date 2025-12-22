package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var Version = "dev"

var rootCmd = &cobra.Command{
	Use:     "opusflow",
	Short:   "OpusFlow Workflow CLI",
	Long:    `OpusFlow: A spec-driven development tool to orchestrate coding agents.`,
	Version: Version,
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
