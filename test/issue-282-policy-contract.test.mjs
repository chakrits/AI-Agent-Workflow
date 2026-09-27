import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [operatingModel, bootloader, agents, handoffContract, handoffTemplate, workItemTemplate, issueWorkItem, qualityGates, evaluation] = await Promise.all([
  readFile('docs/operating-model/AGENT_OPERATING_MODEL.md', 'utf8'),
  readFile('docs/workflow/core-bootloader.md', 'utf8'),
  readFile('AGENTS.md', 'utf8'),
  readFile('docs/workflow/handoff-contract.md', 'utf8'),
  readFile('docs/templates/HANDOFF.md', 'utf8'),
  readFile('docs/templates/WORK_ITEM.md', 'utf8'),
  readFile('docs/records/work-items/2026-09-21-issue-282-safe-autonomy-proportional-verification.md', 'utf8'),
  readFile('docs/workflow/quality-gates.md', 'utf8'),
  readFile('docs/operating-model/AGENT_EVALUATION_CHECKLIST.md', 'utf8')
]);

function requirePattern(content, pattern, message) {
  assert.ok(pattern.test(content), message);
}

test('Issue #282: a reversible, low-risk, in-scope execution assumption can proceed when disclosed', () => {
  requirePattern(operatingModel, /may proceed without another confirmation only when every condition below is true/i, 'must allow bounded progress only after all safe-assumption conditions are met');
  requirePattern(operatingModel, /reversible/i, 'must require reversibility');
  requirePattern(operatingModel, /low risk/i, 'must require low risk');
  requirePattern(operatingModel, /inside the user's stated scope/i, 'must require the user-stated scope');
  requirePattern(operatingModel, /disclosed in the work-item handoff/i, 'must require disclosure in the handoff');
  requirePattern(operatingModel, /does not decide business meaning/i, 'must preserve business decision authority');
});

test('Issue #282: unclear assumptions and human-gate scenarios stop before mutation', () => {
  requirePattern(operatingModel, /if any condition is false or unclear, stop before mutation and request a human decision/i, 'must stop before mutation when the assumption boundary is not met');
  for (const boundary of [
    /business scope change/i,
    /conflicting sources/i,
    /missing critical input/i,
    /auth(?:entication|orization)?|permissions/i,
    /privacy/i,
    /production data|irreversible data/i,
    /release|deployment|rollback decision/i
  ]) {
    requirePattern(operatingModel, boundary, `must preserve the human-gate boundary ${boundary}`);
  }
  requirePattern(operatingModel, /before mutation/i, 'must require approval before mutation');
});

test('Issue #282: PROJECT_STATUS and TASK_LOG updates are limited to lifecycle or work-item transitions', () => {
  requirePattern(operatingModel, /update `PROJECT_STATUS\.md` and `TASK_LOG\.md` only when the lifecycle phase, work-item state, owner, blocker, or handoff changes/i, 'must limit project-state updates to state transitions');
});

test('Issue #282: work-item and handoff artifacts carry the four-field completion contract', () => {
  for (const field of ['Done when', 'May proceed through', 'Must stop for', 'Assumptions']) {
    requirePattern(workItemTemplate, new RegExp(field, 'i'), `work item template must include ${field}`);
    requirePattern(handoffContract, new RegExp(field, 'i'), `handoff contract must include ${field}`);
    requirePattern(handoffTemplate, new RegExp(`## ${field}`, 'i'), `handoff template must include ${field}`);
  }
  for (const ac of ['AC-01', 'AC-02', 'AC-03', 'AC-04', 'AC-05']) {
    requirePattern(issueWorkItem, new RegExp(`\\| ${ac} \\|`), `Issue #282 work item must retain traceability for ${ac}`);
  }
});

test('Issue #282: verification evidence scales from read-only and docs work through high-risk work', () => {
  for (const taskClass of [/read.?only/i, /docs?(?:umentation)?.?only/i, /code|behavior|configuration/i, /high.?risk|security.*data.*release/is]) {
    requirePattern(qualityGates, taskClass, `verification matrix must cover ${taskClass}`);
  }
  requirePattern(qualityGates, /unrelated test suites|tests? unrelated to the change/i, 'docs-only verification must omit unrelated suites');
  requirePattern(qualityGates, /stricter requirement/i, 'matrix must preserve stricter existing gates');
  requirePattern(evaluation, /Evidence matches task class and risk/i, 'evaluation checklist must check verification scope against task class and risk');
  requirePattern(bootloader, /proportion(?:al|ate) verification/i, 'bootloader must route to the proportional verification policy');
  requirePattern(agents, /proportion(?:al|ate)[ -]verification/i, 'AGENTS.md must point to proportional verification');
});
