import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  canonicalSerialize,
  compareCriticalRecords,
  computeResultDigest,
  validateContextManifest,
} from '../scripts/lib/context-compatibility.mjs';

const fixtureCatalog = JSON.parse(await readFile(
  new URL('./fixtures/context-compatibility-v1.json', import.meta.url),
  'utf8',
));

function record(overrides = {}) {
  return {
    contractVersion: 'context-compatibility/v1',
    fixtureId: 'CTX-R01',
    slice: 'context',
    changeType: 'Feature',
    risk: 'Low',
    workflow: ['BA', 'Developer', 'QA'],
    roles: ['BA Agent', 'Developer Agent', 'QA Agent'],
    skills: ['ba-requirement-analysis', 'tdd-implementation'],
    artifacts: ['requirement', 'implementation'],
    gates: ['specification-readiness', 'dev-to-qa'],
    lifecyclePhase: 'phase:development',
    nextOwner: 'Developer Agent',
    stopBackwardReworkResult: 'continue',
    dispatchMandatoryFields: { WorkItem: true, NextOwner: 'Developer Agent' },
    acknowledgement: { state: 'acknowledged', evidenceId: 'ack-1' },
    terminalConsumption: { state: 'pending', evidenceId: null, outcome: 'not-consumed' },
    statusSet: ['status:spec-ready'],
    projectionDigest: null,
    contextManifest: [
      {
        source: 'AGENTS.md',
        sourceHash: 'a'.repeat(64),
        approximateTokens: 120,
        triggerReason: 'boot',
        loadResult: 'loaded',
      },
    ],
    authority: 'legacy',
    mutationAttempted: false,
    ...overrides,
  };
}

test('fixture catalog freezes exactly 36 unique IDs in the 12/10/8/6 split', () => {
  assert.equal(fixtureCatalog.contractVersion, 'context-compatibility/v1');
  const groupCounts = Object.groupBy(fixtureCatalog.fixtures, ({ group }) => group);
  assert.deepEqual(
    Object.fromEntries(Object.entries(groupCounts).map(([group, fixtures]) => [group, fixtures.length])),
    { routing: 12, dispatch: 10, stopBackwardRework: 8, fallbackError: 6 },
  );
  const ids = fixtureCatalog.fixtures.map(({ id }) => id);
  assert.equal(ids.length, 36);
  assert.equal(new Set(ids).size, 36);
  assert.ok(fixtureCatalog.fixtures.every(({ inputFocus, expectedResult }) => inputFocus && expectedResult));
  assert.deepEqual(ids, [
    ...Array.from({ length: 12 }, (_, index) => `CTX-R${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 10 }, (_, index) => `CTX-D${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 8 }, (_, index) => `CTX-S${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 6 }, (_, index) => `CTX-E${String(index + 1).padStart(2, '0')}`),
  ]);
});

test('canonical serialization sorts nested object keys without changing array order', () => {
  const input = { z: 1, a: { y: 2, x: 3 }, list: [{ b: 1, a: 2 }, 'x'] };
  const before = structuredClone(input);
  assert.equal(canonicalSerialize(input), '{"a":{"x":3,"y":2},"list":[{"a":2,"b":1},"x"],"z":1}');
  assert.deepEqual(input, before);
});

test('result digest is SHA-256 over the canonical record excluding resultDigest', () => {
  const input = record({ resultDigest: 'must-not-affect-digest' });
  const before = structuredClone(input);
  assert.equal(computeResultDigest(input), '23f6db5377932f58e2ac7f6b06d3eaad0dbcf911033301e785be104940fb7b16');
  assert.equal(computeResultDigest({ ...input, resultDigest: 'different' }), computeResultDigest(input));
  assert.deepEqual(input, before);
});

test('critical comparison ignores only contextManifest approximateTokens', () => {
  const full = record();
  const progressive = structuredClone(full);
  progressive.contextManifest[0].approximateTokens = 7;
  assert.deepEqual(compareCriticalRecords(full, progressive), { compatible: true, differences: [] });

  progressive.nextOwner = 'QA Agent';
  const comparison = compareCriticalRecords(full, progressive);
  assert.equal(comparison.compatible, false);
  assert.deepEqual(comparison.differences, ['nextOwner']);
});

test('critical comparison reports nested manifest divergence and does not mutate records', () => {
  const full = record();
  const progressive = structuredClone(full);
  progressive.contextManifest[0].loadResult = 'fallback';
  const before = [structuredClone(full), structuredClone(progressive)];
  assert.deepEqual(compareCriticalRecords(full, progressive), {
    compatible: false,
    differences: ['contextManifest[0].loadResult'],
  });
  assert.deepEqual([full, progressive], before);
});

test('manifest validation accepts exact source coverage without mutating inputs', () => {
  const manifest = record().contextManifest;
  const expectedSources = [{ source: 'AGENTS.md', sourceHash: 'a'.repeat(64) }];
  const before = [structuredClone(manifest), structuredClone(expectedSources)];
  assert.deepEqual(validateContextManifest(manifest, expectedSources), { valid: true, errors: [] });
  assert.deepEqual([manifest, expectedSources], before);
});

test('manifest validation fails closed for duplicate, missing, unknown, and stale sources', () => {
  const valid = record().contextManifest[0];
  const expected = [
    { source: 'AGENTS.md', sourceHash: 'a'.repeat(64) },
    { source: 'docs/workflow/dynamic-routing.md', sourceHash: 'b'.repeat(64) },
  ];
  const cases = [
    [[valid, { ...valid }], /duplicate source: AGENTS\.md/],
    [[valid], /missing source: docs\/workflow\/dynamic-routing\.md/],
    [[valid, { ...valid, source: 'UNKNOWN.md' }], /unknown source: UNKNOWN\.md/],
    [[valid, { ...valid, source: expected[1].source, sourceHash: 'c'.repeat(64) }], /stale source: docs\/workflow\/dynamic-routing\.md/],
  ];

  for (const [manifest, expectedError] of cases) {
    const result = validateContextManifest(manifest, expected);
    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), expectedError);
  }
});
