# Traycer Workflow

> **Spec-Driven Development**: Build with a spec. Orchestrate your coding agents. Ship with confidence.

This directory contains workflow templates aligned with [Traycer](https://docs.traycer.ai/) patterns for AI-assisted development.

## 📂 Structure

```
traycer-workflow/
├── README.md                   # This file
├── AGENTS.md                   # Project-specific AI instructions
└── workflows/
    ├── plan.md                 # Single-task implementation (5 steps)
    ├── phases.md               # Multi-phase projects (7 steps)
    ├── review.md               # Code quality review (3 steps)
    └── verification.md         # Plan adherence verification
```

---

## 🔄 Core Workflows

| Workflow | Steps | Use Case | Output |
|----------|-------|----------|--------|
| **[Plan](workflows/plan.md)** | 5 | Single feature/bug fix (1 PR) | File-level implementation plan |
| **[Phases](workflows/phases.md)** | 7 | Complex features (2+ PRs) | Sequenced phase breakdown |
| **[Review](workflows/review.md)** | 3 | Code quality assessment | Bug/Perf/Security/Clarity comments |
| **[Verification](workflows/verification.md)** | — | After plan implementation | Critical/Major/Minor/Outdated comments |

---

## 🚀 Quick Start

### Option A: Single Task (Plan Workflow)

Best for well-scoped tasks that fit in one PR.

```
1. User Query      → Describe task with file/folder context
2. Detailed Plan   → Traycer generates file-level implementation steps
3. Execute         → Hand off to coding agent (Cursor, Claude, etc.)
4. Verification    → Verify implementation against plan
5. Complete        → Commit and ship
```

### Option B: Complex Feature (Phases Workflow)

Best for features spanning multiple services or requiring multiple PRs.

```
1. User Query          → Describe the overall feature
2. Intent Clarification → Confirm business goals, architecture
3. Phase Generation    → Break into sequenced phases

┌─────────────────────────────────────────────┐
│  For each phase:                            │
│  4. Phase Planning  → Generate detailed plan│
│  5. Execute         → Hand off to agent     │
│  6. Verification    → Verify against plan   │
│  7. Next Phase      → Proceed with context  │
└─────────────────────────────────────────────┘
```

### Option C: Code Review (Review Workflow)

Best for PR reviews or code quality assessment.

```
1. User Query         → Provide files/git diff to review
2. Code Review        → Deep analysis with categorized findings
3. Complete           → Address comments
```

---

## 📋 Comment Categories

### Verification (Plan Adherence)

| Category | Icon | Priority | Description |
|----------|------|----------|-------------|
| **Critical** | 🔴 | P0 | Blocks core functionality — fix first |
| **Major** | 🟠 | P1 | Significant behavior issues |
| **Minor** | 🟡 | P2 | Polish items |
| **Outdated** | ⚪ | — | No longer relevant |

### Review (Code Quality)

| Category | Icon | Focus |
|----------|------|-------|
| **Bug** | 🐛 | Logic errors, incorrect implementation |
| **Performance** | ⚡ | Bottlenecks, optimization opportunities |
| **Security** | 🔒 | Vulnerabilities, unsafe practices |
| **Clarity** | 📝 | Readability, documentation, maintainability |

---

## 🤖 AGENTS.md

The `AGENTS.md` file provides project-specific context for AI agents:

- **Project overview** — What this codebase does
- **Setup commands** — How to install, build, test
- **Code style** — Conventions and patterns to follow
- **Testing requirements** — Coverage expectations
- **Security considerations** — What to watch out for

**Placement:**
- Root of repository → Project-wide instructions
- Subdirectories → Component-specific guidance (monorepos)

See: [agents.md standard](https://agents.md)

---

## 🔗 Compatible Agents

These workflows work with any AI coding agent:

| Agent | Type | Handoff Method |
|-------|------|----------------|
| **Cursor** | IDE | Composer paste |
| **Claude Code** | CLI/Extension | Chat paste |
| **Windsurf** | IDE | Cascade input |
| **Gemini CLI** | CLI | Context file |
| **GitHub Copilot** | IDE | Chat input |
| **Cline** | Extension | Chat input |
| **Any others** | — | Export as markdown |

---

## 📖 References

- [Traycer Documentation](https://docs.traycer.ai/)
- [Plan Workflow](https://docs.traycer.ai/tasks/plan)
- [Phases Workflow](https://docs.traycer.ai/tasks/phases)
- [Review Workflow](https://docs.traycer.ai/tasks/review)
- [Verification](https://docs.traycer.ai/tasks/verification)
- [AGENTS.md Standard](https://agents.md)
