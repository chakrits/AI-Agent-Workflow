import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  hasScriptChanges,
  hasReviewRecord,
  resolveDiffRange,
  gitDiffNameOnly
} from '../scripts/validate-review-gate.mjs';

/**
 * Builds a throwaway repository whose feature branch has two commits: the
 * script change lands in the FIRST commit and the second touches docs only.
 * This is the shape that a `HEAD~1..HEAD` range cannot see.
 */
function buildTwoCommitBranch() {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'review-gate-')));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] });

  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');

  writeFileSync(path.join(dir, 'README.md'), 'base\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'base');

  git('checkout', '--quiet', '-b', 'feature');

  mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  writeFileSync(path.join(dir, 'scripts/thing.mjs'), 'export const x = 1;\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'first commit changes a script');

  writeFileSync(path.join(dir, 'README.md'), 'base\nupdated\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'second commit touches docs only');

  return dir;
}

test('resolveDiffRange spans the whole branch, so a script change in an earlier commit is still caught', () => {
  const dir = buildTwoCommitBranch();
  try {
    const narrow = gitDiffNameOnly('HEAD~1..HEAD', dir);
    assert.deepEqual(
      narrow,
      ['README.md'],
      'precondition: the last commit alone looks docs-only, which is exactly how the gate was bypassed'
    );

    const { range, basis } = resolveDiffRange(dir, { baseRef: 'main' });
    assert.equal(basis, 'merge-base');

    const changedFiles = gitDiffNameOnly(range, dir);
    assert.ok(
      changedFiles.includes('scripts/thing.mjs'),
      'the branch-wide range must see the script change made before the final commit'
    );
    assert.equal(
      hasScriptChanges(changedFiles),
      true,
      'a multi-commit branch whose script change is not in the final commit must still require a review record'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveDiffRange keeps --diff-filter=A honest across the whole branch', () => {
  const dir = buildTwoCommitBranch();
  try {
    const { range } = resolveDiffRange(dir, { baseRef: 'main' });
    const addedFiles = gitDiffNameOnly(range, dir, { addedOnly: true });
    assert.deepEqual(addedFiles, ['scripts/thing.mjs']);
    assert.equal(
      hasReviewRecord(addedFiles),
      false,
      'no review record was added anywhere on the branch, so the gate must fail'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A repository sitting on the base branch itself — the shape CI sees on every
 * `push` event to `main`. `git merge-base main HEAD` returns HEAD here, so a
 * naive merge-base range is empty and audits nothing.
 */
function buildRepoOnBaseBranch() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'review-gate-base-'));
  const real = realpathSync(dir);
  const git = (...args) => execFileSync('git', args, { cwd: real, stdio: ['ignore', 'pipe', 'ignore'] });

  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');

  writeFileSync(path.join(real, 'README.md'), 'base\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'base');

  mkdirSync(path.join(real, 'scripts'), { recursive: true });
  writeFileSync(path.join(real, 'scripts/a.mjs'), 'export const a = 1;\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'script change on the base branch itself');

  return real;
}

test('resolveDiffRange does not audit an empty range when HEAD is the base', () => {
  const dir = buildRepoOnBaseBranch();
  try {
    const { range, basis } = resolveDiffRange(dir, { baseRef: 'main' });
    assert.notEqual(basis, 'merge-base', 'an empty merge-base range must not be reported as a real audit');
    assert.equal(range, 'HEAD~1..HEAD');

    const changedFiles = gitDiffNameOnly(range, dir);
    assert.equal(
      hasScriptChanges(changedFiles),
      true,
      'a script change in the latest commit on the base branch must still require a review record'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unresolvable GITHUB_BASE_REF degrades loudly instead of silently auditing against main', () => {
  const dir = buildTwoCommitBranch();
  const previous = process.env.GITHUB_BASE_REF;
  process.env.GITHUB_BASE_REF = 'no-such-branch';
  try {
    const { basis } = resolveDiffRange(dir);
    assert.equal(
      basis,
      'fallback',
      'an explicit base signal that cannot be resolved must not fall through to main, which would widen the range and can credit a review record the branch never added'
    );
  } finally {
    if (previous === undefined) delete process.env.GITHUB_BASE_REF;
    else process.env.GITHUB_BASE_REF = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('GITHUB_BASE_REF resolves as a bare local ref when no remote-tracking ref exists', () => {
  const dir = buildTwoCommitBranch();
  const previous = process.env.GITHUB_BASE_REF;
  process.env.GITHUB_BASE_REF = 'main';
  try {
    const { basis, baseRef } = resolveDiffRange(dir);
    assert.equal(basis, 'merge-base');
    assert.equal(baseRef, 'main', 'origin/main is absent in this clone, so the bare ref must be tried too');
  } finally {
    if (previous === undefined) delete process.env.GITHUB_BASE_REF;
    else process.env.GITHUB_BASE_REF = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a stacked branch is judged against its own base, not an ancestor that carries a review record', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'review-gate-stacked-'));
  const real = realpathSync(dir);
  const git = (...args) => execFileSync('git', args, { cwd: real, stdio: ['ignore', 'pipe', 'ignore'] });
  const previous = process.env.GITHUB_BASE_REF;
  try {
    git('init', '--quiet', '--initial-branch=main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    writeFileSync(path.join(real, 'README.md'), 'base\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'base');

    git('checkout', '--quiet', '-b', 'feature-x');
    mkdirSync(path.join(real, 'docs/records/qa'), { recursive: true });
    writeFileSync(path.join(real, 'docs/records/qa/2026-01-01-x-code-review.md'), 'record\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'review record on the intermediate base');

    git('checkout', '--quiet', '-b', 'stacked');
    mkdirSync(path.join(real, 'scripts'), { recursive: true });
    writeFileSync(path.join(real, 'scripts/new.mjs'), 'export const n = 1;\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'script change with no record of its own');

    process.env.GITHUB_BASE_REF = 'feature-x';
    const { range } = resolveDiffRange(real);
    const addedFiles = gitDiffNameOnly(range, real, { addedOnly: true });

    assert.deepEqual(
      addedFiles,
      ['scripts/new.mjs'],
      'widening past the declared base harvests the ancestor\'s review record and fails the gate open'
    );
    assert.equal(hasReviewRecord(addedFiles), false);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_BASE_REF;
    else process.env.GITHUB_BASE_REF = previous;
    rmSync(real, { recursive: true, force: true });
  }
});

test('resolveDiffRange falls back to HEAD~1..HEAD when no base ref can be resolved', () => {
  const dir = buildTwoCommitBranch();
  try {
    const { range, basis } = resolveDiffRange(dir, { baseRef: 'origin/does-not-exist' });
    assert.equal(basis, 'fallback');
    assert.equal(range, 'HEAD~1..HEAD');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


test('hasScriptChanges returns true when .mjs files are in the changed list', () => {
  const changed = ['scripts/validate-review-gate.mjs', 'package.json', 'README.md'];
  assert.equal(hasScriptChanges(changed), true);
});

test('hasScriptChanges returns true when .js files are in the changed list', () => {
  const changed = ['src/helper.js', 'docs/notes.md'];
  assert.equal(hasScriptChanges(changed), true);
});

test('hasScriptChanges returns false when only .md files are present', () => {
  const changed = ['docs/records/qa/foo-code-review.md', 'AGENTS.md', 'README.md'];
  assert.equal(hasScriptChanges(changed), false);
});

test('hasScriptChanges returns false for an empty list', () => {
  assert.equal(hasScriptChanges([]), false);
});

test('hasScriptChanges returns false for non-array input', () => {
  assert.equal(hasScriptChanges(null), false);
  assert.equal(hasScriptChanges(undefined), false);
  assert.equal(hasScriptChanges('not-an-array'), false);
});

test('hasScriptChanges ignores extensions with similar suffixes', () => {
  const changed = ['scripts/foo.mjs.bak', 'docs/what-is-mjs.md', 'src/bar.json'];
  assert.equal(hasScriptChanges(changed), false);
});

test('hasReviewRecord returns true when the current diff adds a *-code-review.md file', () => {
  assert.equal(
    hasReviewRecord([
      'scripts/validate-review-gate.mjs',
      'docs/records/qa/2026-07-25-validate-review-gate-code-review.md'
    ]),
    true
  );
});

test('hasReviewRecord returns false when no review record is added in the current diff', () => {
  assert.equal(hasReviewRecord(['scripts/validate-review-gate.mjs']), false);
});

test('hasReviewRecord rejects a review record outside the canonical directory', () => {
  assert.equal(hasReviewRecord(['docs/records/other/2026-07-25-code-review.md']), false);
});

test('hasReviewRecord returns false for non-array input', () => {
  assert.equal(hasReviewRecord(null), false);
  assert.equal(hasReviewRecord(undefined), false);
});

test('hasReviewRecord rejects script changes without a new record despite deterministic historical review records', () => {
  const existingRecords = Array.from(
    { length: 10 },
    (_, index) => `docs/records/qa/2026-07-${String(index + 1).padStart(2, '0')}-historical-code-review.md`
  );

  assert.equal(existingRecords.length, 10);
  assert.ok(existingRecords.every((record) => record.endsWith('-code-review.md')));
  assert.equal(hasReviewRecord(['scripts/validate-review-gate.mjs']), false);
});

test('hasReviewRecord preserves Issue #106 adversarial intent with a deterministic added record', () => {
  const record = 'docs/records/qa/2026-07-26-issue-106-review-gate-code-review.md';

  assert.equal(hasReviewRecord(['scripts/validate-review-gate.mjs']), false);
  assert.equal(hasReviewRecord(['scripts/validate-review-gate.mjs', record]), true);
  assert.equal(
    hasReviewRecord(['scripts/validate-review-gate.mjs', 'docs/records/qa/issue-106-review.md']),
    false,
    'Issue #106 evidence must still use the canonical *-code-review.md naming contract'
  );
});
