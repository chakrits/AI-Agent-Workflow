# PM Agent Instruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-sentence PM Agent stub with a complete, machine-checkable role definition (trigger, mandatory business assessment, critical rules, expanded brief template, completion/escalation rules), matching the structure already used for the Documentation Agent.

**Architecture:** Keep the role rule canonical in `docs/workflow/role-definitions.md`; `.claude/agents/pm-agent.md` remains a faithful adapter that restates but does not redefine the canonical rule. `docs/templates/PROJECT_BRIEF.md` gains one section per mandatory-assessment dimension. A Node regression test asserts the trigger, the six dimensions, the critical rules, and the template headings all stay present.

**Tech Stack:** Markdown, existing Node `node:test` quality checks, Git.

## Global Constraints

- The six mandatory-assessment dimensions are exactly: Business Goal, Scope (In/Out), Stakeholder Impact, Success Metric, Priority, Release Intent / Roadmap Fit.
- Every Success Metric must be measurable (number, threshold, or explicit pass/fail condition, plus measurement method) — this rule must appear verbatim enough to be regression-tested (`must be measurable`).
- PM Agent does not approve architecture, implementation, or release decisions — this prohibition must appear in both the canonical rule and the adapter.
- Do not change `AGENTS.md` Dynamic Routing Rules, Stop Conditions, or add risk classification to PM Agent (that remains Orchestrator's job).
- Preserve the existing `Assumptions`, `Open Questions`, `Risks`, and `Approval / Review` sections of `PROJECT_BRIEF.md`.

---

### Task 1: Add the canonical PM Agent rule and expand the brief template

**Files:**
- Modify: `docs/workflow/role-definitions.md`
- Modify: `docs/templates/PROJECT_BRIEF.md`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-14-pm-agent-instruction-design.md`.
- Produces: the canonical PM Agent lifecycle rule and the expanded `PROJECT_BRIEF.md` template used by Task 2's adapter and regression test.

- [ ] **Step 1: Replace the `## PM Agent` section in `docs/workflow/role-definitions.md`.**

  Find the current section:

  ```markdown
  ## PM Agent

  Clarifies business goal, priority, scope, success metric, stakeholder impact, roadmap fit, and release intent.
  ```

  Replace it with:

  ```markdown
  ## PM Agent

  Clarifies business goal, priority, scope, success metric, stakeholder impact, roadmap fit, and release intent. The canonical PM Agent business-framing rule is defined here; platform-specific agent files are adapters.

  ### Trigger

  PM Agent is invoked when Orchestrator classifies an incoming request as carrying unresolved business-goal ambiguity, normally the first step of the New Feature flow. PM Agent is also invoked when BA or SA routes backward because business scope, priority, or stakeholder impact is unclear. PM Agent is skipped for small approved operational changes per the Skip Rules in `AGENTS.md`.

  ### Mandatory Assessment

  For a new work item, assess all six dimensions below. For a re-review triggered by backward routing, record an unchanged dimension as `No update required — <reason>`.

  - Business Goal
  - Scope (In / Out)
  - Stakeholder Impact
  - Success Metric
  - Priority
  - Release Intent / Roadmap Fit

  Create the review record from `docs/templates/PROJECT_BRIEF.md`, with one section per mandatory-assessment dimension.

  ### Critical Rules

  1. Do not state a Business Goal, Scope item, or Stakeholder Impact that is not traceable to the original request or stakeholder input. Quote or closely paraphrase the source.
  2. A Success Metric must be measurable: a number, threshold, or explicit pass/fail condition, plus how it will be measured. Reject vague phrasing such as "improve UX."
  3. Do not set Priority or Release Intent unilaterally when it conflicts with an existing roadmap commitment recorded in project state — escalate to Human.
  4. Do not hand a brief to BA/SA while an Open Question or an unresolved stakeholder conflict remains unflagged.
  5. PM Agent does not approve architecture, implementation, or release decisions. Its authority is limited to business framing.

  ### Completion and Escalation

  Complete the PM review only after every mandatory-assessment dimension has content or a no-update rationale, every Success Metric row satisfies Critical Rule 2, every Open Question is resolved or flagged, and a BA/Reviewer handoff is ready.

  Route requirement ambiguity beyond goal-level framing to the BA Agent. Route unknown or disputed technical feasibility to the SA Agent. Route conflicting stakeholder priorities, roadmap conflicts, or a mid-project scope change to a Human approval gate. Route release/deployment implications to the Release Agent and Human approval.
  ```

- [ ] **Step 2: Replace `docs/templates/PROJECT_BRIEF.md` in full.**

  Overwrite the file with:

  ```markdown
  # PROJECT_BRIEF.md

  ## Metadata

  - Work Item ID:
  - Title:
  - Owner:
  - Date:
  - Status: Draft / Review / Approved

  ## Business Goal



  ## Scope

  ### In Scope

  -

  ### Out of Scope

  -

  ## Stakeholder Impact



  ## Success Metric

  | Metric | Target | Measurement Method |
  |---|---|---|
  |  |  |  |

  ## Priority



  ## Release Intent / Roadmap Fit



  ## Assumptions

  -

  ## Open Questions

  -

  ## Risks

  -

  ## Approval / Review

  - Reviewer:
  - Decision:
  - Notes:
  ```

- [ ] **Step 3: Check Markdown structure and whitespace.**

  Run:

  ```bash
  rg -n "Business Goal|Stakeholder Impact|Success Metric|Release Intent|must be measurable|not traceable to the original request" docs/workflow/role-definitions.md docs/templates/PROJECT_BRIEF.md
  git diff --check
  ```

  Expected: all six dimension names and both critical-rule phrases appear in `role-definitions.md`; the dimension headings appear in `PROJECT_BRIEF.md`; `git diff --check` has no output.

- [ ] **Step 4: Commit.**

  ```bash
  git add docs/workflow/role-definitions.md docs/templates/PROJECT_BRIEF.md
  git commit -m "docs: add canonical PM Agent business-framing rule"
  ```

### Task 2: Align the Claude PM Agent adapter and add a regression check

**Files:**
- Modify: `.claude/agents/pm-agent.md`
- Modify: `test/validate-contracts.test.mjs`

**Interfaces:**
- Consumes: the canonical rule and template from Task 1.
- Produces: a Claude adapter that restates the canonical rule and a Node test that detects removal of the trigger, the six mandatory dimensions, the critical rules, or the template headings.

- [ ] **Step 1: Write the failing PM Agent governance test.**

  Open `test/validate-contracts.test.mjs` and add this test after the existing `Documentation Agent requires post-merge review and a complete record` test (which currently ends around line 114):

  ```js
  test('PM Agent requires the mandatory business assessment and measurable success metrics', async () => {
    const [roleDefinition, adapter, template] = await Promise.all([
      readFile('docs/workflow/role-definitions.md', 'utf8'),
      readFile('.claude/agents/pm-agent.md', 'utf8'),
      readFile('docs/templates/PROJECT_BRIEF.md', 'utf8')
    ]);
    const requiredDimensions = [
      'Business Goal',
      'Scope',
      'Stakeholder Impact',
      'Success Metric',
      'Priority',
      'Release Intent'
    ];
    const requiredHeadings = [
      'Metadata',
      'Business Goal',
      'In Scope',
      'Out of Scope',
      'Stakeholder Impact',
      'Success Metric',
      'Priority',
      'Release Intent / Roadmap Fit',
      'Assumptions',
      'Open Questions',
      'Risks',
      'Approval / Review'
    ];

    for (const content of [roleDefinition, adapter]) {
      for (const dimension of requiredDimensions) {
        assert.match(content, new RegExp(dimension));
      }
      assert.match(content, /must be measurable/i);
      assert.match(content, /not traceable to the original request/i);
    }
    for (const heading of requiredHeadings) {
      assert.match(template, new RegExp(`#+ ${heading}`));
    }
    assert.match(
      adapter,
      /does not approve architecture, implementation, or release decisions/i
    );
  });
  ```

- [ ] **Step 2: Run the focused test and confirm it fails before the adapter update.**

  Run:

  ```bash
  npm test -- --test-name-pattern="PM Agent requires the mandatory business assessment and measurable success metrics"
  ```

  Expected: fail — `.claude/agents/pm-agent.md` does not yet contain the trigger, dimensions, or critical rules.

- [ ] **Step 3: Rewrite `.claude/agents/pm-agent.md` in full.**

  ```markdown
  ---
  name: pm-agent
  description: Use for business goal, scope, priority, roadmap, stakeholder impact, and success metrics.
  tools: Read, Grep, Glob, Bash, Edit
  ---

  # pm-agent

  ## Canonical Source

  Follow `AGENTS.md` and `docs/workflow/`, especially `docs/workflow/role-definitions.md`. This file is a Claude Code adapter and must not redefine canonical policy.

  ## Responsibilities

  - Clarify business objective.
  - Define scope and out-of-scope.
  - Identify stakeholder impact.
  - Define success metrics and priority.
  - Produce PROJECT_BRIEF or roadmap artifacts.

  ## Trigger

  Invoked when Orchestrator classifies a request as carrying unresolved business-goal ambiguity, normally the first step of the New Feature flow, or when BA/SA route backward over unclear business scope, priority, or stakeholder impact. Skipped for small approved operational changes per the Skip Rules in `AGENTS.md`.

  ## Mandatory Assessment

  Assess Business Goal, Scope (In/Out), Stakeholder Impact, Success Metric, Priority, and Release Intent / Roadmap Fit for every new work item. Record an unchanged dimension as `No update required — <reason>` on re-review.

  ## Critical Rules

  1. Do not state a Business Goal, Scope item, or Stakeholder Impact that is not traceable to the original request or stakeholder input.
  2. A Success Metric must be measurable — a number, threshold, or explicit pass/fail condition, plus how it will be measured.
  3. Do not set Priority or Release Intent unilaterally against an existing roadmap commitment — escalate to Human.
  4. Do not hand a brief to BA/SA while an Open Question or unresolved stakeholder conflict remains unflagged.
  5. PM Agent does not approve architecture, implementation, or release decisions.

  ## Required Record

  Create the review record from `docs/templates/PROJECT_BRIEF.md`.

  ## Completion Rules

  Complete the review only after every mandatory-assessment dimension has content or a no-update rationale, every Success Metric row is measurable, every Open Question is resolved or flagged, and a BA/Reviewer handoff is ready.

  ## Escalation Boundaries

  Route requirement ambiguity beyond goal-level framing to BA Agent. Route unknown or disputed technical feasibility to SA Agent. Route conflicting stakeholder priorities, roadmap conflicts, or mid-project scope change to a Human approval gate. Route release/deployment implications to the Release Agent and Human approval.

  ## Required Behavior

  1. Read `PROJECT_STATUS.md` before starting.
  2. Check routing and quality gate requirements.
  3. Produce structured artifacts using `docs/templates/`, including `PROJECT_BRIEF.md`.
  4. Create a handoff using `docs/templates/HANDOFF.md`.
  5. Update `PROJECT_STATUS.md` and `TASK_LOG.md` when appropriate.
  6. Do not perform work outside this role unless explicitly routed.
  ```

- [ ] **Step 4: Run the focused regression test and the full test suite.**

  Run:

  ```bash
  npm test -- --test-name-pattern="PM Agent requires the mandatory business assessment and measurable success metrics"
  npm test
  npm run validate:contracts
  git diff --check
  ```

  Expected: focused test passes; all Node tests pass; contract validation prints `Contract validation passed.`; whitespace check has no output.

- [ ] **Step 5: Commit.**

  ```bash
  git add .claude/agents/pm-agent.md test/validate-contracts.test.mjs
  git commit -m "docs: align PM Agent adapter and add regression coverage"
  ```

### Task 3: Record project state and reviewer handoff

**Files:**
- Modify: `PROJECT_STATUS.md`
- Modify: `TASK_LOG.md`
- Modify: `CHANGELOG.md`
- Create: `docs/records/PM-AGENT-INSTRUCTION-2026-07-14-COMPLETION.md`

**Interfaces:**
- Consumes: the implemented rule, template, adapter, and test results from Tasks 1–2.
- Produces: durable state/history evidence plus a reviewer-ready completion record.

- [ ] **Step 1: Update `PROJECT_STATUS.md`.**

  Replace the file contents with:

  ```markdown
  # PROJECT_STATUS.md

  ## Current Work Item
  - ID: PM-AGENT-INSTRUCTION-2026-07-14
  - Title: Give PM Agent a complete, machine-checkable business-framing instruction
  - Owner: Developer / Implementation Agent
  - Status: Ready for Review

  ## Current Stage
  - PM Agent Instruction / Reviewer Gate

  ## Change Classification
  - Change Type: Documentation and process-governance change with regression coverage
  - Risk Level: Medium
  - Code Change Required: Yes — scoped Node regression coverage for the PM Agent rule
  - Architecture Change Required: No — implements the approved PM Agent instruction design
  - Security Review Required: No

  ## Completed
  - Approved the PM Agent instruction design informed by external agency-agents research.
  - Added the canonical PM Agent rule (trigger, mandatory assessment, critical rules, completion/escalation rules).
  - Expanded `PROJECT_BRIEF.md` with one section per mandatory-assessment dimension and a measurable Success Metric table.
  - Aligned the Claude PM Agent adapter with the canonical rule.
  - Added regression coverage for the trigger, six mandatory dimensions, critical rules, and template headings.

  ## In Progress
  - Independent review of the PM Agent instruction, template, and regression coverage.

  ## Blockers / Open Questions
  - None for this work item. R-001 (Phase 1 hosted-CI confirmation) remains a separate open item owned by Reviewer / QA Agent.

  ## Required Artifacts
  - `docs/superpowers/specs/2026-07-14-pm-agent-instruction-design.md`
  - `docs/superpowers/plans/2026-07-14-pm-agent-instruction.md`
  - `docs/templates/PROJECT_BRIEF.md`
  - `docs/records/PM-AGENT-INSTRUCTION-2026-07-14-COMPLETION.md`

  ## Next Quality Gate
  - Reviewer confirms the canonical rule, Claude adapter, template, and regression test agree.

  ## Recommended Next Agent
  - Reviewer, then Reviewer / QA Agent for the outstanding Phase 1 hosted-CI confirmation (R-001)

  ## Notes
  - This work item defines the PM Agent instance only. Extracting a shared cross-role pattern from the Documentation Agent and PM Agent precedents is a separate, future decision.
  - R-001 (Phase 1 hosted-CI confirmation) is unaffected by this work item and remains open.
  ```

- [ ] **Step 2: Append a `TASK_LOG.md` row.**

  Append this row to the table in `TASK_LOG.md`:

  ```markdown
  | 2026-07-14 | PM-AGENT-INSTRUCTION-2026-07-14 | Developer / Implementation Agent | Implemented the approved PM Agent business-framing instruction | Canonical role rule, expanded PROJECT_BRIEF template, Claude adapter, and regression coverage added | Reviewer | Skipped RISKS.md — no new risk introduced; R-001 remains the only open item and is unaffected |
  ```

- [ ] **Step 3: Add a CHANGELOG.md entry.**

  In `CHANGELOG.md`, under `## Unreleased` / `### Added`, add:

  ```markdown
  - Canonical PM Agent business-framing rule, expanded `PROJECT_BRIEF.md` template, and regression coverage.
  ```

