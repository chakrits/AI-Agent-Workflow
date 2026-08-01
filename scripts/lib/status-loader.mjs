import { lstat, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'yaml';

import { statusError } from './status-errors.mjs';
import { digestJcs, evidenceCompare, utf8Compare } from './status-jcs.mjs';
import { parseStatusBytes, STATUS_LIMITS } from './status-parser.mjs';

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

function validEvidenceUrl(value) {
  if (typeof value !== 'string' || sensitive.test(value) || /[\0-\x1f\x7f\\]/.test(value) || /%(?:2f|5c)/i.test(value)) return false;
  if (value.startsWith('https://')) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password
        && !url.port && !url.search && !url.hash && url.pathname.length > 1;
    } catch { return false; }
  }
  if (value.startsWith('/') || value.includes('?') || value.includes('#')) return false;
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return false; }
  return !decoded.split('/').some((segment) => segment === '..' || segment === '.');
}

function validateSemantics(record, file) {
  if (!validate(record)) statusError('SCHEMA_ERROR', file);
  if (record.schemaVersion !== SCHEMA_VERSION) statusError('SCHEMA_ERROR', file);
  if (record.evidence.some(({ url }) => !validEvidenceUrl(url))) statusError('DATA_POLICY_ERROR', file);

  const contractKey = `${record.governingContract}@${record.contractVersion}`;
  const states = workflowContracts.get(contractKey);
  if (!states?.has(record.taskState)) statusError('SEMANTIC_ERROR', file);
  if (record.governingContract === 'new-feature') {
    if (!lifecyclePhases.get(record.taskState)?.includes(record.phase)) statusError('SEMANTIC_ERROR', file);
  } else if (record.phase !== 'phase:not_applicable') statusError('SEMANTIC_ERROR', file);

  if (record.issue.url !== `https://github.com/${record.issue.repository}/issues/${record.issue.number}`) statusError('SEMANTIC_ERROR', file);
  if (!validTimestamp(record.createdAt) || !validTimestamp(record.updatedAt)
      || Date.parse(record.updatedAt) < Date.parse(record.createdAt)) statusError('SEMANTIC_ERROR', file);
  if (!record.active && (!validTimestamp(record.archivedAt)
      || Date.parse(record.archivedAt) < Date.parse(record.updatedAt))) statusError('SEMANTIC_ERROR', file);
  if (record.evidence.some(({ observedAt }) => !validTimestamp(observedAt))) statusError('SEMANTIC_ERROR', file);
  if (record.recordDigest !== computeRecordDigest(record)) statusError('RECORD_DIGEST_MISMATCH', file);
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
  for (const file of ordered) {
    let metadata;
    try { metadata = await lstat(file); } catch { statusError('MISSING_INPUT', path.resolve(file)); }
    if (!metadata.isFile()) statusError('MISSING_INPUT', path.resolve(file));
    if (metadata.size > STATUS_LIMITS.rawFileBytes) statusError('RAW_FILE_LIMIT', path.resolve(file));
    aggregate += metadata.size;
  }
  if (aggregate > aggregateLimit) statusError('AGGREGATE_LIMIT');
  return ordered;
}

function identityOf(record) {
  return `${record.issue.repository}#${record.issue.number}`;
}

function validateLineage(records, expectedHeadDigest) {
  const groups = new Map();
  for (const record of records) groups.set(identityOf(record), [...(groups.get(identityOf(record)) ?? []), record]);
  let assurance;
  for (const revisions of groups.values()) {
    if (!revisions.some(({ active }) => !active)) continue;
    const byDigest = new Map();
    for (const revision of revisions) {
      if (byDigest.has(revision.recordDigest)) statusError('DUPLICATE_DIGEST');
      byDigest.set(revision.recordDigest, revision);
    }
    const roots = revisions.filter(({ active, supersedesDigest }) => active && supersedesDigest === null);
    const successors = new Map();
    for (const revision of revisions.filter(({ active }) => !active)) {
      const prior = byDigest.get(revision.supersedesDigest);
      if (!prior) statusError('MISSING_PREIMAGE');
      if (identityOf(prior) !== identityOf(revision)) statusError('IDENTITY_MISMATCH');
      if (prior.createdAt !== revision.createdAt) statusError('CREATED_AT_MISMATCH');
      if (Date.parse(revision.updatedAt) < Date.parse(prior.updatedAt)
          || (!prior.active && revision.archivedAt < prior.archivedAt)) statusError('NON_MONOTONIC_TIME');
      if (successors.has(prior.recordDigest)) statusError('BRANCHED_LINEAGE');
      successors.set(prior.recordDigest, revision);
    }
    for (const revision of revisions) {
      const seen = new Set();
      let cursor = revision;
      while (cursor?.supersedesDigest !== null) {
        if (seen.has(cursor.recordDigest)) statusError('CYCLIC_LINEAGE');
        seen.add(cursor.recordDigest);
        cursor = byDigest.get(cursor.supersedesDigest);
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
      cursor = cursor.supersedesDigest === null ? null : byDigest.get(cursor.supersedesDigest);
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

export async function loadStatusFiles(paths, { mode = 'active', expectedHeadDigest } = {}) {
  if (!Array.isArray(paths) || paths.length === 0) statusError('MISSING_INPUT');
  const orderedPaths = await preflight(paths, mode);
  const records = [];
  for (const file of orderedPaths) {
    let raw;
    try { raw = await readFile(file); } catch { statusError('MISSING_INPUT', path.resolve(file)); }
    const record = parseStatusBytes(raw, path.resolve(file));
    validateSemantics(record, path.resolve(file));
    records.push({ ...record, evidence: [...record.evidence].sort(evidenceCompare) });
  }
  if (mode === 'active' && records.some(({ active }) => !active)) statusError('SEMANTIC_ERROR');
  const active = new Set();
  if (mode === 'active') {
    for (const record of records.filter(({ active: current }) => current)) {
      const identity = identityOf(record);
      if (active.has(identity)) statusError('DUPLICATE_ACTIVE_IDENTITY');
      active.add(identity);
    }
  }
  const assurance = validateLineage(records, expectedHeadDigest);
  const result = records.sort(statusOrder);
  if (assurance) Object.defineProperty(result, 'assurance', { value: assurance, enumerable: false });
  if (mode === 'active' && Buffer.byteLength(JSON.stringify(result)) > STATUS_LIMITS.normalizedActiveBytes) statusError('NORMALIZED_SIZE_LIMIT');
  return result;
}
