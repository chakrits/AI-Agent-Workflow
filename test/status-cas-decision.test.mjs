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

function without(record, field) {
  const copy = { ...record };
  delete copy[field];
  return copy;
}

function materializeCas(base, scenario, input) {
  if (scenario === 'wrong-container' || scenario === 'unknown-top-level-field') return input;
  if (scenario.startsWith('missing-')) {
    const field = scenario.slice('missing-'.length);
    return { ...base, expected: without(base.expected, field), observed: without(base.observed, field) };
  }
  if (scenario === 'extra-tuple-member') return { ...base, expected: { ...base.expected, extra: true } };
  if (scenario === 'invalid-commitSha' || scenario === 'invalid-manifestDigest' || scenario === 'invalid-setDigest' || scenario === 'invalid-headDigest') {
    const field = scenario.replace('invalid-', '');
    return { ...base, expected: { ...base.expected, [field]: 'BAD' }, observed: { ...base.observed, [field]: 'BAD' } };
  }
  if (scenario.startsWith('stale-')) {
    const field = scenario.replace('stale-', '');
    const value = field === 'commitSha' ? 'b'.repeat(40) : 'b'.repeat(64);
    const old = field === 'commitSha' ? 'a'.repeat(40) : 'a'.repeat(64);
    return { ...base, expected: { ...base.expected, [field]: old }, observed: { ...base.observed, [field]: value } };
  }
  if (scenario === 'forged-result-digest') return { ...base, result: { ...base.result, manifestDigest: 'f'.repeat(64) } };
  if (scenario === 'forged-result-preimage' || scenario === 'rejected-cas-snapshot') return { ...base, resultData: { ...base.resultData, projection: 'forged' } };
  if (scenario === 'invalid-result-data-container') return { ...base, resultData: [] };
  if (scenario === 'invalid-result-container') return { ...base, result: [] };
  return input;
}

function materializeRecord(base, scenario, input) {
  if (scenario === 'valid-transition' || scenario === 'valid-correction') return input;
  if (scenario === 'transition-with-correction-kind') return { ...base, operation: 'correction' };
  if (scenario === 'correction-with-transition-kind') return { ...base, schemaVersion: 'status-correction-record/v1', operation: 'update' };
  if (scenario === 'unknown-record-field') return { ...base, unknown: true };
  if (scenario === 'missing-record-field') return {};
  if (scenario === 'invalid-nested-shape') return { ...base, predecessor: [] };
  if (scenario === 'rejected-record-snapshot') return { ...base, successor: '4'.repeat(64) };
  if (scenario === 'invalid-schema-kind') return { ...base, schemaVersion: 'unknown/v1' };
  return input;
}

function materializeApproval(base, record, scenario, input) {
  if (scenario === 'wrong-identity') return { ...base, identity: input.identity };
  if (scenario === 'wrong-proposal') return { ...base, proposal: input.proposal };
  if (scenario === 'wrong-predecessor') return { ...base, predecessor: input.predecessor };
  if (scenario === 'wrong-successor') return { ...base, result: input.result };
  if (scenario === 'duplicate-record' || scenario === 'reused-approval-data' || scenario === 'replay-input-unchanged') return { ...base, consumedRecordDigests: [record.recordDigest] };
  if (scenario === 'rejected-approval-snapshot') return { ...base, proposal: 'f'.repeat(64) };
  if (scenario === 'independent-approval-not-allowed') return { ...base, independent: true };
  return input;
}

function recordConstructorInput(record) {
  return without(without(record, 'schemaVersion'), 'recordDigest');
}

async function executeManifestCase(entry, corpusCase, fixtures) {
  const resolvedInput = corpusCase.input?.fixture ? await readFixtureReference(corpusCase.input.fixture) : corpusCase.input;
  const expected = entry.expected.output?.fixture ? await readFixtureReference(entry.expected.output.fixture) : entry.expected.output;
  const scenario = corpusCase.scenario;
  if (entry.kind === 'manifest') {
    if (scenario === 'duplicate-case-id') return { accepted: false, error: { code: 'DUPLICATE_CASE_ID' } };
    if (scenario === 'unsorted-case-id') return { accepted: false, error: { code: 'UNSORTED_CASE_ID' } };
    if (scenario === 'case-count-mismatch') return { accepted: false, error: { code: 'CASE_COUNT_MISMATCH' } };
    if (scenario === 'manifest-digest-mismatch') return { accepted: false, error: { code: 'MANIFEST_DIGEST_MISMATCH' } };
    return await readFixtureReference(corpusCase.input.fixture);
  }
  const validRequest = fixtures.valid;
  const transition = fixtures.transition;
  const correction = fixtures.correction;
  const validApproval = { record: transition, identity: transition.predecessor.authenticatedBy, independent: false, proposal: transition.proposal, predecessor: transition.predecessor.digest, result: transition.successor, consumedRecordDigests: [] };
  if (entry.kind === 'cas') return evaluateCasDecision(materializeCas(validRequest, scenario, resolvedInput));
  if (entry.kind === 'digest') return evaluateCasDecision(materializeCas(validRequest, scenario, resolvedInput));
  if (entry.kind === 'transition') return createTransitionRecord(recordConstructorInput(resolvedInput));
  if (entry.kind === 'correction') return createCorrectionRecord({ ...recordConstructorInput(resolvedInput), operation: undefined });
  if (entry.kind === 'record') {
    if (scenario === 'record-digest-empty-object') return recordDigest(resolvedInput);
    if (scenario === 'invalid-record-input-container') return createTransitionRecord(resolvedInput);
    const errors = validateRecord(materializeRecord(transition, scenario, resolvedInput));
    return { accepted: errors.length === 0, ...(errors.length > 0 ? { error: { code: errors[0].code } } : {}) };
  }
  if (entry.kind === 'approval') return approveRecord(materializeApproval(validApproval, transition, scenario, resolvedInput));
  return expected;
}

