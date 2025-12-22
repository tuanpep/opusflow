# OpusFlow Example Use Case

This document demonstrates how to use **OpusFlow** to implement a real-world coding task using the **Task Workflow** (`workflows/task.md`). This example highlights the capabilities of the MCP server, including the newly added tools for file editing and command execution.

---

## Scenario: Implement a "Hello World" Utility

**Goal**: Add a simple string utility function `ReverseString` to the CLI codebase and write a test for it.

**Target File**: `cli/pkg/utils/strings.go` (New file)
**Test File**: `cli/pkg/utils/strings_test.go` (New file)

---

## Step 1: Initial User Prompt

The user starts with a potentially simple or vague request.

**User**: "Add string reverse"

---

## Step 2: Clarification & Confirmation

The Agent analyzes the request and asks specific questions to define the scope, files, and verification steps.

**Agent**:
> To ensure the plan is accurate, please confirm:
> 1. Target file: `cli/pkg/utils/strings.go`?
> 2. Include unit tests in `cli/pkg/utils/strings_test.go`?
> 3. Verify with `go test`?

**User**: "Yes, that's correct."

---

## Step 3: Refined Query (Input to OpusFlow)

The result of the confirmation becomes the **Refined Query** that is actually processed by the OpusFlow MCP tools. This is the "User Query" mentioned in the workflow files.

**Refined Query**:
> "Create `cli/pkg/utils/strings.go` with a `ReverseString` function and `cli/pkg/utils/strings_test.go` with unit tests. Verify by running `go test`."

---

## Step 4: Plan/Phase Generation

Using the **Refined Query**, the Agent now triggers the formal workflow (e.g., calling `create_plan` or creating the plan file in memory).

### 1. Context & Observation (Discovery)

The Agent explores the codebase to understand where to add the file.

**Tools Used**:
- `list_files(dir="cli")`: To see the directory structure.
- `read_file(path="cli/go.mod")`: To understand the module name (`github.com/ergonml/opusflow`).

### 2. File-Level Plan

The Agent creates a plan in its context (memory):

```markdown
**Plan:**
1.  **File**: `cli/pkg/utils/strings.go`
    *   **Action**: Create
    *   **Change**: Implement `ReverseString` function.
2.  **File**: `cli/pkg/utils/strings_test.go`
    *   **Action**: Create
    *   **Change**: Add `TestReverseString` table-driven test.
3.  **Verification**: `go test ./cli/pkg/utils/...`
```

### 3. Execution (Coding)

The Agent uses the **`write_file`** tool to create the implementation and test files.

**Tool Call 1**:
```json
{
  "name": "write_file",
  "arguments": {
    "path": "cli/pkg/utils/strings.go",
    "content": "package utils\n\nfunc ReverseString(s string) string {\n\tr := []rune(s)\n\tfor i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {\n\t\tr[i], r[j] = r[j], r[i]\n\t}\n\treturn string(r)\n}"
  }
}
```

**Tool Call 2**:
```json
{
  "name": "write_file",
  "arguments": {
    "path": "cli/pkg/utils/strings_test.go",
    "content": "package utils\n\nimport \"testing\"\n\nfunc TestReverseString(t *testing.T) {\n\tcases := []struct {\n\t\tin, want string\n\t}{\n\t\t{\"Hello\", \"olleH\"},\n\t\t{\"\", \"\"},\n\t\t{\"OpusFlow\", \"wolfSupO\"},\n\t}\n\tfor _, c := range cases {\n\t\tgot := ReverseString(c.in)\n\t\tif got != c.want {\n\t\t\tt.Errorf(\"ReverseString(%q) == %q, want %q\", c.in, got, c.want)\n\t\t}\n\t}\n}"
  }
}
```

### 4. Verification

The Agent executes the tests to ensure correctness using the **`run_command`** tool.

**Tool Call**:
```json
{
  "name": "run_command",
  "arguments": {
    "command": "go test ./cli/pkg/utils/..."
  }
}
```

**Result**:
```
ok      github.com/ergonml/opusflow/cli/pkg/utils    0.001s
```

---

## Step 3: Completion

The Agent reports back to the user:

> **🚀 Task Complete**
> 
> **Changes applied**:
> - Created `cli/pkg/utils/strings.go` with `ReverseString`.
> - Created `cli/pkg/utils/strings_test.go` with unit tests.
> 
> **Verification**:
> - Ran `go test` -> **Passed**.

---

## Why this works now?

Before the recent updates, the Agent would have failed at **Step 3** and **Step 4** because:
1.  It couldn't write the files (missing `write_file`).
2.  It couldn't run the tests (missing `run_command`).

With the updated MCP server, OpusFlow is now fully autonomous for these coding tasks.
