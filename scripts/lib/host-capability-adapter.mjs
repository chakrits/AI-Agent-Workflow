import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { validateEvidenceRecord } from './workflow-evidence.mjs';

const HOSTS = Object.freeze(['Codex', 'Claude', 'Gemini', 'Cursor', 'Antigravity']);
const TOKEN_MEASUREMENT_STATUSES = Object.freeze(['available', 'unsupported', 'unavailable', 'N/A']);
const CAPABILITY_DECISIONS = Object.freeze(['unknown', 'supported', 'unsupported', 'unavailable', 'N/A']);
const EVIDENCE_CLASSES = Object.freeze(['host_native', 'repository_simulation']);
const WAIT_POLICIES = Object.freeze(['bounded_deadline', 'operator_wait', 'host_managed']);
const TERMINAL_STATUSES = Object.freeze([
  'success',
  'failure',
  'inconclusive',
  'cancelled',
  'timed_out',
  'host_completion_unavailable',
]);
const CAPABILITY_FIELDS = Object.freeze([
  'host',
  'hostOwner',
  'adapterVersion',
  'activationEvidenceRef',
  'tokenEvidenceRef',
  'tokenMeasurementStatus',
  'observedAt',
  'capabilityDecision',
]);
const MEASUREMENT_FIELDS = Object.freeze([
  'measurementId',
  'host',
  'adapterVersion',
  'observedAt',
  'tokenMeasurementStatus',
  'tokenEvidenceRef',
  'waitPolicy',
  'terminalOutcome',
]);
const TERMINAL_FIELDS = Object.freeze(['status', 'resultId', 'observedAt']);
const FORBIDDEN_OWNER_VALUES = new Set(['anonymous', 'unknown', 'n/a', 'N/A']);
const MUTABLE_VERSION_VALUES = new Set(['current', 'latest', 'main', 'head']);
const CANONICAL_EVIDENCE_REFERENCE = /^docs\/records\/[A-Za-z0-9][A-Za-z0-9._/-]*#[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const isPlainObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;

function clone(value, label) {
  try {
    return structuredClone(value);
  } catch (error) {
    throw new TypeError(`host adapter error: ${label} is not cloneable: ${error.message}`);
  }
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUtcTimestamp(value) {
  if (!nonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/).map(Number);
  return date.getUTCFullYear() === match[1]
    && date.getUTCMonth() + 1 === match[2]
    && date.getUTCDate() === match[3]
    && date.getUTCHours() === match[4]
    && date.getUTCMinutes() === match[5]
    && date.getUTCSeconds() === match[6];
}

function isSimulationReference(ref) {
  if (!nonEmptyString(ref)) return false;
  const normalized = ref.toLowerCase();
  return normalized.startsWith('fixture:')
    || normalized.includes('/fixtures/')
    || normalized.includes('context-pack')
    || normalized.includes('simulation');
}

function resolveEvidenceReference(ref, rootDir = process.cwd()) {
  if (typeof rootDir !== 'string' || !nonEmptyString(ref) || !CANONICAL_EVIDENCE_REFERENCE.test(ref)) return false;
  const [relativePath, fragment] = ref.split('#');
  const pathSegments = relativePath.split('/');
  if (pathSegments.some((segment) => segment === '.' || segment === '..')) return false;
  const recordsRoot = path.resolve(rootDir, 'docs/records');
  const absolutePath = path.resolve(rootDir, relativePath);
  if (absolutePath !== recordsRoot && !absolutePath.startsWith(`${recordsRoot}${path.sep}`)) return false;
  if (!existsSync(absolutePath) || fragment.length === 0) return false;
  let content;
  try {
    content = readFileSync(absolutePath, 'utf8');
  } catch {
    return false;
  }
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map(([, heading]) => heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''));
  return headings.includes(fragment.toLowerCase());
}

function evidenceClassFor(evidence) {
  if (typeof evidence === 'string') return null;
  return isPlainObject(evidence) ? evidence.class ?? evidence.source : null;
}

