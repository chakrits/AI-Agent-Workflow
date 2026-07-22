# DECISIONS.md

## Decision Log

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