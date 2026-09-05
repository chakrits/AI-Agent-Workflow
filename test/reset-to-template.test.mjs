import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, lstat, readlink } from 'node:fs/promises';
import os from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import {
  planReset,
  applyReset,
  findDestructiveCiInvocations,
  STUB_CONTENT,
  CLEARED_DIRECTORIES
} from '../scripts/reset-to-template.mjs';

const execFile = promisify(execFileCallback);
const SCRIPT_PATH = path.resolve('scripts/reset-to-template.mjs');

async function makeFixtureRepo() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'reset-template-'));
  await writeFile(path.join(rootDir, 'PROJECT_STATUS.md'), '# PROJECT_STATUS.md\n\nSome real project data here.\n', 'utf8');
  await writeFile(path.join(rootDir, 'TASK_LOG.md'), '# TASK_LOG.md\n\n| Date | ... |\n| 2026-01-01 | real row |\n', 'utf8');
  await writeFile(path.join(rootDir, 'CHANGELOG.md'), '# CHANGELOG.md\n\n### Added\n- real entry\n', 'utf8');
  await writeFile(path.join(rootDir, 'RISKS.md'), '# RISKS.md\n\n| R-001 | real risk |\n', 'utf8');
  await writeFile(path.join(rootDir, 'DECISIONS.md'), '# DECISIONS.md\n\n## ADR-0001: real decision\n', 'utf8');
  for (const dir of CLEARED_DIRECTORIES) {
    await mkdir(path.join(rootDir, dir), { recursive: true });
    await writeFile(path.join(rootDir, dir, 'example-record.md'), 'real content', 'utf8');
  }
  await mkdir(path.join(rootDir, 'docs/records/qa'), { recursive: true });
  await writeFile(path.join(rootDir, 'docs/records/qa/sentinel.md'), 'preserve exactly\n', 'utf8');
  return rootDir;
}

async function initGitFixture() {
  const rootDir = await makeFixtureRepo();
  await execFile('git', ['init', '-q'], { cwd: rootDir });
  await execFile('git', ['config', 'user.email', 'fixture@example.test'], { cwd: rootDir });
  await execFile('git', ['config', 'user.name', 'Fixture'], { cwd: rootDir });
  await execFile('git', ['add', '.'], { cwd: rootDir });
  await execFile('git', ['commit', '-qm', 'fixture baseline'], { cwd: rootDir });
  return rootDir;
}

async function snapshotTargets(rootDir) {
  const targets = [...Object.keys(STUB_CONTENT), ...CLEARED_DIRECTORIES];
  const { stdout } = await execFile('git', ['status', '--short', '--untracked-files=all', '--', ...targets], {
    cwd: rootDir
  });
  const contents = {};
  for (const file of Object.keys(STUB_CONTENT)) {
    contents[file] = await readFile(path.join(rootDir, file), 'utf8').catch(() => null);
  }
  return { status: stdout, contents };
}

async function snapshotDeclaredTargets(rootDir) {
  async function snapshot(relativePath) {
    const absolutePath = path.join(rootDir, relativePath);
    const metadata = await lstat(absolutePath).catch(() => null);
    if (!metadata) return null;
    if (metadata.isSymbolicLink()) {
      return { type: 'symlink', target: await readlink(absolutePath) };
    }
    if (metadata.isDirectory()) {
      const entries = await readdir(absolutePath);
      return {
        type: 'directory',
        entries: Object.fromEntries(
          await Promise.all(
            entries.sort().map(async (entry) => [
              entry,
              await snapshot(path.join(relativePath, entry))
            ])
          )
        )
      };
    }
    return { type: 'file', content: await readFile(absolutePath, 'base64') };
  }

  return Object.fromEntries(
    await Promise.all(
      [...Object.keys(STUB_CONTENT), ...CLEARED_DIRECTORIES].map(async (target) => [
        target,
        await snapshot(target)
      ])
    )
  );
}

async function runCli(rootDir, args = []) {
  return execFile(process.execPath, [SCRIPT_PATH, ...args], { cwd: rootDir });
}

