import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { stringify } from 'yaml';

import { computeRecordDigest, loadStatusFiles } from '../scripts/lib/status-loader.mjs';

function record(overrides = {}) {
  const value = {
    schemaVersion: 'work-item-status/v1',
    issue: {
      repository: 'chakrits/ai-agent-workflow',
      number: 133,
      url: 'https://github.com/chakrits/ai-agent-workflow/issues/133'
    },
    changeType: 'framework_meta',
    risk: 'medium',
    phase: 'phase:development',
    taskState: 'implementing',
    governingContract: 'feature-lifecycle',
    contractVersion: 'v1',
    owner: { kind: 'agent', id: 'developer-agent' },
    evidence: [{
      kind: 'sdd',
      url: 'docs/records/sdd/2026-07-31-issue-133-cp1-status.md',
      commit: '786df83',
      observedAt: '2026-07-31T01:00:00Z'
    }],
    active: true,
    createdAt: '2026-07-31T01:00:00Z',
    updatedAt: '2026-07-31T02:00:00Z',
    archivedAt: null,
    archiveReason: null,
    supersedesDigest: null,
    ...overrides
  };
  value.recordDigest = computeRecordDigest(value);
  return value;
}

async function fixtureFiles(records) {
  const directory = await mkdtemp(path.join(tmpdir(), 'status-loader-'));
  return Promise.all(records.map(async (value, index) => {
    const file = path.join(directory, `${index}.yaml`);
    await writeFile(file, stringify(value), 'utf8');
    return file;
  }));
}

test('loads valid records in deterministic identity and evidence order', async () => {
  const issue133 = record({
    evidence: [
      { kind: 'test', url: 'test/status-loader.test.mjs', digest: 'b'.repeat(64), observedAt: '2026-07-31T02:00:00Z' },
      { kind: 'sdd', url: 'docs/design.md', digest: 'a'.repeat(64), observedAt: '2026-07-31T01:00:00Z' }
    ]
  });
  issue133.recordDigest = computeRecordDigest(issue133);
  const issue12 = record({
    issue: {
      repository: 'acme/project',
      number: 12,
      url: 'https://github.com/acme/project/issues/12'
    }
  });
  issue12.recordDigest = computeRecordDigest(issue12);

  const files = await fixtureFiles([issue133, issue12]);
  const loaded = await loadStatusFiles(files);

  assert.deepEqual(loaded.map(({ issue }) => `${issue.repository}#${issue.number}`), [
    'acme/project#12',
    'chakrits/ai-agent-workflow#133'
  ]);
  assert.deepEqual(loaded[1].evidence.map(({ kind }) => kind), ['sdd', 'test']);
});

test('rejects missing required fields and unknown keys', async () => {
  const missingOwner = record();
  delete missingOwner.owner;
  missingOwner.recordDigest = computeRecordDigest(missingOwner);
  const unknownKey = record({ unexpected: true });
  unknownKey.recordDigest = computeRecordDigest(unknownKey);

  for (const value of [missingOwner, unknownKey]) {
    const [file] = await fixtureFiles([value]);
    await assert.rejects(loadStatusFiles([file]), /status validation failed/i);
  }
});

test('enforces identity, timestamp, archive, and digest constraints', async () => {
  const badDigest = record();
  badDigest.recordDigest = '0'.repeat(64);
  const invalidRecords = [
    record({ issue: { repository: 'chakrits/ai-agent-workflow', number: 133, url: 'https://github.com/acme/other/issues/133' } }),
    record({ updatedAt: '2026-07-30T23:00:00Z' }),
    record({ updatedAt: '2026-02-31T02:00:00Z' }),
    record({ archivedAt: '2026-07-31T03:00:00Z' }),
    record({ active: false }),
    badDigest
  ];

  for (const value of invalidRecords) {
    if (value.recordDigest !== '0'.repeat(64)) value.recordDigest = computeRecordDigest(value);
    const [file] = await fixtureFiles([value]);
    await assert.rejects(loadStatusFiles([file]), /status validation failed|digest mismatch/i);
  }
});

test('loads inactive archives by archivedAt then digest within identity', async () => {
  const archive = (archivedAt, reason) => {
    const value = record({
      active: false,
      archivedAt,
      archiveReason: reason,
      supersedesDigest: 'a'.repeat(64)
    });
    value.recordDigest = computeRecordDigest(value);
    return value;
  };
  const later = archive('2026-07-31T04:00:00Z', 'closed later');
  const earlier = archive('2026-07-31T03:00:00Z', 'closed earlier');
  const files = await fixtureFiles([later, earlier]);

  const loaded = await loadStatusFiles(files);
  assert.deepEqual(loaded.map(({ archivedAt }) => archivedAt), [
    '2026-07-31T03:00:00Z',
    '2026-07-31T04:00:00Z'
  ]);
});

test('rejects duplicate active identity even when filenames differ', async () => {
  const first = record();
  const second = record({ updatedAt: '2026-07-31T03:00:00Z' });
  second.recordDigest = computeRecordDigest(second);
  const files = await fixtureFiles([first, second]);

  await assert.rejects(loadStatusFiles(files), /duplicate active identity/i);
});

test('malformed, unsupported, and missing inputs fail closed', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'status-loader-'));
  const malformed = path.join(directory, 'malformed.yaml');
  await writeFile(malformed, 'issue: [unterminated', 'utf8');
  const unsupported = record({ schemaVersion: 'work-item-status/v2' });
  unsupported.recordDigest = computeRecordDigest(unsupported);
  const [unsupportedFile] = await fixtureFiles([unsupported]);

  await assert.rejects(loadStatusFiles([malformed]), /parse/i);
  await assert.rejects(loadStatusFiles([unsupportedFile]), /unsupported schema version/i);
  await assert.rejects(loadStatusFiles([path.join(directory, 'missing.yaml')]), /missing|ENOENT/i);
  await assert.rejects(loadStatusFiles([]), /missing expected status shard/i);
});
