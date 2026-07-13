---
name: engineering-postmortem
description: Use this skill after a fixed and validated bug when the task asks for RCA, postmortem, root cause analysis, document this fix, close out a bug, or engineering write-up. Requires reliable repro, known root cause, identified fix, and validated fix. Do not use for unresolved bugs, incidents/outages, or speculative hypotheses.
---

# Engineering Postmortem

This skill writes the canonical engineering record of a fixed bug: symptom, root cause mechanism, why the symptom occurred, fix, validation, why it slipped through, and follow-ups.

This is engineer-to-engineer. Code identifiers, file paths, function names, test names, commits, PRs, config keys, data IDs, and line references are first-class evidence.

## Trigger

Use this skill when:

- user says `/post-mortem`
- user asks for postmortem / RCA / root cause analysis
- user asks to document a fix
- user asks to close out a bug with a write-up
- debugging session has landed and validated a real fix

## Do not use when

- Bug is not fixed.
- Fix is not validated.
- Root cause is still a hypothesis.
- Repro is unknown or unproven.
- Customer-visible outage / incident requires incident report instead.
- Change is trivial and PR description is sufficient.

## Required inputs

Refuse to draft unless all four exist:

- [ ] Reliable repro exists.
- [ ] Root cause is known as a mechanism, not a guess.
- [ ] Fix is identified: PR / commit / branch / patch.
- [ ] Fix is validated: original repro now passes or failing workload succeeds.

If any input is missing, list missing inputs and stop.

## Destination

Default destination:

```text
docs/postmortems/<ticket-or-module>-<YYYYMMDD>.md
```

Other valid destinations:

- PR description
- ticket/Jira/Linear comment
- internal wiki
- `TASK_LOG.md` for small internal bugs

Do not post to an external system without explicit approval.

## Structure

Use this order:

1. Summary
2. Symptom
3. Root cause
4. Why it produced the symptom
5. Fix
6. How it was found
7. Why it slipped through
8. Validation
9. Action items / follow-ups
10. Links / references

## Writing rules

- Mechanism over narrative.
- Blameless: describe gaps and systems, not personal fault.
- No hedging. State what is known and what is not known.
- Never invent root cause, owner, validation, action item, or ticket.
- State validation scope honestly.
- If only one config was validated, say so.
- Include prior failed fix attempts when relevant.
- Action items need owner and tracking artifact. If no action item is warranted, say so.

## Relationship to debugging-discipline

If `debugging-discipline` was used, pull from:

- repro steps
- debug ledger
- hypothesis matrix
- accepted cause
- validation results

If no debug ledger exists, ask for the missing facts rather than reconstructing from memory.

## Completion checklist

Before finalizing:

- [ ] Summary is understandable to an engineer who reads only that paragraph.
- [ ] Root cause names concrete code/config/data mechanism.
- [ ] Fix explains why it addresses root cause, not only symptom.
- [ ] Validation includes original repro.
- [ ] Why slipped through identifies test/process/workload/review gap.
- [ ] Follow-ups are concrete with owner/tracking, or explicitly none.
- [ ] Validation scope is not overstated.
