# Counter-Patterns Reference

Detailed catalog of reasoning flaws and how to detect them.

## Logical Fallacies

### Structural Fallacies

**Non sequitur**: Conclusion doesn't follow from premises
- Detection: Ask "Does B actually follow from A?"
- Example flaw: "This function is fast, so it's reliable"

**Circular reasoning**: Conclusion is assumed in the premise
- Detection: Trace the logic back—does it loop?
- Example flaw: "This is the best approach because it's optimal"

**False dichotomy**: Presenting only two options when more exist
- Detection: Ask "What other options exist?"
- Example flaw: "Either we use a database or store in memory" (what about file storage, cache, etc.?)

### Evidence Fallacies

**Hasty generalization**: Drawing broad conclusions from limited examples
- Detection: Ask "Is my sample size sufficient?"
- Example flaw: "This pattern worked in one project, so it works everywhere"

**Cherry picking**: Selecting only supporting evidence
- Detection: Ask "What evidence did I ignore?"
- Example flaw: Citing only successful uses of a library, ignoring failures

**Appeal to authority/familiarity**: Using popularity or authority instead of merit
- Detection: Ask "Is this actually better, or just more familiar?"
- Example flaw: "Everyone uses this framework" (popularity ≠ suitability)

## AI-Specific Anti-Patterns

### Pattern Matching Errors

**Template fitting**: Forcing a solution into a familiar template
- Symptom: Solution feels "off" but technically complete
- Counter: Ask "Am I using this pattern because it fits, or because it's familiar?"

**Context confusion**: Applying knowledge from wrong domain
- Symptom: Technically correct but contextually wrong
- Counter: Verify the specific domain requirements

**Recency bias**: Over-weighting recently seen patterns
- Symptom: Solution mirrors recent conversation too closely
- Counter: Consider what you'd suggest with fresh context

### Confidence Errors

**Hallucination hedging**: Stating uncertain things confidently
- Symptom: Specific details without verification
- Counter: If you can't verify it, caveat it

**False precision**: Giving specific numbers/details without basis
- Symptom: "This will take exactly 3 days" or "95% of users prefer..."
- Counter: Distinguish estimation from measurement

**Explanation fabrication**: Making up reasons for correct answers
- Symptom: Plausible but unverified reasoning chains
- Counter: Verify causal claims, not just outcomes

## Self-Deception Patterns

### Motivated Reasoning

**Commitment escalation**: Defending previous statements too strongly
- Symptom: Reluctance to change course after initial approach
- Counter: Actively consider "What if I started fresh?"

**Completion bias**: Rushing to finish rather than getting it right
- Symptom: Glossing over hard parts
- Counter: Identify the hardest part and focus there

**Sunk cost thinking**: Keeping flawed work because of effort invested
- Symptom: "I've already done X, so..."
- Counter: Ask "If I started now, would I do this?"

### Assumption Blindness

**Implicit assumptions**: Not recognizing unstated premises
- Detection: Force explicit listing of all assumptions
- Example: Assuming the user has certain tools installed

**Domain leakage**: Applying rules from one domain to another
- Detection: Verify rules apply in this specific context
- Example: Applying web conventions to CLI tools

**Happy path thinking**: Only considering success scenarios
- Detection: Explicitly enumerate failure modes
- Example: Not considering network failures, invalid inputs

## Red Team Prompts

Use these prompts to attack your own outputs:

1. "What would a hostile code reviewer say about this?"
2. "How would this break in production at 3 AM?"
3. "What would someone with 10x more context point out?"
4. "What am I assuming the user knows that they might not?"
5. "What's the laziest interpretation of this output?"
6. "If I'm wrong, what's the cost?"
