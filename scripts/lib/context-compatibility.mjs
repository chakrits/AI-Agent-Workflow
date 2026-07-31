import { createHash } from 'node:crypto';

const REQUIRED_RECORD_FIELDS = [
  'contractVersion', 'fixtureId', 'slice', 'changeType', 'risk', 'workflow', 'roles', 'skills',
  'artifacts', 'gates', 'lifecyclePhase', 'nextOwner', 'stopBackwardReworkResult',
  'dispatchMandatoryFields', 'acknowledgement', 'terminalConsumption', 'statusSet',
  'projectionDigest', 'contextManifest', 'authority', 'mutationAttempted',
];
const ARRAY_RECORD_FIELDS = ['workflow', 'roles', 'skills', 'artifacts', 'gates', 'statusSet', 'contextManifest'];
const OBJECT_RECORD_FIELDS = ['dispatchMandatoryFields', 'acknowledgement', 'terminalConsumption'];
const STRING_RECORD_FIELDS = [
  'fixtureId', 'changeType', 'risk', 'lifecyclePhase', 'nextOwner', 'stopBackwardReworkResult',
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function isManifestEntry(entry) {
  return isPlainObject(entry)
    && typeof entry.source === 'string'
    && typeof entry.sourceHash === 'string'
    && Number.isFinite(entry.approximateTokens)
    && entry.approximateTokens >= 0
    && typeof entry.triggerReason === 'string'
    && typeof entry.loadResult === 'string';
}

function assertJsonValue(value, path = '$', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object') {
    throw new TypeError(`normalized record comparator error: ${path} is not a JSON value`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`normalized record comparator error: ${path} contains a JSON cycle`);
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`normalized record comparator error: ${path} is not a plain JSON object`);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key === 'symbol')) {
    throw new TypeError(`normalized record comparator error: ${path} has a non-JSON symbol key`);
  }
  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw new TypeError(`normalized record comparator error: ${path}[${index}] is a sparse JSON value`);
      }
      assertJsonValue(value[index], `${path}[${index}]`, nextAncestors);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertJsonValue(child, `${path}.${key}`, nextAncestors);
  }
}

function assertNormalizedRecord(record, { requireResultDigest }) {
  assertJsonValue(record);
  if (record === null || Array.isArray(record)) {
    throw new TypeError('normalized record comparator error: record must be a JSON object');
  }
  for (const field of REQUIRED_RECORD_FIELDS) {
    if (!Object.hasOwn(record, field)) {
      throw new TypeError(`normalized record comparator error: missing required field ${field}`);
    }
  }
  if (requireResultDigest && !Object.hasOwn(record, 'resultDigest')) {
    throw new TypeError('normalized record comparator error: missing required field resultDigest');
  }
  if (Object.hasOwn(record, 'resultDigest') && !/^[0-9a-f]{64}$/.test(record.resultDigest)) {
    throw new TypeError('normalized record comparator error: resultDigest must be a SHA-256 hex digest');
  }
  if (record.contractVersion !== 'context-compatibility/v1' || record.slice !== 'context') {
    throw new TypeError('normalized record comparator error: contractVersion and slice must match context-compatibility/v1');
  }
  if (STRING_RECORD_FIELDS.some((field) => typeof record[field] !== 'string')) {
    throw new TypeError('normalized record comparator error: normalized scalar field must be a string');
  }
  if (ARRAY_RECORD_FIELDS.some((field) => !Array.isArray(record[field]))) {
    throw new TypeError('normalized record comparator error: normalized ordered field must be an array');
  }
  if (OBJECT_RECORD_FIELDS.some((field) => !isPlainObject(record[field]))) {
    throw new TypeError('normalized record comparator error: normalized map field must be a JSON object');
  }
  if (record.projectionDigest !== null && typeof record.projectionDigest !== 'string') {
    throw new TypeError('normalized record comparator error: projectionDigest must be a string or null');
  }
  if (record.authority !== 'legacy' || record.mutationAttempted !== false) {
    throw new TypeError('normalized record comparator error: shadow authority must remain legacy and non-mutating');
  }
  if (!record.contextManifest.every(isManifestEntry)) {
    throw new TypeError('normalized record comparator error: malformed contextManifest entry');
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalSerialize(value) {
  return JSON.stringify(canonicalize(value));
}

export function computeResultDigest(record) {
  assertNormalizedRecord(record, { requireResultDigest: false });
  const { resultDigest: _excluded, ...digestInput } = record;
  return createHash('sha256').update(canonicalSerialize(digestInput), 'utf8').digest('hex');
}

function withoutDiagnosticTokens(value) {
  const copy = structuredClone(value);
  if (Array.isArray(copy?.contextManifest)) {
    for (const entry of copy.contextManifest) delete entry.approximateTokens;
  }
  return copy;
}

function collectDifferences(left, right, path = '', differences = []) {
  if (Object.is(left, right)) return differences;
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      collectDifferences(left[index], right[index], `${path}[${index}]`, differences);
    }
    return differences;
  }
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of [...keys].sort()) {
      collectDifferences(left[key], right[key], path ? `${path}.${key}` : key, differences);
    }
    return differences;
  }
  differences.push(path || '$');
  return differences;
}

export function compareCriticalRecords(full, progressive) {
  assertNormalizedRecord(full, { requireResultDigest: true });
  assertNormalizedRecord(progressive, { requireResultDigest: true });
  const differences = collectDifferences(
    withoutDiagnosticTokens(full),
    withoutDiagnosticTokens(progressive),
  );
  return { compatible: differences.length === 0, differences };
}

export function validateContextManifest(manifest, expectedSources) {
  const errors = [];
  if (!Array.isArray(manifest)) errors.push('manifest must be an array');
  if (!Array.isArray(expectedSources)) errors.push('expectedSources must be an array');
  if (errors.length) return { valid: false, errors };

  const expectedBySource = new Map();
  for (const [index, entry] of expectedSources.entries()) {
    if (!isPlainObject(entry)
      || typeof entry.source !== 'string' || typeof entry.sourceHash !== 'string') {
      errors.push(`malformed expected source at index ${index}`);
      continue;
    }
    if (expectedBySource.has(entry.source)) errors.push(`duplicate expected source: ${entry.source}`);
    else expectedBySource.set(entry.source, entry.sourceHash);
  }
  const seen = new Set();

  for (const [index, entry] of manifest.entries()) {
    if (!isManifestEntry(entry)) {
      errors.push(`malformed manifest entry at index ${index}`);
      continue;
    }
    if (seen.has(entry.source)) errors.push(`duplicate source: ${entry.source}`);
    seen.add(entry.source);
    if (!expectedBySource.has(entry.source)) {
      errors.push(`unknown source: ${entry.source}`);
    } else if (entry.sourceHash !== expectedBySource.get(entry.source)) {
      errors.push(`stale source: ${entry.source}`);
    }
  }

  for (const source of expectedBySource.keys()) {
    if (!seen.has(source)) errors.push(`missing source: ${source}`);
  }

  return { valid: errors.length === 0, errors };
}
