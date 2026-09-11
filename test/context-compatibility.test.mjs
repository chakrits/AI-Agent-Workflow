import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  canonicalSerialize,
  compareCriticalRecords,
  computeResultDigest,
  executeCompatibilityFixture,
  validateContextManifest,
} from '../scripts/lib/context-compatibility.mjs';

const fixtureCatalog = JSON.parse(await readFile(
  new URL('./fixtures/context-compatibility-v1.json', import.meta.url),
  'utf8',
));

const REQUIRED_DISPATCH_HANDOFF_FIELDS = [
  'Packet', 'Role', 'Repo state', 'Objective', 'Authoritative source', 'Scope', 'Verify',
  'Return', 'Fallback', 'From Agent', 'To Agent', 'Work Item', 'Work Item URL',
  'Change Request URL', 'Change Type', 'Risk Level', 'Lifecycle Phase',
  'Specification Readiness', 'Current Stage', 'Task State', 'Contract Version',
  'Rework Count', 'Completed Work', 'Artifacts Produced', 'Files Changed',
  'Verification Performed', 'Evidence References', 'Acceptance Criteria Verification Status',
  'Acceptance Traceability Matrix URL', 'Reviewed Candidate SHA', 'Handoff Record Commit SHA',
  'Platform Activation Record URL / Status', 'QA Evidence URL', 'Stop Reason',
  'Known Limitations', 'Open Questions', 'QA / Review Focus', 'Recommended Next Step',
  'Next Action', 'Next Owner', 'Orchestration Turn ID', 'Boss Event Required',
  'Dispatch State', 'Source Agent', 'Target Agent', 'Dispatch Result',
  'Acknowledgement Evidence', 'Boss Event', 'Handoff Event ID', 'Parent Orchestrator ID',
  'Child Task ID', 'Terminal Result ID', 'Completion Event Evidence', 'Consumption Evidence',
  'Timeout / Cancellation Reason',
];

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
    resultDigest: '0'.repeat(64),
    ...overrides,
  };
}

function validRecord(value = record()) {
  value.resultDigest = computeResultDigest(value);
  return value;
}

test('fixture catalog executes 36 pinned full/progressive normalized record pairs', () => {
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

  for (const fixture of fixtureCatalog.fixtures) {
    assert.ok(Object.keys(fixture.scenario.input.assertions).length > 0, `${fixture.id} assertions`);
    assert.deepEqual(
      executeCompatibilityFixture(fixture, fixtureCatalog.recordTemplate),
      fixture.expectedExecution,
      fixture.id,
    );
  }
});

test('reviewer repro fixtures execute concrete failure and event semantics', () => {
  const execute = (id) => {
    const fixture = fixtureCatalog.fixtures.find((candidate) => candidate.id === id);
    return executeCompatibilityFixture(fixture, fixtureCatalog.recordTemplate);
  };

  assert.deepEqual(execute('CTX-D02').fieldValidation.progressive, {
    valid: false,
    errors: ['missing dispatch/handoff field: Scope'],
  });
  const terminalPass = fixtureCatalog.fixtures.find(({ id }) => id === 'CTX-D05');
  const terminalFields = terminalPass.scenario.input.assertions.dispatchMandatoryFields;
  assert.deepEqual(terminalFields['Dispatch Result'], { successorCount: 1, redispatchCount: 0 });
  assert.deepEqual(terminalFields['Boss Event'], { count: 1 });
  assert.deepEqual(terminalFields['Completion Event Evidence'], { count: 1 });
  assert.deepEqual(execute('CTX-D05').comparison, { compatible: true, differences: [] });
  assert.deepEqual(execute('CTX-E03').manifestValidation.errors, ['stale source: AGENTS.md']);
  assert.deepEqual(execute('CTX-E05').manifestValidation.errors, [
    'duplicate source: AGENTS.md',
    'malformed manifest entry at index 2',
  ]);
});

