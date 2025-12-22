package templates

const PlanTemplate = `Follow the below plan verbatim. Trust the files and references.
Do not re-verify what's written in the plan.

## Goal
{{ .Goal }}

## User Review Required
> [!IMPORTANT]
> Critical items requiring user attention before proceeding.

- **Breaking Changes**: None
- **Risks**: None

## Pre-requisites
- **Dependencies**: {{ .Dependencies }}
- **Prior Context**: {{ .Context }}
- **Environment**: {{ .Environment }}

## Observations
- **Current State**:
- **Missing Components**:

## Proposed Changes

### [Component Name]
#### [MODIFY | NEW] [File Name]
- **Reason**: [Why this change is needed]
- **Complexity**: [Low/Medium/High]

## Implementation Steps

### Step 1: [Step Title]
**File**: ` + "`" + `[Absolute Path]` + "`" + `
**Action**: [Create/Update/Delete]

**Description**:
[Detailed description of what to do]

**Changes**:
- ` + "`" + `[Symbol]` + "`" + `: [Description]

**Verification**:
- [ ] Automated: ` + "`" + `[Command]` + "`" + `
- [ ] Manual: [Steps]

---
(Repeat for other steps)
---

## Success Criteria
- [ ] Build passes: ` + "`" + `go build ./...` + "`" + `
- [ ] Tests pass: ` + "`" + `go test ./...` + "`" + `
`
