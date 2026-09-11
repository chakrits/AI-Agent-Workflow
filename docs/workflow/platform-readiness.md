# Platform Readiness Operations

This guide adapts the portable lifecycle contract in [dynamic-routing.md](./dynamic-routing.md) to GitHub and GitLab. It does not replace the Work Item, QA, or human approval responsibilities in the canonical workflow.

## Shared Label Taxonomy

Create the following labels in each hosting platform. An open Feature or Enhancement Work Item has exactly one `phase:` label; `status:` labels are additive evidence.

| Category | Labels |
|---|---|
| Current phase | `phase:requirements`, `phase:design`, `phase:planning`, `phase:development`, `phase:verification`, `phase:human-review`, `phase:blocked` |
| Evidence milestone | `status:spec-ready`, `status:development-done`, `status:verification-done` |
| Post-merge signal | `post-merge-closeout`, `documentation-sync` |

## GitHub Pull Request Readiness

`.github/workflows/work-item-readiness-refresh.yml` is the canonical GitHub evaluator. It runs trusted default-branch code on base-`main` `pull_request_target` events and `phase:`/`status:` Issue-label changes, reads the current Issue state with a least-privilege GitHub App token, and publishes the App-owned `work-item-readiness-freshness` Check Run on every open `main` PR. It checks structural evidence only; it does not tick Issue Acceptance Criteria or replace QA judgment.

The check therefore re-evaluates automatically when QA adds, removes, or corrects a linked Work Item lifecycle label. Main branch protection requires this check only when its source is **AI Agent Workflow**, never “Any source”. The evaluator checks out only trusted default-branch content and never executes PR-head code.

A linked Issue label does not trigger a native `pull_request` workflow; the trusted App evaluator exists specifically to close that event gap. Historical PR #20 records describing a manual QA rerun are superseded by PRs #23 and #24.

## GitLab Issue and Merge Request Readiness

Use `.gitlab/issue_templates/Work Item.md` and `.gitlab/merge_request_templates/Default.md`, then create the shared labels above in the GitLab project. `.gitlab-ci.yml` runs the portable test and contract-validation suite for merge request and push pipelines; it provides CI support for the same policy and templates.

GitLab CI does not perform API readiness enforcement without approved credentials. In particular, it does not read a linked Issue, mutate labels, tick Acceptance Criteria, or change Merge Request readiness. QA manually verifies the Issue Acceptance Criteria, records the evidence URL in the Merge Request and Issue, applies `status:verification-done`, and moves the Work Item to `phase:human-review` before a human merge decision.

If a GitLab API bot is proposed later, open a separately approved security/design work item. Its token scope, event model, failure handling, and audit trail must be reviewed before it can enforce readiness.
