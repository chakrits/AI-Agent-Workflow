import { execFileSync } from 'node:child_process';

// Shared PR-range helper for advisory validators. Branch names come from CI
// environment variables and reach git only as execFile arguments (never a shell
// string), after a strict allow-list check. Offline: no fetch, no network.

const SAFE_REF_RE = /^[A-Za-z0-9_][A-Za-z0-9._/-]*$/;

export function isSafeRefName(name) {
  return typeof name === 'string'
    && name.length > 0
    && name.length <= 200
    && SAFE_REF_RE.test(name)
    && !name.split('/').some((seg) => seg === '..' || seg === '')
    && !name.endsWith('.lock');
}

/** git(args) -> trimmed-able stdout string, or undefined on any failure. */
export function makeGit(root = process.cwd()) {
  return (args) => {
    try {
      return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).toString();
    } catch {
      return undefined;
    }
  };
}

/**
 * Resolve the PR range base. Returns { head, mergeBase } or { notEvaluated }.
 * Order: GITHUB_BASE_REF, CI_MERGE_REQUEST_TARGET_BRANCH_NAME (each origin/<n>
 * then <n>); otherwise origin/main then main.
 */
export function resolveBase(env, git) {
  const NO_RANGE = { notEvaluated: 'no PR range' };
  const head = git(['rev-parse', 'HEAD'])?.trim();
  if (!head) return NO_RANGE;

  const declared = [env?.GITHUB_BASE_REF, env?.CI_MERGE_REQUEST_TARGET_BRANCH_NAME].find(Boolean);
  let candidates;
  if (declared) {
    if (!isSafeRefName(declared)) return NO_RANGE;
    candidates = [`origin/${declared}`, declared];
  } else {
    candidates = ['origin/main', 'main'];
  }
  for (const candidate of candidates) {
    const mergeBase = git(['merge-base', candidate, 'HEAD'])?.trim();
    if (!mergeBase) continue;
    if (mergeBase === head) return NO_RANGE;
    return { head, mergeBase };
  }
  return NO_RANGE;
}

/** Files added/copied/modified/renamed between mergeBase and HEAD. */
export function changedFiles(git, mergeBase) {
  const out = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD']);
  return (out ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
}

/** [{ file, added, deleted }] (binary files report 0/0). */
export function numstat(git, mergeBase) {
  const out = git(['diff', '--numstat', mergeBase, 'HEAD']);
  return (out ?? '').split('\n').filter(Boolean).map((line) => {
    const [a, d, ...rest] = line.split('\t');
    return { file: rest.join('\t'), added: Number(a) || 0, deleted: Number(d) || 0 };
  });
}
