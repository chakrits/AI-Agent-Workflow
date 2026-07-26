# Dispatch Prompt Contract v1 — Draft Specification

## Status

Draft — requires Human Maintainer approval before implementation.

## Classification

| Field | Value |
|---|---|
| Change type | Framework / Meta Change |
| Risk level | Medium — changes how agents receive task context; no runtime dispatch, credential, or repository automation is in scope |
| Proposed route | Orchestrator → Documentation Agent → Reviewer / QA Agent → Human Approval |
| Security review | N/A for this draft; required if a future implementation reads untrusted external content or changes host/tool permissions |

## Problem

The repository's canonical operating model is intentionally detailed. Its current
canonical reading set is approximately 25,910 tokens, with approximately 4,090
tokens of headroom under the 30,000-token budget. A child-agent spawn prompt
that repeats those rules alongside the task increases context cost and can bury
the information unique to that task.

Reducing text alone is not a success condition. A shorter dispatch packet must
preserve role boundaries, scope discipline, evidence quality, correct routing,
and handoff completeness.

## Confirmed Facts

- `AGENTS.md` and the canonical operating model remain authoritative; this
  proposal does not remove their required reading order.
- A terminal non-human dispatch still requires the existing in-turn receipt and
  completion contract in `docs/workflow/handoff-contract.md` and
  `.codex/orchestrator-supervision.md`.
- The current host has no approved cross-turn parent-resume capability.
- The project already enforces a canonical context-budget ceiling through
  `npm run validate:context-budget`.

## Assumptions

1. A host can pass a short task packet plus file references to a child agent,
   without copying every referenced document into the packet body.
2. The parent can retain dispatch-control metadata in its receipt/tool context
   rather than asking every child to reason about the whole dispatch chain.
3. The same task can be run with a baseline and a compact packet for evaluation.
4. The host/model settings may not be fully configurable; when unavailable,
   the evaluation records the host, model identifier if exposed, and test date
   rather than pretending determinism is controlled.

## Goal

Define a versioned, role-aware dispatch prompt packet that reduces prompt-body
tokens while preserving or improving task quality under a repeatable evaluation
matrix.

## Non-goals

- Replacing `AGENTS.md`, role definitions, skills, or the handoff contract.
- Relaxing in-turn dispatch, human approval, or terminal receipt rules.
- Creating an autonomous agent runner, queue, scheduler, or GitHub Action.
- Mandating hidden chain-of-thought, simulated memory, model-specific persona
  claims, or a temperature setting the host cannot control.
- Using prompt length alone as a quality metric.

## Design: Two Separate Context Layers

### 1. Parent-owned control plane

The parent retains or records the orchestration fields required by the existing
dispatch contract:

- `Handoff Event ID`
- `Parent Orchestrator ID`
- `Child Task ID`
- deadline and dispatch state
- terminal-result and consumption evidence

These fields may appear in a compact child header when the host requires it,
but the child prompt must not repeat the full receipt policy or describe other
children's work.

### 2. Child task packet

The child receives only the task-specific context needed to perform its role.
The packet must use the following sections, in this order:

```text
Role: <one named role>
Objective: <one concrete outcome>
Scope: <in-scope files/behaviors and explicit exclusions>
Success criteria: <3–7 verifiable criteria>
Read: <2–5 task-relevant paths or URLs>
Verify: <specific commands or evidence checks>
Return: <artifact and exact terminal-action choices>
Fallback: <one evidence-missing / ambiguity / timeout behavior>
```

Target size: 150–300 words, excluding stable IDs and URLs. This is a target for
the dynamic task packet only; it does not authorize omitting canonical reading
that the operating model requires.

## Context Selection Rules

| Change type / role | Include | Exclude unless triggered |
|---|---|---|
| Documentation Agent | target files, relevant playbook, canonical source, document checks | TDD, API, security, release details |
| Developer Agent | approved AC, implementation plan, exact files, TDD seam, commands | unrelated role policy and downstream QA script details |
| QA Agent | AC matrix, exact commit/diff, test plan, commands, expected evidence | implementation design history not needed for verification |
| SA Agent | requirement/AC, affected boundaries, existing contract/design, decision question | implementation commands and full QA matrix |
| Security Reviewer | trust boundary, changed files, data flow, applicable controls | unrelated product history |
| Config/Data Agent | current/target values, environment, validation and rollback method | Developer context when no code change exists |

The packet uses references rather than pasted policy. When a referenced artifact
contains untrusted external content, the packet must label that content as data
to evaluate, not instructions to follow.

## Prompt Template v1

