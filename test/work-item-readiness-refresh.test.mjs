import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldFetchPlanOnlyFiles } from '../scripts/work-item-readiness-refresh.mjs';

test('fetches files for an exact plan-only marker on a linked Issue PR', () => {
  assert.equal(
    shouldFetchPlanOnlyFiles({
      body: '<!-- plan-only: true -->',
      issueNumber: 182,
      closeout: false
    }),
    true
  );
});

test('does not fetch files for normal linked Issue PRs', () => {
  assert.equal(
    shouldFetchPlanOnlyFiles({
      body: 'Developer: Work Item (Issue) URL: https://github.com/x/y/issues/1',
      issueNumber: 1,
      closeout: false
    }),
    false
  );
});

test('does not fetch files for closeout PRs even if the body contains the marker', () => {
  assert.equal(
    shouldFetchPlanOnlyFiles({
      body: '<!-- plan-only: true -->\n<!-- post-merge-closeout: complete; source-pr-1 -->',
      issueNumber: 1,
      closeout: true
    }),
    false
  );
});

test('does not fetch files without a same-repository linked Issue number', () => {
  assert.equal(
    shouldFetchPlanOnlyFiles({ body: '<!-- plan-only: true -->', closeout: false }),
    false
  );
});

test('requires the exact marker rather than a copied or wrapped phrase', () => {
  for (const body of [
    '<!-- plan-only: false -->',
    '> <!-- plan-only: true -->',
    '`<!-- plan-only: true -->`'
  ]) {
    assert.equal(
      shouldFetchPlanOnlyFiles({ body, issueNumber: 182, closeout: false }),
      false,
      body
    );
  }
});
