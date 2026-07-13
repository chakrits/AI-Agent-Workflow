# Agent Evaluation Checklist

## Purpose

This checklist is used before any agent marks a task complete. It checks output quality, traceability, safety, and handoff readiness.

Completion means: the output is useful, grounded, reviewable, and ready for the next stage. It does not mean the work is approved for production.

## Universal Evaluation Checklist

| Check | Requirement | Status |
|---|---|---|
| Scope Match | Output addresses the actual user request and selected workflow | TODO |
| Source Grounding | Output references source docs, files, requirements, or explicit assumptions | TODO |
| No Silent Assumptions | Assumptions are labeled separately from confirmed facts | TODO |
| Artifact Complete | Required artifact/template sections are complete or marked N/A with reason | TODO |
| Quality Gate Checked | Applicable quality gate has been evaluated | TODO |
| Handoff Ready | Next agent can continue without re-discovering context | TODO |
| Risks Listed | Known risks, limitations, and unresolved questions are documented | TODO |
| No Unsafe Action | No release/security/production-data approval was taken silently | TODO |
| Minimal Change | No unrelated changes or scope creep were introduced | TODO |
| Next Step Clear | Next agent/action/stop condition is explicit | TODO |

## Orchestrator Evaluation

| Check | Requirement | Status |
|---|---|---|
| Change Type Classified | new feature / bug fix / config / data / test-only / doc / security-sensitive | TODO |
| Risk Level Assigned | Low / Medium / High / Critical | TODO |
| Minimum Safe Workflow Selected | No unnecessary stages; no required gates skipped | TODO |
| Agent Routing Justified | Selected agent(s) match role definitions | TODO |
| Skill Selection Checked | Skill selected from `SKILL_CATALOG.md` or gap documented | TODO |
| Stop Gate Identified | Human approval gate identified when applicable | TODO |

## PM / BA Evaluation

| Check | Requirement | Status |
|---|---|---|
| Business Goal Clear | Problem, user, value, success metric are stated | TODO |
| Scope Clear | In scope / out of scope are explicit | TODO |
| Acceptance Criteria Testable | AC can be verified by QA | TODO |
| Business Rules Traceable | Rules have owner/source/reference | TODO |
| Ambiguity Logged | Open questions captured, not hidden | TODO |

## SA Evaluation

| Check | Requirement | Status |
|---|---|---|
| Architecture Fits Requirement | Design maps to approved requirement/business rules | TODO |
| API Contract Clear | Endpoint/input/output/error model are defined when applicable | TODO |
| Data Model Clear | Entities, relationships, constraints, migrations are clear | TODO |
| NFR Considered | Performance, reliability, auditability, observability considered | TODO |
| Security Boundaries Clear | Trust boundary, auth/authz, sensitive data controls documented | TODO |
| ADR Created | Important trade-offs captured in ADR when needed | TODO |

## Developer Evaluation

| Check | Requirement | Status |
|---|---|---|
| Implementation Scoped | Only intended files/behavior changed | TODO |
| Tests Added/Updated | Unit/integration tests updated when behavior changed | TODO |
| Static Checks | Lint/type/build checks run or reason documented | TODO |
| Error Handling | Validation and error behavior match requirement/API contract | TODO |
| Security Regression Avoided | No secrets, bypasses, weakened auth/validation | TODO |
| Dev Handoff Complete | Changed files, test result, limitations, QA focus included | TODO |

## QA Evaluation

| Check | Requirement | Status |
|---|---|---|
| Requirement Coverage | Each requirement/AC has test coverage or N/A reason | TODO |
| Positive/Negative Coverage | Happy path and meaningful negative cases included | TODO |
| Edge Cases | Boundary, equivalence, state, role, data edge cases considered | TODO |
| Expected Results Measurable | Expected results are observable and not vague | TODO |
| Test Data Clear | Data setup, preconditions, and cleanup are defined | TODO |
| Evidence Defined | Screenshots/logs/API responses/traces required when applicable | TODO |
| Regression Impact | Impacted existing flows identified | TODO |
| Defect Routing | Failure root cause routes to BA/SA/Dev/Security appropriately | TODO |

## Functional Test Design Skill Evaluation

| Check | Requirement | Status |
|---|---|---|
| Mode Selected | Full Mode or Focused Mode selected appropriately | TODO |
| IPO Matrix Complete | Inputs/process/outputs/validations mapped or marked N/A | TODO |
| BVA/EP Relevant | BVA/EP applied only when constraints exist, otherwise N/A with reason | TODO |
| Risk-Based Priority | Risk score/priority influences test priority | TODO |
| Traceability Complete | No orphan requirement unless marked uncovered/open | TODO |
| Open Questions Separated | Missing URS/FS/AC details are not invented | TODO |
| Automation Handoff | Automation-specific work handed off to Playwright/API/Robot skill when needed | TODO |

