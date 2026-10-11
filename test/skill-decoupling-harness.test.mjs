import assert from 'node:assert/strict';
import test from 'node:test';
import { mandatoryCommands, captureCase, requireNode22 } from '../scripts/verify-skill-decoupling.mjs';
import { contributorCases } from '../scripts/lib/skill-contributor-cases.mjs';

test('command inventory preserves actual flags and direct node commands across both CI hosts', () => {
  const commands = mandatoryCommands({ jobs: { validate: { steps: [
    { run: 'npm ci' }, { run: 'npm test' }, { run: 'npm run validate:contracts -- --strict' }
  ] } } }, { extra: { script: ['npm ci --cache .npm --prefer-offline', 'node scripts/check.mjs'] } });
  assert.deepEqual(commands, [
    ['npm', ['test']], ['npm', ['run', 'validate:contracts', '--', '--strict']],
    ['node', ['scripts/check.mjs']]
  ]);
});

test('empty or unrecognized command graphs reject instead of silently omitting gates', () => {
  assert.throws(() => mandatoryCommands({}, {}), /validate.*steps/);
  assert.throws(() => mandatoryCommands({ jobs: { validate: { steps: [] } } }, {}), /empty/);
  assert.throws(() => mandatoryCommands({ jobs: { validate: { steps: [{ run: 'npm test && echo ignored' }] } } }, {}), /unsupported/);
});

test('case manifest covers independent platform edits and all approved description boundaries', () => {
  const cases = contributorCases();
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  for (const tree of ['.agents', '.claude', '.agent']) assert.ok(cases.some(c => c.id === `add-${tree.slice(1)}`));
  for (const n of [159, 160, 161]) for (const emoji of [false, true]) {
    const c = cases.find(c => c.id === `description-${n}-${emoji}`);
    assert.equal([...c.description].length, n);
  }
  for (const n of [5499, 5500, 5501]) assert.equal(cases.find(c => c.id === `total-${n}`).total, n);
  for (const item of cases.filter(c => c.id !== 'baseline')) assert.ok(item.acIds.length);
});

test('setup and cleanup failures remain explicit failed evidence, never silent success', () => {
  let cleaned = false;
  const result = captureCase({}, () => { throw new Error('setup failed'); }, () => { cleaned = true; throw new Error('cleanup failed'); });
  assert.equal(cleaned, true);
  assert.equal(result.passed, false);
  assert.match(result.error, /setup failed.*cleanup failed/);
});

test('runtime provenance requires Node 22 before verification', () => {
  assert.doesNotThrow(() => requireNode22('22.22.3'));
  assert.throws(() => requireNode22('24.0.0'), /Node 22/);
});
