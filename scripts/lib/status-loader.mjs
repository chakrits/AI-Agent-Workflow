import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'yaml';

const SCHEMA_VERSION = 'work-item-status/v1';
const schemaPath = fileURLToPath(new URL('../../docs/contracts/schemas/work-item-status.schema.json', import.meta.url));
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const contractsDirectory = fileURLToPath(new URL('../../docs/contracts/', import.meta.url));

async function loadWorkflowContracts() {
  const filenames = (await readdir(contractsDirectory))
    .filter((filename) => filename.endsWith('-workflow.yaml'))
    .sort();
  const contracts = new Map();
  for (const filename of filenames) {
    const contract = parse(await readFile(path.join(contractsDirectory, filename), 'utf8'), { uniqueKeys: true });
    const key = `${contract.workflow_id}@${String(contract.contract_version)}`;
    if (contracts.has(key)) throw new Error(`Duplicate canonical workflow contract: ${key}`);
    contracts.set(key, new Set(contract.states));
  }
  return contracts;
}

const workflowContracts = await loadWorkflowContracts();
const newFeaturePhases = new Map([
  ['intake', new Set(['phase:requirements'])],
  ['discovery', new Set(['phase:requirements'])],
  ['designing', new Set(['phase:design'])],
  ['planning', new Set(['phase:planning'])],
  ['implementing', new Set(['phase:development'])],
  ['verifying', new Set(['phase:verification'])],
  ['rework', new Set(['phase:requirements', 'phase:design', 'phase:planning', 'phase:development'])],
  ['human-review', new Set(['phase:human-review'])],
  ['blocked', new Set(['phase:blocked'])],
  ['release', new Set(['phase:release'])]
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function evidenceOrder(left, right) {
  return left.kind.localeCompare(right.kind)
    || left.url.localeCompare(right.url)
    || (left.digest ?? '').localeCompare(right.digest ?? '')
    || (left.commit ?? '').localeCompare(right.commit ?? '')
    || left.observedAt.localeCompare(right.observedAt);
}

function normalizedForDigest(record) {
  const { recordDigest: _recordDigest, ...body } = record;
  return { ...body, evidence: [...(body.evidence ?? [])].sort(evidenceOrder) };
}

export function computeRecordDigest(record) {
  return createHash('sha256').update(canonicalJson(normalizedForDigest(record))).digest('hex');
}

function fail(file, reason) {
  throw new Error(`Status validation failed for ${file}: ${reason}`);
}

function validTimestamp(value) {
  const match = typeof value === 'string'
    && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    && parsed.getUTCHours() === hour
    && parsed.getUTCMinutes() === minute
    && parsed.getUTCSeconds() === second;
}

function validateSemantics(record, file) {
  if (!validate(record)) {
    const detail = validate.errors.map(({ instancePath, message }) => `${instancePath || '/'} ${message}`).join('; ');
    fail(file, detail);
  }

  const contractKey = `${record.governingContract}@${record.contractVersion}`;
  const states = workflowContracts.get(contractKey);
  if (!states) fail(file, `unknown governing contract or version: ${contractKey}`);
  if (!states.has(record.taskState)) fail(file, `illegal task state ${record.taskState} for ${contractKey}`);
  if (record.governingContract === 'new-feature') {
    if (!newFeaturePhases.get(record.taskState)?.has(record.phase)) {
      fail(file, `illegal phase ${record.phase} for ${contractKey} state ${record.taskState}`);
    }
  } else if (record.phase !== 'phase:not_applicable') {
    fail(file, `phase must be phase:not_applicable for ${contractKey}`);
  }

  const expectedUrl = `https://github.com/${record.issue.repository}/issues/${record.issue.number}`;
  if (record.issue.url !== expectedUrl) fail(file, 'issue URL does not agree with repository and number');
  if (!validTimestamp(record.createdAt) || !validTimestamp(record.updatedAt)) fail(file, 'timestamp is invalid');
  if (Date.parse(record.updatedAt) < Date.parse(record.createdAt)) fail(file, 'updatedAt precedes createdAt');
  if (!record.active && (!validTimestamp(record.archivedAt) || Date.parse(record.archivedAt) < Date.parse(record.updatedAt))) {
    fail(file, 'archivedAt is invalid or precedes updatedAt');
  }
  for (const item of record.evidence) {
    if (!validTimestamp(item.observedAt)) fail(file, 'evidence observedAt is invalid');
  }

  const expectedDigest = computeRecordDigest(record);
  if (record.recordDigest !== expectedDigest) fail(file, `record digest mismatch (expected ${expectedDigest})`);
}

function validateLineage(records) {
  const byIdentity = new Map();
  for (const record of records) {
    const identity = `${record.issue.repository}#${record.issue.number}`;
    const revisions = byIdentity.get(identity) ?? [];
    revisions.push(record);
    byIdentity.set(identity, revisions);
  }

  for (const [identity, revisions] of byIdentity) {
    const archives = revisions.filter(({ active }) => !active);
    if (archives.length === 0) continue;
    const byDigest = new Map(revisions.map((record) => [record.recordDigest, record]));
    if (byDigest.size !== revisions.length) throw new Error(`Archive lineage for ${identity} contains duplicate revisions`);
    const successorCount = new Map();
    const predecessors = new Map();
    const rootDigests = new Set(revisions.filter(({ active }) => active).map(({ recordDigest }) => recordDigest));
    for (const archive of archives) {
      let prior = byDigest.get(archive.supersedesDigest);
      if (!prior) {
        const removedActive = {
          ...archive,
          active: true,
          archivedAt: null,
          archiveReason: null,
          supersedesDigest: null
        };
        const externalDigest = computeRecordDigest(removedActive);
        if (archive.supersedesDigest !== externalDigest) {
          throw new Error(`Archive lineage for ${identity} has fabricated supersedesDigest ${archive.supersedesDigest}`);
        }
        predecessors.set(archive.recordDigest, { externalDigest });
        rootDigests.add(externalDigest);
        prior = removedActive;
      } else {
        predecessors.set(archive.recordDigest, { record: prior });
      }
      successorCount.set(archive.supersedesDigest, (successorCount.get(archive.supersedesDigest) ?? 0) + 1);
      if (successorCount.get(archive.supersedesDigest) > 1) {
        throw new Error(`Archive lineage for ${identity} branches at ${archive.supersedesDigest}`);
      }
      if (Date.parse(archive.updatedAt) < Date.parse(prior.updatedAt)) {
        throw new Error(`Archive lineage timestamps are not monotonic for ${identity}`);
      }
      if (!prior.active && archive.archivedAt.localeCompare(prior.archivedAt) < 0) {
        throw new Error(`Archive lineage ordering is not monotonic for ${identity}`);
      }
    }

    if (rootDigests.size !== 1) throw new Error(`Archive lineage for ${identity} is disconnected`);
    const [rootDigest] = rootDigests;
    for (const archive of archives) {
      const seen = new Set([archive.recordDigest]);
      let cursor = archive;
      while (!cursor.active) {
        const predecessor = predecessors.get(cursor.recordDigest);
        if (predecessor?.externalDigest) {
          cursor = { active: true, recordDigest: predecessor.externalDigest };
          break;
        }
        cursor = predecessor?.record;
        if (!cursor || seen.has(cursor.recordDigest)) {
          throw new Error(`Archive lineage for ${identity} is disconnected or cyclic`);
        }
        seen.add(cursor.recordDigest);
      }
      if (cursor.recordDigest !== rootDigest) throw new Error(`Archive lineage for ${identity} is disconnected`);
    }
  }
}

function statusOrder(left, right) {
  const identity = left.issue.repository.localeCompare(right.issue.repository)
    || left.issue.number - right.issue.number;
  if (identity !== 0) return identity;
  if (left.active !== right.active) return left.active ? -1 : 1;
  if (!left.active) return left.archivedAt.localeCompare(right.archivedAt)
    || left.recordDigest.localeCompare(right.recordDigest);
  return 0;
}

export async function loadStatusFiles(paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error('Missing expected status shard input');

  const records = [];
  for (const file of paths) {
    let source;
    try {
      source = await readFile(file, 'utf8');
    } catch (error) {
      throw new Error(`Missing or unreadable status shard ${path.resolve(file)}: ${error.message}`, { cause: error });
    }

    let record;
    try {
      record = parse(source, { uniqueKeys: true });
    } catch (error) {
      throw new Error(`Failed to parse status shard ${path.resolve(file)}: ${error.message}`, { cause: error });
    }
    if (record?.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported schema version in ${path.resolve(file)}: ${record?.schemaVersion ?? 'missing'}`);
    }
    validateSemantics(record, path.resolve(file));
    records.push({ ...record, evidence: [...record.evidence].sort(evidenceOrder) });
  }

  const activeIdentities = new Set();
  for (const record of records) {
    if (!record.active) continue;
    const identity = `${record.issue.repository}#${record.issue.number}`;
    if (activeIdentities.has(identity)) throw new Error(`Duplicate active identity: ${identity}`);
    activeIdentities.add(identity);
  }

  validateLineage(records);

  return records.sort(statusOrder);
}
