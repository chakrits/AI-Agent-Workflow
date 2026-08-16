import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  auditDigest,
  contentTreeDigest,
  contentTreePreimage,
  headDigest,
  manifestDigest,
  projectionDigest,
  setDigest,
  validateStatusAudit,
} from '../scripts/lib/status-audit.mjs';

const schema = JSON.parse(await readFile(
  path.join(process.cwd(), 'docs/contracts/schemas/status-audit.schema.json'),
  'utf8',
));
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
const digest = 'a'.repeat(64);
const digestB = 'b'.repeat(64);
const commit = 'c'.repeat(40);

function audit(overrides = {}) {
  return {
    schemaVersion: 'status-audit/v1',
    eventId: 'audit-0123456789abcdef0123456789abcdef',
    eventType: 'status_updated',
    workItem: {
      repository: 'chakrits/AI-Agent-Workflow',
      issueNumber: 133,
      issueKey: 'chakrits/AI-Agent-Workflow#133',
      issueUrl: 'https://github.com/chakrits/AI-Agent-Workflow/issues/133',
    },
    transaction: {
      transactionId: 'tx-0123456789abcdef0123456789abcdef',
      operation: 'update',
      expected: {
        commitSha: commit,
        manifestDigest: digest,
        setDigest: digest,
        headDigest: digest,
      },
      result: {
        contentTreeDigest: digestB,
        manifestDigest: digest,
        setDigest: digest,
        headDigest: digest,
        projectionDigest: digest,
      },
    },
    writer: {
      kind: 'local-cli',
      identity: 'maintainer@example.com',
      toolVersion: '1.2.3',
    },
    approval: {
      decision: 'approved',
      identity: 'maintainer@example.com',
      approvedAt: '2026-08-16T07:39:28Z',
      independent: false,
      evidence: 'https://github.com/chakrits/AI-Agent-Workflow/issues/133#issuecomment-5306360102',
    },
    changedPaths: [
      'docs/status/active/issue-133.yaml',
      'docs/status/manifest.yaml',
      'PROJECT_STATUS.md',
    ],
    reason: 'Record the approved status update.',
    createdAt: '2026-08-16T07:40:28Z',
    auditDigest: digestB,
    ...overrides,
  };
}

test('status-audit/v1 positive fixture satisfies schema and semantic validation', async () => {
  const fixture = JSON.parse(await readFile(
    'test/fixtures/status-audit/v1/valid.json',
    'utf8',
  ));
  assert.equal(validateSchema(fixture), true, JSON.stringify(validateSchema.errors));
  assert.deepEqual(validateStatusAudit(fixture), []);
  assert.equal(auditDigest(fixture), fixture.auditDigest);
});

test('status-audit rejects the obsolete treeDigest field', () => {
  const candidate = audit();
  candidate.transaction.result.treeDigest = candidate.transaction.result.contentTreeDigest;
  delete candidate.transaction.result.contentTreeDigest;
  assert.equal(validateSchema(candidate), false);
  assert.match(validateStatusAudit(candidate).join('\n'), /UNKNOWN_FIELD/);
});

test('status-audit rejects unsupported versions and closed-object unknown fields', () => {
  assert.match(validateStatusAudit(audit({ schemaVersion: 'status-audit/v2' })).join('\n'), /UNSUPPORTED_VERSION/);

  const candidate = audit();
  candidate.transaction.expected.extra = true;
  assert.equal(validateSchema(candidate), false);
  assert.match(validateStatusAudit(candidate).join('\n'), /UNKNOWN_FIELD/);
});

test('status-audit rejects malformed identity, digest, and timestamp values', () => {
  const cases = [
    ['eventId', { eventId: 'audit-ABC' }, /INVALID_ID/],
    ['transactionId', { transaction: { ...audit().transaction, transactionId: 'tx-short' } }, /INVALID_ID/],
    ['issue identity', { workItem: { ...audit().workItem, issueKey: 'owner/repo#0133' } }, /INVALID_ISSUE_IDENTITY/],
    ['commit SHA', { transaction: { ...audit().transaction, expected: { ...audit().transaction.expected, commitSha: 'A'.repeat(40) } } }, /INVALID_DIGEST/],
    ['digest', { transaction: { ...audit().transaction, result: { ...audit().transaction.result, headDigest: 'F'.repeat(64) } } }, /INVALID_DIGEST/],
    ['calendar date', { createdAt: '2026-02-30T07:40:28Z' }, /INVALID_TIMESTAMP/],
    ['offset', { createdAt: '2026-08-16T07:40:28+00:00' }, /INVALID_TIMESTAMP/],
    ['leap second', { createdAt: '2026-08-16T07:40:60Z' }, /INVALID_TIMESTAMP/],
  ];
  for (const [label, overrides, expected] of cases) {
    assert.match(validateStatusAudit(audit(overrides)).join('\n'), expected, label);
  }
});

test('status-audit requires the exact event and operation mapping', () => {
  const mappings = [
    ['status_created', 'create'],
    ['status_updated', 'update'],
    ['status_archived', 'archive'],
    ['rollback_requested', 'rollback'],
  ];
  for (const [eventType, operation] of mappings) {
    const candidate = audit({
      eventType,
      transaction: { ...audit().transaction, operation },
    });
    candidate.auditDigest = auditDigest(candidate);
    assert.deepEqual(validateStatusAudit(candidate), [], `${eventType}/${operation}`);
  }
  const mismatch = audit({
    eventType: 'status_archived',
    transaction: { ...audit().transaction, operation: 'update' },
  });
  assert.match(validateStatusAudit(mismatch).join('\n'), /EVENT_OPERATION_MISMATCH/);
});

