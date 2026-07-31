import { createHash } from 'node:crypto';

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
  const differences = collectDifferences(
    withoutDiagnosticTokens(full),
    withoutDiagnosticTokens(progressive),
  );
  return { compatible: differences.length === 0, differences };
}

export function validateContextManifest(manifest, expectedSources) {
  const errors = [];
  const expectedBySource = new Map(expectedSources.map((entry) => [entry.source, entry.sourceHash]));
  const seen = new Set();

  for (const entry of manifest) {
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
