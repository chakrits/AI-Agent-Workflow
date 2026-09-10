import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { buildSessionContext, formatSessionContext } from '../scripts/show-session-context.mjs';

test('AC-09: displays the current work item and stage with real git location', () => {
  const context = buildSessionContext(process.cwd());
  assert.match(context.workItem, /Issue #/);
  assert.notEqual(context.stage, '(not recorded)');
  assert.equal(context.branch, execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim());
  assert.equal(context.worktree, execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim());
  const display = formatSessionContext(context);
  assert.match(display, /^Current Work Item: /m);
  assert.match(display, /^Current Stage: /m);
  assert.match(display, /^Branch: .+$/m);
  assert.match(display, /^Worktree: /m);
  assert.ok(display.includes(`Current Work Item: ${context.workItem}`));
  assert.ok(display.includes(`Current Stage: ${context.stage}`));
  assert.ok(display.includes(`Branch: ${context.branch}`));
  assert.ok(display.includes(`Worktree: ${context.worktree}`));
});
