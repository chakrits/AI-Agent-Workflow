# Post-Merge Documentation Stewardship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a documented, reviewable documentation-impact assessment after every pull request merge into `main`.

**Architecture:** Keep the role rule canonical in `docs/workflow/role-definitions.md`; the Claude agent file remains an adapter that implements the canonical rule. A reusable Markdown template records each merge review, and the project index exposes it. Project state records this approved process improvement without closing the outstanding Phase 1 hosted-CI follow-up.

**Tech Stack:** Markdown, existing Node `node:test` quality checks, Git.

## Global Constraints

- Every merge into `main` triggers a Documentation Agent review, even if no documentation changes are ultimately needed.
- The review updates affected artifacts or records `No update required — <reason>` in a tracked review record.
- The Documentation Agent may not approve release, hosted CI, human gates, or risk closure without evidence.
- Do not change the canonical Bug Fix policy or application behavior.
- Preserve Phase 1's unverified hosted-GitHub-Actions follow-up as an open risk.

---

### Task 1: Add the canonical post-merge rule and reusable record template

**Files:**
- Modify: `docs/workflow/role-definitions.md`
- Create: `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md`
- Modify: `PROJECT_INDEX.md`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-14-post-merge-documentation-stewardship-design.md`.
- Produces: canonical Documentation Agent lifecycle rule and a template named `POST_MERGE_DOCUMENTATION_REVIEW.md` for every merge record.

- [ ] **Step 1: Add a complete Documentation Agent section to the canonical role definition.**

  Replace the one-sentence `## Documentation Agent` body with requirements that: trigger after every merge to `main`; classify the review as documentation-only/Medium; assess `PROJECT_INDEX.md`, `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md`, `DECISIONS.md`, `RISKS.md`, and canonical/adapters; update affected files or record `No update required — <reason>`; create the review record; hand off to a Reviewer; and escalate conflicts, unverified hosted CI, release implications, and unresolved risks to their named owners.

- [ ] **Step 2: Create the post-merge review template.**

  Create `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md` with these headings in this order:

  ```markdown
  # Post-Merge Documentation Review

  ## Merge Reference
  ## Change Classification
  ## Impact Assessment
  ## Documentation Updates
  ## Verification Performed
  ## Known Limitations and Unverified Evidence
  ## Risks and Open Questions
  ## Reviewer Handoff
  ## Completion Check
  ```

  Under `Impact Assessment`, include a table with rows for all seven mandatory review targets and columns `Artifact`, `Affected?`, and `Update / No-update rationale`. Under `Reviewer Handoff`, include from/to, next quality gate, and recommended next step. Under `Completion Check`, require confirmation that every target was assessed and that no release/CI/risk closure was inferred.

- [ ] **Step 3: Link the template from the project index.**

  Add a Templates-list entry:

  ```markdown
  - [docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md](./docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md) - Mandatory documentation-impact review after each merge to `main`.
  ```

- [ ] **Step 4: Check Markdown structure and whitespace.**

  Run:

  ```bash
  rg -n "Post-Merge Documentation|PROJECT_INDEX.md|PROJECT_STATUS.md|TASK_LOG.md|CHANGELOG.md|DECISIONS.md|RISKS.md|No update required" docs/workflow/role-definitions.md docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md PROJECT_INDEX.md
  git diff --check
  ```

  Expected: all mandatory targets and the no-update rule appear; `git diff --check` has no output.

- [ ] **Step 5: Commit the canonical rule and template.**

  ```bash
  git add docs/workflow/role-definitions.md docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md PROJECT_INDEX.md
  git commit -m "docs: add post-merge documentation review"
  ```

### Task 2: Align the Claude Documentation Agent adapter and add a regression check

**Files:**
- Modify: `.claude/agents/documentation-agent.md`
- Modify: `test/validate-contracts.test.mjs`

**Interfaces:**
- Consumes: the canonical rule and template from Task 1.
- Produces: a Claude adapter that links to the canonical rule and a Node test that detects removal of the post-merge trigger, required review targets, template, or escalation boundary.

- [ ] **Step 1: Write the failing documentation-governance test.**

  Add a Node test named `Documentation Agent requires post-merge review and a complete record` that reads `docs/workflow/role-definitions.md`, `.claude/agents/documentation-agent.md`, and `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md`. Assert that both role documents mention `every merge into main`, `POST_MERGE_DOCUMENTATION_REVIEW.md`, and `No update required`; assert the canonical rule includes all seven review targets; assert the template contains all headings from Task 1; and assert the adapter prohibits approval of release, hosted CI, and risk closure without evidence.

