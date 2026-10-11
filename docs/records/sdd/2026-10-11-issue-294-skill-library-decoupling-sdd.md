# Software Design Document — Issue #294

## Metadata
- Work Item: https://github.com/chakrits/AI-Agent-Workflow/issues/294
- Owner: SA/Orchestrator; Status: Approved — Human Maintainer, 2026-10-11.
- Baseline: `87a0917f1c56859926097468c99023918dd314a7`.
- Decision: accepted ADR-0036. Authoritative ACs: [requirements](../requirements/2026-10-11-issue-294-skill-library-decoupling.md).

## Context
The current skill library is a closed inventory enforced through three mirrors, catalog/vault entries, live text tests, description/context budgets, and compatibility SHA fixtures. It increases contributor effort and can fail CI for otherwise valid instruction edits. EV-01–EV-06 establish the actual coupling; this design changes the requirement rather than suppressing failures.

## Goals / Non-goals
Goals: independently editable supported library paths; optional discovery documents; mandatory CI independent of their inventory/content; retained core contract/integrity/security/readiness checks; reproducible contributor acceptance.

Non-goals: no native-loader rewrite, auto-sync requirement, blanket docs exemption, arbitrary shell execution, branch protection change, Issue/lifecycle bypass, #284 evaluation implementation, or production data migration.

## Architecture Overview

| Layer | Target responsibility | Enforcement |
|---|---|---|
| Core policy | AGENTS.md, bootloader, canonical routing/quality/handoff policy | Core hash/path/authority and behavioral contract checks remain |
| Core executable framework | Task-state machine, readiness, evidence, projection, validators | Existing meaningful runtime/unit/negative tests remain |
| Optional instruction library | Three skill trees and existing `.agents/workflows` markdown | Platform-local availability; no global inventory/mirror gate |
| Optional discovery | Skill catalog and vault skill links | Editorial convenience; omission or drift does not gate CI |
| Optional audits | Existing diagnostic algorithms | Manual `audit:skills` / `audit:skill-usage`; real failures reported only on explicit invocation |

Core policy has precedence over extension content. Core responsibilities (TDD where applicable, review, security, evidence, human approval) are stated independently of whether a supporting skill exists. Selecting a missing skill falls back to the base role and its governing policy; it never waives that policy.

## Component Design

### Discovery and platform copies
Each platform directory is independently editable; there is no required canonical inventory for CI. `.agents/skills` remains a convenient portable library, not a registry controlling `.agent` or `.claude`. A catalog may point to a subset of useful skills. No inventory generator is introduced as a build/merge dependency. Existing copies remain in place; removing or renaming a role-required skill does not weaken the core requirement it supported.

### Mandatory and optional checks
Retire catalog/parity/usage invocations from both mandatory CI configurations, hooks, and reset verification. Reclassify live library inventory/text tests as optional audit checks or remove only the superseded assertions. Preserve pure audit-algorithm tests with synthetic fixtures. Preserve mixed-test core assertions by separating them, not discarding whole files.

`audit:skills` may compose catalog/parity diagnostics; `audit:skill-usage` reports notation. Their process results remain truthful, including nonzero on diagnostic failures. Neither is called by mandatory jobs, default tests, edit/session/subagent hooks, or reset verification. Adding `continue-on-error` or broad `|| true` does not satisfy AC-05.

### Context source matrix
Introduce `context-source-matrix/v3` for current core-only inputs. Keep the 11 roles and two load modes. Boot rows continue to require exactly AGENTS.md plus core bootloader. On-demand rows contain boot sources, four core shared policy sources, and the existing role-specific route document. Catalog and `.agents/skills/*/SKILL.md` are removed from current requiredSources.

Retain `allowedSkillIds: []` as a reserved field in v3; it grants no skill authority and imposes no inventory test. Replace role route-plus-skill tuples with route-document mapping. Stop reading the catalog unconditionally in `validateSourceMatrix`. Core file paths, source digests, allowed trigger reasons, exact source-set checking, legacy authority, and fallback behavior remain enforced. Context pack schema stays v1; old matrix v2 input is rejected as unsupported at the current validator boundary, not silently migrated.

Historical v2 evidence remains untouched. Tests that need historical inputs use frozen/synthetic specimens rather than checking their skill bytes against the current library. `repin:source-matrix` remains a core-source maintenance tool; skill/catalog/work-instruction edits do not invoke it.

