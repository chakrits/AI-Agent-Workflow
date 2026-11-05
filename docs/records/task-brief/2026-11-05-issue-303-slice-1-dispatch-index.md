# Issue #303 — Initial Slice 1 Task Briefs and Dependency Index

## Approved Decision and Current Stage
- [Direct Human plan-v5 approval](../approvals/2026-11-05-issue-303-plan-v5-human-approval.md), decision ID `issue303-plan-v5-human-approval-20261105-01`.
- Current stage: `phase:planning`; requested Task Brief preparation complete. Policy approval is recorded; implementation has not begun.
- Approved source/baseline: `61b88e78e1ae1bb8720f71cd029fc9308f476ed1`.
- This index is preparation evidence; the parent-to-Orchestrator receipt below is not an implementation dispatch or permission to implement.

## Initial Briefs Ready for Review

| Task | Owner / independent review | Brief | Why its base can be pinned now |
|---|---|---|---|
| IMP-303-01 | documentation-agent / distinct qa-agent task_review | [INTENT/SPEC templates](2026-11-05-issue-303-imp-303-01-templates.md) | Inputs are the approved plan/spec; only two new template paths; no dependency on future implementation output. |
| IMP-303-02 | developer-agent / distinct qa-agent task_review | [Contract TDD Red](2026-11-05-issue-303-imp-303-02-contract-red.md) | Uses the existing validateContracts seam and approved expectations; no dependency on template output. |

Both initial briefs use the same immutable approved base and disjoint write sets. Separate sessions/worktrees or sequential ownership still require Orchestrator preflight before any dispatch. No parallel run is created here.

## Downstream Sequencing — Not Yet Executable Briefs

| Planned task | Prerequisites | Base-selection rule at dispatch |
|---|---|---|
| IMP-303-03 — Contract/schema Green | Reviewed IMP-303-02 Red artifact and its actual head; approved v5 | Pin the real prerequisite/integration head after it exists; current baseline is not substituted for the future Red-test head. |
| IMP-303-04 — Routing, ADR, changelog, repin | IMP-303-01 template output and IMP-303-03 contract behavior aligned | Pin the actual integrated head; retain the plan's exact core write set and guard commands. |
| IMP-303-05 — Slice 1 Security/Code/QA | Integrated IMP-303-01–04 candidate | Separate verifier identities; pin actual base/head range; create review evidence in the same Slice 1 change request. |
| IMP-303-06 — Slice 2 policy docs | Approved v5; deployment order per stacked PR topology | No speculative SHA allocated. Standard doc review; no task-execution ceremony added to this documentation-only slice. |
| IMP-303-07–09 — Slice 3 metrics/writer TDD + review | Accepted Slice 1 INTENT contract and actual integration head | Prepare focused briefs later, after prerequisites exist; no future base SHA invented. |
| IMP-303-10 — Slice 4 roadmap/terminal acceptance | Accepted Slices 1–3 and work-item traceability | Pin terminal candidate at that time; only terminal PR closes Issue #303. |

## Remaining Preconditions for Future Implementation Dispatch
1. Verify/publish `status:spec-ready` through the authorized GitHub workflow. No label write occurred here.
2. Confirm an implementation-dispatch request is within the active user authorization; this request authorizes brief preparation.
3. Check baseline/head ownership and an isolated write set, preserving current uncommitted intake/status records.
4. Create Packet v1 and invoke/await any future child within the active parent turn. No automatic continuation is claimed.
5. Use actual implementation/report heads for task review; the current preparation records do not establish QA acceptance.

## Preparation Verification
- Both briefs follow the fields and sections in `docs/templates/TASK_BRIEF.md`.
- Each identifies the immutable baseline, owner, distinct reviewer, source/AC, allowed paths, dependencies, expected verification outcomes, and stop boundary.
- Human approval is traceable through a local record linked from each brief; no missing policy approval is claimed.
- No runtime/policy/schema/test/template implementation, child dispatch, GitHub write, commit, or push occurred in this preparation task.

## Orchestrator Preparation Receipt

- Handoff Event ID: `issue303-initial-briefs-preparation-20261105-01`.
- Source Agent: `/root`; Target Agent: `/root/issue303_orchestrator`.
- Dispatch result: `collaboration.followup_task` invoked the existing Orchestrator for this approved, bounded brief-preparation request.
- Acknowledgement evidence: Orchestrator sent an in-turn acknowledgement that it accepted the direct Human plan-v5 approval and would prepare the IMP-303-01 and IMP-303-02 briefs.
- Completion event evidence: the parent registered `collaboration.wait_agent` after invocation and remained in-turn; its final wait delivered the Orchestrator's terminal result.
- Terminal Result ID: `issue303-initial-briefs-61b88e7-20261105-01`.
- Dispatch State: `completed` for preparation only.
- Consumption evidence: parent `/root` consumed the event/result pair once, inspected the linked approval and brief contents, and recorded this receipt. No implementation agent was dispatched.
- Boss event: Human plan-v5 approval was recorded; Orchestrator prepared two initial Task Briefs and a dependency index at the actual baseline, with implementation preflight and independent review still to be performed when execution is requested.

### Results for this preparation turn
- Template-field/section, exact-base, approval-link, local-source-path and whitespace checks: PASS for both briefs; exact Human quote check: PASS.
- `node scripts/validate-project-state.mjs`: exit 0.
- `node scripts/compile-status-projection.mjs --check`: exit 0; projection digest remains `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
- `node scripts/validate-risk-register.mjs`: exit 0; one risk entry remains Open.
- `node scripts/validate-clearable-refs.mjs`: exit 0 for the range it reports; direct source-path checks above cover the newly created local brief references.
- `git diff --check`: exit 0. No full regression suite was run because this preparation changes records only.
- Terminal Result ID: `issue303-initial-briefs-61b88e7-20261105-01`.

## Active Execution — Supersedes Preparation Preconditions Above
- User authorized Slice 1 implementation dispatch, issue-scoped commit/push and lifecycle label publication; exact decision is in the linked approval record.
- GitHub read-back: `enhancement`, `phase:development`, `status:spec-ready`; label operation exit 0.
- Preparation baseline commit: `d28ac8cc44170dab0bfa95ddc85751c7c3cce09c`; template candidate commit: `b6cdcd7ba4b18529a7d9e042f0c213281d3aa5b6`.
- Documentation child `/root/issue303_orchestrator/templates`: Packet v1 invoked and acknowledged; native `collaboration.wait_agent` delivered terminal `issue303-templates-d28ac8c-20261105-01`; Orchestrator consumed once. INTENT/SPEC integrated in the template candidate. Independent QA task_review `/root/issue303_orchestrator/task_qa` is invoked/acknowledged and in-turn wait registered; acceptance pending.
- Developer child `/root/issue303_orchestrator/contracts_red`: Packet v1 invoked/acknowledged with baseline `d28ac8c`; native wait registered. RED tests remain uncommitted pending separate QA artifact review; no known-failing RED-only commit is created. Green requires reviewed immutable RED patch identity first.
- Shared current feature tree has explicit disjoint write ownership; no branch/worktree change or removal. Commit ownership remains Orchestrator.
- Parent `/root` supervises this Orchestrator in the same active turn. No cross-turn automatic continuation is claimed.
