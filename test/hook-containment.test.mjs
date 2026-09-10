import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const settings = readFileSync(path.join(root, '.claude/settings.json'), 'utf8');
const githooks = readdirSync(path.join(root, '.githooks'))
  .map((name) => readFileSync(path.join(root, '.githooks', name), 'utf8'))
  .join('\n');
const workflows = readdirSync(path.join(root, '.github/workflows'))
  .map((name) => readFileSync(path.join(root, '.github/workflows', name), 'utf8'))
  .join('\n');

test('AC-12: every Claude npm rule is reachable from a hook or CI', () => {
  const invoked = [...settings.matchAll(/npm run (?:--silent )?([a-zA-Z0-9:_-]+)/g)].map((match) => match[1]);
  assert.ok(invoked.length);
  for (const script of invoked) {
    assert.ok(
      githooks.includes(script) || workflows.includes(script),
      `Claude settings invokes ${script}, but no .githooks/ hook or CI workflow reaches it`
    );
  }
});

test('AC-12: validators without runtime entry points are surfaced as test-only', () => {
  const validatorFiles = readdirSync(path.join(root, 'scripts'))
    .filter((name) => name.startsWith('validate-') && name.endsWith('.mjs'));
  const testOnly = new Set(['validate-qa-evidence.mjs']);
  const unclassified = validatorFiles.filter((name) => {
    const scriptName = `validate:${name.slice('validate-'.length, -'.mjs'.length)}`;
    return !testOnly.has(name) && !readFileSync(path.join(root, 'package.json'), 'utf8').includes(scriptName);
  });
  assert.deepEqual(unclassified, []);
  assert.ok(testOnly.has('validate-qa-evidence.mjs'));
  assert.match(readFileSync(path.join(root, 'test/qa-evidence.test.mjs'), 'utf8'), /validate-qa-evidence\.mjs/);
});

test('AC-11: SubagentStop validators are advisory and both are invoked', () => {
  assert.match(settings, /"SubagentStop"/);
  const section = settings.slice(settings.indexOf('"SubagentStop"'));
  assert.match(section, /validate:dispatch-receipts \|\| true/);
  assert.match(section, /validate:skill-usage \|\| true/);
});