test('reset scope clears work-item and lessons history, stubs decisions, and excludes QA/navigation', () => {
  assert.ok(CLEARED_DIRECTORIES.includes('docs/records/work-items'));
  assert.ok(CLEARED_DIRECTORIES.includes('docs/records/lessons-learned'));
  assert.ok(CLEARED_DIRECTORIES.includes('docs/records/handoff'));
  assert.ok(
    CLEARED_DIRECTORIES.includes('docs/records/handoffs'),
    'docs/records/handoffs (plural) must be cleared alongside docs/records/handoff (singular) — both directories hold historical handoff records'
  );
  assert.ok(!CLEARED_DIRECTORIES.includes('docs/records/qa'));
  assert.match(STUB_CONTENT['DECISIONS.md'], /^# DECISIONS\.md/m);
  assert.match(STUB_CONTENT['DECISIONS.md'], /## Decision Log/);
  for (const [file, content] of [
    ['TASK_LOG.md', STUB_CONTENT['TASK_LOG.md']],
    ['RISKS.md', STUB_CONTENT['RISKS.md']]
  ]) {
    const lines = content.trim().split('\n');
    const headerIndex = lines.findIndex((line) => line.startsWith('|'));
    assert.ok(headerIndex !== -1, `${file} stub must contain a markdown table header`);
    assert.match(
      lines[headerIndex + 1] ?? '',
      /^\|(?:\s*-{1,}\s*\|)+$/,
      `${file} stub's table header must be followed by a separator row, or the table never renders`
    );
  }
  for (const preserved of ['README.md', 'PROJECT_INDEX.md', 'docs/vault/00-Index.md']) {
    assert.ok(!(preserved in STUB_CONTENT), `${preserved} must not be stubbed`);
  }
});

test('planReset (dry run) does not modify any file', async () => {
  const rootDir = await makeFixtureRepo();
  const before = await readFile(path.join(rootDir, 'PROJECT_STATUS.md'), 'utf8');
  await planReset(rootDir);
  const after = await readFile(path.join(rootDir, 'PROJECT_STATUS.md'), 'utf8');
  assert.equal(after, before);
  const recordFiles = await readdir(path.join(rootDir, 'docs/records/sdd'));
  assert.ok(recordFiles.includes('example-record.md'), 'dry run must not delete record files');
  await rm(rootDir, { recursive: true, force: true });
});

test('planReset reports each stub file as changed when real content exists', async () => {
  const rootDir = await makeFixtureRepo();
  const { fileChanges } = await planReset(rootDir);
  assert.ok(fileChanges.every((f) => f.changed === true));
  await rm(rootDir, { recursive: true, force: true });
});

test('planReset reports the correct pending file count per cleared directory', async () => {
  const rootDir = await makeFixtureRepo();
  const { dirChanges } = await planReset(rootDir);
  const sdd = dirChanges.find((d) => d.dir === 'docs/records/sdd');
  assert.equal(sdd.fileCount, 1);
  await rm(rootDir, { recursive: true, force: true });
});

test('applyReset overwrites all four project-state files with the exact stub content', async () => {
  const rootDir = await makeFixtureRepo();
  await applyReset(rootDir);
  for (const [file, stub] of Object.entries(STUB_CONTENT)) {
    const content = await readFile(path.join(rootDir, file), 'utf8');
    assert.equal(content, stub, `${file} did not match the expected stub`);
  }
  await rm(rootDir, { recursive: true, force: true });
});

test('applyReset removes real files from every cleared record directory but keeps the directory and adds .gitkeep', async () => {
  const rootDir = await makeFixtureRepo();
  await applyReset(rootDir);
  for (const dir of CLEARED_DIRECTORIES) {
    const entries = await readdir(path.join(rootDir, dir));
    assert.deepEqual(entries, ['.gitkeep'], `${dir} should contain only .gitkeep after reset`);
  }
  await rm(rootDir, { recursive: true, force: true });
});

test('applyReset preserves seeded QA evidence byte-for-byte', async () => {
  const rootDir = await makeFixtureRepo();
  const sentinel = path.join(rootDir, 'docs/records/qa/sentinel.md');
  const before = await readFile(sentinel);
  await applyReset(rootDir);
  const after = await readFile(sentinel);
  assert.deepEqual(after, before);
  await rm(rootDir, { recursive: true, force: true });
});

test('applyReset is idempotent: running it twice produces the same result with no errors', async () => {
  const rootDir = await makeFixtureRepo();
  await applyReset(rootDir);
  await applyReset(rootDir);
  const content = await readFile(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
  assert.equal(content, STUB_CONTENT['CHANGELOG.md']);
  await rm(rootDir, { recursive: true, force: true });
});

test('applyReset never touches files outside the declared stub/cleared sets', async () => {
  const rootDir = await makeFixtureRepo();
  await writeFile(path.join(rootDir, 'AGENTS.md'), 'canonical workflow rules — must survive reset\n', 'utf8');
  await applyReset(rootDir);
  const agentsContent = await readFile(path.join(rootDir, 'AGENTS.md'), 'utf8');
  assert.equal(agentsContent, 'canonical workflow rules — must survive reset\n');
  await rm(rootDir, { recursive: true, force: true });
});

test('CLI dry-run prints inventory and mutates nothing', async () => {
  const rootDir = await initGitFixture();
  const before = await snapshotTargets(rootDir);
  const { stdout } = await runCli(rootDir);
  const after = await snapshotTargets(rootDir);

  assert.match(stdout, /DRY RUN/);
  assert.match(stdout, /DECISIONS\.md/);
  assert.match(stdout, /docs\/records\/work-items/);
  assert.match(stdout, /entries? would be deleted or replaced/);
  assert.deepEqual(after, before);
  await rm(rootDir, { recursive: true, force: true });
});

test('CLI --apply without --confirm-reset refuses before mutation', async () => {
  const rootDir = await initGitFixture();
  const before = await snapshotTargets(rootDir);

  await assert.rejects(
    runCli(rootDir, ['--apply']),
    (error) => error.code !== 0 && /--confirm-reset/.test(error.stderr)
  );
  assert.deepEqual(await snapshotTargets(rootDir), before);
  await rm(rootDir, { recursive: true, force: true });
});

for (const dirtyCase of [
  {
    name: 'tracked modification',
    prepare: (rootDir) => writeFile(path.join(rootDir, 'DECISIONS.md'), '# dirty tracked\n')
  },
  {
    name: 'staged change',
    prepare: async (rootDir) => {
      await writeFile(path.join(rootDir, 'DECISIONS.md'), '# dirty staged\n');
      await execFile('git', ['add', 'DECISIONS.md'], { cwd: rootDir });
    }
  },
  {
    name: 'untracked target entry',
    prepare: (rootDir) =>
      writeFile(path.join(rootDir, 'docs/records/work-items/untracked.md'), 'do not delete\n')
  }
]) {
  test(`CLI refuses ${dirtyCase.name}, lists it, and performs no mutation`, async () => {
    const rootDir = await initGitFixture();
    await dirtyCase.prepare(rootDir);
    const before = await snapshotTargets(rootDir);

    await assert.rejects(
      runCli(rootDir, ['--apply', '--confirm-reset']),
      (error) => error.code !== 0 && /dirty targeted paths/i.test(error.stderr) && /DECISIONS|work-items/.test(error.stderr)
    );
    assert.deepEqual(await snapshotTargets(rootDir), before);
    await rm(rootDir, { recursive: true, force: true });
  });
}

test('CLI applies in a clean git fixture with both confirmations and is idempotent', async () => {
  const rootDir = await initGitFixture();
  await runCli(rootDir, ['--apply', '--confirm-reset']);
  const first = await snapshotTargets(rootDir);
  const qaAfterFirst = await readFile(path.join(rootDir, 'docs/records/qa/sentinel.md'), 'utf8');

  await execFile('git', ['add', '.'], { cwd: rootDir });
  await execFile('git', ['commit', '-qm', 'reset baseline'], { cwd: rootDir });
  await runCli(rootDir, ['--apply', '--confirm-reset']);
  const second = await snapshotTargets(rootDir);
  assert.deepEqual(second.contents, first.contents);
  assert.equal(second.status, '');
  assert.equal(await readFile(path.join(rootDir, 'docs/records/qa/sentinel.md'), 'utf8'), qaAfterFirst);
  await rm(rootDir, { recursive: true, force: true });
});

test('CLI rejects a committed symlinked target before mutating any declared target or outside data', async () => {
  const rootDir = await initGitFixture();
  const outsideDir = await mkdtemp(path.join(os.tmpdir(), 'reset-template-outside-'));
  const sentinel = path.join(outsideDir, 'sentinel.txt');
  await writeFile(sentinel, 'must survive byte-for-byte\n');
  const symlinkTarget = path.join(rootDir, 'docs/records/work-items');
  await rm(symlinkTarget, { recursive: true });
  await symlink(outsideDir, symlinkTarget);
  await execFile('git', ['add', '-A'], { cwd: rootDir });
  await execFile('git', ['commit', '-qm', 'committed symlink fixture'], { cwd: rootDir });
  const beforeTargets = await snapshotDeclaredTargets(rootDir);
  const beforeSentinel = await readFile(sentinel);

  await assert.rejects(
    runCli(rootDir, ['--apply', '--confirm-reset']),
    (error) =>
      error.code !== 0 &&
      /symlink|outside|containment/i.test(error.stderr) &&
      /docs\/records\/work-items/.test(error.stderr)
  );

  assert.deepEqual(await snapshotDeclaredTargets(rootDir), beforeTargets);
  assert.deepEqual(await readFile(sentinel), beforeSentinel);
  await rm(rootDir, { recursive: true, force: true });
  await rm(outsideDir, { recursive: true, force: true });
});

test('CI scan rejects GitHub and GitLab multiline destructive forms while permitting dry runs', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'reset-template-ci-'));
  await mkdir(path.join(rootDir, '.github/workflows'), { recursive: true });
  await writeFile(
    path.join(rootDir, '.github/workflows/check.yml'),
    `steps:
  - run: >
      npm run reset:template --
      --apply --confirm-reset
  - run: |
      node scripts/reset-to-template.mjs
      --apply --confirm-reset
  - run: |
      npm run reset:template
`
  );
  await writeFile(
    path.join(rootDir, '.gitlab-ci.yml'),
    `folded:
  script: >
    node scripts/reset-to-template.mjs
    --apply --confirm-reset
literal:
  script: |
    npm run reset:template --
    --apply --confirm-reset
safe:
  script: |
    node scripts/reset-to-template.mjs
`
  );

  assert.deepEqual(findDestructiveCiInvocations(rootDir), [
    '.github/workflows/check.yml',
    '.gitlab-ci.yml'
  ]);
  await rm(rootDir, { recursive: true, force: true });
});

