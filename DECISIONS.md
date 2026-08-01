# DECISIONS.md

## Decision Log

### ADR-0018: Retain the Canonical Predecessor Preimage in Every v1 Archive

- Date: 2026-08-01
- Status: Proposed — Human architecture approval required before Issue #133 implementation resumes
- Context: The approved `work-item-status/v1` draft deletes the active predecessor when closing a work item, permits closure state, phase, owner, evidence, and `updatedAt` to differ, and retains only `supersedesDigest`. An archived-only loader therefore has no genuine predecessor preimage. Reconstructing one from closure fields can validate a record that never existed and is not cryptographic lineage proof. The exact non-lifecycle sentinel also drifted between prose (`not_applicable`) and schema/implementation (`phase:not_applicable`).
- Decision: Require every inactive `work-item-status/v1` record to embed the complete canonical immediate predecessor as `supersedesPreimage`; active records carry `supersedesPreimage: null`. Recompute the predecessor under the RFC 8785/SHA-256 contract and require equality with both its stored `recordDigest` and the successor's `supersedesDigest`. Archived-only validation recursively verifies the self-contained linear chain with identity, chronology, 64-level depth, and 1 MiB canonical archive limits. The exact non-lifecycle sentinel is `phase:not_applicable`; bare `not_applicable` is invalid. Archive creation must copy the accepted predecessor before deletion and atomically commit immutable archive creation plus active removal.
- Alternatives Considered: Persist only an API-validated transition log (rejected because a digest assertion cannot prove absent predecessor bytes; including the bytes collapses to the selected model, while signatures/transparency add an unapproved trust system); store predecessor preimages in a separate content-addressed object store (deferred because it is sound only with a complete object bundle and adds a second namespace, lookup/GC/orphan rules, migration, and rollback dependencies for negligible expected deduplication); reconstruct the predecessor from closure fields (rejected because closure fields are allowed to change); rely on Git history (rejected as the archive must verify offline and independently of repository history).
- Consequences: The pre-activation v1 archive shape changes and existing implementation commits/tests are evidence, not authority. Developer must add the field/schema semantics, replace reconstruction logic with preimage verification, add canonical vectors and adversarial/migration/rollback tests, and rerun all existing Slice-B gates. Archives grow linearly and nested corrections can grow cumulatively, so v1 fails closed above the frozen limits and requires Human disposition rather than pruning. Shadow authority and ADR-0017's single-authority migration remain unchanged. Human must approve this architecture change before implementation or Go authorization.
- Owner: SA Agent / Human Maintainer

### ADR-0017: Use One Authoritative Path During Progressive Context and Status Migration

- Date: 2026-07-31
- Status: Accepted — Human Maintainer approved the independently-reviewed compatibility design and plan on 2026-07-31; CP-1 baseline/measurement evidence remains required before `status:spec-ready` and Developer dispatch
- Context: Issue #132 originally proposed reducing context and compiling a shared root status projection, but code-backed counter-review showed the token target was unsatisfiable as written, host activation was unproven, and committing a generated root projection could retain conflicts or silently lose updates. The accepted split created #132 for progressive context and #133 for worktree-scoped status. Both affect workflow routing, dispatch/handoff continuity, and project-state consumers.
- Decision: Use a bounded shadow compatibility migration with exactly one authoritative path per phase. Legacy behavior remains authoritative while the new path is read-only. Each slice runs its own 36-case deterministic corpus plus 20 historical replays; Slice B also runs 10 real-Git permutations. Context measurement protocol v1 requires host-native paired input-token observations, at least 36 per observable supported host, per-host median reduction of at least 50%, 5th-percentile reduction of at least 40%, and operational fallback at most 5%. After bounded live shadow, independent review/QA, and Human approval, authority may switch once; the legacy representation is then generated from the new source rather than independently written. Critical structured behavior requires 100% parity. Independent dual-write is prohibited. An incomplete live sample on day 30 remains blocked pending Human extension or termination.
- Alternatives Considered: Immediate cutover (rejected because host behavior and consumer completeness are not yet proven); permanent dual-write (rejected because it creates split-brain and attribution ambiguity); long-lived manual A/B worktrees (rejected because behavior can be paired using disposable worktrees without housekeeping debt); accepting an 85% context-reduction claim from corpus size alone (rejected because corpus size does not prove host boot loading).
- Consequences: #132 and #133 have separate implementation/Go decisions; new code must include normalized compatibility evidence and fail-closed fallback; feature branches do not independently commit a changing root status projection; compatibility removal requires a later Human approval. Existing dirty, detached, or host-managed worktrees remain preserved until owner disposition.
- Owner: Human Maintainer / Orchestrator / SA Agent

