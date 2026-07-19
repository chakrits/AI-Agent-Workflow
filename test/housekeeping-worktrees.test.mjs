import assert from 'node:assert/strict';
import test from 'node:test';
import { parseWorktreeList, classifyWorktrees } from '../scripts/housekeeping-worktrees.mjs';

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
  assert.match(deleted.reason, /no longer exists on origin/);
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
