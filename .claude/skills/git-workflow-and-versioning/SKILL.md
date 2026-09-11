---
name: git-workflow-and-versioning
description: Use for every commit. Covers atomic commits, commit message conventions, pre-commit hygiene, and the change-summary format used when handing off a diff for review.
---

# Git Workflow and Versioning Skill

Every code or documentation change flows through git. This skill is the commit-level discipline layer, not a routing or review skill.

## When to use

- Before every commit.
- When a change is ready to hand off for review.

## Do not use when

- No change has been made yet (nothing to commit).
- The task is choosing a release version or writing a changelog entry — that is Release Agent's responsibility, not this skill's.

## Atomic Commits

Each commit does one logical thing. Do not mix a refactor with a feature, or formatting with behavior, in the same commit — see `AGENTS.md`'s Change Sizing rule for how to split when a change is too large.

## Commit Message Convention

```text
<type>: <short, imperative description>

<optional body: why, not what>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. The first line must be informative enough to understand the change from `git log --oneline` alone. Avoid non-descriptive messages such as "fix", "update", or "misc".

## Pre-Commit Hygiene

Before every commit:

1. Review the staged diff (`git diff --staged` or equivalent) — confirm it contains only what you intend.
2. Scan the diff for secrets, credentials, or tokens before staging — this is the concrete check behind `AGENTS.md`'s "Never commit secrets" rule.
3. Run the tests and checks the change affects; do not commit on a known-broken state.

## Change Summary Format

When handing off a diff for review, state explicitly what was touched and what was deliberately left alone:

```text
CHANGES MADE:
- <file>: <what changed>

NOTICED BUT NOT TOUCHING:
- <file>: <thing observed, out of scope for this task>

CONCERNS (if any):
- <anything the reviewer should specifically weigh in on>
```

The "noticed but not touching" list is what proves scope discipline was exercised, not just claimed — it gives the reviewer an explicit list to confirm nothing relevant was missed, and is a place to flag something worth a separate task without acting on it unasked.

## Completion checklist

- Commit is atomic (one logical change).
- Message follows the type-prefixed convention and explains why, not just what.
- Diff was reviewed and scanned for secrets before commit.
- Relevant tests/checks passed before commit.
- A change summary was produced when handing off for review.
