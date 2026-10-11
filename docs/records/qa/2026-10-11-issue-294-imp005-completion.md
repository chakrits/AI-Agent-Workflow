# IMP-005 / CP-2 checkpoint — Issue #294

## Scope / completion contract
Base: `70c902f6778dc96ca23f7a0d74257295f0788ab5`; candidate: `6d3af2dc88bcf735e7b896e2b47a20c899f129e0`.
Framework/meta, Medium risk; Human-approved SDD/TDD step8, ADR-0036 and Implementation Plan. Overall Issue acceptance remains pending.
Done when: core fallback/discovery policy aligned, owning core hashes repinned, retained gates/regression/budget checked, scoped review consumed and evidence published.
May proceed through: approved implementation, verification and branch publishing. Must stop for: new policy/security decisions, destructive changes, release and human merge. Assumptions: none added.

## Changes / preserved requirements
- AGENTS/bootloader: discovered descriptions and available selected SKILL.md, optional editorial catalog, missing-skill base-role fallback. TDD/review/security/evidence/human gates remain mandatory; extension content cannot override policy or grant permission.
- Core role definitions apply the availability condition to all role contexts/platform adapters; bootloader explicitly qualifies their Associated Skills lists. No per-role copy of the same policy or role-adapter rewrite introduced. Release points to core quality-gates rather than a skill as its sole policy source.
- Evaluation checklist accepts discovered skills or documented base-role fallback; catalog is not an obligatory input.
- README/catalog/vault/operating-model guide describe independently editable libraries, optional registration/mirrors, native format/activation limits, and manual audits. Skill link/inventory rows preserved as editorial data, not mandatory tests. No native activation claim.
- Stabilize-core distinguishes library-only contributions from core rule/routing/executable/security changes; generic Issue/PR readiness unchanged.
- Dispatch contract's current gate examples now name core review/role-adapter controls. Old worked examples remain explicitly historical, not current invocation instructions. No historical records/corpus/manifest rewritten.
- Current budget updated to measured seven-core-file set; limits unchanged. Core24877/30000, headroom5123; boot1767/2500, each role below1500.

## Source integrity / atomic slices
`6671842`: core policy/fallback test + matching current pins, green777/777. `6d3af2d`: optional discovery/docs guidance and dispatch-route pin, green777/777.
Compared with baseline: only67 SHA occurrences changed across five core paths (AGENTS, bootloader, role-definitions, evaluation checklist, dispatch-packet-contract). All source paths/order/rows/roles/modes/triggers/reserved IDs unchanged. Matrix remains v3; pack stays v1.
Repin split at green commit boundaries because dispatch guidance is itself the pinned Orchestrator route. Before its owning repin, compatibility rejected the stale dispatch hash; after repin valid. Final repin is a byte-identical no-op. This is migration maintenance, not a new library dependency.

## Runtime evidence / CP-2
| Check | Actual result |
|---|---|
| Added core-fallback test before policy change |5 tests:4 pass,1 fail (missing optional-catalog/fallback core wording) |
| Same test file after policy change |5/5 pass;0 failed/skipped |
| Full suite after each atomic slice |777/777 pass;0 failed/cancelled/skipped/todo |
| Contracts / context compatibility / budget / diff whitespace |exit0 after owning repins |
| CI-derived mandatory npm-run inventory |13 commands exit0; housekeeping exits1 for six pre-existing unrelated local worktrees |
| Explicit manual audit:skills / audit:skill-usage |both exit0; separate optional observations, not acceptance gates |
| Source matrix comparison / repin |five paths/67 hashes only; no nonhash drift; final repin no-op |

Commands: `node --test test/skill-decoupling-contract.test.mjs`; `npm test -- --test-reporter=tap`; `npm run validate:contracts`; `npm run validate:context-compatibility`; `npm run validate:context-budget`; `npm run repin:source-matrix`; `git diff --check`.
Configured npm-run inventory read from both CI YAMLs: contracts, dispatch-receipts, workflow-evidence, housekeeping:worktrees, adapter-parity, adr:audit, risk-register, review-gate, clearable-refs, metrics, context-budget, status-projection, ci-parity, project-state (validator prefix `validate:` except housekeeping/ADR). Locked installation reused; no fresh/hosted npm-ci claim.
Local logs: `/private/tmp/issue294-imp005-{red,green,core,final,budget,audits,usage}.log`; observed terminal evidence, not immutable hosted logs. Full tests used authorized execution for readiness temporary fixture writes.

## Review / evaluation / limits
Scoped independent [review](2026-10-11-issue-294-imp005-code-review.md) PASS at the exact candidate:91/91 focused tests, budget/compatibility/immutable diff checks; no findings. Final independent QA/Security remains IMP-006. User's lower-model request applies to reviewer (`gpt-6-luna`/high), not a claim of measured token savings.
Evaluation: source/scope/artifacts/TDD/gates/assumptions/minimal changes/risks/next owner checked. No secrets, dependencies, runtime bypass, suppressed error, new authority or lowered budget. Production DEBUG/SQL/CORS/auth/PII/throttling N/A — policy/docs only; retained boundary/security review belongs to final independent Security Reviewer. Build/type/lint N/A: no configured product build; Node tests/validators run.
CHANGES MADE: approved optional-discovery/core fallback wording, current pins, core-only policy test. NOTICED BUT NOT TOUCHING: historical aliases in explicitly historical examples/records, native host loaders, unrelated local worktrees, #284 evaluation.
CP-2 is NOT all-checks-green: local housekeeping still fails; no cleanup performed or required check waived. Orchestrator/Human owns ownership/recoverability disposition before a full readiness claim.
Next planned task: IMP-006 independent contributor/core-negative harness, QA/Security, hosted PR/readiness and Human integration gates. No successor automatically dispatched; all12 Issue acceptance outcomes remain Pending; lifecycle stays development/spec-ready. No PR/merge/default-branch acceptance performed.
