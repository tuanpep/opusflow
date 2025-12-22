package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/tuanpep/oplusflow/internal/manager"
	"github.com/spf13/cobra"
)

var verifyCmd = &cobra.Command{
	Use:   "verify [plan-file]",
	Short: "Create a verification report for a plan",
	Args:  cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		planFile := args[0]
		// Normalize plan file name
		planFile = filepath.Base(planFile)

		rootDir, err := manager.FindProjectRoot()
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			return
		}

		_, verifyDir, err := manager.GetPlanningDirs(rootDir)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			return
		}

		date := time.Now().Format("2006-01-02")
		verifyFilename := fmt.Sprintf("verify-%s-%s.md", strings.TrimSuffix(planFile, ".md"), date)
		fullPath := filepath.Join(verifyDir, verifyFilename)

		content := fmt.Sprintf(`---
Plan: %s
Date: %s
---

# Verification Report

## Summary
[Summarize the verification results here]

## Checklist
- [ ] Plan adherence
- [ ] Build consistency
- [ ] Test coverage

## Issues
(No issues found yet)
`, planFile, date)

		err = os.WriteFile(fullPath, []byte(content), 0644)
		if err != nil {
			fmt.Printf("Error writing file: %v\n", err)
			return
		}

		fmt.Printf("Verification report created: %s\n", fullPath)
	},
}

func init() {
	rootCmd.AddCommand(verifyCmd)
}
