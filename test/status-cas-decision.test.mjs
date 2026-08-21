import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

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
const fixtureRoot = path.join('test', 'fixtures', 'status-cas', 'v1');

function decision(overrides = {}) {
  return evaluateCasDecision({ expected: tuple, observed: tuple, result, ...overrides });
}

function validRecord(overrides = {}) {
  return createTransitionRecord({ operation: 'update', identity: 'owner/repo:133', predecessor: { digest, authenticatedBy: 'maintainer@example.com' }, proposal: '1'.repeat(64), successor: '2'.repeat(64), expected: tuple, changedPaths: ['PROJECT_STATUS.md'], approval: '3'.repeat(64), ...overrides });
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
  assert.equal(validateRecord({ ...record, successor: '4'.repeat(64) }).some(({ code }) => code === 'RECORD_DIGEST_MISMATCH'), true);
  assert.deepEqual(approveRecord({ record: { ...record, successor: '4'.repeat(64) }, identity: 'maintainer@example.com', independent: false, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor }), { accepted: false, error: { code: 'INVALID_RECORD' } });
  assert.deepEqual(approveRecord({ record, identity: 'maintainer@example.com', independent: false, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor, consumedRecordDigests: new Set([record.recordDigest]) }), { accepted: false, error: { code: 'APPROVAL_REPLAY' } });
});

test('transition and correction records stay distinct and path validation is cross-platform safe', () => {
  const transition = validRecord();
  const correction = createCorrectionRecord({ ...transition, recordDigest: undefined, operation: undefined });
  assert.deepEqual(validateRecord(transition), []);
  assert.deepEqual(validateRecord(correction), []);
  assert.equal(transition.schemaVersion, 'status-transition-record/v1');
  assert.equal(correction.schemaVersion, 'status-correction-record/v1');
  for (const unsafe of ['C:\\temp\\x', 'C:/temp/x', '/absolute', '../escape', 'a/../b', 'a\nb', 'a\u0000b', 'CON', 'aux.txt', 'a//b', 'a/']) assert.equal(isSafeRepositoryPath(unsafe), false, unsafe);
  assert.equal(isSafeRepositoryPath('docs/status/active/item.json'), true);
});

test('approval is bound only after record validation and same-identity approval remains separate', () => {
  const record = validRecord();
  assert.deepEqual(approveRecord({ record, identity: 'maintainer@example.com', independent: false, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor }).event, { type: 'approval', independent: false, recordDigest: record.recordDigest, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor, identity: 'maintainer@example.com' });
  assert.deepEqual(approveRecord({ record, identity: 'maintainer@example.com', independent: true, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor }), { accepted: false, error: { code: 'INDEPENDENT_APPROVAL_NOT_ALLOWED' } });
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
    const record = name.includes('correction') ? createCorrectionRecord(validRecord()) : validRecord();
    assert.equal(validate(record), true, JSON.stringify(validate.errors));
    assert.equal(validate({ ...record, extra: true }), false);
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
