# SDD: Safe Autonomy and Proportional Verification

## Metadata

| Field | Value |
| --- | --- |
| Work item | [Issue #282](https://github.com/chakrits/AI-Agent-Workflow/issues/282) |
| Parent | [Issue #280](https://github.com/chakrits/AI-Agent-Workflow/issues/280) |
| Change type | Framework / Meta |
| Risk | Medium |
| Status | `READY_FOR_WRITTEN_SPEC_REVIEW` |
| Owner | Documentation / Architecture |
| Approved direction | Human Maintainer, 2026-09-21 |

## Context

The parent modernization SDD requires a clear boundary between reversible, low-risk autonomous work and decisions that must remain at a human approval gate. It also requires verification effort to match the task's risk rather than applying a single heavyweight checklist to every task.

Issue #281 established the small always-loaded bootloader. This work defines the policy that the bootloader and canonical operating model will reference; it does not change them yet.

## Goals

1. Permit progress on a disclosed assumption only when it is reversible, low risk, inside user scope, and does not choose product or operational meaning.
2. Preserve existing stop conditions for security, production access or data, releases, external communications, destructive actions, and material scope changes.
3. Define a completion contract that makes both the completed work and its remaining approval boundary explicit.
4. Map verification to task class and risk while retaining mandatory checks where policy already requires them.

## Non-goals

- Removing or weakening Human Approval, security, QA, or release gates.
- Replacing the required implementation plan for a non-trivial change.
- Changing skill metadata or behavior-evaluation design; those belong to Issues #283 and #284.

## Decision Model

### Safe autonomous assumptions

An agent may proceed only when every condition below is true:

| Condition | Meaning |
| --- | --- |
| Reversible | The action can be undone without data loss, production impact, or meaningful external side effect. |
| Low risk | It does not change security posture, authorization, privacy, finances, or a regulated or release outcome. |
| In scope | It is a normal implementation or analysis step within the user's stated task. |
| Disclosed | The final handoff identifies the assumption and its effect. |
| Non-semantic | It does not select business meaning, product policy, public messaging, or a material architectural direction. |

If any condition is false or unclear, the agent must stop and request a human decision.

### Completion contract

Each work-item handoff must state these fields:

| Field | Required content |
| --- | --- |
| Done when | Observable artifacts and verification evidence required for completion. |
| May proceed through | Reversible, in-scope work the agent may complete without another approval. |
| Must stop for | Decisions or actions needing human approval, including any existing approval gate. |
| Assumptions | Any safe autonomous assumption, its rationale, and how to reverse it. |

## Proportional Verification Policy

| Task class | Minimum evidence | Escalate when |
| --- | --- | --- |
| Read-only / advisory | Source inspection and cited evidence | The advice affects security, release, or a material business decision. |
| Documentation / framework text | Targeted repository validators, link/path checks, and review of affected contracts | The wording changes a mandatory gate, security policy, or machine-consumed rule. |
| Behavior or configuration change | Relevant automated tests plus static review of affected logic | It touches authorization, sensitive data, production configuration, migration, or financial behavior. |
| Security, data, release, or irreversible work | Expanded domain review, applicable test suite, rollback evidence, and required Human Approval | Never downgrade below this baseline. |

This table selects a minimum verification set. It does not override a stricter requirement in an existing workflow, contract, skill, or approval gate.

## Intended Canonical Ownership

| Component | Responsibility |
| --- | --- |
| `docs/operating-model/AGENT_OPERATING_MODEL.md` | Canonical safe-autonomy and completion-contract policy. |
| `docs/workflow/quality-gates.md` | Canonical proportional-verification mapping and evidence expectations. |
| `AGENTS.md` and bootloader | Concise routing pointers to canonical policy; no duplicated rules. |
| Work-item template / handoff contract | Required completion-contract fields. |

## Security and Governance

This is a governance hardening change. The policy must be fail-closed: ambiguity about reversibility, risk, scope, or decision authority routes to human approval. Existing security-sensitive routing remains mandatory.

## Testability and Verification Plan

The implementation plan must identify deterministic repository checks for:

1. safe-autonomy wording and stop-condition links;
2. completion-contract fields in affected templates or validators;
3. proportional-verification references without duplicate or contradictory thresholds; and
4. unchanged security and human-approval requirements.

## Rollback

All changes are documentation and validation-rule changes. Rollback is a revert of the isolated commit or PR. No production data or runtime behavior is changed.

## Related Records

- Parent: `docs/records/sdd/2026-09-21-issue-280-gpt6-astra-modernization-sdd.md`
- Predecessor: Issue #281 / PR #285
- Decision: ADR-0035 in `DECISIONS.md`
