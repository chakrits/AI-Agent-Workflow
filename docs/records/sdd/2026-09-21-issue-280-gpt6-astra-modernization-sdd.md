# Software Design Document: GPT-6 Astra Instruction, Skill, and Autonomy Modernization

## Metadata

- Work Item ID: Issue #280
- Owner: SA / Documentation Agent
- Status: ACCEPTED — Human Maintainer approved implementation on 2026-09-21
- Date: 2026-09-21
- Parent issue: https://github.com/chakrits/AI-Agent-Workflow/issues/280

## Context

The repository already has a three-tier context design: a Core Bootloader, on-demand role contexts, and a canonical reference library. Its always-on guidance still requires a broad reading order before selecting a role or skill, while `dynamic-workflow` directs the reader to all workflow documents. This conflicts with progressive disclosure.

The project exposes 39 skills. Their frontmatter descriptions total about 10,791 characters, and detailed boundary guidance in those descriptions competes with the task signal. The Core Bootloader manifest says 31 skills, creating a stale inventory claim.

The proposed design follows OpenAI’s GPT-6 Astra guidance: use task-specific instruction loading, concise skill triggers, clear safety boundaries, and an explicit completion contract.

## Goals / Non-goals

### Goals

- Make the Core Bootloader the one default repository entry point.
- Load policy, role, workflow, and skills only when the task classification calls for them.
- Permit disclosed, reversible, low-risk assumptions while retaining all human approval gates.
- Make skill metadata concise and accurate without losing detailed on-demand procedures.
- Introduce a reproducible behavior-evaluation gate before rollout.

### Non-goals

- Removing or weakening human approval, security review, QA independence, or evidence requirements.
- Changing application code, production access, data, release, or deployment controls.
- Replacing portable skill mirrors or host-specific compatibility mechanisms.
- Treating a model behavior evaluation as a substitute for required code/test verification.

## Architecture Overview

```text
User task
  -> Tier 0: AGENTS.md (short cross-platform pointer and non-negotiable gates)
  -> Tier 1: Core Bootloader (classify task and choose the next source)
  -> Tier 2: only the matching risk/role/workflow reference
  -> Tier 3: only the selected skill and its supporting material
  -> Execute, verify proportionally, and stop at defined human gates
```

The design keeps the existing documents as canonical references. It changes the load policy, not the source-of-truth hierarchy.

## Component Design

### 1. Instruction entry and trigger map

`AGENTS.md` becomes a concise cross-platform entry point that directs every repository task to `core-bootloader.md`. The bootloader classifies the request as advisory, documentation, code, data/config, security-sensitive, release, or lifecycle handoff.

Each class names the minimum next reference. For example, a readonly advisory task needs only relevant evidence; a security-sensitive task loads the security workflow before mutation; and an inter-agent handoff loads its contract. No task starts by reading the whole canonical library.

### 2. Safe-autonomy boundary

An agent may proceed after declaring an assumption only when all conditions hold: the work is reversible, low-risk, within the user’s stated scope, and does not select business meaning, security posture, production data, or release outcome. Otherwise it stops for the existing human approval gate.

The completion contract records three fields: `done when`, `may proceed through`, and `must stop for`. This gives Astra a concrete persistence boundary without granting authority beyond the current task.

### 3. Proportional verification

Verification remains evidence-based, but required evidence follows task risk:

| Task class | Minimum verification |
|---|---|
| Readonly/advisory | Source inspection; no repository test by default |
| Documentation-only | Targeted link, format, or repository validator |
| Code/config behavior | Affected tests and static checks |
| Security/data/release | Applicable expanded test/review gate and human approval |

No level permits an unsupported completion claim.

### 4. Skill metadata and inventory

Frontmatter descriptions contain only the task and precise trigger. Detailed exclusions, overlap rules, and recipes remain in each skill body or an on-demand catalog. Skills are grouped for navigation as workflow, engineering, QA, API, frontend, and security/data.

A validator derives or checks the manifest count against the 39 source skill directories, while existing parity checks continue to protect the three portable copies.

### 5. Behavior evaluation gate

Issue #284 owns a 12-scenario corpus. Each scenario records request class, expected references/skill, permitted action, expected stop or continuation, and required evidence. The candidate must be independently reviewed against a baseline. A safety regression blocks rollout and can be rolled back by reverting the owning child PR.

## Data Model / Data Impact

No production data or database changes. New evaluation fixtures or documentation records are repository-local and must be deterministic.

## Error Handling

- Missing or conflicting authoritative sources: stop and identify the owner.
- Unknown request classification: report the gap and ask for routing guidance only when it materially affects scope or safety.
- Safe assumption becomes material during execution: stop at that point and request a decision.
- Evaluation environment cannot execute a model run: record `Not validated — host capability unavailable`; do not infer success.

## Security Considerations

The design does not relax existing gates for authentication, authorization, secrets, privacy, payment, production data, destructive migrations, or releases. Those task classes remain explicit stop-and-review paths. Security review is required if implementation changes the enforcement of these boundaries.

## NFRs

- Tier 1 boot context: <= 2,500 approximate tokens.
- Each role context: <= 1,500 approximate tokens.
- Project skill descriptions: <= 5,500 characters total and <= 160 characters each.
- Portable skill parity: all mirrored copies match.
- Evaluation evidence: every scenario has a deterministic expected result and exact candidate reference.

## Alternatives Considered

1. **Keep the current mandatory reading order.** Rejected: it defeats the existing progressive-context architecture for low-risk work.
2. **Delete detailed skills and use a single universal prompt.** Rejected: specialized workflows and cross-platform reuse still need on-demand guidance.
3. **Adopt the proposed tiered triggers and concise metadata.** Recommended: it retains safety policy while removing context and routing friction.

## Proposed Decision

Adopt alternative 3 through the independently revertible child issues #281–#284. ADR-0034 records the approved Tier 1 loading migration for #281. Each remaining child issue retains its own implementation and human-review gate.

## Testability Notes

- Add focused structural tests for the trigger map, inventory consistency, and description budgets.
- Retain existing context-budget, parity, contract, project-state, and full-suite checks.
- Run the behavior corpus as a separate QA artifact; distinguish executable results from static/manual evidence.

## Related Artifacts / Links

| Artifact | Purpose | URL / Repository Path |
|---|---|---|
| Issue #280 | Umbrella work item | https://github.com/chakrits/AI-Agent-Workflow/issues/280 |
| Issues #281–#284 | Implementation and evaluation slices | https://github.com/chakrits/AI-Agent-Workflow/issues/281 |
| OpenAI guidance | Design source | https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra |
| Work item record | Lifecycle record | `docs/records/work-items/2026-09-21-issue-280-gpt6-astra-modernization.md` |
