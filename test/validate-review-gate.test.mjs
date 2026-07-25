import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hasScriptChanges, hasReviewRecord } from '../scripts/validate-review-gate.mjs';

/**
 * Build a disposable docs/records/qa/ directory under a temp root.
 * `records` is an array of filenames to write into that directory.
 */
function makeTempReviewDir(records) {
  const root = mkdtempSync(path.join(tmpdir(), 'review-gate-test-'));
  const reviewDir = path.join(root, 'docs/records/qa');
  mkdirSync(reviewDir, { recursive: true });
  for (const name of records) {
    writeFileSync(path.join(reviewDir, name), `# ${name}\n\nReview content.\n`);
  }
  return reviewDir;
}

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

test('hasReviewRecord returns true when *-code-review.md files exist', () => {
  const reviewDir = makeTempReviewDir([
    '2026-07-25-validate-review-gate-code-review.md',
    '2026-07-25-other-notes.md'
  ]);
  try {
    assert.equal(hasReviewRecord(reviewDir), true);
  } finally {
    rmSync(reviewDir, { recursive: true, force: true });
  }
});

test('hasReviewRecord returns false when no review files exist', () => {
  const reviewDir = makeTempReviewDir(['2026-07-25-some-other-note.md', 'README.md']);
  try {
    assert.equal(hasReviewRecord(reviewDir), false);
  } finally {
    rmSync(reviewDir, { recursive: true, force: true });
  }
});

test('hasReviewRecord returns false when the directory is empty', () => {
  const reviewDir = makeTempReviewDir([]);
  try {
    assert.equal(hasReviewRecord(reviewDir), false);
  } finally {
    rmSync(reviewDir, { recursive: true, force: true });
  }
});

test('hasReviewRecord returns false when the directory does not exist', () => {
  const reviewDir = path.join(tmpdir(), `no-such-dir-${Date.now()}`);
  assert.equal(hasReviewRecord(reviewDir), false);
});
