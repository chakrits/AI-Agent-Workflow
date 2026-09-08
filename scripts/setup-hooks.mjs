/**
 * Activates the repository's git hook layer (Issue #236, AC-02).
 *
 * `.githooks/` has shipped an executable `post-merge` since 2026-07-20 but
 * `core.hooksPath` has never been set, so it has never run. Per ADR-0022,
 * `.githooks/` is the only portable enforcement point — no hook runtime exists
 * outside Claude Code — so this command is what makes local enforcement real.
 *
 * Idempotent: re-running when the value already matches is a no-op.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const HOOKS_PATH = '.githooks';

function gitConfig(cwd, args) {
  try {
    return execFileSync('git', ['config', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function setupHooks(cwd = process.cwd(), hooksPath = HOOKS_PATH) {
  const current = gitConfig(cwd, ['--local', 'core.hooksPath']);
  if (current === hooksPath) return { changed: false, hooksPath, previous: current };
  execFileSync('git', ['config', '--local', 'core.hooksPath', hooksPath], { cwd, stdio: 'ignore' });
  return { changed: true, hooksPath, previous: current || undefined };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = setupHooks(process.cwd());
  if (result.changed) {
    console.log(`Git hooks activated: core.hooksPath = ${result.hooksPath}`);
    if (result.previous) console.log(`(replaced previous value: ${result.previous})`);
  } else {
    console.log(`Git hooks already active: core.hooksPath = ${result.hooksPath} (no change)`);
  }
}
