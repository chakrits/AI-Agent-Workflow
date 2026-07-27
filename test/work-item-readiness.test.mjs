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

test('rejects more than one current phase label', () => {
  assert.deepEqual(
    validateReadiness({
      draft: true,
      workItem: {
        labels: ['phase:development', 'phase:verification', 'status:spec-ready', 'status:development-done'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['exactly one current phase']
  );
});

test('requires development evidence before a draft QA handoff', () => {
  assert.deepEqual(
    validateReadiness({
      draft: true,
      workItem: {
        labels: ['phase:verification', 'status:spec-ready'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['status:development-done']
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

test('accepts a Bug Fix work item with QA evidence and no lifecycle status labels', () => {
  assert.deepEqual(
    validateReadiness({
      body,
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('still requires QA evidence for a non-draft Bug Fix work item', () => {
  assert.deepEqual(
    validateReadiness({
      body: '',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['QA evidence URL']
  );
});

test('does not require QA evidence for a draft Bug Fix work item', () => {
  assert.deepEqual(
    validateReadiness({
      body: '',
      draft: true,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('does not require lifecycle status labels for a Bug Fix work item even without any phase label', () => {
  assert.deepEqual(
    validateReadiness({
      body,
      draft: false,
      workItem: { labels: ['bug'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('a Feature/Enhancement work item is unaffected by the Bug Fix carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      draft: true,
      workItem: { labels: ['phase:development'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready']
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
