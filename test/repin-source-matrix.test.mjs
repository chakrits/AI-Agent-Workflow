import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import { repinSourceMatrix } from '../scripts/repin-source-matrix.mjs';

const MATRIX_RELATIVE_PATH = 'test/fixtures/context-pack-v1/required-source-matrix.json';

function sha256Of(text) {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Builds a temp repo containing a matrix fixture and its pinned source files.
 * `rows` is an array of { role, loadMode, paths: [{ path, content }] } —
 * pinned hash is computed from `content` unless `hash` is provided explicitly
 * (used to simulate stale/incorrect pins).
 */
async function makeFixtureRepo(rows) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'repin-source-matrix-'));
  const matrixDir = path.join(rootDir, path.dirname(MATRIX_RELATIVE_PATH));
  await mkdir(matrixDir, { recursive: true });

  const writtenPaths = new Set();
  const matrixRows = [];
  for (const row of rows) {
    const requiredSources = [];
    for (const source of row.paths) {
      const sha256 = source.hash ?? sha256Of(source.content);
      requiredSources.push({ path: source.path, sha256 });
      if (!writtenPaths.has(source.path)) {
        writtenPaths.add(source.path);
        const filePath = path.join(rootDir, source.path);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source.content, 'utf8');
      }
    }
    matrixRows.push({ role: row.role, loadMode: row.loadMode, requiredSources });
  }

  const matrix = { schemaVersion: 'context-source-matrix/v1', roles: [...new Set(rows.map((r) => r.role))], rows: matrixRows };
  const raw = JSON.stringify(matrix, null, 2) + '\n';
  await writeFile(path.join(rootDir, MATRIX_RELATIVE_PATH), raw, 'utf8');
  return rootDir;
}

async function readMatrix(rootDir) {
  return JSON.parse(await readFile(path.join(rootDir, MATRIX_RELATIVE_PATH), 'utf8'));
}

test('a run against unchanged content performs no filesystem write at all (AC-02)', async () => {
  const rootDir = await makeFixtureRepo([
    { role: 'Orchestrator Agent', loadMode: 'boot', paths: [{ path: 'AGENTS.md', content: 'agents content\n' }] }
  ]);
  const matrixPath = path.join(rootDir, MATRIX_RELATIVE_PATH);
  const before = await readFile(matrixPath);
  const statBefore = await stat(matrixPath);

  const result = await repinSourceMatrix(rootDir);

  assert.deepEqual(result.changedPaths, []);
  assert.equal(result.written, false);
  const after = await readFile(matrixPath);
  const statAfter = await stat(matrixPath);
  assert.ok(before.equals(after), 'file bytes must be unchanged');
  assert.equal(statAfter.mtimeMs, statBefore.mtimeMs, 'mtime must be unchanged (no write occurred)');

  await rm(rootDir, { recursive: true, force: true });
});

test('updates the sha256 for a path whose content changed', async () => {
  const rootDir = await makeFixtureRepo([
    { role: 'Orchestrator Agent', loadMode: 'boot', paths: [{ path: 'AGENTS.md', content: 'old content\n' }] }
  ]);
  await writeFile(path.join(rootDir, 'AGENTS.md'), 'new content\n', 'utf8');

  const result = await repinSourceMatrix(rootDir);

  assert.equal(result.written, true);
  assert.deepEqual(result.changedPaths, ['AGENTS.md']);
  const matrix = await readMatrix(rootDir);
  assert.equal(matrix.rows[0].requiredSources[0].sha256, sha256Of('new content\n'));

  await rm(rootDir, { recursive: true, force: true });
});

test('updates every occurrence of a redundantly-pinned path, not just the first match', async () => {
  const rows = [];
  for (let i = 0; i < 5; i += 1) {
    rows.push({ role: `Role ${i}`, loadMode: 'boot', paths: [{ path: 'AGENTS.md', content: 'shared content\n' }] });
  }
  const rootDir = await makeFixtureRepo(rows);
  await writeFile(path.join(rootDir, 'AGENTS.md'), 'shared content, edited\n', 'utf8');

  const result = await repinSourceMatrix(rootDir);
  assert.deepEqual(result.changedPaths, ['AGENTS.md']);

  const matrix = await readMatrix(rootDir);
  const expected = sha256Of('shared content, edited\n');
  const hashes = matrix.rows.map((row) => row.requiredSources[0].sha256);
  assert.equal(hashes.length, 5);
  assert.ok(hashes.every((hash) => hash === expected), `expected all 5 occurrences updated, got: ${hashes.join(', ')}`);

  await rm(rootDir, { recursive: true, force: true });
});

test('fails closed and writes nothing when a path is pinned with non-uniform hashes across rows', async () => {
  const rootDir = await makeFixtureRepo([
    { role: 'Orchestrator Agent', loadMode: 'boot', paths: [{ path: 'AGENTS.md', content: 'agents content\n', hash: 'a'.repeat(64) }] },
    { role: 'PM Agent', loadMode: 'boot', paths: [{ path: 'AGENTS.md', content: 'agents content\n', hash: 'b'.repeat(64) }] }
  ]);
  const matrixPath = path.join(rootDir, MATRIX_RELATIVE_PATH);
  const before = await readFile(matrixPath);
  const statBefore = await stat(matrixPath);

  await assert.rejects(
    () => repinSourceMatrix(rootDir),
    (error) => {
      assert.match(error.message, /AGENTS\.md/);
      assert.match(error.message, /non-uniform|disagree|inconsistent/i);
      return true;
    }
  );

  const after = await readFile(matrixPath);
  const statAfter = await stat(matrixPath);
  assert.ok(before.equals(after), 'file must be unchanged after a fail-closed guard rejection');
  assert.equal(statAfter.mtimeMs, statBefore.mtimeMs, 'no write may occur on the fail-closed path');

  await rm(rootDir, { recursive: true, force: true });
});

