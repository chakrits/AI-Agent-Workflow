import { createHash } from 'node:crypto';

import { canonicalJcsBytes, contentTreeDigest, headDigest, manifestDigest, projectionDigest, setDigest } from './status-audit.mjs';

const COMMIT = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const IDENTITY = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
const CAS_FIELDS = [['commitSha', 'COMMIT'], ['manifestDigest', 'MANIFEST'], ['setDigest', 'SET'], ['headDigest', 'HEAD']];
const RESULT_FIELDS = ['manifestDigest', 'setDigest', 'headDigest', 'projectionDigest', 'contentTreeDigest'];
const RECORD_FIELDS = new Set(['schemaVersion', 'operation', 'identity', 'predecessor', 'proposal', 'successor', 'expected', 'changedPaths', 'approval', 'recordDigest']);
const RECORD_INPUT_FIELDS = new Set(['operation', 'identity', 'predecessor', 'proposal', 'successor', 'expected', 'changedPaths', 'approval']);
const RESERVED_PATHS = new Set(['CON', 'PRN', 'AUX', 'NUL', ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`), ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`)]);
const error = (code) => ({ accepted: false, error: { code } });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, fields) => isObject(value) && Object.keys(value).every((key) => fields.has(key));
const sortedPaths = (paths) => [...paths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));

export function isSafeRepositoryPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 255 || value.normalize('NFC') !== value) return false;
  if (/^[A-Za-z]:/.test(value) || value.startsWith('/') || value.endsWith('/') || value.includes('\\') || /[\u0000-\u001f\u007f\u2028\u2029]/.test(value)) return false;
  return value.split('/').every((segment) => segment && segment !== '.' && segment !== '..' && !/[. ]$/.test(segment) && !segment.includes(':') && !RESERVED_PATHS.has(segment.toUpperCase().split('.')[0]));
}

function validateTuple(tuple) {
  if (!isObject(tuple) || !exact(tuple, new Set(CAS_FIELDS.map(([field]) => field)))) return 'INVALID_TUPLE';
  for (const [field, label] of CAS_FIELDS) if (typeof tuple[field] !== 'string' || !(field === 'commitSha' ? COMMIT : DIGEST).test(tuple[field])) return `INVALID_${label}`;
  return null;
}

function validResultData(value) {
  if (!exact(value, new Set(['manifest', 'set', 'head', 'projection', 'contentTree']))) return false;
  if (!exact(value.manifest, new Set(['schemaVersion', 'manifestDigest', 'setDigest'])) || !exact(value.head, new Set(['schemaVersion', 'activeIssueKeys', 'setDigest']))) return false;
  if (!Array.isArray(value.set) || value.set.some((entry) => !exact(entry, new Set(['issueKey', 'path', 'recordDigest'])))) return false;
  return typeof value.projection === 'string' && Array.isArray(value.contentTree) && value.contentTree.every((entry) => exact(entry, new Set(['path', 'bytes'])));
}

export function deriveResultDigests(input) {
  try {
    if (!validResultData(input)) return error('INVALID_DIGEST_INPUT');
    return { manifestDigest: manifestDigest(input.manifest), setDigest: setDigest(input.set), headDigest: headDigest(input.head), projectionDigest: projectionDigest(input.projection), contentTreeDigest: contentTreeDigest(input.contentTree) };
  } catch {
    return error('INVALID_DIGEST_INPUT');
  }
}

export function evaluateCasDecision(input) {
  try {
    if (!isObject(input)) return error('INVALID_INPUT');
    if (!exact(input, new Set(['expected', 'observed', 'result', 'resultData']))) return error('UNKNOWN_FIELD');
    if (isObject(input.resultData) && !exact(input.resultData, new Set(['manifest', 'set', 'head', 'projection', 'contentTree']))) return error('UNKNOWN_FIELD');
    for (const tuple of [input.expected, input.observed]) {
      const invalid = validateTuple(tuple);
      if (invalid) return error(invalid);
    }
    for (const [field, label] of CAS_FIELDS) if (input.expected[field] !== input.observed[field]) return error(`CAS_${label}_MISMATCH`);
    if (!isObject(input.result) || !exact(input.result, new Set(RESULT_FIELDS)) || RESULT_FIELDS.some((field) => typeof input.result[field] !== 'string' || !DIGEST.test(input.result[field]))) return error('INVALID_RESULT');
    const derived = deriveResultDigests(input.resultData);
    if (derived.error) return derived;
    if (RESULT_FIELDS.some((field) => input.result[field] !== derived[field])) return error('RESULT_DIGEST_MISMATCH');
    return { accepted: true, observed: { ...input.observed }, result: { ...input.result } };
  } catch {
    return error('INVALID_INPUT');
  }
}

function recordPreimage(record) { const copy = { ...record }; delete copy.recordDigest; return copy; }

