import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, rm, cp } from 'node:fs/promises';
import os from 'node:os';
import {
  validateDispatchReceipts,
  parseHandoffDispatchDeclarations,
  isCanonicalIdentity,
  validateIdentityBinding,
  parseTerminalResultId,
  validateTerminalEvidence,
  validateAppendOnlyHistory,
  checkExpiryWarnings
} from '../scripts/validate-dispatch-receipts.mjs';

const workItemUrl = 'https://github.com/chakrits/AI-Agent-Workflow/issues/35';

function receiptYaml(fields) {
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`)
    .join('\n');
}

function handoffMarkdown({ handoffEventId, nextOwner, nextAction = 'Dispatch' }) {
  return `# Agent Handoff\n\n## Next Action\n\n${nextAction}\n\n## Next Owner\n\n${nextOwner}\n\n## Handoff Event ID\n\n${handoffEventId}\n`;
}

async function makeRepo({ receipts = [], handoffs = [], extraFiles = {} }) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'dispatch-receipts-'));
  await mkdir(path.join(rootDir, 'docs/records/dispatch-receipts'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs/records/handoff'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs/contracts/schemas'), { recursive: true });
  await cp(
    path.join(process.cwd(), 'docs/contracts/schemas/dispatch-receipt.schema.json'),
    path.join(rootDir, 'docs/contracts/schemas/dispatch-receipt.schema.json')
  );
  for (const [relativePath, content] of Object.entries(extraFiles)) {
    const dest = path.join(rootDir, relativePath);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content, 'utf8');
  }
  for (const { filename, fields } of receipts) {
    await writeFile(
      path.join(rootDir, 'docs/records/dispatch-receipts', filename),
      receiptYaml(fields),
      'utf8'
    );
  }
  for (const { filename, ...rest } of handoffs) {
    await writeFile(path.join(rootDir, 'docs/records/handoff', filename), handoffMarkdown(rest), 'utf8');
  }
  return rootDir;
}

const registeredBase = {
  work_item_url: workItemUrl,
  source_agent: 'SA Agent',
  target_agent: 'Security Reviewer',
  state: 'registered',
  registered_at: '2026-07-19T00:00:00Z',
  registered_by: 'Boss',
  dispatch_depth: 1
};

test('parses only Dispatch-declaring handoffs', () => {
  const declarations = parseHandoffDispatchDeclarations([
    { relativePath: 'a.md', content: handoffMarkdown({ handoffEventId: 'evt-1', nextOwner: 'QA Agent' }) },
    {
      relativePath: 'b.md',
      content: handoffMarkdown({ handoffEventId: 'evt-2', nextOwner: 'QA Agent', nextAction: 'Human review' })
    }
  ]);
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].handoffEventId, 'evt-1');
});

