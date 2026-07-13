# Functional Test Design Workflow

## Use When

- Requirement or FS needs test coverage.
- QA needs to produce functional test cases.
- A BA/SA/Dev/Data/Config handoff requires QA validation design.
- Regression impact must be clarified.

## Flow

```text
Input Requirement / Change / FS
  ↓
QA Agent
  ↓
functional-test-design skill
  ↓
Full Mode or Focused Mode
  ↓
Function Test Report / Focused Test Pack
  ↓
QA Handoff
  ↓
Automation Skill or Manual QA Execution
```

## Routing

- Missing / unclear acceptance criteria → BA Agent
- Missing / unclear API or function specification → SA Agent
- Implementation mismatch → Developer Agent
- Security-sensitive behavior → Security Reviewer
- Data/config validation needed → Data Agent / Config Agent
- Automation requested → Playwright / Robot / API automation skill

## Required Gate

Before execution or automation handoff:

- Test cases have measurable expected results.
- Test cases map to source references.
- Assumptions and open questions are explicit.
- Regression checkpoints are identified.
- Risk-based priority is assigned.
