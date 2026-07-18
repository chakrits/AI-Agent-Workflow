import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReadinessCheck,
  findLinkedIssueNumber,
  readinessCheckName
} from '../scripts/work-item-readiness-check.mjs';

const readyIssue = {
  pull_request: undefined,
  labels: [
    { name: 'phase:verification' },
    { name: 'status:spec-ready' },
    { name: 'status:development-done' },
    { name: 'status:verification-done' }
  ]
};

const pull = {
  body: 'Developer: Work Item (Issue) URL: https://github.com/chakrits/AI-Agent-Workflow/issues/19\nQA: evidence comment or review URL: https://github.com/chakrits/AI-Agent-Workflow/issues/19#comment',
  draft: false,
  head: { sha: 'abc123' }
};

test('finds only a same-repository linked Issue', () => {
  assert.equal(
    findLinkedIssueNumber(pull.body, { owner: 'chakrits', repo: 'AI-Agent-Workflow' }),
    19
  );
  assert.equal(
    findLinkedIssueNumber('Developer: Work Item (Issue) URL: https://github.com/other/repo/issues/19', {
      owner: 'chakrits',
      repo: 'AI-Agent-Workflow'
    }),
    undefined
  );
});

test('publishes a successful App-owned check for the current ready Issue state', () => {
  assert.deepEqual(buildReadinessCheck({ pull, issue: readyIssue, repository: { owner: 'chakrits', repo: 'AI-Agent-Workflow' } }), {
    name: readinessCheckName,
    headSha: 'abc123',
    conclusion: 'success',
    title: 'Work item readiness is current',
    summary: 'Linked Issue lifecycle state passed the trusted readiness evaluation.'
  });
});

test('publishes a failure from the current Issue state instead of a stale event snapshot', () => {
  const issueWithoutSpec = {
    ...readyIssue,
    labels: readyIssue.labels.filter((label) => label.name !== 'status:spec-ready')
  };

  assert.deepEqual(buildReadinessCheck({ pull, issue: issueWithoutSpec, repository: { owner: 'chakrits', repo: 'AI-Agent-Workflow' } }), {
    name: readinessCheckName,
    headSha: 'abc123',
    conclusion: 'failure',
    title: 'Work item readiness is incomplete',
    summary: 'Linked Issue is missing: status:spec-ready.'
  });
});

test('publishes a failure for an unlinked pull request instead of leaving a required check missing', () => {
  assert.deepEqual(buildReadinessCheck({
    pull: { ...pull, body: '' },
    repository: { owner: 'chakrits', repo: 'AI-Agent-Workflow' }
  }), {
    name: readinessCheckName,
    headSha: 'abc123',
    conclusion: 'failure',
    title: 'Work item readiness is incomplete',
    summary: 'Linked Issue is missing: valid same-repository Issue.'
  });
});

test('a failed work-item lookup produces only that pull request failure, leaving later ready checks publishable', () => {
  const failedLookup = buildReadinessCheck({
    pull: { ...pull, head: { sha: 'bad-lookup' } },
    repository: { owner: 'chakrits', repo: 'AI-Agent-Workflow' },
    resolutionError: 'current work-item metadata could not be retrieved (404)'
  });
  const laterReadyPull = buildReadinessCheck({
    pull: { ...pull, head: { sha: 'later-ready' } },
    issue: readyIssue,
    repository: { owner: 'chakrits', repo: 'AI-Agent-Workflow' }
  });

  assert.equal(failedLookup.conclusion, 'failure');
  assert.match(failedLookup.summary, /could not be retrieved \(404\)/);
  assert.equal(laterReadyPull.conclusion, 'success');
  assert.equal(laterReadyPull.headSha, 'later-ready');
});

test('publishes a successful check for a valid post-merge closeout pull request', () => {
  const closeoutPull = {
    body: '<!-- post-merge-closeout: complete; source-pr-17 -->',
    head: { sha: 'closeout123' }
  };

  assert.deepEqual(buildReadinessCheck({
    pull: closeoutPull,
    repository: { owner: 'chakrits', repo: 'AI-Agent-Workflow' },
    sourcePullRequest: { isPullRequest: true, labels: ['post-merge-closeout'] },
    changedFiles: ['PROJECT_STATUS.md']
  }), {
    name: readinessCheckName,
    headSha: 'closeout123',
    conclusion: 'success',
    title: 'Work item readiness is current',
    summary: 'Linked Issue lifecycle state passed the trusted readiness evaluation.'
  });
});