test('fails closed when the fixture does not round-trip byte-identically through JSON.stringify(JSON.parse(x), null, 2), and prevents a write that would otherwise happen', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'repin-source-matrix-'));
  const matrixDir = path.join(rootDir, path.dirname(MATRIX_RELATIVE_PATH));
  await mkdir(matrixDir, { recursive: true });
  await writeFile(path.join(rootDir, 'AGENTS.md'), 'agents content\n', 'utf8');
  // Deliberately stale/wrong — NOT sha256Of('agents content\n') — so that if the
  // round-trip guard were bypassed, the script would find a genuine hash mismatch
  // and actually attempt a write (with corrected 2-space formatting, discarding
  // this fixture's 4-space indentation). A fixture whose hash is already correct
  // (as this test previously used) can never provoke that write, so "the file is
  // unmodified after the guard throws" would hold trivially either way and prove
  // nothing about the guard actually preventing a write (QA-215-1).
  const staleHash = 'f'.repeat(64);
  // 4-space indentation instead of the 2-space indentation the script assumes.
  const matrix = {
    schemaVersion: 'context-source-matrix/v1',
    roles: ['Orchestrator Agent'],
    rows: [{ role: 'Orchestrator Agent', loadMode: 'boot', requiredSources: [{ path: 'AGENTS.md', sha256: staleHash }] }]
  };
  const raw = JSON.stringify(matrix, null, 4) + '\n';
  const matrixPath = path.join(rootDir, MATRIX_RELATIVE_PATH);
  await writeFile(matrixPath, raw, 'utf8');
  const before = await readFile(matrixPath);
  const statBefore = await stat(matrixPath);

  // The file-unmodified check is asserted before the throw check, deliberately:
  // if the round-trip guard were bypassed, the stale hash makes the script
  // reach the write at the end of a normal (non-throwing) return, so a
  // `.rejects` assertion evaluated first would abort the test right there and
  // never reach the file check at all — silently no-op'ing the very assertion
  // this test exists to strengthen (QA-215-1).
  let caught;
  try {
    await repinSourceMatrix(rootDir);
  } catch (error) {
    caught = error;
  }

  const after = await readFile(matrixPath);
  const statAfter = await stat(matrixPath);
  assert.ok(
    before.equals(after),
    'the guard must prevent the write that the stale hash would otherwise trigger — file bytes must be unchanged'
  );
  assert.equal(statAfter.mtimeMs, statBefore.mtimeMs, 'no write may occur on the fail-closed path');
  assert.ok(caught, 'the round-trip guard must throw');
  assert.match(caught.message, /round-trip|byte-for-byte|formatting/i);

  await rm(rootDir, { recursive: true, force: true });
});

test('fails closed with a clear message when a pinned source path is missing from disk', async () => {
  const rootDir = await makeFixtureRepo([
    { role: 'Orchestrator Agent', loadMode: 'boot', paths: [{ path: 'AGENTS.md', content: 'agents content\n' }] }
  ]);
  await rm(path.join(rootDir, 'AGENTS.md'));

  await assert.rejects(
    () => repinSourceMatrix(rootDir),
    (error) => {
      assert.match(error.message, /AGENTS\.md/);
      return true;
    }
  );

  await rm(rootDir, { recursive: true, force: true });
});

test('the diff on a real change touches only the sha256 field(s) of the changed path', async () => {
  const rootDir = await makeFixtureRepo([
    {
      role: 'Orchestrator Agent',
      loadMode: 'boot',
      paths: [
        { path: 'AGENTS.md', content: 'agents content\n' },
        { path: 'docs/workflow/dynamic-routing.md', content: 'routing content\n' }
      ]
    }
  ]);
  const before = await readFile(path.join(rootDir, MATRIX_RELATIVE_PATH), 'utf8');
  await writeFile(path.join(rootDir, 'AGENTS.md'), 'agents content, edited\n', 'utf8');

  await repinSourceMatrix(rootDir);

  const after = await readFile(path.join(rootDir, MATRIX_RELATIVE_PATH), 'utf8');
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  assert.equal(beforeLines.length, afterLines.length, 'line count must not change');
  const changedLines = beforeLines.filter((line, index) => line !== afterLines[index]);
  assert.equal(changedLines.length, 1, `expected exactly one changed line, got: ${JSON.stringify(changedLines)}`);
  assert.match(changedLines[0], /"sha256"/);

  await rm(rootDir, { recursive: true, force: true });
});

test('a second run after a real change is a true no-op (idempotent after convergence)', async () => {
  const rootDir = await makeFixtureRepo([
    { role: 'Orchestrator Agent', loadMode: 'boot', paths: [{ path: 'AGENTS.md', content: 'old content\n' }] }
  ]);
  await writeFile(path.join(rootDir, 'AGENTS.md'), 'new content\n', 'utf8');

  const first = await repinSourceMatrix(rootDir);
  assert.equal(first.written, true);

  const matrixPath = path.join(rootDir, MATRIX_RELATIVE_PATH);
  const afterFirst = await readFile(matrixPath);
  const statAfterFirst = await stat(matrixPath);

  const second = await repinSourceMatrix(rootDir);
  assert.equal(second.written, false);
  assert.deepEqual(second.changedPaths, []);

  const afterSecond = await readFile(matrixPath);
  const statAfterSecond = await stat(matrixPath);
  assert.ok(afterFirst.equals(afterSecond));
  assert.equal(statAfterFirst.mtimeMs, statAfterSecond.mtimeMs);

  await rm(rootDir, { recursive: true, force: true });
});