function evidenceRefFor(evidence) {
  if (typeof evidence === 'string') return evidence;
  return isPlainObject(evidence) ? evidence.ref : null;
}

function validateEvidenceReference(ref, label, errors, rootDir = process.cwd()) {
  if (!nonEmptyString(ref)) {
    errors.push(`${label} must be a non-empty addressable evidence reference`);
    return;
  }
  if (isSimulationReference(ref)) {
    errors.push(`${label} cannot be fixture or simulation evidence`);
  } else if (!resolveEvidenceReference(ref, rootDir)) {
    errors.push(`${label} must be a canonical, resolvable docs/records reference`);
  }
}

function validateEvidenceClass(evidence, label, errors) {
  const evidenceClass = evidenceClassFor(evidence);
  if (evidence !== undefined && evidence !== null && !EVIDENCE_CLASSES.includes(evidenceClass)) {
    errors.push(`${label} must identify host_native or repository_simulation evidence`);
  }
  if (evidenceClass === 'repository_simulation') errors.push(`${label} cannot be simulation evidence`);
}

function validateEvidenceBinding(evidence, expectedRef, label, errors) {
  if (!isPlainObject(evidence)) return;
  if (evidence.ref !== expectedRef) errors.push(`${label} reference does not match the capability record`);
  if (evidence.valid === false || evidence.stale === true || evidence.addressable === false) {
    errors.push(`${label} reference is stale or not addressable`);
  }
}

function validateNativeEvidenceObject(evidence, expectedRef, label, errors, rootDir, expectedStatus = null) {
  if (!isPlainObject(evidence)) {
    errors.push(`${label} evidence object is required for native verification`);
    return;
  }
  if (!nonEmptyString(evidence.evidenceId)) errors.push(`${label} evidenceId is required`);
  if (evidence.class !== 'host_native') errors.push(`${label} must be host_native evidence`);
  if (evidence.ref !== expectedRef) errors.push(`${label} reference does not match the capability record`);
  validateEvidenceReference(evidence.ref, `${label}.ref`, errors, rootDir);
  const fragment = evidence.ref?.split('#')[1];
  if (nonEmptyString(evidence.evidenceId) && evidence.evidenceId !== fragment) {
    errors.push(`${label} evidenceId must match the reference fragment`);
  }
  if (evidence.valid === false || evidence.stale === true || evidence.addressable === false) {
    errors.push(`${label} is stale or not addressable`);
  }
  if (expectedStatus !== null && evidence.status !== undefined && evidence.status !== expectedStatus) {
    errors.push(`${label} status must match tokenMeasurementStatus`);
  }
}

function exactFields(value, fields, label, optional = []) {
  const actual = Object.keys(value ?? {});
  const expected = new Set([...fields, ...optional]);
  return [
    ...fields.filter((field) => !actual.includes(field)).map((field) => `${label}: missing field ${field}`),
    ...actual.filter((field) => !expected.has(field)).map((field) => `${label}: unknown field ${field}`),
  ];
}

