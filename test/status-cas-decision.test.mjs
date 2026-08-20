import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  approveRecord,
  createCorrectionRecord,
  createTransitionRecord,
  evaluateCasDecision,
  recordDigest,
  validateRecord,
} from '../scripts/lib/status-cas-decision.mjs';

const digest = 'a'.repeat(64);
const tuple = { commitSha: 'b'.repeat(40), manifestDigest: digest, setDigest: digest, headDigest: digest };
const result = {
  manifestDigest: 'c'.repeat(64), setDigest: 'd'.repeat(64), headDigest: 'e'.repeat(64),
  projectionDigest: 'f'.repeat(64), contentTreeDigest: '0'.repeat(64),
};

function decision(overrides = {}) {
  return evaluateCasDecision({ expected: tuple, observed: tuple, result, ...overrides });
}

test('pure CAS accepts the complete tuple and exposes observed/result digests', () => {
  assert.deepEqual(decision(), { accepted: true, observed: tuple, result });
});

test('CAS rejects each malformed or stale tuple member with stable code-only errors', () => {
  for (const field of ['commitSha', 'manifestDigest', 'setDigest', 'headDigest']) {
    const malformed = { ...tuple, [field]: 'bad' };
    assert.deepEqual(decision({ expected: malformed }), { accepted: false, error: { code: `INVALID_${field === 'commitSha' ? 'COMMIT' : field.replace('Digest', '').toUpperCase()}` } });
    assert.deepEqual(decision({ observed: malformed }), { accepted: false, error: { code: `INVALID_${field === 'commitSha' ? 'COMMIT' : field.replace('Digest', '').toUpperCase()}` } });
    const stale = { ...tuple, [field]: field === 'commitSha' ? 'c'.repeat(40) : '9'.repeat(64) };
    assert.deepEqual(decision({ observed: stale }), { accepted: false, error: { code: `CAS_${field === 'commitSha' ? 'COMMIT' : field.replace('Digest', '').toUpperCase()}_MISMATCH` } });
  }
});

test('transition and correction records are closed and canonically bound', () => {
  const predecessor = { digest: digest, authenticatedBy: 'maintainer@example.com' };
  const transition = createTransitionRecord({ operation: 'update', identity: 'chakrits/AI-Agent-Workflow:133', predecessor, proposal: '1'.repeat(64), successor: '2'.repeat(64), expected: tuple, changedPaths: ['PROJECT_STATUS.md'], approval: 'a'.repeat(64) });
  assert.deepEqual(validateRecord(transition), []);
  assert.equal(transition.recordDigest, recordDigest(transition));
  assert.equal(validateRecord({ ...transition, extra: true }).some((e) => e.code === 'UNKNOWN_FIELD'), true);
  const correction = createCorrectionRecord({ identity: transition.identity, predecessor, proposal: transition.proposal, successor: transition.successor, expected: tuple, changedPaths: transition.changedPaths, approval: transition.approval });
  assert.equal(transition.operation, 'update');
  assert.equal(correction.operation, 'correction');
  assert.deepEqual(validateRecord(correction), []);
  assert.notEqual(correction.schemaVersion, transition.schemaVersion);
});

test('record schemas accept their own generated records and reject cross-kind collapse', async () => {
  const transition = createTransitionRecord({ operation: 'update', identity: 'owner/repo:133', predecessor: { digest, authenticatedBy: 'maintainer@example.com' }, proposal: '1'.repeat(64), successor: '2'.repeat(64), expected: tuple, changedPaths: ['PROJECT_STATUS.md'], approval: 'a'.repeat(64) });
  const correction = createCorrectionRecord({ identity: 'owner/repo:133', predecessor: transition.predecessor, proposal: transition.proposal, successor: transition.successor, expected: tuple, changedPaths: transition.changedPaths, approval: transition.approval });
  const transitionSchema = JSON.parse(await readFile('docs/contracts/schemas/status-transition-record.schema.json', 'utf8'));
  const correctionSchema = JSON.parse(await readFile('docs/contracts/schemas/status-correction-record.schema.json', 'utf8'));
  const transitionValidator = new Ajv2020({ strict: true }).compile(transitionSchema);
  const correctionValidator = new Ajv2020({ strict: true }).compile(correctionSchema);
  assert.equal(transitionValidator(transition), true, JSON.stringify(transitionValidator.errors));
  assert.equal(correctionValidator(correction), true, JSON.stringify(correctionValidator.errors));
  assert.equal(transitionValidator(correction), false);
});

test('same-identity approval remains a separate non-independent event bound to the record', () => {
  const record = createCorrectionRecord({ identity: 'chakrits/AI-Agent-Workflow:133', predecessor: { digest, authenticatedBy: 'maintainer@example.com' }, proposal: '1'.repeat(64), successor: '2'.repeat(64), expected: tuple, changedPaths: ['PROJECT_STATUS.md'], approval: '0'.repeat(64) });
  assert.deepEqual(approveRecord({ record, identity: 'maintainer@example.com', independent: false, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor }), { accepted: true, event: { type: 'approval', independent: false, recordDigest: record.recordDigest, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor, identity: 'maintainer@example.com' } });
  assert.equal(approveRecord({ record, identity: 'maintainer@example.com', independent: true, proposal: record.proposal, predecessor: record.predecessor.digest, result: record.successor }).error.code, 'INDEPENDENT_APPROVAL_NOT_ALLOWED');
});

test('T2 schemas are closed and available to contract validation', async () => {
  for (const name of ['status-cas-decision', 'status-transition-record', 'status-correction-record']) {
    const schema = JSON.parse(await readFile(path.join('docs/contracts/schemas', `${name}.schema.json`), 'utf8'));
    assert.equal(new Ajv2020({ strict: true }).compile(schema).schema.additionalProperties, false, name);
  }
});
