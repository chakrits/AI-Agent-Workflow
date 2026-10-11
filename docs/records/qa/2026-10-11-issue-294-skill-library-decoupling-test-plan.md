# Test Plan — Issue #294

## Metadata
- Work Item: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Owner: QA role; Date: 2026-10-11; Status: Draft.
- Sources: approved-after-review requirements AC-01–12, SDD/TDD, EV-01–06 baseline. Design source is currently Draft; no candidate pass is claimed.
- Mode: functional design for framework changes; no browser/application automation.

## Scope / Objectives
In scope: skill/work-instruction contributor flow; CI/hook/reset command graph; core context integrity and readiness regression; evidence/rollback traceability. Out of scope: product APIs/UI, deployment, native activation guarantees, unapproved skill-only readiness exemption.

## Business Flow / Function Specification / IPO
| Function | Input / Precondition | Processing | Observable outcome |
|---|---|---|---|
| F-01 Add/edit instruction | Approved candidate SHA, one supported library edit | Run actual mandatory local command set | Exit 0; companion files unchanged |
| F-02 Explicit audit | Optional malformed/drifted library specimen | User invokes audit command | Accurate diagnostic and exit status; never triggered by F-01 |
| F-03 Core context validation | v3 core sources and hash/path/authority fields | Exact source/role/mode validation | Valid inputs pass; invalid core inputs reject/fallback |
| F-04 Readiness | Linked Issue, PR/lifecycle/QA metadata | Trusted default-branch evaluator | Valid metadata passes; missing/invalid metadata fails |

## Test Types In Scope
Unit, integration, regression, retained-core negative mutations, contract validation, and static instruction review. API/E2E/load-performance: N/A — no product endpoints/UI/load target. Security baseline: core authority, trust/approval, and readiness controls. Dedicated security review is required for the validation boundary.

## Environment / Shared Executable Procedure
Use Node 22, locked dependencies, git clone/worktree with expected origin and exact candidate commit. Each case gets a disposable copy; never alter the developer checkout. Record OS/runtime, original/final file hashes, command inventory, stdout/stderr and exit status. Required network checks use read-only authorization; tokens are not persisted.

Steps for every passing contributor case: (1) capture exact candidate SHA and hashes of catalog, vault, all other platform copies, matrix, package/CI files; (2) apply only the stated fixture edit; (3) run default tests and every remaining mandatory GitHub/GitLab validator from their parsed configuration; (4) compare companion hashes and confirm no generated companion edits; (5) record results by case/AC. For rejection cases invoke the specified validator and require invalid/failure rather than merely a warning. Restore/dispose the copy after capturing logs.

The future `scripts/verify-skill-decoupling.mjs` harness is a QA command, outside default `npm test`; it must not recursively spawn itself through test discovery. Fast default tests use controlled fixtures and core/config contracts. Hosted default-branch results are collected after human-approved merge, not synthesized locally.

## Detailed Test Cases / Requirement Mapping
All expected outcomes below are proposed design outcomes. Current implementation results remain Pending in the Issue matrix.