export function recordDigest(record) {
  try {
    if (!exact(record, RECORD_FIELDS)) return error('INVALID_RECORD');
    return createHash('sha256').update(canonicalJcsBytes(recordPreimage(record))).digest('hex');
  } catch {
    return error('INVALID_RECORD');
  }
}

function makeRecord(input, kind, defaultOperation) {
  try {
    if (!isObject(input) || !exact(input, RECORD_INPUT_FIELDS) || !Array.isArray(input.changedPaths)) return error('INVALID_RECORD_INPUT');
    if (kind === 'correction' && input.operation !== undefined && input.operation !== 'correction') return error('INVALID_RECORD_INPUT');
    const operation = kind === 'correction' ? 'correction' : input.operation ?? defaultOperation;
    const record = { schemaVersion: `status-${kind}-record/v1`, operation, identity: input.identity, predecessor: isObject(input.predecessor) ? { ...input.predecessor } : input.predecessor, proposal: input.proposal, successor: input.successor, expected: isObject(input.expected) ? { ...input.expected } : input.expected, changedPaths: sortedPaths(input.changedPaths), approval: input.approval };
    const digest = recordDigest(record);
    return digest.error ? error('INVALID_RECORD_INPUT') : { ...record, recordDigest: digest };
  } catch {
    return error('INVALID_RECORD_INPUT');
  }
}

export const createTransitionRecord = (input) => makeRecord(input, 'transition', 'update');
export const createCorrectionRecord = (input) => makeRecord(input, 'correction', 'correction');

export function validateRecord(record) {
  const errors = [];
  try {
    if (!isObject(record)) return [{ code: 'INVALID_RECORD' }];
    if (!exact(record, RECORD_FIELDS)) errors.push({ code: 'UNKNOWN_FIELD' });
    if ([...RECORD_FIELDS].some((key) => !Object.hasOwn(record, key))) errors.push({ code: 'MISSING_FIELD' });
    const validOperation = record.schemaVersion === 'status-transition-record/v1' ? ['create', 'update', 'archive', 'rollback'].includes(record.operation) : record.schemaVersion === 'status-correction-record/v1' && record.operation === 'correction';
    if (!validOperation) errors.push({ code: 'INVALID_OPERATION' });
    if (typeof record.identity !== 'string' || !IDENTITY.test(record.identity)) errors.push({ code: 'INVALID_IDENTITY' });
    if (!exact(record.predecessor, new Set(['digest', 'authenticatedBy'])) || !DIGEST.test(record.predecessor?.digest ?? '') || typeof record.predecessor?.authenticatedBy !== 'string' || !IDENTITY.test(record.predecessor.authenticatedBy)) errors.push({ code: 'INVALID_PREDECESSOR' });
    for (const field of ['proposal', 'successor', 'approval']) if (typeof record[field] !== 'string' || !DIGEST.test(record[field])) errors.push({ code: `INVALID_${field.toUpperCase()}` });
    const tupleError = validateTuple(record.expected);
    if (tupleError) errors.push({ code: tupleError });
    if (!Array.isArray(record.changedPaths) || record.changedPaths.length === 0 || record.changedPaths.some((value, index, values) => !isSafeRepositoryPath(value) || values.indexOf(value) !== index || (index > 0 && Buffer.compare(Buffer.from(values[index - 1]), Buffer.from(value)) >= 0))) errors.push({ code: 'INVALID_CHANGED_PATHS' });
    const digest = recordDigest(record);
    if (typeof record.recordDigest !== 'string' || !DIGEST.test(record.recordDigest) || typeof digest !== 'string' || record.recordDigest !== digest) errors.push({ code: 'RECORD_DIGEST_MISMATCH' });
  } catch {
    errors.push({ code: 'INVALID_RECORD' });
  }
  return errors;
}

export function approveRecord(input) {
  try {
    if (!isObject(input) || !exact(input, new Set(['record', 'identity', 'independent', 'proposal', 'predecessor', 'result', 'consumedRecordDigests'])) || validateRecord(input.record).length > 0) return error('INVALID_RECORD');
    if (input.independent !== false) return error('INDEPENDENT_APPROVAL_NOT_ALLOWED');
    if (input.identity !== input.record.predecessor.authenticatedBy) return error('APPROVAL_IDENTITY_MISMATCH');
    if (input.proposal !== input.record.proposal || input.predecessor !== input.record.predecessor.digest || input.result !== input.record.successor) return error('APPROVAL_BINDING_MISMATCH');
    if (input.consumedRecordDigests?.has?.(input.record.recordDigest)) return error('APPROVAL_REPLAY');
    return { accepted: true, event: { type: 'approval', independent: false, recordDigest: input.record.recordDigest, proposal: input.proposal, predecessor: input.predecessor, result: input.result, identity: input.identity } };
  } catch {
    return error('INVALID_RECORD');
  }
}
