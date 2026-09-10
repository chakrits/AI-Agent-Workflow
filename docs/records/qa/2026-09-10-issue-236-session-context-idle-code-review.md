# AC-09 idle-state regression review

The AC-09 session-context test previously required `PROJECT_STATUS.md` to contain `Issue #`.
The documented closeout state is `None — awaiting next assignment.`, so the assertion now accepts either a numbered active Issue or the exact idle marker while continuing to reject an unrecognized value.

Verification: focused session-context tests and the full suite must pass on the candidate; `git diff --check` and `npm run validate:review-gate` are required. The pre-existing intermittent `validate-review-gate.test.mjs` cleanup failure remains Issue #244 evidence and is not changed here.
