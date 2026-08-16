import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  contextEvidenceForPack,
  validateContextPack,
  validateCorpusManifest,
  validateFirstActionBoundary,
  validatePairEvidence,
  validateSourceMatrix,
} from '../scripts/lib/context-compatibility-v1.mjs';
import { canonicalizeJcs, digestJcs } from '../scripts/lib/status-jcs.mjs';

const rootDir = process.cwd();
const readJson = async (file) => JSON.parse(await readFile(path.join(rootDir, file), 'utf8'));
const manifest = await readJson('test/fixtures/context-compatibility-v1.manifest.json');
const fixture = await readJson('test/fixtures/context-compatibility-v1.json');
const matrix = await readJson('test/fixtures/context-pack-v1/required-source-matrix.json');
const vectors = await readJson('test/fixtures/context-pack-v1/vectors.json');

function packFor(role, loadMode) {
  const row = matrix.rows.find((candidate) => candidate.role === role && candidate.loadMode === loadMode);
  return {
    schemaVersion: 'context-pack/v1',
    packId: `pack-${role.toLowerCase().replaceAll(' ', '-')}-${loadMode}`,
    authority: 'legacy',
    role,
    loadMode,
    measurementStatus: 'unsupported',
    fallbackReason: null,
    sources: row.requiredSources.map(({ path: sourcePath, sha256 }) => ({
      path: sourcePath,
      sha256,
      triggerReason: loadMode === 'boot' ? 'boot' : 'role-selected',
      loadResult: 'loaded',
      fallbackReason: null,
    })),
  };
}

test('corpus manifest pins the real 36-case fixture and exact byte hash', async () => {
  assert.deepEqual(await validateCorpusManifest(rootDir, manifest, fixture), { valid: true, errors: [] });
});

test('corpus manifest rejects stale hash, count, group, and source commit', async () => {
  for (const mutation of [
    { fixtureSha256: '0'.repeat(64) },
    { fixtureCount: 35 },
    { groupCounts: { ...manifest.groupCounts, routing: 11 } },
    { sourceCommit: '0'.repeat(40) },
  ]) {
    const result = await validateCorpusManifest(rootDir, { ...manifest, ...mutation }, fixture);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

test('pair evidence keeps invalid identity/digest/first-action observations in the denominator', () => {
  const valid = {
    pairId: 'pair-1', fixtureId: 'CTX-R01', inputDigest: 'a'.repeat(64),
    legacyResultDigest: 'b'.repeat(64), candidateResultDigest: 'c'.repeat(64),
    modelIdentity: 'N/A', modelIdentityReason: 'host did not expose model',
    configurationDigest: 'd'.repeat(64), measurementId: 'measurement-1',
    hostId: 'host-1', firstActionBoundary: 'compared-before-action',
  };
  assert.deepEqual(validatePairEvidence([valid]), { valid: true, errors: [] });
  const invalid = { ...valid, pairId: 'pair-2', candidateResultDigest: 'bad', firstActionBoundary: 'N/A' };
  const result = validatePairEvidence([valid, invalid, { ...valid, pairId: 'pair-2' }]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /invalid candidateResultDigest|firstActionBoundary N\/A requires|duplicate pairId/);
});

test('context-pack/v1 accepts exact boot and cumulative on-demand rows', async () => {
  assert.deepEqual(await validateSourceMatrix(rootDir, matrix), { valid: true, errors: [] });
  assert.deepEqual(await validateContextPack(rootDir, packFor('QA Agent', 'boot'), matrix), { valid: true, errors: [] });
  assert.deepEqual(await validateContextPack(rootDir, packFor('QA Agent', 'on-demand'), matrix), { valid: true, errors: [] });
});

test('source matrix rejects duplicate rows and stale source hashes', async () => {
  const duplicate = { ...matrix, rows: [...matrix.rows, matrix.rows[0]] };
  assert.equal((await validateSourceMatrix(rootDir, duplicate)).valid, false);
  const stale = structuredClone(matrix);
  stale.rows[0].requiredSources[0].sha256 = '0'.repeat(64);
  assert.equal((await validateSourceMatrix(rootDir, stale)).valid, false);
});

test('source matrix rejects arbitrary paths, skill/path swaps, and row-set drift', async () => {
  const arbitraryPath = structuredClone(matrix);
  const orchestrator = arbitraryPath.rows.find((row) => row.role === 'Orchestrator Agent' && row.loadMode === 'on-demand');
  orchestrator.requiredSources.push({ path: 'CHANGELOG.md', sha256: '0'.repeat(64) });
  const arbitraryResult = await validateSourceMatrix(rootDir, arbitraryPath);
  assert.equal(arbitraryResult.valid, false);
  assert.match(arbitraryResult.errors.join('\n'), /unknown source path|exact source set mismatch/);

  const skillSwap = structuredClone(matrix);
  const developer = skillSwap.rows.find((row) => row.role === 'Developer Agent' && row.loadMode === 'on-demand');
  developer.allowedSkillIds = ['static-logic-review'];
  const skillSwapResult = await validateSourceMatrix(rootDir, skillSwap);
  assert.equal(skillSwapResult.valid, false);
  assert.match(skillSwapResult.errors.join('\n'), /skill set mismatch|skill\/path mismatch/);

  const rowDrift = structuredClone(matrix);
  const qa = rowDrift.rows.find((row) => row.role === 'QA Agent' && row.loadMode === 'on-demand');
  qa.requiredSources = qa.requiredSources.filter(({ path: sourcePath }) => !sourcePath.endsWith('/SKILL.md'));
  const rowDriftResult = await validateSourceMatrix(rootDir, rowDrift);
  assert.equal(rowDriftResult.valid, false);
  assert.match(rowDriftResult.errors.join('\n'), /exact source set mismatch/);
});

test('context-pack/v1 fails closed for authority, source-set, stale-hash, and fallback errors', async () => {
  const valid = packFor('SA Agent', 'on-demand');
  const cases = [
    { ...valid, authority: 'candidate' },
    { ...valid, sources: valid.sources.slice(1) },
    { ...valid, sources: valid.sources.map((source, index) => index === 0 ? { ...source, sha256: '0'.repeat(64) } : source) },
    { ...valid, sources: valid.sources.map((source, index) => index === 0 ? { ...source, loadResult: 'fallback' } : source) },
  ];
  for (const candidate of cases) {
    const result = await validateContextPack(rootDir, candidate, matrix);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

test('boot context cannot authorize a first action and legacy remains the authority', () => {
  assert.deepEqual(validateFirstActionBoundary({ loadMode: 'boot', firstActionObserved: true }), {
    valid: false,
    errors: ['first action requires cumulative on-demand comparison'],
  });
  assert.deepEqual(validateFirstActionBoundary({ loadMode: 'on-demand', firstActionObserved: true }), { valid: true, errors: [] });
});

test('JCS vectors and evidence identity mapping are deterministic', () => {
  for (const vector of vectors.positive) {
    assert.equal(Buffer.from(canonicalizeJcs(vector.value)).toString('utf8'), vector.canonicalUtf8, vector.id);
    assert.equal(digestJcs(vector.value), vector.digest, vector.id);
  }
  const pack = packFor('Documentation Agent', 'boot');
  const evidence = contextEvidenceForPack(pack);
  assert.equal(evidence.source_manifest_digest, digestJcs(pack));
  assert.equal(evidence.token_measurement_status, 'unsupported');
  assert.equal(evidence.packId, pack.packId);
  assert.equal(evidence.measurementId, null);
  assert.notEqual(evidence.packId, 'measurement-1');
});
