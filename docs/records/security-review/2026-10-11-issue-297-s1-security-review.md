# Security Review: Issue #297 S1 (bug-fix-workflow.yaml as single policy source)

- Reviewer: Security Reviewer (independent). Range: `git diff affcac0..39b158c`.
- Verdict: PASS_WITH_FINDINGS (no Critical/High; no merge block).
- Verification: `npm test` 787 pass / 0 fail; `npm run validate:contracts` passed.

## Actor-list diff (pre `TRANSITION_MATRIX` vs post YAML-derived)

| from | pre actors | post actors | Result |
|---|---|---|---|
| intake | orchestrator, ba-agent | orchestrator, ba-agent | same |
| investigating | developer-agent, sa-agent | developer-agent, sa-agent | same |
| designing | sa-agent | (none, no row) | narrowed (state unreachable) |
| planning | developer-agent | (none, no row) | narrowed (state unreachable) |
| implementing | developer-agent | developer-agent | same |
| verifying | qa-agent | qa-agent | same |
| rework | developer-agent | developer-agent | same |
| handoff | orchestrator, release-agent | orchestrator, release-agent | same |
| blocked (resume) | human, orchestrator | human, orchestrator | same |
| completed / cancelled | none | none | same |

No actor widening. Destination narrowing (pure API only; disk path was already policy-limited): intake loses designing/cancelled; investigating loses designing/planning/cancelled; implementing loses blocked/cancelled; verifying loses cancelled; rework loses blocked/cancelled; handoff loses blocked/cancelled; blocked resume reduced to investigating/verifying. `cancelled` is now unreachable by any path (availability, not security).

## Per-control results
1. Actor authorization: PASS. Table above. Per-from-state union of row actors (scripts/lib/task-state-machine.mjs deriveTransitionTable); identical to pre-change for every reachable state.
2. Human approval gate: PASS. Both HUMAN_APPROVAL_REQUIRED checks (task-state-machine.mjs ~L96-98 and ~L111-113) and the resume `resume_evidence`/`approver_id` check are textually unchanged; resume evidence now taken from the YAML resume row (`requires: [resume_evidence, approver_id]`, identical set). Disk path reaches the same makeTransition.
3. Evidence gate: PASS, strictly tighter. Before, the pure path skipped evidence for `to: blocked`/`cancelled` and used different keys; now every pure and disk transition validates the YAML row `requires` (investigating->blocked needs stop_reason; verifying->blocked needs verification_failed + human_review_required). Nothing requires less. See F1.
4. Fail-closed: PASS. Unreadable/unparseable YAML throws POLICY_UNAVAILABLE (readPolicy); structurally bad policy rejected by deriveTransitionTable (missing/empty actors, unknown state, non-array destinations). Injection: `transitionTaskState`/`resumeTaskState` force `policy: undefined`, so a caller-supplied `policy` option is ignored (empirically confirmed: injected permissive policy still yielded MISSING_REQUIRED_EVIDENCE). `makeTransition` is not exported. `deriveTransitionTable` is exported but pure and affects no state.
5. CAS/fencing/lock: PASS. Diff in mutateTaskStateOnDisk touches only the validate/transition call lines; digest check, generation read, commit guard acquire/release untouched.
6. Rework ceiling: PASS. MAX_REWORK_EXCEEDED block and `max_rework_attempts` default 2 unchanged; tests still assert it (fail-3 case).
7. Test migration: PASS. No security assertion removed or weakened. Removed: obsolete designing/planning/cancelled matrix-edge flows and the `validateMatrixEvidence:false` compatibility assertion (now asserts shared-YAML behavior). Added: derived-table equality, pure/disk evidence parity, matrix-only edges rejected, POLICY_UNAVAILABLE, actors present on every row. Human-gate and rework tests retained with YAML evidence keys.

## Findings
- F1 (Low): `deriveTransitionTable` does not require `requires` on rows; a row without it yields `validateEvidence(undefined)` = no evidence required (fail-open for evidence only). Current YAML has `requires` on all rows; validate-contracts does not check it. Hardening: require array `requires` per row. Route to Developer Agent; non-blocking.
- F2 (Low): Actor authority now comes from a runtime-read file (re-read on each disk mutation) rather than code. Trust equals repo write access/review; no integrity check. Same trust already applied to evidence. Informational on provenance; rely on code review of YAML changes.
- F3 (Informational): Actors in YAML are not validated against ROLE_REGISTRY at derive time; a typo fails closed (unreachable) at canonicalizeActor. Module import throws if YAML is bad (fail-closed, availability impact for all importers).
- Chained: F1+F2 combined means a YAML edit dropping `requires` and widening `actors` would silently weaken gates; contained by code review, no automated guard. Suggest the S-later validator check.

## Handoff
Owner: Developer Agent for F1 (optional hardening). No human approval required for merge from a security standpoint.
