import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseWorktreeList,
  classifyWorktrees,
  pruneWorktrees,
  isWorktreeDirty
} from '../scripts/housekeeping-worktrees.mjs';

const samplePorcelain = [
  'worktree /repo',
  'HEAD abc123',
  'branch refs/heads/main',
  '',
  'worktree /repo/.worktrees/active-feature',
  'HEAD def456',
  'branch refs/heads/feature/active',
  '',
  'worktree /repo/.worktrees/deleted-upstream',
  'HEAD ghi789',
  'branch refs/heads/feature/deleted-upstream',
  '',
  'worktree /repo/.worktrees/merged-but-lingering',
  'HEAD mno345',
  'branch refs/heads/feature/merged-but-lingering',
  '',
  'worktree /repo/.worktrees/detached-one',
  'HEAD jkl012',
  'detached',
  ''
].join('\n');

test('parseWorktreeList extracts path/branch/detached per entry', () => {
  const entries = parseWorktreeList(samplePorcelain);
  assert.equal(entries.length, 5);
  assert.deepEqual(entries[0], { path: '/repo', branch: 'main', bare: false, detached: false });
  assert.deepEqual(entries[1], { path: '/repo/.worktrees/active-feature', branch: 'feature/active', bare: false, detached: false });
  assert.equal(entries[4].detached, true);
  assert.equal(entries[4].branch, null);
});

test('classifyWorktrees marks a worktree active when its branch exists on origin and is not merged', () => {
  const entries = parseWorktreeList(samplePorcelain);
  const { worktrees } = classifyWorktrees(
    entries,
    ['main', 'feature/active', 'feature/merged-but-lingering'],
    ['feature/merged-but-lingering']
  );
  const active = worktrees.find((w) => w.path.endsWith('active-feature'));
  assert.equal(active.status, 'active');
});

test('classifyWorktrees marks a worktree prunable when its branch is gone from origin', () => {
  const entries = parseWorktreeList(samplePorcelain);
  const { worktrees } = classifyWorktrees(entries, ['main', 'feature/active'], []);
  const deleted = worktrees.find((w) => w.path.endsWith('deleted-upstream'));
  assert.equal(deleted.status, 'prunable');
  assert.match(deleted.reason, /does not exist on origin/);
});

test('classifyWorktrees reason for a branch absent from origin does not overclaim it was previously pushed and deleted', () => {
  // QA-3 Part B regression: the code only ever queries current origin refs
  // (`git for-each-ref refs/remotes/origin`); it has no data confirming the
  // branch ever existed there. The old wording "no longer exists on origin
  // (deleted)" asserted a history the code never checked. The reason must
  // cover both "never pushed" and "already deleted" without asserting either.
  const entries = parseWorktreeList(samplePorcelain);
  const { worktrees } = classifyWorktrees(entries, ['main', 'feature/active'], []);
  const deleted = worktrees.find((w) => w.path.endsWith('deleted-upstream'));
  assert.match(deleted.reason, /never pushed or already deleted/);
  assert.doesNotMatch(deleted.reason, /\(deleted\)$/);
});

test('classifyWorktrees marks a worktree prunable when its branch still exists on origin but is already merged into main', () => {
  // Regression: this repo's own remote never deletes branches after merge, so
  // "still exists on origin" alone is not a sufficient active-branch signal.
  const entries = parseWorktreeList(samplePorcelain);
  const { worktrees } = classifyWorktrees(
    entries,
    ['main', 'feature/active', 'feature/merged-but-lingering'],
    ['feature/merged-but-lingering']
  );
  const merged = worktrees.find((w) => w.path.endsWith('merged-but-lingering'));
  assert.equal(merged.status, 'prunable');
  assert.match(merged.reason, /already merged into origin\/main/);
});

test('classifyWorktrees never classifies the main worktree as prunable', () => {
  const entries = parseWorktreeList(samplePorcelain);
  const { main, worktrees } = classifyWorktrees(entries, [], []);
  assert.equal(main.path, '/repo');
  assert.ok(!worktrees.some((w) => w.path === '/repo'));
});

