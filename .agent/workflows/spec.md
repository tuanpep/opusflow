---
description: Create a feature specification before writing any code
---

# Spec Workflow

Create a high-level feature specification (SPEC.md) that defines WHAT to build before worrying about HOW.

## When to Use

- Starting a new feature that needs requirements gathering
- Complex features requiring stakeholder alignment
- Features with unclear scope that need clarification
- Before jumping into a Plan workflow

---

## The Architect Mindset

> "The Architect focuses on WHAT, not HOW."

**DO:**
- Define clear requirements
- Document edge cases
- Identify constraints
- List success criteria

**DON'T:**
- Write any code
- Suggest specific implementations
- Skip to the "how"

---

## The 4-Step Process

### Step 1: Create Spec

```bash
opusflow spec "Your feature description"
```

This generates a SPEC.md template with:
- Goal section
- User stories
- Functional/Non-functional requirements
- Architecture constraints
- Edge cases
- Success criteria
- Codebase context (auto-generated)

### Step 2: Complete the Spec

Fill in all `[TODO]` sections. Be thorough about:

| Section | Key Question |
|---------|--------------|
| **Goal** | What problem are we solving and why? |
| **User Stories** | Who benefits and how? |
| **Requirements** | What MUST the system do? |
| **Constraints** | What patterns/services must we use? |
| **Edge Cases** | What could go wrong? |
| **Success Criteria** | How do we know we're done? |

### Step 3: Review & Approve

Get stakeholder approval on the spec before proceeding.

**Approval Checklist:**
- [ ] All requirements are clear and testable
- [ ] Edge cases are comprehensive
- [ ] Success criteria are measurable
- [ ] No implementation details leaked in

### Step 4: Create Plan

Once the spec is approved, create an implementation plan:

```bash
opusflow plan "Feature title based on spec"
```

Reference the SPEC.md in the plan's Pre-requisites section.

---

## AI Assistance

Generate a prompt to help an AI complete the spec:

```bash
opusflow spec prompt path/to/spec.md
```

This creates a specialized prompt that instructs the AI to:
- Complete all TODO sections
- Focus only on WHAT, not HOW
- Be thorough with edge cases
- Define testable requirements

---

## Output Location

Specs are saved to: `opusflow-planning/specs/spec-[date]-[title].md`

---

## Quality Checklist

Before considering a spec complete:

- [ ] Goal clearly states the problem and value
- [ ] At least 3 specific user stories
- [ ] All functional requirements are testable
- [ ] Non-functional requirements have numbers
- [ ] Architecture constraints reference existing code
- [ ] Edge cases cover error scenarios
- [ ] Success criteria are measurable
- [ ] Out of scope items are listed
- [ ] No code or implementation details included