function validateCapabilityShape(record, options = {}) {
  const errors = [];
  if (!isPlainObject(record)) return ['$ capability record must be a plain JSON object'];
  const rootDir = options.rootDir ?? process.cwd();
  errors.push(...exactFields(record, CAPABILITY_FIELDS, 'capability record', ['reason']));
  if (!HOSTS.includes(record.host)) errors.push('capability record: host must be one of the closed host identities');
  if (!nonEmptyString(record.hostOwner) || FORBIDDEN_OWNER_VALUES.has(record.hostOwner)) {
    errors.push('capability record: hostOwner must be a named Human or host owner');
  }
  if (!nonEmptyString(record.adapterVersion) || MUTABLE_VERSION_VALUES.has(record.adapterVersion.toLowerCase())) {
    errors.push('capability record: adapterVersion must be an immutable non-empty version');
  }
  validateEvidenceReference(record.activationEvidenceRef, 'capability record: activationEvidenceRef', errors, rootDir);
  validateEvidenceReference(record.tokenEvidenceRef, 'capability record: tokenEvidenceRef', errors, rootDir);
  if (!TOKEN_MEASUREMENT_STATUSES.includes(record.tokenMeasurementStatus)) {
    errors.push('capability record: tokenMeasurementStatus is invalid');
  }
  if (!isUtcTimestamp(record.observedAt)) errors.push('capability record: observedAt must be a valid UTC ISO-8601 timestamp');
  if (!CAPABILITY_DECISIONS.includes(record.capabilityDecision)) {
    errors.push('capability record: capabilityDecision is invalid');
  }
  if (record.capabilityDecision !== 'supported' && !nonEmptyString(record.reason)) {
    errors.push('capability record: reason is required for a non-supported decision');
  }
  if (record.capabilityDecision === 'supported') {
    if (record.tokenMeasurementStatus !== 'available') errors.push('capability record: supported requires available token measurement');
    validateNativeEvidenceObject(options.activationEvidence, record.activationEvidenceRef, 'capability record: activationEvidence', errors, rootDir);
    validateNativeEvidenceObject(options.tokenEvidence, record.tokenEvidenceRef, 'capability record: tokenEvidence', errors, rootDir, 'available');
  } else {
    if (options.activationEvidence) validateNativeEvidenceObject(options.activationEvidence, record.activationEvidenceRef, 'capability record: activationEvidence', errors, rootDir);
    if (options.tokenEvidence) validateNativeEvidenceObject(options.tokenEvidence, record.tokenEvidenceRef, 'capability record: tokenEvidence', errors, rootDir, record.tokenMeasurementStatus);
  }
  validateEvidenceClass(options.activationEvidence, 'capability record: activationEvidence', errors);
  validateEvidenceClass(options.tokenEvidence, 'capability record: tokenEvidence', errors);
  validateEvidenceBinding(options.activationEvidence, record.activationEvidenceRef, 'capability record: activationEvidence', errors);
  validateEvidenceBinding(options.tokenEvidence, record.tokenEvidenceRef, 'capability record: tokenEvidence', errors);
  if (options.activationEvidenceClass === 'repository_simulation' || options.tokenEvidenceClass === 'repository_simulation') {
    errors.push('capability record: simulation evidence cannot mark a host supported');
  }
  return [...new Set(errors)];
}

export function validateCapabilityRecord(record, options = {}) {
  return validateCapabilityShape(record, options);
}

function capabilityFromInput(input) {
  if (isPlainObject(input.capabilityRecord)) return clone(input.capabilityRecord, 'capability record');
  const activationEvidenceRef = evidenceRefFor(input.activationEvidence);
  const tokenEvidenceRef = evidenceRefFor(input.tokenEvidence);
  const tokenMeasurementStatus = isPlainObject(input.tokenEvidence)
    ? input.tokenEvidence.status
    : input.tokenMeasurementStatus;
  const defaultDecision = tokenMeasurementStatus === 'unsupported'
    ? 'unsupported'
    : tokenMeasurementStatus === 'unavailable'
      ? 'unavailable'
      : tokenMeasurementStatus === 'N/A'
        ? 'N/A'
        : 'unknown';
  return {
    host: input.host,
    hostOwner: input.hostOwner,
    adapterVersion: input.adapterVersion,
    activationEvidenceRef,
    tokenEvidenceRef,
    tokenMeasurementStatus,
    observedAt: input.observedAt,
    capabilityDecision: input.capabilityDecision ?? defaultDecision,
    ...(nonEmptyString(input.reason) ? { reason: input.reason } : {}),
  };
}

