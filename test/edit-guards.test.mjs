import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CANONICAL_FILES } from '../scripts/validate-context-budget.mjs';
import { planEditGuards, runEditGuards } from '../scripts/validate-edit-guards.mjs';

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'edit-guards-'));
  mkdirSync(path.join(root, 'test/fixtures/context-pack-v1'), { recursive: true });
  writeFileSync(
    path.join(root, 'test/fixtures/context-pack-v1/required-source-matrix.json'),
    JSON.stringify({
      schemaVersion: 'context-source-matrix/v1',
      rows: [{
        role: 'Orchestrator Agent',
        loadMode: 'boot',
        requiredSources: [{ path: 'docs/custom-pinned.md', sha256: 'a'.repeat(64) }]
      }]
    }, null, 2) + '\n'
  );
  return root;
}

test('AC-06: derives repin guard from the matrix path set', () => {
  const root = fixtureRoot();
  const guards = planEditGuards({
    tool_name: 'Edit',
    tool_input: { file_path: path.join(root, 'docs/custom-pinned.md') }
  }, root);
  assert.deepEqual(guards.map((guard) => guard.script), ['repin:source-matrix']);
});

test('AC-07: derives canonical guard from CANONICAL_FILES', () => {
  const root = fixtureRoot();
  const guards = planEditGuards({
    tool_name: 'Write',
    tool_input: { file_path: path.join(root, CANONICAL_FILES[0]) }
  }, root);
  assert.deepEqual(guards.map((guard) => guard.script), ['validate:context-budget']);
});

test('AC-08: runs both parity guards for either Claude adapter or skill paths', () => {
  const root = fixtureRoot();
  for (const filePath of ['.claude/agents/developer-agent.md', '.claude/skills/example/SKILL.md']) {
    const guards = planEditGuards({
      tool_name: 'Edit',
      tool_input: { file_path: path.join(root, filePath) }
    }, root);
    assert.deepEqual(
      guards.map((guard) => guard.script),
      ['validate:adapter-parity', 'validate:skill-parity']
    );
  }
});

test('AC-06..08: ignores non-edit tools and paths outside all guard sets', () => {
  const root = fixtureRoot();
  assert.deepEqual(planEditGuards({ tool_name: 'Bash', tool_input: { command: 'npm test' } }, root), []);
  assert.deepEqual(planEditGuards({ tool_name: 'Edit', tool_input: { file_path: path.join(root, 'README.md') } }, root), []);
});

test('AC-06..08: runs every applicable validator and remains advisory when one fails', () => {
  const root = fixtureRoot();
  const calls = [];
  const result = runEditGuards({
    tool_name: 'Edit',
    tool_input: { file_path: path.join(root, '.claude/agents/developer-agent.md') }
  }, root, (script) => {
    calls.push(script);
    return script === 'validate:adapter-parity' ? 1 : 0;
  });
  assert.deepEqual(calls, ['validate:adapter-parity', 'validate:skill-parity']);
  assert.equal(result.advisory, true);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].script, 'validate:adapter-parity');
});
