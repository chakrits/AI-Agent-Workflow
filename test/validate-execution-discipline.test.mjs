import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync, readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'validate-execution-discipline.mjs');
const PLAN = 'docs/records/implementation-plan/2026-10-01-demo-plan.md';
const BRIEF = 'docs/records/task-brief/2026-10-01-demo-brief.md';

function repo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ed-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  run('init', '-q', '-b', 'main');
  run('config', 'user.email', 't@t'); run('config', 'user.name', 't'); run('config', 'commit.gpgsign', 'false');
  mkdirSync(path.join(dir, 'docs/records/implementation-plan'), { recursive: true });
  mkdirSync(path.join(dir, 'docs/records/task-brief'), { recursive: true });
  mkdirSync(path.join(dir, 'docs/records/sdd'), { recursive: true });
  writeFileSync(path.join(dir, 'README.md'), 'x\n');
  writeFileSync(path.join(dir, PLAN), '# plan\n');
  writeFileSync(path.join(dir, BRIEF), '# brief\n\n- Write set: `scripts/**`, docs/a.md\n- Out of scope:\n');
  run('add', '.'); run('commit', '-qm', 'base');
  run('checkout', '-q', '-b', 'feat');
  return {
    dir,
    write(rel, text) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), text);
    },
    link(rel, target) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      symlinkSync(target, path.join(dir, rel));
    },
    commit() { run('add', '-A'); run('commit', '-qm', 'feat'); },
  };
}

function runIt(r, env = {}, cwd = r.dir) {
  const clean = { ...process.env };
  for (const k of ['GITHUB_BASE_REF', 'CI_MERGE_REQUEST_TARGET_BRANCH_NAME', 'GITHUB_ACTIONS', 'GITHUB_EVENT_NAME', 'GITLAB_CI',
    'CI_PIPELINE_SOURCE', 'CI_MERGE_REQUEST_DESCRIPTION_IS_TRUNCATED', 'PR_BODY', 'PR_BODY_FILE']) delete clean[k];
  return spawnSync('node', [SCRIPT], { cwd, env: { ...clean, ...env }, encoding: 'utf8', timeout: 30000 });
}

function lines(n) { return Array.from({ length: n }, (_, i) => `line ${i}`).join('\n') + '\n'; }

function behavior(body, extra = () => {}) {
  const r = repo();
  r.write('scripts/x.mjs', 'export const x = 1;\n');
  extra(r);
  r.commit();
  return { r, res: runIt(r, { PR_BODY: body }) };
}

test('I297-TC-007: behavior file changed without plan reference warns and exits 0', () => {
  const { res } = behavior('');
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /WARN \[AC-001\]/);
});

test('I297-TC-007b: docs-only change reports no behavior files and no AC-001 warning', () => {
  const r = repo();
  r.write('docs/notes.md', 'n\n'); r.write('test/t.test.mjs', 't\n'); r.write('package-lock.json', '{}\n'); r.write('.obsidian/a.json', '{}\n');
  r.commit();
  const res = runIt(r, { PR_BODY: '' });
  assert.equal(res.status, 0);
  assert.doesNotMatch(res.stdout, /WARN \[AC-001\]/);
  assert.match(res.stdout, /OK \[AC-001\] no behavior files changed/);
});

test('I297-TC-007c: docs contract yaml and json count as behavior files', () => {
  const r = repo();
  r.write('docs/contracts/x.yaml', 'a: 1\n');
  r.commit();
  assert.match(runIt(r, { PR_BODY: '' }).stdout, /WARN \[AC-001\]/);
});

for (const [label, body] of [
  ['plain path', `Plan: ${PLAN}`],
  ['markdown link', `See [plan](${PLAN})`],
  ['wikilink', `See [[${PLAN}]]`],
]) {
  test(`I297-TC-008: ${label} to an existing plan satisfies AC-001`, () => {
    const { res } = behavior(body);
    assert.equal(res.status, 0);
    assert.doesNotMatch(res.stdout, /WARN \[AC-001\]/);
    assert.match(res.stdout, /OK \[AC-001\]/);
  });
}

