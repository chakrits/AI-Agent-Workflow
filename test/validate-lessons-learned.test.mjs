import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'validate-lessons-learned.mjs');
const NAME = '2026-10-01-issue-900-demo.md';

function repo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'll-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  run('init', '-q', '-b', 'main');
  run('config', 'user.email', 't@t'); run('config', 'user.name', 't'); run('config', 'commit.gpgsign', 'false');
  writeFileSync(path.join(dir, 'README.md'), 'x\n');
  run('add', '.'); run('commit', '-qm', 'base');
  run('checkout', '-q', '-b', 'feat');
  return {
    dir,
    write(rel, text) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), text);
    },
    commit() { run('add', '-A'); run('commit', '-qm', 'feat'); },
  };
}

function item(lessons, status = '## Status: Closed (2026-10-01)') {
  return `# Work Item\n\n## Lessons Learned\n${lessons}\n\n${status}\n`;
}

function runIt(r, args = [], env = {}) {
  const clean = { ...process.env };
  delete clean.GITHUB_BASE_REF; delete clean.CI_MERGE_REQUEST_TARGET_BRANCH_NAME; delete clean.GITHUB_ACTIONS;
  return spawnSync('node', [SCRIPT, ...args], { cwd: r.dir, env: { ...clean, ...env }, encoding: 'utf8' });
}

function withItem(lessons, status) {
  const r = repo();
  r.write(`docs/records/work-items/${NAME}`, item(lessons, status));
  r.commit();
  return r;
}

test('I297-TC-005: closed work item with no lessons warns and exits 0', () => {
  const r = repo();
  r.write(`docs/records/work-items/${NAME}`, '# W\n\n## Status: Closed (2026-10-01)\n');
  r.commit();
  const out = runIt(r);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /WARN \[AC-006\]/);
});

test('I297-TC-005: bare N/A, template placeholder, empty section, dangling link each warn once, exit 0', () => {
  for (const lessons of ['- N/A', '- [[../lessons-learned/YYYY-MM-DD-slug]] or N/A', '', '- [[../lessons-learned/2026-10-01-missing]]']) {
    const out = runIt(withItem(lessons));
    assert.equal(out.status, 0, lessons);
    assert.equal((out.stdout.match(/WARN \[AC-006\]/g) || []).length, 1, `${lessons} -> ${out.stdout}`);
  }
});

test('I297-TC-005: link name that fails the regex or escapes the repo warns', () => {
  const r = repo();
  r.write('docs/records/lessons-learned/2026-10-01-ok.md', 'x\n');
  r.write(`docs/records/work-items/${NAME}`, item('- [[../lessons-learned/../../README]]'));
  r.commit();
  const out = runIt(r);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /WARN \[AC-006\]/);
});

test('I297-TC-005: symlinked lessons file pointing outside the repo does not count', () => {
  const r = repo();
  const outside = path.join(r.dir, '..', `outside-${path.basename(r.dir)}.md`);
  writeFileSync(outside, 'secret\n');
  mkdirSync(path.join(r.dir, 'docs/records/lessons-learned'), { recursive: true });
  symlinkSync(outside, path.join(r.dir, 'docs/records/lessons-learned/2026-10-01-evil.md'));
  r.write(`docs/records/work-items/${NAME}`, item('- [[../lessons-learned/2026-10-01-evil]]'));
  r.commit();
  const out = runIt(r);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /WARN \[AC-006\]/);
});

test('I297-TC-006: prose, N/A with reason, and resolving links pass (both Status formats)', () => {
  const cases = [
    ['- Verify before claiming done.', '## Status: Closed (2026-10-01)'],
    ['- N/A — trivial doc fix, nothing to learn', '## Status\nClosed (2026-10-01)'],
    ['- [[../lessons-learned/2026-10-01-demo]]', '## Status: Closed (2026-10-01)'],
    ['- [notes](../lessons-learned/2026-10-01-demo.md)', '## Status\nClosed (2026-10-01)'],
  ];
  for (const [lessons, status] of cases) {
    const r = repo();
    r.write('docs/records/lessons-learned/2026-10-01-demo.md', '# L\n');
    r.write(`docs/records/work-items/${NAME}`, item(lessons, status));
    r.commit();
    const out = runIt(r);
    assert.equal(out.status, 0, lessons);
    assert.doesNotMatch(out.stdout, /WARN/, `${lessons} -> ${out.stdout}`);
    assert.match(out.stdout, /OK \[AC-006\]/);
  }
});

