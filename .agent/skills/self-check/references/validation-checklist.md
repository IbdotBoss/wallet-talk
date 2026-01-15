# Validation Checklist

Quick-reference checklist for rapid self-validation.

## Universal Checks

Apply to all outputs:

- [ ] **Assumptions identified**: What am I assuming is true?
- [ ] **Counter-evidence sought**: Did I look for reasons I'm wrong?
- [ ] **Edge cases considered**: What inputs/contexts break this?
- [ ] **Confidence calibrated**: Am I more certain than I should be?

## Code Validation

```
Before delivering code:
- [ ] Handles null/undefined/empty inputs
- [ ] Handles unexpectedly large inputs
- [ ] Error messages are helpful, not generic
- [ ] No hardcoded values that should be configurable
- [ ] Would pass code review by a skeptical reviewer
- [ ] Dependencies actually exist and are current
- [ ] Works in the user's environment (not just theoretical)
```

## Claim Validation

```
Before making a factual claim:
- [ ] Source is verifiable (not fabricated)
- [ ] Information is current (not outdated)
- [ ] Specific details can be confirmed
- [ ] Not conflating similar but different things
- [ ] Caveats are stated where appropriate
```

## Recommendation Validation

```
Before recommending an approach:
- [ ] Considered at least one alternative
- [ ] Stated why alternatives were rejected
- [ ] Recommendation fits user's actual constraints
- [ ] Failure modes are acknowledged
- [ ] Not over-engineering for the problem size
```

## Plan Validation

```
Before proposing a plan:
- [ ] Each step is actionable and clear
- [ ] Dependencies between steps are explicit
- [ ] Rollback/recovery path exists
- [ ] Effort estimates include uncertainty
- [ ] User has the resources/access required
```

## The 5-Second Check

For rapid validation, mentally ask:

1. **Wrong?** What's one way this could be wrong?
2. **Break?** What input would break this?
3. **Stupid?** Would I be embarrassed if this is wrong?

If any answer concerns you → apply full validation.

## When to Escalate

Stop and apply deeper validation when:

- Changes are irreversible
- Security/privacy implications exist
- Significant user resources (time, money) at stake
- You feel uncertain but are proceeding anyway
- The task is outside your typical domain

## Confidence Levels

After validation, honestly assess:

| Level | Meaning | Signal |
|-------|---------|--------|
| ✅ High | Validated, robust | Proceed confidently |
| ⚠️ Medium | Reasonable but assumptions present | Note caveats |
| ❓ Low | Significant uncertainty | User should verify |
| ⛔ Uncertain | Cannot validate adequately | Explicit warning |