### Budget and instruction policy
Exclude catalog from `CANONICAL_FILES`/edit-trigger budget lists. Keep 2,500-token bootloader, 1,500-token role, and 30,000-token core-reference limits. Remove 160/5,500 description limits from mandatory acceptance; optional diagnostics may still describe former thresholds. Update AGENTS.md, bootloader, role/workflow guidance, evaluation checklist, and catalog instructions consistently. Core documents remain governed and pinned; work instructions under `.agents/workflows` are optional extensions, not replacements for `docs/workflow` policy.

### Merge boundary
Readiness evaluator, GitHub App identity, ruleset, Issue links, lifecycle labels, and QA evidence remain unchanged. CI library independence is not a skill-only PR exemption. Default-branch trusted-module loading remains intact. No live workflow/ruleset change is made by this design branch.

## API Contract
N/A — no HTTP endpoints, OpenAPI, pagination, auth, or versioned product API. Internal matrix contract changes explicitly from v2 to v3; pack remains v1. Unsupported version and invalid core inputs continue to return invalid diagnostics/fallback through the existing public functions.

## Data Model / Data Impact
Only tracked context fixtures/configuration change; no database, PII, or production data. Migration: author v3 current matrix → revise validation/tests → regenerate core SHA values → verify. No historical evidence backfill. Rollback restores matching script and matrix versions together.

## Error Handling
- Optional-library absence/drift: no mandatory error; explicit audit may report it.
- Missing/stale core source, invalid path/role/authority: reject; shadow adapter returns authoritative legacy result with diagnostic evidence.
- Matrix v2 supplied to v3 validator: reject unsupported version; no permissive fallback registration.
- Unknown skill in extension content: no catalog requirement; execute only authorized task behavior under core rules.

## Security Considerations
Targeted Security Reviewer verifies that only library bookkeeping was retired. Core source integrity, security-routing requirements, human gates, trusted default-branch readiness module, and no execution of untrusted instruction snippets remain. A malicious extension cannot gain precedence or permission by being installed. Do not generalize the exemption to executable scripts, auth, secrets, or all markdown in core policy directories.

## NFRs
- Contributor maintenance: zero companion edits outside chosen library files for AC-01–AC-04.
- Reliability: all specified library probes pass mandatory local checks; any retained core negative still rejects.
- Scalability: no hardcoded skill count/domain order or cumulative library-description budget in mandatory checks.
- Observability: manual diagnostics plus exact-commit command logs and Issue acceptance matrix.
- Latency/SLA/load target: N/A — no service-performance claim; retain existing core budgets as above.

## Alternatives Considered
| Option | Assessment |
|---|---|
| Remove only CI catalog step | Rejected: EV-05 proves default tests still fail |
| Raise description limits / auto-generate all mirrors | Rejected: maintenance changes but registry dependency remains |
| Mark validators continue-on-error | Rejected: obscures boundary instead of separating optional audits |
| Disable all CI/readiness | Rejected: exceeds skill scope and removes core assurance |
| Optional library, core-only mandatory contracts | Accepted: achieves contributor goal and preserves core checks |

## Decision
Human Maintainer accepted the final option and all artifacts on 2026-10-11; ADR-0036 is Accepted. Issue #283 remains historically complete; mandatory enforcement is retired through the approved implementation, not by this approval-only documentation commit.

## Testability Notes
Use isolated clones with exact branch SHA, perturb one library condition at a time, and record unchanged companion-file hashes. Execute the entire mandatory command set, not only the catalog script. Independently mutate retained core hashes/authority/readiness metadata and require rejection. Native platform smoke results are separately Observed/Unavailable; CI is not activation proof.

## Related Artifacts / Links
| Artifact | Purpose | Reference |
|---|---|---|
| TDD | Exact module changes/migration | [TDD](../tdd/2026-10-11-issue-294-skill-library-decoupling-tdd.md) |
| Implementation Plan | Ordered slices and gates | [Plan](../implementation-plan/2026-10-11-issue-294-skill-library-decoupling.md) |
| Test Plan | Inputs/outputs and traceability | [Tests](../qa/2026-10-11-issue-294-skill-library-decoupling-test-plan.md) |
| Evidence | Actual observations versus pending acceptance | [Evidence](../qa/2026-10-11-issue-294-skill-library-decoupling-evidence.md) |
