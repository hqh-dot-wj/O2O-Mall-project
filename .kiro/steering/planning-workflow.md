---
inclusion: manual
---

# Planning Workflow (Manus-Style)

This steering file implements the Manus-style persistent markdown planning pattern — the workflow that helped Manus reach $2B valuation.

## Core Principle

**Context Window = RAM (volatile, limited)**  
**Filesystem = Disk (persistent, unlimited)**

→ Anything important gets written to disk.

## When to Use Planning

Use this pattern for:
- Multi-step tasks (3+ steps)
- Research tasks
- Building/creating projects
- Tasks spanning many tool calls

Skip for:
- Simple questions
- Single-file edits
- Quick lookups

## The 3-File Pattern

For every complex task, create THREE files in project root:

```
task_plan.md      → Track phases and progress
findings.md       → Store research and findings
progress.md       → Session log and test results
```

## Quick Start

1. **Create Planning Files** (use init script or manual):
   ```bash
   # Bash
   bash .kiro/scripts/init-session.sh
   
   # PowerShell
   powershell -ExecutionPolicy Bypass -File .kiro/scripts/init-session.ps1
   ```

2. **Fill task_plan.md** with phases and checkboxes

3. **Work through phases**, updating:
   - `task_plan.md` - Check off completed phases
   - `findings.md` - Store research and discoveries
   - `progress.md` - Log actions, errors, and test results

4. **Before major decisions**: Re-read `task_plan.md`

5. **After research**: Update `findings.md` (2-Action Rule)

6. **On errors**: Log in `progress.md` with attempt count

## The Manus Principles

| Principle | Implementation |
|-----------|----------------|
| Filesystem as memory | Store in files, not context |
| Attention manipulation | Re-read plan before decisions |
| Error persistence | Log failures in plan file |
| Goal tracking | Checkboxes show progress |
| Completion verification | Check all phases complete |

## File Purposes

### task_plan.md
- **Purpose**: Track phases and progress
- **Update**: After completing each phase
- **Contains**: Checkboxes, phase descriptions, current status

### findings.md
- **Purpose**: Store research and discoveries
- **Update**: After every 2 view/browser operations (2-Action Rule)
- **Contains**: API docs, code analysis, architecture notes

### progress.md
- **Purpose**: Session log and error tracking
- **Update**: After actions, especially errors
- **Contains**: Commands run, test results, error logs with attempt counts

## Critical Rules

1. **Create Plan First** — Never start without `task_plan.md`
2. **The 2-Action Rule** — Save findings after every 2 view/browser operations
3. **Log ALL Errors** — They help avoid repetition
4. **Never Repeat Failures** — Track attempts, mutate approach
5. **Re-read Before Decisions** — Check plan before major tool use
6. **Verify Completion** — All checkboxes must be checked

## Error Protocol (3-Strike Rule)

When an error occurs:

1. **First attempt**: Log error in `progress.md`, try fix
2. **Second attempt**: Log again with "Attempt 2", different approach
3. **Third attempt**: Log "Attempt 3", ask user for guidance

**Never** attempt the same failing approach more than 3 times.

## Workflow Diagram

```
Start Task
    ↓
Create 3 Files (task_plan.md, findings.md, progress.md)
    ↓
Read task_plan.md
    ↓
Execute Phase
    ↓
Research? → Update findings.md (2-Action Rule)
    ↓
Error? → Log in progress.md (3-Strike Rule)
    ↓
Phase Complete? → Check off in task_plan.md
    ↓
All Phases Done? → Verify completion
    ↓
Done
```

## Helper Scripts

```bash
# Initialize planning files
bash .kiro/scripts/init-session.sh

# Verify all phases complete
bash .kiro/scripts/check-complete.sh
```

## Example Usage

**User**: "Build a REST API with authentication"

**Agent**:
1. Creates `task_plan.md` with phases:
   ```markdown
   - [ ] Phase 1: Setup project structure
   - [ ] Phase 2: Implement auth endpoints
   - [ ] Phase 3: Add middleware
   - [ ] Phase 4: Write tests
   ```

2. Works through each phase, updating files:
   - Research API patterns → `findings.md`
   - Run tests → `progress.md`
   - Complete phase → Check off in `task_plan.md`

3. On error:
   - Logs in `progress.md`: "Attempt 1: Auth middleware failed - missing secret"
   - Fixes and continues
   - If fails again: "Attempt 2: Different approach - env variable"

4. Before finishing: Verifies all checkboxes in `task_plan.md` are checked

## Benefits

- **No goal drift**: Plan file keeps focus
- **Error learning**: Logged failures prevent repetition
- **Context efficiency**: Files store info, not context window
- **Progress visibility**: Checkboxes show status
- **Session recovery**: Files persist across context resets
