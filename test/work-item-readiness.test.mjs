import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReadiness } from '../scripts/work-item-readiness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const body = 'QA: evidence comment or review URL: https://github.com/x/y/issues/1#comment';
const labels = ['phase:verification', 'status:spec-ready', 'status:development-done', 'status:verification-done'];
const bugFixBody = 'Governing workflow: Bug Fix\n\nQA: evidence comment or review URL: https://github.com/x/y/issues/1#comment';

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

test('accepts a Bug Fix work item with a declared governing workflow, QA evidence, and no lifecycle status labels', () => {
  assert.deepEqual(
    validateReadiness({
      body: bugFixBody,
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('still requires QA evidence for a non-draft Bug Fix work item that declares its governing workflow', () => {
  assert.deepEqual(
    validateReadiness({
      body: 'Governing workflow: Bug Fix',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['QA evidence URL']
  );
});

test('does not require QA evidence for a draft Bug Fix work item that declares its governing workflow', () => {
  assert.deepEqual(
    validateReadiness({
      body: 'Governing workflow: Bug Fix',
      draft: true,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('does not require lifecycle status labels for a Bug Fix work item even without any phase label, once its governing workflow is declared', () => {
  assert.deepEqual(
    validateReadiness({
      body: bugFixBody,
      draft: false,
      workItem: { labels: ['bug'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('falls through to the strict lifecycle path when the bug label is present but the PR body does not declare its governing workflow', () => {
  assert.deepEqual(
    validateReadiness({
      body: '',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('a declared governing workflow alone, without the bug label, does not trigger the Bug Fix carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: bugFixBody,
      draft: false,
      workItem: { labels: ['phase:development'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done']
  );
});

test('the unedited PR template guidance text does not itself satisfy the governing-workflow declaration', () => {
  const template = readFileSync(path.join(repoRoot, '.github/pull_request_template.md'), 'utf8');
  assert.ok(
    template.includes('Governing workflow: Bug Fix'),
    'the template must still document the exact phrase authors are told to copy'
  );
  assert.deepEqual(
    validateReadiness({
      body: template,
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('a blockquoted copy of the declaration line does not trigger the carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: '> Governing workflow: Bug Fix',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('the PR template guidance no longer wraps the declaration phrase in backticks', () => {
  const template = readFileSync(path.join(repoRoot, '.github/pull_request_template.md'), 'utf8');
  assert.ok(
    !template.includes('`Governing workflow: Bug Fix`'),
    'a backtick-wrapped copy of the declaration invites a good-faith author to paste the ' +
      'backticks too, which then fails the anchored regex — Issue #111'
  );
  assert.ok(
    template.includes('Governing workflow: Bug Fix'),
    'the corrected guidance must still state the exact phrase, just not backtick-wrapped'
  );
});

test('the GitLab merge-request template documents the Bug Fix governing-workflow requirement', () => {
  const template = readFileSync(
    path.join(repoRoot, '.gitlab/merge_request_templates/Default.md'),
    'utf8'
  );
  assert.ok(
    /Bug Fix work items/.test(template),
    'GitLab authors need the same Bug Fix carve-out guidance the GitHub template documents — Issue #111'
  );
  assert.ok(
    template.includes('Governing workflow: Bug Fix'),
    'the GitLab template must state the exact declaration phrase'
  );
});

test('the unedited GitLab template guidance text does not itself satisfy the governing-workflow declaration', () => {
  const template = readFileSync(
    path.join(repoRoot, '.gitlab/merge_request_templates/Default.md'),
    'utf8'
  );
  assert.deepEqual(
    validateReadiness({
      body: template,
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('a genuine declaration on its own line, anywhere in the body, triggers the carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: 'Summary\n\nGoverning workflow: Bug Fix\n\nQA: evidence comment or review URL: https://github.com/x/y/issues/1#comment',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('a non-draft Feature/Enhancement work item still requires every lifecycle label, unaffected by the Bug Fix carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: '',
      draft: false,
      workItem: { labels: ['phase:development'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
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
