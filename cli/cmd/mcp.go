package cmd

import (
	"context"
	"fmt"

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

		if err := server.ServeStdio(s); err != nil {
			fmt.Printf("Server error: %v\n", err)
		}
	},
}

func init() {
	rootCmd.AddCommand(mcpCmd)
}
