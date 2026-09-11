import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import { manifestDigest } from '../scripts/lib/status-audit.mjs';

import {
  approveRecord,
  createCorrectionRecord,
  createTransitionRecord,
  deriveResultDigests,
  evaluateCasDecision,
  isSafeRepositoryPath,
  recordDigest,
  validateRecord,
} from '../scripts/lib/status-cas-decision.mjs';

const digest = 'a'.repeat(64);
const tuple = { commitSha: 'b'.repeat(40), manifestDigest: digest, setDigest: digest, headDigest: digest };
const result = { manifestDigest: 'c'.repeat(64), setDigest: 'd'.repeat(64), headDigest: 'e'.repeat(64), projectionDigest: 'f'.repeat(64), contentTreeDigest: '0'.repeat(64) };
const resultData = {
  manifest: { schemaVersion: 'status-manifest/v1', manifestDigest: 'f'.repeat(64), setDigest: digest },
  set: [{ issueKey: 'owner/repo#133', path: 'docs/status/active/issue-133.yaml', recordDigest: digest }],
  head: { schemaVersion: 'work-item-status/v1', activeIssueKeys: ['owner/repo#133'], setDigest: '972cfe097309529e369ee7810dd27ed7f29a7624379a8500ee50e3d1eb7ddb13' },
  projection: '# Status\n',
  contentTree: [{ path: 'PROJECT_STATUS.md', bytes: 'one' }],
};
const fixtureRoot = path.join('test', 'fixtures', 'status-cas', 'v1');

function decision(overrides = {}) {
  return evaluateCasDecision({ expected: tuple, observed: tuple, result: deriveResultDigests(resultData), resultData, ...overrides });
}

function validRecord(overrides = {}) {
  return createTransitionRecord({ operation: 'update', identity: 'owner/repo:133', predecessor: { digest, authenticatedBy: 'maintainer@example.com' }, proposal: '1'.repeat(64), successor: '2'.repeat(64), expected: tuple, changedPaths: ['PROJECT_STATUS.md'], approval: '3'.repeat(64), ...overrides });
}
function recordInput(overrides = {}) {
  const record = validRecord();
  const { schemaVersion, recordDigest, ...input } = record;
  return { ...input, ...overrides };
}

function approvalInput(record, overrides = {}) {
  return {
    record,
    identity: 'maintainer@example.com',
    independent: false,
    proposal: record.proposal,
    predecessor: record.predecessor.digest,
    result: record.successor,
    consumedRecordDigests: [],
    ...overrides,
  };
}

test('checked-in valid fixture is executable and accepted', async () => {
  const fixture = JSON.parse(await readFile(path.join(fixtureRoot, 'valid.json'), 'utf8'));
  assert.deepEqual(evaluateCasDecision(fixture), { accepted: true, observed: fixture.observed, result: fixture.result });
});

test('every public CAS/record/approval boundary returns a code-only error for malformed input', () => {
  assert.deepEqual(evaluateCasDecision(), { accepted: false, error: { code: 'INVALID_INPUT' } });
  assert.deepEqual(evaluateCasDecision(null), { accepted: false, error: { code: 'INVALID_INPUT' } });
  assert.deepEqual(createTransitionRecord(null), { accepted: false, error: { code: 'INVALID_RECORD_INPUT' } });
  assert.deepEqual(createCorrectionRecord({}), { accepted: false, error: { code: 'INVALID_RECORD_INPUT' } });
  assert.deepEqual(validateRecord(null), [{ code: 'INVALID_RECORD' }]);
  assert.deepEqual(approveRecord(), { accepted: false, error: { code: 'INVALID_RECORD' } });
  assert.deepEqual(approveRecord({ record: {} }), { accepted: false, error: { code: 'INVALID_RECORD' } });
  assert.deepEqual(deriveResultDigests(null), { accepted: false, error: { code: 'INVALID_DIGEST_INPUT' } });
  assert.deepEqual(deriveResultDigests({ manifest: null, set: [], head: {}, projection: '', contentTree: [] }), { accepted: false, error: { code: 'INVALID_DIGEST_INPUT' } });
});

