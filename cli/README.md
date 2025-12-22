# OpusFlow CLI

The official CLI tool for the OpusFlow workflow.

## Installation

```bash
cd opusflow/cli
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
- `generate_prompt`: Generate a prompt (plan, execute, verify).