### ADR-0016: Reset Project History While Preserving QA Evidence and Reusable Navigation

- Date: 2026-07-31
- Status: Accepted, amended — Owner decisions recorded in Issue #129 comments `5140591557` and `5141017441`
- Context: The reset-to-template plan proposed clearing project work items and lessons learned, wiping the ADR log, stubbing reusable navigation files, warning only after destructive mutation, and forbidding any CI reference to the reset. A disposable-clone impact review corrected that proposal: the repository has 14 real ADRs and five GitHub workflow files; the indexes do not have the asserted direct historical-file links; `npm test` fails after reset because two tests depend on live history; and clearing `docs/records/qa/` would remove review evidence required by existing gate tests.
- Decision: Clear `docs/records/work-items/` and `docs/records/lessons-learned/`, replace `DECISIONS.md` with a blank structural stub, and preserve `docs/records/qa/`. Preserve `README.md`, `PROJECT_INDEX.md`, and `docs/vault/00-Index.md` except for targeted evidence-backed updates. Keep dry-run as the default; destructive apply requires an explicit second confirmation and must fail closed before mutation when any targeted path contains tracked, staged, or untracked changes. Confirmed reset verification by an agent is allowed solely through a repository-owned fail-closed harness that proves it created and entered a standalone disposable Git root, binds both script path and `cwd` to that root, proves it is neither the primary worktree nor a linked worktree of the primary repository, verifies the exact commit and clean state, and refuses before spawning reset when any proof fails. Direct agent invocation and every primary-worktree target remain forbidden. The optional history procedure is a human-only new-root/orphan baseline for a new project and must be documented as not a security-grade purge; autonomous history rewriting remains forbidden. CI may use harmless dry-run, but regression coverage must block destructive `--apply`.
- Alternatives Considered: Clear `docs/records/qa/` and rewrite review-gate tests around an empty live directory (rejected because QA records are durable evidence, not disposable project history); replace README and both indexes with structural stubs (rejected because current link evidence does not justify whole-file loss); warn only after apply (rejected because it cannot prevent deletion of unrecoverable untracked content); allow `--apply` as the sole destructive confirmation or add a dirty-state override (rejected because both weaken the fail-closed safety boundary); categorically ban confirmed reset in all agent verification (rejected because it contradicts AC-07/AC-08 and prevents reproducible post-reset verification); permit ad hoc disposable-clone commands (rejected after two accidental primary-worktree invocations demonstrated that script-path isolation without `cwd` and Git-root attestation is insufficient); perform selective history rewriting as part of the reset (rejected because the template use case needs a clean new baseline, while secret/sensitive-data purge requires separate security review and remote coordination); ban all CI references including dry-run (rejected because only mutation is hazardous).
- Consequences: Issue #129's implementation plan must include fixture isolation for `test/backfill-work-item-records.test.mjs` and `test/validate-review-gate.test.mjs`, preservation regression coverage for QA records, full post-reset `npm test` and validators, the two-part destructive guard, targeted documentation updates, and a repository-owned disposable verification harness with negative regression cases that cannot spawn reset. The Developer and QA accidental primary-worktree invocations remain recorded; successful restoration limits observed loss but does not waive either incident. Fresh independent review and QA are required after the harness change, and the earlier QA FAIL remains unchanged. Existing repository history and QA evidence remain intact when the implementation PR merges because reset is not automatically applied.
- Owner: Human Maintainer / Owner

### ADR-0013: Dispatch Receipt Assurance Model — Repository-Audited, Not Runtime-Attested

