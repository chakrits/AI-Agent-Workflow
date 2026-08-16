import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { computeResultDigest } from '../scripts/lib/context-compatibility.mjs';
import { loadContextPackShadow } from '../scripts/lib/context-shadow-adapter.mjs';

const rootDir = process.cwd();
const readJson = async (file) => JSON.parse(await readFile(path.join(rootDir, file), 'utf8'));
const matrix = await readJson('test/fixtures/context-pack-v1/required-source-matrix.json');
const catalog = await readJson('test/fixtures/context-compatibility-v1.json');

function packFor(role = 'QA Agent', loadMode = 'on-demand') {
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

function legacyRecord() {
  const record = structuredClone(catalog.recordTemplate);
  record.fixtureId = 'CTX-R01';
  record.resultDigest = '0'.repeat(64);
  record.resultDigest = computeResultDigest(record);
  return record;
}

function run(overrides = {}) {
  const input = { legacy: { loaded: false, value: 7 } };
  const result = legacyRecord();
  return {
    input,
    result,
    promise: loadContextPackShadow({
      rootDir,
      matrix,
      pack: packFor(),
      legacyInput: input,
      legacyLoader: (state) => {
        state.legacy.loaded = true;
        return result;
      },
      candidateLoader: ({ legacyResult }) => structuredClone(legacyResult),
      ...overrides,
    }),
  };
}

test('valid pack compares a candidate without changing legacy authority or input state', async () => {
  const { input, result: expectedLegacy, promise } = run({
    candidateLoader: ({ legacyResult, contextPack }) => {
      assert.equal(contextPack.schemaVersion, 'context-pack/v1');
      const candidate = structuredClone(legacyResult);
      candidate.contextManifest[0].approximateTokens = 7;
      candidate.resultDigest = computeResultDigest(candidate);
      return candidate;
    },
    measurementId: 'measurement-001',
    pairId: 'pair-001',
  });
  const outcome = await promise;

  assert.equal(outcome.status, 'compared');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.mutationAttempted, false);
  assert.deepEqual(outcome.result, expectedLegacy);
  assert.equal(outcome.comparison.compatible, true);
  assert.equal(outcome.evidence.contextLoaded.measurementId, 'measurement-001');
  assert.equal(outcome.evidence.shadowCompared.pairId, 'pair-001');
  assert.equal(outcome.evidence.contextLoaded.token_measurement_status, 'unsupported');
  assert.equal('approximate_tokens' in outcome.evidence.contextLoaded, false);
  assert.deepEqual(input, { legacy: { loaded: false, value: 7 } });
});

test('stale, missing, and duplicate sources fail closed to the unchanged legacy result', async () => {
  const valid = packFor();
  const cases = [
    ['stale source', { ...valid, sources: valid.sources.map((source, index) => index === 0 ? { ...source, sha256: '0'.repeat(64) } : source) }],
    ['missing source', { ...valid, sources: valid.sources.slice(1) }],
    ['duplicate source', { ...valid, sources: [...valid.sources, valid.sources[0]] }],
  ];

  for (const [label, pack] of cases) {
    const { input, result: expectedLegacy, promise } = run({ pack });
    const outcome = await promise;
    assert.equal(outcome.status, 'fallback', label);
    assert.equal(outcome.authority, 'legacy', label);
    assert.equal(outcome.mutationAttempted, false, label);
    assert.deepEqual(outcome.result, expectedLegacy, label);
    assert.match(outcome.evidence.reason, /context pack|source/i, label);
    assert.deepEqual(input, { legacy: { loaded: false, value: 7 } }, label);
  }
});

test('malformed packs fail closed without invoking the candidate loader', async () => {
  let candidateCalled = false;
  const { promise } = run({
    pack: null,
    candidateLoader: () => {
      candidateCalled = true;
      return legacyRecord();
    },
  });
  const outcome = await promise;

  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(candidateCalled, false);
  assert.match(outcome.evidence.errors.join('\n'), /context pack|schemaVersion/i);
});

test('a pack with a source-level fallback records the reason and keeps legacy authoritative', async () => {
  const pack = packFor();
  pack.fallbackReason = 'role skill unavailable';
  pack.sources[pack.sources.length - 1] = {
    ...pack.sources.at(-1),
    loadResult: 'fallback',
    fallbackReason: 'role skill unavailable',
  };
  let candidateCalled = false;
  const { promise } = run({
    pack,
    candidateLoader: () => {
      candidateCalled = true;
      return legacyRecord();
    },
  });
  const outcome = await promise;

  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(candidateCalled, false);
  assert.equal(outcome.evidence.stage, 'pack-load');
  assert.match(outcome.evidence.reason, /role skill unavailable/);
});

test('unknown role and skill matrix entries fail closed before candidate loading', async () => {
  const unknownRole = run({ pack: { ...packFor(), role: 'Unknown Agent' } });
  const unknownRoleOutcome = await unknownRole.promise;
  assert.equal(unknownRoleOutcome.status, 'fallback');
  assert.match(unknownRoleOutcome.evidence.errors.join('\n'), /unknown role/i);

  const invalidMatrix = structuredClone(matrix);
  const row = invalidMatrix.rows.find((candidate) => candidate.role === 'QA Agent' && candidate.loadMode === 'on-demand');
  row.allowedSkillIds = ['unknown-skill'];
  let candidateCalled = false;
  const unknownSkill = run({
    matrix: invalidMatrix,
    candidateLoader: () => {
      candidateCalled = true;
      return legacyRecord();
    },
  });
  const unknownSkillOutcome = await unknownSkill.promise;
  assert.equal(unknownSkillOutcome.status, 'fallback');
  assert.match(unknownSkillOutcome.evidence.errors.join('\n'), /skill|source matrix/i);
  assert.equal(candidateCalled, false);
});

test('comparator and JCS errors fail closed with owner-visible evidence', async () => {
  const comparator = run({
    compare: () => {
      throw new Error('comparator exploded');
    },
  });
  const comparatorOutcome = await comparator.promise;
  assert.equal(comparatorOutcome.status, 'fallback');
  assert.equal(comparatorOutcome.evidence.stage, 'comparison');
  assert.match(comparatorOutcome.evidence.reason, /comparator exploded/);

  const jcs = run({ pack: { ...packFor(), packId: 'x'.repeat(70_000) } });
  const jcsOutcome = await jcs.promise;
  assert.equal(jcsOutcome.status, 'fallback');
  assert.equal(jcsOutcome.evidence.stage, 'evidence');
  assert.match(jcsOutcome.evidence.reason, /canonical|size/i);
});

test('candidate mutation attempts cannot mutate the legacy result or authorize candidate output', async () => {
  const { result: expectedLegacy, promise } = run({
    candidateLoader: ({ legacyResult, contextPack }) => {
      legacyResult.nextOwner = 'Candidate Agent';
      contextPack.authority = 'candidate';
      return legacyResult;
    },
  });
  const outcome = await promise;

  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.mutationAttempted, false);
  assert.deepEqual(outcome.result, expectedLegacy);
  assert.match(outcome.evidence.reason, /authority|canonical|comparator/i);
});
