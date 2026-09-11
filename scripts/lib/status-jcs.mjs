import { createHash } from 'node:crypto';

import { statusError } from './status-errors.mjs';

const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const MAX_DEPTH = 16;
const MAX_CANONICAL_BYTES = 65_536;
const encoder = new TextEncoder();

function validString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

function utf8Compare(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function evidenceCompare(left, right) {
  for (const field of ['kind', 'url', 'digest', 'commit', 'observedAt']) {
    const order = utf8Compare(left[field] ?? '', right[field] ?? '');
    if (order !== 0) return order;
  }
  return 0;
}

function normalizedRoot(value) {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return value;
  const copy = { ...value };
  delete copy.recordDigest;
  if (Array.isArray(copy.evidence)) copy.evidence = [...copy.evidence].sort(evidenceCompare);
  return copy;
}

function validateDomain(root) {
  const stack = [{ value: root, depth: root && typeof root === 'object' ? 1 : 0 }];
  const seen = new WeakSet();
  while (stack.length > 0) {
    const { value, depth } = stack.pop();
    if (typeof value === 'string') {
      if (!validString(value)) statusError('JSON_DOMAIN_ERROR');
      continue;
    }
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || Object.is(value, -0) || Math.abs(value) > MAX_SAFE) {
        statusError('JSON_DOMAIN_ERROR');
      }
      continue;
    }
    if (value === null || typeof value === 'boolean') continue;
    if (typeof value !== 'object') statusError('JSON_DOMAIN_ERROR');
    if (depth > MAX_DEPTH || seen.has(value)) statusError('JSON_DOMAIN_ERROR');
    seen.add(value);
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: value[index], depth: typeof value[index] === 'object' && value[index] !== null ? depth + 1 : depth });
      }
    } else {
      const keys = Object.keys(value);
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        if (!validString(keys[index])) statusError('JSON_DOMAIN_ERROR');
        const child = value[keys[index]];
        stack.push({ value: child, depth: typeof child === 'object' && child !== null ? depth + 1 : depth });
      }
    }
  }
}

function serialize(root) {
  const output = [];
  const stack = [{ type: 'value', value: root }];
  while (stack.length > 0) {
    const item = stack.pop();
    if (item.type === 'text') {
      output.push(item.value);
    } else if (item.value === null || typeof item.value === 'boolean' || typeof item.value === 'number') {
      output.push(String(item.value));
    } else if (typeof item.value === 'string') {
      output.push(JSON.stringify(item.value));
    } else if (Array.isArray(item.value)) {
      stack.push({ type: 'text', value: ']' });
      for (let index = item.value.length - 1; index >= 0; index -= 1) {
        stack.push({ type: 'value', value: item.value[index] });
        if (index > 0) stack.push({ type: 'text', value: ',' });
      }
      stack.push({ type: 'text', value: '[' });
    } else {
      const keys = Object.keys(item.value).sort();
      stack.push({ type: 'text', value: '}' });
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        stack.push({ type: 'value', value: item.value[key] });
        stack.push({ type: 'text', value: ':' });
        stack.push({ type: 'text', value: JSON.stringify(key) });
        if (index > 0) stack.push({ type: 'text', value: ',' });
      }
      stack.push({ type: 'text', value: '{' });
    }
  }
  return output.join('');
}

export function canonicalizeJcs(value) {
  const normalized = normalizedRoot(value);
  validateDomain(normalized);
  const bytes = Buffer.from(encoder.encode(serialize(normalized)));
  if (bytes.length > MAX_CANONICAL_BYTES) statusError('CANONICAL_SIZE_LIMIT');
  return bytes;
}

export function digestJcs(value) {
  return createHash('sha256').update(canonicalizeJcs(value)).digest('hex');
}

export { evidenceCompare, utf8Compare };