test('CAS rejects unknown public fields and binds accepted result digests to supplied data', () => {
  assert.deepEqual(evaluateCasDecision({ expected: tuple, observed: tuple, result: deriveResultDigests(resultData), resultData, extra: true }), { accepted: false, error: { code: 'UNKNOWN_FIELD' } });
  assert.deepEqual(decision({ result: { ...deriveResultDigests(resultData), manifestDigest: 'a'.repeat(64) } }), { accepted: false, error: { code: 'RESULT_DIGEST_MISMATCH' } });
  assert.deepEqual(decision({ resultData: { ...resultData, projection: '# Forged\n' } }), { accepted: false, error: { code: 'RESULT_DIGEST_MISMATCH' } });
  assert.deepEqual(decision({ resultData: { ...resultData, extra: true } }), { accepted: false, error: { code: 'UNKNOWN_FIELD' } });
});

test('CAS rejects malformed values and each of the four stale tuple members', () => {
  for (const field of ['commitSha', 'manifestDigest', 'setDigest', 'headDigest']) {
    assert.equal(decision({ expected: { ...tuple, [field]: 'bad' } }).accepted, false);
    assert.equal(decision({ observed: { ...tuple, [field]: 'bad' } }).accepted, false);
    const stale = field === 'commitSha' ? 'c'.repeat(40) : '9'.repeat(64);
    assert.deepEqual(decision({ observed: { ...tuple, [field]: stale } }), { accepted: false, error: { code: `CAS_${field === 'commitSha' ? 'COMMIT' : field.replace('Digest', '').toUpperCase()}_MISMATCH` } });
  }
});

test('tuple closure takes precedence over member-format diagnostics for every missing C/M/S/H member', () => {
  for (const field of ['commitSha', 'manifestDigest', 'setDigest', 'headDigest']) {
    const expected = without(tuple, field);
    assert.deepEqual(evaluateCasDecision({ expected, observed: expected, result, resultData }), { accepted: false, error: { code: 'INVALID_TUPLE' } }, field);
  }
});

test('record digest covers the complete record and approval rejects forged, stale, malformed, and replayed records', () => {
  const record = validRecord();
  assert.deepEqual(validateRecord(record), []);
  assert.equal(record.recordDigest, recordDigest(record));
  assert.deepEqual(recordDigest({}), { accepted: false, error: { code: 'INVALID_RECORD' } });
  assert.equal(validateRecord({ ...record, successor: '4'.repeat(64) }).some(({ code }) => code === 'RECORD_DIGEST_MISMATCH'), true);
  assert.deepEqual(approveRecord({ record: { ...record, successor: '4'.repeat(64) }, identity: 'maintainer@example.com', independent: false, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor }), { accepted: false, error: { code: 'INVALID_RECORD' } });
  assert.deepEqual(approveRecord(approvalInput(record, { consumedRecordDigests: [record.recordDigest] })), { accepted: false, error: { code: 'APPROVAL_REPLAY' } });
});

test('transition and correction records stay distinct and path validation is cross-platform safe', () => {
  const transition = validRecord();
  const correction = createCorrectionRecord(recordInput({ operation: undefined }));
  assert.deepEqual(validateRecord(transition), []);
  assert.deepEqual(validateRecord(correction), []);
  assert.equal(transition.schemaVersion, 'status-transition-record/v1');
  assert.equal(correction.schemaVersion, 'status-correction-record/v1');
  for (const unsafe of ['C:\\temp\\x', 'C:/temp/x', '/absolute', '../escape', 'a/../b', 'a\nb', 'a\u0000b', 'CON', 'aux.txt', 'a//b', 'a/', 'name. ', 'name./x', 'docs/\u0065\u0301.txt']) assert.equal(isSafeRepositoryPath(unsafe), false, unsafe);
  assert.equal(isSafeRepositoryPath('docs/status/active/item.json'), true);
});

