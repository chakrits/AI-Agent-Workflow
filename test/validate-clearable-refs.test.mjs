import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findClearedDocMeaningRefs, isCodeFile, isHistoricalRecord } from '../scripts/validate-clearable-refs.mjs';

// Content-file meaning references that MUST be flagged.
test('flags an "Authoritative source:" pointer to a cleared document', () => {
  const text = 'Authoritative source: docs/superpowers/specs/2026-07-26-design.md';
  const refs = findClearedDocMeaningRefs(text);
  assert.ok(refs.length > 0, 'should flag an authoritative-source pointer');
  assert.match(refs[0], /docs\/superpowers\/specs\/2026-07-26-design\.md/);
});

test('flags a design/link pointer to a cleared document', () => {
  const text = 'Design: [`docs/superpowers/specs/2026-07-26-design.md`](../superpowers/specs/2026-07-26-design.md).';
  const refs = findClearedDocMeaningRefs(text);
  assert.ok(refs.length > 0, 'should flag a design link');
});

test('flags a "See <path>" meaning pointer', () => {
  const text = 'The rationale is in `docs/superpowers/plans/2026-07-28-plan.md`.';
  const refs = findClearedDocMeaningRefs(text);
  assert.ok(refs.length > 0, 'should flag a see/reference pointer');
});

// Non-flags: meaning-independent references that must NOT be flagged.
test('does not flag a bare cleared-directory mention without a document', () => {
  const text = 'Work Item records live under `docs/records/work-items/`.';
  const refs = findClearedDocMeaningRefs(text);
  assert.equal(refs.length, 0, 'bare directory mention is not a meaning ref');
});

test('does not flag an instruction/location reference with a template', () => {
  const text =
    'create a record at `docs/records/work-items/YYYY-MM-DD-issue-NN.md` using the WORK_ITEM.md template';
  const refs = findClearedDocMeaningRefs(text);
  assert.equal(refs.length, 0, 'instruction/location reference is not a meaning ref');
});

test('does not flag a code file', () => {
  assert.equal(isCodeFile('scripts/validate-dispatch-receipts.mjs'), true);
  assert.equal(isCodeFile('test/validate-dispatch-receipts.test.mjs'), true);
  assert.equal(isCodeFile('docs/workflow/dispatch-packet-contract.md'), false);
});

test('classifies historical records under docs/records/', () => {
  assert.equal(isHistoricalRecord('docs/records/qa/2026-07-31-issue-129-code-review.md'), true);
  assert.equal(isHistoricalRecord('docs/records/sdd/2026-08-12-issue-169-spec.md'), true);
  assert.equal(isHistoricalRecord('docs/workflow/dispatch-packet-contract.md'), false);
});