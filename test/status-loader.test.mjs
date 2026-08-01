import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { stringify } from 'yaml';

import { canonicalizeJcs, digestJcs } from '../scripts/lib/status-jcs.mjs';
import { parseStatusBytes, STATUS_LIMITS } from '../scripts/lib/status-parser.mjs';
import { computeRecordDigest, loadStatusFiles } from '../scripts/lib/status-loader.mjs';

function rejectsCode(code) {
  return (error) => error?.code === code && !/token|secret|password/i.test(error.message);
}

test('bounded parser applies raw and UTF-8 precedence before YAML conversion', () => {
  assert.throws(
    () => parseStatusBytes(Buffer.alloc(STATUS_LIMITS.rawFileBytes + 1, 0xff), 'oversize.yaml'),
    rejectsCode('RAW_FILE_LIMIT')
  );
  assert.throws(() => parseStatusBytes(Buffer.from([0xff]), 'invalid.yaml'), rejectsCode('INVALID_UTF8'));
  assert.throws(() => parseStatusBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x61]), 'bom.yaml'), rejectsCode('INVALID_UTF8'));
});

test('bounded parser rejects forbidden YAML features before generic parse errors', () => {
  for (const source of [
    'a: &anchor 1\nb: *anchor\n',
    'base: &base {a: 1}\nvalue: {<<: *base}\n',
    'value: !custom payload\n',
    '%YAML 1.2\n---\nvalue: 1\n',
    'value: 1\nvalue: 2\n',
    '? [complex]\n: value\n',
    '---\na: 1\n---\nb: 2\n'
  ]) {
    assert.throws(() => parseStatusBytes(Buffer.from(source), 'forbidden.yaml'), rejectsCode('FORBIDDEN_YAML_FEATURE'));
  }
  assert.throws(() => parseStatusBytes(Buffer.from('value: [unterminated'), 'parse.yaml'), rejectsCode('YAML_PARSE_ERROR'));
});

test('bounded parser enforces JSON numbers, nodes, and iterative container depth', () => {
  for (const source of ['value: -0\n', 'value: 1.5\n', 'value: 1e400\n', 'value: 9007199254740992\n']) {
    assert.throws(() => parseStatusBytes(Buffer.from(source), 'number.yaml'), rejectsCode('JSON_DOMAIN_ERROR'));
  }
  let depth16Value = { value: 1 };
  for (let index = 1; index < 16; index += 1) depth16Value = { child: depth16Value };
  const depth16 = JSON.stringify(depth16Value);
  assert.doesNotThrow(() => parseStatusBytes(Buffer.from(depth16), 'depth-16.yaml'));
  const depth17 = JSON.stringify({ child: depth16Value });
  assert.throws(() => parseStatusBytes(Buffer.from(depth17), 'depth-17.yaml'), rejectsCode('CONTAINER_DEPTH_LIMIT'));
  const tooManyNodes = `values: [${Array.from({ length: 10_001 }, () => 'null').join(',')}]`;
  assert.throws(() => parseStatusBytes(Buffer.from(tooManyNodes), 'nodes.yaml'), rejectsCode('NODE_LIMIT'));
});

test('normative JCS matches frozen UTF-8 and digest vectors without mutation', () => {
  const vectors = [
    [{ n: 0, s: 'é', u: '😀' }, '{"n":0,"s":"é","u":"😀"}', '903bf2f2ba8236df38cea14ea59fa43b0d0d564a3d97a6065f45f783e5ecac0b'],
    [{ max: 9007199254740991, min: -9007199254740991 }, '{"max":9007199254740991,"min":-9007199254740991}', '63546eb60913dcb1cdd5118f7bf4885beed344af930c8a9d5f38fad243fd4819']
  ];
  for (const [value, canonical, digest] of vectors) {
    assert.equal(canonicalizeJcs(value).toString('utf8'), canonical);
    assert.equal(digestJcs(value), digest);
  }
  const record = { evidence: [
    { kind: 'é', url: 'a', digest: '', commit: '', observedAt: '2026-08-01T00:00:00Z' },
    { kind: 'a', url: 'z', digest: '', commit: '', observedAt: '2026-08-01T00:00:00Z' }
  ] };
  const before = structuredClone(record);
  assert.equal(digestJcs(record), 'e5ac81d780e5c913b183400fb612c8d81ce280ca7121ed0ea694ebeb6492cf56');
  assert.deepEqual(record, before);
});

test('normative JCS rejects invalid numbers, strings, and oversized preimages', () => {
  for (const value of [-0, 1.5, Infinity, NaN, 9007199254740992, '\ud800']) {
    assert.throws(() => canonicalizeJcs({ value }), rejectsCode('JSON_DOMAIN_ERROR'));
  }
  assert.throws(
    () => canonicalizeJcs({ value: 'x'.repeat(STATUS_LIMITS.canonicalBytes) }),
    rejectsCode('CANONICAL_SIZE_LIMIT')
  );
});

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
    governingContract: 'new-feature',
    contractVersion: '1',
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