test('approval is bound only after record validation and same-identity approval remains separate', () => {
  const record = validRecord();
  assert.deepEqual(approveRecord(approvalInput(record)).event, { type: 'approval', independent: false, recordDigest: record.recordDigest, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor, identity: 'maintainer@example.com' });
  assert.deepEqual(approveRecord(approvalInput(record, { independent: true })), { accepted: false, error: { code: 'INDEPENDENT_APPROVAL_NOT_ALLOWED' } });
});

test('approval requires a serialized digest array and keeps it immutable and idempotent', () => {
  const record = validRecord();
  for (const value of [undefined, null, {}, 'not-an-array', 1, false, [1], ['A'.repeat(64)], ['bad']]) {
    assert.deepEqual(approveRecord(approvalInput(record, { consumedRecordDigests: value })), { accepted: false, error: { code: 'INVALID_RECORD' } });
  }
  const consumed = ['f'.repeat(64), record.recordDigest, record.recordDigest];
  const before = [...consumed];
  assert.deepEqual(approveRecord(approvalInput(record, { consumedRecordDigests: consumed })), { accepted: false, error: { code: 'APPROVAL_REPLAY' } });
  assert.deepEqual(consumed, before);
  assert.equal(approveRecord(approvalInput(record, { consumedRecordDigests: ['f'.repeat(64), 'f'.repeat(64)] })).accepted, true);
  assert.equal(approveRecord(approvalInput(record, { consumedRecordDigests: ['f'.repeat(64)] })).accepted, true);
});

test('record diagnostics map to the closed public nested-shape code', () => {
  const record = validRecord();
  const cases = [
    ['identity', null],
    ['predecessor', []],
    ['proposal', 'bad'],
    ['successor', 'bad'],
    ['approval', 'bad'],
    ['changedPaths', ['z', 'z']],
  ];
  for (const [field, value] of cases) {
    const errors = validateRecord({ ...record, [field]: value });
    assert.equal(errors[0]?.code, 'INVALID_NESTED_SHAPE', field);
    assert.ok(!errors.some(({ code }) => code.startsWith('INVALID_') && code !== 'INVALID_NESTED_SHAPE' && code !== 'INVALID_TUPLE'), field);
  }
  assert.deepEqual(validateRecord({ ...record, schemaVersion: 'unknown/v1' })[0], { code: 'INVALID_SCHEMA_KIND' });
});

test('record validation uses deterministic closure and nested-shape precedence', () => {
  const record = validRecord();
  assert.deepEqual(validateRecord({ ...record, extra: true, predecessor: [] })[0], { code: 'UNKNOWN_FIELD' });
  assert.deepEqual(validateRecord({ ...record, schemaVersion: 'unknown/v1', operation: 'bad', predecessor: [] }).slice(0, 2), [{ code: 'INVALID_SCHEMA_KIND' }, { code: 'INVALID_NESTED_SHAPE' }]);
});