test('I297-TC-006: open work item is not in scope', () => {
  const out = runIt(withItem('- N/A', '## Status: Open'));
  assert.equal(out.status, 0);
  assert.doesNotMatch(out.stdout, /WARN/);
});

test('I297-TC-006: no PR range prints NOT EVALUATED and exits 0', () => {
  const r = repo();
  execFileSync('git', ['checkout', '-q', 'main'], { cwd: r.dir });
  const out = runIt(r);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /NOT EVALUATED: no PR range/);
});

test('I297-TC-006: no closeout scope prints INFO', () => {
  const r = repo();
  r.write('docs/x.md', 'x\n'); r.commit();
  const out = runIt(r);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /INFO: no closeout scope/);
});

test('I297-TC-006: --all audits closed items outside the range', () => {
  const r = repo();
  execFileSync('git', ['checkout', '-q', 'main'], { cwd: r.dir });
  r.write(`docs/records/work-items/${NAME}`, item('- N/A'));
  r.commit();
  const out = runIt(r, ['--all']);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /WARN \[AC-006\]/);
});

test('I297-TC-006: closeout handoff maps Work Item URL to work item whole-token issue-N', () => {
  const r = repo();
  r.write(`docs/records/work-items/${NAME}`, item('- N/A', '## Status: Open'));
  r.write('docs/records/work-items/2026-10-01-issue-90-other.md', item('- fine prose', '## Status: Open'));
  r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-PR1.md', '# H\n- Work Item: https://github.com/o/r/issues/900\n');
  r.commit();
  const out = runIt(r);
  assert.equal(out.status, 0);
  assert.match(out.stdout, /WARN \[AC-006\].*issue-900/);
  assert.doesNotMatch(out.stdout, /issue-90-other/);
});

test('I297-TC-006: handoff issues/1 maps to issue-1 only, never issue-12 (whole-token boundary)', () => {
  for (const [n, want, other] of [['1', 'issue-1-a', 'issue-12-b'], ['12', 'issue-12-b', 'issue-1-a']]) {
    const r = repo();
    r.write('docs/records/work-items/2026-10-01-issue-1-a.md', item('- N/A', '## Status: Open'));
    r.write('docs/records/work-items/2026-10-01-issue-12-b.md', item('- N/A', '## Status: Open'));
    r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-PR1.md', `# H\n- Work Item: https://github.com/o/r/issues/${n}\n`);
    r.commit();
    const out = runIt(r);
    assert.equal(out.status, 0);
    assert.match(out.stdout, new RegExp(`WARN \\[AC-006\\].*${want}`), n);
    assert.doesNotMatch(out.stdout, new RegExp(other), n);
  }
});

test('I297-TC-005: nested lessons-learned link (wikilink and markdown) does not resolve', () => {
  for (const lessons of ['- [[../lessons-learned/sub/2026-10-12-x]]', '- [n](../lessons-learned/sub/2026-10-12-x.md)']) {
    const r = repo();
    r.write('docs/records/lessons-learned/sub/2026-10-12-x.md', '# L\n');
    r.write(`docs/records/work-items/${NAME}`, item(lessons));
    r.commit();
    const out = runIt(r);
    assert.equal(out.status, 0, lessons);
    assert.match(out.stdout, /WARN \[AC-006\].*does not resolve/, lessons);
    assert.doesNotMatch(out.stdout, /OK \[AC-006\]/, lessons);
  }
});

test('I297-TC-006: closeout handoff with its own Lessons Learned satisfies the check; missing record -> INFO', () => {
  const r = repo();
  r.write(`docs/records/work-items/${NAME}`, item('- N/A', '## Status: Open'));
  r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-PR1.md',
    '# H\n- Work Item: https://github.com/o/r/issues/900\n\n## Lessons Learned\n- Keep slices small.\n');
  r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-PR2.md', '# H\n- Work Item: https://github.com/o/r/issues/12345\n');
  r.commit();
  const out = runIt(r);
  assert.equal(out.status, 0);
  assert.doesNotMatch(out.stdout, /WARN/);
  assert.match(out.stdout, /INFO: no work-item record for #12345; not evaluated/);
});

test('I297-TC-006: ::warning:: annotation only under GITHUB_ACTIONS=true', () => {
  const r = withItem('- N/A');
  assert.doesNotMatch(runIt(r).stdout, /::warning/);
  assert.match(runIt(r, [], { GITHUB_ACTIONS: 'true' }).stdout, /::warning::/);
});

test('I297-TC-006: hostile base branch env still exits 0 without running a shell', () => {
  const r = withItem('- N/A');
  const out = runIt(r, [], { GITHUB_BASE_REF: '$(touch pwned);x' });
  assert.equal(out.status, 0);
});

