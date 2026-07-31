import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { parse } from 'yaml';

const SCHEMA_VERSION = 'work-item-status/v1';
const schemaPath = fileURLToPath(new URL('../../docs/contracts/schemas/work-item-status.schema.json', import.meta.url));
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const validate = new Ajv2020({ allErrors: true }).compile(schema);

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
    || (left.digest ?? '').localeCompare(right.digest ?? '');
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

  return records.sort(statusOrder);
}
