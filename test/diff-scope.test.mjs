import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { resolveBase, changedFiles, numstat, makeGit, isSafeRefName } from '../scripts/lib/diff-scope.mjs';

function fakeGit(table, calls = []) {
  return (args) => {
    calls.push(args);
    const key = args.join(' ');
    return Object.hasOwn(table, key) ? table[key] : undefined;
  };
}

test('I297-TC-006a: base order is GITHUB_BASE_REF, then GitLab target, origin/<n> before <n>', () => {
  const calls = [];
  const git = fakeGit({
    'rev-parse HEAD': 'headsha\n',
    'merge-base origin/dev HEAD': 'basesha\n',
  }, calls);
  const r = resolveBase({ GITHUB_BASE_REF: 'dev', CI_MERGE_REQUEST_TARGET_BRANCH_NAME: 'other' }, git);
  assert.equal(r.mergeBase, 'basesha');
  assert.ok(!calls.some((c) => c.join(' ').includes('other')));

  const calls2 = [];
  const git2 = fakeGit({ 'rev-parse HEAD': 'h\n', 'merge-base rel HEAD': 'b2\n' }, calls2);
  const r2 = resolveBase({ CI_MERGE_REQUEST_TARGET_BRANCH_NAME: 'rel' }, git2);
  assert.equal(r2.mergeBase, 'b2');
  assert.deepEqual(calls2.map((c) => c.join(' ')).filter((c) => c.startsWith('merge-base')),
    ['merge-base origin/rel HEAD', 'merge-base rel HEAD']);
});

test('I297-TC-006b: default falls back to origin/main then main', () => {
  const git = fakeGit({ 'rev-parse HEAD': 'h\n', 'merge-base main HEAD': 'm1\n' });
  assert.equal(resolveBase({}, git).mergeBase, 'm1');
});

test('I297-TC-006c: merge-base equal to HEAD or unresolved -> NOT EVALUATED: no PR range', () => {
  const same = fakeGit({ 'rev-parse HEAD': 'h\n', 'merge-base origin/main HEAD': 'h\n' });
  assert.equal(resolveBase({}, same).notEvaluated, 'no PR range');
  const none = fakeGit({ 'rev-parse HEAD': 'h\n' });
  assert.equal(resolveBase({}, none).notEvaluated, 'no PR range');
  assert.equal(resolveBase({}, fakeGit({})).notEvaluated, 'no PR range');
});

test('I297-TC-006d: unsafe branch names never reach git', () => {
  for (const bad of ['--upload-pack=x', '-x', 'a;b', '$(id)', 'a b', 'a`b`', '', '..', 'a/../b']) {
    assert.equal(isSafeRefName(bad), false, bad);
    const calls = [];
    resolveBase({ GITHUB_BASE_REF: bad }, fakeGit({ 'rev-parse HEAD': 'h\n' }, calls));
    assert.ok(!calls.some((c) => c.some((a) => a.includes(bad) && bad !== '')), `leaked ${bad}`);
  }
  assert.equal(isSafeRefName('release/1.2_x-y'), true);
});

test('I297-TC-006e: changedFiles and numstat against a real repo', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ds-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  run('init', '-q', '-b', 'main');
  run('config', 'user.email', 't@t'); run('config', 'user.name', 't'); run('config', 'commit.gpgsign', 'false');
  writeFileSync(path.join(dir, 'a.txt'), '1\n'); run('add', '.'); run('commit', '-qm', 'base');
  run('checkout', '-q', '-b', 'feat');
  mkdirSync(path.join(dir, 'd')); writeFileSync(path.join(dir, 'd/b.txt'), '1\n2\n3\n');
  run('add', '.'); run('commit', '-qm', 'feat');
  const git = makeGit(dir);
  const r = resolveBase({}, git);
  assert.ok(r.mergeBase);
  assert.deepEqual(changedFiles(git, r.mergeBase), ['d/b.txt']);
  assert.deepEqual(numstat(git, r.mergeBase), [{ file: 'd/b.txt', added: 3, deleted: 0 }]);
});
