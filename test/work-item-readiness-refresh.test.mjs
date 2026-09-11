import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadPlanOnlyChangedFiles,
  shouldFetchPlanOnlyFiles
} from '../scripts/work-item-readiness-refresh.mjs';

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

test('loads filenames only for the guarded plan-only path and returns them for changedFiles', async () => {
  const calls = [];
  const changedFiles = await loadPlanOnlyChangedFiles({
    body: '<!-- plan-only: true -->',
    issueNumber: 182,
    pullNumber: 182,
    listFiles: async (pullNumber) => {
      calls.push(pullNumber);
      return [
        { filename: 'docs/records/implementation-plan/example.md' },
        { filename: 'docs/records/implementation-plan/second.md' }
      ];
    }
  });

  assert.deepEqual(calls, [182]);
  assert.deepEqual(changedFiles, [
    'docs/records/implementation-plan/example.md',
    'docs/records/implementation-plan/second.md'
  ]);
});

test('does not call the file API for normal, unlinked, or closeout paths', async () => {
  let calls = 0;
  const listFiles = async () => {
    calls += 1;
    return [{ filename: 'unexpected.md' }];
  };

  for (const input of [
    { body: 'normal', issueNumber: 182 },
    { body: '<!-- plan-only: true -->' },
    { body: '<!-- plan-only: true -->', issueNumber: 182, closeout: true }
  ]) {
    assert.deepEqual(await loadPlanOnlyChangedFiles({ ...input, listFiles }), []);
  }
  assert.equal(calls, 0);
});
