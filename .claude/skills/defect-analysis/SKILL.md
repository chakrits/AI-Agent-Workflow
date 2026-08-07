---
name: defect-analysis
description: Use this skill to analyze a test failure, log, screenshot, or network payload and turn it into a severity-classified, reproducible defect report. Do not use this skill for post-fix root-cause write-ups or for the roll-up summary already in TEST_REPORT.md.
---

# Defect Analysis Skill

## Purpose

Use this skill to analyze test-failure evidence — logs, screenshots, network/API payloads, stack traces, or a tester's raw observation — and turn it into a `DEFECT_REPORT.md` that is reproducible, severity-classified, and safe to attach evidence to.

`TEST_REPORT.md`'s Failed Tests / Defects table stays the one-row-per-defect roll-up summary. `DEFECT_REPORT.md` is the detailed per-defect artifact that row can link to when a failure needs a full reproduction writeup.

## When to Use

Use this skill when:

- A test (manual, `qa-playwright-testing` E2E, or API) fails and the failure needs to be turned into a defect report
- A screenshot, log excerpt, or network payload needs to be analyzed to determine what happened and how severe it is
- A reported bug needs its severity classified before routing to Developer Agent

Do not use this skill for:

- A bug that is already root-caused and fixed and needs a retrospective write-up — use `engineering-postmortem`
- Active investigation of an assigned bug (hypothesis testing, reproduction-step discipline) — use `debugging-discipline`
- The one-row `TEST_REPORT.md` Failed Tests / Defects summary itself — that table stays as-is; link to this skill's output from it

## Required Inputs

Prefer these inputs when available:

- The failing test case (ID, steps, expected result)
- Actual observed result (log excerpt, screenshot, network/API payload, stack trace)
- Environment: OS, browser, device, app/build version
- Whether the failure reproduces consistently or intermittently

If inputs are missing, do not infer or fill in missing specifics — report exactly what the evidence shows and add an Open Questions entry for the gap. This mirrors the Evidence-Based Reporting rule ("Do not manufacture or suppress issues") and `functional-test-design`'s "Do not invent requirements" rule.

## Workflow

### Step 1 — Collect and Redact Evidence

Gather the failing test's evidence (logs, screenshots, network payloads, stack traces). Before attaching any of it to the report, replace sensitive values with placeholders — for example `[USER_ID]`, `[POLICY_NUMBER]`, `[CLAIM_ID]` — per this repo's PHI/PII handling constraint on healthcare/e-claim/insurance domains. Never attach raw PHI/PII in a defect report or GitHub Issue.

### Step 2 — Reproduce and Confirm

Confirm the failure is real and reproducible from the evidence available. State the exact steps that trigger it. If it does not reproduce consistently, record that explicitly (do not report it as a confirmed defect with fabricated consistent steps).

### Step 3 — Classify Severity

Classify the defect using the worked mapping below, which translates Security Reviewer's existing Critical/High/Medium/Low/Informational scale (`docs/workflow/role-definitions.md`'s Severity Scale, calibrated to exploitability/blast-radius) into functional-defect terms. This is not a new taxonomy — it is the same five-point scale applied to functional-defect impact instead of security exploit/blast-radius:

| Severity | Functional-Defect Impact |
|---|---|
| Critical | Service down, data loss, or a security-relevant defect (route to Security Reviewer as well) |
| High | Major feature broken, no workaround |
| Medium | Feature impaired, workaround exists |
| Low | Cosmetic, no functional impact |
| Informational | Best-practice deviation or observation with no direct defect |

### Step 4 — Write the Defect Report

Use `docs/templates/DEFECT_REPORT.md`. Fill Summary, Description, Environment, Steps to Reproduce, Expected/Actual Result, Severity, and Attachments/Logs (redacted per Step 1).

### Step 5 — Route

Route the completed defect report to Developer Agent for root-cause investigation (which may then use `debugging-discipline`), or to Security Reviewer first if the defect is security-relevant (Critical tier above). Link the defect report from `TEST_REPORT.md`'s Failed Tests / Defects table row.

## Output Quality Rules

1. Do not manufacture or suppress issues — report exactly what the evidence shows.
2. Do not invent missing specifics; use an Open Questions entry instead.
3. Redact sensitive data before attaching logs/screenshots/payloads.
4. Every defect must have a stated severity using the mapping above.
5. Every defect must have reproducible steps, or an explicit note that it does not reproduce consistently.

## Recommended Output Location

```text
docs/qa/defect-reports/
```

If the project defines another output path, follow the project path. A defect can also be filed directly as a GitHub Issue when that is the project's convention; this skill's analysis and severity classification apply either way.
