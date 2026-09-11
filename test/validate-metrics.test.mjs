import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseTaskLogEntries,
  countTimeouts,
  countReworks,
  countPrReferences
} from '../scripts/validate-metrics.mjs';

const SAMPLE_TASK_LOG = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-25 | Issue #76 / PR #78 | Developer | Added validator | All tests pass | QA Agent | Skill Used: testing-discipline |
| 2026-07-24 | Issue #75 / PR #77 | Developer | Subagent timed out after 43min | Recovered | QA Agent | Subagent timed out; parent fixed and re-synced. |
| 2026-07-23 | Issue #74 / PR #76 | Developer | Rework 1 needed | Fixed | QA Agent | Rework after QA found a gap. |
| 2026-07-22 | Issue #73 | Developer | Clean delivery | Done | QA Agent | No issues. |
`;

test('parseTaskLogEntries extracts date and notes from a sample TASK_LOG', () => {
  const entries = parseTaskLogEntries(SAMPLE_TASK_LOG);
  assert.equal(entries.length, 4);
  assert.equal(entries[0].date, '2026-07-25');
  assert.equal(entries[0].workItem, 'Issue #76 / PR #78');
  assert.equal(entries[0].notes, 'Skill Used: testing-discipline');
  assert.equal(entries[1].date, '2026-07-24');
  assert.equal(entries[1].notes, 'Subagent timed out; parent fixed and re-synced.');
});

test('countTimeouts returns correct count when notes contain "timeout"', () => {
  const entries = parseTaskLogEntries(SAMPLE_TASK_LOG);
  assert.equal(countTimeouts(entries), 1);
});

test('countTimeouts returns 0 when no timeouts', () => {
  const entries = parseTaskLogEntries(SAMPLE_TASK_LOG).filter(
    (e) => !/timeout|timed[_ ]out/i.test(e.notes)
  );
  assert.equal(countTimeouts(entries), 0);
});

test('countReworks returns correct count when notes contain "rework"', () => {
  const entries = parseTaskLogEntries(SAMPLE_TASK_LOG);
  assert.equal(countReworks(entries), 1);
});

test('countPrReferences returns the number of unique #NN tokens', () => {
  const entries = parseTaskLogEntries(SAMPLE_TASK_LOG);
  // #76, #78, #75, #77, #74, #76(dup), #73 -> 6 unique
  assert.equal(countPrReferences(entries), 6);
});
