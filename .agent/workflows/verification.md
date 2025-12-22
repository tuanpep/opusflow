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
3. **Verify Success Criteria**: Check all measurable criteria from the plan
4. **Generate Comments**: Categorize issues by severity
5. **Iterate**: Fix issues and re-verify

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
| **Testing** | Are all specified test cases implemented? |
| **Success Criteria** | Do all criteria from the plan pass? |

---

## Verification Steps

### Step 1: Load Plan Context

Read the original plan file and identify:
- All Implementation Steps (Step 1, Step 2, etc.)
- Expected files to be created/modified
- Symbol references and signatures
- Success criteria

### Step 2: Check Each Implementation Step

For each step in the plan:

| Check | Verification |
|-------|--------------|
| **File exists** | Verify file was created/updated at the specified path |
| **Functions exist** | Verify all listed functions exist with correct signatures |
| **Logic matches** | Verify implementation details were followed |
| **Symbol references** | Verify correct types/functions are used |
| **Error handling** | Verify error cases are handled as specified |

### Step 3: Run Verification Commands

Execute the success criteria from the plan:

```bash
# Build verification
go build ./...

# Test verification  
go test ./... -v

# Lint verification
golangci-lint run

# Coverage check (if specified)
go test ./... -coverprofile=coverage.out
```

### Step 4: Generate Verification Report

Document findings using the output format below.

---

## Output Format

Generate verification comments in a structured, actionable format. Each comment should be numbered sequentially and separated by horizontal rules (`---`).

### Comment Structure

Each comment MUST follow this exact format:

```markdown
---
## Comment N: [Issue title describing the problem and its consequence]

[Detailed instructions on what to fix, written as direct commands. Be specific about:
- Which files to modify
- What exact changes to make
- Why the change is needed
- How to align with the plan or backend contracts]

### Referred Files
- /absolute/path/to/file1.ext
- /absolute/path/to/file2.ext
- /absolute/path/to/file3.ext
```

### Output File Format

Save verification comments to a new file in the `opusflow-planning/verifications/` directory (relative to project root) with the naming pattern:
`verify-[feature-name]-[YYYY-MM-DD].md`

### Complete Output Example

```markdown
# Verification Comments: [Plan Name]

**Plan Reference**: `/path/to/plan-XX-name.md`
**Verified At**: YYYY-MM-DD HH:MM
**Status**: ⚠️ Issues Found

I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
## Comment 1: [Concise issue title stating problem and consequence]

[Detailed paragraph explaining the issue and providing step-by-step fix instructions. 
Be very specific about what needs to change, which files to modify, and how the 
changes should align with backend APIs or the original plan. Use imperative voice 
and provide concrete examples where helpful.]

### Referred Files
- /absolute/path/to/file1.ext
- /absolute/path/to/file2.ext

---
## Comment 2: [Another issue title with consequence]

[Detailed instructions for this issue. Reference specific functions, variables, 
or API endpoints. Explain what the current code does wrong and what it should 
do instead. Include code examples if helpful.]

### Referred Files
- /absolute/path/to/file3.ext
- /absolute/path/to/file4.ext

---
## Comment 3: [Third issue with clear consequence]

[Continue with more detailed instructions...]

### Referred Files
- /absolute/path/to/file5.ext

---

this is structure expected when verifying [workflow-reference]
```

### If No Issues Found

```markdown
# Verification Report: [Plan Name]

**Plan Reference**: `/path/to/plan-XX-name.md`
**Verified At**: YYYY-MM-DD HH:MM
**Status**: ✅ Verification Passed

All implementation steps verified successfully. The code:
- Follows the plan exactly as specified
- Integrates correctly with backend APIs
- Handles errors appropriately
- Includes proper type definitions
- Has no contract mismatches

Ready for deployment.
```

---

## Verification Approach

**When to use Fresh Verification:**
- First verification after plan implementation
- After major refactoring
- When prior comments may be outdated

**When to use Re-verification:**
- After implementing all verification comments
- To confirm specific fixes
- Quick validation that issues are resolved

## Implementing Verification Comments

When you receive verification comments, implement them in order:

**Implementation Prompt:**
```
I have the following verification comments after thorough review and exploration 
of the codebase. Implement the comments by following the instructions in the 
comments verbatim.

[Paste all verification comments here]
```

**Key Instructions:**
1. **Trust the comments** - They are written after thorough exploration
2. **Follow verbatim** - Don't re-verify or second-guess the instructions
3. **Go in order** - Implement Comment 1, then Comment 2, then Comment 3, etc.
4. **Use referred files** - The file paths are verified and correct
5. **Be precise** - Match the exact changes requested

**After implementation:**
```
I have implemented all verification comments. Please re-verify to confirm 
all issues are resolved.
```

---

## Quality Guidelines for Verification Comments

| Rule | Description |
|------|-------------|
| **Clear Title** | Issue title must state both the problem AND the consequence |
| **Direct Instructions** | Write as commands, not suggestions. Use imperative voice. |
| **Specific File Paths** | Always use absolute paths to all affected files |
| **Actionable Details** | Include specific function names, variable names, API endpoints |
| **Backend Alignment** | Reference actual backend API contracts from swagger/docs |
| **No Assumptions** | Only flag issues confirmed through code exploration |
| **Provide Context** | Explain WHY the change is needed, not just WHAT to change |
| **Complete List** | Include ALL files that need to be modified |

---

## Re-verification After Fixes

After implementing all comments, run a fresh verification:

**Re-verification Checklist:**
- [ ] All comments have been implemented
- [ ] All referred files have been modified as instructed  
- [ ] Code compiles without errors
- [ ] No new issues introduced
- [ ] Ready for fresh verification pass

**Re-verification Prompt:**
```
All verification comments have been implemented. Run a fresh verification pass 
on [plan-name] to confirm all issues are resolved.
```
