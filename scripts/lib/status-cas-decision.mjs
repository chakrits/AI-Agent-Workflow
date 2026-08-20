import { createHash } from 'node:crypto';

import {
  canonicalJcsBytes,
  contentTreeDigest,
  headDigest,
  manifestDigest,
  projectionDigest,
  setDigest,
} from './status-audit.mjs';

const COMMIT = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const IDENTITY = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
const CAS_FIELDS = [['commitSha', 'COMMIT'], ['manifestDigest', 'MANIFEST'], ['setDigest', 'SET'], ['headDigest', 'HEAD']];
const RECORD_FIELDS = new Set(['schemaVersion', 'operation', 'identity', 'predecessor', 'proposal', 'successor', 'expected', 'changedPaths', 'approval', 'recordDigest']);

const error = (code) => ({ accepted: false, error: { code } });
const validPath = (value) => typeof value === 'string' && value.length > 0 && !value.startsWith('/') && !value.endsWith('/') && !value.includes('\\') && !value.includes('\0') && value.split('/').every((part) => part && part !== '.' && part !== '..');

function validateTuple(tuple, prefix) {
  for (const [field, label] of CAS_FIELDS) {
    if (!tuple || typeof tuple !== 'object' || Array.isArray(tuple)) return `INVALID_${label}`;
    const value = tuple[field];
    if (typeof value !== 'string' || !(field === 'commitSha' ? COMMIT : DIGEST).test(value)) return `INVALID_${label}`;
  }
  return null;
}

export function evaluateCasDecision({ expected, observed, result }) {
  for (const [tuple, prefix] of [[expected, 'EXPECTED'], [observed, 'OBSERVED']]) {
    const invalid = validateTuple(tuple, prefix);
    if (invalid) return error(invalid);
  }
  for (const [field, label] of CAS_FIELDS) {
    if (expected[field] !== observed[field]) return error(`CAS_${label}_MISMATCH`);
  }
  for (const field of ['manifestDigest', 'setDigest', 'headDigest', 'projectionDigest', 'contentTreeDigest']) {
    if (typeof result?.[field] !== 'string' || !DIGEST.test(result[field])) return error(`INVALID_RESULT_${field.replace('Digest', '').toUpperCase()}`);
  }
  return { accepted: true, observed: { ...observed }, result: { ...result } };
}

function recordPreimage(record) {
  const copy = { ...record };
  delete copy.recordDigest;
  return copy;
}

export function recordDigest(record) {
  return createHash('sha256').update(canonicalJcsBytes(recordPreimage(record))).digest('hex');
}

function makeRecord({ recordKind, operation, identity, predecessor, proposal, successor, expected, changedPaths, approval }) {
  const schemaVersion = `status-${recordKind}-record/v1`;
  return {
    schemaVersion, operation, identity,
    predecessor: { ...predecessor }, proposal, successor, expected: { ...expected },
    changedPaths: [...changedPaths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))), approval,
    recordDigest: recordDigest({ schemaVersion, operation, identity, predecessor, proposal, successor, expected, changedPaths: [...changedPaths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))), approval }),
  };
}

export const createTransitionRecord = (input) => makeRecord({ ...input, recordKind: 'transition', operation: input.operation ?? 'update' });
export const createCorrectionRecord = (input) => makeRecord({ ...input, recordKind: 'correction', operation: 'correction' });

export function validateRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return [{ code: 'INVALID_RECORD' }];
  for (const key of Object.keys(record)) if (!RECORD_FIELDS.has(key)) errors.push({ code: 'UNKNOWN_FIELD', field: key });
  for (const key of RECORD_FIELDS) if (!Object.hasOwn(record, key)) errors.push({ code: 'MISSING_FIELD', field: key });
  const validOperation = record.schemaVersion === 'status-transition-record/v1'
    ? ['create', 'update', 'archive', 'rollback'].includes(record.operation)
    : record.schemaVersion === 'status-correction-record/v1' && record.operation === 'correction';
  if (!validOperation) errors.push({ code: 'INVALID_OPERATION' });
  if (typeof record.identity !== 'string' || !IDENTITY.test(record.identity)) errors.push({ code: 'INVALID_IDENTITY' });
  if (!record.predecessor || typeof record.predecessor.digest !== 'string' || !DIGEST.test(record.predecessor.digest) || typeof record.predecessor.authenticatedBy !== 'string' || !IDENTITY.test(record.predecessor.authenticatedBy)) errors.push({ code: 'INVALID_PREDECESSOR' });
  for (const field of ['proposal', 'successor', 'approval']) if (typeof record[field] !== 'string' || !DIGEST.test(record[field])) errors.push({ code: `INVALID_${field.toUpperCase()}` });
  const tupleError = validateTuple(record.expected, 'EXPECTED');
  if (tupleError) errors.push({ code: tupleError });
  if (!Array.isArray(record.changedPaths) || record.changedPaths.length === 0 || record.changedPaths.some((value, index, values) => !validPath(value) || values.indexOf(value) !== index || (index > 0 && Buffer.compare(Buffer.from(values[index - 1]), Buffer.from(value)) >= 0))) errors.push({ code: 'INVALID_CHANGED_PATHS' });
  if (typeof record.recordDigest !== 'string' || !DIGEST.test(record.recordDigest) || record.recordDigest !== recordDigest(record)) errors.push({ code: 'RECORD_DIGEST_MISMATCH' });
  return errors;
}

export function approveRecord({ record, identity, independent, proposal, predecessor, result }) {
  if (independent !== false) return error('INDEPENDENT_APPROVAL_NOT_ALLOWED');
  if (identity !== record?.predecessor?.authenticatedBy) return error('APPROVAL_IDENTITY_MISMATCH');
  if (proposal !== record.proposal || predecessor !== record.predecessor.digest || result !== record.successor) return error('APPROVAL_BINDING_MISMATCH');
  return { accepted: true, event: { type: 'approval', independent: false, recordDigest: record.recordDigest, proposal, predecessor, result, identity } };
}

export function deriveResultDigests({ manifest, set, head, projection, contentTree }) {
  return { manifestDigest: manifestDigest(manifest), setDigest: setDigest(set), headDigest: headDigest(head), projectionDigest: projectionDigest(projection), contentTreeDigest: contentTreeDigest(contentTree) };
}
