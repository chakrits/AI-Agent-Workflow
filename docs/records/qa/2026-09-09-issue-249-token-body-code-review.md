# Issue #249 — Developer self-review and independent review request

Skill Used: debugging-discipline, implementation-planning, tdd-implementation,
verification-before-completion, code-review-gate, git-workflow-and-versioning.
Mode: Focused. Confidence: High for measured inputs; independent QA pending.
Source: Issue #249; ADR-0024; ADR-0025 approval at `cd43b4a`.

## Scope and fail path

Raw extraction regex read `--body` inside a quoted title, returning `fake` for
`gh pr create --title "a --body fake title" --body "real body"`.
The lexer returned strings, not argument tokens; AC-01's mismatch was escalated
before implementation. ADR-0025 authorizes extending that same lexer to emit tokens.
A direct extractor repro rules out readiness validation as this defect's cause.
No second shell parser, dependency, environment expansion, or shell evaluation added.

## Experiment ledger and AC evidence

- RED: `node --test --test-name-pattern='Issue #249' test/validate-pr-readiness.test.mjs`
  on baseline production code: all five shapes 9–13 fail; seven new cases fail total.
- GREEN: focused readiness suite passes. Each flag spelling, quoted whitespace,
  attached shorthand, cluster, repeated flag, and empty value has an explicit assertion.
- gh 2.96.0 probes with `GH_HOST=127.0.0.1`, prompt disabled: file reads happen
  before networking; last repeated file wins. Nonempty body-file overrides inline
  body in either order; empty final body-file falls back to inline. Parent independently
  confirmed via gh source `pkg/cmd/pr/create/create.go` lines 286–292.
- AC-04: 27 unchanged real bodies fetched by parent using `gh pr view N --json body`;
  re-derived every file set with `git diff-tree --no-commit-id --name-only -r <mergeCommit>`.
  All file-body outcomes equal baseline (14 pass; 13 pre-existing historical readiness
  failures). Token output preserves every real body byte; no body normalization.
- AC-05: isolated copies mutate `>=` to `>`, fence indent `{0,3}` to `{0,0}`, and
  `issue-(\d+)` to `issue-(\d*)`; each selected AC-05 test exits 1. Initial fence-close
  survivor prompted an equal-length-close assertion; rerun kills all three.
- AC-06: README assigns Documentation Impact to `documentation-impact-gate.yml`.
- AC-07: assertions retained. Two prior tests escaped real newlines into literal
  `\n` inside shell double quotes, relying on incorrect extractor decoding. They now
  provide actual multiline values with the same assertions; literal-backslash preservation
  is separately pinned. Full test/validator results recorded in developer-checks.json.

Session raw evidence: `/private/tmp/issue249-red.log`, `/private/tmp/issue249-green.log`,
`/private/tmp/issue249-mutations/results.json`,
`/private/tmp/issue249-history/candidate-replay.json`,
`/private/tmp/issue249-gh-probes/results.json`.
Historical PR numbers and immutable merge SHAs are in `history-replay.json`.

## Review focus, limitations and next owner

Independent QA must derive argument semantics, mutate assertions, replay real hook paths,
and verify retained no-flag/stdin denial and unreadable-file warning. This document is a
Developer self-review, not an independent verdict. No known scoped blocking defect after
self-checks. Existing substitution diagnostics still reject backticks even inside literal
single-quoted inline bodies (observed while replaying historical Markdown); file replay
uses the real supported body-file path. Other ADR-0024 residuals unchanged.
No secrets, new dependencies, or dead symbols found in scoped diff review.
Rollback: revert scoped implementation commit. Next owner: independent QA, then Human
Maintainer for merge. No merge approval inferred.