test('status-audit requires explicit non-independent approval and ordered timestamps', () => {
  const missingFlag = audit();
  delete missingFlag.approval.independent;
  assert.match(validateStatusAudit(missingFlag).join('\n'), /INDEPENDENT_APPROVAL_REQUIRED/);

  const independent = audit({ approval: { ...audit().approval, independent: true } });
  assert.match(validateStatusAudit(independent).join('\n'), /INDEPENDENT_APPROVAL_REQUIRED/);

  const reversed = audit({ createdAt: '2026-08-16T07:39:27Z' });
  assert.match(validateStatusAudit(reversed).join('\n'), /TIMESTAMP_ORDER/);
});

test('status-audit rejects duplicate and non-canonical changed paths', () => {
  const duplicate = audit({ changedPaths: ['PROJECT_STATUS.md', 'PROJECT_STATUS.md'] });
  assert.match(validateStatusAudit(duplicate).join('\n'), /DUPLICATE_PATH/);

  for (const changedPath of ['/PROJECT_STATUS.md', 'docs/status/./manifest.yaml', 'docs\\status\\manifest.yaml', 'docs/status/../PROJECT_STATUS.md']) {
    const candidate = audit({ changedPaths: [changedPath] });
    assert.match(validateStatusAudit(candidate).join('\n'), /PATH_NOT_CANONICAL/, changedPath);
  }
});

test('auditDigest is dedicated, excludes only top-level auditDigest, and does not mutate input', () => {
  const candidate = audit({ recordDigest: digest });
  const before = structuredClone(candidate);
  const reordered = {
    auditDigest: 'f'.repeat(64),
    reason: candidate.reason,
    recordDigest: candidate.recordDigest,
    ...Object.fromEntries(Object.entries(candidate).filter(([key]) => !['auditDigest', 'reason', 'recordDigest'].includes(key))),
  };
  assert.equal(auditDigest(candidate), auditDigest(reordered));
  assert.notEqual(auditDigest(candidate), auditDigest({ ...candidate, recordDigest: 'e'.repeat(64) }));
  assert.deepEqual(candidate, before);
});

test('status-audit detects an audit preimage mismatch', () => {
  const candidate = audit({ auditDigest: 'f'.repeat(64) });
  assert.match(validateStatusAudit(candidate).join('\n'), /AUDIT_PREIMAGE_MISMATCH/);
});

test('contentTreeDigest uses sorted UTF-8 Git-blob records and excludes audit paths', () => {
  const entries = [
    { path: 'zeta.txt', bytes: Buffer.from('z') },
    { path: 'docs/records/status-audit/ignored.json', bytes: Buffer.from('must not contribute') },
    { path: 'é.txt', bytes: Buffer.from('e') },
  ];
  const before = entries.map(({ path: entryPath, bytes }) => ({ path: entryPath, bytes: Buffer.from(bytes) }));
  const expectedPreimage = contentTreePreimage([
    { path: 'zeta.txt', bytes: Buffer.from('z') },
    { path: 'é.txt', bytes: Buffer.from('e') },
  ]);
  assert.deepEqual(contentTreePreimage(entries), expectedPreimage);
  assert.equal(contentTreeDigest(entries), contentTreeDigest([...entries].reverse()));
  assert.equal(contentTreeDigest(entries), 'df3e425dec1ba06274a95db2364dfc7e66c769c9a5e3982ff1204fb1452ea45a');
  assert.deepEqual(entries, before);
});

test('contentTreeDigest rejects audit-only and empty input, while rejecting duplicate paths', () => {
  assert.throws(
    () => contentTreeDigest([{ path: 'docs/records/status-audit/only.json', bytes: '{}' }]),
    /EMPTY_CONTENT_TREE/,
  );
  assert.throws(() => contentTreeDigest([]), /EMPTY_CONTENT_TREE/);
  assert.throws(() => contentTreeDigest([
    { path: 'a.txt', bytes: 'a' },
    { path: 'a.txt', bytes: 'b' },
  ]), /DUPLICATE_PATH/);
});

test('status-audit digest preimages use the approved set, head, projection, and manifest rules', () => {
  const descriptors = [
    { issueKey: 'chakrits/AI-Agent-Workflow#2', path: 'docs/status/active/issue-2.yaml', recordDigest: 'b'.repeat(64) },
    { issueKey: 'chakrits/AI-Agent-Workflow#1', path: 'docs/status/active/issue-1.yaml', recordDigest: 'a'.repeat(64) },
  ];
  const sortedDescriptors = [...descriptors].sort((left, right) => left.issueKey.localeCompare(right.issueKey));
  assert.equal(setDigest(descriptors), setDigest(sortedDescriptors));
  const head = { schemaVersion: 'work-item-status/v1', activeIssueKeys: ['chakrits/AI-Agent-Workflow#1', 'chakrits/AI-Agent-Workflow#2'], setDigest: setDigest(descriptors) };
  assert.equal(headDigest(head), headDigest({ ...head, activeIssueKeys: [...head.activeIssueKeys] }));
  assert.equal(projectionDigest('a\r\nb\r\n'), projectionDigest('a\nb\n'));
  const manifest = { schemaVersion: 'status-manifest/v1', manifestDigest: 'f'.repeat(64), nested: { manifestDigest: 'keep-me' }, setDigest: head.setDigest };
  assert.equal(manifestDigest(manifest), manifestDigest({ ...manifest, manifestDigest: '0'.repeat(64) }));
});
