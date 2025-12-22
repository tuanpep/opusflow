---
description: Streamlined workflow for small features and quick fixes
---

# Task Workflow (Quick Fix)

A streamlined workflow for small features, bug fixes, and minor adjustments. Balances planning with speed by skipping formal architectural specs.

## When to Use

- Single file or small component changes
- Straightforward bug fixes
- UI tweaks
- Logic adjustments within existing patterns
- Work that fits in a single turn or two

## The 3-Step Process

### Step 1: Context & Observation

**User Query:**
Provide the request and relevant context (files, errors).

**Agent Action:**
Before writing code, the Agent MUST:
1.  **Read** the relevant files to load them into context.
2.  **Observe** the current state and explain the logic flow.

**Prompting Pattern:**
```
Read @src/path/to/file.ts and explain how the current [function/component] works.
Then, describe what changes are needed to satisfy the request.
```

### Step 2: File-Level Plan

The Agent MUST generate a specific **File-Level Plan** in the chat before executing. This ensures precision even for small tasks.

**Format:**

```markdown
**Plan:**

1.  **File**: `/absolute/path/to/file.ext`
    *   **Action**: Update
    *   **Change**: Add `NewFunction()` to handle X.
    *   **Logic**: [Brief description of the logic change]

2.  **File**: `/absolute/path/to/test_file.ext`
    *   **Action**: Create/Update
    *   **Change**: Add test case `TestNewFunction`.

**Verification Command**: `go test ./...`
```

### Step 3: Execute & Verify

**Execute:**
- Apply changes using `replace_file_content` or `multi_replace_file_content` following the plan above exactly.

**Verify:**
- Run relevant tests or build commands immediately.
- If it fails, fix and retry (looping).

---

## Output Format

The Agent should confirm completion with a concise summary:

```markdown
### 🚀 Task Complete

**Changes applied**:
- Updated `useAuth` hook to handle token expiry.
- Modified `LoginPage` to show error.

**Verification**:
- Build passed.
- Manual verification required for UI behavior.
```
