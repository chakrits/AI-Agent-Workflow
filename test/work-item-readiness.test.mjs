import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReadiness } from '../scripts/work-item-readiness.mjs';

const body = 'QA: evidence comment or review URL: https://github.com/x/y/issues/1#comment';
const labels = ['phase:verification', 'status:spec-ready', 'status:development-done', 'status:verification-done'];

test('accepts a ready same-repository work item', () => {
  assert.deepEqual(
    validateReadiness({ body, draft: false, workItem: { labels, isPullRequest: false, isSameRepository: true } }),
    []
  );
});

test('requires specification readiness for drafts', () => {
  assert.deepEqual(
    validateReadiness({ draft: true, workItem: { labels: ['phase:development'], isPullRequest: false, isSameRepository: true } }),
    ['status:spec-ready']
  );
});

test('rejects a pull request or external item as a work item', () => {
  assert.deepEqual(
    validateReadiness({ draft: true, workItem: { labels, isPullRequest: true, isSameRepository: true } }),
    ['valid same-repository Issue']
  );
  assert.deepEqual(
    validateReadiness({ draft: true, workItem: { labels, isPullRequest: false, isSameRepository: false } }),
    ['valid same-repository Issue']
  );
});

test('requires QA evidence before a non-draft pull request is ready', () => {
  assert.deepEqual(
    validateReadiness({ body: '', draft: false, workItem: { labels, isPullRequest: false, isSameRepository: true } }),
    ['QA evidence URL']
  );
});

test('allows only an authenticated closeout with authorized files', () => {
  const closeout = '<!-- post-merge-closeout: complete; source-pr-1 -->';
  assert.deepEqual(
    validateReadiness({ body: closeout, changedFiles: ['PROJECT_STATUS.md'], sourcePullRequest: { isPullRequest: true, labels: ['post-merge-closeout'] } }),
    []
  );
  assert.deepEqual(
    validateReadiness({ body: closeout, changedFiles: ['README.md'], sourcePullRequest: { isPullRequest: true, labels: ['post-merge-closeout'] } }),
    ['closeout files are not authorized']
  );
  assert.deepEqual(
    validateReadiness({ body: closeout, changedFiles: ['PROJECT_STATUS.md'], sourcePullRequest: { isPullRequest: true, labels: [] } }),
    ['labeled source pull request']
  );
});
