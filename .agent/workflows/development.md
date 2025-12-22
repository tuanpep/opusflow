---
description: Internal development and contribution workflow for OpusFlow itself
---

# Development Workflow (Internal)

This workflow is for developers (and AI agents) contributing to the **OpusFlow** codebase. It ensures consistency and quality by following the tool's own "Plan-First" philosophy.

## 1. Discovery & Research
Before modifying the CLI or MCP logic, identify the target layer:
- **CLI Layer**: `cli/cmd/` (Commands, Flags, Versioning)
- **Logic Layer**: `cli/internal/ops/` (Tool implementation, searching, file handling)
- **Management Layer**: `cli/internal/manager/` (Root detection, path resolution)

**Required Research Tools:**
- `grep_search` to find tool definitions in `cli/cmd/mcp.go`.
- `list_dir` to understand package boundaries.

## 2. Planning
Every feature or fix MUST have a plan in `opusflow-planning/plans/`.
- Use the standard `plan.md` workflow.
- Ensure the plan specifies changes to the MCP server if a new tool is added.

## 3. Development Setup
Always work within the `cli/` directory for Go-related tasks.
- Verify module: `go mod tidy`
- Local run: `go run main.go [command]`

## 4. MCP Tool Addition Checklist
If adding a new tool to the MCP server:
1.  Implement logic in `cli/internal/ops/`.
2.  Add a comprehensive unit test for the logic.
3.  Register the tool in `cli/cmd/mcp.go` with a clear description and JSON schema.
4.  Update `EXAMPLES.md` if the tool changes the user interaction flow.

## 5. Verification
- **Unit Tests**: Must pass `go test ./internal/...`.
- **Integration**: Verify the tool appears in the MCP list using `mcp-inspector`.
- **Version**: If this is a preparation for a release, bump the version in `cli/cmd/root.go`.

## 6. Commit & Push
- Use conventional commits.
- Tag releases with `v*` to trigger the CI/CD pipeline.
