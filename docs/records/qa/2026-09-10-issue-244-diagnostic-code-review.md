# Issue #244 diagnostic instrumentation review

Work item: [Issue #244](https://github.com/chakrits/AI-Agent-Workflow/issues/244)

## Scope

This branch adds temporary diagnostics to capture the CI-only `resolveDiffRange`
failure without changing validator semantics, assertions, retries, or error
handling. The task remains in bug-fix state `investigating`; no root cause or fix
is claimed here.

## Instrumentation

When `REVIEW_GATE_DIAGNOSTICS=1`, `scripts/validate-review-gate.mjs` writes one
JSON line per relevant event to stderr, prefixed with `[issue-244-debug]`:

- `resolve-diff-range`: `GITHUB_BASE_REF`, fixture `cwd`, repository top level,
  remote names, ref names, candidate refs, and whether the base declaration is
  authoritative.
- `resolve-diff-range-head`: resolved `HEAD` object id or null.
- `git-merge-base`: exact candidate command, exit status or signal, stdout, and
  stderr for each `git merge-base` attempt.

The flag is disabled by default. The workflow enables it temporarily at job
scope so GitHub retains the lines in the normal step log. No remote URLs,
tokens, or full process environment are emitted. The instrumentation runs only
for `merge-base` calls plus the bounded repository context needed to interpret
them.

## Behavioural safety

The default path keeps the existing `gitCapture` error swallowing and return
values. Diagnostic mode only changes stderr capture and emits observations; it
does not alter candidates, ranges, assertions, retries, or exit codes.

## Cleanup plan

After one CI run that exercises the affected test family, remove:

1. the diagnostic helpers and log calls in `scripts/validate-review-gate.mjs`;
2. the temporary `REVIEW_GATE_DIAGNOSTICS` workflow environment entry; and
3. this branch-only review record and the matching ledger instrumentation note
   if the project keeps the ledger outside the repository.

Do not implement a fix from this branch until the captured failure establishes
a concrete fail path and updates the Issue #244 hypothesis matrix.

## Review focus

- Confirm the flag is opt-in and bounded.
- Confirm failure and success records preserve exact Git status/stdout/stderr.
- Confirm diagnostic output contains no remote URL or environment dump.
- Confirm all existing tests and validators pass with the flag unset.
