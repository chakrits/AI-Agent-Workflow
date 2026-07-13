# Post-Merge Documentation Stewardship Design

**Date:** 2026-07-14  
**Status:** Approved for implementation planning  
**Work item:** POST-MERGE-DOCUMENTATION-STEWARDSHIP-2026-07-14

## Goal

Make every pull request merged into `main` receive a consistent documentation-impact review. The review keeps project navigation, current state, history, decisions, risks, and canonical workflow documentation accurate without requiring meaningless edits to every file.

## Scope

In scope:

- A mandatory Documentation Agent trigger after every merge into `main`.
- A standard post-merge review record and template.
- Explicit review, completion, escalation, and handoff rules for the Documentation Agent.
- A project-index link to the new template.

Out of scope:

- Automatically changing documentation through GitHub Actions.
- Release approval, hosted-CI approval, or closing a risk without evidence.
- Changing application behavior, the Bug Fix workflow policy, or platform-specific runtime behavior.

## Workflow

```text
Pull request merged into main
  -> Documentation Agent post-merge impact review
  -> Reviewer
  -> Next quality gate or Human gate, when one remains
```

The review is classified as `documentation-only`. Its default risk is `Medium` because project-state and workflow documents guide subsequent agents. The Documentation Agent must not treat the review as a release decision.

## Mandatory Impact Assessment

For every merge, the Documentation Agent assesses each artifact below. It updates an affected artifact or records `No update required — <reason>` in the review record.

| Artifact | Update condition |
|---|---|
| `PROJECT_INDEX.md` | Canonical files, workflows, templates, skills, or entry points were added, moved, or removed. |
| `PROJECT_STATUS.md` | Current stage, owner, blocker, next quality gate, or next recommended agent changed. |
| `TASK_LOG.md` | Every merge; append the merge reference, summary, and next step. |
| `CHANGELOG.md` | The merge has a user-facing or maintainer-facing change worth recording. |
| `DECISIONS.md` | The merge creates or confirms an architecture or process decision. |
| `RISKS.md` | The merge adds, changes, or leaves an owned risk/follow-up that is not evidenced as closed. |
| Canonical documents and platform adapters | The merge changes a policy, terminology, workflow, or adapter parity obligation. |

## Review Record

Each merge produces a tracked record at:

```text
docs/records/POST-MERGE-DOCUMENTATION-REVIEW-<YYYY-MM-DD>-PR-<number>.md
```

The record must contain:

- Pull request number, merge commit, merge date, and source branch when known.
- Change summary and classification.
- The mandatory impact assessment and each update/no-update rationale.
- Files changed by the documentation review.
- Checks and evidence reviewed.
- Known limitations, unresolved evidence, risks, and open questions.
- Reviewer handoff, next owner, and next quality gate.

Missing external evidence, such as a hosted GitHub Actions result, must be listed as unresolved rather than inferred.

## Completion Rules

The Documentation Agent may mark its post-merge review complete only when:

1. `TASK_LOG.md` records the merge.
2. Every artifact in the impact assessment is updated or has a recorded no-update rationale.
3. A review record exists and is linked to the merge evidence available locally.
4. Remaining quality gates, limitations, and next owner are explicit.
5. The structured handoff is ready for a Reviewer or the applicable next gate.

The Documentation Agent does not approve release, hosted CI, human gates, or risk closure merely because a pull request merged.

## Escalation Rules

| Condition | Route to |
|---|---|
| Documentation conflicts with implementation, tests, or a contract | Developer Agent or SA Agent, depending on whether the conflict is implementation or design. |
| The merge requires a new architecture or process decision | SA Agent and Human Reviewer. |
| Hosted CI, test evidence, or another quality gate remains unverified | Reviewer / QA Agent. |
| The merge has release or deployment implications | Release Agent and Human approval. |
| A new or unresolved risk is found | Record it in `RISKS.md` and route to its owner; do not close it without evidence. |

## Implementation Targets

- Update `.claude/agents/documentation-agent.md` with the trigger, impact assessment, review record, completion rules, and escalation boundaries.
- Add `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md`.
- Link the template from `PROJECT_INDEX.md`.
- Add the same responsibility to portable guidance if a canonical equivalent is introduced or required for cross-platform parity.

## Acceptance Criteria

1. The Documentation Agent instruction explicitly requires a post-merge review for every merge into `main`.
2. The instruction identifies every artifact in the mandatory impact assessment.
3. The template captures merge evidence, update/no-update reasons, limitations, risks, handoff, and next gate.
4. `PROJECT_INDEX.md` links to the template.
5. The instruction explicitly prevents the Documentation Agent from approving release, hosted CI, or risk closure without evidence.
6. Documentation changes pass Markdown/link-oriented checks that are available in the repository, plus `git diff --check`.

## Risks and Constraints

- A mandatory review can create repetitive records. The no-update rationale avoids unnecessary edits while preserving an audit trail.
- The repository currently has no automated merge-event integration. This design creates the operating rule and artifact first; automation remains a future, separate decision.
- Phase 1 hosted-CI confirmation remains an existing follow-up and is not closed by this design.

## Recommended Next Step

Human reviewer confirms this spec. Then the Implementation Planning Agent creates the small execution plan before any instruction/template changes begin.