test('dispatch fixtures use the exact canonical field set and numeric side-effect evidence', () => {
  const dispatchFixtures = fixtureCatalog.fixtures.filter(({ id }) => id.startsWith('CTX-D'));
  assert.equal(dispatchFixtures.length, 10);
  for (const fixture of dispatchFixtures) {
    const record = { ...structuredClone(fixtureCatalog.recordTemplate), ...structuredClone(fixture.full) };
    assert.deepEqual(
      Object.keys(record.dispatchMandatoryFields).sort(),
      [...REQUIRED_DISPATCH_HANDOFF_FIELDS].sort(),
      `${fixture.id} canonical dispatch/handoff fields`,
    );
  }

  const fields = (id) => {
    const fixture = dispatchFixtures.find((candidate) => candidate.id === id);
    return { ...fixtureCatalog.recordTemplate.dispatchMandatoryFields, ...fixture.full.dispatchMandatoryFields };
  };
  assert.deepEqual(fields('CTX-D06')['Dispatch Result'], { successorCount: 0, redispatchCount: 0 });
  assert.deepEqual(fields('CTX-D09')['Dispatch Result'], { successorCount: 0, redispatchCount: 0 });
  assert.deepEqual(fields('CTX-D10')['Dispatch Result'], { successorCount: 0, redispatchCount: 0 });
  assert.deepEqual(fields('CTX-D09')['Boss Event'], { count: 0 });
  assert.deepEqual(fields('CTX-D10')['Completion Event Evidence'], { count: 0 });
});

test('CTX-D06 preserves its exact blocked reason, owner, and side-effect counts', () => {
  const fixture = fixtureCatalog.fixtures.find(({ id }) => id === 'CTX-D06');
  const assertions = fixture.scenario.input.assertions;
  assert.equal(assertions.stopBackwardReworkResult, 'blocked');
  assert.equal(assertions.nextOwner, 'Human Maintainer');
  assert.equal(assertions.dispatchMandatoryFields['Stop Reason'], 'terminal_result_blocked');
  assert.deepEqual(assertions.dispatchMandatoryFields['Dispatch Result'], {
    successorCount: 0,
    redispatchCount: 0,
  });
  assert.deepEqual(assertions.dispatchMandatoryFields['Boss Event'], { count: 1 });
  assert.deepEqual(assertions.dispatchMandatoryFields['Completion Event Evidence'], { count: 1 });
  assert.deepEqual(assertions.dispatchMandatoryFields['Consumption Evidence'], { count: 1 });
  assert.deepEqual(
    executeCompatibilityFixture(fixture, fixtureCatalog.recordTemplate),
    fixture.expectedExecution,
  );
});

test('canonical serialization sorts nested object keys without changing array order', () => {
  const input = { z: 1, a: { y: 2, x: 3 }, list: [{ b: 1, a: 2 }, 'x'] };
  const before = structuredClone(input);
  assert.equal(canonicalSerialize(input), '{"a":{"x":3,"y":2},"list":[{"a":2,"b":1},"x"],"z":1}');
  assert.deepEqual(input, before);
});

test('result digest is SHA-256 over the canonical record excluding resultDigest', () => {
  const input = record();
  const before = structuredClone(input);
  assert.equal(computeResultDigest(input), '23f6db5377932f58e2ac7f6b06d3eaad0dbcf911033301e785be104940fb7b16');
  assert.equal(computeResultDigest({ ...input, resultDigest: '1'.repeat(64) }), computeResultDigest(input));
  assert.deepEqual(input, before);
});

test('comparison fails closed when either normalized record has a forged or stale digest', () => {
  const valid = record();
  valid.resultDigest = computeResultDigest(valid);
  const forged = structuredClone(valid);
  forged.resultDigest = 'f'.repeat(64);
  const stale = structuredClone(valid);
  stale.nextOwner = 'QA Agent';

  assert.throws(() => compareCriticalRecords(forged, valid), /resultDigest.*canonical bytes/i);
  assert.throws(() => compareCriticalRecords(valid, stale), /resultDigest.*canonical bytes/i);
});