for (const [label, body] of [
  ['dot-dot traversal', 'docs/records/sdd/../../../etc/passwd.md and ../docs/records/sdd/x.md'],
  ['absolute path', '/etc/docs/records/implementation-plan/2026-10-01-demo-plan.md'],
  ['missing target', 'docs/records/implementation-plan/2026-10-01-nope.md'],
  ['network url', 'https://example.com/docs/records/implementation-plan/2026-10-01-demo-plan.md'],
]) {
  test(`I297-TC-008: ${label} does not satisfy AC-001`, () => {
    const { res } = behavior(body);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /WARN \[AC-001\]/);
  });
}

test('I297-TC-008: symlink escaping the repo does not satisfy AC-001 (realpath containment)', () => {
  const outside = path.join(mkdtempSync(path.join(os.tmpdir(), 'ed-out-')), 'secret.md');
  writeFileSync(outside, 'secret\n');
  const { res } = behavior('docs/records/sdd/evil.md', (r) => r.link('docs/records/sdd/evil.md', outside));
  assert.equal(res.status, 0);
  assert.match(res.stdout, /WARN \[AC-001\]/);
});

test('I297-TC-009: more than 300 counted lines warns AC-002 and exits 0', () => {
  const r = repo();
  r.write('scripts/big.mjs', lines(350));
  r.commit();
  const res = runIt(r, { PR_BODY: PLAN });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /WARN \[AC-002\].*~300/);
  assert.doesNotMatch(res.stdout, /must be split/);
});

test('I297-TC-009b: more than 1000 counted lines says must be split', () => {
  const r = repo();
  r.write('scripts/big.mjs', lines(1100));
  r.commit();
  assert.match(runIt(r, { PR_BODY: PLAN }).stdout, /WARN \[AC-002\].*~1000.*must be split/);
});

test('I297-TC-009c: lines in excluded paths are not counted', () => {
  const r = repo();
  r.write('scripts/ok.mjs', lines(10));
  r.write('package-lock.json', lines(900));
  r.write('docs/records/big.md', lines(900));
  r.write('test/fixtures/big.json', lines(900));
  r.commit();
  const res = runIt(r, { PR_BODY: PLAN });
  assert.doesNotMatch(res.stdout, /WARN \[AC-002\]/);
});

test('I297-TC-009d: thresholds are pinned to the AGENTS.md Change Sizing sentence', async () => {
  const agents = readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  const sentence = agents.split('\n').find((l) => l.includes('is acceptable for a single logical change'));
  assert.ok(sentence, 'AGENTS.md Change Sizing sentence not found');
  const acceptable = Number(/~(\d+) is acceptable/.exec(sentence)[1]);
  const tooLarge = Number(/~(\d+) is too large/.exec(sentence)[1]);
  const mod = await import(SCRIPT);
  assert.equal(mod.SIZE_ACCEPTABLE, acceptable);
  assert.equal(mod.SIZE_TOO_LARGE, tooLarge);
});

test('I297-TC-010: cited Task Brief write set flags files outside it', () => {
  const r = repo();
  r.write('scripts/in.mjs', 'a\n'); r.write('docs/a.md', 'a\n'); r.write('src/out.mjs', 'a\n');
  r.commit();
  const res = runIt(r, { PR_BODY: `Brief: ${BRIEF}` });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /WARN \[AC-002\] src\/out\.mjs is outside the Task Brief write set/);
  assert.doesNotMatch(res.stdout, /scripts\/in\.mjs is outside/);
  assert.doesNotMatch(res.stdout, /docs\/a\.md is outside/);
});

