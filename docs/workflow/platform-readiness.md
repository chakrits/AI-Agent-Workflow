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

`.github/workflows/work-item-readiness.yml` reads the linked Work Item and evaluates the trusted default-branch `scripts/work-item-readiness.mjs` decision module. It has read-only `contents`, `pull-requests`, and `issues` permissions. It checks structural evidence only; it does not tick Issue Acceptance Criteria or replace QA judgment.

The check runs when the pull request is opened, edited, synchronized, reopened, changed from Draft, or its **pull request** labels change. A linked Issue label event does not trigger a `pull_request` workflow. Therefore, when QA adds, removes, or corrects a linked Work Item label, QA must rerun the readiness check from the pull request's **Checks** tab before moving it to `phase:human-review` or asking for merge. The rerun reads the current Issue labels and fails if the required evidence is absent.

This is a deliberate least-privilege boundary: automatically finding affected pull requests and rerunning their checks would require a separate write-capable GitHub automation design and approval. Do not claim that `pull_request` `labeled` or `unlabeled` events observe Issue label changes.

## GitLab Issue and Merge Request Readiness

Use `.gitlab/issue_templates/Work Item.md` and `.gitlab/merge_request_templates/Default.md`, then create the shared labels above in the GitLab project. `.gitlab-ci.yml` runs the portable test and contract-validation suite for merge request and push pipelines; it provides CI support for the same policy and templates.

GitLab CI does not perform API readiness enforcement without approved credentials. In particular, it does not read a linked Issue, mutate labels, tick Acceptance Criteria, or change Merge Request readiness. QA manually verifies the Issue Acceptance Criteria, records the evidence URL in the Merge Request and Issue, applies `status:verification-done`, and moves the Work Item to `phase:human-review` before a human merge decision.

If a GitLab API bot is proposed later, open a separately approved security/design work item. Its token scope, event model, failure handling, and audit trail must be reviewed before it can enforce readiness.
