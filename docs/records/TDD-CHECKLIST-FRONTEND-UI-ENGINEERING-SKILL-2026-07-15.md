# TDD Checklist — Frontend UI Engineering Skill

## 1. Target Behavior

| Item | Detail |
|---|---|
| Requirement | Issue #5 acceptance criteria for a portable, accessible UI engineering skill. |
| Expected Behavior | Canonical skill, platform adapters, and catalog exist and cover semantic HTML, WCAG 2.1 AA, keyboard/focus, responsive checks, design-system reuse, meaningful UI states, and QA handoff. |
| Test Seam | Static Node contract test in `test/validate-contracts.test.mjs`. |

## 2. RED — Failing Test

| Item | Detail |
|---|---|
| Test Path | `test/validate-contracts.test.mjs` |
| Failure Before Fix | `ENOENT` for `.agents/skills/frontend-ui-engineering/SKILL.md`. |
| Why It Fails for the Right Reason | The test required the three adapter files and the canonical content before the implementation existed. |

## 3. GREEN — Minimal Fix

| Item | Detail |
|---|---|
| Changed Files | Canonical skill, Claude/Antigravity adapters, catalog, and contract test. |
| Fix Summary | Added a concise, framework-neutral UI engineering instruction and adapter pointers. |
| Result | Focused contract suite passed 37/37. |

## 4. REFACTOR — Cleanup

| Item | Detail |
|---|---|
| Refactor Performed? | No |
| Reason | The instruction is intentionally concise and no existing behavior needed restructuring. |

## 5. Known Gaps

- This meta-repository has no rendered frontend, so accessibility and breakpoint checks are guidance for target projects, not an executable UI test here.
- The default-branch GitHub Actions run remains to be observed after the human merges the PR.

## 6. Handoff

| To | Reason | Evidence |
|---|---|---|
| Reviewer / QA Agent | Verify the skill contract, adapter parity, and full repository checks. | Issue #5, plan, red/green output, and final completion check. |
