import { createHash } from 'node:crypto';

const REPOSITORY = 'chakrits/AI-Agent-Workflow';
const AUDIT_PATH_PREFIX = 'docs/records/status-audit/';
const DIGEST_RE = /^[a-f0-9]{64}$/;
const COMMIT_RE = /^[a-f0-9]{40}$/;
const TRANSACTION_ID_RE = /^tx-[a-f0-9]{32}$/;
const IDENTITY_RE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
const TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/;
const encoder = new TextEncoder();

const EVENT_OPERATIONS = new Map([
  ['status_created', 'create'],
  ['status_updated', 'update'],
  ['status_archived', 'archive'],
  ['rollback_requested', 'rollback'],
]);

const TOP_LEVEL_FIELDS = new Set([
  'schemaVersion', 'eventId', 'eventType', 'workItem', 'transaction', 'writer',
  'approval', 'changedPaths', 'reason', 'createdAt', 'auditDigest',
]);
const WORK_ITEM_FIELDS = new Set(['repository', 'issueNumber', 'issueKey', 'issueUrl']);
const TRANSACTION_FIELDS = new Set(['transactionId', 'operation', 'expected', 'result']);
const EXPECTED_FIELDS = new Set(['commitSha', 'manifestDigest', 'setDigest', 'headDigest']);
const RESULT_FIELDS = new Set(['contentTreeDigest', 'manifestDigest', 'setDigest', 'headDigest', 'projectionDigest']);
const WRITER_FIELDS = new Set(['kind', 'identity', 'toolVersion']);
const APPROVAL_FIELDS = new Set(['decision', 'identity', 'approvedAt', 'independent', 'evidence']);

function addUnknownFields(value, fields, pathName, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!fields.has(key)) errors.push(`UNKNOWN_FIELD: ${pathName}.${key}`);
  }
}

function requireFields(value, fields, pathName, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`INVALID_TYPE: ${pathName}`);
    return;
  }
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) errors.push(`MISSING_FIELD: ${pathName}.${field}`);
  }
}

function validTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = TIMESTAMP_RE.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, fraction = ''] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.${fraction.slice(0, 3).padEnd(3, '0')}Z`);
  return Number.isFinite(date.getTime())
    && date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() + 1 === Number(month)
    && date.getUTCDate() === Number(day)
    && Number(hour) <= 23
    && Number(minute) <= 59
    && Number(second) <= 59;
}

function timestampKey(value) {
  const match = TIMESTAMP_RE.exec(value);
  const fraction = (match[7] ?? '').padEnd(9, '0').slice(0, 9);
  return `${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}${match[6]}${fraction}`;
}

function validRepositoryPath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.includes('\\')
    && !value.includes('\u0000')
    && !value.startsWith('/')
    && !value.endsWith('/')
    && value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function isAuditPath(value) {
  return value === AUDIT_PATH_PREFIX.slice(0, -1) || value.startsWith(AUDIT_PATH_PREFIX);
}

function isAllowedChangedPath(value) {
  return value === 'PROJECT_STATUS.md'
    || value === 'docs/status/manifest.yaml'
    || value.startsWith('docs/status/active/')
    || value.startsWith('docs/status/archive/')
    || isAuditPath(value);
}

function checkDigest(value, pathName, errors) {
  if (typeof value !== 'string' || !DIGEST_RE.test(value)) errors.push(`INVALID_DIGEST: ${pathName}`);
}

function checkTimestamp(value, pathName, errors) {
  if (!validTimestamp(value)) errors.push(`INVALID_TIMESTAMP: ${pathName}`);
}

function checkObject(value, fields, required, pathName, errors) {
  requireFields(value, required, pathName, errors);
  addUnknownFields(value, fields, pathName, errors);
}

export function validateStatusAudit(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['INVALID_TYPE: audit'];
  addUnknownFields(value, TOP_LEVEL_FIELDS, 'audit', errors);
  requireFields(value, TOP_LEVEL_FIELDS, 'audit', errors);

  if (value.schemaVersion !== 'status-audit/v1') errors.push('UNSUPPORTED_VERSION: schemaVersion');
  if (typeof value.eventId !== 'string' || !/^audit-[a-f0-9]{32}$/.test(value.eventId)) errors.push('INVALID_ID: eventId');
  if (!EVENT_OPERATIONS.has(value.eventType)) errors.push('INVALID_EVENT_TYPE: eventType');

  const workItem = value.workItem;
  checkObject(workItem, WORK_ITEM_FIELDS, WORK_ITEM_FIELDS, 'workItem', errors);
  if (workItem && typeof workItem === 'object' && !Array.isArray(workItem)) {
    if (workItem.repository !== REPOSITORY) errors.push('INVALID_ISSUE_IDENTITY: workItem.repository');
    if (!Number.isSafeInteger(workItem.issueNumber) || workItem.issueNumber < 1) errors.push('INVALID_ISSUE_IDENTITY: workItem.issueNumber');
    const expectedKey = `chakrits/AI-Agent-Workflow#${workItem.issueNumber}`;
    const expectedUrl = `https://github.com/chakrits/AI-Agent-Workflow/issues/${workItem.issueNumber}`;
    if (workItem.issueKey !== expectedKey) errors.push('INVALID_ISSUE_IDENTITY: workItem.issueKey');
    if (workItem.issueUrl !== expectedUrl) errors.push('INVALID_ISSUE_IDENTITY: workItem.issueUrl');
  }

  const transaction = value.transaction;
  checkObject(transaction, TRANSACTION_FIELDS, TRANSACTION_FIELDS, 'transaction', errors);
  if (transaction && typeof transaction === 'object' && !Array.isArray(transaction)) {
    if (typeof transaction.transactionId !== 'string' || !TRANSACTION_ID_RE.test(transaction.transactionId)) errors.push('INVALID_ID: transaction.transactionId');
    if (EVENT_OPERATIONS.get(value.eventType) !== transaction.operation) errors.push('EVENT_OPERATION_MISMATCH');

    const expected = transaction.expected;
    checkObject(expected, EXPECTED_FIELDS, EXPECTED_FIELDS, 'transaction.expected', errors);
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (typeof expected.commitSha !== 'string' || !COMMIT_RE.test(expected.commitSha)) errors.push('INVALID_DIGEST: transaction.expected.commitSha');
      for (const field of ['manifestDigest', 'setDigest', 'headDigest']) checkDigest(expected[field], `transaction.expected.${field}`, errors);
    }

    const result = transaction.result;
    checkObject(result, RESULT_FIELDS, RESULT_FIELDS, 'transaction.result', errors);
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      for (const field of RESULT_FIELDS) checkDigest(result[field], `transaction.result.${field}`, errors);
    }
  }

  const writer = value.writer;
  checkObject(writer, WRITER_FIELDS, WRITER_FIELDS, 'writer', errors);
  if (writer && typeof writer === 'object' && !Array.isArray(writer)) {
    if (writer.kind !== 'local-cli') errors.push('INVALID_WRITER: writer.kind');
    if (typeof writer.identity !== 'string' || !IDENTITY_RE.test(writer.identity)) errors.push('INVALID_IDENTITY: writer.identity');
    if (typeof writer.toolVersion !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(writer.toolVersion) || writer.toolVersion.length > 64) errors.push('INVALID_TOOL_VERSION: writer.toolVersion');
  }

  const approval = value.approval;
  checkObject(approval, APPROVAL_FIELDS, APPROVAL_FIELDS, 'approval', errors);
  if (approval && typeof approval === 'object' && !Array.isArray(approval)) {
    if (approval.decision !== 'approved') errors.push('INVALID_APPROVAL: approval.decision');
    if (typeof approval.identity !== 'string' || !IDENTITY_RE.test(approval.identity)) errors.push('INVALID_IDENTITY: approval.identity');
    checkTimestamp(approval.approvedAt, 'approval.approvedAt', errors);
    if (approval.independent !== false) errors.push('INDEPENDENT_APPROVAL_REQUIRED: approval.independent');
    if (typeof approval.evidence !== 'string' || !/^https:\/\/\S+$/.test(approval.evidence)) errors.push('INVALID_EVIDENCE: approval.evidence');
  }

  if (!Array.isArray(value.changedPaths) || value.changedPaths.length === 0) {
    errors.push('INVALID_CHANGED_PATHS: changedPaths');
  } else {
    const seen = new Set();
    for (const changedPath of value.changedPaths) {
      if (!validRepositoryPath(changedPath)) errors.push(`PATH_NOT_CANONICAL: ${changedPath}`);
      if (seen.has(changedPath)) errors.push(`DUPLICATE_PATH: ${changedPath}`);
      seen.add(changedPath);
      if (validRepositoryPath(changedPath) && !isAllowedChangedPath(changedPath)) errors.push(`PATH_NOT_ALLOWLISTED: ${changedPath}`);
    }
  }

  if (typeof value.reason !== 'string' || value.reason.length === 0) errors.push('INVALID_REASON: reason');
  checkTimestamp(value.createdAt, 'createdAt', errors);
  checkDigest(value.auditDigest, 'auditDigest', errors);
  if (typeof value.auditDigest === 'string' && DIGEST_RE.test(value.auditDigest)) {
    try {
      if (auditDigest(value) !== value.auditDigest) errors.push('AUDIT_PREIMAGE_MISMATCH');
    } catch {
      errors.push('AUDIT_PREIMAGE_MISMATCH');
    }
  }
  if (validTimestamp(value.createdAt) && validTimestamp(approval?.approvedAt) && timestampKey(approval.approvedAt) > timestampKey(value.createdAt)) errors.push('TIMESTAMP_ORDER: approvedAt after createdAt');

  return errors;
}

