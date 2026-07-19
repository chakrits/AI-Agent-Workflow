import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import { planReset, applyReset, STUB_CONTENT, CLEARED_DIRECTORIES } from '../scripts/reset-to-template.mjs';

async function makeFixtureRepo() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'reset-template-'));
  await writeFile(path.join(rootDir, 'PROJECT_STATUS.md'), '# PROJECT_STATUS.md\n\nSome real project data here.\n', 'utf8');
  await writeFile(path.join(rootDir, 'TASK_LOG.md'), '# TASK_LOG.md\n\n| Date | ... |\n| 2026-01-01 | real row |\n', 'utf8');
  await writeFile(path.join(rootDir, 'CHANGELOG.md'), '# CHANGELOG.md\n\n### Added\n- real entry\n', 'utf8');
  await writeFile(path.join(rootDir, 'RISKS.md'), '# RISKS.md\n\n| R-001 | real risk |\n', 'utf8');
  for (const dir of CLEARED_DIRECTORIES) {
    await mkdir(path.join(rootDir, dir), { recursive: true });
    await writeFile(path.join(rootDir, dir, 'example-record.md'), 'real content', 'utf8');
  }
  return rootDir;
}

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
