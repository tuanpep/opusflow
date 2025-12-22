package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/ergonml/opusflow/internal/ops"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/spf13/cobra"
)

var mcpCmd = &cobra.Command{
	Use:   "mcp",
	Short: "Start the Model Context Protocol (MCP) server",
	Run: func(cmd *cobra.Command, args []string) {
		s := server.NewMCPServer(
			"OpusFlow MCP",
			"1.0.0",
		)

		// Tool: create_plan
		s.AddTool(mcp.NewTool("create_plan",
			mcp.WithDescription("Create a new implementation plan"),
			mcp.WithString("title",
				mcp.Required(),
				mcp.Description("The title of the plan"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			title, ok := args["title"].(string)
			if !ok {
				return mcp.NewToolResultError("title must be a string"), nil
			}

			result, err := ops.CreatePlan(title)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to create plan: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("Created plan: %s\nFilename: %s", result.FullPath, result.Filename)), nil
		})

		// Tool: generate_prompt
		s.AddTool(mcp.NewTool("generate_prompt",
			mcp.WithDescription("Generate a prompt for an AI agent"),
			mcp.WithString("action",
				mcp.Required(),
				mcp.Description("The action to perform (plan, execute, verify)"),
			),
			mcp.WithString("file",
				mcp.Required(),
				mcp.Description("The plan filename"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			action, ok := args["action"].(string)
			if !ok {
				return mcp.NewToolResultError("action must be a string"), nil
			}
			file, ok := args["file"].(string)
			if !ok {
				return mcp.NewToolResultError("file must be a string"), nil
			}

			prompt, err := ops.GeneratePrompt(action, file)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to generate prompt: %v", err)), nil
			}

			return mcp.NewToolResultText(prompt), nil
		})

		// Tool: list_files
		s.AddTool(mcp.NewTool("list_files",
			mcp.WithDescription("List files in the project to understand structure"),
			mcp.WithString("dir",
				mcp.Description("Optional subdirectory to list (relative to root)"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			// args can be nil if no args provided
			var dir string
			if ok {
				if d, ok := args["dir"].(string); ok {
					dir = d
				}
			}

			files, err := ops.ListFiles(dir)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to list files: %v", err)), nil
			}

			// limit output if too huge? mcp-go might handle it, but let's be safe.
			if len(files) > 1000 {
				files = files[:1000]
			}

			return mcp.NewToolResultText(strings.Join(files, "\n")), nil
		})

		// Tool: search_codebase
		s.AddTool(mcp.NewTool("search_codebase",
			mcp.WithDescription("Search for a string query across the entire codebase (case-insensitive)"),
			mcp.WithString("query",
				mcp.Required(),
				mcp.Description("The string pattern to search for"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			query, ok := args["query"].(string)
			if !ok {
				return mcp.NewToolResultError("query must be a string"), nil
			}

			results, err := ops.SearchCodebase(query)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to search: %v", err)), nil
			}

			// Format results
			var sb strings.Builder
			for _, r := range results {
				sb.WriteString(fmt.Sprintf("%s:%d: %s\n", r.File, r.Line, r.Content))
			}

			output := sb.String()
			// Basic truncation
			if len(output) > 50000 {
				output = output[:50000] + "\n... truncated ..."
			}

			return mcp.NewToolResultText(output), nil
		})

		if err := server.ServeStdio(s); err != nil {
			fmt.Printf("Server error: %v\n", err)
		}
	},
}

func init() {
	rootCmd.AddCommand(mcpCmd)
}
