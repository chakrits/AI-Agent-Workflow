---
name: verification-before-completion
description: Use this skill before saying work is done, fixed, ready for QA, ready for review, or ready for release. It forces evidence-based completion: commands run, tests passed, artifacts updated, risks stated, and validation scope made explicit. Do not use to perform the implementation itself.
---

# Verification Before Completion Skill

Do not claim completion without evidence.

## When to use

Use before stating:

- Done.
- Fixed.
- Completed.
- Ready for QA.
- Ready for review.
- Ready for release.
- Verified.

## Do not use when

- The task has not reached a completion boundary.
- You are still debugging.
- You have no ability to run checks and have not clearly stated that limitation.

## Process

1. Identify the completion claim.
2. List required evidence.
3. Run or reference relevant verification commands.
4. Check artifact updates.
5. Check quality gates.
6. State validation scope honestly.
7. List residual risks and next steps.

## Evidence hierarchy

Prefer:

1. Tests actually run in this session.
2. Logs/build output from this session.
3. Existing CI result link.
4. Static reasoning only when execution is not available, explicitly labeled.

## Completion rules

- Never say tests passed if they were not run.
- Never imply full regression if only one path was checked.
- If verification cannot be run, say exactly what was not verified.
- If security-sensitive behavior changed, require security review before completion.
- If QA handoff is required, produce handoff evidence.

## Output

Use `templates/COMPLETION_CHECK.md`.