function assertJcsString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) throw new TypeError('AUDIT_JCS_DOMAIN');
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError('AUDIT_JCS_DOMAIN');
    }
  }
}

function assertJcsDomain(value, seen = new WeakSet(), depth = 0) {
  if (typeof value === 'string') {
    assertJcsString(value);
    return;
  }
  if (typeof value === 'boolean' || value === null) return;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new TypeError('AUDIT_JCS_DOMAIN');
    return;
  }
  if (!value || typeof value !== 'object' || depth > 16 || seen.has(value)) throw new TypeError('AUDIT_JCS_DOMAIN');
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) assertJcsDomain(item, seen, depth + 1);
  } else {
    for (const key of Object.keys(value)) {
      assertJcsString(key);
      assertJcsDomain(value[key], seen, depth + 1);
    }
  }
}

function serializeJcs(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(serializeJcs).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${serializeJcs(value[key])}`).join(',')}}`;
}

export function canonicalJcsBytes(value) {
  assertJcsDomain(value);
  return Buffer.from(encoder.encode(serializeJcs(value)));
}

export function canonicalAuditBytes(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('AUDIT_JCS_DOMAIN');
  const preimage = {};
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'auditDigest') preimage[key] = child;
  }
  return canonicalJcsBytes(preimage);
}

export function auditDigest(value) {
  return createHash('sha256').update(canonicalAuditBytes(value)).digest('hex');
}

function candidateBytes(value) {
  if (typeof value === 'string') return Buffer.from(encoder.encode(value));
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new TypeError('INVALID_CANDIDATE_BYTES');
}

function gitBlobSha1(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function contentTreePreimage(entries) {
  if (!entries || typeof entries[Symbol.iterator] !== 'function') throw new TypeError('EMPTY_CONTENT_TREE');
  const records = [];
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !validRepositoryPath(entry.path)) throw new TypeError('PATH_NOT_CANONICAL');
    if (seen.has(entry.path)) throw new TypeError('DUPLICATE_PATH');
    seen.add(entry.path);
    const bytes = candidateBytes(entry.bytes);
    if (isAuditPath(entry.path)) continue;
    records.push({ path: entry.path, blobSha: gitBlobSha1(bytes) });
  }
  if (records.length === 0) throw new TypeError('EMPTY_CONTENT_TREE');
  records.sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));
  return Buffer.from(records.map(({ path: entryPath, blobSha }) => `${entryPath}\0${blobSha}\0`).join(''), 'utf8');
}

