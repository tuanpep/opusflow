# Contributing to OpusFlow

Thank you for your interest in contributing to OpusFlow! This document provides guidelines for setting up your local development environment and the process for submitting contributions.

## 🛠️ Local Development Setup

### Prerequisites
- **Go**: Version 1.23 or higher.
- **Git**: For version control.
- **Node.js** (Optional): If you want to use the MCP Inspector for debugging.

### Getting Started
1. **Clone the repository**:
   ```bash
   git clone https://github.com/tuanpep/oplusflow.git
   cd oplusflow
   ```

2. **Install dependencies**:
   ```bash
   cd cli
   go mod download
   ```

3. **Build the CLI**:
   ```bash
   go build -o opusflow main.go
   ```

4. **Run locally**:
   ```bash
   ./opusflow --help
   ```

## 🧪 Testing

### Running Unit Tests
We use standard Go testing. Please ensure all tests pass before submitting a PR.
```bash
go test ./... -v
```

### Testing the MCP Server
To test the MCP integration without full deployment:
1. Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):
   ```bash
   npx @modelcontextprotocol/inspector go run main.go mcp
   ```
2. Or configure Claude Desktop to use your local build:
   ```json
   {
     "mcpServers": {
       "opusflow-dev": {
         "command": "go",
         "args": ["run", "/path/to/oplusflow/cli/main.go", "mcp"]
       }
     }
   }
   ```

## 🏗️ Project Structure

- `cli/`: The main Go codebase.
  - `cmd/`: Command-line interface definitions (Cobra).
  - `internal/manager/`: Path management and project root discovery.
  - `internal/ops/`: Core business logic (Planning, Research, Prompts).
- `.agent/workflows/`: Standardized workflow templates used by OpusFlow.
- `opusflow-planning/`: Default directory for storing plans (versioned).

## 🚀 Contribution Process

1. **Create an Issue**: Before starting work, please create an issue to discuss the proposed change.
2. **Standard Workflow**: We use the **Plan → Execute → Verify** loop for all internal development.
   - Use `opusflow plan "Feature Description"` to start.
3. **Branching**: Create a feature branch from `main`.
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `chore:`, `docs:`).
5. **Pull Request**: Open a PR against the `main` branch. Ensure your PR description references the plan and the issue.

## 📦 Releasing
New releases are triggered by pushing a semver tag:
```bash
git tag v1.1.x
git push origin v1.1.x
```
This triggers the GoReleaser workflow.