- Date: 2026-07-28
- Status: Accepted — Boss confirmed Option A and directed Control 3.3 (GitHub-comment-URL evidence) to be live-verified now rather than deferred, per the Security Reviewer's finding
- Context: Security review of the Issue #116 Fix 3 (dispatch receipt tool) plan returned BLOCKED — the existing schema/validator accepts a `consumed` receipt's `terminal_result_id` as an unconstrained non-empty string, and nothing prevents a receipt file from being introduced already in a terminal state, so a receipt could assert work was done without any checkable evidence.
- Decision: Adopt a repository-audited assurance model — a receipt's state history must be append-only as verified against this repo's own git history, `registered_by`/`state_changed_by` must be drawn from the canonical `AGENTS.md` role set, and `terminal_result_id` must resolve to a real, existing artifact (a commit SHA, a `docs/records/qa|work-items` file, or a GitHub comment URL that is live-verified to exist via the GitHub API, not merely shape-checked). This proves the paper trail is internally consistent and checkable — the same assurance level as every other claim in this framework — and is explicitly documented as not proving the target agent actually executed the work.
- Alternatives Considered: Runtime-attested assurance (a signed token or trusted-issuer proof of actual execution) — rejected for now because this repository has no signing/issuer infrastructure to support it; recorded as a deferred follow-up, not designed further. Shape-only verification of the GitHub-comment-URL evidence form — rejected per the Security Reviewer's finding that this repo's CI already has an available `GITHUB_TOKEN` and precedent for authenticated API calls, so deferring live verification would leave the most commonly-cited evidence form the weakest.
- Consequences: `scripts/validate-dispatch-receipts.mjs` and `docs/contracts/schemas/dispatch-receipt.schema.json` gain the additional controls (git-history replay, an agent-identity allow-list, terminal-evidence existence checks including a live GitHub API check for comment-URL evidence) documented in `docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md`, plus its required adversarial tests. The CI job running `validate:dispatch-receipts` needs read access to `secrets.GITHUB_TOKEN` for the live check.
- Owner: Boss / Security Reviewer

### ADR-0015: Data Change Is Four Subtypes, Not One Universal Contract

