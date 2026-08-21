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
const RESERVED_PATHS = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']);

const decisionError = (code) => ({ accepted: false, error: { code } });
const recordError = (code) => ({ accepted: false, error: { code } });

export function isSafeRepositoryPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 255) return false;
  if (/^[A-Za-z]:/.test(value) || value.startsWith('/') || value.endsWith('/') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return false;
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..' || RESERVED_PATHS.has(segment.toUpperCase().split('.')[0]))) return false;
  return true;
}

function validateTuple(tuple) {
  if (!tuple || typeof tuple !== 'object' || Array.isArray(tuple)) return 'INVALID_TUPLE';
  for (const [field, label] of CAS_FIELDS) {
    const value = tuple[field];
    if (typeof value !== 'string' || !(field === 'commitSha' ? COMMIT : DIGEST).test(value)) return `INVALID_${label}`;
  }
  return null;
}

export function evaluateCasDecision(input) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return decisionError('INVALID_INPUT');
    const { expected, observed, result } = input;
    for (const tuple of [expected, observed]) {
      const invalid = validateTuple(tuple);
      if (invalid) return decisionError(invalid);
    }
    for (const [field, label] of CAS_FIELDS) if (expected[field] !== observed[field]) return decisionError(`CAS_${label}_MISMATCH`);
    if (!result || typeof result !== 'object' || Array.isArray(result)) return decisionError('INVALID_RESULT');
    for (const field of ['manifestDigest', 'setDigest', 'headDigest', 'projectionDigest', 'contentTreeDigest']) {
      if (typeof result[field] !== 'string' || !DIGEST.test(result[field])) return decisionError(`INVALID_RESULT_${field.replace('Digest', '').toUpperCase()}`);
    }
    return { accepted: true, observed: { ...observed }, result: { ...result } };
  } catch {
    return decisionError('INVALID_INPUT');
  }
}

function recordPreimage(record) {
  const copy = { ...record };
  delete copy.recordDigest;
  return copy;
}

export function recordDigest(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('INVALID_RECORD');
  return createHash('sha256').update(canonicalJcsBytes(recordPreimage(record))).digest('hex');
}

function makeRecord(input, recordKind, operation) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return recordError('INVALID_RECORD_INPUT');
  const { identity, predecessor, proposal, successor, expected, changedPaths, approval } = input;
  if (!Array.isArray(changedPaths)) return recordError('INVALID_RECORD_INPUT');
  try {
    const schemaVersion = `status-${recordKind}-record/v1`;
    const paths = [...changedPaths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
    const record = { schemaVersion, operation, identity, predecessor: { ...predecessor }, proposal, successor, expected: { ...expected }, changedPaths: paths, approval };
    return { ...record, recordDigest: recordDigest(record) };
  } catch {
    return recordError('INVALID_RECORD_INPUT');
  }
}

export const createTransitionRecord = (input) => makeRecord(input, 'transition', input?.operation ?? 'update');
export const createCorrectionRecord = (input) => makeRecord(input, 'correction', 'correction');

export function validateRecord(record) {
  const errors = [];
  try {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return [{ code: 'INVALID_RECORD' }];
    if (Object.keys(record).some((key) => !RECORD_FIELDS.has(key))) errors.push({ code: 'UNKNOWN_FIELD' });
    if ([...RECORD_FIELDS].some((key) => !Object.hasOwn(record, key))) errors.push({ code: 'MISSING_FIELD' });
    const validOperation = record.schemaVersion === 'status-transition-record/v1'
      ? ['create', 'update', 'archive', 'rollback'].includes(record.operation)
      : record.schemaVersion === 'status-correction-record/v1' && record.operation === 'correction';
    if (!validOperation) errors.push({ code: 'INVALID_OPERATION' });
    if (typeof record.identity !== 'string' || !IDENTITY.test(record.identity)) errors.push({ code: 'INVALID_IDENTITY' });
    if (!record.predecessor || typeof record.predecessor !== 'object' || Array.isArray(record.predecessor) || !DIGEST.test(record.predecessor.digest ?? '') || typeof record.predecessor.authenticatedBy !== 'string' || !IDENTITY.test(record.predecessor.authenticatedBy)) errors.push({ code: 'INVALID_PREDECESSOR' });
    for (const field of ['proposal', 'successor', 'approval']) if (typeof record[field] !== 'string' || !DIGEST.test(record[field])) errors.push({ code: `INVALID_${field.toUpperCase()}` });
    const tupleError = validateTuple(record.expected);
    if (tupleError) errors.push({ code: tupleError });
    if (!Array.isArray(record.changedPaths) || record.changedPaths.length === 0 || record.changedPaths.some((value, index, values) => !isSafeRepositoryPath(value) || values.indexOf(value) !== index || (index > 0 && Buffer.compare(Buffer.from(values[index - 1]), Buffer.from(value)) >= 0))) errors.push({ code: 'INVALID_CHANGED_PATHS' });
    if (typeof record.recordDigest !== 'string' || !DIGEST.test(record.recordDigest) || record.recordDigest !== recordDigest(record)) errors.push({ code: 'RECORD_DIGEST_MISMATCH' });
  } catch {
    errors.push({ code: 'INVALID_RECORD' });
  }
  return errors;
}

export function approveRecord(input) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !input.record || validateRecord(input.record).length > 0) return recordError('INVALID_RECORD');
    const { record, identity, independent, proposal, predecessor, result, consumedRecordDigests } = input;
    if (independent !== false) return recordError('INDEPENDENT_APPROVAL_NOT_ALLOWED');
    if (identity !== record.predecessor.authenticatedBy) return recordError('APPROVAL_IDENTITY_MISMATCH');
    if (proposal !== record.proposal || predecessor !== record.predecessor.digest || result !== record.successor) return recordError('APPROVAL_BINDING_MISMATCH');
    if (consumedRecordDigests && typeof consumedRecordDigests.has === 'function' && consumedRecordDigests.has(record.recordDigest)) return recordError('APPROVAL_REPLAY');
    return { accepted: true, event: { type: 'approval', independent: false, recordDigest: record.recordDigest, proposal, predecessor, result, identity } };
  } catch {
    return recordError('INVALID_RECORD');
  }
}

export function deriveResultDigests({ manifest, set, head, projection, contentTree } = {}) {
  return { manifestDigest: manifestDigest(manifest), setDigest: setDigest(set), headDigest: headDigest(head), projectionDigest: projectionDigest(projection), contentTreeDigest: contentTreeDigest(contentTree) };
}
