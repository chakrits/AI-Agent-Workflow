# Implementation Plan: Issue #196 — T2-A Evidence Harness Hardening

## Source and decision

- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/196
- Parent: https://github.com/chakrits/AI-Agent-Workflow/issues/133
- Decision: Treat the two Major findings from the final review of #133 as a new auditable follow-up task. Do not increase #133's rework budget implicitly.
- Candidate base: `ef3aea52b7652de957d986d09e55893a9b1eb445` — the final T2-A implementation plus its handoff record. `main` at `b974e39345f29a96ee723cbd4d568550874aa7c2` predates the T2-A files and is not a valid implementation base for this follow-up.

## Objective

Make the T2-A evidence harness prove input-driven manifest execution and exact applicable schema/runtime parity without changing T2-A production behavior.

## Scope

- Primary file: `test/status-cas-decision.test.mjs`
- Supporting manifest, corpus, and fixture data only when needed to make cases input-driven.
- Test-only evidence and handoff updates required to describe the result.
- Out: `scripts/lib/status-cas-decision.mjs` unless a test seam is impossible and the exception is justified; T2-B, writer/publication, authority, orchestration, dispatch/relay, lifecycle, credentials, and dependency behavior.

## Task breakdown

### Task 1 — Remove scenario-driven execution

- Replace `frozenBoundaryOperations` and hidden base-fixture substitution with explicit case inputs and boundary selection.
- Add a regression that mutates a resolved fixture while keeping scenario metadata unchanged; execution must change or fail as expected.
- Verify focused CAS tests and the full manifest case count.

### Task 2 — Implement exact parity coverage

- Run the applicable schema validator and runtime function against the same resolved input.
- Compare exact success outputs or normalized schema/runtime error evidence.
- Cover CAS, digest, approval, manifest, transition, correction, and record boundaries, or document an explicit not-applicable reason per excluded boundary.
- Derive coverage from manifest IDs rather than a hand-maintained arithmetic counter.

### Task 3 — Baseline and handoff

- Compare full-suite failures before and after against the recorded eight inherited failures.
- Run repository validators and `git diff --check`.
- Produce a Developer handoff for independent Code Review. No Security or QA routing until Code Review passes.

## Verification

- Focused CAS tests: all pass, including adversarial mutation regression.
- Manifest: every manifest ID executes exactly once; no omissions or duplicates.
- Exact parity: all applicable manifest cases have a real schema/runtime comparison with evidence.
- `npm test`: no new failure beyond the recorded baseline.
- `npm run validate:contracts`
- `npm run validate:project-state`
- `npm run validate:skill-usage`
- `npm run validate:context-budget`
- `git diff --check`

## Risks and fallback

- Risk: changing the harness may expose additional pre-existing contract mismatches. Preserve the baseline and report each delta; do not weaken tests.
- Risk: a schema/runtime boundary may not have a direct one-to-one mapping. Mark it not applicable with a contract-level reason instead of manufacturing parity.
- If either Major finding remains after this task, stop at Code Review and escalate to Human Maintainer. Do not merge or silently create another rework round for #133.

## Handoff

Developer Agent → independent Code Review → QA only after review pass → Human Approval.