function fallback(capabilityRecord, errors, legacyResult = undefined) {
  const reason = errors.join('; ');
  const safeCapabilityRecord = isPlainObject(capabilityRecord)
    ? { ...clone(capabilityRecord, 'capability record'), capabilityDecision: capabilityRecord.capabilityDecision === 'supported' ? 'unknown' : capabilityRecord.capabilityDecision }
    : clone(capabilityRecord, 'capability record');
  if (safeCapabilityRecord.capabilityDecision === 'unknown' && !nonEmptyString(safeCapabilityRecord.reason)) {
    safeCapabilityRecord.reason = reason;
  }
  return {
    status: 'fallback',
    authority: 'legacy',
    mutationAttempted: false,
    capabilityRecord: safeCapabilityRecord,
    result: legacyResult === undefined ? null : clone(legacyResult, 'legacy result'),
    legacyResult: legacyResult === undefined ? null : clone(legacyResult, 'legacy result'),
    reason,
    errors: [...errors],
    evidence: {
      eventType: 'shadow_fallback',
      authority: 'shadow',
      reason,
      attributes: {
        fallback_used: true,
        fallback_reason: reason,
        legacy_path: 'legacy-context-loader',
      },
    },
  };
}

export function evaluateHostCapability(input) {
  if (!isPlainObject(input)) return fallback({}, ['$ input must be a plain JSON object']);
  const capabilityRecord = capabilityFromInput(input);
  const activationClass = evidenceClassFor(input.activationEvidence) ?? input.activationEvidenceClass;
  const tokenClass = evidenceClassFor(input.tokenEvidence) ?? input.tokenEvidenceClass;
  const errors = validateCapabilityShape(capabilityRecord, {
    activationEvidence: input.activationEvidence,
    tokenEvidence: input.tokenEvidence,
    rootDir: input.rootDir,
  });
  if (activationClass && activationClass !== 'host_native') errors.push('capability record: activation evidence must be host_native');
  if (tokenClass && tokenClass !== 'host_native') errors.push('capability record: token evidence must be host_native');
  if (capabilityRecord.capabilityDecision === 'supported'
    && (!input.activationEvidence || !input.tokenEvidence)) {
    errors.push('capability record: caller-provided supported flag is not native evidence');
  }
  if (errors.length) {
    const safeRecord = isPlainObject(capabilityRecord)
      ? { ...capabilityRecord, capabilityDecision: 'unknown', reason: errors.join('; ') }
      : {};
    return fallback(safeRecord, errors);
  }
  return {
    status: 'accepted',
    authority: 'legacy',
    mutationAttempted: false,
    capabilityRecord: clone(capabilityRecord, 'capability record'),
    reason: capabilityRecord.reason ?? null,
    errors: [],
  };
}

function validateTerminalOutcome(outcome) {
  const errors = [];
  if (!isPlainObject(outcome)) return ['terminalOutcome must be a plain JSON object'];
  errors.push(...exactFields(outcome, TERMINAL_FIELDS, 'terminalOutcome', ['reason']));
  if (!TERMINAL_STATUSES.includes(outcome.status)) errors.push('terminalOutcome: status is invalid');
  if (!nonEmptyString(outcome.resultId)) errors.push('terminalOutcome: resultId is required');
  if (!isUtcTimestamp(outcome.observedAt)) errors.push('terminalOutcome: observedAt must be a valid UTC ISO-8601 timestamp');
  if (outcome.status !== 'success' && !nonEmptyString(outcome.reason)) errors.push('terminalOutcome: reason is required for a non-success outcome');
  return errors;
}