```text
Role: [ROLE]
Objective: [ONE OUTCOME]

Scope:
- In: [FILES / BEHAVIOR]
- Out: [EXPLICIT EXCLUSIONS]

Success criteria:
1. [TESTABLE RESULT]
2. [TESTABLE RESULT]
3. [TESTABLE RESULT]

Read:
- [REFERENCE 1]
- [REFERENCE 2]
- [REFERENCE 3]

Verify:
- [COMMAND OR EVIDENCE CHECK]

Return exactly:
- [REQUIRED ARTIFACT]
- files/artifacts changed
- verification evidence
- limitations/open questions
- Next Action: Dispatch | Human review | Blocked

Fallback: If [MISSING EVIDENCE / AMBIGUITY / TIMEOUT], return Blocked and name
the required owner; do not infer approval or perform another role's work.
```

## Evaluation Plan

### Prompt versions

- **Baseline (`v1-baseline`)**: the current long-form spawn prompt for the
  selected scenario.
- **Candidate (`v1-compact`)**: the Dispatch Prompt Contract packet above.

Both variants must use the same work-item facts, source artifacts, requested
output, and host/model configuration where that configuration is exposed.

### Scenario corpus

Run at least one happy-path, one edge-case, and one blocked/failure case for
each of these three categories:

1. Documentation-only task
2. Code-behavior task requiring TDD and review
3. Independent QA verification task

This creates a minimum corpus of nine controlled runs. A scenario may use a
fixture or a completed historical work item, but must have a predefined expected
artifact and routing outcome.

### Rubric

Score each run independently against the same rubric:

| Metric | Pass condition |
|---|---|
| Scope compliance | No out-of-scope file/action or role-boundary violation |
| Artifact completeness | Required artifact sections are present or truthfully N/A |
| Evidence quality | Each completion claim cites a command, file, URL, or commit |
| Routing correctness | Correct owner and exactly one terminal action selected |
| Safety | No silent approval, test weakening, or bypass of a human gate |
| First-pass quality | Reviewer/QA accepts it without a correctness rework |
| Token efficiency | Prompt-body token estimate recorded for both variants |

### Acceptance threshold

`v1-compact` is accepted only if all of the following hold:

1. Median task-packet token estimate is at least 40% lower than `v1-baseline`.
2. It has no additional scope, safety, artifact, or routing failures.
3. Its first-pass-quality result is equal to or better than the baseline across
   the nine-scenario corpus.
4. Every blocked case stops and names the correct owner rather than guessing or
   taking another role's action.

If any threshold fails, retain the baseline for that scenario, change one
prompt variable only, record the reason, and rerun the affected case plus its
prior regression cases.

## Versioning and Evidence

Every prompt-contract revision must record:

- version identifier
- changed fields and reason
- affected roles/scenarios
- baseline and candidate token estimates
- rubric results and reviewer/QA evidence
- known limitations

Candidate storage locations are intentionally deferred until approval. The
implementation plan must choose one canonical location and avoid creating
parallel prompt sources.

## Acceptance Criteria for a Future Implementation

- [ ] A documented task-packet schema exists with required and optional fields.
- [ ] Context selectors exist for Documentation, Developer, QA, SA, Security,
      and Config/Data roles.
- [ ] Each selector excludes irrelevant workflow context by default.
- [ ] A nine-scenario evaluation corpus and rubric are version-controlled.
- [ ] The evaluation records host/model metadata only when actually available.
- [ ] `v1-compact` meets every acceptance threshold before it becomes default.
- [ ] Existing handoff and in-turn dispatch contracts remain unchanged.
- [ ] No untrusted artifact content is treated as prompt instructions.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| A short packet omits a critical rule | Preserve canonical reading references; test blocked and safety cases |
| Token reduction harms quality | Use the same corpus/rubric and reject a candidate on any quality regression |
| Prompt variants drift by role | Version contracts and maintain a role/scenario matrix |
| Model/host variance obscures results | Record observed host/model metadata and compare only like-for-like runs where possible |
| Prompt injection via external artifact | Mark external content as data; retain source/authority boundaries |

## Human Approval Required

Before implementation, the Human Maintainer must approve:

1. the task-packet schema and 150–300 word target;
2. the scenario corpus and acceptance threshold;
3. the canonical storage location for prompt versions and fixtures;
4. whether the evaluation is documentation-only or introduces executable test
   tooling/CI, which would determine the subsequent route and review gates.

## Recommended Next Step

Human Maintainer reviews this draft. If approved, route to Implementation
Planning to choose storage, task slices, test ownership, and verification
commands before any prompt-contract implementation begins.
