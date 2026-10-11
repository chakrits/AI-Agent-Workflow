import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateSourceMatrix } from '../scripts/lib/context-compatibility-v1.mjs';

const matrix = JSON.parse(await readFile('test/fixtures/context-pack-v1/required-source-matrix.json', 'utf8'));
function coreMatrix() {
  const candidate = structuredClone(matrix);
  candidate.schemaVersion = 'context-source-matrix/v3';
  for (const row of candidate.rows) {
    row.requiredSources = row.requiredSources.filter(({ path: file }) =>
      file !== 'docs/operating-model/SKILL_CATALOG.md' && !file.startsWith('.agents/skills/'));
    row.allowedSkillIds = [];
  }
  return candidate;
}

test('v3 validates with only core source files present', async (t) => {
  const candidate = coreMatrix();
  const root = await mkdtemp(path.join(os.tmpdir(), 'core-matrix-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of new Set(candidate.rows.flatMap((row) => row.requiredSources.map((s) => s.path)))) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await copyFile(file, path.join(root, file));
  }
  assert.deepEqual(await validateSourceMatrix(root, candidate), { valid: true, errors: [] });
  await rm(path.join(root, 'docs/workflow/quality-gates.md'));
  const missing = await validateSourceMatrix(root, candidate);
  assert.equal(missing.valid, false);
  assert.match(missing.errors.join('\n'), /missing source docs\/workflow\/quality-gates.md/);
});

test('current boundary rejects v2 and every non-empty or absent reserved skill field', async () => {
  const old = structuredClone(matrix);
  old.schemaVersion = 'context-source-matrix/v2';
  const result = await validateSourceMatrix(process.cwd(), old);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /unsupported schemaVersion/);
  for (const value of [undefined, null, {}, ['dynamic-workflow']]) {
    const candidate = coreMatrix();
    candidate.rows[0].allowedSkillIds = value;
    const invalid = await validateSourceMatrix(process.cwd(), candidate);
    assert.equal(invalid.valid, false);
    assert.match(invalid.errors.join('\n'), /reserved allowedSkillIds must be empty/);
  }
});

test('v3 retains core order, duplicate-source and invalid-hash rejection', async () => {
  for (const mutate of [
    (row) => row.requiredSources.reverse(),
    (row) => row.requiredSources.push(row.requiredSources[0]),
    (row) => { row.requiredSources[0].sha256 = 'not-a-hash'; },
  ]) {
    const candidate = coreMatrix();
    mutate(candidate.rows[0]);
    const result = await validateSourceMatrix(process.cwd(), candidate);
    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /exact source set mismatch|duplicate source|invalid hash/);
  }
});