test('repository CI contains no destructive reset invocation', () => {
  assert.deepEqual(findDestructiveCiInvocations(path.resolve('.')), []);
});

// --- Issue #208: DECISIONS.md holds governing decisions, not clearable records ---

async function initGitFixtureWithRealAdr() {
  const rootDir = await initGitFixture();
  await writeFile(
    path.join(rootDir, 'DECISIONS.md'),
    '# DECISIONS.md\n\n## Decision Log\n\n### ADR-0042: A governing decision\n\n- Date: 2026-01-01\n- Status: Accepted\n',
    'utf8'
  );
  await execFile('git', ['add', 'DECISIONS.md'], { cwd: rootDir });
  await execFile('git', ['commit', '-qm', 'record a real ADR'], { cwd: rootDir });
  return rootDir;
}

test('CLI refuses to blank DECISIONS.md when it holds real ADRs, names them, and mutates nothing', async () => {
  const rootDir = await initGitFixtureWithRealAdr();
  const before = await snapshotDeclaredTargets(rootDir);

  await assert.rejects(
    runCli(rootDir, ['--apply', '--confirm-reset']),
    (error) =>
      error.code !== 0 &&
      /ADR-0042/.test(error.stderr) &&
      /--reset-decisions/.test(error.stderr)
  );

  assert.deepEqual(
    await snapshotDeclaredTargets(rootDir),
    before,
    'a refused reset must not delete records either — the refusal has to happen before any mutation'
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('CLI blanks DECISIONS.md only when --reset-decisions is passed explicitly', async () => {
  const rootDir = await initGitFixtureWithRealAdr();

  await runCli(rootDir, ['--apply', '--confirm-reset', '--reset-decisions']);

  assert.equal(await readFile(path.join(rootDir, 'DECISIONS.md'), 'utf8'), STUB_CONTENT['DECISIONS.md']);
  await rm(rootDir, { recursive: true, force: true });
});

test('a DECISIONS.md with no real ADRs still resets without the extra flag', async () => {
  const rootDir = await initGitFixture();

  await runCli(rootDir, ['--apply', '--confirm-reset']);

  assert.equal(await readFile(path.join(rootDir, 'DECISIONS.md'), 'utf8'), STUB_CONTENT['DECISIONS.md']);
  assert.equal(await readFile(path.join(rootDir, 'PROJECT_STATUS.md'), 'utf8'), STUB_CONTENT['PROJECT_STATUS.md']);
  await rm(rootDir, { recursive: true, force: true });
});