## Security Evaluation

| Check | Requirement | Status |
|---|---|---|
| Sensitive Area Identified | Auth/authz/secrets/PII/payment/file upload/input validation checked | TODO |
| Severity Calibrated | Findings include impact, likelihood, exploitability, affected scope | TODO |
| Evidence Provided | Finding references code/config/data flow evidence | TODO |
| Fix Risk Considered | Fix recommendation does not introduce unsafe behavior | TODO |
| Human Gate Triggered | Critical/high-risk security issue routed for human review | TODO |

## Debugging Discipline Evaluation

Before declaring a debug session complete:

- [ ] Reliable repro exists or missing repro is explicitly documented.
- [ ] Fail path has been traced to a concrete seam.
- [ ] Relevant config/data/env/runtime knobs were enumerated.
- [ ] Multiple hypotheses were considered or a direct proof exists.
- [ ] At least one disproof/proof experiment is recorded.
- [ ] Experiment ledger records what each run ruled in/out.
- [ ] Proposed fix addresses root cause, not just symptom.
- [ ] Original repro is included in validation plan.
- [ ] Uncertainty and untested configurations are stated.

## Engineering Postmortem Evaluation

Before finalizing a postmortem:

- [ ] Reliable repro is documented.
- [ ] Root cause is known and described as a mechanism.
- [ ] Fix pointer exists: PR/commit/branch/patch.
- [ ] Fix is validated against original repro.
- [ ] Symptom includes concrete logs/tests/errors/workload evidence.
- [ ] Root cause includes code/config/data identifiers where applicable.
- [ ] Cause chain explains why the root cause produced the symptom.
- [ ] Slipped-through section names the real gap blamelessly.
- [ ] Validation scope is honest and not overstated.
- [ ] Follow-up actions have owner and tracking artifact, or explicitly none.

## Release Evaluation

| Check | Requirement | Status |
|---|---|---|
| Release Scope Clear | Included changes and excluded items documented | TODO |
| Test Evidence Present | QA/security/build evidence linked or summarized | TODO |
| Rollback Plan Present | Rollback/backout steps documented | TODO |
| Known Defects Listed | Known issues and risk acceptance explicit | TODO |
| Approval Required | Human approval requested before release | TODO |


## Requirement Brainstorming Checklist

- [ ] Change type is classified.
- [ ] Confirmed facts, assumptions, and open questions are separated.
- [ ] User stories are clear.
- [ ] Acceptance criteria are measurable and testable.
- [ ] Business rules are captured.
- [ ] Next agent/skill is recommended.
- [ ] No implementation detail is presented as approved architecture.

## Implementation Planning Checklist

- [ ] Inputs reviewed and listed.
- [ ] Affected components/files identified.
- [ ] Tasks are small and reviewable.
- [ ] Each task has verification steps.
- [ ] Test strategy is explicit.
- [ ] Rollback/fallback is documented when relevant.
- [ ] Security-sensitive areas are flagged.

## TDD Implementation Checklist

- [ ] Target behavior is defined.
- [ ] Failing test was created or identified before fix.
- [ ] Test failed for the right reason.
- [ ] Minimal implementation was made.
- [ ] Relevant tests passed after fix.
- [ ] Refactor was done only after tests passed.
- [ ] Validation scope is stated honestly.

## Verification Before Completion Checklist

- [ ] Completion claim is explicit.
- [ ] Commands/tests run are listed.
- [ ] Results are stated honestly.
- [ ] Artifacts updated or marked N/A.
- [ ] Validation scope is clear.
- [ ] Unverified areas are listed.
- [ ] Residual risks/follow-ups are tracked.

## Code Review Gate Checklist

- [ ] Change intent is clear.
- [ ] Changed files/components are listed.
- [ ] Review focus areas are identified.
- [ ] Test/verification evidence is included.
- [ ] Security/performance/data risks are flagged.
- [ ] Findings are classified by severity.
- [ ] Critical findings block progress.


## Final Completion Block Template

Agents should end significant work with:

```markdown
## Completion Check

| Item | Status | Notes |
|---|---|---|
| Workflow / Agent |  |  |
| Skill Used |  |  |
| Source Inputs |  |  |
| Artifacts Updated |  |  |
| Tests / Checks |  |  |
| Quality Gate | Passed / Failed / Blocked / N/A |  |
| Risks / Limitations |  |  |
| Open Questions |  |  |
| Next Recommended Agent |  |  |
```
