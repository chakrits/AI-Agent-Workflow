# Issue #277 Package 1 — QA-277-001 Independent Code Review

| Field | Value |
|---|---|
| Work item | Issue #277 — Control-plane state integrity, Package 1 |
| Candidate | `feat/control-plane-state-integrity` at `c3d29e3` (`87967f3` implementation) |
| Reviewer | Independent Code Review Gate (GPT-5.6 Luna) |
| Decision | **PASS** |
| Scope | QA-277-001 remediation against SA addendum `521a018`; CR-001–CR-015 regression review |
| Rework | Additional cycle explicitly authorized by Human Maintainer on 2026-09-21 |

## Review basis

The review re-derived the changed durable state path in
`scripts/lib/task-state-machine.mjs` against the approved SA contract addendum,
AC-004/BR-001, TC-007 and TC-024b. The review also inspected the callers and the
new regression tests. Test counts were treated as supporting evidence only; the
decision is based on the source-level authority seam, negative cases and
preserved invariants.

## QA-277-001 verification

**Closed at the code-review gate.** The durable path validates the policy row in
`validatePolicyTransition()` before constructing a successor. It then uses the
module-private `transitionTaskStateWithPolicyEvidence()` constructor, which
disables only the matrix `requires` check. The exported
`transitionTaskState()` and `resumeTaskState()` wrappers force the historical
matrix-evidence behavior, so a direct pure caller cannot enable the durable
bypass through an option.

For `intake -> investigating`, the source-level path therefore accepts the
policy evidence `{ failure_description, repro }` after actor, source and
destination checks, without requiring `requirement_discovery` or `issue_ref`.
Missing policy keys and matrix-only evidence are rejected before the write.
The new TC-007 cases assert the positive path, the negative partitions, byte
identity and cleanup of admission/commit guards. TC-024b computes the policy
destination set and asserts every in-scope destination has a matrix counterpart.

## Preserved invariants

The review found no weakening of the following controls:

- actor canonicalization and `TRANSITION_MATRIX[from].actors` authorization;
- source/destination legality in the matrix and policy-row destination lookup;
- mandatory CAS and envelope digest validation;
- blocked-state human approval, resume target binding, `approver_id` and
  `resume_evidence` checks;
- generation re-read and commit-guard fencing before atomic durable write;
- failure-path byte identity and lock/guard cleanup covered by the new tests;
- previously reviewed CR-001–CR-015 archive, projection, journal, adoption and
  fencing behavior.

The private option is not exported and both public pure wrappers overwrite it
with `true`, preserving the compatibility contract described by the addendum.

## Verification performed

- `node --test test/task-state-machine.test.mjs` — **PASS**, 13/13.
- `npm test` — **PASS**, 785/785.
- `npm run validate:contracts` — **PASS**.
- `npm run validate:project-state` — **PASS**.
- `npm run validate:review-gate` — **PASS**.
- `npm run validate:workflow-evidence` — **PASS**.
- `npm run validate:status-projection` — **PASS**.
- `npm run adr:audit` — **PASS**, 2.56:1.
- `git diff --check` — **PASS**.
- Named temporary mutation evidence in the Developer handoff shows that removing
  durable policy validation and re-enabling matrix validation are both killed by
  the new TC-007 cases.

## Limitations and remaining gates

No configured Stryker/mutmut runner is present in the environment. The complete
mutation ledger, executable process-kill/restart campaign for TC-040/TC-047 and
SEC-004 runtime closure remain QA/Security responsibilities. This review does
not claim QA approval, Security approval or merge approval.

## Decision and routing

**PASS for Independent Code Review.** Route to **QA Full Mode** at this
candidate. QA must independently rerun CR-001–CR-015, the policy/matrix
authority mutations, crash/restart cases and byte-identity checks. If QA passes,
route SEC-004 runtime evidence to Security Reviewer before the Human merge gate.

## Handoff summary

CHANGES MADE:
- Added this independent code-review record for the QA-277-001 remediation.
- Updated project state and task log to route the candidate to QA Full Mode.

NOTICED BUT NOT TOUCHING:
- `scripts/lib/task-state-machine.mjs` implementation is correct for this review
  scope and was not modified by the reviewer.
- Mutation-runner availability and process-kill/restart harness remain QA-owned
  environment gates.
- SEC-004 runtime verification remains Security-owned after QA PASS.

CONCERNS:
- Do not mark the package complete until QA and Security produce the missing
  runtime evidence and the Human Maintainer approves merge.

NEXT OWNER:
- QA Agent — execute QA Full Mode and produce a terminal verdict.
