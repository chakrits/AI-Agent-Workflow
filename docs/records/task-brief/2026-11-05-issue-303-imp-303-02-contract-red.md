# Task Brief

| Field | Value |
|---|---|
| Work Item / Task ID | Issue #303 / Slice 1 / `IMP-303-02` (TDD Red only) |
| Objective | Add production-seam contract regression tests for approved v5 parity, fast-track, temporal remediation, sunset recovery, and chronological cutoff behavior; demonstrate the expected RED failures before production implementation. |
| Base SHA | `d28ac8cc44170dab0bfa95ddc85751c7c3cce09c` |
| Dependencies | Approved plan v5 and [Human decision](../approvals/2026-11-05-issue-303-plan-v5-human-approval.md). Test design reads the approved specification, not outputs of IMP-303-01; these initial tasks have disjoint write sets. |
| Required reviewer mode | Distinct `qa-agent` in `task_review` mode for requirement/test quality; `task_review_rework_count` starts at 0. Runtime/security acceptance remains at the integrated Slice 1 review. |
| Human decision evidence (addressable URL) | [Local Human approval record — issue303-plan-v5-human-approval-20261105-01](../approvals/2026-11-05-issue-303-plan-v5-human-approval.md). Active-chat approval is recorded locally; no external approval URL is claimed. |
| Implementation owner | `developer-agent`; SA consulted only for an actual source/design conflict. Distinct QA identity reviews the test artifact. |
| Current dispatch status | **Authorized for current in-turn dispatch.** No test or runtime change is made by preparation of this document. |

## Allowed Scope

- Write set: **only** `test/validate-contracts.test.mjs`.
- Out of scope: changing `scripts/validate-contracts.mjs`, policy YAML, schema JSON, templates, fixtures outside this file, or other production code; disabling/weakening baseline assertions; replacing the production seam with copied prototype logic; commits/pushes/labels; claiming Green or whole-Slice readiness.
- Use isolated temporary fixture roots from this test file for new histories/policies and clean up only fixtures the task created. Preserve unrelated workspace records.
- Name new top-level tests with the stable prefix `issue-303:` so expected Red cases can be separated from unchanged baseline cases.
- Expected Red is a temporary TDD task result. IMP-303-03 must make these tests pass before the integrated slice is proposed for merge.

## Sources and Acceptance Criteria

| Source / AC | Required outcome |
|---|---|
| [Plan v5 §4 / IMP-303-02](../implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v5.md#4-detailed-task-breakdown) | Failing tests first; cover TC-001, TC-002, TC-003.1, and TC-003A through TC-003E4 without production edits. |
| [Spec v5 AC-002 / §4.1](../sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v5.md#41-stage-01--02-contract-compressed-artifact-route-parity-temporal-escalation--sunset-recovery-ตอบโจทย์-rr-01-r3-01-r3-02-v4-01a-v4-01b) | Exercise actual exported `validateContracts()` against schema-valid fixtures. Current baseline limitations must cause expected requirement failures, not missing-import/syntax/setup failures. |
| Spec v5 §6.2 TC-001 / TC-002 / TC-003.1 | Low-risk fast-track and existing standard routes; reject cross-field risk disagreement/missing evidence and any security/additive-API/data impact; preserve all 10 standard contract examples. |
| Spec v5 TC-003A–D | Planning/rework escalation through SA; standard replanning; causal prefix and requirements-episode boundary; reject unremediated advancement and reuse of a future/previous-episode design. |
| Spec v5 TC-003E1–E3 | Existing items may hold in approved recovery states; unremediated implementing is blocked; pre-sunset completed histories stay readable without rewriting audit history. Include stepwise recovery back through standard planning/implementing. |
| Spec v5 TC-003E4 / P5-01 | Compare chronological instants: before/equal cutoff accepted; .500Z and +1s after cutoff rejected; +07:00 equivalent after/equal cases handled identically; invalid timestamp rejected. Exact expected accept/reject outcomes come from this approved contract. |
| `docs/workflow/task-execution-mode.md` | Implementer Report identifies tests that fail for expected v5 gaps and baseline tests that remain Green. Independent task review assesses the test artifact, not future production acceptance. |

## Verification and Stop Condition

- Commands (future Red execution, not claims that tests have already been authored):
  1. Before edits: `node --test test/validate-contracts.test.mjs` → exit 0, establishing the clean baseline for this seam.
  2. After edits: `node --test --test-name-pattern='^issue-303:' test/validate-contracts.test.mjs` → nonzero exit from explicit v5 requirement assertions. Identify each expected failure and why it proves the production gap; do not accept an import, syntax, fixture-validation, or unrelated failure as RED evidence.
  3. `node --test --test-name-pattern='^(?!issue-303:)' test/validate-contracts.test.mjs` → exit 0 for unchanged baseline tests; report skipped new tests honestly.
  4. `git diff --check` → exit 0.
- Return actual commands/output and a scenario-to-test mapping. Keep the standard 10-example coverage intact. Do not add a source assertion that merely checks the proposal text exists in a file.
- If a required negative scenario already fails closed on baseline, retain that evidence; do not manufacture a failing implementation solely to produce RED.
- Before future dispatch: verify `status:spec-ready`, active implementation authorization, approval evidence, exact baseline, isolated write ownership, and the task packet. Latest Human authorization permits implementation dispatch; see superseding execution decision in the approval record.
- Stop and route to: Orchestrator for a baseline/write-set collision; SA for a genuine contract conflict; QA for test-method concerns. Do not ask Human to reapprove unchanged plan v5.
- End this task at an evidenced Red report. Green work belongs to IMP-303-03, whose exact base is pinned after the reviewed Red artifact has an actual head SHA. Do not create a future SHA or mark the whole slice QA-ready.

## Execution preflight
- Actual dispatch baseline: `d28ac8cc44170dab0bfa95ddc85751c7c3cce09c` (preparation commit). Human execution authority and actual `status:spec-ready` / `phase:development` verified.
- This addendum supersedes future-preflight wording above. Parent owns commits; child must preserve shared-tree disjoint write ownership and return an Implementer Report.
