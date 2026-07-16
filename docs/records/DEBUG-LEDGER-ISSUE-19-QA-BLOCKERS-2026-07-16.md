# Debug Ledger — Issue #19 QA Blockers

| Run | Repro / Observation | Result | Conclusion |
|---|---|---|---|
| QA-001 | QA inspected PR #20 and Issue #19 against all AC. | GitLab guidance absent; readiness test is regex-only; project state stale. | QA block is reproducible from repository artifacts. |
| QA-002 | Traced `pull_request` event types in `work-item-readiness.yml`. | `labeled` / `unlabeled` observe PR labels only, not linked Issue labels. | The workflow cannot react directly to later Work Item label removal. |
| QA-003 | Reviewed inline readiness script and its test. | Decision logic is embedded in Actions YAML; test only asserts text presence. | Extract a pure decision function and test representative inputs. |
| DEV-001 | Ran `node --test test/work-item-readiness.test.mjs` after adding source-label and same-repository assertions. | The pre-remediation module accepted both invalid cases. | The original tests did not protect the closeout source or repository boundary. |
| DEV-002 | Re-ran focused readiness, contract, and project-state tests after extracting the module into the workflow adapter. | Valid, missing, same-repository, QA-evidence, and closeout-source/file cases pass. | The workflow now invokes the tested decision function rather than duplicate inline decisions. |

## Root Cause

The readiness policy was specified correctly, but its implementation had no executable unit seam, assumed an unavailable linked-Issue label event, and did not synchronize project records after the implementation handoff.

## Fix Direction

1. Add a pure readiness decision module with valid/missing/exempt tests.
2. Keep GitHub Actions as a read-only adapter; require it to evaluate the current Work Item on every PR event and document that label removal is caught by required merge checks/re-run rather than an Issue-label webhook.
3. Add durable GitLab setup/limitation guidance and synchronize project records/handoff.

## Remediation Result

- `scripts/work-item-readiness.mjs` is now the pure, unit-tested decision seam. The GitHub adapter checks out the trusted default-branch copy and imports it; the adapter only obtains GitHub API data and reports returned errors.
- `docs/workflow/platform-readiness.md` records the full GitHub/GitLab label taxonomy, GitLab template/CI/manual boundary, and the fact that linked Issue label changes do not emit `pull_request` events.
- GitHub continues to run the read-only check on pull-request events. When QA changes a linked Issue label, QA must rerun the PR check before requesting human review; a write-capable automatic rerun design is intentionally deferred to a separately approved work item.
