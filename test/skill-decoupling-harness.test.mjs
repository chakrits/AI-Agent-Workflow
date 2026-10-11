import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { mandatoryCommands, captureCase, requireNode22, cloneCandidate } from '../scripts/verify-skill-decoupling.mjs';
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
  assert.deepEqual(cases.find(c => c.id === 'baseline').acIds, []);
  assert.deepEqual(cases.find(c => c.id === 'reference-template').acIds, ['AC-03']);
  assert.deepEqual(cases.find(c => c.id === 'workflow-prose').acIds, ['AC-03', 'AC-06']);
  assert.deepEqual(cases.find(c => c.id === 'catalog-duplicate').acIds, ['AC-04']);
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

test('isolated clone retains historical commit objects not reachable from candidate HEAD', t => {
  const temp = mkdtempSync(path.join(tmpdir(), 'decoupling-history-'));
  t.after(() => rmSync(temp, { recursive: true }));
  const git = args => execFileSync('git', args, { cwd: temp, encoding: 'utf8' }).trim();
  git(['init', '-q']);
  git(['-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', 'commit', '--allow-empty', '-qm', 'base']);
  const candidate = git(['rev-parse', 'HEAD']);
  git(['-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', 'commit', '--allow-empty', '-qm', 'history']);
  const history = git(['rev-parse', 'HEAD']);
  const branch = git(['symbolic-ref', '--short', 'HEAD']);
  git(['checkout', '--quiet', '--detach', candidate]);
  git(['branch', '-D', branch]);
  const clone = path.join(temp, 'clone');
  cloneCandidate(temp, clone);
  assert.equal(execFileSync('git', ['cat-file', '-t', history], { cwd: clone, encoding: 'utf8' }).trim(), 'commit');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: clone, encoding: 'utf8' }).trim(), candidate);
  git(['cat-file', '-e', history]);
});
