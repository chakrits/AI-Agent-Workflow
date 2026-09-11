import { lstat, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'yaml';

import { statusError } from './status-errors.mjs';
import { digestJcs, evidenceCompare, utf8Compare } from './status-jcs.mjs';
import { parseStatusBytes, STATUS_LIMITS } from './status-parser.mjs';
import { enforceMemoryBudget } from './status-resources.mjs';
import { requireIncrement1StatusMode } from './status-modes.mjs';

const SCHEMA_VERSION = 'work-item-status/v1';
const schemaPath = fileURLToPath(new URL('../../docs/contracts/schemas/work-item-status.schema.json', import.meta.url));
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const contractsDirectory = fileURLToPath(new URL('../../docs/contracts/', import.meta.url));

async function loadWorkflowContracts() {
  const filenames = (await readdir(contractsDirectory)).filter((name) => name.endsWith('-workflow.yaml')).sort(utf8Compare);
  const contracts = new Map();
  for (const filename of filenames) {
    const contract = parse(await readFile(path.join(contractsDirectory, filename), 'utf8'), { uniqueKeys: true });
    const key = `${contract.workflow_id}@${String(contract.contract_version)}`;
    if (contracts.has(key)) statusError('SEMANTIC_ERROR');
    contracts.set(key, new Set(contract.states));
  }
  return contracts;
}

const workflowContracts = await loadWorkflowContracts();
const lifecyclePhases = new Map([
  ['intake', ['phase:requirements']], ['discovery', ['phase:requirements']],
  ['designing', ['phase:design']], ['planning', ['phase:planning']],
  ['implementing', ['phase:development']], ['verifying', ['phase:verification']],
  ['rework', ['phase:requirements', 'phase:design', 'phase:planning', 'phase:development']],
  ['human-review', ['phase:human-review']], ['blocked', ['phase:blocked']], ['release', ['phase:release']]
]);

export function computeRecordDigest(record) {
  return digestJcs(record);
}

function validTimestamp(value) {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day && parsed.getUTCHours() === hour
    && parsed.getUTCMinutes() === minute && parsed.getUTCSeconds() === second;
}

const sensitive = /(?:password|passwd|secret|token|bearer|private[-_ ]?key|api[-_ ]?key|apikey|access[-_ ]?key|authorization)/i;

function safeDecode(component) {
  let decoded;
  try { decoded = decodeURIComponent(component); } catch { return null; }
  if (/%[0-9a-f]{2}/i.test(decoded)) return null;
  return decoded;
}

function safePathComponents(pathname) {
  const components = pathname.split('/');
  for (const component of components) {
    const decoded = safeDecode(component);
    if (decoded === null || sensitive.test(decoded) || /[\\/\0-\x1f\x7f]/.test(decoded)
        || decoded === '.' || decoded === '..') return false;
  }
  return true;
}

function validEvidenceUrl(value) {
  if (typeof value !== 'string' || /[\0-\x1f\x7f\\]/.test(value)) return false;
  if (value.startsWith('https://')) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password
        && !url.port && !url.search && !url.hash && url.pathname.length > 1
        && !sensitive.test(url.hostname) && safePathComponents(url.pathname);
    } catch { return false; }
  }
  if (value.startsWith('/') || value.includes('?') || value.includes('#')) return false;
  return safePathComponents(value);
}

function validateSchema(record, inputId) {
  if (!validate(record) || record.schemaVersion !== SCHEMA_VERSION) statusError('SCHEMA_ERROR', inputId);
}

function validatePolicyAndSemantics(record, inputId) {
  if (record.evidence.some(({ url }) => !validEvidenceUrl(url))) statusError('DATA_POLICY_ERROR', inputId);
  const contractKey = `${record.governingContract}@${record.contractVersion}`;
  const states = workflowContracts.get(contractKey);
  if (!states?.has(record.taskState)) statusError('SEMANTIC_ERROR', inputId);
  if (record.governingContract === 'new-feature') {
    if (!lifecyclePhases.get(record.taskState)?.includes(record.phase)) statusError('SEMANTIC_ERROR', inputId);
  } else if (record.phase !== 'phase:not_applicable') statusError('SEMANTIC_ERROR', inputId);

  if (record.issue.url !== `https://github.com/${record.issue.repository}/issues/${record.issue.number}`) statusError('SEMANTIC_ERROR', inputId);
  if (!validTimestamp(record.createdAt) || !validTimestamp(record.updatedAt)
      || Date.parse(record.updatedAt) < Date.parse(record.createdAt)) statusError('SEMANTIC_ERROR', inputId);
  if (!record.active && (!validTimestamp(record.archivedAt)
      || Date.parse(record.archivedAt) < Date.parse(record.updatedAt))) statusError('SEMANTIC_ERROR', inputId);
  if (record.evidence.some(({ observedAt }) => !validTimestamp(observedAt))) statusError('SEMANTIC_ERROR', inputId);
}

