# QA Agent Instruction Design

**Date:** 2026-07-14
**Status:** Approved for implementation planning
**Work item:** QA-AGENT-INSTRUCTION-2026-07-14

## Goal

Fix an inverted canonical/adapter relationship for QA Agent, and extend its instruction with evidence-based reporting, API contract validation, and NFR validation — closing the loop with the SA Agent rules landed earlier this session, and tightening the QA automation skill's engineering discipline.

## Scope

In scope:

- Move QA Agent's real operating policy (skill routing, dynamic routing, output expectations) from `.claude/agents/qa-agent.md` into the canonical `docs/workflow/role-definitions.md`, matching the canonical/adapter pattern already established for Documentation, PM, Orchestrator, SA, and BA Agents.
- Three new canonical QA rules: Evidence-Based Reporting, API Contract Validation, NFR Validation.
- Expand `docs/templates/TEST_PLAN.md` from a generic blank stub into QA-specific fields.
- Expand `.agents/skills/qa-playwright-testing/SKILL.md` with automation engineering discipline.
- Regression coverage for all of the above.

Out of scope:

- Creating a new "Reality Checker" or "Evidence Collector" role — that responsibility is folded into QA Agent's own Evidence-Based Reporting rule and the existing Reviewer gate; a second review-of-the-reviewer role would duplicate the Reviewer gate already used throughout this session.
- Statistical/ML-based defect prediction or executive quality dashboards (from the Test Results Analyzer reference) — out of proportion to this repo's scale.
- Tool procurement/TCO evaluation (from the Tool Evaluator reference) and generic business-process optimization (from the Workflow Optimizer reference) — unrelated to QA's testing responsibility.
- Full load-testing engineering ownership (k6 scripts, SLA infrastructure) — QA validates NFR targets stated in the SDD; it does not own performance-engineering tooling by default.
- Changing `AGENTS.md` Dynamic Routing Rules or the Bug Fix contract (`docs/contracts/bug-fix-workflow.yaml`).

## Research Input

Reviewed eight external `agency-agents` testing-persona references. Adopted, in reduced form:

- **API Tester** → API Contract Validation rule, scoped to checking the implementation against the OpenAPI schema SA Agent's API Contract Governance rule already requires — not full OWASP API Security Top 10 ownership.
- **Test Automation Engineer** → automation discipline added to `qa-playwright-testing/SKILL.md`: no hard waits, role-based selectors, API-seeded test data, flake quarantine with root cause within 24 hours.
- **Evidence Collector** / **Reality Checker** → Evidence-Based Reporting rule: claims require attached evidence. Explicitly rejected the "find a minimum of 3-5 issues" quota mechanic from both references — manufacturing issues to hit a quota is itself a fantasy-reporting failure mode, just inverted.
- **Performance Benchmarker** → NFR Validation rule, scoped to checking the SDD's stated targets were validated (or recording why not) — not full load-testing infrastructure ownership.

Excluded entirely: Test Results Analyzer (statistical/ML tooling disproportionate to this repo), Tool Evaluator (procurement, not testing), Workflow Optimizer (generic business-process optimization, not testing).

## Canonical QA Agent Section

Full replacement for `## QA Agent` in `docs/workflow/role-definitions.md`:

```markdown
## QA Agent

Owns test strategy, test case design, API/E2E automation, regression, defect analysis, coverage matrix, and test report.

### Skill Routing

| Task | Skill |
|------|-------|
| Functional test analysis, IPO, happy/negative, BVA/EP, risk, traceability | `.agents/skills/functional-test-design/` |
| Playwright E2E automation | `.agents/skills/qa-playwright-testing/` |
| Security-sensitive test review | `.agents/skills/security-review/` |
| Config or data validation workflow | `.agents/skills/data-config-change/` |

### Functional Testing Rule

When the user asks for functional test cases, TDD test cases, requirement coverage, FS analysis, IPO matrix, happy/negative cases, BVA, EP, exploratory charter, or traceability, invoke the `functional-test-design` skill. Do not implement automation scripts unless explicitly requested. Produce automation-ready functional test design first.

### Dynamic Routing

QA work is bidirectional:

- If acceptance criteria are unclear, route back to BA Agent.
- If function spec or API contract is insufficient, route back to SA Agent.
- If observed behavior differs from expected behavior, route to Developer Agent.
- If auth, authorization, secrets, sensitive data, payment, privacy, or injection risk is involved, route to Security Reviewer.
- If data/config change needs validation, route to Data Agent or Config Agent before QA execution.

### Output Expectations

Use Markdown tables. Every test case must include Test Case ID, Test Case Name, Description, Preconditions, Test Steps, Test Data, Expected Result, Priority, and Source Reference. If information is missing, do not invent it — add an Open Questions section.

### Evidence-Based Reporting

Every QA claim — pass/fail count, coverage percentage, defect status — must reference the actual command output, screenshot, or log that produced it. Do not assert a result without evidence attached. Record evidence references in `docs/templates/TEST_REPORT.md`'s existing fields. Do not manufacture issues to appear thorough, and do not suppress real issues to appear clean — report exactly what the evidence shows.

### API Contract Validation

When SA Agent has produced an OpenAPI schema under its API Contract Governance rule, QA Agent validates the implementation against that schema before approving: request/response schema compliance, error response format, pagination, versioning, and authentication requirement. A mismatch between the schema and the implementation is a defect, not a QA judgment call to resolve — route it to Developer Agent or SA Agent depending on whether the code or the contract is wrong.

### NFR Validation

When the SDD states Performance, Reliability, Observability, or Scalability targets, QA Agent checks whether they were validated and records the result — measured value, method, and pass/fail — in the test report. If a target cannot be validated within the current QA workflow (e.g., load testing is out of scope), record it as `Not validated — <reason>` rather than silently omitting it.
```

