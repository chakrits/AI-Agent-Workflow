# Issue #133 Ubuntu Runtime Gate — Independent Code Review

## Review Context

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #133 / PR #135 |
| Reviewer Role | Independent Code Reviewer; did not implement the change |
| Reviewed Commit | `2ef863a34ca03881dbfd90d2abd52d6a286c9994` |
| Accepted Parent | `760168ab80278a66d8fd7951c00201150f4eecff` |
| Governing Decision | Human Maintainer decision dated 2026-08-02: local macOS Node 22 plus hosted Ubuntu Node 22 and Python 3.12 are the increment gate; Windows is unsupported/deferred and N/A |
| Reviewed Scope | `.github/workflows/status-runtime-matrix.yml`, `test/status-runtime-matrix.test.mjs`, `test/fixtures/work-item-status/v1/manifest.json`, and `TASK_LOG.md` |
| Skills | `code-review-gate`, `test-quality-discipline`, and `verification-before-completion` |
| Verdict | **PASS — no open findings** |

## Decision

The implementation faithfully applies the accepted runtime-support decision. The executable GitHub Actions contract now contains exactly two Ubuntu jobs: Node 22 status verification and the independent Python 3.12 JCS reference. Windows is absent from both the workflow and fixture runtime declaration, while the accepted parent documentation and current task history preserve the earlier Windows partial passes, six unrelated full-suite failures, explicit unsupported/deferred status, and separate backlog ownership.

No Critical, Major, Minor, or Question finding remains. No loader, parser, JCS implementation, fixture payload/digest, dependency manifest, or lockfile behavior changed.

## Review Results

| Area | Result | Evidence |
|---|---|---|
| Ubuntu-only executable gate | PASS | `node-status` and `python-jcs-reference` each use literal `runs-on: ubuntu-latest`; both former matrix strategies are absent. |
| Windows boundary | PASS | Workflow parsing and structural tests reject any Windows occurrence; manifest runtimes are exactly `node-22-linux`, `node-22-macos`, and `python-3.12-jcs-reference`. |
| Historical/deferred documentation | PASS | ADR-0018, SDD, implementation plan, project state, work-item and handoff records preserve Windows Python/focused passes, six unrelated full-suite failures, and the Human-owned portability backlog. The added `TASK_LOG.md` row describes removal only from this increment's executable contract. |
| Workflow security | PASS | Pull-request trigger only; top-level `contents: read`; checkout credentials disabled; no secret expression; no write permission. |
| Supply-chain controls | PASS | Checkout, setup-node, and setup-python remain pinned to full 40-character SHAs. Existing lockfile-only `npm ci --ignore-scripts --no-audit --no-fund` remains unchanged; no dependency was added. |
| Resource bounds | PASS | Node and Python jobs retain 15-minute and 5-minute timeouts respectively. |
| Test effectiveness | PASS | Tests parse the real workflow and assert exact runners, absent strategies, absence of Windows, exact action pins/counts, permissions, credential persistence, timeouts, safe install command, and exact manifest runtime array. Assertions are deterministic, self-validating, and network-free. |
| Loader behavior | PASS | Diff inspection confirms no change to loader/worker/parser/JCS source or loader tests. Combined status tests and the complete fixture contract still execute successfully. |
| Scope and dependencies | PASS | The implementation diff contains only the four authorized files; no package or lockfile change and no dead code identified. |

## Verification Evidence

| Command / Check | Result |
|---|---|
| Exact ancestry and changed-file inspection | PASS — `2ef863a` is a direct child of `760168a`; exactly four authorized files changed |
| `node --test test/status-runtime-matrix.test.mjs` | PASS — 4/4 |
| `node --test test/status-loader.test.mjs test/status-runtime-matrix.test.mjs` | PASS — 31/31 |
| `npm test` | PASS — 348/348 |
| `python3 -m unittest discover -s test -p 'test_status_jcs_reference.py' -v` | PASS — 7/7 |
| `python3 scripts/verify_status_jcs.py` | PASS — all 7 frozen JCS vectors verified |
| Independent YAML parse | PASS — pull-request trigger and exactly two named Ubuntu jobs with 15/5-minute bounds |
| Executable-scope Windows search | PASS — no Windows occurrence in the workflow or fixture manifest |
| Loader/dependency diff check | PASS — no change to loader modules/tests, `package.json`, or `package-lock.json` |
| Contract, project-state, dispatch-receipt, skill-parity, ADR, risk, skill-usage, metrics, and context validators | PASS |
| `git diff --check 760168a..2ef863a` | PASS |
| `npm run validate:review-gate` before this record | Expected FAIL — exact implementation commit required this independent canonical record |

## Security and Compatibility Assessment

**Security: PASS.** The change narrows runner selection without weakening permissions, action pinning, checkout credential handling, dependency hydration, timeouts, fixture integrity, or JCS verification. It introduces no secrets, credentials, production mutation, writer/CAS authority, or network dependency beyond the pre-existing pinned Actions and lockfile install.

The fixture runtime metadata now describes the accepted executable support contract rather than historical host coverage. Windows evidence has not been erased or represented as passing; it remains documented as unsupported/deferred. Local macOS Node 22 remains part of the accepted support evidence but is intentionally not a hosted Actions job.

## Limitations and Handoff

- This PASS covers only `760168a..2ef863a` and the four named files.
- Local review verifies workflow structure and behavior available on macOS; it does not substitute for the required hosted Ubuntu Node 22 and Python 3.12 run at the exact reviewed tip.
- Windows remains N/A/deferred for this increment and is not authorized or certified by this review.
- Fresh QA must evaluate the supported hosted evidence. This review does not authorize writer/CAS activation, authority switch, rollback, release, or Go.

## Completion Check

| Item | Status | Notes |
|---|---|---|
| Requirement alignment | PASS | Exact Human runtime decision implemented |
| Correctness / security | PASS | Ubuntu-only, pinned, read-only, bounded jobs |
| Test quality | PASS | Real parsed artifacts and exact negative Windows boundary asserted |
| Regression safety | PASS | 348/348 full suite; no loader or dependency change |
| Historical evidence | PASS | Windows results and deferral remain explicit |
| Open findings | NONE | Ready for hosted Ubuntu rerun and Fresh QA |
