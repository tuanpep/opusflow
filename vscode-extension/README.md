# OpusFlow VSCode Extension

> Part of the [OpusFlow](../) monorepo - VSCode integration for plan-first development

This is the VSCode extension component of OpusFlow. For the complete toolkit including the CLI tool, see the [main README](../README.md).

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/tuanpep/opusflow)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](../LICENSE)

## 🚀 Features

OpusFlow brings powerful workflow orchestration for AI agent development directly into VSCode:

### 📋 **Plan Management**
- Create structured development plans with the OpusFlow CLI
- Browse plans, phases, and verifications in a dedicated tree view
- Auto-refresh when files change in the `opusflow-planning/` directory

### 🤖 **Multi-Agent Support**
- **Cursor Agent**: Native integration with Cursor AI
- **Gemini CLI**: Google's Gemini model support
- **Claude CLI**: Anthropic's Claude integration

### 🔐 **Secure Authentication**
- Built-in authentication for all supported AI agents
- Secure credential storage using VSCode's secret management
- Visual authentication status indicators

### 🎯 **Workflow Orchestration**
- Execute complete development workflows with one click
- Real-time progress tracking and logging
- Automatic verification after implementation
- Beautiful webview UI for monitoring execution

### 📊 **Interactive Dashboard**
- **Planning Tab**: View and edit your development plans
- **Phases Tab**: Track progress across workflow phases
- **Execution Tab**: Real-time logs with color-coded messages
- **Verification Tab**: Review verification reports

## 📦 Installation

### Prerequisites

1. **VSCode**: Version 1.85.0 or higher
2. **OpusFlow CLI**: Install the OpusFlow command-line tool

```bash
# Install OpusFlow CLI
curl -fsSL https://raw.githubusercontent.com/ergonml/opusflow/main/install.sh | bash

# Verify installation
opusflow --help
```

### Install Extension

1. Download the `.vsix` file from [releases](https://github.com/tuanpep/opusflow/releases)
2. In VSCode, open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Click the `...` menu at the top
4. Select "Install from VSIX..."
5. Choose the downloaded `.vsix` file

Or install from the VSCode Marketplace (coming soon).

## 🎯 Quick Start

### 1. **Authenticate an Agent**

```
Cmd/Ctrl + Shift + P → "OpusFlow: Authenticate Agent"
```

Select your preferred AI agent and provide credentials:
- **Cursor Agent**: Enter your Cursor access token
- **Gemini CLI**: Enter your Google AI API key
- **Claude CLI**: Enter your Anthropic API key

### 2. **Create a Plan**

```
Cmd/Ctrl + Shift + P → "OpusFlow: Create Plan"
```

Enter a descriptive title for your development task. The OpusFlow CLI will generate a structured plan file.

### 3. **Execute Workflow**

- Navigate to the OpusFlow sidebar (rocket icon)
- Expand the "plans" folder
- Right-click on a plan file
- Select "OpusFlow: Execute Workflow"

The workflow will:
1. Load your plan
2. Generate an AI-ready prompt
3. Execute research phase (simulated)
4. Execute implementation phase (simulated)
5. Run verification automatically

### 4. **Monitor Progress**

Click the status bar item (🚀 OpusFlow) or use:

```
Cmd/Ctrl + Shift + P → "OpusFlow: Open Workflow Panel"
```

## ⚙️ Configuration

Configure OpusFlow in your VSCode settings:

```json
{
  // Path to OpusFlow CLI executable
  "opusflow.cliPath": "opusflow",
  
  // Default AI agent to use
  "opusflow.defaultAgent": "cursor-agent",
  
  // Auto-refresh UI when files change
  "opusflow.autoRefresh": true
}
```

## 📚 Commands

| Command | Description |
|---------|-------------|
| `OpusFlow: Create Plan` | Create a new development plan |
| `OpusFlow: Verify Plan` | Run verification against a plan |
| `OpusFlow: Execute Workflow` | Execute complete workflow for a plan |
| `OpusFlow: Open Workflow Panel` | Open the workflow monitoring dashboard |
| `OpusFlow: Select AI Agent` | Choose which AI agent to use |
| `OpusFlow: Authenticate Agent` | Authenticate with an AI agent |

## 🏗️ Architecture

The extension is organized into 6 main components:

### 1. **Core Infrastructure**
- TypeScript configuration with strict mode
- Webpack bundling for optimal performance
- VSCode extension lifecycle management

### 2. **CLI Integration Layer**
- Wraps OpusFlow CLI commands
- Real-time output streaming
- Process management and error handling

### 3. **Authentication System**
- Multi-provider authentication (Cursor, Gemini, Claude)
- Secure secret storage
- Session management

### 4. **File System Integration**
- Live file watching with `chokidar`
- Tree view for plans, phases, and verifications
- Auto-refresh on file changes

### 5. **Webview UI Components**
- Modern dark theme with gradient accents
- Markdown rendering for plans and reports
- Real-time log streaming
- Progress tracking

### 6. **Workflow Orchestration**
- Multi-phase execution pipeline
- Error handling and recovery
- Real-time status updates

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/tuanpep/opusflow.git
cd vscode-opusflow

# Install dependencies
npm install

# Compile the extension
npm run compile

# Watch for changes
npm run watch
```

### Testing

```bash
# Run tests
npm test

# Run in development
# Press F5 in VSCode to open Extension Development Host
```

### Building

```bash
# Production build
npm run package

# This creates dist/extension.js
```

## 🔧 Troubleshooting

### OpusFlow CLI Not Found

If you see "OpusFlow CLI not found" error:

1. Verify CLI installation: `which opusflow`
2. Update the `opusflow.cliPath` setting if installed in a custom location
3. Ensure the CLI is in your system PATH

### Authentication Issues

If authentication fails:

1. Check your API keys are valid
2. Try logging out and logging back in
3. Verify network connectivity
4. Check VSCode's output panel for detailed errors

### File Watcher Not Working

If the tree view doesn't update:

1. Check that `opusflow-planning/` directory exists in your workspace
2. Verify `opusflow.autoRefresh` is enabled in settings
3. Reload VSCode window

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © OpusFlow Team

## 🔗 Links

- [OpusFlow CLI](https://github.com/ergonml/opusflow)
- [Documentation](https://github.com/ergonml/opusflow/blob/main/README.md)
- [Issues](https://github.com/tuanpep/opusflow/issues)
- [Changelog](CHANGELOG.md)

---

**Made with 💜 by the OpusFlow team**
