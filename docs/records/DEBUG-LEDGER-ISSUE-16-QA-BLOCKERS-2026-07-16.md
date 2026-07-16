# Debug Ledger — Issue #16 QA Blockers

| Item | Detail |
|---|---|
| Work Item / Ticket | GitHub Issue #16 / Draft PR #17 |
| Feature / Module | Documentation Impact gate and required project handoff records |
| Owner | Developer Agent |
| Started | 2026-07-16 |
| Current Status | Root cause confirmed; remediation prepared |

## Symptom and Repro

| Field | Detail |
|---|---|
| Observed Failure | Hosted `validate-documentation-impact` check failed; QA also found no completion-check or handoff record. |
| Captured Error | `Missing required Documentation Impact value(s): <!-- documentation-impact: complete -->`. |
| Environment | GitHub Actions run `29508992566`, PR #17 at commit `2444805`. |
| Frequency | Deterministic for the current PR body and commit. |
| Repro Steps | Inspect PR #17 body and run `gh run view 29508992566 --log-failed`; inspect `docs/records/` and `PROJECT_STATUS.md`. |
| Expected | Documentation marker is present and the records promised by project state exist before QA handoff. |
| Actual | The section heading existed but marker and two required artefacts were absent. |

## Fail Path

| Layer | Evidence |
|---|---|
| Entry point | GitHub pull-request workflow `validate-documentation-impact`. |
| Failing condition | The workflow requires both `## Documentation Impact` and `<!-- documentation-impact: complete -->` in the PR body. |
| Relevant input | PR #17 body had the heading but omitted the marker. |
| Parallel QA condition | `PROJECT_STATUS.md` declared completion check and handoff required, while no matching Issue #16 records existed. |
| Last known good state | Previous PRs had passed the check when the marker was present. |

## Hypothesis Matrix

| ID | Hypothesis | Experiment | Result | Status |
|---|---|---|---|---|
| H-001 | The documentation gate failed because the PR description omitted the exact required marker. | Read failed hosted log and compare its required string with PR body. | Log names only the missing marker; heading is already present. | Ruled in |
| H-002 | The check failed because the Documentation Impact heading was missing or malformed. | Read failed hosted log and PR body. | The log reports only the marker, so the heading passed. | Ruled out |
| H-003 | QA's documentation failure is caused by unstaged local work rather than missing evidence artefacts. | Inspect commit/working tree and required-artifact list. | Working tree was clean at `2444805`; two required records were genuinely absent from the commit. | Ruled in for the separate artefact gap |

## Experiment Ledger

| Run ID | Command / Inspection | Observation | Next Action |
|---|---|---|---|
| RUN-001 | QA independent verification | Criteria 1–6 passed; criterion 7 failed on documentation marker and absent completion/handoff records. | Reproduce from CI and records. |
| RUN-002 | `gh run view 29508992566 --log-failed` | Exact missing marker captured from GitHub Actions. | Edit PR body with exact marker. |
| RUN-003 | Inspect `PROJECT_STATUS.md` and `docs/records/` | Completion-check and handoff were required but missing. | Add both records, update state, rerun checks, request QA re-verification. |

## Current Conclusion and Fix Direction

- Confirmed root cause: developer handoff omitted a literal PR-body gate marker and two records required by the project's own status contract.
- Confidence: High.
- Proposed fix: add the marker to PR #17; add completion-check and Developer-to-QA handoff records; update task/status records; rerun local checks and obtain a new hosted result.
- Risk: the original failure is documentation-process only; no runtime or security behaviour changed.