test('I297-TC-010b: indented bullet write set is parsed', () => {
  const r = repo();
  r.write(BRIEF, '- Write set:\n  - `lib/*.mjs`\n  - scripts/x.mjs\n- Out of scope:\n');
  r.write('lib/a.mjs', 'a\n'); r.write('lib/sub/b.mjs', 'a\n');
  r.commit();
  const res = runIt(r, { PR_BODY: BRIEF });
  assert.doesNotMatch(res.stdout, /lib\/a\.mjs is outside/);
  assert.match(res.stdout, /lib\/sub\/b\.mjs is outside/);
});

test('I297-TC-010c: unparsable write set warns explicitly and does not compare', () => {
  const r = repo();
  r.write(BRIEF, '# brief\n\n- Write set:\n- Out of scope:\n');
  r.write('src/out.mjs', 'a\n');
  r.commit();
  const res = runIt(r, { PR_BODY: BRIEF });
  assert.match(res.stdout, /WARN \[AC-002\] write set not parseable; not compared/);
  assert.doesNotMatch(res.stdout, /is outside the Task Brief write set/);
});

test('I297-TC-010d: no Task Brief cited skips the write-set comparison with one INFO line', () => {
  const r = repo();
  r.write('src/out.mjs', 'a\n');
  r.commit();
  const res = runIt(r, { PR_BODY: PLAN });
  assert.doesNotMatch(res.stdout, /outside the Task Brief write set|write set not parseable/);
  assert.equal(res.stdout.split('\n').filter((l) => /^INFO:.*Task Brief/.test(l)).length, 1);
});

test('I297-TC-011: no PR body is NOT EVALUATED for AC-001, not a warning', () => {
  const r = repo();
  r.write('scripts/x.mjs', 'a\n'); r.commit();
  const res = runIt(r);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /NOT EVALUATED: no PR body/);
  assert.doesNotMatch(res.stdout, /WARN \[AC-001\]/);
});

test('I297-TC-011b: push events carry no PR body even when PR_BODY is empty', () => {
  const r = repo();
  r.write('scripts/x.mjs', 'a\n'); r.commit();
  const res = runIt(r, { PR_BODY: '', GITHUB_EVENT_NAME: 'push' });
  assert.match(res.stdout, /NOT EVALUATED: no PR body/);
  assert.doesNotMatch(res.stdout, /WARN \[AC-001\]/);
});

test('I297-TC-011c: no PR range is NOT EVALUATED and exits 0', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ed-nogit-'));
  const res = runIt({ dir }, {}, dir);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /NOT EVALUATED/);
});

test('I297-TC-012: truncated GitLab description degrades to NOT EVALUATED, not a false warning', () => {
  const r = repo();
  r.write('scripts/x.mjs', 'a\n'); r.commit();
  const flagged = runIt(r, { PR_BODY: 'short', CI_MERGE_REQUEST_DESCRIPTION_IS_TRUNCATED: 'true' });
  assert.match(flagged.stdout, /NOT EVALUATED.*truncated/i);
  assert.doesNotMatch(flagged.stdout, /WARN \[AC-001\]/);
  const long = runIt(r, { PR_BODY: 'a '.repeat(1400), GITLAB_CI: 'true' });
  assert.match(long.stdout, /NOT EVALUATED.*truncated/i);
  assert.doesNotMatch(long.stdout, /WARN \[AC-001\]/);
});

test('I297-TC-013: PR_BODY_FILE takes precedence over PR_BODY', () => {
  const r = repo();
  r.write('scripts/x.mjs', 'a\n'); r.commit();
  const f = path.join(r.dir, '..', `body-${path.basename(r.dir)}.txt`);
  writeFileSync(f, `Plan ${PLAN}\n`);
  const res = runIt(r, { PR_BODY_FILE: f, PR_BODY: 'nothing' });
  assert.doesNotMatch(res.stdout, /WARN \[AC-001\]/);
  assert.match(res.stdout, /OK \[AC-001\]/);
});