// Security finding 1 (S3): bounded matching. Wall-clock bound is generous (3 s)
// against measured pre-fix times of 2-10 s for a single pathological line.
const BOUND_MS = 3000;
const PATHOLOGICAL = [
  ['<!-- x50k', '<!--'.repeat(50000)],
  ['wikilink x30k', '[[../lessons-learned/'.repeat(30000)],
  ['mdlink x30k', '](lessons-learned/'.repeat(30000)],
];

test('I297-TC-005-sec1: pathological single lessons line is bounded, exit 0, INFO NOT EVALUATED', () => {
  for (const [label, line] of PATHOLOGICAL) {
    const r = withItem(`- ${line}`);
    const t0 = Date.now();
    const out = runIt(r, ['--all']);
    const ms = Date.now() - t0;
    assert.equal(out.status, 0, label);
    assert.ok(ms < BOUND_MS, `${label} took ${ms} ms`);
    assert.match(out.stdout, /INFO: .*NOT EVALUATED/, label);
    assert.doesNotMatch(out.stdout, /WARN/, label);
  }
});

test('I297-TC-005-sec1: line cap (file under file cap) yields INFO NOT EVALUATED naming the cap', () => {
  for (const line of ['<!--'.repeat(50000), '[[../lessons-learned/'.repeat(10000), '](lessons-learned/'.repeat(10000)]) {
    const out = runIt(withItem(`- ${line}`), ['--all']);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /INFO: .*NOT EVALUATED \(.*exceeds 4096 characters/);
    assert.doesNotMatch(out.stdout, /WARN|OK \[AC-006\]/);
  }
});

test('I297-TC-005-sec1: many near-cap pathological lines stay bounded', () => {
  const line = '- ' + '[[../lessons-learned/'.repeat(190); // ~3.9k chars, under the line cap
  const r = withItem(Array(60).fill(line).join('\n'));
  const t0 = Date.now();
  const out = runIt(r, ['--all']);
  const ms = Date.now() - t0;
  assert.equal(out.status, 0);
  assert.ok(ms < BOUND_MS, `took ${ms} ms`);
});

test('I297-TC-005-sec1: pathological Work Item line in a handoff is bounded, exit 0', () => {
  const r = repo();
  r.write(`docs/records/work-items/${NAME}`, item('- N/A'));
  r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-x.md', `${'Work Item: '.repeat(20000)}\n`);
  r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-y.md', `${'Work Item: '.repeat(50000)}\n`);
  r.commit();
  const t0 = Date.now();
  const out = runIt(r);
  const ms = Date.now() - t0;
  assert.equal(out.status, 0);
  assert.ok(ms < BOUND_MS, `took ${ms} ms`);
  assert.match(out.stdout, /INFO: .*CLOSEOUT-x\.md: no Work Item URL/);
  assert.match(out.stdout, /INFO: .*CLOSEOUT-y\.md: NOT EVALUATED/);
});

test('I297-TC-005-sec1: oversize file is NOT EVALUATED, exit 0, no hang', () => {
  const r = repo();
  r.write(`docs/records/work-items/${NAME}`, item('- real lesson') + 'a\n'.repeat(400000));
  r.commit();
  const t0 = Date.now();
  const out = runIt(r, ['--all']);
  assert.equal(out.status, 0);
  assert.ok(Date.now() - t0 < BOUND_MS);
  assert.match(out.stdout, /NOT EVALUATED/);
  assert.doesNotMatch(out.stdout, /OK \[AC-006\]/);
});

test('I297-TC-005-sec1: normal-sized long line (under caps) still evaluates', () => {
  const out = runIt(withItem(`- ${'word '.repeat(300)}`), ['--all']);
  assert.match(out.stdout, /OK \[AC-006\]/);
});

test('I297-TC-005-sec1: handoff Work Item line over the line cap is ignored; under the cap still matches', () => {
  const r = repo();
  r.write(`docs/records/work-items/${NAME}`, item('- N/A'));
  r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-long.md', `Work Item: ${'x'.repeat(5000)}/issues/900\n`);
  r.write('docs/records/HANDOFF-POST-MERGE-CLOSEOUT-short.md', 'Work Item: https://example.test/o/r/issues/900\n');
  r.commit();
  const out = runIt(r).stdout;
  assert.match(out, /CLOSEOUT-long\.md: no Work Item URL/);
  assert.doesNotMatch(out, /CLOSEOUT-short\.md: no Work Item URL/);
});