test('derives legal contract versions and task states from canonical workflow contracts', async () => {
  const legal = [
    ['new-feature', '1', 'implementing', 'phase:development'],
    ['bug-fix', '1', 'investigating', 'phase:not_applicable'],
    ['config-change', '1', 'monitoring', 'phase:not_applicable'],
    ['data-change', '1', 'validating', 'phase:not_applicable']
  ].map(([governingContract, contractVersion, taskState, phase], number) => record({
    issue: {
      repository: 'chakrits/ai-agent-workflow',
      number: number + 1,
      url: `https://github.com/chakrits/ai-agent-workflow/issues/${number + 1}`
    },
    governingContract,
    contractVersion,
    taskState,
    phase
  }));
  for (const value of legal) value.recordDigest = computeRecordDigest(value);
  const legalFiles = await fixtureFiles(legal);
  assert.equal((await loadStatusFiles(legalFiles)).length, 4);

  for (const overrides of [
    { governingContract: 'feature-lifecycle' },
    { contractVersion: 'v2' },
    { taskState: 'invented-state' },
    { governingContract: 'bug-fix', taskState: 'planning' }
  ]) {
    const value = record(overrides);
    value.recordDigest = computeRecordDigest(value);
    const [file] = await fixtureFiles([value]);
    await assert.rejects(loadStatusFiles([file]), /contract|version|task state/i);
  }
});

test('enforces canonical lifecycle phase for governing contract and task state', async () => {
  const valid = [
    record({ taskState: 'discovery', phase: 'phase:requirements' }),
    record({ taskState: 'designing', phase: 'phase:design' }),
    record({ taskState: 'verifying', phase: 'phase:verification' }),
    record({ governingContract: 'bug-fix', taskState: 'investigating', phase: 'phase:not_applicable' })
  ];
  for (const value of valid) value.recordDigest = computeRecordDigest(value);
  for (const value of valid) {
    const [file] = await fixtureFiles([value]);
    assert.equal((await loadStatusFiles([file])).length, 1);
  }

  for (const overrides of [
    { governingContract: 'bug-fix', taskState: 'investigating', phase: 'phase:development' },
    { taskState: 'implementing', phase: 'phase:verification' },
    { taskState: 'designing', phase: 'phase:requirements' }
  ]) {
    const value = record(overrides);
    value.recordDigest = computeRecordDigest(value);
    const [file] = await fixtureFiles([value]);
    await assert.rejects(loadStatusFiles([file]), /phase/i);
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

test('validates connected archive lineage and orders archives deterministically', async () => {
  const first = record();
  const archive = (updatedAt, archivedAt, reason, supersedesDigest) => {
    const value = record({
      active: false,
      updatedAt,
      archivedAt,
      archiveReason: reason,
      supersedesDigest
    });
    value.recordDigest = computeRecordDigest(value);
    return value;
  };
  const earlier = archive('2026-07-31T03:00:00Z', '2026-07-31T03:30:00Z', 'closed earlier', first.recordDigest);
  const later = archive('2026-07-31T04:00:00Z', '2026-07-31T04:30:00Z', 'closed later', earlier.recordDigest);
  const files = await fixtureFiles([later, first, earlier]);

  const loaded = await loadStatusFiles(files);
  assert.deepEqual(loaded.filter(({ active }) => !active).map(({ archivedAt }) => archivedAt), [
    '2026-07-31T03:30:00Z',
    '2026-07-31T04:30:00Z'
  ]);
});

test('accepts archived-only identity whose closure resolves the removed active digest', async () => {
  const prior = record();
  const closure = {
    ...prior,
    active: false,
    archivedAt: '2026-07-31T03:00:00Z',
    archiveReason: 'completed',
    supersedesDigest: prior.recordDigest
  };
  closure.recordDigest = computeRecordDigest(closure);
  const [file] = await fixtureFiles([closure]);

  const loaded = await loadStatusFiles([file]);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].active, false);
});

test('rejects fabricated, disconnected, branching, and non-monotonic archive histories', async () => {
  const first = record();
  const archived = (overrides) => {
    const value = record({
      active: false,
      updatedAt: '2026-07-31T03:00:00Z',
      archivedAt: '2026-07-31T03:30:00Z',
      archiveReason: 'closed',
      supersedesDigest: first.recordDigest,
      ...overrides
    });
    value.recordDigest = computeRecordDigest(value);
    return value;
  };
  const fabricated = archived({ supersedesDigest: 'a'.repeat(64) });
  const branchOne = archived({ archiveReason: 'branch one' });
  const branchTwo = archived({ archiveReason: 'branch two' });
  const backwards = archived({
    updatedAt: '2026-07-31T01:30:00Z',
    archivedAt: '2026-07-31T01:45:00Z'
  });
  const externalPrior = record();
  const externalBranch = ['one', 'two'].map((archiveReason) => {
    const value = {
      ...externalPrior,
      active: false,
      archivedAt: '2026-07-31T03:30:00Z',
      archiveReason,
      supersedesDigest: externalPrior.recordDigest
    };
    value.recordDigest = computeRecordDigest(value);
    return value;
  });

  for (const values of [[first, fabricated], [first, branchOne, branchTwo], [first, backwards], externalBranch]) {
    const files = await fixtureFiles(values);
    await assert.rejects(loadStatusFiles(files), /lineage|supersedes|monotonic/i);
  }
});

test('canonical digest uses a total evidence ordering', () => {
  const evidence = [
    {
      kind: 'test',
      url: 'test/status-loader.test.mjs',
      digest: 'a'.repeat(64),
      commit: '2222222',
      observedAt: '2026-07-31T02:00:00Z'
    },
    {
      kind: 'test',
      url: 'test/status-loader.test.mjs',
      digest: 'a'.repeat(64),
      commit: '1111111',
      observedAt: '2026-07-31T01:00:00Z'
    }
  ];
  const forward = record({ evidence });
  const reversed = record({ evidence: [...evidence].reverse() });

  assert.equal(computeRecordDigest(forward), computeRecordDigest(reversed));
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
