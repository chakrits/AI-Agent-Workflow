# Config Change Plan — Issue #290

## Metadata

- Work Item ID: Issue #290
- Title: Install locked dependencies for the trusted work-item readiness workflow
- Owner: Developer Agent
- Environment: GitHub Actions (`pull_request_target`, trusted default-branch checkout)
- Status: Implementation complete; local verification passed; independent QA/hosted integration pending

## Business Reason

The required readiness check fails for valid PR frontmatter because the trusted workflow imports a validator that requires `yaml` and `ajv`, but the workflow never installs the lockfile dependencies.

## Config Items

| Key | Current Value | New Value | Scope | Reload Behavior | Effective Date | Owner |
|---|---|---|---|---|---|---|
| Readiness job Node runtime | Runner default | Node 22 via setup-node | Single GitHub Actions job | Restart-Required | Next workflow run after merge | Developer Agent |
| Readiness job dependencies | Not installed | `npm ci --ignore-scripts` from trusted default-branch checkout | Single GitHub Actions job | Restart-Required | Next workflow run after merge | Developer Agent |

## Feature Flags

N/A — no feature flags.

## Escalation Check

- [x] Routed to Developer Agent because workflow dependency setup and a regression contract test are required; this is not a config-only value update.
- No new dependency or GitHub permission is added. Lifecycle scripts stay disabled and the existing trusted checkout is preserved.

## Validation

- How to verify: focused workflow contract test, full test suite, repository validators, hosted PR CI, and a fresh readiness evaluation of PR #289 after merge.
- Expected result: dependencies resolve before the GitHub script imports the validator; a valid linked-issue PR receives success; malformed metadata remains fail-closed.

## Rollback

- Rollback method: revert the isolated workflow/test change.
- Rollback condition: dependency install fails on the trusted runner or introduces an unexpected workflow regression.

## QA Focus

- Verify the workflow installs from the trusted default-branch checkout before `github-script` executes.
- Verify no permissions, event filters, PR-code checkout, or readiness rules change.
- Verify `npm ci` does not execute package lifecycle scripts.
- Verify post-merge readiness refresh resolves the exact reported `YAML parser dependency unavailable` failure.

## Completion Evidence

| Completion Check URL / Repository Path | Status |
|---|---|
| `docs/records/qa/2026-09-30-issue-290-completion-check.md` | Pending |

## Related Artifacts / Links

| Artifact | Purpose | URL / Repository Path |
|---|---|---|
| Issue #290 | Requirements and acceptance criteria | https://github.com/chakrits/AI-Agent-Workflow/issues/290 |
| Implementation plan | Developer task breakdown and verification plan | `docs/records/implementation-plan/2026-09-30-issue-290-readiness-workflow-plan.md` |
| Debug ledger | Repro, root cause, hypotheses, and fix direction | `docs/records/qa/2026-09-30-issue-290-debug-ledger.md` |