test('critical comparison ignores only contextManifest approximateTokens', () => {
  const full = validRecord();
  const progressive = structuredClone(full);
  progressive.contextManifest[0].approximateTokens = 7;
  progressive.resultDigest = computeResultDigest(progressive);
  assert.deepEqual(compareCriticalRecords(full, progressive), { compatible: true, differences: [] });

  progressive.nextOwner = 'QA Agent';
  progressive.resultDigest = computeResultDigest(progressive);
  const comparison = compareCriticalRecords(full, progressive);
  assert.equal(comparison.compatible, false);
  assert.deepEqual(comparison.differences, ['nextOwner']);
});

test('critical comparison reports nested manifest divergence and does not mutate records', () => {
  const full = validRecord();
  const progressive = structuredClone(full);
  progressive.contextManifest[0].loadResult = 'fallback';
  progressive.resultDigest = computeResultDigest(progressive);
  const before = [structuredClone(full), structuredClone(progressive)];
  assert.deepEqual(compareCriticalRecords(full, progressive), {
    compatible: false,
    differences: ['contextManifest[0].loadResult'],
  });
  assert.deepEqual([full, progressive], before);
});

test('digest and comparison reject incomplete normalized records with comparator errors', () => {
  assert.throws(
    () => computeResultDigest({ contractVersion: 'context-compatibility/v1' }),
    /normalized record.*missing required field/i,
  );
  assert.throws(
    () => compareCriticalRecords(validRecord(), { contractVersion: 'context-compatibility/v1' }),
    /normalized record.*missing required field/i,
  );
});

test('digest and comparison reject undefined and non-JSON normalized values explicitly', () => {
  for (const ambiguous of [undefined, () => 'not JSON', Number.NaN, 1n]) {
    const invalid = record({ nextOwner: ambiguous });
    assert.throws(() => computeResultDigest(invalid), /normalized record.*JSON/i);
    assert.throws(() => compareCriticalRecords(validRecord(), invalid), /normalized record.*JSON/i);
  }
});

test('digest rejects JSON values that violate the normalized record shape', () => {
  for (const invalid of [
    record({ contractVersion: 'context-compatibility/v2' }),
    record({ slice: 'status' }),
    record({ workflow: 'Developer' }),
    record({ dispatchMandatoryFields: [] }),
    record({ projectionDigest: 7 }),
    record({ authority: 'progressive' }),
    record({ mutationAttempted: true }),
  ]) {
    assert.throws(() => computeResultDigest(invalid), /normalized record comparator error/i);
  }
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

test('manifest validation returns structured invalid results for malformed inputs', () => {
  const expected = [{ source: 'AGENTS.md', sourceHash: 'a'.repeat(64) }];
  const malformed = [
    null,
    {},
    [null],
    [{}],
    [{ source: 7, sourceHash: 'bad' }],
    [{ source: 'AGENTS.md', sourceHash: 'a'.repeat(64) }],
  ];
  for (const manifest of malformed) {
    const result = validateContextManifest(manifest, expected);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

test('manifest validation rejects duplicate expected sources, including conflicting hashes', () => {
  const manifest = record().contextManifest;
  for (const expectedSources of [
    [
      { source: 'AGENTS.md', sourceHash: 'a'.repeat(64) },
      { source: 'AGENTS.md', sourceHash: 'a'.repeat(64) },
    ],
    [
      { source: 'AGENTS.md', sourceHash: 'a'.repeat(64) },
      { source: 'AGENTS.md', sourceHash: 'b'.repeat(64) },
    ],
  ]) {
    const result = validateContextManifest(manifest, expectedSources);
    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /duplicate expected source: AGENTS\.md/);
  }
});