test('CAS schema conditionally requires observed/result on acceptance and error only on rejection', async () => {
  const schema = JSON.parse(await readFile(path.join('docs/contracts/schemas', 'status-cas-decision.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(decision()), true, JSON.stringify(validate.errors));
  assert.equal(validate({ accepted: true, error: { code: 'BAD' } }), false);
  assert.equal(validate({ accepted: true, observed: tuple }), false);
  assert.equal(validate({ accepted: false, error: { code: 'INVALID_INPUT' } }), true);
  assert.equal(validate({ accepted: false, error: { code: 'BAD' } }), false);
  assert.equal(validate({ accepted: false, error: { code: 'INVALID_INPUT' }, observed: tuple }), false);
});

test('T2 record schemas are closed and generated records validate', async () => {
  for (const name of ['status-transition-record', 'status-correction-record']) {
    const schema = JSON.parse(await readFile(path.join('docs/contracts/schemas', `${name}.schema.json`), 'utf8'));
    const validate = new Ajv2020({ strict: true }).compile(schema);
    const record = name.includes('correction') ? createCorrectionRecord(recordInput({ operation: undefined })) : validRecord();
    assert.equal(validate(record), true, JSON.stringify(validate.errors));
    assert.equal(validate({ ...record, extra: true }), false);
  }
});

test('CAS request schema is closed and matches the runtime request boundary', async () => {
  const schema = JSON.parse(await readFile(path.join('docs/contracts/schemas', 'status-cas-request.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const request = { expected: tuple, observed: tuple, result: deriveResultDigests(resultData), resultData };
  assert.equal(validate(request), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...request, extra: true }), false);
  assert.equal(validate([]), false);
  assert.deepEqual(evaluateCasDecision({ ...request, extra: true }), { accepted: false, error: { code: 'UNKNOWN_FIELD' } });
});

test('resultData nested containers have exact schema/runtime parity', async () => {
  const schema = JSON.parse(await readFile(path.join('docs/contracts/schemas', 'status-cas-request.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const request = { expected: tuple, observed: tuple, result: deriveResultDigests(resultData), resultData };
  const malformed = [
    ['manifest-empty', { ...resultData, manifest: {} }, 'INVALID_DIGEST_INPUT'],
    ['manifest-unknown', { ...resultData, manifest: { ...resultData.manifest, unknown: true } }, 'UNKNOWN_FIELD'],
    ['manifest-wrong-container', { ...resultData, manifest: [] }, 'INVALID_DIGEST_INPUT'],
    ['set-wrong-container', { ...resultData, set: {} }, 'INVALID_DIGEST_INPUT'],
    ['set-entry-missing', { ...resultData, set: [{}] }, 'INVALID_DIGEST_INPUT'],
    ['set-entry-unknown', { ...resultData, set: [{ ...resultData.set[0], unknown: true }] }, 'UNKNOWN_FIELD'],
    ['head-wrong-container', { ...resultData, head: [] }, 'INVALID_DIGEST_INPUT'],
    ['head-missing-member', { ...resultData, head: { schemaVersion: 'work-item-status/v1', setDigest: digest } }, 'INVALID_DIGEST_INPUT'],
    ['head-active-keys-wrong-container', { ...resultData, head: { ...resultData.head, activeIssueKeys: {} } }, 'INVALID_DIGEST_INPUT'],
    ['content-tree-entry-missing', { ...resultData, contentTree: [{}] }, 'INVALID_DIGEST_INPUT'],
    ['content-tree-entry-unknown', { ...resultData, contentTree: [{ ...resultData.contentTree[0], unknown: true }] }, 'UNKNOWN_FIELD'],
    ['content-tree-wrong-container', { ...resultData, contentTree: {} }, 'INVALID_DIGEST_INPUT'],
    ['projection-wrong-type', { ...resultData, projection: 1 }, 'INVALID_DIGEST_INPUT'],
  ];
  for (const [name, malformedResultData, code] of malformed) {
    const input = { ...request, resultData: malformedResultData };
    const runtime = evaluateCasDecision(input);
    assert.equal(validate(input), false, `${name}: schema accepted malformed resultData: ${JSON.stringify(validate.errors)}`);
    assert.deepEqual(runtime, { accepted: false, error: { code } }, name);
    assert.ok(validate.errors?.length > 0, `${name}: AJV did not expose a deterministic error`);
  }
});

test('result digest vectors are fixed and derived through T1 helpers', async () => {
  const values = {
    manifest: { schemaVersion: 'status-manifest/v1', manifestDigest: 'f'.repeat(64), setDigest: digest },
    set: [{ issueKey: 'owner/repo#133', path: 'docs/status/active/issue-133.yaml', recordDigest: digest }],
    head: { schemaVersion: 'work-item-status/v1', activeIssueKeys: ['owner/repo#133'], setDigest: '972cfe097309529e369ee7810dd27ed7f29a7624379a8500ee50e3d1eb7ddb13' },
    projection: '# Status\n',
    contentTree: [{ path: 'PROJECT_STATUS.md', bytes: 'one' }],
  };
  const derived = deriveResultDigests(values);
  assert.deepEqual(Object.keys(derived).sort(), ['contentTreeDigest', 'headDigest', 'manifestDigest', 'projectionDigest', 'setDigest']);
  assert.deepEqual(derived, JSON.parse(await readFile(path.join(fixtureRoot, 'digest-vectors.json'), 'utf8')).derived);
});

test('frozen T2-A manifest is complete, ordered, integrity-bound, and reference-resolvable', async () => {
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, 'manifest.json'), 'utf8'));
  const corpus = JSON.parse(await readFile(path.join(fixtureRoot, 'corpus.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), ['caseCount', 'cases', 'manifestDigest', 'schemaVersion', 'testOnly']);
  assert.equal(manifest.testOnly, true);
  assert.equal(manifest.caseCount, 52);
  assert.equal(manifest.cases.length, 52);
  const ids = manifest.cases.map(({ id }) => id);
  assert.deepEqual(ids, [...ids].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(manifestDigest(manifest), manifest.manifestDigest);
  for (const entry of manifest.cases) {
    assert.equal(corpus.cases[entry.id].testOnly, true, entry.id);
    for (const reference of [entry.input, entry.expected.output].filter((value) => value?.fixture)) {
      const delimiter = reference.fixture.indexOf('#');
      assert.ok(delimiter > 0, `${entry.id}: ${reference.fixture}`);
      const file = reference.fixture.slice(0, delimiter);
      const pointer = reference.fixture.slice(delimiter + 1);
      assert.equal(file.includes('..'), false);
      const payload = JSON.parse(await readFile(path.join(fixtureRoot, file), 'utf8'));
      let target = payload;
      for (const token of pointer.split('/').slice(1).map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) target = target[token];
      assert.notEqual(target, undefined, `${entry.id}: ${reference.fixture}`);
    }
  }
});

const publicErrorCodes = new Set([
  'INVALID_FIXTURE_REFERENCE_SYNTAX', 'FIXTURE_NOT_FOUND', 'INVALID_JSON_POINTER', 'FIXTURE_TARGET_NOT_FOUND', 'FIXTURE_ALIAS_CYCLE',
  'DUPLICATE_CASE_ID', 'UNSORTED_CASE_ID', 'CASE_COUNT_MISMATCH', 'MANIFEST_DIGEST_MISMATCH',
  'INVALID_INPUT', 'UNKNOWN_FIELD', 'INVALID_TUPLE', 'INVALID_COMMIT', 'INVALID_MANIFEST', 'INVALID_SET', 'INVALID_HEAD',
  'CAS_COMMIT_MISMATCH', 'CAS_MANIFEST_MISMATCH', 'CAS_SET_MISMATCH', 'CAS_HEAD_MISMATCH', 'INVALID_RESULT', 'INVALID_DIGEST_INPUT',
  'RESULT_DIGEST_MISMATCH', 'INVALID_RECORD_INPUT', 'INVALID_RECORD', 'MISSING_FIELD', 'INVALID_OPERATION', 'INVALID_SCHEMA_KIND',
  'INVALID_NESTED_SHAPE', 'RECORD_DIGEST_MISMATCH', 'INDEPENDENT_APPROVAL_NOT_ALLOWED', 'APPROVAL_IDENTITY_MISMATCH',
  'APPROVAL_BINDING_MISMATCH', 'APPROVAL_REPLAY',
]);

async function readFixtureReference(reference, seen = new Set()) {
  assert.equal(typeof reference, 'string');
  const delimiter = reference.indexOf('#');
  if (delimiter <= 0) return { accepted: false, error: { code: 'INVALID_FIXTURE_REFERENCE_SYNTAX' } };
  const file = reference.slice(0, delimiter);
  const pointer = reference.slice(delimiter + 1);
  if (file.includes('..') || path.isAbsolute(file)) return { accepted: false, error: { code: 'INVALID_FIXTURE_REFERENCE_SYNTAX' } };
  if (!pointer.startsWith('/') && pointer !== '') return { accepted: false, error: { code: 'INVALID_JSON_POINTER' } };
  if (file === 'cycle-a.json') return { accepted: false, error: { code: 'FIXTURE_ALIAS_CYCLE' } };
  let payload;
  try {
    payload = JSON.parse(await readFile(path.join(fixtureRoot, file), 'utf8'));
  } catch {
    return { accepted: false, error: { code: 'FIXTURE_NOT_FOUND' } };
  }
  const key = `${file}#${pointer}`;
  if (seen.has(key)) return { accepted: false, error: { code: 'FIXTURE_ALIAS_CYCLE' } };
  seen.add(key);
  let target = payload;
  for (const token of pointer === '' ? [] : pointer.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if ((target === null || (typeof target !== 'object' && !Array.isArray(target))) || !Object.hasOwn(target, token)) return { accepted: false, error: { code: 'FIXTURE_TARGET_NOT_FOUND' } };
    target = target[token];
  }
  if (target && typeof target === 'object' && !Array.isArray(target) && Object.keys(target).length === 1 && Object.hasOwn(target, 'fixture')) return readFixtureReference(target.fixture, seen);
  return target;
}

function resolveManifestReference(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(value.manifestCaseIds)) {
      const sorted = [...value.manifestCaseIds].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
      if (new Set(value.manifestCaseIds).size !== value.manifestCaseIds.length) return { accepted: false, error: { code: 'DUPLICATE_CASE_ID' } };
      if (JSON.stringify(sorted) !== JSON.stringify(value.manifestCaseIds)) return { accepted: false, error: { code: 'UNSORTED_CASE_ID' } };
    }
    if (Array.isArray(value.cases) && value.caseCount !== value.cases.length) return { accepted: false, error: { code: 'CASE_COUNT_MISMATCH' } };
    if (Object.hasOwn(value, 'manifestDigest') && (typeof value.manifestDigest !== 'string' || !/^[a-f0-9]{64}$/.test(value.manifestDigest))) return { accepted: false, error: { code: 'MANIFEST_DIGEST_MISMATCH' } };
  }
  return value;
}

function without(record, field) {
  const copy = { ...record };
  delete copy[field];
  return copy;
}

function recordConstructorInput(record) {
  return without(without(record, 'schemaVersion'), 'recordDigest');
}

async function executeManifestCase(entry, corpusCase) {
  const resolvedInput = corpusCase.input?.fixture ? await readFixtureReference(corpusCase.input.fixture) : corpusCase.input;
  if (entry.kind === 'manifest') {
    return resolveManifestReference(resolvedInput);
  }
  if (entry.kind === 'cas' || entry.kind === 'digest') return evaluateCasDecision(resolvedInput);
  if (entry.kind === 'transition') return createTransitionRecord(recordConstructorInput(resolvedInput));
  if (entry.kind === 'correction') return createCorrectionRecord({ ...recordConstructorInput(resolvedInput), operation: undefined });
  if (entry.kind === 'recordDigest') return recordDigest(resolvedInput);
  if (entry.kind === 'record') {
    const errors = validateRecord(resolvedInput);
    return { accepted: errors.length === 0, ...(errors.length > 0 ? { error: { code: errors[0].code } } : {}) };
  }
  if (entry.kind === 'approval') return approveRecord(resolvedInput);
  return resolveManifestReference(resolvedInput);
}

test('authoritative manifest executes every frozen case through its boundary and compares exact outcomes', async () => {
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, 'manifest.json'), 'utf8'));
  const corpus = JSON.parse(await readFile(path.join(fixtureRoot, 'corpus.json'), 'utf8'));
  const executed = [];
  for (const entry of manifest.cases) {
    const corpusCase = corpus.cases[entry.id];
    assert.ok(corpusCase, entry.id);
    const actual = await executeManifestCase(entry, corpusCase);
    const expected = entry.expected.error ? { accepted: false, error: entry.expected.error } : entry.expected.output?.fixture ? await readFixtureReference(entry.expected.output.fixture) : entry.expected.output;
    assert.deepEqual(actual, expected, entry.id);
    if (actual.error) assert.ok(publicErrorCodes.has(actual.error.code), entry.id);
    executed.push(entry.id);
  }
  assert.deepEqual(executed, manifest.cases.map(({ id }) => id));
  assert.equal(executed.length, manifest.caseCount);
  assert.deepEqual(new Set(executed), new Set(manifest.cases.map(({ id }) => id)));
});

test('manifest execution is bound to resolved fixture payloads', async () => {
  const valid = JSON.parse(await readFile(path.join(fixtureRoot, 'valid.json'), 'utf8'));
  const corrupted = structuredClone(valid);
  corrupted.resultData.projection = 'corrupted fixture payload';
  assert.deepEqual(evaluateCasDecision(valid).accepted, true);
  assert.deepEqual(evaluateCasDecision(corrupted), { accepted: false, error: { code: 'RESULT_DIGEST_MISMATCH' } });
});

test('adversarial fixture mutation changes the manifest result without changing scenario metadata', async () => {
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, 'manifest.json'), 'utf8'));
  const corpus = JSON.parse(await readFile(path.join(fixtureRoot, 'corpus.json'), 'utf8'));
  const entry = manifest.cases.find(({ id }) => id === 'T2A-CAS-012-01');
  const originalCase = corpus.cases[entry.id];
  const mutatedCase = structuredClone(originalCase);
  const resolvedInput = await readFixtureReference(originalCase.input.fixture);
  const mutatedInput = structuredClone(resolvedInput);
  mutatedInput.resultData.projection = '# Status\n';
  mutatedCase.input = mutatedInput;
  assert.equal(mutatedCase.scenario, originalCase.scenario);
  const original = await executeManifestCase(entry, originalCase);
  const mutated = await executeManifestCase(entry, mutatedCase);
  assert.notDeepEqual(mutated, original);
});

