---
description: Verify implementation against the plan and generate actionable fix comments
---

# Verification Workflow

Verify that the agent's implementation meets requirements and follows the original plan. Generate actionable review comments for iterative improvements.

## When to Use

- After a coding agent completes implementation of a **plan**
- Before merging a pull request that followed a spec
- When validating against specific requirements

**Note**: This is different from **Review**, which is a general code quality check.

---

## Verification Process

1. **Load Context**: Read the original implementation plan
2. **Analyze Changes**: Compare what was implemented vs what was planned
3. **Generate Comments**: Categorize issues by severity
4. **Iterate**: Fix issues and re-verify

---

## Verification Checklist

| Check | Question |
|-------|----------|
| **Plan Adherence** | Did implementation follow the plan exactly? |
| **Correctness** | Does code compile? Are types correct? |
| **Completeness** | Are all planned changes implemented? |
| **Integration** | Do new functions call dependencies correctly? |
| **Edge Cases** | Nil checks, empty lists, error handling? |
| **Security** | No hardcoded secrets? Inputs validated? |

---

## Comment Categories

| Category | Icon | Priority | Description |
|----------|------|----------|-------------|
| **Critical** | 🔴 | P0 | Blocks core functionality, must fix first |
| **Major** | 🟠 | P1 | Significant issues affecting behavior/UX |
| **Minor** | 🟡 | P2 | Polish items, style improvements |
| **Outdated** | ⚪ | - | No longer relevant due to code changes |

---

## Output Format

### If Issues Found

```markdown
I have the following verification comments after thorough review.
Implement the comments by following the instructions verbatim.

---

## 🔴 Critical: [Issue Title]

**Issue**: [Description of what is wrong]

**Plan Reference**: [Which part of the plan was not followed]

**Fix**: [Explicit instructions on how to fix]

**Files**:
- `/path/to/file1.ext`
- `/path/to/file2.ext`

---

## 🟠 Major: [Issue Title]

**Issue**: [Description of what is wrong]

**Plan Reference**: [Which part of the plan was not followed]

**Fix**: [Explicit instructions on how to fix]

**Files**:
- `/path/to/file.ext`

---

## 🟡 Minor: [Issue Title]

**Issue**: [Description of what is wrong]

**Fix**: [Explicit instructions on how to fix]

**Files**:
- `/path/to/file.ext`

---

## ⚪ Outdated: [Previous Issue Title]

**Status**: This comment is no longer relevant.

**Reason**: [Why it's outdated - e.g., "Fixed in latest commit" or "Code was refactored"]

---
```

### If No Issues

```markdown
✅ Verification Passed. No issues found.

All changes adhere to the implementation plan.
```

---

## Verification Options

| Option | When to Use |
|--------|-------------|
| **Re-verify** | After fixes, focused check on previously identified issues (faster) |
| **Fresh Verification** | Full re-analysis ignoring previous comments |

---

## Fixing Comments

Priority order for fixing:

1. **🔴 Critical first**: These block core functionality
2. **🟠 Then Major**: Significant behavior issues
3. **🟡 Then Minor**: Polish and cleanup
4. **Re-verify**: Confirm all issues resolved

---

## Quality Guidelines

| Rule | Description |
|------|-------------|
| **Be Specific** | "Add nil check on line 42" not "Add error handling" |
| **Be Direct** | Instructions are orders, not suggestions |
| **Reference Plan** | Cite which plan step was violated |
| **Use Absolute Paths** | Always use full file paths |
| **Focus on Plan** | Only flag issues that violate the plan |
