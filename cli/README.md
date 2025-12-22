# OpusFlow CLI

> Part of the [OpusFlow](../) monorepo - Command-line tool for plan-first development

This is the CLI component of OpusFlow. For the complete toolkit including the VSCode extension, see the [main README](../README.md).

## Installation

```bash
# Using install script (recommended)
curl -fsSL https://raw.githubusercontent.com/tuanpep/opusflow/main/install.sh | bash

# Or build from source
cd cli
go install .
```

Ensure your `$GOPATH/bin` is in your `$PATH`.

## Usage

### 1. Create a Plan

Generate a new plan template file.

```bash
opusflow plan "Add New Feature"
# Creates: opusflow-planning/plans/plan-01-add-new-feature.md
```

### 2. Get Agent Prompt

Generate the prompt to feed into your AI Agent (Cursor, Antigravity, etc.).

```bash
opusflow prompt plan plan-01-add-new-feature.md
# Output: "Read @opusflow-planning/plans/plan-01-add-new-feature.md and ..."
```

### 3. Verify Implementation

Create a verification report template.

```bash
opusflow verify plan-01-add-new-feature.md
# Creates: opusflow-planning/verifications/verify-plan-01-2025-12-22.md
```

## IDE Support

For Cursor users, use the `prompt` command to copy-paste instructions directly into the Chat.

## MCP Server

OpusFlow acts as a Model Context Protocol (MCP) server, allowing AI agents (like Claude Desktop, Cursor, etc.) to directly create plans and generate prompts.

### Configuration

Add the following to your MCP configuration (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "opusflow": {
      "command": "opusflow",
      "args": ["mcp"]
    }
  }
}
```

This exposes the following tools to the agent:
- `create_plan`: Create a new implementation plan.
- `generate_prompt`: Generate a prompt (plan, research, execute, verify).
- `list_files`: List files in the project to understand structure.
- `search_codebase`: Search for a string query across the entire codebase.

### Parallel Research Pattern

OpusFlow supports a "Deep Dive Research" pattern. When you generate a prompt for research:

```bash
opusflow prompt research plan-01-feature.md
```

It instructs the agent to use `list_files` and `search_codebase` in parallel to gather context before implementation.