- Date: 2026-07-28
- Status: Accepted — Boss approved the design and authorized implementation on 2026-07-28
- Context: Issue #116 review found `schema-design` treated as a universal Data Change state, when it applies only to the `migration` subtype. Reference-data and backfill changes are non-destructive DML against an existing schema (Data Agent's existing Non-Destructive Mechanics / Idempotent Re-run Safety rules); destructive operations need mandatory Human approval and, when they touch PII, mandatory Security Reviewer routing (existing PII Routing rule) regardless of which other subtype they accompany.
- Decision: Classify data changes into four subtypes (reference-data, backfill, migration, destructive — combinable, not mutually exclusive) and route each through a `data-change` contract that branches on `data_change_kind` and `contains_pii`: `schema-design` only for `migration`; `security-review` only when `contains_pii`; `human-approval` mandatory whenever `destructive` is present. Data Agent never authors the migration file itself (existing Boundary vs SA Agent's Data Migration Safety rule) — only the DML that runs after SA's migration is in place. See `docs/superpowers/specs/2026-07-28-data-change-classification-and-contract-design.md` for the full design and `docs/contracts/data-change-workflow.yaml` for the implemented contract.
- Alternatives Considered: One universal Data Change contract with `schema-design` always present (rejected — forces non-destructive reference-data/backfill changes through a state they don't need, per the Issue #116 review); treat destructive as its own top-level `data_change_kind` value rather than an orthogonal flag (rejected — a migration that also drops a column is both `migration` and `destructive` simultaneously, which a single-enum design cannot express).
- Consequences: Shares the `when`-clause conditional-branching validator extension with the companion Config Change contract (ADR-0014), generalized to set-membership (`data_change_kind_includes`/`_excludes`) rather than single-value equality. `scripts/validate-contracts.mjs` also generalizes its retry-limit-block check (previously hardcoded to a "verifying" state name) to derive the pre-rework state from the policy's own transitions, since `data-change`'s pre-rework state is "validating".
- Owner: BA/Data Agent / SA Agent / Boss

### ADR-0014: Config Change Workflow Is Two Risk Tiers With No Developer State

- Date: 2026-07-28
- Status: Accepted — Boss approved the design and authorized implementation on 2026-07-28
- Context: Issue #116 review found that a Config Change contract copied from `new-feature-workflow.yaml` would misrepresent it: Config changes can skip Developer entirely (per the existing Config Agent role definition), and carry two materially different risk/approval depths depending on whether the change is a feature-flag toggle or a runtime parameter with architecture-level consequences.
- Decision: Adopt a `config-change` contract with no Developer state; `owner-review` branches on `risk_tier` — low-risk (feature flag) proceeds straight to rollout on config-owner approval alone, medium-risk (runtime parameter) requires an additional `sa-review` state. Required evidence fields (`restart_required`, `removal_condition`, `rollback_plan`) are pulled directly from the Config Agent role rules already in `docs/workflow/role-definitions.md`, not invented. See `docs/superpowers/specs/2026-07-28-config-change-workflow-contract-design.md` for the full design and `docs/contracts/config-change-workflow.yaml` for the implemented contract.
- Alternatives Considered: Copy `new-feature-workflow.yaml`'s shape (rejected — misrepresents the risk/approval profile per the Issue #116 review); a single risk tier with SA review always required (rejected — over-applies architecture review to code-free feature-flag toggles the Config Agent role explicitly exists to fast-track).
- Consequences: `scripts/validate-contracts.mjs` gains a `when` clause on transitions, branching on a task-state evidence field's value — new syntax relative to the two existing contracts, shared with the companion Data Change contract (ADR-0015).
- Owner: BA/Config Agent / SA Agent / Boss

### ADR-0011: Preserve Handoff Parser Compatibility While Improving Scanability

- Date: 2026-07-24
- Status: Accepted
- Context: Issue #64 identified that the handoff template is difficult to scan. The first SA proposal considered a v2 grouped-heading structure and parser migration, but review confirmed the current parser and existing records rely on the exact H2 field headings and their order.
- Decision: Retain every existing H2 field heading in its existing order. Improve scanability only with non-heading `---` separators and bold group labels. Do not modify the parser, receipt schema, tests, adapters, CI, lifecycle authority, or QA semantics.
- Alternatives Considered: Introduce grouped H2 sections and a v1/v2 parser; use frontmatter or an arbitrary Markdown structure; rewrite historical records; remove v1 support immediately.
- Consequences: Existing parser and historical-record compatibility remain unchanged, with a small reversible template-only diff. A future structural template redesign requires its own approved parser/schema migration work item.
- Owner: Human Product / Process Owner

### ADR-0002: Use a Contract-First Foundation for Dynamic Bug-Fix Loops

- Date: 2026-07-13
- Status: Accepted
- Context: The repository has dynamic-routing policy and role/gate documentation, but no machine-checkable state, evidence, or retry contract for controlled rework loops.
- Decision: Phase 1 uses YAML as the canonical Bug Fix workflow policy, JSON Schema to validate task-state instances, and a maximum of two rework transitions before a required human-review block. Autonomous orchestration is deferred.
- Alternatives Considered: Documentation-only policy; runtime-first autonomous orchestrator.
- Consequences: Phase 1 will add a validation contract and fixtures, align workflow terminology, and keep platform adapters as non-canonical adapters.
- Owner: Human Product / Process Owner

### ADR-0003: Defer P3 Autonomous Dispatch Until Future Work

- Date: 2026-07-18
- Status: Accepted
- Context: P0/P1 dispatch/visibility requirements were accepted by the Boss and an implementation plan was drafted. The original design included P3 autonomous dispatch, but the approved scope explicitly excluded it.
- Decision: P3 autonomous dispatch is deferred. The P0/P1 scope covers terminal handoff requiring one action, Orchestrator receipt distinguishing dispatched from acknowledged, and every terminal outcome requiring a Boss event.
- Alternatives Considered: Include P3 autonomous dispatch in the current implementation plan; defer only P0.5 host-monitor supervision.
- Consequences: Autonomous dispatch is not available until a future Phase. The dispatch/visibility receipt contract is designed to support P3 extension without breaking changes.
- Owner: Human Product / Process Owner

### ADR-0004: Keep Activation Workflow Out of Bootstrap Increment

- Date: 2026-07-17
- Status: Accepted
- Context: The missing trusted readiness module (`ERR_MODULE_NOT_FOUND` on hosted CI) required a bootstrap increment before the activation workflow (PR #20) could be rebased and validated. The activation workflow presumes the module is available on `main`.
- Decision: The activation workflow is deliberately excluded from the bootstrap increment. The bootstrap increment extracts and tests only the readiness evaluation module; activation wiring remains in PR #20 pending the bootstrap PR merge.
- Alternatives Considered: Include activation workflow alongside the module extraction in a single increment.
- Consequences: Two sequential PRs instead of one. PR #20 must rebase after the bootstrap PR lands on `main`. The module is never imported from a PR head — only from `main`.
- Owner: Human Product / Process Owner

### ADR-0005: Skip Document Dependency Cascade and Workflow Tree Spec Format in Orchestrator Enrichment

- Date: 2026-07-14
- Status: Accepted
- Context: External Chief of Staff / Workflow Architect references were reviewed for the Orchestrator Agent enrichment. The Document Dependency Cascade section is owned by the Documentation Agent, and the full Workflow Tree Spec format belongs to the SA Agent for real systems.
- Decision: Deliberately skip the Document Dependency Cascade (owned by Documentation Agent) and the full Workflow Tree Spec format (belongs to SA Agent). The Orchestrator enrichment covers only the Unclassified Request Rule, Escalation Tiers, and Decision Routing Checklist.
- Alternatives Considered: Import all concepts regardless of role ownership; import only the Document Dependency Cascade.
- Consequences: Orchestrator Agent role avoids role overlap. Documentation Agent and SA Agent remain responsible for their respective domains. The skipped concepts are available for future enrichment of those roles.
- Owner: Human Product / Process Owner

### ADR-0006: Exclude Off-Stack References and Defer Prototype/Spike and Release Agent from SA Enrichment

- Date: 2026-07-14
- Status: Accepted
- Context: External Software Architect / Backend Architect references were reviewed for the SA Agent enrichment, tailored to the Django/Postgres/REST stack. The FP&A Analyst and Growth Hacker references were out of scope. A Prototype/Spike workflow route and a Release Agent enrichment were identified as useful but separate, unscheduled follow-ups.
- Decision: Exclude FP&A Analyst and Growth Hacker references as out of scope. Defer a Prototype/Spike workflow route and a Release Agent enrichment as separate, unscheduled follow-ups. The SA enrichment covers only Architecture Pattern Selection, Dependency Boundary Rule, API Contract Governance, and Data Migration Safety.
- Alternatives Considered: Include all references regardless of stack match; schedule the deferred items immediately.
- Consequences: SA Agent enrichment is focused on the Django/Postgres/REST stack. Prototype/Spike and Release Agent enrichments are tracked as deferred ideas with no scheduled implementation.
- Owner: Human Product / Process Owner

### ADR-0007: Exclude Off-Role References from BA Enrichment

- Date: 2026-07-14
- Status: Accepted
- Context: External UX Architect / UX Researcher references were reviewed for the BA Agent enrichment. The Developer Advocate and Business Strategist references were out of scope. The UI Designer's design-system ownership was recognized as belonging to a different role.
- Decision: Exclude Developer Advocate and Business Strategist references as out of scope. Exclude the UI Designer's design-system ownership. The BA enrichment covers only the Illustrative Draft Rule, Sketch Boundary (vs SA Agent), and Production UI/UX Escalation.
- Alternatives Considered: Import all references regardless of role scope; grant BA design-system ownership.
- Consequences: BA Agent role is focused on requirement discovery and sketch boundaries. Design-system ownership remains unassigned. The excluded references are not imported into any role.
- Owner: Human Product / Process Owner

### ADR-0008: Exclude Off-Role Testing References and Reject Minimum Issues Quota from QA Enrichment

- Date: 2026-07-14
- Status: Accepted
- Context: External testing-persona references were reviewed for the QA Agent enrichment. The Test Results Analyzer, Tool Evaluator, and Workflow Optimizer references were out of scope. Two references contained a "minimum issues quota" pattern.
- Decision: Exclude Test Results Analyzer, Tool Evaluator, and Workflow Optimizer references as out of scope. Explicitly reject the "minimum issues quota" pattern from two references as a fantasy-reporting failure mode in disguise. The QA enrichment covers Evidence-Based Reporting, API Contract Validation, and NFR Validation.
- Alternatives Considered: Include all references; adopt the minimum issues quota as a QA metric.
- Consequences: QA Agent enrichment is focused on evidence-based, verifiable testing practices. The rejected quota pattern is documented as a known failure mode to avoid in future QA design.
- Owner: Human Product / Process Owner

### ADR-0009: Exclude Premium-Frontend and Duplicate Review Content from Developer Enrichment

- Date: 2026-07-15
- Status: Accepted
- Context: A Senior Developer reference and two Code Reviewer references were reviewed for the Developer Agent enrichment. The Senior Developer reference contained premium-frontend content (Laravel/Livewire/Three.js) that is off-stack for this Django/Postgres/REST project. The Code Reviewer references' review-dimension and severity content was already covered by the existing `code-review-gate` skill.
- Decision: Exclude the Senior Developer reference's premium-frontend content (Laravel/Livewire/Three.js) as off-stack. Exclude both Code Reviewer references' review-dimension and severity content as already covered. The Developer enrichment covers only Architecture & Contract Compliance, Definition-of-Done Restatement, Incremental Verification Discipline, Escalation Discipline, and Scope Discipline.
- Alternatives Considered: Import premium-frontend content for future stack expansion; duplicate review content for completeness.
- Consequences: Developer Agent enrichment is focused on structural development disciplines. Review content is not duplicated across Developer and Code Reviewer roles. Off-stack content is not imported.
- Owner: Human Product / Process Owner

### ADR-0010: Exclude Infrastructure-Only Concepts from Orchestrator Enrichment

- Date: 2026-07-15
- Status: Accepted
- Context: A Multi-Agent Systems Architect reference was reviewed for the Orchestrator Agent enrichment. The reference contained observability/tracing, tool access matrix, cost/latency governance, and eval-suite deployment gates — all concepts that require a live execution infrastructure this repository does not have.
- Decision: Exclude observability/tracing, tool access matrix, cost/latency governance, and eval-suite deployment gates. The Orchestrator enrichment covers only Contradiction Detection and Resolution and a generalized Routing Circuit Breaker (extending the Bug Fix contract's two-rework budget to every other flow).
- Alternatives Considered: Import all concepts with documentation-only placeholders; defer all enrichment until infrastructure exists.
- Consequences: Infrastructure-dependent concepts are not imported. The Orchestrator retains only Role-appropriate concepts that can be verified without a live runtime. Importing documentation-only patterns without infrastructure is avoided as process theater.
- Owner: Human Product / Process Owner

### ADR-0012: Schema-First Implementation Exception for TDD Rule

- Date: 2026-07-25
- Status: Accepted
- Context: The TDD Rule requires a failing test before implementation. Contract YAML and JSON Schema files are declarative artifacts, not executable behavior — writing a "failing test" before creating a schema is not meaningful.
- Decision: Pure declarative YAML/JSON contract schemas and state-machine definitions (e.g., `docs/contracts/*.yaml`, `docs/contracts/schemas/*.schema.json`) are exempt from the TDD Rule. However, validators, parsers, transition logic, error handling, and CI scripts (all executable `.mjs` code) remain subject to TDD. Contract fixtures or validation cases must still be present as executable evidence (test files that validate the schema itself).
- Alternatives Considered: (1) Apply TDD to schemas — rejected because schemas are declarations, not behavior. (2) Exempt all contract-related code — rejected because validators and parsers have executable behavior that TDD should cover.
- Consequences: Schema-first implementation is valid for contract YAML/JSON; executable validation code must still follow TDD (failing test first). Reviewers should distinguish declarative artifacts from executable code when auditing TDD compliance.
- Owner: Human Product / Process Owner
