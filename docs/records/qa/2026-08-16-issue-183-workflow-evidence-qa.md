# Independent QA: Issue #183 workflow-evidence/v1 runtime seam

## Verdict

**DONE_WITH_CONCERNS — independent QA passed; one non-blocking module-import observation is recorded.**

The verified implementation commit `cbbb46b8b54d2aacdf39af54cbd2c299e6b5e4af` satisfies the Issue #183 runtime-seam contract within the approved Task 0 boundary. The follow-on engineering code-review record at commit `26ae357f95bd7a6c3ca963127559996dd2368c9b` is separate evidence and was not used as a substitute for this QA run.

This result does not authorize progressive-context activation, replay, live shadow, authority change, lifecycle/retry or dispatch-receipt changes, release, or a final Go/No-Go decision. Human merge approval remains required.

## Metadata and source grounding

- Work item: [Issue #183](https://github.com/chakrits/AI-Agent-Workflow/issues/183)
- Parent scope: [Issue #132](https://github.com/chakrits/AI-Agent-Workflow/issues/132), approved IMP-002 Task 0
- Approved plan: `docs/records/implementation-plan/2026-08-15-issue-132-progressive-context-shadow-plan.md` at the approved plan commit referenced by [Issue #132 comment](https://github.com/chakrits/AI-Agent-Workflow/issues/132#issuecomment-5302932624)
- Normative evidence contract: `docs/records/implementation-plan/2026-08-15-issue-179-evidence-measurement-spec.md`
- Implementation range inspected: `cbbb46b^..26ae357`
- Implementation commit: `cbbb46b8b54d2aacdf39af54cbd2c299e6b5e4af`
- Engineering review record: `docs/records/qa/2026-08-15-issue-183-workflow-evidence-code-review.md`
- QA agent: Independent QA Agent
- Date/environment: 2026-08-16; Node.js `v22.22.3`; local repository checkout
- Mode: Focused functional/API-style contract verification plus full regression and static logic review

The requested local approved-plan path was absent from this checkout. The exact approved plan was retrieved read-only from the plan commit referenced by Issue #132, and the Issue #183 body/comments were retrieved read-only from GitHub API because the local `gh` client could not connect. No external state was changed.

## Acceptance/result matrix

| Criterion | Result | Independent evidence |
|---|---|---|
| Frozen `workflow-evidence/v1` envelope and supported events | PASS | Schema `$id` is `workflow-evidence/v1`; six supported mappings are accepted: `context_loaded`, `context_baseline_observed`, `shadow_compared`, `shadow_fallback`, `rollback_completed`, and existing `human_approval`. Focused tests 1/10 and independent probe passed. |
| Closed event/source/authority/outcome behavior | PASS | Unknown event, source, authority, outcome, top-level field, attribute, and correlation values fail closed. Schema exposes 6 event types, 5 sources, 4 authorities, and 12 outcome values; mapping constraints restrict values per event. |
| Typed correlation IDs and required references | PASS | Measurement correlation is required for context/baseline/approval records; pair correlation is required for paired shadow events; wrong, empty, extra, and missing IDs were rejected. Required `reason`, `digest_ref`, and `evidence_ref` cases were rejected when applicable. |
| Explicit token semantics | PASS | `available`, `unsupported`, `not_requested`, and `unavailable` were independently exercised. Numeric tokens are required only for `available`; N/A statuses reject numeric values. Baseline boundaries 0, target, and target+1 produced success/success/failure as required. |
| Timestamp and field boundaries | PASS | Invalid calendar date, non-leap date, hour/second overflow, non-UTC offset, lowercase/missing UTC marker, blank references, negative/fractional token values, and empty IDs failed closed. Valid leap-day fractional RFC 3339 UTC timestamp passed. |
| Deterministic canonical JSON and fail-closed validation | PASS | Writer output matched `canonicalEvidenceJson`; two appends were byte-for-byte deterministic; malformed JSONL, blank JSONL lines, non-canonical records, duplicate identities, and invalid records failed validation. |
| Canonical writer/API behavior | PASS | `writeEvidence(record, destination)` validates before creating/changing a destination, creates nested directories, appends one canonical line, returns the normalized destination/bytes, preserves input, rejects duplicate identities, and leaves rejected files unchanged. |
| Validator command, exit status, package/CI wiring | PASS | Valid CLI input exits 0 and prints the pass message; invalid CLI input exits non-zero. `package.json` exposes `validate:workflow-evidence`; `.github/workflows/validate-contracts.yml` runs it after contract validation. |
| Dispatch receipt boundary and non-goals | PASS | No tracked files under `docs/records/dispatch-receipts/` changed; the current tree contains only `.gitkeep`. Writer rejects receipt-directory destinations and preserves the fixture receipt. Changed-file scan found no progressive loader, replay/live-shadow, authority, lifecycle/retry, or dispatch semantics. |
| Test quality and regression | PASS | Focused evidence tests are 10/10; full regression is 424/424. Tests are isolated with temporary directories, use no network/live services/mocks, assert observable output/state, and clean up temporary data. |

## Independent adversarial probe

The probe was run outside the Developer-owned test files and completed:

```text
INDEPENDENT_QA_PROBE_PASS checks=74
```

Coverage included all six supported event mappings and their legal outcome mappings, all four token-measurement statuses, baseline token boundaries, unknown/extra/empty/malformed values, timestamp boundaries, canonical writer bytes, input non-mutation, duplicate identity rejection, malformed existing-file preservation, dispatch-receipt destination rejection, and validator CLI zero/non-zero behavior.

## Required command evidence

| Command | Result |
|---|---|
| `npm ci` | PASS — 6 packages installed; no tracked file change |
| `npm test` | PASS — 424/424 |
| `node --test test/workflow-evidence.test.mjs test/validate-workflow-evidence.test.mjs` | PASS — 10/10 |
| `npm run validate:contracts` | PASS — `Contract validation passed.` |
| `npm run validate:workflow-evidence` | PASS — `Workflow evidence validation passed.` |
| `npm run validate:review-gate` | PASS — merge-base `0f9e176..HEAD`; 4 script/test files; 1 code-review record |
| `npm run validate:project-state` | PASS — `Project state validation passed.` |
| `npm run validate:dispatch-receipts` | PASS — `Dispatch receipt validation passed.` |
| `git diff --check cbbb46b^ HEAD` | PASS |
| `git show --check cbbb46b` | PASS |
| Schema smoke check | PASS — 6 event types, 12 outcome values, `additionalProperties: false` |

The first command attempt before `npm ci` failed only because dependencies were absent (`ERR_MODULE_NOT_FOUND` for `ajv`/`yaml`). After the locked dependency install, the exact required suite passed. This is recorded for evidence completeness, not as a product failure.

## Static logic review sub-check

The changed production logic triggers the static-logic-review sub-check because it changes validation branches, outcome mapping, canonicalization, and write side effects. Source-level traces covered:

- happy paths for every supported event and legal outcome mapping;
- available, unsupported, not-requested, and unavailable token states;
- zero, exact-target, and over-target baseline counts;
- missing/wrong/extra correlation, reason, digest, evidence, and attribute values;
- invalid UTC dates and timestamp boundary forms;
- malformed, non-canonical, blank, duplicate, and pre-write-invalid JSONL;
- receipt-directory rejection and unchanged destination content.

No `SLR-` contradiction was found. These traces complement, but do not replace, the runtime evidence above.

## Test-quality assessment

PASS under the test-quality-discipline checklist:

- focused suite completes in approximately 210 ms;
- temporary filesystem boundaries are isolated per test and cleaned up;
- assertions target canonical bytes, specific errors, statuses, identity behavior, exit status, and unchanged content;
- no live database, network, or production receipt is used;
- no test-only production hook or weakened assertion was introduced.

Boundary-value analysis was applicable to token counts and covered 0, exact target, and target+1. Browser/E2E testing is not applicable because this is a repository schema/Node CLI seam with no UI surface.

## Findings and concerns

No Critical, Major, or Minor in-scope defect was identified. No Developer rework is required for the approved Task 0 contract.

### QA-OBS-01 — informational, non-blocking

- Location: `scripts/validate-workflow-evidence.mjs:90`
- Reproduction: `node -e "import('./scripts/validate-workflow-evidence.mjs')"`
- Actual: module import throws `TypeError [ERR_INVALID_ARG_TYPE]` because `process.argv[1]` is undefined before the CLI guard can evaluate.
- Expected: importing the module should not execute the CLI guard or throw; the exported `validateWorkflowEvidence` function should remain importable from a no-script Node process.
- Scope judgment: the named supported validator interface is the CLI command, which passes; the repository test runner imports the function successfully. This is therefore recorded as an informational robustness observation, not a merge-blocking Issue #183 defect.
- Suggested owner: Developer Agent may harden the CLI guard in a follow-up if direct programmatic imports from `node -e`/stdin are intended.

## Scope and non-goals checked

- Existing dispatch receipt lifecycle/schema semantics: unchanged; no receipt records were modified.
- Lifecycle states, retry budgets, handoff/dispatch semantics, and authority: unchanged.
- Progressive loader or context activation: not implemented or exercised.
- Historical replay and live shadow: not run; correctly remains blocked until this prerequisite is merged and referenced.
- Host activation, native token telemetry, fallback-rate measurement, rollback rehearsal, Go/No-Go, release, and compatibility removal: not claimed or authorized.
- Browser accessibility/E2E: not applicable to this non-UI change.
- Security approval: no new auth, secrets, permissions, or sensitive-data path was introduced in the reviewed scope; this QA result is not a security approval.

## Files and commits

Implementation/review files inspected in `cbbb46b^..26ae357`:

- `.github/workflows/validate-contracts.yml`
- `docs/contracts/schemas/workflow-evidence.schema.json`
- `docs/records/qa/2026-08-15-issue-183-workflow-evidence-code-review.md` (existing engineering review; not modified)
- `package.json`
- `scripts/lib/workflow-evidence.mjs`
- `scripts/validate-workflow-evidence.mjs`
- `test/validate-workflow-evidence.test.mjs`
- `test/workflow-evidence.test.mjs`

This QA record is the only new file. No production code, Developer-owned tests, existing QA records, project-state files, or receipt files were changed.

## QA handoff and merge readiness

- Acceptance Criteria Verification Status: **PASS within Issue #183 / IMP-002 Task 0 scope**
- QA Evidence URL: this record; GitHub Issue #183 is the required external evidence location after handoff
- Verified implementation SHA: `cbbb46b8b54d2aacdf39af54cbd2c299e6b5e4af`
- QA record SHA: added in the atomic documentation commit for this handoff
- Platform activation record: N/A — no host activation was performed
- Stop reason: `human_approval_required_for_merge`
- Recommended next owner: Human Maintainer
- Next action: exactly one — `Human review` of this QA evidence and merge decision
- Merge readiness: **Ready for Human review/merge from the independent QA gate, with QA-OBS-01 informational follow-up only**
- Human approval still required: merge approval; no runtime activation or authority decision is implied

## Completion checklist

| Item | Status |
|---|---|
| Required QA artifact produced | PASS — this new independent QA record |
| Required tests/checks complete | PASS |
| Findings and limitations documented | PASS |
| Engineering review kept separate | PASS |
| Existing records/code/receipts preserved | PASS |
| Human approval gate preserved | PASS |
| Next owner/action unambiguous | PASS — Human Maintainer / Human review |

Skills used: `qa-playwright-testing` (scope applicability and test discipline), `functional-test-design`, `test-quality-discipline`, `static-logic-review`, `verification-before-completion`, and `git-workflow-and-versioning`.
