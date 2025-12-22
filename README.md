# OpusFlow

> **Spec-Driven Development for the Age of AI Agents**

OpusFlow is a development orchestration tool designed to bridge the gap between Human Intent and AI Coding Agents (like Claude Desktop, Cursor, or Windsurf). It enforces a **"Plan-First"** philosophy, ensuring complex tasks are executed through a structured **Plan → Execute → Verify** loop rather than ad-hoc chat interactions.

## 🚀 Why OpusFlow?

*   **🚫 Stop Hallucinations**: Agents work better when they follow a strict, improved plan.
*   **⚡ Parallel Research**: Intelligent context gathering that scans your codebase efficiently using parallel execution.
*   **🔗 MCP Native**: Built from the ground up to work as a Model Context Protocol (MCP) server, integrating seamlessly with Claude Desktop.
*   **📂 File-System based**: No databases. Your plans live in your repo as Markdown, version-controlled alongside your code.

---

## 📥 Installation

### Option 1: One-Line Install (Mac & Linux)
The fastest way to get started. Installs the binary to `/usr/local/bin`.

```bash
curl -sL "https://raw.githubusercontent.com/tuanpep/oplusflow/main/install.sh?v=$(date +%s)" | bash
```

### Option 2: Windows / Manual
Download the latest release for your platform from the [Releases Page](https://github.com/tuanpep/oplusflow/releases) and add it to your PATH.

### Option 3: Go Install
```bash
go install github.com/tuanpep/oplusflow/cli@latest
```

---

## 🤖 Configuration (For AI Agents)

To enable your AI Agent to autonomously plan and research, configure OpusFlow as an MCP Server.

**Claude Desktop Configuration:**

*   **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following entry:

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

*Note: Ensure `opusflow` is available in your global path, or provide the absolute path in `"command"`.*

---

## 🛠️ Usage Guide

### 1. The Planning Workflow

OpusFlow structures development into clear steps.

**Step 1: Create a Plan**
Bootstrap a new task.
```bash
opusflow plan "Refactor Login Service"
# Creates: opusflow-planning/plans/plan-01-refactor-login-service.md
```

**Step 2: Research & Fill**
Ask your Agent (via MCP or Chat) to research the codebase and fill out the plan's "Observations" and "Implementation Steps".

> **Agent Prompt:** "Read plan-01.md. Use your tools to research the codebase and fill in the missing sections."

**Step 3: Execute**
The Agent writes code following the strict steps defined in the plan.

**Step 4: Verify**
Generate a verification checklist to ensure acceptance criteria are met.
```bash
opusflow verify plan-01-refactor-login-service.md
```

### 2. Available Workflows

OpusFlow provides standardized templates for different scenarios:

| Workflow | Description | Use Case |
|----------|-------------|----------|
| **[Plan](workflows/plan.md)** | Standard 5-step implementation plan. | Single Feature / Bug Fix |
| **[Phases](workflows/phases.md)** | Multi-phase operational breakdown. | Large Epics / Complex Architectures |
| **[Review](workflows/review.md)** | Quality & Security Audit. | Code Review / Security Hardening |
| **[Verification](workflows/verification.md)** | QA & Acceptance Testing. | Post-implementation checks |

For a step-by-step walkthrough of a real-world task, see **[EXAMPLES.md](EXAMPLES.md)**.

---

## 🏗️ Architecture

OpusFlow operates locally on your machine.
*   **CLI**: Humans use it to manage the lifecycle of plans.
*   **MCP Server**: Agents use it to `list_files` and `search_codebase` rapidly.
*   **Repository**: All state is stored in `opusflow-planning/`, keeping your project portable.

For a deep dive, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📂 Workspace Structure

OpusFlow is flexible and supports both single-repo and multi-repo setups.

### Recommended Setup (Unified Planning)
For workspaces with multiple services (e.g., `frontend` and `backend`), place the `opusflow-planning` folder at the **root** of your workspace. This allows the Agent to plan and execute across the entire stack simultaneously.

```
workspace/                  <-- Project Root
├── .agent/                 <-- Configuration & Workflows
├── opusflow-planning/      <-- Unified Plans
├── frontend/               <-- Frontend Service
└── backend/                <-- Backend Service
```

### Alternative Setup (Independent Planning)
If you prefer strict separation, you can initialize OpusFlow inside each repository independently. The Agent will treat them as completely separate projects.

---

## 🤝 Contributing

Contributions are welcome! Please see **[CONTRIBUTING.md](CONTRIBUTING.md)** for development setup and contribution guidelines.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
