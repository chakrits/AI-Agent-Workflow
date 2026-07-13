# Phase 1 Stabilize Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a machine-checkable, contract-first Bug Fix workflow with a two-rework limit and mandatory human escalation.

**Architecture:** `docs/contracts/bug-fix-workflow.yaml` is the canonical policy. YAML task-state fixtures are validated against `docs/contracts/schemas/task-state.schema.json`, then checked by a small Node validator for allowed transitions, evidence requirements, retry accounting, and the human-review stop. Existing workflow docs and platform adapters refer to this contract rather than duplicating policy.

**Tech Stack:** Node.js 22+, npm, ESM, `yaml`, `ajv`, Node built-in `node:test`, GitHub Actions.

## Global Constraints

- YAML is the only editable workflow-policy source; JSON Schema validates task-state instances and must not duplicate transition policy.
- The initial supported workflow is Bug Fix only.
- Maximum rework transitions: `2`; a third `verifying -> rework` transition is invalid.
- When validation fails after two reworks, the task must be `blocked` with `stop_reason: human_review_required`.
- Retain all existing human approval and Security Reviewer gates.
- Do not add an orchestrator, model runtime, scheduler, queue, database, or automatic code-edit loop.
- Keep `docs/workflow/` and `docs/operating-model/` canonical; `.agents/`, `.claude/`, and `.agent/` are adapters.
- Use a separate verifier/reviewer for the final policy and documentation review.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json` | Pins Node scripts and validator dependencies. |
| `package-lock.json` | Reproducible dependency resolution. |
| `scripts/validate-contracts.mjs` | CLI and reusable validation functions. |
| `test/validate-contracts.test.mjs` | Node tests for schema and workflow semantics. |
| `test/fixtures/invalid-illegal-transition.yaml` | Negative semantic-validation fixture. |
| `test/fixtures/invalid-third-rework.yaml` | Negative retry-budget fixture. |
| `docs/contracts/bug-fix-workflow.yaml` | Canonical Bug Fix state/transition/evidence policy. |
| `docs/contracts/schemas/task-state.schema.json` | Draft 2020-12 schema for task-state shape. |
| `docs/contracts/examples/*.yaml` | Three valid reference task-state fixtures. |
| `.github/workflows/validate-contracts.yml` | CI validation of workflow contracts. |
| `AGENTS.md`, `docs/operating-model/*.md`, `docs/workflow/*.md`, `docs/workflows/*.md`, `docs/templates/HANDOFF.md` | Shared vocabulary, gates, and handoff requirements. |
| `.agents/skills/dynamic-workflow/SKILL.md`, `.agents/workflows/dynamic-workflow.md`, `.claude/agents/orchestrator-agent.md`, `.claude/skills/dynamic-workflow/SKILL.md`, `.agent/skills/dynamic-workflow/SKILL.md` | Adapter links to the canonical contract. |

## Contract Interfaces

```yaml
# docs/contracts/bug-fix-workflow.yaml
workflow_id: bug-fix
contract_version: 1
max_rework_attempts: 2
states: [intake, investigating, implementing, verifying, rework, handoff, blocked]
transitions:
  - from: verifying
    to: rework
    requires: [verification_failed, rework_route]
```

```yaml
# all task-state documents
task_id: BUG-123
workflow_id: bug-fix
contract_version: 1
change_type: bug-fix
risk_level: medium
state: verifying
rework_count: 0
max_rework_attempts: 2
history: []
evidence: {}
next_route: qa-agent
stop_reason: null
```

`validateContracts(rootDir: string): Promise<string[]>` returns zero errors for a valid contract tree. The CLI writes every error to stderr and exits `1`; it writes `Contract validation passed.` and exits `0` when the result is empty.

### Task 1: Establish the validator toolchain and failing validation tests

**Files:**
- Create: `package.json`
- Create: `test/validate-contracts.test.mjs`
- Create: `test/fixtures/invalid-illegal-transition.yaml`
- Create: `test/fixtures/invalid-third-rework.yaml`
- Create: `scripts/validate-contracts.mjs`
- Create: `package-lock.json`

**Interfaces:**
- Consumes: `docs/contracts/` paths created in Task 2.
- Produces: `validateContracts(rootDir)` and the CLI command `npm run validate:contracts`.

- [ ] **Step 1: Create the package manifest with pinned validation dependencies.**

```json
{
  "name": "ai-agent-dynamic-workflow",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test",
    "validate:contracts": "node scripts/validate-contracts.mjs"
  },
  "devDependencies": {
    "ajv": "^8.17.1",
    "yaml": "^2.5.1"
  }
}
```

- [ ] **Step 2: Install the locked dependencies.**

Run: `npm install --package-lock-only && npm ci`

Expected: `package-lock.json` exists and `npm ci` exits `0`.

- [ ] **Step 3: Write the two failing semantic tests before implementing the validator.**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateContracts } from '../scripts/validate-contracts.mjs';

const adapterPaths = [
  '.agents/skills/dynamic-workflow/SKILL.md',
  '.agents/workflows/dynamic-workflow.md',
  '.claude/agents/orchestrator-agent.md',
  '.claude/skills/dynamic-workflow/SKILL.md',
  '.agent/skills/dynamic-workflow/SKILL.md'
];

test('rejects a transition not declared by the Bug Fix policy', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-illegal-transition.yaml'
  ]);
  assert.match(errors.join('\n'), /illegal transition: intake -> verifying/);
});

test('rejects a third Bug Fix rework transition', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-third-rework.yaml'
  ]);
  assert.match(errors.join('\n'), /rework_count must not exceed 2/);
});
```

- [ ] **Step 4: Run the tests and confirm they fail because the module does not exist.**

Run: `npm test -- test/validate-contracts.test.mjs`

Expected: failure containing `ERR_MODULE_NOT_FOUND` for `scripts/validate-contracts.mjs`.

- [ ] **Step 5: Create the minimal importable validator stub so the next failure is behavioral rather than a missing module.**

```js
export async function validateContracts() {
  return ['validator not implemented'];
}
```

- [ ] **Step 6: Run the two tests and verify both still fail because semantics are not implemented, not because of a missing module.**

Run: `npm test -- test/validate-contracts.test.mjs`

Expected: assertion failures containing `validator not implemented`.

- [ ] **Step 7: Commit the toolchain and failing-test foundation.**

Run: `git add package.json package-lock.json scripts/validate-contracts.mjs test/validate-contracts.test.mjs test/fixtures && git commit -m "test: add workflow contract validator foundation"`

### Task 2: Define the canonical Bug Fix policy, task-state schema, and valid examples

**Files:**
- Create: `docs/contracts/bug-fix-workflow.yaml`
- Create: `docs/contracts/schemas/task-state.schema.json`
- Create: `docs/contracts/examples/bug-fix-pass.yaml`
- Create: `docs/contracts/examples/bug-fix-first-rework.yaml`
- Create: `docs/contracts/examples/bug-fix-human-review.yaml`
- Modify: `test/validate-contracts.test.mjs`

**Interfaces:**
- Consumes: validator API from Task 1.
- Produces: the canonical policy and three passing reference fixtures.

- [ ] **Step 1: Add tests that assert all canonical examples validate cleanly.**

```js
test('accepts the three canonical Bug Fix examples', async () => {
  const errors = await validateContracts(process.cwd());
  assert.deepEqual(errors, []);
});
```

- [ ] **Step 2: Run the new test and confirm it fails because the canonical policy and examples are absent.**

Run: `npm test -- test/validate-contracts.test.mjs`

Expected: failure naming `docs/contracts/bug-fix-workflow.yaml`.

- [ ] **Step 3: Create the canonical YAML policy with exactly these states and transitions.**

```yaml
workflow_id: bug-fix
contract_version: 1
max_rework_attempts: 2
states: [intake, investigating, implementing, verifying, rework, handoff, blocked]
transitions:
  - { from: intake, to: investigating, requires: [failure_description, repro] }
  - { from: investigating, to: implementing, requires: [fail_path, hypothesis_matrix] }
  - { from: investigating, to: blocked, requires: [stop_reason] }
  - { from: implementing, to: verifying, requires: [changed_files, validation_plan] }
  - { from: verifying, to: handoff, requires: [original_repro_result, verification_result] }
  - { from: verifying, to: rework, requires: [verification_failed, rework_route] }
  - { from: verifying, to: blocked, requires: [verification_failed, human_review_required] }
  - { from: rework, to: implementing, requires: [rework_route] }
```

- [ ] **Step 4: Create a Draft 2020-12 JSON Schema that requires all task-state fields in the interface, uses enums for `change_type`, `risk_level`, and `state`, and requires each history item to contain `from`, `to`, `at`, `actor`, and `evidence_refs`.**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["task_id", "workflow_id", "contract_version", "change_type", "risk_level", "state", "rework_count", "max_rework_attempts", "history", "evidence", "next_route", "stop_reason"]
}
```

- [ ] **Step 5: Create three fixtures with these final conditions.**

| Fixture | Final state | `rework_count` | Required evidence |
|---|---:|---:|---|
| `bug-fix-pass.yaml` | `handoff` | `0` | original repro and verification pass |
| `bug-fix-first-rework.yaml` | `rework` | `1` | failed verification and rework route |
| `bug-fix-human-review.yaml` | `blocked` | `2` | failed verification and `human_review_required` |

- [ ] **Step 6: Implement schema loading and the policy checks in `validateContracts`, then run the full test file.**

Replace `scripts/validate-contracts.mjs` with:

```js
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';

async function readYaml(file) {
  return YAML.parse(await readFile(file, 'utf8'));
}

async function examplePaths(rootDir) {
  const directory = path.join(rootDir, 'docs/contracts/examples');
  return (await readdir(directory))
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => path.join('docs/contracts/examples', name));
}

function eventKey(event) {
  return `${event.from} -> ${event.to}`;
}

function validateHistory(policy, state, displayPath) {
  const errors = [];
  const transitions = new Map(
    policy.transitions.map((transition) => [`${transition.from} -> ${transition.to}`, transition])
  );
  const reworks = state.history.filter(
    (event) => event.from === 'verifying' && event.to === 'rework'
  ).length;

  for (const event of state.history) {
    const transition = transitions.get(eventKey(event));
    if (!transition) {
      errors.push(`${displayPath}: illegal transition: ${eventKey(event)}`);
      continue;
    }
    for (const evidence of transition.requires) {
      if (!event.evidence_refs.includes(evidence)) {
        errors.push(`${displayPath}: ${eventKey(event)} requires evidence ${evidence}`);
      }
    }
  }
  if (reworks !== state.rework_count) {
    errors.push(`${displayPath}: rework_count must equal history rework transitions`);
  }
  if (reworks > policy.max_rework_attempts) {
    errors.push(`${displayPath}: rework_count must not exceed ${policy.max_rework_attempts}`);
  }
  if (state.state === 'blocked' && reworks === policy.max_rework_attempts && state.stop_reason !== 'human_review_required') {
    errors.push(`${displayPath}: blocked task after retry limit requires human_review_required`);
  }
  return errors;
}

export async function validateContracts(rootDir, statePaths = []) {
  const contractDir = path.join(rootDir, 'docs/contracts');
  const policy = await readYaml(path.join(contractDir, 'bug-fix-workflow.yaml'));
  const schema = JSON.parse(await readFile(path.join(contractDir, 'schemas/task-state.schema.json'), 'utf8'));
  const validateSchema = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  const paths = statePaths.length ? statePaths : await examplePaths(rootDir);
  const errors = [];

  for (const relativePath of paths) {
    const state = await readYaml(path.join(rootDir, relativePath));
    if (!validateSchema(state)) {
      errors.push(`${relativePath}: ${validateSchema.errors.map((error) => error.message).join(', ')}`);
      continue;
    }
    if (state.workflow_id !== policy.workflow_id || state.contract_version !== policy.contract_version) {
      errors.push(`${relativePath}: workflow_id or contract_version does not match policy`);
      continue;
    }
    errors.push(...validateHistory(policy, state, relativePath));
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await validateContracts(process.cwd());
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Contract validation passed.');
  }
}
```

Run: `npm test -- test/validate-contracts.test.mjs`

Expected: all positive examples pass; the two negative fixtures fail with their asserted messages.

- [ ] **Step 7: Run the CLI against the canonical examples.**

Run: `npm run validate:contracts`

Expected: `Contract validation passed.` and exit `0`.

- [ ] **Step 8: Commit the canonical contract and fixtures.**

Run: `git add docs/contracts scripts/validate-contracts.mjs test/validate-contracts.test.mjs && git commit -m "feat: add Bug Fix workflow contract"`

### Task 3: Make validation repeatable in CI

**Files:**
- Create: `.github/workflows/validate-contracts.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm ci`, `npm test`, and `npm run validate:contracts` from Tasks 1–2.
- Produces: an auditable CI workflow and local validation instructions.

- [ ] **Step 1: Add a workflow test expectation to ensure the CI file contains the three required commands.**

```js
test('CI runs install, tests, and contract validation', async () => {
  const ci = await readFile('.github/workflows/validate-contracts.yml', 'utf8');
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run validate:contracts/);
});
```

- [ ] **Step 2: Run the test and confirm it fails because the workflow file is missing.**

Run: `npm test -- test/validate-contracts.test.mjs`

Expected: failure containing `ENOENT` for `.github/workflows/validate-contracts.yml`.

- [ ] **Step 3: Create the GitHub Actions workflow using Node 22.**

```yaml
name: Validate workflow contracts
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run validate:contracts
```

- [ ] **Step 4: Add a `Workflow Contract Validation` section to `README.md` with these commands.**

```bash
npm ci
npm test
npm run validate:contracts
```

- [ ] **Step 5: Run tests and the validation CLI.**

Run: `npm test && npm run validate:contracts`

Expected: test suite passes and CLI writes `Contract validation passed.`.

- [ ] **Step 6: Commit CI and local validation documentation.**

Run: `git add .github/workflows/validate-contracts.yml README.md test/validate-contracts.test.mjs && git commit -m "ci: validate workflow contracts"`

### Task 4: Align the canonical operating model, workflow docs, and handoff contract

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/operating-model/AGENT_OPERATING_MODEL.md`
- Modify: `docs/operating-model/SKILL_CATALOG.md`
- Modify: `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`
- Modify: `docs/workflow/dynamic-routing.md`
- Modify: `docs/workflow/quality-gates.md`
- Modify: `docs/workflow/handoff-contract.md`
- Modify: `docs/workflows/bug-fix.md`
- Modify: `docs/workflows/bug-debug-fix.md`
- Modify: `docs/templates/HANDOFF.md`

**Interfaces:**
- Consumes: canonical policy path and state/evidence vocabulary from Task 2.
- Produces: a single documented routing and handoff vocabulary.

- [ ] **Step 1: Add a failing terminology test that rejects legacy retry wording and requires the canonical contract path in Bug Fix docs.**

```js
test('Bug Fix documentation points to the canonical contract and uses the two-rework rule', async () => {
  const bugFix = await readFile('docs/workflows/bug-fix.md', 'utf8');
  const routing = await readFile('docs/workflow/dynamic-routing.md', 'utf8');
  assert.match(bugFix, /docs\/contracts\/bug-fix-workflow\.yaml/);
  assert.match(routing, /two rework transitions/);
  assert.doesNotMatch(routing, /more than 3 fix attempts/);
});
```

- [ ] **Step 2: Run the test and confirm it fails against the existing prose.**

Run: `npm test -- test/validate-contracts.test.mjs`

Expected: failure because the contract link and exact retry rule are absent.

- [ ] **Step 3: Update canonical docs to require `task-state` validation for Bug Fix work, preserve routing to BA/SA/Security, and replace all ambiguous retry wording with this rule.**

```text
Allow at most two verifying -> rework transitions. On the next failed verification,
set state to blocked with stop_reason: human_review_required and hand off to a human.
```

- [ ] **Step 4: Extend `docs/templates/HANDOFF.md` with `Task State`, `Contract Version`, `Rework Count`, `Evidence References`, and `Stop Reason` fields.**

- [ ] **Step 5: Add `contract-first Bug Fix validation` to the Dynamic Workflow skill entry in `SKILL_CATALOG.md` and its required output metadata.**

- [ ] **Step 6: Run the terminology test, full test suite, and a targeted scan.**

Run: `npm test && npm run validate:contracts && rg -n "more than 3 fix attempts" AGENTS.md docs .agents .claude .agent`

Expected: tests and validator pass; `rg` exits `1` with no matches.

- [ ] **Step 7: Commit the canonical documentation alignment.**

Run: `git add AGENTS.md docs/operating-model docs/workflow docs/workflows docs/templates/HANDOFF.md test/validate-contracts.test.mjs && git commit -m "docs: align Bug Fix loop policy"`

### Task 5: Link platform adapters and prove policy parity

**Files:**
- Modify: `.agents/skills/dynamic-workflow/SKILL.md`
- Modify: `.agents/workflows/dynamic-workflow.md`
- Modify: `.claude/agents/orchestrator-agent.md`
- Modify: `.claude/skills/dynamic-workflow/SKILL.md`
- Modify: `.agent/skills/dynamic-workflow/SKILL.md`
- Modify: `test/validate-contracts.test.mjs`

**Interfaces:**
- Consumes: `docs/contracts/bug-fix-workflow.yaml` from Task 2.
- Produces: adapters that reference the contract without embedding a divergent state machine.

- [ ] **Step 1: Add a failing adapter-parity test.**

```js
test('all dynamic-workflow adapters point to the canonical Bug Fix contract', async () => {
  for (const path of adapterPaths) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /docs\/contracts\/bug-fix-workflow\.yaml/);
    assert.doesNotMatch(content, /max_rework_attempts:\s*[^2]/);
  }
});
```

- [ ] **Step 2: Run the test and confirm it fails because the contract link is absent.**

Run: `npm test -- test/validate-contracts.test.mjs`

Expected: failures name each adapter path.

- [ ] **Step 3: Add this exact adapter statement to every listed adapter.**

```markdown
For Bug Fix work, read and validate against `docs/contracts/bug-fix-workflow.yaml`.
It is the canonical state, evidence, and two-rework stop policy; this adapter must not redefine it.
```

- [ ] **Step 4: Run all tests, contract validation, and an adapter scan.**

Run: `npm test && npm run validate:contracts && rg -n "bug-fix-workflow\.yaml" .agents .claude .agent`

Expected: tests and validator pass; scan returns all five adapter paths.

- [ ] **Step 5: Commit adapter parity links.**

Run: `git add .agents .claude .agent test/validate-contracts.test.mjs && git commit -m "docs: link adapters to workflow contract"`

### Task 6: Run the final quality gate and handoff

**Files:**
- Create: `docs/templates/COMPLETION_CHECK.md` instance under `docs/records/PHASE1-STABILIZE-CORE-2026-07-13-COMPLETION.md`
- Modify: `PROJECT_STATUS.md`
- Modify: `TASK_LOG.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: all contract, test, CI, documentation, and adapter artifacts from Tasks 1–5.
- Produces: verifiable completion evidence and a Reviewer handoff.

- [ ] **Step 1: Run the complete local verification set.**

Run: `npm ci && npm test && npm run validate:contracts && git diff --check`

Expected: all commands exit `0`; the validator writes `Contract validation passed.`.

- [ ] **Step 2: Review the completion checklist against each of the seven acceptance criteria in the approved spec.**

- [ ] **Step 3: Create the completion record with exact commands, results, validation scope, residual risks, and the code-review focus.**

```markdown
| Quality Gate | Status | Evidence |
|---|---|---|
| Contract schema | Passed | `npm test` |
| Workflow semantics | Passed | `npm run validate:contracts` |
| Adapter parity | Passed | adapter-parity test |
| Human approval | Pending | Reviewer decision |
```

- [ ] **Step 4: Update project state to `Ready for Review`, append the task log row, and add a concise changelog entry.**

- [ ] **Step 5: Submit the changed policy, validator, fixtures, and adapter links to an independent Reviewer / QA Agent.**

- [ ] **Step 6: Commit the completion record and project-state updates.**

Run: `git add docs/records PROJECT_STATUS.md TASK_LOG.md CHANGELOG.md && git commit -m "docs: record Phase 1 contract validation"`

## Test Strategy

| Test type | Scope | Owner |
|---|---|---|
| Unit / semantic | JSON Schema structure, legal transitions, evidence, retry count, blocked stop | Developer Agent |
| Fixture validation | Three valid and two invalid YAML instances | Developer Agent |
| Documentation contract | Canonical wording and policy link | Documentation Agent |
| Adapter parity | Five platform adapter links, no divergent retry rule | Reviewer / QA Agent |
| CI | Node 22 dependency install, tests, validation command | QA / Reviewer |
| Security review | N/A — no auth, secrets, sensitive data, runtime access, or production configuration | N/A |

## Rollback / Fallback

| Scenario | Action | Owner |
|---|---|---|
| Validator causes friction | Remove the CI workflow and retain the docs-only policy; reopen ADR-0002 for a new approval | Human Product / Process Owner |
| Contract reveals an unanticipated Bug Fix state | Block the task and amend the YAML contract through a new approved work item; do not add an undocumented transition | SA / Human Reviewer |
| Dependency cannot be installed in CI | Pin a compatible npm registry source or replace the validator tooling through a separately approved plan; do not weaken validation | Developer / Human Reviewer |

## Risks / Open Questions

| Item | Status | Handling |
|---|---|---|
| Validator dependencies are new to this documentation-first repository | Known | Limit to `yaml` and `ajv`, lock with `package-lock.json`, and add only validation scripts. |
| Existing worktree contains uncommitted index and adapter content | Known | Keep Phase 1 commits scoped to files named by each task; do not stage unrelated changes. |
| GitHub Actions is not yet configured | Known | The workflow is a new validation artifact; local commands remain the source of immediate evidence. |
| Security-sensitive Bug Fix route | Covered | Preserve existing Security Reviewer routing; no automatic escalation bypass. |

## Handoff

| To | Reason | Required evidence |
|---|---|---|
| Developer / implementation agent | Execute Tasks 1–5 with TDD | Per-task test output and scoped commits |
| Reviewer / QA Agent | Independently verify semantics, adapter parity, and documentation consistency | Task 6 completion record, CI result, changed-file list |
| Human Reviewer | Approve policy exceptions or any change to retry budget | Explicit decision and ADR amendment |