export function contentTreeDigest(entries) {
  return createHash('sha256').update(contentTreePreimage(entries)).digest('hex');
}

function descriptorKey(descriptor) {
  return `${descriptor.issueKey}\u0000${descriptor.path}`;
}

export function setDigestPreimage(descriptors) {
  if (!Array.isArray(descriptors)) throw new TypeError('INVALID_SET_PREIMAGE');
  const seen = new Set();
  const normalized = descriptors.map((descriptor) => {
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) throw new TypeError('INVALID_SET_PREIMAGE');
    const keys = Object.keys(descriptor).sort();
    if (keys.join(',') !== 'issueKey,path,recordDigest') throw new TypeError('INVALID_SET_PREIMAGE');
    if (typeof descriptor.issueKey !== 'string' || descriptor.issueKey.length === 0 || !validRepositoryPath(descriptor.path) || !DIGEST_RE.test(descriptor.recordDigest)) throw new TypeError('INVALID_SET_PREIMAGE');
    const key = descriptorKey(descriptor);
    if (seen.has(key)) throw new TypeError('DUPLICATE_SET_DESCRIPTOR');
    seen.add(key);
    return { issueKey: descriptor.issueKey, path: descriptor.path, recordDigest: descriptor.recordDigest };
  });
  normalized.sort((left, right) => {
    const issueOrder = Buffer.compare(Buffer.from(left.issueKey), Buffer.from(right.issueKey));
    return issueOrder || Buffer.compare(Buffer.from(left.path), Buffer.from(right.path));
  });
  return canonicalJcsBytes(normalized);
}

export function setDigest(descriptors) {
  return createHash('sha256').update(setDigestPreimage(descriptors)).digest('hex');
}

export function headDigestPreimage({ schemaVersion, activeIssueKeys, setDigest: setValue }) {
  if (schemaVersion !== 'work-item-status/v1' || !Array.isArray(activeIssueKeys) || !DIGEST_RE.test(setValue)) throw new TypeError('INVALID_HEAD_PREIMAGE');
  const keys = [...activeIssueKeys];
  if (keys.some((key) => typeof key !== 'string' || key.length === 0)) throw new TypeError('INVALID_HEAD_PREIMAGE');
  const sorted = [...keys].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  if (new Set(sorted).size !== sorted.length || sorted.some((key, index) => key !== keys[index])) throw new TypeError('NON_CANONICAL_HEAD_KEYS');
  return canonicalJcsBytes({ schemaVersion, activeIssueKeys: sorted, setDigest: setValue });
}

export function headDigest(value) {
  return createHash('sha256').update(headDigestPreimage(value)).digest('hex');
}

export function projectionDigestPreimage(value) {
  if (typeof value !== 'string') throw new TypeError('INVALID_PROJECTION_BYTES');
  return Buffer.from(`${value.replace(/\r\n?/g, '\n').replace(/\n*$/, '')}\n`, 'utf8');
}

export function projectionDigest(value) {
  return createHash('sha256').update(projectionDigestPreimage(value)).digest('hex');
}

export function manifestDigestPreimage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('INVALID_MANIFEST_PREIMAGE');
  const preimage = {};
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'manifestDigest') preimage[key] = child;
  }
  return canonicalJcsBytes(preimage);
}

export function manifestDigest(value) {
  return createHash('sha256').update(manifestDigestPreimage(value)).digest('hex');
}

export const computeAuditDigest = auditDigest;
export const computeContentTreeDigest = contentTreeDigest;
export const buildContentTreePreimage = contentTreePreimage;
export const validateStatusAuditRecord = validateStatusAudit;
export const computeSetDigest = setDigest;
export const buildSetDigestPreimage = setDigestPreimage;
export const computeHeadDigest = headDigest;
export const buildHeadDigestPreimage = headDigestPreimage;
export const computeProjectionDigest = projectionDigest;
export const computeManifestDigest = manifestDigest;
export const buildManifestDigestPreimage = manifestDigestPreimage;