## Adapter Changes — `.claude/agents/qa-agent.md`

Reduce to a faithful adapter: keep the `Source of Truth` reading list (adapter-specific, doesn't redefine policy), restate each canonical section briefly, and drop the duplicated policy prose that now lives only in the canonical file. Structure mirrors `.claude/agents/sa-agent.md` and `.claude/agents/ba-agent.md`: Canonical Source note → Responsibilities → restated sections → Required Behavior.

## Template Changes — `docs/templates/TEST_PLAN.md`

Replace the generic `Summary` / `Details` sections with QA-specific fields:

```markdown
## Test Types In Scope

- [ ] Unit
- [ ] API
- [ ] E2E
- [ ] Regression
- [ ] Performance / NFR

## Environment

- Target environment:
- Test data source:
- Tools / automation scope:

## Entry Criteria

- 

## Exit Criteria

- 

## NFR Targets Under Test

(Copy from the SDD's NFR section when applicable; leave `N/A — no SDD or no stated NFR target` otherwise.)

| Target | SDD Reference | Validation Method |
|---|---|---|
|  |  |  |
```

Metadata, Assumptions, Open Questions, Risks, and Approval / Review sections are retained unchanged.

## Skill Changes — `.agents/skills/qa-playwright-testing/SKILL.md`

Add an automation-discipline section covering:

- No hard waits (`waitForTimeout`); use condition-based waits (element state, network response, URL change).
- Prefer role-based selectors (`getByRole`, accessible name/label) over CSS chains; `data-testid` is a fallback, not the default.
- Seed test data through the API, not through the UI; each test owns its data.
- A flaky test leaves the merge-blocking suite within 24 hours and enters a triage queue with a root-cause note — it is not deleted without diagnosis, and it does not stay in the blocking suite "retried until green."

## Acceptance Criteria

1. `docs/workflow/role-definitions.md`'s QA Agent section contains the skill routing table, functional testing rule, dynamic routing rules, output expectations, and all three new rules.
2. `.claude/agents/qa-agent.md` restates the canonical rule without duplicating its full prose, matching the adapter pattern used for SA and BA Agents.
3. `docs/templates/TEST_PLAN.md` has the new QA-specific fields; existing Metadata/Assumptions/Open Questions/Risks/Approval sections are unchanged.
4. `.agents/skills/qa-playwright-testing/SKILL.md` states the four automation-discipline rules.
5. A regression test fails if any of the three new QA rules, the skill-routing/dynamic-routing content, the TEST_PLAN.md fields, or the automation-discipline rules are removed.
6. `npm test`, `npm run validate:contracts`, and `git diff --check` all pass.

## Risks and Constraints

- This is a larger single work item than the previous per-role passes (structural fix + 3 rules + 2 template/skill files). Accepted per explicit user direction to keep it as one spec/plan rather than splitting.
- The Evidence-Based Reporting rule does not create new tooling — it is a documentation/discipline rule enforced by review, the same way `AGENTS.md`'s existing Verification Rule is enforced today.
- API Contract Validation depends on SA Agent's API Contract Governance rule (already landed this session); if a future change removes that SA rule, this QA rule becomes a dangling reference and should be revisited.

## Recommended Next Step

Human reviewer confirms this spec. Then the Implementation Planning Agent creates the execution plan before any instruction/template/skill changes begin.