| Case | AC | Priority | Exact edit / action | Expected result |
|---|---|---|---|---|
| TC-HC-001 | 01 | High | Add only `.agents/skills/probe/SKILL.md`, name `probe`, description `Use for a controlled QA probe.` | Mandatory exit 0; catalog/vault/mirrors/matrix unchanged |
| TC-HC-002 | 02 | High | Repeat TC-HC-001 only in `.claude/skills`, then only in `.agent/skills` | Each independent case exits 0; other trees unchanged |
| TC-HC-003 | 03,07 | High | Append harmless prose to existing `dynamic-workflow/SKILL.md` in one tree | Exit 0; no repin or mirror update |
| TC-HC-004 | 03 | High | Add `references/probe.md` and `templates/probe.md` in one skill | Exit 0; no index/fixture edits |
| TC-HC-005 | 03,06 | High | Append harmless prose to existing `.agents/workflows/dynamic-workflow.md` | Exit 0; no wording-test or registry maintenance |
| TC-EP-001 | 04 | High | Remove one skill catalog row; add a stale row; duplicate one row in separate copies | All three mandatory runs exit 0 |
| TC-EP-002 | 04 | High | Remove/duplicate/stale a vault skill link in separate copies | All three mandatory runs exit 0 |
| TC-EP-003 | 04,08 | High | Remove optional catalog file entirely; separately remove only the vault skill subsection, retaining core index links | Mandatory exit 0; no native activation claim |
| TC-BVA-001 | 04 | Medium | Description strings of exactly 159,160,161 Unicode code points; include emoji variant | All six mandatory runs exit 0; old limit not reintroduced |
| TC-BVA-002 | 04 | Medium | Controlled descriptions total exactly 5,499/5,500/5,501 code points | All three mandatory runs exit 0 |
| TC-HC-006 | 04,07 | High | Expand optional catalog beyond the old aggregate-budget contribution | Exit 0; core-only budget measures core files only |
| TC-HC-007 | 09 | High | Add a normal task-log row without skill notation | Mandatory exit 0; unrelated log schema rules still apply |
| TC-REG-001 | 05,06 | High | Inspect parsed CI/npm/hook/reset call graph and default test discovery | No automatic audit/live-inventory invocation; generic CI parity passes |
| TC-REG-002 | 05,07 | High | Plan edit guards for catalog, three skill paths, workflow markdown | No library repin/budget/parity guard; core edits retain their guards |
| TC-HC-008 | 08 | High | Static review AGENTS/bootloader/roles/catalog/evaluation instructions; simulate no matching skill | Optional selection/base-role fallback agrees; core requirements still apply |
| TC-NEG-001 | 07 | High | Alter AGENTS.md bytes without core repin; repeat missing source/unknown path/invalid role | Each core context input rejects; no permissive registry fallback |
| TC-NEG-002 | 07 | High | Invalid authority, duplicate core source, stale hash, unsupported v2 matrix | Each rejects with diagnostic/fallback preserving legacy result |
| TC-NEG-003 | 07,08 | High | Omit security route/human approval in a core scenario | Existing behavioral policy test/review rejects; optional skill does not waive gate |
| TC-NEG-004 | 10 | High | Invalid same-repository Issue; missing applicable phase/spec/dev/QA evidence in separate readiness fixtures | Required readiness fails in every applicable negative |
| TC-NEG-005 | 09 | Medium | Explicitly run manual audit on drifted/malformed specimen | True diagnostic/nonzero when appropriate; automatic mandatory run still passes |
| TC-REG-003 | 11 | High | Final PR checks then later default-branch audit | Record exact head/merge SHAs, run URLs/statuses, required check identity; missing runs Pending |
| TC-REG-004 | 12 | Medium | Revert owning slice in disposable clone with matching matrix/validator versions | Retained checks pass for restored version; rollback ordering documented |

## Decision Table / State Transition Coverage
| Rule | Optional library valid? | Core contract valid? | Readiness metadata valid? | Mandatory local / readiness outcome |
|---|---|---|---|---|
| Rule-01 | Yes | Yes | Yes | Pass / Pass |
| Rule-02 | No or absent | Yes | Yes | Pass / Pass |
| Rule-03 | Either | No | Yes | Core rejection; cannot call acceptance complete |
| Rule-04 | Either | Yes | No | Local core may pass / required readiness Fail |

Lifecycle: design Draft → approved planning/spec-ready → development → independent verification → human review → merge/default-branch closeout. Invalid transitions (spec-ready while Draft; QA Pass without SHA/evidence; closeout before merge) are rejected by workflow review. Cases TC-HC-008 and TC-REG-003 cover this; no new runtime lifecycle is invented.

## Coverage Matrix / Techniques
Happy/negative/EP/BVA/decision-table/state-transition/regression techniques apply as above. Numeric boundaries are former metadata limits, not new policy limits; minimum field length 0/1 is tested by optional-audit fixtures only. API functional cases N/A. Every AC maps to at least one case above; the Issue records outcomes. No unresolved criterion is silently treated as N/A.

## Risk-Based Testing / Exploratory Charters
R-01 (likelihood 4 × impact 4 = 16): hidden automatic audit; prioritize call-graph and contributor probes. R-02 (3×5=15): core assurance removed with mixed tests; prioritize core mutations/security review. R-03 (3×4=12): matrix migration breaks shadow fallback; prioritize v2/v3/authority cases. EXP-001: search for new indirect callers and copied policy instructions; report actual paths. EXP-002: optional native skill discovery on available hosts; report observed/unavailable platform behavior separately.

## Entry / Exit Criteria and NFRs
Entry: Human-approved design/ADR/plan, spec-ready, developer evidence and exact implementation SHA. Exit before merge: all in-scope local/core cases verified, independent QA/Security evidence, PR hosted checks, no unexplained regressions. Exit after merge: default-branch evidence and closeout captured. NFRs: zero companion edits; no mandatory skill-count/description caps; retained core budgets and core-negative rejection. No performance SLA was stated.

## Assumptions / Open Questions / QA Handoff / Self-review
Use ASM/OQ from requirements. QA owns final results and signs the Issue matrix; author self-check is not independent QA. Native access gaps do not establish activation. Handoff includes exact SHA, logs, failed-case route and rollback owner; Human approval remains required. Self-review: all ACs mapped, explicit data/results, safe disposable edits, no recursive harness, baseline/candidate separation, and N/A scopes explained.
