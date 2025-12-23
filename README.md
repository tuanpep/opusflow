# OpusFlow

[![CLI Release](https://img.shields.io/github/v/release/tuanpep/opusflow?filter=v*&label=CLI)](https://github.com/tuanpep/opusflow/releases/latest)
[![VSCode Extension](https://img.shields.io/github/v/release/tuanpep/opusflow?filter=vscode-*&label=VSCode)](https://github.com/tuanpep/opusflow/releases?q=vscode)

A spec-driven development tool to orchestrate coding agents.

## Features

- 📋 **Plan-first development** - Create structured implementation plans
- 🤖 **Multi-agent support** - Works with Cursor, Aider, Claude Code, and more
- 🔌 **MCP Server** - Integrate with AI clients that support Model Context Protocol
- 📊 **Task decomposition** - Break plans into atomic, trackable tasks
- ✅ **Verification** - Generate verification reports for implementations

## Installation

### Quick Install (Linux/macOS)
```bash
curl -fsSL https://raw.githubusercontent.com/tuanpep/opusflow/main/install.sh | bash
```

### Download from Releases
Download the latest binary from [GitHub Releases](https://github.com/tuanpep/opusflow/releases/latest).

### Build from Source
```bash
git clone https://github.com/tuanpep/opusflow.git
cd opusflow/cli
make build
# Binary created at bin/opusflow
```

## Quick Start

### 1. Create a Plan
```bash
opusflow plan "Add User Authentication"
# Creates: opusflow-planning/plans/plan-01-add-user-authentication.md
```

### 2. Generate Agent Prompt
```bash
opusflow prompt plan opusflow-planning/plans/plan-01-add-user-authentication.md
# Outputs a prompt ready for your AI agent
```

### 3. Verify Implementation
```bash
opusflow verify opusflow-planning/plans/plan-01-add-user-authentication.md
# Creates a verification report
```

## Available Commands

| Command | Description |
|---------|-------------|
| `plan` | Create a new implementation plan |
| `prompt` | Generate a prompt for AI agents |
| `verify` | Verify implementation against a plan |
| `spec` | Create a feature specification |
| `decompose` | Break a plan into atomic tasks |
| `exec` | Execute a task with an external agent |
| `tasks` | Manage task queue |
| `map` | Generate a codebase map |
| `agents` | Check available agents |
| `mcp` | Start the MCP server |

## MCP Server

OpusFlow works as an MCP server for AI clients. Add to your config:

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

## Components

- **[CLI](./cli)** - Command-line tool and MCP server
- **[VSCode Extension](./vscode-extension)** - IDE integration (dashboard & file explorer)

## License

MIT

