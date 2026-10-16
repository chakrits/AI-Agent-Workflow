import assert from 'node:assert/strict';
import test from 'node:test';
import { selectValidationChecks } from '../scripts/lib/validation-scope.mjs';

const select = (changedPaths, comparisonComplete = true) =>
  selectValidationChecks({ changedPaths, comparisonComplete });

test('ordinary documentation changes run only the whitespace check', () => {
  assert.deepEqual(select(['docs/guide.md']), {
    fullSuite: false,
    commands: ['git diff --check'],
    reasonCodes: ['DOCS_ONLY']
  });
});

test('optional skill and workflow libraries stay outside unrelated suites', () => {
  for (const path of [
    '.agents/skills/example/SKILL.md',
    '.agents/workflows/example.md',
    '.claude/skills/example/SKILL.md',
    '.agent/skills/example/SKILL.md'
  ]) {
    const result = select([path]);
    assert.equal(result.fullSuite, false, path);
    assert.deepEqual(result.commands, ['git diff --check'], path);
  }
});

test('source, tests, contracts and canonical framework policy use the full suite', () => {
  for (const path of [
    'scripts/lib/task-state-machine.mjs',
    'test/task-state-machine.test.mjs',
    'docs/contracts/schemas/bug-fix-workflow.schema.json',
    'AGENTS.md',
    'docs/workflow/dynamic-routing.md'
  ]) {
    const result = select([path]);
    assert.equal(result.fullSuite, true, path);
    assert.ok(result.commands.includes('npm test'), path);
  }
});

test('complete empty diff selects no checks; incomplete diff selects conservative core checks', () => {
  assert.deepEqual(select([]), {
    fullSuite: false,
    commands: [],
    reasonCodes: ['NO_CHANGES']
  });
  const unavailable = select([], false);
  assert.equal(unavailable.fullSuite, true);
  assert.ok(unavailable.reasonCodes.includes('DIFF_UNAVAILABLE'));
  assert.ok(unavailable.commands.includes('npm test'));
  assert.ok(unavailable.commands.includes('npm run validate:contracts'));
  assert.ok(unavailable.commands.includes('npm run validate:ci-parity'));
});

test('mixed docs and code changes retain the full suite', () => {
  const result = select(['docs/guide.md', 'scripts/lib/task-state-machine.mjs']);
  assert.equal(result.fullSuite, true);
  assert.ok(result.reasonCodes.includes('MIXED_CHANGE'));
});

test('rename paths are classified using both old and new names', () => {
  const result = select([
    '.claude/agents/ba-agent.md',
    '.agents/skills/ba-agent/SKILL.md'
  ]);
  assert.equal(result.fullSuite, true);
  assert.ok(result.reasonCodes.includes('CORE_POLICY'));
});

test('deleted schemas keep contract validation and the full suite', () => {
  const result = select(['docs/contracts/schemas/context-pack-v1.schema.json']);
  assert.equal(result.fullSuite, true);
  assert.ok(result.commands.includes('npm run validate:contracts'));
});

test('context compatibility runs for pinned context sources, contracts, fixtures, and injector changes', () => {
  for (const path of [
    'AGENTS.md',
    'docs/workflow/core-bootloader.md',
    'docs/contracts/new-feature-workflow.yaml',
    'docs/contracts/schemas/context-pack-v1.schema.json',
    'test/fixtures/context-pack-v1/required-source-matrix.json',
    'test/fixtures/context-compatibility-v1.json',
    'scripts/inject-role-context.mjs',
    'scripts/lib/context-compatibility-v1.mjs'
  ]) {
    const result = select([path]);
    assert.ok(result.commands.includes('npm run validate:context-compatibility'), path);
  }

  const unrelatedSchema = select(['docs/contracts/schemas/bug-fix-workflow.schema.json']);
  assert.ok(!unrelatedSchema.commands.includes('npm run validate:context-compatibility'));
});

test('an optional-prefix lookalike is unknown and fails conservatively', () => {
  const result = select(['.agents/skills-evil/changed.md']);
  assert.equal(result.fullSuite, true);
  assert.ok(result.reasonCodes.includes('UNKNOWN_PATH'));
  assert.ok(!result.reasonCodes.includes('OPTIONAL_LIBRARY_ONLY'));
});

test('malformed paths fail closed without becoming executable commands', () => {
  for (const path of ['../README.md', '/etc/passwd', '.agents/skills\0;touch']) {
    const result = select([path]);
    assert.equal(result.fullSuite, true, JSON.stringify(path));
    assert.ok(result.reasonCodes.includes('MALFORMED_PATH'), JSON.stringify(path));
    assert.ok(result.commands.every((command) =>
      command === 'git diff --check' || command.startsWith('npm run ') || command === 'npm test' ||
      command.startsWith('node --test ') || command.startsWith('python ')), JSON.stringify(path));
  }
});

test('work item and evidence records run their targeted validators', () => {
  const workItem = select(['docs/records/work-items/2026-10-15-issue-298.md']);
  assert.equal(workItem.fullSuite, false);
  assert.ok(workItem.commands.includes('npm run validate:project-state'));
  assert.ok(workItem.commands.includes('npm run validate:status-projection'));
  const handoff = select(['docs/records/handoff/HANDOFF-issue-298.md']);
  assert.equal(handoff.fullSuite, false);
  assert.ok(handoff.commands.includes('npm run validate:workflow-evidence'));
  assert.ok(handoff.commands.includes('npm run validate:dispatch-receipts'));
});

test('selected core checks never include descriptive metrics or housekeeping audits', () => {
  const result = select([], false);
  assert.ok(!result.commands.some((command) => /validate:metrics|housekeeping:worktrees/.test(command)));
});
