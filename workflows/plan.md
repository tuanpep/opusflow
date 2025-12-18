---
description: Direct, step-by-step implementation for single-PR tasks
---

# Plan Workflow

Direct, step-by-step implementation for single-PR tasks. Perfect for straightforward development tasks where you want a direct, step‑by‑step guide from idea to implementation.

## When to Use

- Single feature or bug fix
- Changes scoped to one service or component
- Work that fits in one pull request

---

## The 5-Step Process

### Step 1: User Query

Describe your task with relevant context:

| Context Type | Examples |
|--------------|----------|
| **Files** | Source files, config files, documentation, test files |
| **Folders** | Component directories, feature folders, asset directories |
| **Images** | UI mockups, error screenshots |
| **Git Diff** | Uncommitted changes, diff against main/branch/commit |

**Example Query:**
```
Add a new endpoint POST /api/v1/projects that creates a project
within an organization. Include validation and proper error handling.

Context:
- @services/platform-service/internal/handler/
- @services/platform-service/internal/service/
```

### Step 2: Detailed File-Level Plan

The Agent generates a comprehensive plan with:

- **File analysis & structure**: What exists, what needs to change
- **Symbol references**: Functions, types, interfaces to use
- **Implementation steps**: Exact changes for each file

**Plan Output Format:**
```markdown
Follow the below plan verbatim. Trust the files and references.
Do not re-verify what's written in the plan.

## Observations
- Current state of codebase
- Existing patterns to follow
- What's missing

## Approach
- High-level strategy
- Key architectural decisions

## Implementation Steps

### Step 1: [Component] ([Language])

**File**: `path/to/file.ext`
**Action**: Create | Update

**Changes:**
- `FunctionName(args) -> return_type`: Description

**Implementation Details:**
1. Specific logic to implement
2. Error handling approach
3. Edge cases to handle

**Symbol References:**
- Uses: `ExistingType` from `pkg/types`
- Implements: `InterfaceName`

---

### Step 2: [Component] ([Language])
...
```

### Step 3: Execute

Execute the plan with your coding agent:

- **Agent**: Apply the implementation steps verify directly.

### Step 4: Verification

After implementation, verify against the plan:

- Compares agent's implementation against original plan
- Categorizes comments by severity: **Critical, Major, Minor, Outdated**

*Use the [Verification Workflow](verification.md) for this step.*

### Step 5: Complete

Once verified, the task is done. Commit and push your changes.

---

## Quality Standards

| Rule | Description |
|------|-------------|
| **No Placeholders** | Describe actual logic, not "TODO" or "implement here" |
| **Absolute Paths** | Use full paths from project root |
| **Consistent Names** | Variable/function names must match across files |
| **Complete Signatures** | Include all parameters and return types |
| **Symbol References** | Reference existing code symbols explicitly |
