import assert from 'node:assert/strict';
import test from 'node:test';
import { validateContracts } from '../scripts/validate-contracts.mjs';

test('accepts the three canonical Bug Fix examples', async () => {
  const errors = await validateContracts(process.cwd());
  assert.deepEqual(errors, []);
});

test('rejects a transition not declared by the Bug Fix policy', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-illegal-transition.yaml'
  ]);
  assert.match(errors.join('\n'), /illegal transition: intake -> verifying/);
});

test('rejects a third Bug Fix rework transition', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-third-rework.yaml'
  ]);
  assert.match(errors.join('\n'), /rework_count must not exceed 2/);
});

test('rejects disconnected Bug Fix history', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-disconnected-history.yaml'
  ]);
  assert.match(errors.join('\n'), /history must be continuous/);
});

test('rejects history whose final transition does not reach the task state', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-final-state-mismatch.yaml'
  ]);
  assert.match(errors.join('\n'), /final history transition must reach state implementing/);
});

test('rejects transition evidence that is absent from the evidence map', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-missing-evidence.yaml'
  ]);
  assert.match(errors.join('\n'), /evidence failure_description must exist in evidence map/);
});

test('rejects a task retry limit that differs from the policy', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-mismatched-retry-limit.yaml'
  ]);
  assert.match(errors.join('\n'), /max_rework_attempts must equal policy value 2/);
});

test('rejects a retry-limit block without a terminal human-review event', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-retry-limit-block.yaml'
  ]);
  assert.match(
    errors.join('\n'),
    /blocked task after retry limit requires terminal verifying -> blocked with human_review_required: true/
  );
});

test('rejects a retry-limit block when human-review evidence is not true', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-human-review-evidence.yaml'
  ]);
  assert.match(
    errors.join('\n'),
    /blocked task after retry limit requires terminal verifying -> blocked with human_review_required: true/
  );
});
