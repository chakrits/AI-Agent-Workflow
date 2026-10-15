import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const optionalInvocation = /(?:validate:skill-(?:catalog|parity|usage)|audit:skills|audit:skill-usage|scripts\/validate-skill-(?:catalog|parity|usage)\.mjs)/;

test('mandatory CI, hooks and reset verification never invoke optional skill audits', () => {
  const files = [
    ...readdirSync(path.join(root, '.github/workflows')).map((file) => `.github/workflows/${file}`),
    ...readdirSync(path.join(root, '.githooks')).map((file) => `.githooks/${file}`),
    '.gitlab-ci.yml', '.claude/settings.json', 'scripts/verify-reset-template.mjs',
    'scripts/setup-hooks.mjs', 'scripts/validate-edit-guards.mjs'
  ];
  for (const file of files) assert.doesNotMatch(read(file), optionalInvocation, file);
});

test('live metrics and worktree diagnostics stay opt-in outside informational hooks', () => {
  const automaticCi = `${read('.github/workflows/validate-contracts.yml')}\n${read('.gitlab-ci.yml')}`;
  assert.doesNotMatch(automaticCi, /npm run (?:validate:metrics|housekeeping:worktrees)/);
  assert.doesNotMatch(read('scripts/verify-reset-template.mjs'), /validate:metrics/);
  const { scripts } = JSON.parse(read('package.json'));
  assert.equal(scripts['validate:metrics'], 'node scripts/validate-metrics.mjs');
  assert.equal(scripts['housekeeping:worktrees'], 'node scripts/housekeeping-worktrees.mjs');
  assert.match(read('.githooks/post-merge'), /housekeeping:worktrees.*\|\| true/);
});

test('npm exposes truthful manual audits, not automatic skill validator aliases', () => {
  const { scripts } = JSON.parse(read('package.json'));
  assert.equal(scripts['audit:skills'], 'node scripts/validate-skill-catalog.mjs && node scripts/validate-skill-parity.mjs');
  assert.equal(scripts['audit:skill-usage'], 'node scripts/validate-skill-usage.mjs');
  for (const [name, command] of Object.entries(scripts)) {
    if (name.startsWith('audit:')) continue;
    assert.doesNotMatch(name, /^validate:skill-/);
    assert.doesNotMatch(command, optionalInvocation, name);
  }
});

test('core CI, PR hook and reset safety validators remain configured', () => {
  const github = read('.github/workflows/validate-contracts.yml');
  const gitlab = read('.gitlab-ci.yml');
  for (const command of ['validate:contracts', 'validate:adapter-parity', 'validate:review-gate',
    'validate:dispatch-receipts', 'validate:context-budget', 'validate:ci-parity']) {
    assert.ok(github.includes(`npm run ${command}`), command);
    assert.ok(gitlab.includes(`npm run ${command}`), command);
  }
  const settings = JSON.parse(read('.claude/settings.json'));
  assert.match(settings.hooks.PreToolUse[0].hooks[0].command, /validate:pr-readiness -- --hook$/);
  assert.match(settings.hooks.SubagentStop[0].hooks[0].command, /validate:dispatch-receipts \|\| true$/);
  assert.match(read('scripts/verify-reset-template.mjs'), /validate:risk-register/);
  assert.match(read('scripts/verify-reset-template.mjs'), /validate:review-gate/);
});

test('reset and README command guidance uses opt-in audits, not removed aliases', () => {
  for (const file of ['README.md', 'docs/workflow/reset-to-template.md']) {
    const text = read(file);
    assert.doesNotMatch(text, /validate:skill-(?:catalog|parity|usage)/, file);
    assert.match(text, /npm run audit:skills/, file);
    assert.match(text, /npm run audit:skill-usage/, file);
  }
  const ciSection = read('README.md').split('## CI Validation Checks')[1]?.split('\n## ')[0];
  assert.ok(ciSection);
  assert.doesNotMatch(ciSection, /npm run audit:skill/);
});

test('core policy supports optional discovery and missing-skill fallback without waiving gates', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /catalog is an optional editorial index/i);
  assert.match(agents, /missing or unavailable.*base role/i);
  assert.match(agents, /does not waive.*TDD.*review.*security.*evidence.*human approval/i);
  assert.match(read('docs/workflow/core-bootloader.md'), /discovered descriptions.*available/i);
  assert.match(read('docs/workflow/role-definitions.md'), /skill references.*conditional.*available/i);
  assert.match(read('docs/operating-model/AGENT_EVALUATION_CHECKLIST.md'), /base-role fallback/i);
});
