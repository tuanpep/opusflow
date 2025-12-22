package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/spf13/cobra"
	"github.com/tuanpep/oplusflow/internal/ops"
)

var mcpCmd = &cobra.Command{
	Use:   "mcp",
	Short: "Start the Model Context Protocol (MCP) server",
	Run: func(cmd *cobra.Command, args []string) {
		// Just a friendly startup message (stderr so it doesn't break JSON-RPC on stdout)
		// The agent/client might see this in logs.
		fmt.Fprintf(cmd.ErrOrStderr(), "Starting OpusFlow MCP Server v1.2.0\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - create_plan\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - generate_prompt\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - get_codebase_map (new)\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - list_files\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - read_file\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - write_file\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - run_command\n")
		fmt.Fprintf(cmd.ErrOrStderr(), "  - search_codebase\n")

		s := server.NewMCPServer(
			"OpusFlow MCP",
			"1.2.0",
		)

		// Tool: create_plan
		s.AddTool(mcp.NewTool("create_plan",
			mcp.WithDescription("Create a new implementation plan"),
			mcp.WithString("title",
				mcp.Required(),
				mcp.Description("The title of the plan"),
			),
			mcp.WithString("goal",
				mcp.Required(),
				mcp.Description("The refined goal or query that this plan addresses"),
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
			goal, ok := args["goal"].(string)
			if !ok {
				return mcp.NewToolResultError("goal must be a string"), nil
			}

			result, err := ops.CreatePlan(title, goal)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to create plan: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("Created plan: %s\nFilename: %s", result.FullPath, result.Filename)), nil
		})

		// Tool: create_spec
		s.AddTool(mcp.NewTool("create_spec",
			mcp.WithDescription("Create a feature specification (SPEC.md). This is the Architect phase - focuses on WHAT to build, not HOW. No code should be written yet."),
			mcp.WithString("title",
				mcp.Required(),
				mcp.Description("Short title for the feature specification"),
			),
			mcp.WithString("query",
				mcp.Required(),
				mcp.Description("The user's feature request or problem description"),
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
			query, ok := args["query"].(string)
			if !ok {
				return mcp.NewToolResultError("query must be a string"), nil
			}

			result, err := ops.CreateSpec(title, query, nil)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to create spec: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("Created specification: %s\nFilename: %s\n\nNext: Review and complete the spec, then create a plan with create_plan.", result.FullPath, result.Filename)), nil
		})

		// Tool: decompose_plan
		s.AddTool(mcp.NewTool("decompose_plan",
			mcp.WithDescription("Decompose a plan into atomic tasks. This is the Commander phase - breaks down work into executable steps."),
			mcp.WithString("plan_path",
				mcp.Required(),
				mcp.Description("Path to the plan file to decompose"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			planPath, ok := args["plan_path"].(string)
			if !ok {
				return mcp.NewToolResultError("plan_path must be a string"), nil
			}

			tq, err := ops.QuickDecomposeFromFile(planPath)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to decompose plan: %v", err)), nil
			}

			return mcp.NewToolResultText(tq.FormatTaskList()), nil
		})

		// Tool: get_next_task
		s.AddTool(mcp.NewTool("get_next_task",
			mcp.WithDescription("Get the next pending task from a decomposed plan."),
			mcp.WithString("plan_ref",
				mcp.Required(),
				mcp.Description("The plan filename reference (e.g., plan-01-auth.md)"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			planRef, ok := args["plan_ref"].(string)
			if !ok {
				return mcp.NewToolResultError("plan_ref must be a string"), nil
			}

			tq, err := ops.LoadTaskQueue(planRef)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to load task queue: %v", err)), nil
			}

			task := tq.GetNextTask()
			if task == nil {
				return mcp.NewToolResultText("All tasks completed! 🎉"), nil
			}

			planContent, _ := ops.ReadFile(tq.PlanPath)
			prompt := ops.GenerateTaskPrompt(task, planContent)

			return mcp.NewToolResultText(prompt), nil
		})

		// Tool: complete_task
		s.AddTool(mcp.NewTool("complete_task",
			mcp.WithDescription("Mark a task as complete."),
			mcp.WithString("plan_ref",
				mcp.Required(),
				mcp.Description("The plan filename reference"),
			),
			mcp.WithString("task_id",
				mcp.Required(),
				mcp.Description("The task ID to mark complete (e.g., task-1)"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			planRef, _ := args["plan_ref"].(string)
			taskID, _ := args["task_id"].(string)

			tq, err := ops.LoadTaskQueue(planRef)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to load task queue: %v", err)), nil
			}

			if err := tq.CompleteTask(taskID); err != nil {
				return mcp.NewToolResultError(err.Error()), nil
			}

			if err := tq.Save(); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to save: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("✅ Completed %s\n%s", taskID, tq.GetProgress())), nil
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

		// Tool: get_codebase_map
		s.AddTool(mcp.NewTool("get_codebase_map",
			mcp.WithDescription("Get a compressed map of the codebase showing all symbols (functions, types, classes) without full source. Use this to understand the project structure efficiently."),
			mcp.WithString("format",
				mcp.Description("Output format: 'markdown' (default), 'json', or 'summary'"),
			),
			mcp.WithString("dir",
				mcp.Description("Optional subdirectory to map (relative to root)"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, _ := request.Params.Arguments.(map[string]interface{})

			format := "markdown"
			dir := ""
			if args != nil {
				if f, ok := args["format"].(string); ok {
					format = f
				}
				if d, ok := args["dir"].(string); ok {
					dir = d
				}
			}

			pm, err := ops.GenerateCodebaseMap(dir, nil, nil)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to generate map: %v", err)), nil
			}

			var output string
			switch format {
			case "json":
				output, err = pm.FormatJSON()
				if err != nil {
					return mcp.NewToolResultError(fmt.Sprintf("failed to format: %v", err)), nil
				}
			case "summary":
				output = pm.FormatSummary()
			default:
				output = pm.FormatMarkdown()
			}

			// Truncate if too large
			if len(output) > 100000 {
				output = output[:100000] + "\n... truncated ..."
			}

			return mcp.NewToolResultText(output), nil
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

		// Tool: read_file
		s.AddTool(mcp.NewTool("read_file",
			mcp.WithDescription("Read the full content of a file"),
			mcp.WithString("path",
				mcp.Required(),
				mcp.Description("The path to the file to read"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			path, ok := args["path"].(string)
			if !ok {
				return mcp.NewToolResultError("path must be a string"), nil
			}

			content, err := ops.ReadFile(path)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to read file: %v", err)), nil
			}

			return mcp.NewToolResultText(content), nil
		})

		// Tool: write_file
		s.AddTool(mcp.NewTool("write_file",
			mcp.WithDescription("Create or overwrite a file with new content"),
			mcp.WithString("path",
				mcp.Required(),
				mcp.Description("The path to the file to write"),
			),
			mcp.WithString("content",
				mcp.Required(),
				mcp.Description("The full content to write to the file"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			path, ok := args["path"].(string)
			if !ok {
				return mcp.NewToolResultError("path must be a string"), nil
			}
			content, ok := args["content"].(string)
			if !ok {
				return mcp.NewToolResultError("content must be a string"), nil
			}

			err := ops.WriteFile(path, content)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to write file: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("Successfully wrote to %s", path)), nil
		})

		// Tool: run_command
		s.AddTool(mcp.NewTool("run_command",
			mcp.WithDescription("Run a shell command in the project root"),
			mcp.WithString("command",
				mcp.Required(),
				mcp.Description("The command to execute"),
			),
		), func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args, ok := request.Params.Arguments.(map[string]interface{})
			if !ok {
				return mcp.NewToolResultError("invalid arguments"), nil
			}

			cmdStr, ok := args["command"].(string)
			if !ok {
				return mcp.NewToolResultError("command must be a string"), nil
			}

			output, err := ops.RunCommand(cmdStr)
			if err != nil {
				// Even if it failed, we return the output (err is handled in RunCommand mostly)
				return mcp.NewToolResultError(fmt.Sprintf("failed to run command: %v", err)), nil
			}

			return mcp.NewToolResultText(output), nil
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