test('I297-TC-014: oversize body is bounded and never scanned', () => {
  const r = repo();
  r.write('scripts/x.mjs', 'a\n'); r.commit();
  const t = Date.now();
  const res = runIt(r, { PR_BODY: 'a'.repeat(300_000) });
  assert.equal(res.status, 0);
  assert.ok(Date.now() - t < 10000);
  assert.match(res.stdout, /NOT EVALUATED/);
});

test('I297-TC-014b: oversize body line is skipped without hanging', () => {
  const r = repo();
  r.write('scripts/x.mjs', 'a\n'); r.commit();
  const res = runIt(r, { PR_BODY: `${'docs/records/sdd/'.repeat(1000)}\n${PLAN}` });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /OK \[AC-001\]/);
});

test('I297-TC-015: body text is never echoed; annotations are single-line and sanitized', () => {
  const r = repo();
  r.write('scripts/x.mjs', 'a\n'); r.commit();
  const body = '::error::PWNED\n::set-output name=x::PWNED\r\n%0A::warning::PWNED\u001b[31m';
  const res = runIt(r, { PR_BODY: body, GITHUB_ACTIONS: 'true' });
  assert.equal(res.status, 0);
  assert.doesNotMatch(res.stdout, /PWNED|::error|set-output/);
  for (const l of res.stdout.split('\n').filter((x) => x.startsWith('::'))) assert.match(l, /^::warning::\[AC-00[12]\] [^\r\x00-\x1f]*$/);
  assert.match(res.stdout, /::warning::\[AC-001\]/);
});

test('I297-TC-015b: Task Brief content is not echoed beyond sanitized changed-file names', () => {
  const r = repo();
  r.write(BRIEF, '- Write set: `a.mjs`, ::error::PWNED\n- Out of scope:\n');
  r.write('src/out.mjs', 'a\n'); r.commit();
  const res = runIt(r, { PR_BODY: BRIEF, GITHUB_ACTIONS: 'true' });
  assert.doesNotMatch(res.stdout, /PWNED/);
});

test('I297-TC-016: pre-push calls the advisory script before the PR_BODY_FILE early exit', () => {
  const hook = readFileSync(path.join(ROOT, '.githooks', 'pre-push'), 'utf8');
  const call = hook.indexOf('validate:execution-discipline');
  const early = hook.indexOf('if [ -z "$PR_BODY_FILE" ]');
  assert.ok(call > 0 && early > 0 && call < early, 'advisory call must precede the PR_BODY_FILE early exit');
  assert.match(hook, /grep -q '"validate:execution-discipline"' package\.json/);
  assert.match(hook, /validate:execution-discipline[^\n]*\|\| true/);
});

test('I297-TC-017: CI wiring passes the PR body through env only and is not masked', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['validate:execution-discipline'], 'node scripts/validate-execution-discipline.mjs');
  const gh = readFileSync(path.join(ROOT, '.github/workflows/validate-contracts.yml'), 'utf8');
  assert.match(gh, /- run: npm run validate:execution-discipline\n\s+env:\n(?:\s+#[^\n]*\n)*\s+PR_BODY: \$\{\{ github\.event\.pull_request\.body \}\}/);
  assert.ok(!gh.split('\n').some((l) => /\brun:/.test(l) && /github\.event\.pull_request\.body/.test(l)));
  assert.doesNotMatch(gh, /continue-on-error/);
  const gl = readFileSync(path.join(ROOT, '.gitlab-ci.yml'), 'utf8');
  const job = gl.split(/\n(?=\S)/).find((b) => b.startsWith('validate_execution_discipline:'));
  assert.ok(job, 'GitLab job validate_execution_discipline missing');
  assert.match(job, /GIT_DEPTH: 0/);
  assert.match(job, /PR_BODY: \$CI_MERGE_REQUEST_DESCRIPTION/);
  assert.match(job, /npm run validate:execution-discipline\n/);
  assert.doesNotMatch(job, /\|\| true|allow_failure/);
});
