---
inclusion: manual
---

# Planning Rules (Critical)

These are the critical rules that MUST be followed when using the planning workflow.

## Mandatory Rules

### 1. Create Plan First
**NEVER start a complex task without creating `task_plan.md` first.**

Bad:
```
User: "Build a REST API"
Agent: *starts coding immediately*
```

Good:
```
User: "Build a REST API"
Agent: *creates task_plan.md with phases*
Agent: *then starts Phase 1*
```

### 2. The 2-Action Rule
**After every 2 view/browser/research operations, update `findings.md`.**

Why: Prevents context stuffing. Research goes to disk, not memory.

Example:
```
Action 1: Read API docs
Action 2: View example code
→ Update findings.md with summary
```

### 3. Log ALL Errors
**Every error must be logged in `progress.md` with attempt count.**

Format:
```markdown
## Error Log

### [Timestamp] Error Name
- **Attempt**: 1
- **Error**: Description of what failed
- **Context**: What was being attempted
- **Next Step**: What will be tried next
```

### 4. Never Repeat Failures (3-Strike Rule)
**Track attempts. After 3 failures, ask user for guidance.**

```
Attempt 1: Try approach A → Fails → Log
Attempt 2: Try approach B → Fails → Log
Attempt 3: Try approach C → Fails → Log
→ Ask user for guidance, don't attempt 4th time
```

### 5. Re-read Before Major Decisions
**Before using major tools (write, delete, execute), re-read `task_plan.md`.**

Prevents:
- Working on wrong phase
- Forgetting original goal
- Skipping required steps

### 6. Verify Completion
**Before marking task complete, verify ALL checkboxes in `task_plan.md` are checked.**

Don't:
```markdown
- [x] Phase 1
- [ ] Phase 2  ← Not done!
- [x] Phase 3
```

## File Update Triggers

| Trigger | File to Update | What to Write |
|---------|----------------|---------------|
| Complete a phase | `task_plan.md` | Check off the checkbox |
| Research/view docs | `findings.md` | Summary of findings (2-Action Rule) |
| Run command/test | `progress.md` | Command + output |
| Error occurs | `progress.md` | Error log with attempt count |
| Change approach | `task_plan.md` | Update phase description |

## Error Protocol Details

### Attempt 1
```markdown
## Error: Authentication Failed
- **Attempt**: 1
- **Error**: JWT secret not found in env
- **Next**: Add JWT_SECRET to .env file
```

### Attempt 2
```markdown
## Error: Authentication Failed
- **Attempt**: 2
- **Previous**: Added JWT_SECRET to .env
- **Error**: Still failing - env not loaded
- **Next**: Check dotenv configuration
```

### Attempt 3
```markdown
## Error: Authentication Failed
- **Attempt**: 3
- **Previous**: Fixed dotenv, still failing
- **Error**: Secret format incorrect
- **Next**: Ask user for guidance on JWT configuration
```

**→ Stop and ask user**

## When to Skip Planning

Planning is NOT needed for:

1. **Simple questions**: "What does this function do?"
2. **Single-file edits**: "Fix typo in README"
3. **Quick lookups**: "Show me the API endpoint"
4. **Trivial tasks**: "Add a comment"

Planning IS needed for:

1. **Multi-step tasks**: "Build authentication system"
2. **Research tasks**: "Find best approach for caching"
3. **Complex features**: "Implement payment processing"
4. **Debugging**: "Fix failing tests across multiple files"

## File Naming (Strict)

Files MUST be named exactly:
- `task_plan.md` (not `plan.md`, `task.md`, etc.)
- `findings.md` (not `research.md`, `notes.md`, etc.)
- `progress.md` (not `log.md`, `session.md`, etc.)

Location: **Project root** (not in `.kiro/` or subdirectories)

## Checkpoint Verification

Before marking task complete, verify:

- [ ] All phases in `task_plan.md` are checked
- [ ] `findings.md` contains all research
- [ ] `progress.md` logs all major actions
- [ ] No unresolved errors in `progress.md`
- [ ] Original goal from task description is met

## Common Mistakes to Avoid

### ❌ Don't: Store everything in context
```
Agent: *reads 10 files, keeps all in memory*
Agent: *context fills up, forgets original goal*
```

### ✅ Do: Store in findings.md
```
Agent: *reads file 1, summarizes in findings.md*
Agent: *reads file 2, adds to findings.md*
Agent: *context stays clean, findings persist*
```

### ❌ Don't: Ignore errors
```
Error occurs → Agent tries same thing again → Fails again
```

### ✅ Do: Log and adapt
```
Error occurs → Log in progress.md → Try different approach
```

### ❌ Don't: Skip phases
```
task_plan.md:
- [ ] Phase 1: Setup
- [ ] Phase 2: Implementation
- [ ] Phase 3: Testing

Agent: *jumps to Phase 3 without doing Phase 1*
```

### ✅ Do: Follow order
```
Agent: *completes Phase 1, checks it off*
Agent: *then moves to Phase 2*
```

## Integration with Kiro

These planning files work alongside Kiro's steering system:

- **Steering files** (`.kiro/steering/`): Persistent project knowledge
- **Planning files** (project root): Task-specific progress tracking

Use both:
- Steering → Project conventions, patterns, standards
- Planning → Current task phases, findings, progress
