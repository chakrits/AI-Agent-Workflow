# Postmortem Checklist

## Required Input Gate

- [ ] Reliable repro exists.
- [ ] Root cause is known.
- [ ] Fix is identified.
- [ ] Fix is validated.

## Content Gate

- [ ] Summary explains what broke and what fixed it.
- [ ] Symptom includes concrete evidence.
- [ ] Root cause names mechanism and code/config/data identifiers.
- [ ] Cause chain explains why the root cause produced the observed symptom.
- [ ] Fix explains why root cause is addressed.
- [ ] Debugging path includes decisive experiment.
- [ ] Slipped-through section is blameless and specific.
- [ ] Validation includes original repro.
- [ ] Validation scope is honest.
- [ ] Action items have owner and tracking artifact, or explicitly none.

## Anti-patterns

- [ ] No speculative root cause.
- [ ] No invented owner/PR/test run.
- [ ] No vague “system issue” wording.
- [ ] No blaming people.
- [ ] No claiming broader validation than evidence supports.
