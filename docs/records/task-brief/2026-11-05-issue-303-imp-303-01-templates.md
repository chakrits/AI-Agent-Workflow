# Task Brief

| Field | Value |
|---|---|
| Work Item / Task ID | Issue #303 / Slice 1 / `IMP-303-01` |
| Objective | Produce the approved INTENT and SPEC templates with canonical artifact equivalence and advisory-source/header fields, preserving every baseline template. |
| Base SHA | `61b88e78e1ae1bb8720f71cd029fc9308f476ed1` |
| Dependencies | Approved plan v5 and [Human decision](../approvals/2026-11-05-issue-303-plan-v5-human-approval.md). No dependency on IMP-303-02/03; dispatch prerequisites below still apply. |
| Required reviewer mode | Distinct `qa-agent` in `task_review` mode; spec verdict PASS/FAIL/CANNOT_VERIFY and quality verdict APPROVED/NEEDS_FIX; `task_review_rework_count` starts at 0. |
| Human decision evidence (addressable URL) | [Local Human approval record — issue303-plan-v5-human-approval-20261105-01](../approvals/2026-11-05-issue-303-plan-v5-human-approval.md). Source is the active Codex chat, not a fabricated GitHub URL. |
| Implementation owner | `documentation-agent`; Orchestrator owns integration. Reviewer must be a distinct identity from the writer. |
| Current dispatch status | **Brief prepared; not dispatched.** No template is created by preparation of this document. |

## Allowed Scope

- Write set: **only** new `docs/templates/INTENT.md` and `docs/templates/SPEC.md`.
- Out of scope: editing any of the 34 existing templates; changing routing/policy/contract/schema/scripts/tests/skills; committing/pushing; Issue labels; implementing metrics; approving the writer's own output.
- Report/evidence artifacts use `IMPLEMENTER_REPORT.md` and `TASK_REVIEW.md` in the task-execution process; they do not enlarge the implementation write set.
- Safe rollback of this task's implementation: remove/revert only its two newly added template files while preserving all baseline files. Slice-level rollback remains the approved plan's responsibility.

## Sources and Acceptance Criteria

| Source / AC | Required outcome |
|---|---|
| [Plan v5 §4 / IMP-303-01](../implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v5.md#4-detailed-task-breakdown) | Two templates; no duplicate new implementation-plan template. |
| [Spec v5 AC-001 and §4.1](../sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v5.md#61-acceptance-criteria-v5) | Explicit equivalence to `REQUIREMENT_DISCOVERY.md` / `SDD.md`; the original 34 templates remain byte-identical. |
| Plan IMP-303-01; Spec v5 retains its v4 template/equivalence and source-linkage requirements | INTENT supports problem/outcome/constraints/provenance/open questions and Human or metric-advisory origin; SPEC supports scope, stories, testable AC/business rules, technical-impact summary, and traceable source commit. Do not treat a filled template as automatic approval. |
| Spec v5 §4.1.1 and §4.4.3; approved Slice 1 template task | Clearly retain low-risk/no-security/no-API/no-data fast-track eligibility. Provide the dual-digest advisory header fields needed by the later Slice 3 producer; do not implement hashing or CLI logic. |
| `docs/workflow/task-execution-mode.md` | Return an Implementer Report with actual base/head, changed paths, commands/results, limits; independent QA reviews the exact range. This task does not certify whole Slice 1 acceptance. |

## Verification and Stop Condition

- Commands (run from repository root **during implementation**, not represented as already run for outputs that do not exist):
  - `test -f docs/templates/INTENT.md && test -f docs/templates/SPEC.md` → exit 0.
  - `git diff --check` → exit 0.
  - `node scripts/validate-clearable-refs.mjs` → exit 0; permanent templates must not depend on clearable records for policy meaning.
  - Compare all `git ls-tree -r --name-only 61b88e78e1ae1bb8720f71cd029fc9308f476ed1 -- docs/templates` baseline paths to their `git show <base>:<path>` bytes → **34 original paths, zero modified/deleted originals**. Include untracked new files in the changed-path report; unstaged `git diff` alone does not enumerate them.
- Independent review must inspect the equivalence mapping, source linkage, advisory headers, and eligibility meaning against the cited sources. File presence alone is not acceptance.
- Before any future dispatch: Orchestrator verifies `status:spec-ready`, approved decision provenance, an authorized implementation request, and baseline/worktree ownership. Current local intake/status edits must not be overwritten.
- Stop and route to: Orchestrator for a write-set/dependency/HEAD conflict; SA for a substantive template/design ambiguity; Human only for a new scope/policy decision, not repeat approval of the unchanged v5 plan.
- A future source conflict returns CANNOT_VERIFY/BLOCKED with the exact conflicting source; do not expand this task to edit core policy.
