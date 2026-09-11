import { isAlias, isMap, isScalar, isSeq, parseAllDocuments } from 'yaml';

import { statusError } from './status-errors.mjs';

export const STATUS_LIMITS = Object.freeze({
  rawFileBytes: 98_304,
  activeFiles: 1_000,
  activeAggregateBytes: 4_194_304,
  archiveIdentityFiles: 1_024,
  archiveIdentityAggregateBytes: 8_388_608,
  archiveAllFiles: 10_000,
  archiveAllAggregateBytes: 67_108_864,
  residentBytes: 134_217_728,
  normalizedActiveBytes: 262_144,
  canonicalBytes: 65_536,
  nodes: 10_000,
  containerDepth: 16
});

const decoder = new TextDecoder('utf-8', { fatal: true });

function forbiddenDocument(documents) {
  if (documents.length !== 1) return true;
  const [document] = documents;
  if (document.directives?.yaml?.explicit || Object.keys(document.directives?.tags ?? {}).some((key) => key !== '!!')) return true;
  if (document.errors.some(({ code }) => code === 'DUPLICATE_KEY')) return true;
  const stack = document.contents ? [document.contents] : [];
  const seen = new WeakSet();
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (seen.has(node) || isAlias(node) || node.anchor || node.tag) return true;
    seen.add(node);
    if (isMap(node)) {
      for (const pair of node.items) {
        if (!isScalar(pair.key) || typeof pair.key.value !== 'string' || pair.key.value === '<<') return true;
        stack.push(pair.value, pair.key);
      }
    } else if (isSeq(node)) {
      for (const child of node.items) stack.push(child);
    }
  }
  return false;
}

function assign(parent, key, value) {
  if (parent === null) return value;
  if (Array.isArray(parent)) parent[key] = value;
  else Object.defineProperty(parent, key, { value, enumerable: true, writable: true, configurable: true });
  return undefined;
}

function scalarValue(node) {
  const value = node.value;
  if (typeof value === 'bigint') {
    if (/^-0(?:$|[.eE])/.test(node.source ?? '') || value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      statusError('JSON_DOMAIN_ERROR');
    }
    return Number(value);
  }
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || Object.is(value, -0))) statusError('JSON_DOMAIN_ERROR');
  if (value === null || ['string', 'boolean', 'number'].includes(typeof value)) return value;
  statusError('JSON_DOMAIN_ERROR');
}

function convertDocument(document) {
  let root;
  let nodes = 0;
  let depthFailure = false;
  const stack = [{ node: document.contents, parent: null, key: null, depth: isMap(document.contents) || isSeq(document.contents) ? 1 : 0 }];
  while (stack.length > 0) {
    const { node, parent, key, depth } = stack.pop();
    nodes += 1;
    if (nodes > STATUS_LIMITS.nodes) statusError('NODE_LIMIT');
    if (depth > STATUS_LIMITS.containerDepth) depthFailure = true;
    if (isScalar(node)) {
      const value = scalarValue(node);
      const result = assign(parent, key, value);
      if (parent === null) root = result;
    } else if (isSeq(node)) {
      const value = new Array(node.items.length);
      const result = assign(parent, key, value);
      if (parent === null) root = result;
      for (let index = node.items.length - 1; index >= 0; index -= 1) {
        stack.push({ node: node.items[index], parent: value, key: index, depth: isMap(node.items[index]) || isSeq(node.items[index]) ? depth + 1 : depth });
      }
    } else if (isMap(node)) {
      const value = {};
      const result = assign(parent, key, value);
      if (parent === null) root = result;
      for (let index = node.items.length - 1; index >= 0; index -= 1) {
        const pair = node.items[index];
        stack.push({ node: pair.value, parent: value, key: pair.key.value, depth: isMap(pair.value) || isSeq(pair.value) ? depth + 1 : depth });
        stack.push({ node: pair.key, parent: {}, key: 'ignored', depth });
      }
    } else statusError('JSON_DOMAIN_ERROR');
  }
  if (depthFailure) statusError('CONTAINER_DEPTH_LIMIT');
  return root;
}

export function parseStatusBytes(raw, relativePath = '') {
  if (!Buffer.isBuffer(raw)) statusError('JSON_DOMAIN_ERROR', relativePath);
  if (raw.length > STATUS_LIMITS.rawFileBytes) statusError('RAW_FILE_LIMIT', relativePath);
  if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) statusError('INVALID_UTF8', relativePath);
  let source;
  try {
    source = decoder.decode(raw);
  } catch {
    statusError('INVALID_UTF8', relativePath);
  }
  const documents = parseAllDocuments(source, {
    schema: 'core', merge: false, uniqueKeys: true, maxAliasCount: 0,
    intAsBigInt: true, keepSourceTokens: true, prettyErrors: false, strict: true
  });
  if (forbiddenDocument(documents)) statusError('FORBIDDEN_YAML_FEATURE', relativePath);
  if (documents[0].errors.length > 0) statusError('YAML_PARSE_ERROR', relativePath);
  return convertDocument(documents[0]);
}
