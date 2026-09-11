import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isNotifyCandidate,
  parseWorkItemUrl,
  slugifyAgentName,
  buildLabelName,
  buildIdempotencyMarker,
  hasExistingNotification,
  buildCommentBody,
  resolveNotifyActions
} from '../scripts/dispatch-receipt-notify.mjs';

const repository = { owner: 'chakrits', repo: 'AI-Agent-Workflow' };

test('isNotifyCandidate is true only for a registered receipt', () => {
  assert.equal(isNotifyCandidate({ state: 'registered' }), true);
  assert.equal(isNotifyCandidate({ state: 'consumed' }), false);
  assert.equal(isNotifyCandidate({ state: 'expired' }), false);
  assert.equal(isNotifyCandidate({ state: 'cancelled' }), false);
  assert.equal(isNotifyCandidate(undefined), false);
  assert.equal(isNotifyCandidate({}), false);
});

test('parseWorkItemUrl parses an Issue URL', () => {
  assert.deepEqual(
    parseWorkItemUrl('https://github.com/chakrits/AI-Agent-Workflow/issues/35'),
    { owner: 'chakrits', repo: 'AI-Agent-Workflow', issueNumber: 35 }
  );
});

test('parseWorkItemUrl parses a Pull Request URL via the Issues numeric id', () => {
  assert.deepEqual(
    parseWorkItemUrl('https://github.com/chakrits/AI-Agent-Workflow/pull/39'),
    { owner: 'chakrits', repo: 'AI-Agent-Workflow', issueNumber: 39 }
  );
});

test('parseWorkItemUrl tolerates a trailing slash, query string, or fragment', () => {
  assert.deepEqual(
    parseWorkItemUrl('https://github.com/chakrits/AI-Agent-Workflow/issues/35/'),
    { owner: 'chakrits', repo: 'AI-Agent-Workflow', issueNumber: 35 }
  );
  assert.deepEqual(
    parseWorkItemUrl('https://github.com/chakrits/AI-Agent-Workflow/issues/35?tab=comments'),
    { owner: 'chakrits', repo: 'AI-Agent-Workflow', issueNumber: 35 }
  );
  assert.deepEqual(
    parseWorkItemUrl('https://github.com/chakrits/AI-Agent-Workflow/issues/35#issuecomment-1'),
    { owner: 'chakrits', repo: 'AI-Agent-Workflow', issueNumber: 35 }
  );
});

test('parseWorkItemUrl returns undefined for a malformed or non-GitHub URL', () => {
  assert.equal(parseWorkItemUrl('not-a-url'), undefined);
  assert.equal(parseWorkItemUrl('https://example.com/owner/repo/issues/1'), undefined);
  assert.equal(parseWorkItemUrl('https://github.com/chakrits/AI-Agent-Workflow/discussions/1'), undefined);
  assert.equal(parseWorkItemUrl(undefined), undefined);
});

test('slugifyAgentName lower-cases and hyphenates', () => {
  assert.equal(slugifyAgentName('Security Reviewer'), 'security-reviewer');
  assert.equal(slugifyAgentName('SA Agent'), 'sa-agent');
  assert.equal(slugifyAgentName('  QA  Agent  '), 'qa-agent');
});

test('buildLabelName produces the agent:<slug> label', () => {
  assert.equal(buildLabelName('Security Reviewer'), 'agent:security-reviewer');
  assert.equal(buildLabelName('Developer Agent'), 'agent:developer-agent');
});

test('buildIdempotencyMarker embeds the handoff event id', () => {
  assert.equal(
    buildIdempotencyMarker('evt-0035-01'),
    '<!-- dispatch-receipt-notify:handoff-evt-0035-01 -->'
  );
});

