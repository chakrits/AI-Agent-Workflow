import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupHooks, HOOKS_PATH } from '../scripts/setup-hooks.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function tempRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'setup-hooks-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  mkdirSync(path.join(dir, '.githooks'));
  writeFileSync(path.join(dir, 'package.json'), '{}');
  return dir;
}

const readHooksPath = (dir) => {
  try {
    return execFileSync('git', ['config', '--local', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------- AC-02

test('AC-02: setup:hooks sets core.hooksPath to .githooks', () => {
  const dir = tempRepo();
  const result = setupHooks(dir);
  assert.equal(readHooksPath(dir), HOOKS_PATH);
  assert.equal(result.changed, true);
});

test('AC-02: setup:hooks is idempotent', () => {
  const dir = tempRepo();
  setupHooks(dir);
  const second = setupHooks(dir);
  assert.equal(readHooksPath(dir), HOOKS_PATH);
  assert.equal(second.changed, false, 'a second run must be a no-op, not a re-write');
  const third = setupHooks(dir);
  assert.equal(third.changed, false);
  assert.equal(readHooksPath(dir), HOOKS_PATH);
});

test('AC-02: setup:hooks overwrites a divergent existing hooksPath', () => {
  const dir = tempRepo();
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.other-hooks'], { cwd: dir });
  const result = setupHooks(dir);
  assert.equal(readHooksPath(dir), HOOKS_PATH);
  assert.equal(result.changed, true);
});

test('AC-02: a fresh clone plus setup:hooks makes the existing post-merge hook reachable', () => {
  const dir = tempRepo();
  setupHooks(dir);
  const configured = path.join(dir, readHooksPath(dir));
  assert.ok(existsSync(configured), 'the configured hooksPath must exist in the working tree');
  // In the real repository that directory is .githooks/, which ships post-merge.
  assert.ok(existsSync(path.join(repoRoot, '.githooks', 'post-merge')));
});

test('AC-02: setup:hooks is documented in README.md', () => {
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.ok(readme.includes('npm run setup:hooks'), 'README.md must document npm run setup:hooks');
  assert.ok(readme.includes('core.hooksPath'), 'README.md must explain what the command does');
});

test('AC-02: setup:hooks is registered as an npm script', () => {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['setup:hooks'], 'node scripts/setup-hooks.mjs');
  assert.equal(pkg.scripts['validate:pr-readiness'], 'node scripts/validate-pr-readiness.mjs');
});

// ---------------------------------------------------------------- AC-04

test('AC-04: .githooks/pre-push exists and is executable', () => {
  const hook = path.join(repoRoot, '.githooks', 'pre-push');
  assert.ok(existsSync(hook), '.githooks/pre-push must exist');
  assert.ok(statSync(hook).mode & 0o111, '.githooks/pre-push must be executable');
});

test('AC-04: the PreToolUse hook is wired on Bash for gh pr create', () => {
  const settings = JSON.parse(readFileSync(path.join(repoRoot, '.claude', 'settings.json'), 'utf8'));
  const entries = settings.hooks?.PreToolUse ?? [];
  assert.ok(entries.length, '.claude/settings.json must declare a PreToolUse hook');
  const bash = entries.find((e) => e.matcher === 'Bash');
  assert.ok(bash, 'the PreToolUse hook must match the Bash tool');
  const commands = bash.hooks.map((h) => h.command).join(' ');
  assert.ok(commands.includes('validate:pr-readiness'), 'it must invoke the npm script, not inline a rule');
  assert.ok(bash.hooks.some((h) => (h.if ?? '').includes('gh pr create')), 'it must be scoped to gh pr create');
});

test('AC-04: settings.json contains only a hooks block', () => {
  const settings = JSON.parse(readFileSync(path.join(repoRoot, '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(Object.keys(settings), ['hooks']);
});

// ADR-0022's governing invariant: .claude/settings.json may only invoke a rule
// that .githooks/ or CI already enforces. It may never originate one.
test('AC-04: every rule .claude/settings.json invokes is also reachable from .githooks/', () => {
  const settings = readFileSync(path.join(repoRoot, '.claude', 'settings.json'), 'utf8');
  const hooksDir = execFileSync('ls', [path.join(repoRoot, '.githooks')], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const hookScripts = hooksDir.map((f) => readFileSync(path.join(repoRoot, '.githooks', f), 'utf8')).join('\n');
  const invoked = [...settings.matchAll(/npm run (?:--silent )?([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]);
  assert.ok(invoked.length, 'expected settings.json to invoke at least one npm script');
  for (const script of invoked) {
    assert.ok(
      hookScripts.includes(script),
      `.claude/settings.json invokes "${script}" but no .githooks/ hook does; ` +
        'ADR-0022 forbids .claude/settings.json originating a rule'
    );
  }
});

test('AC-04: pre-push and the PreToolUse hook call the same npm script', () => {
  const prePush = readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  const settings = readFileSync(path.join(repoRoot, '.claude', 'settings.json'), 'utf8');
  assert.ok(prePush.includes('validate:pr-readiness'));
  assert.ok(settings.includes('validate:pr-readiness'));
  // Neither caller may hold rule logic of its own.
  assert.ok(!/Documentation Impact|Fixes #|status:spec-ready/.test(prePush), 'pre-push must be a thin caller');
  assert.ok(!/Documentation Impact|Fixes #|status:spec-ready/.test(settings), 'settings.json must be a thin caller');
});