- [ ] **Step 4: Create the completion record.**

  Create `docs/records/PM-AGENT-INSTRUCTION-2026-07-14-COMPLETION.md`:

  ```markdown
  # PM Agent Instruction — Completion Check

  ## Completion Claim

  | Item | Detail |
  |---|---|
  | Work Item | PM-AGENT-INSTRUCTION-2026-07-14 |
  | Status | Ready for Review |
  | Change Type | Documentation and process-governance change with regression coverage |
  | Risk Level | Medium |
  | Scope | Canonical PM Agent business-framing rule, expanded brief template, adapter parity, regression coverage |

  ## Completed Work

  - Added the canonical PM Agent rule in `docs/workflow/role-definitions.md`.
  - Expanded `docs/templates/PROJECT_BRIEF.md` with one section per mandatory-assessment dimension and a measurable Success Metric table.
  - Aligned `.claude/agents/pm-agent.md` as a faithful adapter.
  - Added Node regression coverage for the trigger, six mandatory dimensions, critical rules, and template headings.

  ## Artifacts Produced

  - `docs/superpowers/specs/2026-07-14-pm-agent-instruction-design.md`
  - `docs/superpowers/plans/2026-07-14-pm-agent-instruction.md`
  - Expanded `docs/templates/PROJECT_BRIEF.md`
  - This completion record

  ## Files Changed

  - `docs/workflow/role-definitions.md`
  - `docs/templates/PROJECT_BRIEF.md`
  - `.claude/agents/pm-agent.md`
  - `test/validate-contracts.test.mjs`
  - `PROJECT_STATUS.md`, `TASK_LOG.md`, `CHANGELOG.md`

  ## Verification Performed

  - Focused Node regression test for the PM Agent instruction.
  - Full `npm test` suite.
  - `npm run validate:contracts`.
  - `git diff --check`.

  ## Evidence References

  - Approved design: `docs/superpowers/specs/2026-07-14-pm-agent-instruction-design.md`
  - Implementation plan: `docs/superpowers/plans/2026-07-14-pm-agent-instruction.md`
  - Canonical rule and template: `docs/workflow/role-definitions.md`; `docs/templates/PROJECT_BRIEF.md`
  - Regression coverage: `test/validate-contracts.test.mjs`

  ## Known Limitations

  - This work item covers the PM Agent instance only. The other eight under-specified roles (BA, SA, Developer, QA, Security, Config, Data, Release) are unchanged.
  - No cross-role reusable pattern was extracted from the Documentation Agent and PM Agent precedents; that remains a future decision.

  ## Open Questions

  - Should a shared template/pattern be extracted for the remaining under-specified roles, and if so, which role goes next?

  ## Reviewer Handoff

  | Field | Detail |
  |---|---|
  | From Agent | Developer / Implementation Agent |
  | To Agent | Reviewer |
  | Work Item | PM-AGENT-INSTRUCTION-2026-07-14 |
  | Change Type | Documentation and process-governance change with regression coverage |
  | Risk Level | Medium |
  | Current Stage | PM Agent Instruction / Reviewer Gate |
  | Task State | N/A — documentation-process implementation, not a Bug Fix task-state instance |
  | Contract Version | N/A |
  | Rework Count | N/A |
  | Completed Work | Canonical rule, template, Claude adapter, and regression coverage |
  | Artifacts Produced | Design, plan, template, and completion record listed above |
  | Files Changed | Files listed in the Files Changed section |
  | Verification Performed | Focused test, full Node test suite, contract validation, and whitespace check |
  | Evidence References | Design, plan, canonical rule, template, and regression test |
  | Stop Reason | None |
  | Known Limitations | Other eight roles remain one-line stubs; no cross-role pattern extracted |
  | Open Questions | Whether/when to extract a shared pattern for remaining roles |
  | QA / Review Focus | Confirm canonical/adapter/template parity and that the regression test is meaningful |
  | Recommended Next Step | Reviewer validates the PM Agent instruction gate |

  ## Completion Check

  | Item | Status | Notes |
  |---|---|---|
  | Workflow / Agent | Passed | Developer / Implementation Agent → Reviewer |
  | Skill Used | Passed | Brainstorming, writing plans, and executing plans |
  | Source Inputs | Passed | Approved design and implementation plan |
  | Artifacts Updated | Passed | Rule, adapter, template, state, and handoff record |
  | Tests / Checks | Passed | Full evidence listed above |
  | Quality Gate | Ready for Review | Independent review remains required |
  | Risks / Limitations | Passed | No new risk introduced; R-001 unaffected |
  | Open Questions | Passed | Cross-role pattern extraction explicitly deferred |
  | Next Recommended Agent | Passed | Reviewer |
  ```

- [ ] **Step 5: Run final evidence checks.**

  Run:

  ```bash
  npm test
  npm run validate:contracts
  git diff --check
  git status --short
  ```

  Expected: all tests pass, contract validation passes, no whitespace errors, and only Task 3 files are unstaged before commit.

- [ ] **Step 6: Commit.**

  ```bash
  git add PROJECT_STATUS.md TASK_LOG.md CHANGELOG.md docs/records/PM-AGENT-INSTRUCTION-2026-07-14-COMPLETION.md
  git commit -m "docs: record PM Agent instruction rollout"
  ```

## Final Review Scope

- Confirm the canonical role definition, Claude adapter, and template agree on the trigger, all six dimensions, the five critical rules, and the escalation limits.
- Confirm the regression test is meaningful by checking that it would fail if the trigger/dimensions/critical rules/template headings were removed.
- Confirm `PROJECT_BRIEF.md` still contains `Assumptions`, `Open Questions`, `Risks`, and `Approval / Review` unchanged in intent.
- Confirm no artifact grants PM Agent authority over architecture, implementation, or release decisions.
- Confirm project state correctly hands off to Reviewer and leaves R-001 untouched.
