# Test Report — Issue #294 / IMP-006

## Metadata
- Work Item: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Candidate: `321055cb543432a50eb0ab2279e0a798e63a5d0c`; baseline: `87a0917f1c56859926097468c99023918dd314a7`.
- Independent QA: `/root/issue294_final_qa`, gpt-6-sol/high; 2026-10-11.
- Environment: Node v22.22.3 / npm10.9.8 / darwin27.0 arm64; isolated locked offline npm ci and private TMPDIR per case, authorized read-only network for mandatory fetch. Lock SHA256 `920a07d65ddbfc6de2afcda9441b78896b8584764aaf322c8a108b2e598b490a`.

## Scope / Test Summary
**PASS_PREMERGE_LOCAL**, not hosted/default-branch/native activation acceptance.

| Type | Total | Passed | Failed | Blocked | Notes |
|---|---:|---:|---:|---:|---|
| Candidate unit/regression | 783 | 783 | 0 | 0 | Full suite inside contributor cases |
| Contributor cases | 27 | 27 | 0 | 0 | Actual CI-derived commands, companion-file SHA comparisons |
| Focused core/readiness negatives | 193 | 193 | 0 | 0 | Retained rejection tests |
| Rollback unit/regression | 808 | 808 | 0 | 0 | Separate clean baseline clone; six matching validators also pass |
| API / browser / load | 0 | 0 | 0 | 0 | N/A: no product service/UI/NFR change |
| Hosted PR / default branch | 0 | 0 | 0 | 2 | Parent records separate premerge/postmerge milestones |

## PR/Issue Comment Summary
**Overall Status:** Pass — premerge local verification only.
27 contributor cases pass, 488 command executions (27×18 plus two explicit audits), 783/783 candidate tests, 193/193 focused negatives; rollback808/808 and six baseline validators. Two manual audits correctly exit1 on introduced drift/notation absence; all mandatory commands exit0. Companion files unchanged; source preserved.
**Defect Severity Summary:** Critical0 · High0 · Medium0 · Low0 · Informational0 outstanding in final candidate.
**Tester's Note:** Hosted PR/default-branch evidence pending. Native activation unavailable: no disposable-clone platform reload/smoke interface. CI success is not native evidence. Human merge approval remains required.

## Cases / command coverage
Parsed15 unique mandatory commands from GitHub validate and GitLab scripts; isolated npm ci replaces installation only, not checks. Each case also runs context compatibility and whitespace checks. Run explicitly from a clean Node22 checkout with expected GitHub origin: `node scripts/verify-skill-decoupling.mjs`. No mandatory CI/npm-test alias invokes this expensive verifier.

Baseline; add-agents/claude/agent; formerly-pinned-skill; reference-template; workflow-prose; catalog/vault remove/duplicate/stale; catalog-absent; vault-skill-section-absent; description159/160/161 each ASCII/emoji; aggregate5499/5500/5501; catalog-over-budget; task-log-no-notation; all-optional-libraries-absent. QA independently rematerialized all27 deltas, checked only declared paths changed, measured Unicode codepoints/aggregate boundaries, and recomputed all488 raw-log hashes. Baseline claims no AC; mappings in cases are scenario-specific, not universal acceptance.

## Failed Tests / Defects / Root Cause Analysis
No outstanding final-candidate defect. Earlier failed and interrupted attempts remain in [experiment ledger](2026-10-11-issue-294-imp006-debug-ledger.md): shared-temp interference hypothesis (not deterministic RCA), omitted historical Git object, sandbox fetch denial, incorrect rollback origin and intermediate fixture branch-name error. Each corrected run states its changed precondition. No test, integrity control or required gate was weakened. Intermediate failed commits are not acceptance evidence.

## Coverage
QA disposition: AC01–10 local Pass; AC12 design/ADR/rollback/#284 impact note Pass locally, final state/handoff parent-owned. AC11 hosted PR and default-branch Pending. Security separately confirms unchanged live ruleset and retained boundaries. The Issue owns the single result matrix; this report is evidence, not a competing acceptance ledger.

## Evidence / provenance
Local raw evidence is retained, not an invented hosted URL:
- Report `/private/tmp/issue294-qa-Q5R5xy9X/tmp/skill-decoupling-evidence-Hfz84T/report.json`, SHA256 `646b5b73b6d9d1281fa6f35fca751bac2bfc8e327cb3073d796fcf3d6c460ec9`.
- Report audit `/private/tmp/issue294-qa-Q5R5xy9X/report-audit.json`, SHA256 `b96d03999fc9eaa366016bdacf6e0a218fb4b54c3e96083212dbbf8d459598ee`.
- Fixture deltas `/private/tmp/issue294-qa-Q5R5xy9X/fixture-deltas.json`, SHA256 `0bc43160f1776498eaf75dab622ccb43adea8279c8c94092906e3a7410298ac4`.
- Negatives `/private/tmp/issue294-qa-Q5R5xy9X/final-negatives.log`, SHA256 `3690db65d24bc96d79171305223fc33309d8861726980c79c18f752b614384e2`.
- Rollback `/private/tmp/issue294-qa-Q5R5xy9X/rollback-test-origin.log`, SHA256 `c803a136067d7bd9894a7e7e3f0e8d18c6c5d01cd1df49f4ca81032e7f51c080`.
- Harness stdout `/private/tmp/issue294-qa-Q5R5xy9X/final-harness-network.stdout.log`, SHA256 `d1e146a3340aecd92c9bcefe1883b0cd7e37996b62c459cc9be56603b560f0ab`.
- [Code review](2026-10-11-issue-294-imp006-harness-review.md); [Security](../security-review/2026-10-11-issue-294-imp006-security.md).

## Release Recommendation / Notes
Go for authorized Draft PR and hosted checks; not merge/release. Default-branch run and closeout only after Human merge. Rollback restores matching baseline validator/fixture/config versions, not v2 fixture under v3 validator. Schema rollback N/A. No unrelated worktree cleanup performed; isolated mandatory housekeeping passes, global existing-worktree audit can still report unrelated old worktrees.
Parent consumed native-awaited terminal `issue294_final_qa:321055c:PASS_PREMERGE_LOCAL` exactly once; handoff event `issue294-imp006-final-qa`, receipt completed. Reviewed SHA remains authoritative; subsequent records-only commit is resolved externally through branch head. Source/scope/AC/boundary/negative/evidence/risks/minimal-change/next-owner evaluation checked; hosted/native/postmerge limits explicit.