test('valid receipt with matching live handoff passes (baseline PASS case)', async () => {
  const rootDir = await makeRepo({
    receipts: [{ filename: 'evt-0001.yaml', fields: { handoff_event_id: 'evt-0001', ...registeredBase } }],
    handoffs: [{ filename: 'HANDOFF-A.md', handoffEventId: 'evt-0001', nextOwner: 'Security Reviewer' }]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.deepEqual(errors, []);
  await rm(rootDir, { recursive: true, force: true });
});

test('receipt missing dispatch_depth fails', async () => {
  const rootDir = await makeRepo({
    receipts: [
      {
        filename: 'evt-0002.yaml',
        fields: { handoff_event_id: 'evt-0002', ...registeredBase, dispatch_depth: undefined }
      }
    ]
  });
  // remove the field entirely (yaml serializer above writes "dispatch_depth: undefined" literally,
  // so write the file directly without it)
  await writeFile(
    path.join(rootDir, 'docs/records/dispatch-receipts/evt-0002.yaml'),
    receiptYaml({ handoff_event_id: 'evt-0002', ...registeredBase, dispatch_depth: undefined })
      .split('\n')
      .filter((line) => !line.startsWith('dispatch_depth'))
      .join('\n'),
    'utf8'
  );
  const errors = await validateDispatchReceipts(rootDir);
  assert.ok(
    errors.some((message) => message.includes('dispatch_depth') && message.includes('required')),
    `expected a missing-dispatch_depth error, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('receipt understating dispatch_depth fails', async () => {
  const rootDir = await makeRepo({
    receipts: [
      { filename: 'evt-0003.yaml', fields: { handoff_event_id: 'evt-0003', ...registeredBase, dispatch_depth: 1 } },
      {
        filename: 'evt-0004.yaml',
        fields: {
          handoff_event_id: 'evt-0004',
          ...registeredBase,
          registered_at: '2026-07-19T01:00:00Z',
          dispatch_depth: 1
        }
      }
    ]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.ok(
    errors.some((message) => message.includes('does not match prior ledger state')),
    `expected a depth-mismatch error, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('dispatch_depth correctly computed as 1 for a Work Item first receipt passes', async () => {
  const rootDir = await makeRepo({
    receipts: [{ filename: 'evt-0005.yaml', fields: { handoff_event_id: 'evt-0005', ...registeredBase, dispatch_depth: 1 } }]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.deepEqual(errors, []);
  await rm(rootDir, { recursive: true, force: true });
});

test('dispatch_depth correctly computed as prior max + 1 across mixed states passes', async () => {
  const rootDir = await makeRepo({
    extraFiles: { 'docs/records/qa/2026-07-19-evt-0006-fixture.md': '# fixture\n' },
    receipts: [
      {
        filename: 'evt-0006.yaml',
        fields: {
          handoff_event_id: 'evt-0006',
          ...registeredBase,
          state: 'consumed',
          terminal_result_id: 'docs/records/qa/2026-07-19-evt-0006-fixture.md',
          state_changed_at: '2026-07-19T00:30:00Z',
          state_changed_by: 'Security Reviewer',
          dispatch_depth: 1
        }
      },
      {
        filename: 'evt-0007.yaml',
        fields: {
          handoff_event_id: 'evt-0007',
          ...registeredBase,
          source_agent: 'Security Reviewer',
          target_agent: 'SA Agent',
          registered_at: '2026-07-19T01:00:00Z',
          dispatch_depth: 2
        }
      }
    ]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.deepEqual(errors, []);
  await rm(rootDir, { recursive: true, force: true });
});

function chainReceipts() {
  // A -> B -> A -> B -> A: three round trips between SA Agent and Security Reviewer.
  const roles = [
    ['SA Agent', 'Security Reviewer'],
    ['Security Reviewer', 'SA Agent'],
    ['SA Agent', 'Security Reviewer'],
    ['Security Reviewer', 'SA Agent'],
    ['SA Agent', 'Security Reviewer']
  ];
  return roles.map(([source_agent, target_agent], index) => ({
    filename: `evt-round-${index}.yaml`,
    fields: {
      handoff_event_id: `evt-round-${index}`,
      work_item_url: workItemUrl,
      source_agent,
      target_agent,
      state: 'registered',
      registered_at: `2026-07-19T0${index}:00:00Z`,
      registered_by: 'Boss',
      dispatch_depth: index + 1
    }
  }));
}

test('third same-role-pair round trip missing escalated fails', async () => {
  const rootDir = await makeRepo({ receipts: chainReceipts() });
  const errors = await validateDispatchReceipts(rootDir);
  assert.ok(
    errors.some((message) => message.includes('same-role-pair bound exceeded')),
    `expected a bound-exceeded error, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('third same-role-pair round trip with escalated true and notes passes', async () => {
  const receipts = chainReceipts();
  receipts[4].fields.escalated = true;
  receipts[4].fields.notes = 'Human escalation recorded in Issue #35 comment 5014418124';
  const rootDir = await makeRepo({ receipts });
  const errors = await validateDispatchReceipts(rootDir);
  assert.deepEqual(errors, []);
  await rm(rootDir, { recursive: true, force: true });
});

test('terminal handoff declaring Dispatch with no matching receipt fails', async () => {
  const rootDir = await makeRepo({
    handoffs: [{ filename: 'HANDOFF-MISSING.md', handoffEventId: 'evt-missing', nextOwner: 'QA Agent' }]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.ok(
    errors.some((message) => message.includes('no matching receipt file')),
    `expected a missing-receipt error, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('receipt with mismatched target_agent fails', async () => {
  const rootDir = await makeRepo({
    receipts: [{ filename: 'evt-0008.yaml', fields: { handoff_event_id: 'evt-0008', ...registeredBase, dispatch_depth: 1 } }],
    handoffs: [{ filename: 'HANDOFF-B.md', handoffEventId: 'evt-0008', nextOwner: 'QA Agent' }]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.ok(
    errors.some((message) => message.includes('does not match Next Owner')),
    `expected a target_agent-mismatch error, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('filename stem not equal to handoff_event_id field fails', async () => {
  const rootDir = await makeRepo({
    receipts: [{ filename: 'evt-wrong.yaml', fields: { handoff_event_id: 'evt-0009', ...registeredBase, dispatch_depth: 1 } }]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.ok(
    errors.some((message) => message.includes('does not equal handoff_event_id field')),
    `expected a filename-mismatch error, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('matching receipt in expired state does not satisfy a still-live Dispatch', async () => {
  const rootDir = await makeRepo({
    receipts: [
      {
        filename: 'evt-0010.yaml',
        fields: {
          handoff_event_id: 'evt-0010',
          ...registeredBase,
          state: 'expired',
          state_changed_at: '2026-07-20T00:00:00Z',
          state_changed_by: 'Boss',
          dispatch_depth: 1
        }
      }
    ],
    handoffs: [{ filename: 'HANDOFF-C.md', handoffEventId: 'evt-0010', nextOwner: 'Security Reviewer' }]
  });
  const errors = await validateDispatchReceipts(rootDir);
  assert.ok(
    errors.some((message) => message.includes('does not satisfy a still-live Dispatch')),
    `expected an expired-receipt error, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

test('PR-scoped check does not fail on a historical unrelated HANDOFF file with no receipt', async () => {
  // Simulates a repo where an older, already-merged HANDOFF file declares a
  // bare "Next Action: Dispatch" with no matching receipt (a pre-existing
  // repo-wide landmine, not something the current PR touched or introduced).
  // A PR that never changed that file must not be failed by it.
  const rootDir = await makeRepo({
    handoffs: [
      { filename: 'HANDOFF-HISTORICAL-UNRELATED.md', handoffEventId: 'evt-historical', nextOwner: 'QA Agent' },
      { filename: 'HANDOFF-THIS-PR.md', handoffEventId: 'evt-0011', nextOwner: 'Security Reviewer' }
    ],
    receipts: [{ filename: 'evt-0011.yaml', fields: { handoff_event_id: 'evt-0011', ...registeredBase, dispatch_depth: 1 } }]
  });
  const errors = await validateDispatchReceipts(rootDir, {
    changedHandoffPaths: ['docs/records/handoff/HANDOFF-THIS-PR.md']
  });
  assert.deepEqual(errors, []);
  await rm(rootDir, { recursive: true, force: true });
});

test('PR-scoped check still fails when the current PR itself declares Dispatch with no receipt', async () => {
  const rootDir = await makeRepo({
    handoffs: [
      { filename: 'HANDOFF-HISTORICAL-UNRELATED.md', handoffEventId: 'evt-historical', nextOwner: 'QA Agent' },
      { filename: 'HANDOFF-THIS-PR.md', handoffEventId: 'evt-0012', nextOwner: 'Security Reviewer' }
    ]
  });
  const errors = await validateDispatchReceipts(rootDir, {
    changedHandoffPaths: ['docs/records/handoff/HANDOFF-THIS-PR.md']
  });
  assert.ok(
    errors.some((message) => message.includes('no matching receipt file')),
    `expected a missing-receipt error scoped to this PR's own handoff, got: ${JSON.stringify(errors)}`
  );
  await rm(rootDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// ADR-0013 anti-forgery controls (Issue #119) -- required adversarial tests
// from docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md
// ---------------------------------------------------------------------------

function receiptFixture(relativePath, content) {
  return { relativePath, content };
}

test('Control 1.1: a receipt whose first git revision is already consumed is rejected', () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-forged.yaml', { state: 'consumed' })];
  const getRevisions = () => [{ sha: 'aaa1111', content: { state: 'consumed', terminal_result_id: 'x' } }];

  const errors = validateAppendOnlyHistory(receipts, { rootDir: '/fake', getRevisions });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 1\.1/);
});

test('Control 1.2: a receipt that transitions consumed -> registered in a later revision is rejected', () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-revert.yaml', { state: 'registered' })];
  const getRevisions = () => [
    { sha: 'rev1', content: { state: 'registered' } },
    {
      sha: 'rev2',
      content: { state: 'consumed', terminal_result_id: 'x', state_changed_at: 't1', state_changed_by: 'QA Agent' }
    },
    { sha: 'rev3', content: { state: 'registered' } }
  ];

  const errors = validateAppendOnlyHistory(receipts, { rootDir: '/fake', getRevisions });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 1\.2/);
});

test('Control 1.2: a receipt that moves between two different terminal states is rejected', () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-relabel.yaml', { state: 'expired' })];
  const getRevisions = () => [
    { sha: 'rev1', content: { state: 'registered' } },
    { sha: 'rev2', content: { state: 'consumed', terminal_result_id: 'x', state_changed_at: 't1', state_changed_by: 'QA Agent' } },
    { sha: 'rev3', content: { state: 'expired', state_changed_at: 't2', state_changed_by: 'QA Agent' } }
  ];

  const errors = validateAppendOnlyHistory(receipts, { rootDir: '/fake', getRevisions });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 1\.2/);
});

test('Control 1.3: identical state_changed_at/state_changed_by on a revision that changed state is rejected', () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-stale-metadata.yaml', { state: 'consumed' })];
  const getRevisions = () => [
    { sha: 'rev1', content: { state: 'registered', state_changed_at: 'STALE', state_changed_by: 'STALE' } },
    {
      sha: 'rev2',
      content: { state: 'consumed', terminal_result_id: 'x', state_changed_at: 'STALE', state_changed_by: 'STALE' }
    }
  ];

  const errors = validateAppendOnlyHistory(receipts, { rootDir: '/fake', getRevisions });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 1\.3/);
});

test('Control 1: a same-value no-op revision (e.g. a notes edit) after reaching a terminal state is not flagged', () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-noop-edit.yaml', { state: 'consumed' })];
  const getRevisions = () => [
    { sha: 'rev1', content: { state: 'registered' } },
    { sha: 'rev2', content: { state: 'consumed', terminal_result_id: 'x', state_changed_at: 't1', state_changed_by: 'QA Agent' } },
    { sha: 'rev3', content: { state: 'consumed', terminal_result_id: 'x', state_changed_at: 't1', state_changed_by: 'QA Agent', notes: 'typo fix' } }
  ];

  const errors = validateAppendOnlyHistory(receipts, { rootDir: '/fake', getRevisions });

  assert.deepEqual(errors, []);
});

test('Control 1: no git history available is skipped, not flagged (graceful degradation)', () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-no-history.yaml', { state: 'registered' })];
  const errors = validateAppendOnlyHistory(receipts, { rootDir: '/fake', getRevisions: () => [] });

  assert.deepEqual(errors, []);
});

test('Control 2: registered_by an unrecognized free-text string is rejected', () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-impersonation.yaml', { registered_by: 'definitely-not-an-agent' })];

  const errors = validateIdentityBinding(receipts);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 2/);
});

test('Control 2: a canonical identity with a parenthetical session/tool qualifier is accepted', () => {
  assert.equal(isCanonicalIdentity('Developer Agent (Codex)'), true);
  assert.equal(isCanonicalIdentity('QA Agent (re-verification)'), true);
  assert.equal(isCanonicalIdentity('Boss'), true);
  assert.equal(isCanonicalIdentity('Security Reviewer'), true);
  assert.equal(isCanonicalIdentity('random-string'), false);
});

test('parseTerminalResultId classifies commit SHA, QA/work-item path, comment URL, and invalid shapes', () => {
  assert.deepEqual(parseTerminalResultId('cb8a9e2'), { kind: 'commit', sha: 'cb8a9e2' });
  assert.deepEqual(parseTerminalResultId('docs/records/qa/2026-07-28-x.md'), {
    kind: 'qa-file',
    path: 'docs/records/qa/2026-07-28-x.md'
  });
  assert.deepEqual(
    parseTerminalResultId('https://github.com/chakrits/AI-Agent-Workflow/issues/117#issuecomment-5098714533'),
    { kind: 'comment-url', owner: 'chakrits', repo: 'AI-Agent-Workflow', commentId: 5098714533 }
  );
  assert.deepEqual(parseTerminalResultId('res-1'), { kind: 'invalid' });
});

test('Control 3.1: a commit-SHA-shaped terminal_result_id that does not exist is rejected', async () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-fake-sha.yaml', { state: 'consumed', terminal_result_id: '0000000' })];

  const errors = await validateTerminalEvidence(receipts, { rootDir: '/fake', commitExists: async () => false });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 3\.1/);
});

test('Control 3.2: a docs/records path terminal_result_id that does not exist is rejected', async () => {
  const receipts = [
    receiptFixture('docs/records/dispatch-receipts/evt-fake-path.yaml', {
      state: 'consumed',
      terminal_result_id: 'docs/records/qa/does-not-exist.md'
    })
  ];

  const errors = await validateTerminalEvidence(receipts, { rootDir: '/fake', fileExists: async () => false });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 3\.2/);
});

test('Control 3.3: a terminal_result_id matching none of the three permitted shapes is rejected', async () => {
  const receipts = [receiptFixture('docs/records/dispatch-receipts/evt-bad-shape.yaml', { state: 'consumed', terminal_result_id: 'res-1' })];

  const errors = await validateTerminalEvidence(receipts, { rootDir: '/fake' });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Control 3\.3/);
});

test('Control 3.3 (live-verification): a well-shaped comment URL for a comment that does not exist is rejected', async () => {
  const receipts = [
    receiptFixture('docs/records/dispatch-receipts/evt-fake-comment.yaml', {
      state: 'consumed',
      terminal_result_id: 'https://github.com/chakrits/AI-Agent-Workflow/issues/999#issuecomment-1'
    })
  ];

  const errors = await validateTerminalEvidence(receipts, {
    rootDir: '/fake',
    owner: 'chakrits',
    repo: 'AI-Agent-Workflow',
    commentExists: async () => false
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /live-verification/);
});

test('Control 3.3 (same-repo enforcement): a comment URL for a different owner/repo is rejected without a network call', async () => {
  const receipts = [
    receiptFixture('docs/records/dispatch-receipts/evt-wrong-repo.yaml', {
      state: 'consumed',
      terminal_result_id: 'https://github.com/someone-else/other-repo/issues/1#issuecomment-2'
    })
  ];
  let called = false;

  const errors = await validateTerminalEvidence(receipts, {
    rootDir: '/fake',
    owner: 'chakrits',
    repo: 'AI-Agent-Workflow',
    commentExists: async () => {
      called = true;
      return true;
    }
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0], /not this repository/);
  assert.equal(called, false, 'must not make a network call for a cross-repo URL');
});

test('Control 3: a live comment URL that does exist passes', async () => {
  const receipts = [
    receiptFixture('docs/records/dispatch-receipts/evt-real-comment.yaml', {
      state: 'consumed',
      terminal_result_id: 'https://github.com/chakrits/AI-Agent-Workflow/issues/117#issuecomment-5098714533'
    })
  ];

  const errors = await validateTerminalEvidence(receipts, {
    rootDir: '/fake',
    owner: 'chakrits',
    repo: 'AI-Agent-Workflow',
    commentExists: async () => true
  });

  assert.deepEqual(errors, []);
});

test('Control 5: a registered receipt older than the TTL produces a non-blocking warning, never an error', () => {
  const receipts = [
    receiptFixture('docs/records/dispatch-receipts/evt-stale.yaml', {
      state: 'registered',
      registered_at: '2026-07-01T00:00:00Z'
    })
  ];

  const warnings = checkExpiryWarnings(receipts, { now: new Date('2026-07-28T00:00:00Z'), ttlDays: 14 });

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /non-blocking/);
});

test('Control 5: a registered receipt within the TTL, and a consumed receipt regardless of age, produce no warning', () => {
  const receipts = [
    receiptFixture('docs/records/dispatch-receipts/evt-fresh.yaml', {
      state: 'registered',
      registered_at: '2026-07-27T00:00:00Z'
    }),
    receiptFixture('docs/records/dispatch-receipts/evt-old-but-consumed.yaml', {
      state: 'consumed',
      registered_at: '2026-01-01T00:00:00Z'
    })
  ];

  const warnings = checkExpiryWarnings(receipts, { now: new Date('2026-07-28T00:00:00Z'), ttlDays: 14 });

  assert.deepEqual(warnings, []);
});

test('the existing valid fixture (docs/contracts/examples/dispatch-receipts/example-registered.yaml) continues to pass unmodified', async () => {
  const errors = await validateDispatchReceipts(process.cwd(), {
    changedHandoffPaths: []
  });

  assert.deepEqual(errors, []);
});
