# Requirement Discovery — Issue #294

## 1. Request Summary

| Item | Detail |
|---|---|
| Work Item | https://github.com/chakrits/AI-Agent-Workflow/issues/294 |
| Change Type | Framework / Meta Change |
| Business Goal | Add or revise skills/work instructions without unrelated registry, mirror, hash, or CI maintenance |
| Target Users / Actors | Contributors, platform users, maintainers, independent QA |
| Business Criticality | Medium; development friction and review reliability |
| Code Change Required | Yes in a later implementation; this branch is documents only |
| Security/Data Sensitivity | No production data/auth change; review retained validation boundaries |
| Status / Owner | Draft / Orchestrator and BA/SA roles; Human approval pending |

## 2. Confirmed Facts

| ID | Fact | Source |
|---|---|---|
| F-01 | Main baseline has 39 canonical skills and three platform trees | EV-01; `validate-skill-catalog.mjs`, `validate-skill-parity.mjs` |
| F-02 | Catalog/vault registration and description limits can fail CI | EV-02; `validate-skill-catalog.mjs:90-157` |
| F-03 | Default tests freeze domain membership/order and require the CI invocation | EV-03/05; `validate-contracts.test.mjs:16-108`, `validate-ci-parity.test.mjs:111-140` |
| F-04 | Catalog plus 10 distinct role-selected skills are live SHA dependencies | EV-04; `context-compatibility-v1.mjs:16-35,114-152` |
| F-05 | The only currently required ruleset check is readiness, not catalog | EV-06; GitHub ruleset 18992836 |
| F-06 | AGENTS.md requires catalog consultation; native skill paths are plural | `AGENTS.md:59-63,120-130` at baseline |

## 3. Assumptions

| ID | Assumption | Impact if Wrong | Validation Needed |
|---|---|---|---|
| ASM-01 | "No dependency" refers to library bookkeeping, not removing all PR controls | Readiness scope would expand | Human reviews BR-03 before approval |
| ASM-02 | Existing `.agents/workflows/*.md` are the work-instruction extension surface | Additional paths need enumeration | Human reviews paths; no new loader inferred |
| ASM-03 | Optional manual audits are useful but never mandatory | Tools could be retired completely | Human accepts manual-audit retention |

## 4. Open Questions

| ID | Question / proposed answer | Owner | Blocks Progress? |
|---|---|---|---|
| OQ-01 | Keep generic linked-Issue/readiness rules? Proposed yes | Human Maintainer | Blocks implementation scope approval, not drafting |
| OQ-02 | Keep manual audits? Proposed yes, truthful exit codes; explicit opt-in | Human Maintainer | Blocks design approval |
| OQ-03 | Expand beyond the three skill trees and existing workflow markdown? Proposed no | Human Maintainer | Only blocks scope expansion |
| OQ-04 | How will native activation be checked on each platform? Record observed/unavailable, never infer from CI | QA/platform owner | Blocks native-activation claims, not CI-decoupling implementation |

## 5. Scope

In scope: skill metadata/prose and references/templates in `.agents/skills`, `.claude/skills`, `.agent/skills`; existing `.agents/workflows` markdown; optional catalog/vault skill index; mandatory tests/CI/hook/reset coupling; core-only context matrix and budget; policy alignment; independent verification and rollback.

Out of scope: core executable-contract weakening, core policy precedence/approval changes, global CI disabling, branch rules/readiness exemptions, a new skill loader/plugin, artifact execution merely because a skill contains a script, deployment/data changes, native activation guarantees, and #284's corpus implementation. Core `docs/workflow/*.md` remains core policy, not an unvalidated extension directory.

## 6. User Stories

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| US-01 | Contributor | Add/edit a skill or work instruction in one supported tree | Registration, mirrored copies, fixtures, and tests need no companion edits | High |
| US-02 | Maintainer | Mandatory CI checks core behavior rather than library bookkeeping | Skill edits do not make unrelated pipelines fail | High |
| US-03 | Reviewer | Optional diagnostics and commit-pinned acceptance evidence | Library quality remains inspectable without gating every PR | Medium |

