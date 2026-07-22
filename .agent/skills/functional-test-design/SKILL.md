---
name: functional-test-design
description: Use this skill when the task requires functional test analysis, business requirement coverage, function specification analysis, IPO matrix, happy/negative test cases, BVA/EP, risk-based testing, exploratory charters, API functional test cases, or traceability from requirements to test cases. Do not use this skill to implement automation scripts unless explicitly requested.
---

# Functional Test Design Skill

## Purpose

Use this skill to convert business requirements, workflows, function specifications, change requests, or bug reports into functional test artifacts that are clear enough for PO, BA, SA, Dev, QA, and automation teams.

This skill produces **automation-ready test design**, not automation implementation by default.

## When to Use

Use this skill for:

- Functional test analysis
- Requirement-to-test-case mapping
- Business flow and alternative flow coverage
- Function specification analysis
- IPO matrix creation
- Happy path, negative path, BVA, EP, and risk-based test design
- Functional API test case design
- Exploratory testing charters
- Regression scope definition
- QA handoff after BA/SA/Dev/Data/Config work

Do not use this skill for:

- Writing Playwright, Robot Framework, Cypress, Pytest, or Postman scripts unless the user explicitly asks for automation implementation
- Performance engineering or load-test scripting
- Security review as the primary task
- Production release approval

If automation is requested after functional design, hand off to the relevant automation skill, such as `qa-playwright-testing`, `robot-framework-automation`, or `api-test-automation`.

## Required Inputs

Prefer these inputs when available:

- Business Requirement / URS / BRD
- Function Specification / FS / Technical Specification
- User story and acceptance criteria
- SCR / change request
- API contract or endpoint details
- Data/config change plan
- Existing test cases or regression suite
- Business rules and constraints
- Known defects or production incidents

If inputs are missing, do **not** invent requirements. Produce an `Open Questions` section and clearly label assumptions.

## Operating Modes

### Full Mode

Use for new features, major requirement changes, or when URS/FS is available.

Produce the full functional test report:

1. Header Information
2. Scope & Objectives
3. Business Flow Summary
4. Requirement Mapping
5. Function Specification Analysis
6. IPO Matrix
7. High-Level Happy Case Scenarios
8. Detailed Happy Case Test Cases
9. Negative Test Coverage
10. BVA / EP Analysis
11. API Functional Test Cases, if applicable
12. Risk-based Testing
13. Exploratory Session Charter
14. Traceability Matrix
15. Coverage Matrix
16. Performance & Security Fundamentals
17. QA Handoff
18. Self-review Checklist

### Focused Mode

Use for bug fixes, config changes, data changes, small UI/content updates, and regression impact checks.

Produce the focused test pack:

1. Change Summary
2. Test Scope
3. Impacted Function / Data / Config
4. Positive Test Cases
5. Negative / Edge Cases
6. Regression Checkpoints
7. Validation Evidence Required
8. QA Handoff
9. Self-review Checklist

## Workflow

### Step 1 — Classify the Work

Identify:

- Change Type: new feature, bug fix, config change, data change, API change, UI change, test-only change
- Risk Level: Low / Medium / High / Critical
- Required Mode: Full Mode or Focused Mode
- Required source artifacts
- Required downstream agent or skill

### Step 2 — Analyze Business Requirement / Workflow

Extract:

- Main flow
- Alternative flow
- Exception flow
- Business rules
- Constraints
- Preconditions and postconditions
- Open questions

Use this table:

```markdown
### Business Flow Summary

| # | Flow Name | Description | Pre-condition | Post-condition | Source Reference |
|---|-----------|-------------|---------------|----------------|------------------|
| 1 | ... | ... | ... | ... | URD-001 |
```

### Step 3 — Analyze Function Specification

Extract function-level behavior using IPO:

```markdown
### IPO Matrix

| Function ID | Function Name | Input | Process / Logic | Expected Output | Validation Rules | Source Reference |
|-------------|---------------|-------|-----------------|-----------------|------------------|------------------|
| F-001 | ... | ... | ... | ... | ... | FS-001 |
```

### Step 4 — Design Test Cases

Apply relevant test design techniques:

- Happy case
- Negative case
- Boundary Value Analysis
- Equivalence Partitioning
- Risk-based testing
- Exploratory testing
- API functional testing, if API exists
- Regression impact testing
- Performance and security fundamentals, as baseline checks

If a technique is not applicable, mark it as `N/A — <reason>`.

### Step 5 — Build Traceability and Coverage

Every test case must map back to a requirement, function, change request, bug, or explicit assumption.

### Step 6 — Prepare QA Handoff

Use the handoff format in `templates/qa-handoff.md`.

## Test Design Rules

### Happy Case

- Cover all main business flows.
- Include step-by-step instructions.
- Expected results must be observable and measurable.

### Negative Case

Cover:

- Required field missing
- Invalid format
- Invalid business condition
- Permission/role mismatch
- Duplicate or conflicting data
- Expired or invalid state
- Backend/API error, if applicable

### Boundary Value Analysis

Use when an input has a numeric, date, length, amount, quantity, age, count, timeout, retry limit, or range constraint.

Minimum set:

- min
- min - 1
- min + 1
- max
- max - 1
- max + 1

### Equivalence Partitioning

Separate valid and invalid partitions. Pick representative values from each partition.

### Risk-based Testing

Risk score = Likelihood × Impact.

Priority mapping:

- 16–25: Critical / High
- 9–15: High / Medium
- 4–8: Medium
- 1–3: Low

### Exploratory Testing

Create session charters for areas where requirement ambiguity, UI behavior, integration, or user workflow risk exists.

### Performance & Security Fundamentals

Only create baseline functional checks unless the user asks for dedicated performance/security testing.

Examples:

- Response time expectation from NFR, if available
- Authentication and authorization behavior
- Input validation
- XSS / SQL injection rejection at functional level
- Sensitive data masking
- Audit/logging behavior where required

## Output Quality Rules

1. Do not invent requirements.
2. Separate confirmed facts from assumptions.
3. Every test case must include source reference or assumption reference.
4. Every test case must include priority.
5. Every test step must be executable by a tester without asking follow-up questions.
6. Expected result must be specific and verifiable.
7. Empty cells are not allowed. Use `N/A — <reason>`.
8. For config/data changes, include validation evidence and rollback consideration.
9. For security-sensitive flows, flag security review handoff.
10. Review coverage before final output.

## Naming Convention

| Type | Format |
|------|--------|
| Happy Case | `TC-HC-xxx` |
| Negative Case | `TC-NEG-xxx` |
| Boundary Value | `TC-BVA-xxx` |
| Equivalence Partition | `TC-EP-xxx` |
| API Functional | `TC-API-xxx` |
| Regression | `TC-REG-xxx` |
| Performance Baseline | `TC-PERF-xxx` |
| Security Baseline | `TC-SEC-xxx` |
| Exploratory Charter | `EXP-xxx` |
| Risk | `R-xxx` |
| Assumption | `ASM-xxx` |
| Open Question | `OQ-xxx` |

## Recommended Output File Names

- Full Mode: `function-test-report_<module-name>_<yyyymmdd-hhmm>.md`
- Focused Mode: `functional-test-pack_<change-id-or-module>_<yyyymmdd-hhmm>.md`

Default output location:

```text
docs/qa/function-test-reports/
```

If the project defines another output path, follow the project path.
