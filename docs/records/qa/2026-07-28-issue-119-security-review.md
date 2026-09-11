# Security Review: SDD Revision — Dispatch Receipt Lifecycle Anti-Forgery Controls (Issue #119)

## Scope

Independent Security Reviewer pass on
`docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md`
and `DECISIONS.md` ADR-0013, per the original BLOCKED finding on Issue #116's
Fix 3 plan. Design-only review; no code exists yet.

## Assessment of Decision 1 (assurance model)

**Agree with the recommendation (Option A, repository-audited).** Option B
(runtime-attested) would require signing/issuer infrastructure this repo
does not have; deferring it rather than half-building it is the right call.
Option A is honestly scoped: the design explicitly states what it does *not*
prove (actual execution) rather than overclaiming, and Control 4 requires
that honesty to be encoded in the schema/validator output itself — this
matters, because a security control that is silently weaker than its name
implies is worse than no control.

## Assessment of Controls 1, 2, 4, 5

No blocking findings. Control 1's git-history replay is sound given this
repository's branch protection prevents force-push to `main` (append-only
history is a real property here, not an assumption). Control 2's
closed-role-set check is a reasonable, honestly-scoped anti-impersonation
measure. Control 5's warning-only (non-auto-mutating) expiry correctly
applies Issue #118's lesson that automation must never silently mutate
audit-relevant state.

## Finding: Control 3's GitHub-comment-URL evidence is shape-checked only, unlike its two sibling forms

**Severity: Important (not blocking Option A, but should close before this
control is considered complete).**

Control 3 defines three permitted `terminal_result_id` forms. Two are
existence-verified at validation time (commit SHA via `git cat-file -e`;
QA/work-item file via on-disk check). The third — GitHub comment URL — is
explicitly **shape-only**, justified in the doc as "no network egress from
the validator."

That justification doesn't hold up against this repository's own CI: `.github/workflows/work-item-readiness-refresh.yml`
already makes authenticated GitHub API calls from a workflow step (via
`actions/create-github-app-token` + `actions/github-script`), and
`validate-contracts.yml` (where `validate:dispatch-receipts` actually runs)
is a plain `pull_request`/`push` workflow with an implicit `secrets.GITHUB_TOKEN`
available — reading an issue/PR comment in the same repository is within
that token's default read scope. There is no missing infrastructure here,
unlike Decision 1's Option B.

**Why this matters:** of the three permitted evidence shapes, the
comment-URL form is the one most already used in this repository's own
TASK_LOG history (grep shows far more `#issuecomment-NNNN` citations than
commit-SHA or file-path citations). Leaving exactly that form weakly
verified means the evidence type agents will reach for most often is also
the easiest to fabricate a well-shaped-but-nonexistent value for — the
inverse of what a security control should prioritize.

**Recommendation:** upgrade Control 3.3 to a live existence check (`gh api
repos/{owner}/{repo}/issues/comments/{id}` or the REST equivalent) using the
default `GITHUB_TOKEN`, scoped to same-repository URLs only (the schema
pattern already restricts to `github.com/[owner]/[repo]/...`; add an
in-validator check that `[owner]/[repo]` matches the repository being
validated, so the token's default same-repo read scope suffices without
requesting broader permissions). If rate-limiting under high receipt volume
becomes a real constraint later, that's a reason to cache/batch the check,
not a reason to skip verification entirely.

**If Boss prefers to ship Option A without this tightening first:** that is
a legitimate scoping choice, but it should be an explicit, named decision
("Control 3.3 ships shape-only for v1; live-verification is a tracked
follow-up") rather than the current phrasing ("no network egress from the
validator"), which reads as a hard constraint rather than a choice.

## Verdict

**Approve Decision 1 (Option A).** Conditionally approve the control set
pending Boss's choice on Control 3.3 (tighten now vs. explicitly deferred
with a tracked follow-up). Controls 1, 2, 4, 5 are ready as designed.

No implementation should begin until Boss records both decisions.
