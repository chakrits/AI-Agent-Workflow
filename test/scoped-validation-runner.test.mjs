import assert from 'node:assert/strict';
import test from 'node:test';
import { diffArguments, parseChangedPaths } from '../scripts/run-scoped-validations.mjs';

test('runner requests both rename endpoints and preserves path boundaries with NUL output', () => {
  const base = 'a'.repeat(40);
  const head = 'b'.repeat(40);
  assert.deepEqual(diffArguments(base, head), ['diff', '--name-only', '--no-renames', '-z', `${base}...${head}`]);
  assert.deepEqual(parseChangedPaths('docs/old.md\0scripts/new.mjs\0'), ['docs/old.md', 'scripts/new.mjs']);
});

test('runner rejects incomplete or untrusted commit identifiers', () => {
  assert.equal(diffArguments(undefined, 'b'.repeat(40)), undefined);
  assert.equal(diffArguments('x; npm test', 'b'.repeat(40)), undefined);
  assert.equal(diffArguments('a'.repeat(40), 'b'.repeat(39)), undefined);
});
