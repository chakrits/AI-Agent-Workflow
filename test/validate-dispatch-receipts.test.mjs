import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, rm, cp } from 'node:fs/promises';
import os from 'node:os';
import { validateDispatchReceipts, parseHandoffDispatchDeclarations } from '../scripts/validate-dispatch-receipts.mjs';

const workItemUrl = 'https://github.com/chakrits/AI-Agent-Workflow/issues/35';

function receiptYaml(fields) {
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`)
    .join('\n');
}

function handoffMarkdown({ handoffEventId, nextOwner, nextAction = 'Dispatch' }) {
  return `# Agent Handoff\n\n## Next Action\n\n${nextAction}\n\n## Next Owner\n\n${nextOwner}\n\n## Handoff Event ID\n\n${handoffEventId}\n`;
}

async function makeRepo({ receipts = [], handoffs = [] }) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'dispatch-receipts-'));
  await mkdir(path.join(rootDir, 'docs/records/dispatch-receipts'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs/contracts/schemas'), { recursive: true });
  await cp(
    path.join(process.cwd(), 'docs/contracts/schemas/dispatch-receipt.schema.json'),
    path.join(rootDir, 'docs/contracts/schemas/dispatch-receipt.schema.json')
  );
  for (const { filename, fields } of receipts) {
    await writeFile(
      path.join(rootDir, 'docs/records/dispatch-receipts', filename),
      receiptYaml(fields),
      'utf8'
    );
  }
  for (const { filename, ...rest } of handoffs) {
    await writeFile(path.join(rootDir, 'docs/records', filename), handoffMarkdown(rest), 'utf8');
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
    receipts: [
      {
        filename: 'evt-0006.yaml',
        fields: {
          handoff_event_id: 'evt-0006',
          ...registeredBase,
          state: 'consumed',
          terminal_result_id: 'res-1',
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
