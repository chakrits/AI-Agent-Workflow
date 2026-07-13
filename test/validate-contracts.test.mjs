import assert from 'node:assert/strict';
import test from 'node:test';
import { validateContracts } from '../scripts/validate-contracts.mjs';

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