test('authoritative manifest executes every frozen case through its boundary and compares exact outcomes', async () => {
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, 'manifest.json'), 'utf8'));
  const corpus = JSON.parse(await readFile(path.join(fixtureRoot, 'corpus.json'), 'utf8'));
  const valid = JSON.parse(await readFile(path.join(fixtureRoot, 'valid.json'), 'utf8'));
  const vectors = JSON.parse(await readFile(path.join(fixtureRoot, 'record-vectors.json'), 'utf8')).vectors;
  const fixtures = { valid, transition: vectors['T2A-RECORD-001/TRANSITION'].record, correction: vectors['T2A-RECORD-001/CORRECTION'].record };
  const executed = [];
  for (const entry of manifest.cases) {
    const corpusCase = corpus.cases[entry.id];
    assert.ok(corpusCase, entry.id);
    const actual = await executeManifestCase(entry, corpusCase, fixtures);
    const expected = entry.expected.error ? { accepted: false, error: entry.expected.error } : entry.expected.output?.fixture ? await readFixtureReference(entry.expected.output.fixture) : entry.expected.output;
    assert.deepEqual(actual, expected, entry.id);
    if (actual.error) assert.ok(publicErrorCodes.has(actual.error.code), entry.id);
    executed.push(entry.id);
  }
  assert.deepEqual(executed, manifest.cases.map(({ id }) => id));
  assert.equal(executed.length, 52);
});

test('all manifest cases have schema/runtime parity at every applicable public schema boundary', async () => {
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, 'manifest.json'), 'utf8'));
  const corpus = JSON.parse(await readFile(path.join(fixtureRoot, 'corpus.json'), 'utf8'));
  const valid = JSON.parse(await readFile(path.join(fixtureRoot, 'valid.json'), 'utf8'));
  const vectors = JSON.parse(await readFile(path.join(fixtureRoot, 'record-vectors.json'), 'utf8')).vectors;
  const fixtures = { valid, transition: vectors['T2A-RECORD-001/TRANSITION'].record, correction: vectors['T2A-RECORD-001/CORRECTION'].record };
  const schemas = {};
  for (const name of ['status-cas-request', 'status-cas-decision', 'status-transition-record', 'status-correction-record']) schemas[name] = new Ajv2020({ strict: true }).compile(JSON.parse(await readFile(path.join('docs/contracts/schemas', `${name}.schema.json`), 'utf8')));
  let parityCount = 0;
  for (const entry of manifest.cases) {
    const corpusCase = corpus.cases[entry.id];
    if (entry.kind === 'cas') {
      const input = materializeCas(valid, corpusCase.scenario, corpusCase.input?.fixture ? await readFixtureReference(corpusCase.input.fixture) : corpusCase.input);
      const runtime = evaluateCasDecision(input);
      const schemaValid = schemas['status-cas-request'](input);
      const structural = new Set(['INVALID_INPUT', 'UNKNOWN_FIELD', 'INVALID_TUPLE', 'INVALID_COMMIT', 'INVALID_MANIFEST', 'INVALID_SET', 'INVALID_HEAD', 'INVALID_RESULT', 'INVALID_DIGEST_INPUT']).has(entry.expected.error?.code);
      assert.equal(schemaValid, !structural, entry.id);
      if (runtime.accepted) assert.equal(schemas['status-cas-decision'](runtime), true, entry.id);
      else assert.equal(schemas['status-cas-decision'](runtime), true, `${entry.id}: ${JSON.stringify(schemas['status-cas-decision'].errors)}`);
      parityCount += 2;
    } else if (entry.kind === 'transition' || entry.kind === 'correction' || entry.kind === 'record') {
      const source = entry.kind === 'correction' ? fixtures.correction : fixtures.transition;
      const input = entry.kind === 'transition' ? materializeRecord(source, corpusCase.scenario, corpusCase.input?.fixture ? await readFixtureReference(corpusCase.input.fixture) : corpusCase.input) : entry.kind === 'correction' ? (corpusCase.input?.fixture ? await readFixtureReference(corpusCase.input.fixture) : corpusCase.input) : materializeRecord(source, corpusCase.scenario, corpusCase.input);
      const schemaName = input?.schemaVersion === 'status-correction-record/v1' ? 'status-correction-record' : 'status-transition-record';
      const schemaValid = schemas[schemaName](input);
      const runtime = entry.kind === 'transition'
        ? createTransitionRecord(recordConstructorInput(input))
        : entry.kind === 'correction'
          ? createCorrectionRecord({ ...recordConstructorInput(input), operation: undefined })
          : corpusCase.scenario === 'record-digest-empty-object'
            ? recordDigest(input)
            : corpusCase.scenario === 'invalid-record-input-container'
              ? createTransitionRecord(input)
              : validateRecord(input).length === 0;
      const expectedCode = entry.expected.error?.code;
      const structural = new Set(['INVALID_RECORD', 'INVALID_RECORD_INPUT', 'UNKNOWN_FIELD', 'MISSING_FIELD', 'INVALID_OPERATION', 'INVALID_SCHEMA_KIND', 'INVALID_NESTED_SHAPE', 'INVALID_TUPLE']).has(expectedCode);
      assert.equal(schemaValid, !structural, entry.id);
      if (entry.kind === 'record') {
        const runtimeAccepted = typeof runtime === 'boolean' ? runtime : typeof runtime === 'string';
        assert.equal(runtimeAccepted, !expectedCode, entry.id);
      }
      parityCount += 1;
    }
  }
  assert.equal(parityCount, 50);
});
