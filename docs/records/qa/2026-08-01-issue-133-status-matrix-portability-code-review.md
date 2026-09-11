# Issue #133 Status Matrix Portability — Targeted Code Review

## Review Context

| Item | Detail |
|---|---|
| Work Item | GitHub Issue #133 / PR #135 |
| Reviewer Role | Independent Code Reviewer; did not implement the change |
| Reviewed Commit | `52c7b8c4a273d27a3c7346a0e205a970d965f6d3` |
| Reviewed Parent | `090047a7eb11494cbb7504da90a6cb2ed1a9b88e` |
| Scope | `.gitattributes`, `test/status-loader.test.mjs`, `test/status-runtime-matrix.test.mjs`, and referenced status contract fixtures |
| Change Type / Risk | Test and checkout portability correction; Medium because it preserves security/resource-limit evidence |
| Verdict | **PASS — targeted portability review** |

## Decision

The hosted Windows failures are addressed without weakening the Issue #133 evidence contract. All status contract JSON and YAML fixtures are now LF-pinned, and the real memory workload uses `copyFile` instead of filesystem hard links. The workload still contains 1,100 distinct regular files totaling exactly 65,721,700 bytes, reserves 198,291,500 bytes—above the 128 MiB limit—and must return `MEMORY_BUDGET_EXCEEDED`.

No fixture bytes, manifest digests, loader runtime behavior, dependency manifest, or lockfile changed. No Critical, Major, Minor, or Question finding remains in this targeted scope.

## Hosted Windows Failure Closure

| Prior failure / root cause | Resolution and evidence |
|---|---|
| Contract fixture bytes could change at Windows checkout because only selected JSON files were explicitly LF-pinned; YAML parser fixtures remained exposed to CRLF conversion. | `.gitattributes` now applies `text eol=lf` to every `test/fixtures/work-item-status/v1/*.json` and `*.yaml`. `git check-attr` confirms `text: set` and `eol: lf` for all 15 matching fixtures. |
| The 1,100-input memory test constructed hard links, making its setup dependent on hosted Windows filesystem/link permissions and behavior. | The helper now creates ordinary copies with `copyFile`. An independent probe observed 1,100 regular files with 1,100 distinct device/inode identities. |
| A setup failure could leave a partially populated temporary workload directory. | Workload construction removes the directory in its `catch` path, and every successful caller removes it in `finally`. An injected mid-copy failure independently confirmed that the partial directory no longer existed. |

## Verification Evidence

| Check | Result |
|---|---|
| `node --test test/status-loader.test.mjs test/status-runtime-matrix.test.mjs` | PASS — 30/30 |
| `npm test` | PASS — 347/347 |
| `python3 -m unittest discover -s test -p 'test_status_jcs_reference.py' -v` | PASS — 7/7 |
| `python3 scripts/verify_status_jcs.py` | PASS — all 7 frozen JCS vectors verified |
| Independent copied-workload probe | PASS — 1,100 distinct regular files; 65,721,700 aggregate bytes; 198,291,500 reserved bytes |
| Real isolated over-budget fixture execution | PASS — retained exact `MEMORY_BUDGET_EXCEEDED` rejection |
| Independent partial-copy failure probe | PASS — partial temporary directory removed |
| `git check-attr text eol -- <all v1 JSON/YAML fixtures>` | PASS — every matching fixture is `text: set`, `eol: lf` |
| Runtime/fixture/dependency diff inspection | PASS — no changes under contract fixtures, loader runtime modules, `package.json`, or `package-lock.json` |
| Contract, project-state, dispatch-receipt, skill-parity, ADR, risk, skill-usage, metrics, and context checks | PASS |
| `git diff --check 52c7b8c^ 52c7b8c` | PASS |

## Security Review

**Security: PASS.** The portability correction does not weaken raw-byte integrity, JCS digests, isolated-worker behavior, aggregate limits, the 128 MiB resident-memory budget, stable error handling, or fixture immutability. Replacing hard links with distinct regular copies strengthens the fidelity of the aggregate-memory evidence. Cleanup is fail-closed and does not expose sensitive data. No action pins, workflow permissions, secrets, production settings, runtime dependencies, or executable loader behavior changed.

## Limitations and Boundaries

- This review covers only the portability delta at exact implementation SHA `52c7b8c4a273d27a3c7346a0e205a970d965f6d3` against its parent.
- Local execution was on macOS with Node 22 and Python 3; it validates portable APIs and repository attributes but does not replace successful hosted Windows and Ubuntu matrix runs.
- The structural test proves use of `copyFile`; the independent filesystem probe supplies the distinct-regular-file evidence on the review host.
- This PASS does not authorize QA sign-off, writer/CAS activation, authority changes, release, or Go. Human merge authority and hosted CI evidence remain separate gates.

## Completion Check

| Item | Status | Notes |
|---|---|---|
| Scope Match | PASS | Exact portability commit and parent reviewed |
| Hosted Failure Causes | CLOSED | LF conversion and hard-link portability addressed |
| Evidence Strength | PASS | Exact workload totals, memory rejection, fixture integrity, and cleanup retained |
| Security | PASS | No weakened control or new sensitive surface found |
| Dependencies / Runtime | PASS | No fixture, digest, runtime, dependency, or lockfile behavior change |
| Residual Risk | RECORDED | Hosted matrix execution remains required evidence |
| Review Verdict | **PASS** | Ready for canonical review-gate validation |
