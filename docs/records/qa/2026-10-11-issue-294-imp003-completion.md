# IMP-003 completion checkpoint — Issue #294

## Scope / completion contract
Developer implementation and scoped independent code review of IMP-003 are complete. Overall Issue acceptance and merge readiness are NOT complete.
Base: `840d21e96c06a194286d880c2abf6cac8f37cce6`; reviewed code: `940be1a203c8688d1a77c4816340c2ff85f25ccc`.
Done when: core-only matrix/budget/guards implemented, RED/GREEN and core-negative evidence recorded, independent scoped review consumed.
May proceed through: approved implementation, verification, records and branch publishing. Must stop for: new policy/scope decisions, release and human merge. Assumptions: approved ADR-0036/OQ decisions stand; none added.

## Implementation / preservation
- Current source matrix v3:22 rows,11 roles/two modes; exact two boot sources, seven on-demand core sources, reserved `allowedSkillIds:[]`.
- Catalog and canonical skills are no longer current required sources. All99 retained core source occurrences across14 unique paths, hashes and trigger lists match the baseline byte-for-byte.
- v2 rejected at the current boundary; missing/null/object/nonempty reserved skill field rejected. Core role/row/order/path/duplicate/missing-file/hash checks retained.
- `context-pack/v1`, shadow authority/fallback and historical compatibility corpus/manifest unchanged. Historical evidence is not rewritten.
- Core budget excludes catalog; limits unchanged. Core24481/30000 approximate tokens, headroom5519; boot1721/2500, each role below1500. Not measured model input tokens.
- Optional skill/catalog/workflow edits schedule no edit guards. Core repin/budget guards and Claude role-adapter parity remain. No actual skill/catalog content changed.
- Atomic code commits: `557e132` (matrix/validator/tests), `940be1a` (budget/guards/tests/doc). No dependency added; no suppressed failure or test skip.

## Runtime evidence / CP-1
| Check | Actual result |
|---|---|
| New matrix tests before implementation |3 tests:1 pass,2 fail; missing catalog read and accepted v2 expose old coupling |
| New matrix tests after implementation |3/3 pass |
| Matrix/context/shadow/repin focused regression |28/28 pass |
| Budget/guard tests before implementation |21 tests:16 pass,5 fail; catalog requirement and optional/role validator scheduling |
| Budget/guard tests after implementation |21/21 pass |
| Full suite at code candidate |773 passed,0 failed/cancelled/skipped/todo; exit0 |
| Baseline retained-source/trigger comparison |22 rows,99 occurrences,14 paths unchanged; historical corpus/manifest diff empty |
| Current configured validators |17/17 exit0; inventory below |
| `housekeeping:worktrees` |exit1; six unrelated pre-existing prunable local worktrees; dry run only, none deleted |

Commands: `node --test test/core-source-matrix.test.mjs test/validate-context-compatibility.test.mjs test/context-shadow-adapter.test.mjs test/repin-source-matrix.test.mjs`; `node --test test/edit-guards.test.mjs test/validate-context-budget.test.mjs`; `npm test -- --test-reporter=tap`; `git diff --check`.
Executed npm inventory: `validate:contracts`, `validate:project-state`, `validate:dispatch-receipts`, `validate:workflow-evidence`, `housekeeping:worktrees`, `validate:skill-parity`, `validate:skill-catalog`, `validate:adapter-parity`, `adr:audit`, `validate:risk-register`, `validate:review-gate`, `validate:clearable-refs`, `validate:skill-usage`, `validate:metrics`, `validate:context-budget`, `validate:status-projection`, `validate:ci-parity`, `validate:context-compatibility`.
Inventory derived from current GitHub/GitLab files plus project-state/context checks. Dependency installation was reused from the locked installation, not rerun as hosted `npm ci` evidence. Full tests used authorized execution for readiness tests' temporary worktree-root fixture writes.
Local full-test output: `/private/tmp/issue294-imp003-full.log`; terminal results observed, not immutable hosted logs. CP-1 core regression is green; CP-1 ALL configured commands is not green because local housekeeping failed. This does not waive that check or authorize cleanup. Orchestrator/Human owns separate worktree disposition before a full readiness claim.

## Security / evaluation
Developer checklist: production settings DEBUG, SQL, CORS, endpoint permissions/throttling, sensitive logging and credentials N/A — no product/endpoint surface touched. Applicable validation boundary: optional instructions versus mandatory core source integrity/authority. Core negative tests remain load-bearing; limits and generic readiness unchanged.
Independent scoped [review](2026-10-11-issue-294-imp003-code-review.md) PASS. Final independent QA/Security acceptance remains IMP-006; this is not security-complete.
Evaluation checklist: scope, source grounding, no silent assumptions, artifact/evidence, minimal change, quality gate, limits and next action checked. ADR-0036 records the approved exclusion decision. No new dead code or dependencies identified in this slice. Lint/type/build N/A: repository uses Node tests/validators, no configured compiler/build task for these scripts.

## Next work / limitations
Next planned task: Developer IMP-004 — mandatory CI/npm/hooks/reset call-graph decoupling. No successor dispatched in this checkpoint. IMP-005 policy/discovery and IMP-006 contributor/hosted/independent acceptance remain pending. Native activation not run. No PR created or merge performed; all12 Issue AC outcomes remain Pending.
Local worktree housekeeping failure is explicitly unresolved; no blanket CI/readiness PASS claim. Do not prune other chats' worktrees without inspecting ownership and recoverability.
