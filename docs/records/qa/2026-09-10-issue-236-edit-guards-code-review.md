# Code Review Findings

Scope: Issue #236 (IMP-007), AC-06 through AC-08. This Developer self-review
covers the portable PostToolUse dispatcher, its npm entry point, the Claude
thin invoker, the opt-in portable hook reachability path, and focused tests.
Design authority: `DECISIONS.md` ADR-0022. Independent QA has not run.

## Task-review rework cycle 1 — QA F1

QA reported F1 (Low): a missing or malformed
`test/fixtures/context-pack-v1/required-source-matrix.json` was converted to an
empty path set with no visible warning. The approved rework keeps the valid
matrix path set unchanged and adds an advisory diagnostic containing the matrix
path and whether it is missing or malformed. The dispatcher still exits 0 and
does not invent or run a validator for a path it cannot derive.

Before the rework, this payload exited silently with status 0:

```text
{"tool_name":"Edit","tool_input":{"file_path":"<root>/README.md"}}
```

After the rework, the same payload with the matrix absent emits:

```text
Edit guards advisory: test/fixtures/context-pack-v1/required-source-matrix.json is missing; AC-06 path discovery was skipped.
```

The malformed case emits the same diagnostic with `is malformed JSON`, while
an adapter path still runs both parity validators. No exit status or valid
matrix guard selection changed.

## Acceptance criteria verification

- **AC-06** — `scripts/validate-edit-guards.mjs` reads every
  `rows[].requiredSources[].path` from
  `test/fixtures/context-pack-v1/required-source-matrix.json`. An Edit/Write
  payload for a pinned path plans `repin:source-matrix`; no path list is copied
  into `.claude/settings.json`.
- **AC-07** — the dispatcher imports `CANONICAL_FILES` from
  `scripts/validate-context-budget.mjs`. An Edit/Write payload for a canonical
  file plans `validate:context-budget`; the test uses the exported list rather
  than a duplicated literal.
- **AC-08** — an Edit/Write payload under either `.claude/agents/**` or
  `.claude/skills/**` plans both `validate:adapter-parity` and
  `validate:skill-parity`.

All applicable guards are retained and run sequentially. A failed validator is
reported as an advisory result after the write; the dispatcher does not turn a
PostToolUse event into a commit gate.

## Portable-core / thin-invoker review

`.claude/settings.json` contains only a `PostToolUse` matcher and an npm command.
It does not contain any path list or validator rule. The same dispatcher is
reachable from `.githooks/pre-push` through an explicit `EDIT_GUARD_PAYLOAD_FILE`
opt-in payload, preserving ADR-0022's containment check without running edit
guards on ordinary pushes or adding a pre-commit hook. Existing CI validator
commands remain unchanged.

## TDD evidence

The focused test was run before implementation and failed with
`ERR_MODULE_NOT_FOUND` for the absent dispatcher. After the smallest
implementation and wiring changes, the focused tests passed. Tests cover the
matrix-derived path, exported canonical path, both Claude tree prefixes,
non-edit/out-of-scope inputs, all applicable commands, and advisory continuation
after one validator returns non-zero.

## Verification

The following commands passed on branch `codex/issue-236-ac06-ac08`:

```
node --test test/edit-guards.test.mjs test/setup-hooks.test.mjs
npm test
npm run validate:ci-parity
npm run validate:context-budget
npm run validate:skill-parity
npm run validate:adapter-parity
npm run validate:contracts
npm run validate:review-gate
npm run validate:project-state
git diff --check
```

Full suite result after rework: 715 passed, 0 failed. Context budget: 29,534 / 30,000
estimated tokens. Real stdin probes ran the adapter/skill, canonical, and
repin paths; the relevant validators passed and repin reported no stale hashes.

## Scope and limitations

- AC-09, AC-10, AC-11, and AC-12 are untouched.
- No `pre-commit` hook or commit blocking behavior was added; `core.hooksPath`
  was not changed by the implementation.
- A malformed or missing matrix causes the dispatcher to skip AC-06 discovery
  with an explicit advisory diagnostic; explicit `repin:source-matrix` remains
  fail-closed. This prevents a post-write advisory from becoming a blocking
  gate while keeping the failure visible.
- The settings hook's payload contract assumes Claude supplies
  `tool_input.file_path` (with `path` accepted as a compatibility fallback).

## Handoff

Developer Agent → independent Code Review → independent QA → Human Maintainer.
QA should re-run F1's missing/malformed matrix probes and mutate path discovery,
canonical export usage, multi-match execution, advisory failure continuation,
diagnostic emission, and the absence of a commit gate. No QA verdict is claimed
by this record.