test('buildCommentBody includes the marker as the first line and the required fields', () => {
  const body = buildCommentBody({
    handoffEventId: 'evt-0035-01',
    targetAgent: 'Security Reviewer',
    workItemUrl: 'https://github.com/chakrits/AI-Agent-Workflow/issues/35',
    receiptRepoPath: 'docs/records/dispatch-receipts/evt-0035-01.yaml',
    commitSha: 'abc1234',
    repository
  });
  const lines = body.split('\n');
  assert.equal(lines[0], '<!-- dispatch-receipt-notify:handoff-evt-0035-01 -->');
  assert.match(body, /Next Owner: Security Reviewer/);
  assert.match(body, /Handoff Event ID: evt-0035-01/);
  assert.match(
    body,
    /Receipt: https:\/\/github\.com\/chakrits\/AI-Agent-Workflow\/blob\/abc1234\/docs\/records\/dispatch-receipts\/evt-0035-01\.yaml/
  );
  assert.match(body, /Work Item: https:\/\/github\.com\/chakrits\/AI-Agent-Workflow\/issues\/35/);
});

test('hasExistingNotification is false when no existing comment carries the marker (must not skip)', () => {
  const comments = [
    { body: 'Unrelated comment' },
    { body: '<!-- dispatch-receipt-notify:handoff-evt-OTHER -->\nSome other receipt notified.' }
  ];
  assert.equal(hasExistingNotification(comments, 'evt-0035-01'), false);
});

test('hasExistingNotification is true when a prior comment already carries this receipt marker (must skip re-notify)', () => {
  const comments = [
    { body: 'Unrelated comment' },
    {
      body: '<!-- dispatch-receipt-notify:handoff-evt-0035-01 -->\nNext Owner: Security Reviewer\nHandoff Event ID: evt-0035-01'
    }
  ];
  assert.equal(hasExistingNotification(comments, 'evt-0035-01'), true);
});

test('hasExistingNotification tolerates an empty/undefined comment list', () => {
  assert.equal(hasExistingNotification(undefined, 'evt-1'), false);
  assert.equal(hasExistingNotification([], 'evt-1'), false);
});

test('resolveNotifyActions selects only registered receipts among changed paths', async () => {
  const receipts = {
    'docs/records/dispatch-receipts/evt-1.yaml': {
      handoff_event_id: 'evt-1',
      state: 'registered',
      target_agent: 'Security Reviewer',
      work_item_url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/35'
    },
    'docs/records/dispatch-receipts/evt-2.yaml': {
      handoff_event_id: 'evt-2',
      state: 'consumed',
      target_agent: 'QA Agent',
      work_item_url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/35'
    },
    'docs/records/dispatch-receipts/evt-3.yaml': {
      handoff_event_id: 'evt-3',
      state: 'expired',
      target_agent: 'QA Agent',
      work_item_url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/35'
    },
    'docs/records/dispatch-receipts/evt-4.yaml': {
      handoff_event_id: 'evt-4',
      state: 'cancelled',
      target_agent: 'QA Agent',
      work_item_url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/35'
    }
  };
  const actions = await resolveNotifyActions(Object.keys(receipts), async (relativePath) => receipts[relativePath]);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].relativePath, 'docs/records/dispatch-receipts/evt-1.yaml');
  assert.equal(actions[0].receipt.handoff_event_id, 'evt-1');
  assert.deepEqual(actions[0].target, {
    owner: 'chakrits',
    repo: 'AI-Agent-Workflow',
    issueNumber: 35
  });
});

test('resolveNotifyActions returns no actions when no paths changed', async () => {
  const actions = await resolveNotifyActions([], async () => {
    throw new Error('loadReceipt must not be called with no paths');
  });
  assert.deepEqual(actions, []);
});

test('resolveNotifyActions tolerates a receipt with an unresolvable work_item_url', async () => {
  const actions = await resolveNotifyActions(['docs/records/dispatch-receipts/evt-5.yaml'], async () => ({
    handoff_event_id: 'evt-5',
    state: 'registered',
    target_agent: 'QA Agent',
    work_item_url: 'not-a-url'
  }));
  assert.equal(actions.length, 1);
  assert.equal(actions[0].target, undefined);
});
