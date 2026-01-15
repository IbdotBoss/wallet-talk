---
name: self-check
description: Adversarial self-validation skill for verifying outputs before delivery. Applies systematic counter-argument challenges including "why is this wrong", "prove this is incorrect", and "why doesn't this make sense" to catch logical flaws, unfounded assumptions, and errors. Use when generating code, making claims, proposing solutions, or producing any output that benefits from validation.
---

# Self-Check

Apply adversarial validation to outputs before delivery. Challenge every assertion to catch errors before they reach the user.

## Core Philosophy

**Default assumption:** Your first answer is probably flawed. Actively try to break it.

Do not defend your output—attack it. Look for the weakest points and exploit them ruthlessly.

## The Three Challenges

Apply these challenges to every significant output:

### 1. "Why is this wrong?"

Actively seek flaws in your reasoning:

- What assumptions did you make?
- Which assumptions could be false?
- What evidence would contradict this?
- Are you pattern-matching to a similar but different situation?

### 2. "Prove this is incorrect"

Find counter-evidence and edge cases:

- What inputs would break this?
- What context would make this advice harmful?
- Find at least one scenario where this fails
- If you can't find a flaw, you haven't looked hard enough

### 3. "Why doesn't this make sense?"

Challenge coherence and internal logic:

- Does the conclusion follow from the premises?
- Are there contradictions within the output?
- Would a skeptical expert accept this reasoning?
- Is this too convenient or too clean?

## Validation Workflow

```
Validation Loop:
- [ ] State initial output/conclusion
- [ ] Apply Challenge 1: "Why is this wrong?"
- [ ] Apply Challenge 2: "Prove this is incorrect"
- [ ] Apply Challenge 3: "Why doesn't this make sense?"
- [ ] Document discovered flaws
- [ ] Revise output based on findings
- [ ] Re-validate revised output (if significant changes)
- [ ] Deliver output with confidence assessment
```

## Validation Depth by Stakes

**Low stakes** (simple tasks, reversible actions):
- Quick mental check of the three challenges
- Note any obvious issues
- Proceed if no major flaws found

**Medium stakes** (code changes, technical recommendations):
- Explicit walkthrough of all three challenges
- Document at least one potential flaw considered
- State confidence level in output

**High stakes** (architecture decisions, security-critical, irreversible):
- Full written validation loop
- Red team your own solution
- Explicitly state assumptions and their risk
- Propose alternative approaches you rejected (and why)
- Request user validation before proceeding

## Common Failure Patterns

Watch for these self-deception patterns:

| Pattern | Symptom | Counter |
|---------|---------|---------|
| **Confirmation bias** | You only found evidence supporting your conclusion | Actively search for contradicting evidence |
| **Overconfidence** | You feel certain without verification | Ask: "What would make me wrong?" |
| **Anchoring** | You're stuck on your first idea | Generate two alternative approaches first |
| **Availability bias** | You're using a recent/familiar pattern | Ask: "Is this actually the right pattern here?" |
| **Assumption blindness** | You're not questioning implicit premises | List every assumption explicitly |
| **Complexity hiding** | You're glossing over the hard parts | Identify the hardest part and zoom in |

For detailed patterns, see [counter-patterns.md](references/counter-patterns.md).

## Recovery Actions

When flaws are found:

1. **Minor flaw**: Acknowledge and correct in-line
2. **Significant flaw**: Revise approach, re-validate
3. **Fundamental flaw**: Stop, reassess the entire problem, may need user clarification
4. **Unfixable within constraints**: Be transparent about limitations

## Integration with Outputs

### For Code

```
Before finalizing code:
- [ ] Does this handle edge cases? (nulls, empty, large inputs)
- [ ] Does this fail gracefully?
- [ ] Would this code review well? What would a reviewer flag?
- [ ] Is this the simplest solution, or am I over-engineering?
```

### For Claims/Advice

```
Before stating a claim:
- [ ] What is the source of this knowledge?
- [ ] Is this outdated information?
- [ ] Am I conflating similar but different concepts?
- [ ] Would an expert in this domain agree?
```

### For Plans/Proposals

```
Before proposing a plan:
- [ ] What could go wrong at each step?
- [ ] What dependencies am I assuming exist?
- [ ] Is this plan robust to unexpected issues?
- [ ] Have I considered the user's actual constraints?
```

## Quick Reference

For rapid validation, use the checklist in [validation-checklist.md](references/validation-checklist.md).

## Confidence Signaling

After validation, signal confidence honestly:

- **High confidence**: Validated, no significant flaws found, approach is robust
- **Medium confidence**: Some assumptions present, validated approach but edge cases possible
- **Low confidence**: Significant uncertainty, user should verify independently
- **Uncertain**: Unable to validate adequately, explicit caveat required