- [ ] **Step 2: Run the focused test and confirm it fails before the adapter update.**

  Run:

  ```bash
  npm test -- --test-name-pattern="Documentation Agent requires post-merge review and a complete record"
  ```

  Expected: fail because the existing adapter does not yet contain the post-merge requirements.

- [ ] **Step 3: Expand the Claude adapter without duplicating policy ambiguously.**

  Add `Post-Merge Trigger`, `Impact Assessment`, `Required Record`, `Completion Rules`, and `Escalation Boundaries` sections. State that `docs/workflow/role-definitions.md` is canonical; repeat operational requirements only as a faithful adapter. Refer to `docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md` for the record. Require an update or `No update required — <reason>` for each target. Explicitly prohibit release approval, hosted-CI confirmation, human-gate approval, and risk closure without evidence.

- [ ] **Step 4: Run the focused regression test and the full test suite.**

  Run:

  ```bash
  npm test -- --test-name-pattern="Documentation Agent requires post-merge review and a complete record"
  npm test
  npm run validate:contracts
  git diff --check
  ```

  Expected: focused test passes; all Node tests pass; contract validation prints `Contract validation passed.`; whitespace check has no output.

- [ ] **Step 5: Commit adapter parity and regression coverage.**

  ```bash
  git add .claude/agents/documentation-agent.md test/validate-contracts.test.mjs
  git commit -m "docs: require post-merge documentation stewardship"
  ```

### Task 3: Record project state, risk ownership, and reviewer handoff

**Files:**
- Modify: `PROJECT_STATUS.md`
- Modify: `TASK_LOG.md`
- Modify: `RISKS.md`
- Modify: `CHANGELOG.md`
- Create: `docs/records/POST-MERGE-DOCUMENTATION-STEWARDSHIP-2026-07-14-COMPLETION.md`

**Interfaces:**
- Consumes: implemented rule, template, test results, and the existing Phase 1 hosted-CI limitation.
- Produces: durable state/history evidence plus a reviewer-ready completion record. This record is not a post-merge instance; it records implementation of the stewardship capability.

- [ ] **Step 1: Update project state without erasing Phase 1 follow-up.**

  Set the current work item to `POST-MERGE-DOCUMENTATION-STEWARDSHIP-2026-07-14`, with documentation/process change classification and Medium risk. Record the completed rule/template/coverage as completed. Preserve the unrecorded hosted GitHub Actions result for Phase 1 as an open blocker or tracked follow-up, and make Reviewer the next agent.

- [ ] **Step 2: Add history, changelog, and risk entries.**

  Append a `TASK_LOG.md` row describing the approved post-merge stewardship implementation and Reviewer handoff. Add an Unreleased changelog entry. Replace the blank `R-001` row in `RISKS.md` with the hosted-CI confirmation risk: owner `Reviewer / QA Agent`, status `Open`, mitigation `review and record the first GitHub Actions run on main`.

- [ ] **Step 3: Create the implementation completion record.**

  Create the completion record with scope, files changed, checks run, explicit statement that no hosted GitHub Actions result was verified, the owned Phase 1 risk reference, and a full `docs/templates/HANDOFF.md`-compatible handoff. Use `Task State: N/A — documentation-process implementation, not a Bug Fix task-state instance`; keep Project/PR status separate.

- [ ] **Step 4: Run final evidence checks.**

  Run:

  ```bash
  npm test
  npm run validate:contracts
  git diff --check
  git status --short
  ```

  Expected: all tests pass, contract validation passes, no whitespace errors, and only Task 3 files are unstaged before commit.

- [ ] **Step 5: Commit state and handoff artifacts.**

  ```bash
  git add PROJECT_STATUS.md TASK_LOG.md RISKS.md CHANGELOG.md docs/records/POST-MERGE-DOCUMENTATION-STEWARDSHIP-2026-07-14-COMPLETION.md
  git commit -m "docs: record documentation stewardship rollout"
  ```

## Final Review Scope

- Confirm the canonical role definition, Claude adapter, and template agree on the every-merge trigger, all seven targets, no-update rationale, and escalation limits.
- Confirm the regression test is meaningful by checking that it would fail if the trigger/template/target list/approval prohibition were removed.
- Confirm project state makes Phase 1 hosted-CI confirmation visible as an open owned risk rather than a completed check.
- Confirm no artifact claims a release, hosted-CI result, or risk closure without evidence.