## 7. Acceptance Criteria

The Issue owns the single acceptance result matrix. These rows define behavior; they do not record candidate acceptance.

| AC | Story | Given / When | Then — deterministic outcome |
|---|---|---|---|
| AC-01 | US-01 | Add valid `.agents/skills/probe/SKILL.md` only | Mandatory commands exit 0; no companion catalog/vault/mirror/matrix/list changes |
| AC-02 | US-01 | Add a valid skill only in `.claude` or `.agent` | Mandatory commands exit 0 under the same conditions |
| AC-03 | US-01 | Edit a formerly pinned SKILL.md, reference/template, or existing workflow markdown | No repin/mirror/wording-list change; mandatory commands exit 0 |
| AC-04 | US-01 | Skill entries in catalog/vault are stale, missing, or duplicate; description crosses former limits | No mandatory failure solely from these optional-library conditions |
| AC-05 | US-02 | Inspect GitHub/GitLab mandatory commands and hook/reset call graph | No mandatory skill catalog/parity/usage invocation; CI parity passes |
| AC-06 | US-02 | Run default tests with an independently edited library | No live inventory/domain-order/mirror/prose assertions; fixture-based algorithm tests remain valid |
| AC-07 | US-02 | Run core-only context validation and mutate a core source/hash/path/authority | Library content excluded; legitimate core context passes; invalid core context rejects |
| AC-08 | US-01 | Read instructions without a matching skill or catalog | Base-role execution follows core requirements; no mandatory catalog consultation or mirroring |
| AC-09 | US-03 | Omit task-log skill notation or explicitly invoke a manual audit | Missing notation does not fail mandatory checks; manual audit diagnostics are truthful and opt-in |
| AC-10 | US-02 | Submit invalid linked-Issue/lifecycle/QA metadata | Readiness rejects it; ruleset/check identity and protection remain unchanged |
| AC-11 | US-03 | QA verifies final implementation commit | Every AC has exact-SHA evidence and hosted PR/default-branch outcomes; unsupported checks are not Pass |
| AC-12 | US-03 | Prepare integration/closeout | Approved ADR/design, rollback, state/handoff, and #284 impact note exist |

## 8. Business Rules

| ID | Rule | Source |
|---|---|---|
| BR-01 | A library addition needs no change outside the file(s) the contributor chose | User directive; US-01 |
| BR-02 | Optional files may be absent or disagree without blocking mandatory CI | User goal; AC-04 |
| BR-03 | Generic Issue/PR readiness remains applicable; a skill-only bypass is not introduced | ASM-01; proposed scope boundary |
| BR-04 | Core requirements remain mandatory even if their named supporting skill is absent | Core policy and AC-08 |
| BR-05 | Existing historical ADRs/evidence remain historical, not rewritten as though the old gate never existed | Traceability requirement |
| BR-06 | Skill compatibility/activation is distinct from CI acceptance and instruction authority | Native-loader uncertainty; AC-11 |

## 9. Risk / Edge Case Notes

- R-01: Optional audit re-enters `npm test` through live fixtures; verify call graph and adversarial edit cases.
- R-02: Removing mixed tests also removes core safety coverage; split assertions and retain core negatives.
- R-03: Changing source matrix invalidates legacy shadow inputs; use an explicit version migration and fail closed for unsupported versions.
- R-04: Instruction scripts can contain unsafe actions; availability never grants execution permission.
- R-05: A genuinely broken executable change can still fail CI; the promise is absence of library-bookkeeping failures.

## 10. Recommended Next Step

Human Maintainer reviews this requirement, SDD/TDD, plan, and proposed ADR-0036. Approval then enables `phase:planning`/`status:spec-ready` according to the lifecycle contract, not before. No user-facing UI; UX sketch is N/A.
