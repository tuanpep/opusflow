---
description: Agentic code review with thorough exploration and analysis
---

# Review Workflow

Agentic code review with thorough exploration and analysis. Perfect for comprehensive code quality checks where you want deep insights into implementation details, potential issues, and improvement opportunities.

## When to Use

- Pull request code review
- General code quality assessment
- Security audit of new code
- Performance review before deployment

**Note**: This is different from **Verification**, which checks implementation against a specific plan.

---

## The 3-Step Process

### Step 1: User Query

Describe what you want reviewed with context:

| Context Type | Examples |
|--------------|----------|
| **Files** | Source files to review |
| **Folders** | Component directories, feature folders |
| **Git Diff** | Uncommitted changes, diff against main/branch/commit |

**Example Query:**
```
Review the changes in the latest commit for the authentication
handler. Focus on security and error handling.

Context:
- @services/identity-access/internal/handler/auth_handler.go
- Git diff against main
```

### Step 2: Comprehensive Code Review

Traycer performs deep analysis:

- **Deep code exploration** across files and dependencies
- **Implementation analysis** to understand context and impact
- **Categorized review comments** by type

### Step 3: Complete

Review findings with categorized comments ready for action.

---

## Review Comment Categories

| Category | Icon | Description |
|----------|------|-------------|
| **Bug** | 🐛 | Functional issues, logic errors, incorrect implementations |
| **Performance** | ⚡ | Bottlenecks, inefficiencies, optimization opportunities |
| **Security** | 🔒 | Vulnerabilities, unsafe practices, security risks |
| **Clarity** | 📝 | Readability, maintainability, documentation, style |

---

## Output Format

```markdown
I have the following review comments after thorough analysis.

---

## 🐛 Bug: [Issue Title]

**Issue**: [Description of the bug or logic error]

**Recommendation**: [How to fix it]

**Files**:
- `/path/to/file.ext` (line N)

---

## ⚡ Performance: [Issue Title]

**Issue**: [Description of the performance problem]

**Recommendation**: [Optimization approach]

**Impact**: [Expected improvement]

**Files**:
- `/path/to/file.ext`

---

## 🔒 Security: [Issue Title]

**Issue**: [Description of the security concern]

**Risk Level**: High | Medium | Low

**Recommendation**: [How to address it]

**Files**:
- `/path/to/file.ext`

---

## 📝 Clarity: [Issue Title]

**Issue**: [Description of readability/maintainability concern]

**Recommendation**: [Suggested improvement]

**Files**:
- `/path/to/file.ext`

---
```

---

## Fixing Review Comments

After review comments are generated:

1. **Fix individual comments**: Address specific issues one at a time
2. **Fix selected comments**: Choose multiple comments to fix together
3. **Fix all comments**: Send all review comments to your agent

---

## Review vs Verification

| Aspect | Review | Verification |
|--------|--------|--------------|
| **Purpose** | General code quality | Check against specific plan |
| **Trigger** | Any code review | After plan implementation |
| **Categories** | Bug, Performance, Security, Clarity | Critical, Major, Minor, Outdated |
| **Scope** | Broad quality assessment | Plan adherence check |
