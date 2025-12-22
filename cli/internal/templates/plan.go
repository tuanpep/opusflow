package templates

const PlanTemplate = `Follow the below plan verbatim. Trust the files and references.
Do not re-verify what's written in the plan.

## Pre-requisites

- **Dependencies**: {{ .Dependencies }}
- **Prior Context**: {{ .Context }}
- **Environment**: {{ .Environment }}

## Observations

- **Current State**:
  - Existing files and their roles
  - Relevant database schemas or APIs
  - Patterns already in use (e.g., repository pattern, DI)
  
- **Missing Components**:
  - What needs to be created
  - What needs modification

- **Architecture**:
  - Key design patterns to follow
  - Integration points
  - Data flow overview

## Approach

- **Strategy**: {{ .Strategy }}
- **Key Decisions**: 
- **Risks/Considerations**: 

## Architecture Diagram (Optional)

` + "```mermaid" + `
flowchart LR
    A[Handler] --> B[Service]
    B --> C[Repository]
    C --> D[(Database)]
    B --> E[External Client]
` + "```" + `

## Implementation Steps

### Step 1: [Component] ([Language])

**File**: ` + "`" + `/absolute/path/to/file.ext` + "`" + `
**Action**: Create | Update

**Purpose**: Brief description of what this step accomplishes

**Changes:**
- ` + "`" + `FunctionName(args) -> return_type` + "`" + `: Description of function
- ` + "`" + `StructName` + "`" + `: Fields and purpose

**Implementation Details:**
1. Specific logic to implement
2. Error handling approach
3. Edge cases to handle
4. Validation requirements

**Symbol References:**
- Uses: ` + "`" + `ExistingType` + "`" + ` from ` + "`" + `pkg/types` + "`" + `
- Implements: ` + "`" + `InterfaceName` + "`" + ` from ` + "`" + `pkg/interfaces` + "`" + `

**Error Handling:**
- Handle: [specific error case] with [approach]

**Tests:**
- Unit test: ` + "`" + `TestFunctionName` + "`" + ` covering [scenarios]

---

### Step N: Integration & Wiring

**File**: ` + "`" + `/absolute/path/to/main.go` + "`" + `
**Action**: Update

**Purpose**: Wire all components together

**Verification:**
- Build: ` + "`" + `go build ./...` + "`" + `
- Lint: ` + "`" + `golangci-lint run` + "`" + `

---

### Step N+1: Testing

**File**: ` + "`" + `/absolute/path/to/file_test.go` + "`" + `
**Action**: Create

**Purpose**: Validate implementation

**Verification:**
- Run: ` + "`" + `go test ./... -v` + "`" + `

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| Build passes | ` + "`" + `go build ./...` + "`" + ` exits 0 |
| Tests pass | ` + "`" + `go test ./...` + "`" + ` exits 0 |
| Lint passes | ` + "`" + `golangci-lint run` + "`" + ` exits 0 |

## Execution Checklist

- [ ] All steps implemented in order
- [ ] All tests passing
- [ ] No lint errors
- [ ] Ready for verification
`
