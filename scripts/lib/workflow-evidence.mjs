import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../docs/contracts/schemas/workflow-evidence.schema.json' with { type: 'json' };

import { canonicalizeJcs } from './status-jcs.mjs';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);
const DISPATCH_RECEIPTS_MARKER = `${path.sep}docs${path.sep}records${path.sep}dispatch-receipts${path.sep}`;

export class EvidenceValidationError extends Error {
  constructor(errors) {
    super(`Invalid workflow evidence record:\n${errors.join('\n')}`);
    this.name = 'EvidenceValidationError';
    this.errors = errors;
  }
}

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function formatSchemaError(error) {
  const location = error.instancePath || '$';
  const missing = error.params?.missingProperty ? ` (${error.params.missingProperty})` : '';
  return `${location} ${error.message}${missing}`;
}

function semanticErrors(record) {
  if (!isPlainObject(record)) return ['$ must be a plain JSON object'];
  const errors = [];
  const attributes = record.attributes;

  if (typeof record.observed_at === 'string') {
    const match = record.observed_at.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/,
    );
    if (match) {
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const observed = new Date(record.observed_at);
      const isValidDate = !Number.isNaN(observed.getTime())
        && observed.getUTCFullYear() === year
        && observed.getUTCMonth() + 1 === month
        && observed.getUTCDate() === day
        && observed.getUTCHours() === hour
        && observed.getUTCMinutes() === minute
        && observed.getUTCSeconds() === second;
      if (!isValidDate) errors.push('$.observed_at must be a valid RFC 3339 UTC timestamp');
    }
  }

  if (record.event_type === 'context_baseline_observed' && isPlainObject(attributes)) {
    const status = attributes.token_measurement_status;
    if (status === 'available' && Number.isInteger(attributes.approximate_tokens)) {
      const withinTarget = attributes.approximate_tokens <= attributes.target_tokens;
      const expected = withinTarget ? 'success' : 'failure';
      if (record.outcome_status !== expected) {
        errors.push(
          `$.outcome_status must be ${expected} when approximate_tokens is ${withinTarget ? 'within' : 'over'} target_tokens`,
        );
      }
    }
  }

  return errors;
}

export function validateEvidenceRecord(record) {
  const errors = [];
  if (!validateSchema(record)) errors.push(...validateSchema.errors.map(formatSchemaError));
  errors.push(...semanticErrors(record));
  return [...new Set(errors)];
}

export function canonicalEvidenceJson(record) {
  const errors = validateEvidenceRecord(record);
  if (errors.length) throw new EvidenceValidationError(errors);
  try {
    return canonicalizeJcs(record).toString('utf8');
  } catch (error) {
    throw new EvidenceValidationError([`$ canonicalization failed: ${error.message}`]);
  }
}

function assertEvidenceDestination(destination) {
  if (typeof destination !== 'string' || destination.trim() === '') {
    throw new TypeError('workflow evidence destination must be a non-empty path');
  }
  const normalized = path.resolve(destination);
  const marker = DISPATCH_RECEIPTS_MARKER;
  if (`${normalized}${path.sep}`.includes(marker)) {
    throw new TypeError('workflow evidence cannot write to the dispatch receipt directory');
  }
  return normalized;
}

async function existingIdentityErrors(destination, record) {
  let content;
  try {
    content = await readFile(destination, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const errors = [];
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === '') {
      if (index === lines.length - 1) continue;
      errors.push(`existing evidence line ${index + 1} is blank`);
      continue;
    }
    let existing;
    try {
      existing = JSON.parse(line);
    } catch {
      errors.push(`existing evidence line ${index + 1} is not valid JSON`);
      continue;
    }
    if (existing?.evidence_id === record.evidence_id) {
      errors.push(`evidence_id already exists: ${record.evidence_id}`);
    }
    if (existing?.event_id === record.event_id) {
      errors.push(`event_id already exists: ${record.event_id}`);
    }
  }
  return errors;
}

/**
 * Validate and append exactly one canonical workflow-evidence/v1 JSONL record.
 * Validation and destination checks happen before any directory or file write.
 */
export async function writeEvidence(record, destination) {
  const canonicalJson = canonicalEvidenceJson(record);
  const target = assertEvidenceDestination(destination);
  const identityErrors = await existingIdentityErrors(target, record);
  if (identityErrors.length) throw new EvidenceValidationError(identityErrors);
  await mkdir(path.dirname(target), { recursive: true });
  await appendFile(target, `${canonicalJson}\n`, 'utf8');
  return { destination: target, canonicalJson };
}

export { schema as workflowEvidenceSchema };