export function validateHostMeasurement(measurement, capabilityRecord) {
  const errors = [];
  if (!isPlainObject(measurement)) return ['$ measurement must be a plain JSON object'];
  errors.push(...exactFields(measurement, MEASUREMENT_FIELDS, 'measurement'));
  if (!nonEmptyString(measurement.measurementId)) errors.push('measurement: measurementId is required');
  if (!HOSTS.includes(measurement.host)) errors.push('measurement: host is invalid');
  if (!nonEmptyString(measurement.adapterVersion)) errors.push('measurement: adapterVersion is required');
  if (!isUtcTimestamp(measurement.observedAt)) errors.push('measurement: observedAt must be a valid UTC ISO-8601 timestamp');
  if (!TOKEN_MEASUREMENT_STATUSES.includes(measurement.tokenMeasurementStatus)) errors.push('measurement: tokenMeasurementStatus is invalid');
  validateEvidenceReference(measurement.tokenEvidenceRef, 'measurement: tokenEvidenceRef', errors);
  if (!WAIT_POLICIES.includes(measurement.waitPolicy)) errors.push('measurement: waitPolicy is invalid');
  errors.push(...validateTerminalOutcome(measurement.terminalOutcome));
  if (isPlainObject(capabilityRecord)) {
    if (measurement.host !== capabilityRecord.host) errors.push('measurement: host must match capability record');
    if (measurement.adapterVersion !== capabilityRecord.adapterVersion) errors.push('measurement: adapterVersion must match capability record');
    if (measurement.tokenMeasurementStatus !== capabilityRecord.tokenMeasurementStatus) errors.push('measurement: tokenMeasurementStatus must match capability record');
    if (capabilityRecord.capabilityDecision !== 'supported') errors.push('measurement: capability record is not supported');
  }
  return [...new Set(errors)];
}

export function preserveTerminalOutcome({ waitPolicy, terminalOutcome }) {
  if (!WAIT_POLICIES.includes(waitPolicy)) throw new TypeError('host adapter: waitPolicy is invalid');
  const errors = validateTerminalOutcome(terminalOutcome);
  if (errors.length) throw new TypeError(`host adapter: invalid terminal outcome: ${errors.join('; ')}`);
  return { waitPolicy, terminalOutcome: clone(terminalOutcome, 'terminal outcome') };
}

export function recordHostMeasurement({
  capabilityRecord,
  measurement,
  legacyResult,
  activationEvidence,
  tokenEvidence,
}) {
  const capabilityErrors = validateCapabilityRecord(capabilityRecord, {
    activationEvidence,
    tokenEvidence,
    rootDir: process.cwd(),
  });
  if (capabilityRecord?.capabilityDecision === 'supported' && (!activationEvidence || !tokenEvidence)) {
    capabilityErrors.push('capability record: native activation and token evidence are required before measurement');
  }
  const measurementErrors = validateHostMeasurement(measurement, capabilityRecord);
  const errors = [...capabilityErrors, ...measurementErrors];
  if (errors.length) return fallback(capabilityRecord, errors, legacyResult);
  return {
    status: 'measured',
    authority: 'legacy',
    mutationAttempted: false,
    result: clone(legacyResult, 'legacy result'),
    legacyResult: clone(legacyResult, 'legacy result'),
    capabilityRecord: clone(capabilityRecord, 'capability record'),
    measurement: clone(measurement, 'measurement'),
    evidence: {
      contextLoaded: {
        host: measurement.host,
        measurementId: measurement.measurementId,
        observedAt: measurement.observedAt,
        tokenMeasurementStatus: measurement.tokenMeasurementStatus,
      },
    },
  };
}

export function validateApprovedHumanApprovalEvidence(record, capabilityRecordRef) {
  const errors = [...validateEvidenceRecord(record)];
  if (record?.event_type !== 'human_approval') errors.push('human approval evidence must reuse event_type human_approval');
  if (record?.attributes?.decision !== 'approved') errors.push('human approval evidence must have decision approved');
  if (record?.evidence_ref !== capabilityRecordRef) errors.push('human approval evidence_ref must reference the host capability record');
  return [...new Set(errors)];
}

export {
  CAPABILITY_DECISIONS,
  CAPABILITY_FIELDS,
  HOSTS,
  MEASUREMENT_FIELDS,
  TERMINAL_STATUSES,
  TOKEN_MEASUREMENT_STATUSES,
  WAIT_POLICIES,
};
