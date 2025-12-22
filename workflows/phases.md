---
description: Structured, multi-phase development for complex projects
---

# Phases Workflow

Structured, multi-phase development for complex projects. Break goals into iterative phases with validation between steps.

## When to Use

- Features spanning multiple services
- Large architectural changes
- Work requiring 2+ pull requests
- Dependencies that must be built in order

---

## The 7-Step Process

### Step 1: User Query

Describe your goal with relevant context:

| Context Type | Examples |
|--------------|----------|
| **Files** | Source files, config files, documentation, test files |
| **Folders** | Component directories, feature folders, asset directories |
| **Images** | UI mockups, error screenshots |
| **Git Diff** | Uncommitted changes, diff against main/branch/commit |

### Step 2: Intent Clarification

The Agent clarifies your requirements (if needed):

- **Business goals** and user flows
- **Architecture** and integration needs
- **Non-functional requirements**: Performance, security, scalability

### Step 3: Phase Generation

Break the work into sequential phases:

- **Phase identification**: Clear milestones and outcomes
- **Sequential breakdown**: Logical progression from start to finish
- **Scope definition**: Well-defined boundaries for each phase

**Output Format:**
You MUST save the output to a new file: `opusflow-planning/phases/phase-[00]-[name].md` (relative to project root).

```markdown
## Phase 1: [Title]

**Goal**: What this phase accomplishes
**Milestone**: Verifiable outcome
**Scope**: Files/components affected

---

## Phase 2: [Title]

**Goal**: What this phase accomplishes
**Milestone**: Verifiable outcome
**Dependencies**: Phase 1
```

### Step 4: Phase Planning

For the current phase, generate a detailed plan:

- **Objectives and deliverables**
- **File changes with exact edits**
- **Architecture and approach**

*Use the [Plan Workflow](plan.md) for this step.*

### Step 5: Execute

Execute the plan with your coding agent.

### Step 6: Verification

Verify the implementation against the plan:

- Compares agent's implementation against original plan
- Categorizes comments by severity: **Critical, Major, Minor, Outdated**

*Use the [Verification Workflow](verification.md) for this step.*

### Step 7: Next Phase

Proceed to the next phase:

- **Context preservation**: Carry forward decisions and mappings
- **Progress tracking**: Mark completed phases
- **Adaptation**: Plans adapt based on learnings from previous phases

---

## Managing Phases

### Adding More Phases

- **Insert new phases**: Add between existing ones or at the end
- **Address new requirements**: Add phases for features discovered during development
- **Refinement phases**: Add phases for optimization, testing, or documentation

### Re-arranging Phase Order

- Change sequence based on new insights or changing priorities
- Ensure dependencies are still satisfied

---

## Phase Execution Loop

```
┌─────────────────────────────────────────────────────────┐
│  For each phase:                                        │
│                                                         │
│  1. Generate Plan (plan.md)                            │
│  2. Hand off to Agent                                   │
│  3. Verify (verification.md)                           │
│  4. Fix issues (if any)                                │
│  5. Mark phase complete                                │
│  6. Proceed to next phase (with context)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