function validateDigest(record, inputId) {
  if (record.recordDigest !== computeRecordDigest(record)) statusError('RECORD_DIGEST_MISMATCH', inputId);
}

function limitsFor(mode) {
  if (mode === 'archive-identity') return [STATUS_LIMITS.archiveIdentityFiles, STATUS_LIMITS.archiveIdentityAggregateBytes];
  if (mode === 'archive-all') return [STATUS_LIMITS.archiveAllFiles, STATUS_LIMITS.archiveAllAggregateBytes];
  return [STATUS_LIMITS.activeFiles, STATUS_LIMITS.activeAggregateBytes];
}

async function preflight(paths, mode) {
  const ordered = [...paths].map(String).sort(utf8Compare);
  const [fileLimit, aggregateLimit] = limitsFor(mode);
  if (ordered.length > fileLimit) statusError('FILE_COUNT_LIMIT');
  let aggregate = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const file = ordered[index];
    const inputId = `input[${String(index).padStart(4, '0')}]`;
    let metadata;
    try { metadata = await lstat(file); } catch { statusError('MISSING_INPUT', inputId); }
    if (!metadata.isFile()) statusError('MISSING_INPUT', inputId);
    if (metadata.size > STATUS_LIMITS.rawFileBytes) statusError('RAW_FILE_LIMIT', inputId);
    aggregate += metadata.size;
  }
  if (aggregate > aggregateLimit) statusError('AGGREGATE_LIMIT');
  return {
    aggregate,
    inputs: ordered.map((file, index) => ({ file, inputId: `input[${String(index).padStart(4, '0')}]` }))
  };
}

const errorRank = new Map([
  ['INVALID_UTF8', 2], ['FORBIDDEN_YAML_FEATURE', 3], ['YAML_PARSE_ERROR', 4],
  ['JSON_DOMAIN_ERROR', 5], ['NODE_LIMIT', 5], ['CONTAINER_DEPTH_LIMIT', 5]
]);

function throwFirst(errors) {
  if (errors.length === 0) return;
  errors.sort((left, right) => (errorRank.get(left.code) ?? 99) - (errorRank.get(right.code) ?? 99)
    || utf8Compare(left.inputId ?? '', right.inputId ?? ''));
  throw errors[0];
}

function validateStage(records, operation) {
  const errors = [];
  for (const item of records) {
    try { operation(item.record, item.inputId); } catch (error) { errors.push(error); }
  }
  throwFirst(errors);
}

function identityOf(record) {
  return `${record.issue.repository}#${record.issue.number}`;
}

