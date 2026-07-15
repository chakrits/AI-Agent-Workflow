# Implementation Plan — Exception-Driven Documentation Sync

## Summary

| Item | Detail |
|---|---|
| Work Item | EXCEPTION-DRIVEN-DOCUMENTATION-SYNC-2026-07-15 |
| Change Type | Workflow automation + documentation governance |
| Risk Level | Medium |
| Branch | `codex/documentation-sync/3` |

## Approved Direction

- The source PR/MR owns its documentation-impact assessment and updates affected project artifacts before merge.
- A post-default-branch state audit opens `documentation-sync` issue only when validation fails.
- GitHub requires the PR assessment marker through a check; GitLab receives the same MR template and retains its default-branch audit.

## Tasks

| ID | Task | Files | Verification |
|---|---|---|---|
| EDS-001 | Add failing regression coverage for a pre-merge documentation gate and failure-only issue workflow. | `test/validate-project-state.test.mjs` | Focused test fails before workflow change. |
| EDS-002 | Replace merge-event issue workflow with a main-state-audit exception workflow; add GitHub PR and GitLab MR templates. | `.github/workflows/`, `.github/`, `.gitlab/` | Focused test passes; YAML parses. |
| EDS-003 | Align canonical Documentation Agent rule, adapter, README, status/log, and review record. | Docs/state files | Full test suite and validators pass. |

## Risks and Rollback

| Risk | Mitigation / Rollback |
|---|---|
| PR authors omit the assessment | Protected branch requires the GitHub check; reviewer verifies its substance. |
| Main state audit fails | It creates one idempotent exception issue keyed to the commit SHA. |
| Workflow behavior is unsuitable | Revert this logical commit; the existing CI checks remain. |

## Handoff

Reviewer focuses on GitHub event/permission boundaries, the PR marker contract, and the fact that normal merges create no issue.