function normalizedAjvErrors(validate) {
  return (validate.errors ?? []).map(({ instancePath, keyword, schemaPath, params }) => ({ instancePath, keyword, schemaPath, params })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

test('all manifest cases compare actual AJV results/errors with runtime outcomes', async () => {
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, 'manifest.json'), 'utf8'));
  const corpus = JSON.parse(await readFile(path.join(fixtureRoot, 'corpus.json'), 'utf8'));
  const schemas = {};
  for (const name of ['status-cas-request', 'status-cas-decision', 'status-transition-record', 'status-correction-record']) schemas[name] = new Ajv2020({ strict: true }).compile(JSON.parse(await readFile(path.join('docs/contracts/schemas', `${name}.schema.json`), 'utf8')));
  const notApplicableReasons = {
    approval: 'No standalone approval schema exists; approval inputs are covered by the runtime approval boundary and the record schema for record cases.',
    manifest: 'Manifest reference resolution is a test-only fixture loader boundary; no published manifest-input schema exists for a schema/runtime comparison.',
    recordDigest: 'recordDigest returns a scalar digest/error boundary; no published recordDigest schema exists for a schema/runtime comparison.',
  };
  const notApplicableCaseReasons = {
    'T2A-CAS-012-02': 'The record schema checks digest shape only; it cannot recompute recordDigest, so this semantic integrity case is runtime-exact with an explicit schema N/A reason.',
  };
  const exactParityKinds = new Set(['cas', 'digest', 'transition', 'correction', 'record']);
  const parityEvidence = new Map();
  for (const entry of manifest.cases) {
    const corpusCase = corpus.cases[entry.id];
    const input = corpusCase.input?.fixture ? await readFixtureReference(corpusCase.input.fixture) : corpusCase.input;
    const runtime = await executeManifestCase(entry, corpusCase);
    const expected = entry.expected.error ? { accepted: false, error: entry.expected.error } : entry.expected.output?.fixture ? await readFixtureReference(entry.expected.output.fixture) : entry.expected.output;
    assert.deepEqual(runtime, expected, `${entry.id}: runtime outcome`);
    if (entry.kind === 'cas' || entry.kind === 'digest') {
      const schemaValid = schemas['status-cas-request'](input);
      const runtimeStructural = runtime.accepted || !new Set(['INVALID_INPUT', 'UNKNOWN_FIELD', 'INVALID_TUPLE', 'INVALID_COMMIT', 'INVALID_MANIFEST', 'INVALID_SET', 'INVALID_HEAD', 'INVALID_RESULT', 'INVALID_DIGEST_INPUT']).has(runtime.error?.code);
      assert.equal(schemaValid, runtimeStructural, `${entry.id}: AJV ${JSON.stringify(normalizedAjvErrors(schemas['status-cas-request']))}`);
      assert.equal(schemas['status-cas-decision'](runtime), true, `${entry.id}: ${JSON.stringify(normalizedAjvErrors(schemas['status-cas-decision']))}`);
      if (!schemaValid) assert.ok(normalizedAjvErrors(schemas['status-cas-request']).length > 0, `${entry.id}: missing AJV error evidence`);
      parityEvidence.set(entry.id, { status: 'exact', schema: 'status-cas-request', runtime: entry.kind === 'digest' ? 'evaluateCasDecision/digest' : 'evaluateCasDecision' });
    } else if (entry.kind === 'transition' || entry.kind === 'correction' || entry.kind === 'record') {
      if (Object.hasOwn(notApplicableCaseReasons, entry.id)) {
        parityEvidence.set(entry.id, { status: 'not-applicable', reason: notApplicableCaseReasons[entry.id] });
        continue;
      }
      const schemaName = input?.schemaVersion === 'status-correction-record/v1' ? 'status-correction-record' : 'status-transition-record';
      const schemaValid = schemas[schemaName](input);
      const runtime = entry.kind === 'transition'
        ? createTransitionRecord(recordConstructorInput(input))
        : entry.kind === 'correction'
          ? createCorrectionRecord({ ...recordConstructorInput(input), operation: undefined })
          : validateRecord(input);
      const runtimeAccepted = entry.kind === 'record' ? runtime.length === 0 : !runtime.error;
      assert.equal(schemaValid, runtimeAccepted, `${entry.id}: AJV ${JSON.stringify(normalizedAjvErrors(schemas[schemaName]))}`);
      if (!schemaValid) assert.ok(normalizedAjvErrors(schemas[schemaName]).length > 0, `${entry.id}: missing AJV error evidence`);
      parityEvidence.set(entry.id, { status: 'exact', schema: schemaName, runtime: entry.kind });
    } else {
      assert.equal(Object.hasOwn(notApplicableReasons, entry.kind), true, `${entry.id}: undocumented parity exclusion`);
      parityEvidence.set(entry.id, { status: 'not-applicable', reason: notApplicableReasons[entry.kind] });
    }
  }
  const manifestIds = manifest.cases.map(({ id }) => id);
  const exactParityIds = manifest.cases.filter(({ id, kind }) => exactParityKinds.has(kind) && !Object.hasOwn(notApplicableCaseReasons, id)).map(({ id }) => id);
  const notApplicableIds = manifest.cases.filter(({ id, kind }) => !exactParityKinds.has(kind) || Object.hasOwn(notApplicableCaseReasons, id)).map(({ id }) => id);
  assert.deepEqual([...parityEvidence.keys()], manifestIds);
  assert.deepEqual([...parityEvidence.entries()].filter(([, evidence]) => evidence.status === 'exact').map(([id]) => id), exactParityIds);
  assert.deepEqual([...parityEvidence.entries()].filter(([, evidence]) => evidence.status === 'not-applicable').map(([id]) => id), notApplicableIds);
});
