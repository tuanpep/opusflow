---
description: Lightweight workflow for repetitive tasks, maintenance, and bulk updates
---

# Chore Workflow

Efficient workflow for repetitive tasks, maintenance, and bulk code updates. Perfect for lint fixes, type updates, dependency upgrades, or small refactors.

## When to Use

- Fixing lint errors across multiple files
- Upgrading a dependency
- Renaming variables or functions globally
- Adding type definitions
- Housekeeping tasks

## The 3-Step Process

### Step 1: User Query

Describe the chore with scope and constraints:

| Context Type | Notes |
|--------------|-------|
| **Scope** | Specific folders or files to target |
| **Goal** | specific error to fix or pattern to change |
| **Verification** | Command to run to verify success |

**Example Query:**
```
Fix all "unused variable" lint errors in the `src/components` directory.
Run `npm run lint` to verify.
```

### Step 2: Implementation (Batching)

The Agent should attempt to batch fixes, but MUST list the files and planned changes first.

1.  **Read & Analyze**: Identify all occurrences of the issue,
2.  **Plan**:
    ```markdown
    **Chore Plan:**
    - `/path/to/fileA.ts`: Remove unused `x` variable.
    - `/path/to/fileB.ts`: Remove unused `y` variable.
    ```
3.  **Execute Changes**: Apply fixes to multiple files in one turn if possible (using `multi_replace_file_content`).
4.  **Verify Loop**:
    *   Run the provided verification command (e.g., `npm run lint`).
    *   If it fails, read the output, and fix remaining issues immediately.
    *   Repeat until passing or blocked.

### Step 3: Completion

Once the verification command passes, the task is complete.

---

## Output Format

No formal plan file is required for chores. The Agent should output a summary of changes:

```markdown
### ✅ Chore Complete

**Summary**:
- Fixed 15 unused variable errors in 4 files.
- Ran `npm run lint` -> Passed.
```
