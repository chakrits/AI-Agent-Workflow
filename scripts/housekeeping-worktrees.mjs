import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
}

export function parseWorktreeList(porcelainOutput) {
  const entries = [];
  let current = null;
  for (const line of porcelainOutput.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) entries.push(current);
      current = { path: line.slice('worktree '.length), branch: null, bare: false, detached: false };
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
    } else if (line === 'bare') {
      current.bare = true;
    } else if (line === 'detached') {
      current.detached = true;
    }
  }
  if (current) entries.push(current);
  return entries;
}

/**
 * A worktree is prunable when its branch is gone from origin entirely
 * (deleted upstream) OR when its branch tip is already an ancestor of
 * origin/main (merged — even if the remote ref was never deleted, which
 * is this repo's own observed norm: merged branches routinely linger on
 * origin). Checking remote existence alone is not sufficient here.
 */
export function classifyWorktrees(entries, remoteBranches, mergedBranches) {
  const remoteSet = new Set(remoteBranches);
  const mergedSet = new Set(mergedBranches);
  const [main, ...rest] = entries;
  const classified = rest
    .filter((entry) => !entry.bare)
    .map((entry) => {
      if (entry.detached || !entry.branch) {
        return { ...entry, status: 'active', reason: 'detached HEAD (not branch-tracked, skipped)' };
      }
      if (!remoteSet.has(entry.branch)) {
        return { ...entry, status: 'prunable', reason: `branch '${entry.branch}' no longer exists on origin (deleted)` };
      }
      if (mergedSet.has(entry.branch)) {
        return { ...entry, status: 'prunable', reason: `branch '${entry.branch}' is already merged into origin/main` };
      }
      return { ...entry, status: 'active', reason: `branch '${entry.branch}' exists on origin and is not yet merged` };
    });
  return { main, worktrees: classified };
}

export function fetchRemoteInfo(cwd, baseBranch = 'main') {
  git(['fetch', 'origin', '--prune'], cwd);
  const allOutput = git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'], cwd);
  const allBranches = allOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((ref) => ref.replace(/^origin\//, ''))
    .filter((name) => name !== 'HEAD');

  const mergedOutput = git(
    ['branch', '-r', '--merged', `origin/${baseBranch}`, '--format=%(refname:short)'],
    cwd
  );
  const ancestorMerged = mergedOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((ref) => ref.replace(/^origin\//, ''))
    .filter((name) => name !== 'HEAD' && name !== baseBranch);

  // `git branch --merged` only detects fast-forward-able history. This repo
  // (like most GitHub-flow repos) squash-merges PRs, so a merged branch's
  // tip is NOT an ancestor of main even though its PR landed — `gh pr list
  // --state merged` is the accurate signal for that case. Union both so the
  // check still degrades gracefully (to the git-only signal) when `gh` is
  // unavailable or unauthenticated (e.g. offline, or a GitLab-hosted fork).
  let mergedPrBranches = [];
  try {
    const ghOutput = execFileSync(
      'gh',
      ['pr', 'list', '--state', 'merged', '--limit', '500', '--json', 'headRefName', '--jq', '.[].headRefName'],
      { cwd, stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString();
    mergedPrBranches = ghOutput.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    mergedPrBranches = [];
  }

  const mergedBranches = [...new Set([...ancestorMerged, ...mergedPrBranches])];
  return { allBranches, mergedBranches };
}

export function listClassifiedWorktrees(cwd = process.cwd()) {
  const porcelain = git(['worktree', 'list', '--porcelain'], cwd);
  const entries = parseWorktreeList(porcelain);
  const { allBranches, mergedBranches } = fetchRemoteInfo(cwd);
  return classifyWorktrees(entries, allBranches, mergedBranches);
}

export function pruneWorktrees(prunableEntries, cwd = process.cwd()) {
  const removed = [];
  for (const entry of prunableEntries) {
    git(['worktree', 'remove', '--force', entry.path], cwd);
    removed.push(entry.path);
  }
  git(['worktree', 'prune'], cwd);
  return removed;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldPrune = args.includes('--prune');
  const { worktrees } = listClassifiedWorktrees(process.cwd());

  if (!worktrees.length) {
    console.log('No worktrees found (besides the main checkout).');
    return;
  }

  console.log(`${'STATUS'.padEnd(10)}${'BRANCH'.padEnd(45)}PATH`);
  for (const entry of worktrees) {
    console.log(`${entry.status.padEnd(10)}${(entry.branch ?? '(detached)').padEnd(45)}${entry.path}`);
  }

  const prunable = worktrees.filter((entry) => entry.status === 'prunable');
  if (!prunable.length) {
    console.log('\nNo prunable worktrees (all branches still exist on origin, or worktree is detached).');
    return;
  }

  console.log(`\n${prunable.length} worktree(s) prunable (branch deleted on origin):`);
  for (const entry of prunable) console.log(`  - ${entry.path}  (${entry.reason})`);

  if (!shouldPrune) {
    console.log('\nDry run only. Re-run with --prune to remove these worktrees.');
    return;
  }

  const removed = pruneWorktrees(prunable, process.cwd());
  console.log(`\nRemoved ${removed.length} worktree(s):`);
  for (const path of removed) console.log(`  - ${path}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
