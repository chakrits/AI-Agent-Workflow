import assert from 'node:assert/strict';
import test from 'node:test';
import { validateQaEvidence } from '../scripts/validate-qa-evidence.mjs';

test('rejects a QA pass with an in-scope AC that has no evidence', () => {
  assert.deepEqual(validateQaEvidence({
    result: 'Pass',
    rows: [{ id: 'AC-01', source: 'Issue #26', evidence: '' }]
  }), ['AC-01 evidence or N/A reason']);
});

test('accepts evidence and an evidence-backed N/A rationale', () => {
  assert.deepEqual(validateQaEvidence({
    result: 'Pass',
    rows: [
      { id: 'AC-01', source: 'Issue #26', evidence: 'https://example.test/evidence' },
      { id: 'AC-02', source: 'SDD', evidence: 'N/A — Hosted Activation only' }
    ]
  }), []);
});
