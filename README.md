# OpusFlow

> Plan-first development workflow orchestration with AI agents

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/go-1.21+-blue.svg)](https://golang.org)
[![VSCode](https://img.shields.io/badge/vscode-extension-blue.svg)](vscode-extension/)

OpusFlow is a comprehensive toolkit for orchestrating AI-assisted development workflows. It combines a powerful CLI tool with a VSCode extension to provide a seamless plan-first development experience.

---

## 🚀 Quick Start

### Install CLI
```bash
curl -fsSL https://raw.githubusercontent.com/tuanpep/opusflow/main/install.sh | bash
```

### Install VSCode Extension
Download the latest `.vsix` from [releases](https://github.com/tuanpep/opusflow/releases) and install in VSCode.

---

## 📦 What's Inside

This monorepo contains:

### 🔧 [CLI Tool](./cli/)
A Go-based command-line tool for creating and managing development plans.

**Features:**
- Create structured development plans
- Generate AI-ready prompts
- Verify implementation against plans
- MCP (Model Context Protocol) server support

**Quick Commands:**
```bash
opusflow plan "Add user authentication"
opusflow verify plan-20231222.md
opusflow prompt plan plan-20231222.md
```

[→ CLI Documentation](./cli/README.md)

---

### 🎨 [VSCode Extension](./vscode-extension/)
A TypeScript-based VSCode extension for visual workflow orchestration.

**Features:**
- Beautiful workflow dashboard with 4 tabs
- Real-time progress tracking
- Multi-agent authentication (Cursor, Gemini, Claude)
- File system integration with auto-refresh
- One-click workflow execution

**Screenshots:**
- Modern dark theme with gradients
- Real-time log streaming
- Phase tracking with status badges

[→ Extension Documentation](./vscode-extension/README.md)

---

## 🎯 How It Works

OpusFlow implements a **Spec-Driven Development (SDD)** workflow:

### 1. **Understand the Codebase**
```bash
opusflow map                              # Generate codebase symbol map
```
The Librarian indexes your project in ~2k tokens vs 200k for full source.

### 2. **Create a Specification**
```bash
opusflow spec "Add OAuth2 authentication"  # Create SPEC.md
```
The Architect defines WHAT to build (requirements, edge cases, success criteria).

### 3. **Create a Plan**
```bash
opusflow plan "Implement OAuth2"          # Create PLAN.md
```
Generates step-by-step implementation instructions.

### 4. **Decompose into Tasks**
```bash
opusflow decompose plan-*.md              # Break into atomic tasks
```
The Commander creates a task queue with dependencies.

### 5. **Execute with AI**
```bash
opusflow exec next plan-*.md --agent aider  # Execute tasks
```
The Builder hands off to external agents (Aider, Claude Code).

### 6. **Verify Implementation**
```bash
opusflow verify plan-*.md                 # Auto-verify
```
The Critic checks build, tests, and plan adherence.

### Workflow Management
```bash
opusflow workflow start "Feature X"       # Start new workflow
opusflow workflow status                  # Check current state
opusflow workflow next                    # Get guidance
```

---

## 📖 Documentation

- **[Architecture](./docs/ARCHITECTURE.md)** - System design and components
- **[Contributing](./docs/CONTRIBUTING.md)** - How to contribute
- **[Examples](./docs/EXAMPLES.md)** - Usage examples and workflows
- **[CLI README](./cli/README.md)** - CLI tool documentation
- **[Extension README](./vscode-extension/README.md)** - VSCode extension documentation

---

## 🛠️ Development

### CLI Development
```bash
cd cli
go build -o opusflow
./opusflow --help
```

### Extension Development
```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VSCode to launch Extension Development Host
```

---

## 🏗️ Project Structure

```
opusflow/
├── cli/                      # Go CLI tool
│   ├── cmd/                  # Command implementations
│   ├── internal/             # Internal packages
│   └── main.go               # Entry point
│
├── vscode-extension/         # VSCode extension
│   ├── src/                  # TypeScript source
│   ├── resources/            # UI resources
│   └── package.json          # Extension manifest
│
├── .agent/                   # Agent workflows
│   └── workflows/            # Workflow definitions
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── EXAMPLES.md
│
└── opusflow-planning/        # Example planning directory
    ├── plans/                # Development plans
    ├── phases/               # Phase breakdowns
    └── verifications/        # Verification reports
```

---

## 🌟 Features

### CLI Features
- ✅ Plan creation and management
- ✅ AI prompt generation
- ✅ Implementation verification
- ✅ MCP server support
- ✅ Cross-platform (Linux, macOS, Windows)

### Extension Features
- ✅ Visual workflow dashboard
- ✅ Multi-agent authentication
- ✅ Real-time progress tracking
- ✅ File system integration
- ✅ One-click execution
- ✅ Beautiful dark theme UI

---

## 🔗 Integrations

OpusFlow works with:
- **Cursor AI** - Native integration
- **Claude (Anthropic)** - API support
- **Gemini (Google)** - API support
- **Any AI agent** - Via generated prompts

---

## 📋 Requirements

### CLI
- Go 1.21 or higher (for building)
- No runtime dependencies

### VSCode Extension
- VSCode 1.107.0 or higher
- OpusFlow CLI installed
- Node.js 18+ (for development)

---

## 🚧 Roadmap

- [ ] Direct AI agent execution
- [ ] Workflow templates
- [ ] Team collaboration features
- [ ] Multi-workspace support
- [ ] Web dashboard
- [ ] Additional AI agent providers

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details.

### Development Setup
1. Clone the repository
2. Install CLI: `cd cli && go build`
3. Install extension dependencies: `cd vscode-extension && npm install`
4. Make changes
5. Test thoroughly
6. Submit PR

---

## 📄 License

MIT © OpusFlow Team

See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with love for developers who believe in planning before coding.

Special thanks to:
- The Go community
- VSCode extension developers
- AI agent providers (Anthropic, Google, Cursor)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/tuanpep/opusflow/issues)
- **Documentation**: [docs/](./docs/)
- **CLI Help**: `opusflow --help`
- **Extension Help**: Check the extension README

---

**Start planning, stop guessing. Build better software with OpusFlow.** 🚀
