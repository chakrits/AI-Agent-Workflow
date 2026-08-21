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
  assert.equal(validate({ accepted: false, error: { code: 'BAD' } }), true);
  assert.equal(validate({ accepted: false, error: { code: 'BAD' }, observed: tuple }), false);
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