test('classifyWorktrees treats a detached-HEAD worktree as active, not prunable', () => {
  const entries = parseWorktreeList(samplePorcelain);
  const { worktrees } = classifyWorktrees(entries, [], []);
  const detached = worktrees.find((w) => w.path.endsWith('detached-one'));
  assert.equal(detached.status, 'active');
  assert.match(detached.reason, /detached HEAD/);
});

// --- pruneWorktrees / isWorktreeDirty (QA-3 Part A regression) ---------
//
// These use a disposable temp git repo with real worktrees — never this
// repo's own `.worktrees/` — so `git worktree remove --force` is exercised
// for real without any risk to the actual working tree.

function makeTempRepoWithWorktrees() {
  const root = mkdtempSync(path.join(tmpdir(), 'housekeeping-worktrees-test-'));
  const git = (args, cwd = root) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] });

  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  git(['commit', '-q', '--allow-empty', '-m', 'init']);

  const dirtyPath = path.join(root, 'wt-dirty');
  const cleanPath = path.join(root, 'wt-clean');
  git(['worktree', 'add', '-q', '-b', 'feature/dirty', dirtyPath]);
  git(['worktree', 'add', '-q', '-b', 'feature/clean', cleanPath]);
  writeFileSync(path.join(dirtyPath, 'untracked.txt'), 'uncommitted work, must not be destroyed\n');

  return { root, dirtyPath, cleanPath };
}

test('isWorktreeDirty is true for a worktree with untracked files, false for a clean one', () => {
  const { root, dirtyPath, cleanPath } = makeTempRepoWithWorktrees();
  try {
    assert.equal(isWorktreeDirty(dirtyPath, root), true);
    assert.equal(isWorktreeDirty(cleanPath, root), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pruneWorktrees never force-removes a dirty worktree and reports it as skipped-dirty', () => {
  const { root, dirtyPath, cleanPath } = makeTempRepoWithWorktrees();
  try {
    const prunable = [{ path: dirtyPath }, { path: cleanPath }];
    const { removed, skippedDirty } = pruneWorktrees(prunable, root);

    // The dirty worktree must survive on disk with its uncommitted content intact.
    assert.ok(skippedDirty.includes(dirtyPath));
    assert.ok(!removed.includes(dirtyPath));
    const survivingList = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: root }).toString();
    assert.match(survivingList, /wt-dirty/);

    // The clean worktree is still removed as before (no regression).
    assert.ok(removed.includes(cleanPath));
    assert.ok(!skippedDirty.includes(cleanPath));
    assert.doesNotMatch(survivingList, /wt-clean/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Exit code regression (Issue #49 AC-2) ------------------------------
//
// The audit script must exit 1 when prunable worktrees are detected in
// dry-run mode (no --prune flag), so CI can gate on it. When the worktree
// list is clean (no prunable), it must exit 0.

test('audit exits 1 when prunable worktrees exist (dry-run mode)', () => {
  const { root, cleanPath } = makeTempRepoWithWorktrees();
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'housekeeping-worktrees.mjs');
  try {
    // cleanPath's branch (feature/clean) is not on origin and not merged → prunable
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'audit must exit 1 when prunable worktrees exist');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('audit exits 0 when no prunable worktrees exist', () => {
  // Use a repo with a remote origin so fetchRemoteInfo does not throw.
  // No extra worktrees — only the main checkout — so nothing is prunable.
  const root = mkdtempSync(path.join(tmpdir(), 'housekeeping-clean-exit-'));
  const remote = mkdtempSync(path.join(tmpdir(), 'housekeeping-clean-remote-'));
  const git = (args, cwd = root) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'housekeeping-worktrees.mjs');
  try {
    git(['init', '-q', '-b', 'main']);
    git(['config', 'user.email', 'test@example.com']);
    git(['config', 'user.name', 'Test']);
    git(['commit', '-q', '--allow-empty', '-m', 'init']);
    execFileSync('git', ['init', '--bare', '-q', remote], { stdio: ['ignore', 'pipe', 'ignore'] });
    git(['remote', 'add', 'origin', remote]);
    git(['push', '-q', '-u', 'origin', 'main']);

    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'audit must exit 0 when no prunable worktrees exist');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(remote, { recursive: true, force: true });
  }
});