function validateLineage(records, expectedHeadDigest, archiveMode) {
  const groups = new Map();
  for (const record of records) groups.set(identityOf(record), [...(groups.get(identityOf(record)) ?? []), record]);
  const allByDigest = new Map();
  let duplicateDigest = false;
  for (const record of records) {
    if (allByDigest.has(record.recordDigest)) duplicateDigest = true;
    allByDigest.set(record.recordDigest, record);
  }
  const lineageErrors = new Set();
  for (const record of records.filter(({ active }) => !active)) {
    const prior = allByDigest.get(record.supersedesDigest);
    if (!prior) lineageErrors.add('MISSING_PREIMAGE');
    else if (identityOf(prior) !== identityOf(record)) lineageErrors.add('IDENTITY_MISMATCH');
    else if (prior.createdAt !== record.createdAt) lineageErrors.add('CREATED_AT_MISMATCH');
    else if (Date.parse(record.updatedAt) < Date.parse(prior.updatedAt)
        || (!prior.active && record.archivedAt < prior.archivedAt)) lineageErrors.add('NON_MONOTONIC_TIME');
  }
  for (const code of ['MISSING_PREIMAGE', 'IDENTITY_MISMATCH', 'CREATED_AT_MISMATCH', 'NON_MONOTONIC_TIME']) {
    if (lineageErrors.has(code)) statusError(code);
  }
  if (duplicateDigest) statusError('DUPLICATE_DIGEST');
  let assurance;
  for (const revisions of groups.values()) {
    if (!archiveMode && !revisions.some(({ active }) => !active)) continue;
    const roots = revisions.filter(({ active, supersedesDigest }) => active && supersedesDigest === null);
    const successors = new Map();
    for (const revision of revisions.filter(({ active }) => !active)) {
      const prior = allByDigest.get(revision.supersedesDigest);
      if (successors.has(prior.recordDigest)) statusError('BRANCHED_LINEAGE');
      successors.set(prior.recordDigest, revision);
    }
    for (const revision of revisions) {
      const seen = new Set();
      let cursor = revision;
      while (cursor?.supersedesDigest !== null) {
        if (seen.has(cursor.recordDigest)) statusError('CYCLIC_LINEAGE');
        seen.add(cursor.recordDigest);
        cursor = allByDigest.get(cursor.supersedesDigest);
      }
    }
    if (roots.length !== 1) statusError('DISCONNECTED_LINEAGE');
    const heads = revisions.filter(({ recordDigest }) => !successors.has(recordDigest));
    if (heads.length !== 1) statusError('DISCONNECTED_LINEAGE');
    const visited = new Set();
    let cursor = heads[0];
    while (cursor) {
      if (visited.has(cursor.recordDigest)) statusError('CYCLIC_LINEAGE');
      visited.add(cursor.recordDigest);
      cursor = cursor.supersedesDigest === null ? null : allByDigest.get(cursor.supersedesDigest);
    }
    if (visited.size !== revisions.length || !visited.has(roots[0].recordDigest)) statusError('DISCONNECTED_LINEAGE');
    if (expectedHeadDigest && heads[0].recordDigest !== expectedHeadDigest) statusError('STALE_LINEAGE_HEAD');
    if (!expectedHeadDigest) assurance = 'UNANCHORED_BUNDLE';
  }
  return assurance;
}

function statusOrder(left, right) {
  return utf8Compare(left.issue.repository, right.issue.repository) || left.issue.number - right.issue.number
    || Number(right.active) - Number(left.active)
    || utf8Compare(left.archivedAt ?? '', right.archivedAt ?? '')
    || utf8Compare(left.recordDigest, right.recordDigest);
}

export async function loadStatusFiles(paths, { mode = 'active', expectedHeadDigest, identity } = {}) {
  requireIncrement1StatusMode(mode);
  if (mode === 'archive-identity' && !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*#[1-9][0-9]*$/.test(identity ?? '')) {
    statusError('IDENTITY_MISMATCH');
  }
  if (!Array.isArray(paths) || paths.length === 0) statusError('MISSING_INPUT');
  const baselineRss = process.memoryUsage().rss;
  let peakRss = baselineRss;
  const { aggregate, inputs } = await preflight(paths, mode);
  let allocatedBytes = aggregate * 3 + inputs.length * 1_024;
  const measureMemory = () => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    return enforceMemoryBudget({ baselineRss, currentRss: peakRss, allocatedBytes });
  };
  measureMemory();
  const parseErrors = [];
  for (const input of inputs) {
    let raw;
    try {
      raw = await readFile(input.file);
      input.record = parseStatusBytes(raw, input.inputId);
    } catch (error) { parseErrors.push(error); }
    raw = undefined;
  }
  throwFirst(parseErrors);
  measureMemory();
  validateStage(inputs, validateSchema);
  if (mode === 'archive-identity' && inputs.some(({ record }) => identityOf(record) !== identity)) {
    statusError('IDENTITY_MISMATCH');
  }
  validateStage(inputs, validatePolicyAndSemantics);
  validateStage(inputs, validateDigest);
  const records = inputs.map(({ record }) => ({ ...record, evidence: [...record.evidence].sort(evidenceCompare) }));
  if (mode === 'active' && records.some(({ active }) => !active)) statusError('SEMANTIC_ERROR');
  const active = new Set();
  if (mode === 'active') {
    for (const record of records.filter(({ active: current }) => current)) {
      const identity = identityOf(record);
      if (active.has(identity)) statusError('DUPLICATE_ACTIVE_IDENTITY');
      active.add(identity);
    }
  }
  const assurance = validateLineage(records, expectedHeadDigest, mode !== 'active');
  const result = records.sort(statusOrder);
  if (assurance) Object.defineProperty(result, 'assurance', { value: assurance, enumerable: false });
  if (mode === 'active' && Buffer.byteLength(JSON.stringify(result)) > STATUS_LIMITS.normalizedActiveBytes) statusError('NORMALIZED_SIZE_LIMIT');
  Object.defineProperty(result, 'resources', { value: measureMemory(), enumerable: false });
  return result;
}
