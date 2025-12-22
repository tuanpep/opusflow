# OpusFlow

> **Spec-Driven Development**: Build with a spec. Orchestrate your coding agents. Ship with confidence.

OpusFlow provides a structured workflow and CLI to guide AI Coding Agents (like Cursor, Windsurf, or Antigravity) through complex development tasks using a **Plan → Execute → Verify** loop.

## 📂 Structure

```
opusflow/
├── cli/                        # The OpusFlow CLI tool
├── README.md                   # This file
├── verifications/              # Verification comments output
│   └── verify-*.md             # Generated verification reports
└── workflows/
    ├── plan.md                 # Single-task implementation (5 steps)
    ├── phases.md               # Multi-phase projects (7 steps)
    ├── review.md               # Code quality review (3 steps)
    └── verification.md         # Plan adherence verification
```

**Output Directory**:
```
opusflow-planning/
├── plans/                      # Detailed implementation plans
└── verifications/              # Verification reports
```

---

## 🚀 Quick Start (CLI)

The easiest way to use OpusFlow is via the CLI.

### 1. Installation

**Option A: Download Binary (Recommended)**
1.  Download the latest release for your OS from the [Releases Page](https://github.com/ergonml/opusflow/releases).
2.  Unzip the file and place the binary in your path.

**Option B: Install from Source**
```bash
cd opusflow/cli
go install .
```

### 2. Configure for AI Agents (Claude Desktop)

To let your AI Agent use OpusFlow, add it to your config file:
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "opusflow": {
      "command": "/path/to/opusflow",
      "args": ["mcp"]
    }
  }
}
```

### 3. Workflow

#### Step 1: Create a Plan
Tell OpusFlow what you want to build.

```bash
opusflow plan "Login Refactor"
# Created: opusflow-planning/plans/plan-01-login-refactor.md
```

#### Step 2: Prompt the Agent
Get the specific prompt to paste into your AI Agent to fill out the plan.

```bash
opusflow prompt plan plan-01-login-refactor.md
# Output: "Read @opusflow-planning/plans/plan-01-login-refactor.md and..."
```

*(Paste this into Cursor/Antigravity)*

#### Step 3: Execute
Once the plan is filled, ask the agent to execute it.

```bash
opusflow prompt execute plan-01-login-refactor.md
# Output: "Follow the plan in @... verbatim..."
```

#### Step 4: Verify
After execution, verify the work.

```bash
opusflow verify plan-01-login-refactor.md
# Created: opusflow-planning/verifications/verify-plan-01-...md
```

Then prompt the agent to perform the verification:

```bash
opusflow prompt verify plan-01-login-refactor.md
```

---

## 🔄 Core Workflows (Manual Usage)

If you prefer not to use the CLI, you can use the markdown files directly.

| Workflow | Steps | Use Case | Output |
|----------|-------|----------|--------|
| **[Plan](workflows/plan.md)** | 5 | Single feature/bug fix (1 PR) | File-level implementation plan |
| **[Phases](workflows/phases.md)** | 7 | Complex features (2+ PRs) | Sequenced phase breakdown |
| **[Review](workflows/review.md)** | 3 | Code quality assessment | Bug/Perf/Security/Clarity comments |
| **[Verification](workflows/verification.md)** | 4 | After plan implementation | Numbered actionable fix comments |

---

## 📄 Plan Quality Standards

Every plan MUST include:

| Element | Description |
|---------|-------------|
| **Pre-requisites** | Dependencies, prior context, environment |
| **Observations** | Current state, missing components, architecture |
| **Approach** | Strategy, key decisions, risks |
| **Implementation Steps** | File, Action, Purpose, Changes, Symbol References |
| **Error Handling** | Per-step error cases and handling |
| **Testing** | Test cases and verification commands |
| **Success Criteria** | Measurable completion criteria |

---

## 📖 References

- [OpusFlow CLI](cli/README.md)
- [AGENTS.md Standard](https://agents.md)
