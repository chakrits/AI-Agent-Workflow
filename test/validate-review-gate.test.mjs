import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { hasScriptChanges, hasReviewRecord } from '../scripts/validate-review-gate.mjs';

test('hasScriptChanges returns true when .mjs files are in the changed list', () => {
  const changed = ['scripts/validate-review-gate.mjs', 'package.json', 'README.md'];
  assert.equal(hasScriptChanges(changed), true);
});

test('hasScriptChanges returns true when .js files are in the changed list', () => {
  const changed = ['src/helper.js', 'docs/notes.md'];
  assert.equal(hasScriptChanges(changed), true);
});

test('hasScriptChanges returns false when only .md files are present', () => {
  const changed = ['docs/records/qa/foo-code-review.md', 'AGENTS.md', 'README.md'];
  assert.equal(hasScriptChanges(changed), false);
});

test('hasScriptChanges returns false for an empty list', () => {
  assert.equal(hasScriptChanges([]), false);
});

test('hasScriptChanges returns false for non-array input', () => {
  assert.equal(hasScriptChanges(null), false);
  assert.equal(hasScriptChanges(undefined), false);
  assert.equal(hasScriptChanges('not-an-array'), false);
});

test('hasScriptChanges ignores extensions with similar suffixes', () => {
  const changed = ['scripts/foo.mjs.bak', 'docs/what-is-mjs.md', 'src/bar.json'];
  assert.equal(hasScriptChanges(changed), false);
});

test('hasReviewRecord returns true when the current diff adds a *-code-review.md file', () => {
  assert.equal(
    hasReviewRecord([
      'scripts/validate-review-gate.mjs',
      'docs/records/qa/2026-07-25-validate-review-gate-code-review.md'
    ]),
    true
  );
});

test('hasReviewRecord returns false when no review record is added in the current diff', () => {
  assert.equal(hasReviewRecord(['scripts/validate-review-gate.mjs']), false);
});

test('hasReviewRecord rejects a review record outside the canonical directory', () => {
  assert.equal(hasReviewRecord(['docs/records/other/2026-07-25-code-review.md']), false);
});

test('hasReviewRecord returns false for non-array input', () => {
  assert.equal(hasReviewRecord(null), false);
  assert.equal(hasReviewRecord(undefined), false);
});

test('hasReviewRecord rejects script changes without a new record despite the repository\'s existing review records', () => {
  const reviewDir = path.resolve('docs/records/qa');
  const existingRecords = readdirSync(reviewDir).filter((name) => name.endsWith('-code-review.md'));

  assert.ok(existingRecords.length >= 10, 'the real repository fixture must retain its pre-existing records');
  assert.equal(hasReviewRecord(['scripts/validate-review-gate.mjs']), false);
});

test('hasReviewRecord accepts this diff\'s newly added, correctly named review record', () => {
  const reviewDir = path.resolve('docs/records/qa');
  const record = 'docs/records/qa/2026-07-26-issue-106-review-gate-code-review.md';

  assert.ok(readdirSync(reviewDir).includes(path.basename(record)), 'the review record must be present in this change');
  assert.equal(hasReviewRecord(['scripts/validate-review-gate.mjs', record]), true);
});
