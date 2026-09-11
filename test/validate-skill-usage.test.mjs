import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseTaskLogEntries,
  isNewEntry,
  hasSkillNotation,
  validateSkillUsage
} from '../scripts/validate-skill-usage.mjs';

/**
 * Build a disposable temp repo with a TASK_LOG.md.
 */
function makeTempRepo({ taskLog }) {
  const root = mkdtempSync(path.join(tmpdir(), 'skill-usage-test-'));
  mkdirSync(root, { recursive: true });
  if (taskLog !== undefined) {
    writeFileSync(path.join(root, 'TASK_LOG.md'), taskLog);
  }
  return root;
}

// --- isNewEntry unit tests --------------------------------------------------

test('isNewEntry returns true for date on the cutover (2026-07-25)', () => {
  assert.equal(isNewEntry('2026-07-25'), true);
});

test('isNewEntry returns true for date after the cutover', () => {
  assert.equal(isNewEntry('2026-07-26'), true);
  assert.equal(isNewEntry('2026-08-01'), true);
});

test('isNewEntry returns false for date before the cutover (2026-07-24)', () => {
  assert.equal(isNewEntry('2026-07-24'), false);
  assert.equal(isNewEntry('2026-07-13'), false);
});

test('isNewEntry respects a custom cutoff', () => {
  assert.equal(isNewEntry('2026-08-01', '2026-08-15'), false);
  assert.equal(isNewEntry('2026-08-15', '2026-08-15'), true);
  assert.equal(isNewEntry('2026-08-20', '2026-08-15'), true);
});

// --- hasSkillNotation unit tests --------------------------------------------

test('hasSkillNotation returns true when notes contain "Skill Used:"', () => {
  assert.equal(hasSkillNotation('Skill Used: debugging-discipline'), true);
});

test('hasSkillNotation returns true when notes contain "No matching skill —"', () => {
  assert.equal(hasSkillNotation('No matching skill — none applicable'), true);
});

test('hasSkillNotation returns false when notes have no skill notation', () => {
  assert.equal(hasSkillNotation('Did the thing.'), false);
  assert.equal(hasSkillNotation(''), false);
});

// --- parseTaskLogEntries unit tests -----------------------------------------

test('parseTaskLogEntries extracts date, workItem, and notes correctly', () => {
  const content = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-25 | Issue #76 | Developer | Added validator | All tests pass | QA Agent | Skill Used: testing-discipline |
| 2026-07-24 | Issue #75 | Developer | Old work | Done | Next | No skill notation here. |
`;
  const entries = parseTaskLogEntries(content);
  assert.equal(entries.length, 2);

  assert.equal(entries[0].date, '2026-07-25');
  assert.equal(entries[0].workItem, 'Issue #76');
  assert.equal(entries[0].notes, 'Skill Used: testing-discipline');

  assert.equal(entries[1].date, '2026-07-24');
  assert.equal(entries[1].workItem, 'Issue #75');
  assert.equal(entries[1].notes, 'No skill notation here.');
});

test('parseTaskLogEntries returns empty array when no data rows', () => {
  const content = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
|---|---|---|---|---|---|---|
`;
  const entries = parseTaskLogEntries(content);
  assert.equal(entries.length, 0);
});

test('parseTaskLogEntries skips header and separator rows', () => {
  const content = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
|---|---|---|---|---|---|---|
| 2026-07-25 | WI | A | X | Y | Z | Skill Used: foo |
`;
  const entries = parseTaskLogEntries(content);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].date, '2026-07-25');
});

// --- validateSkillUsage integration tests -----------------------------------

test('validateSkillUsage passes when all new entries have skill notation', () => {
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-24 | OLD | Agent | Work | Done | Next | No notation. |
| 2026-07-25 | NEW | Agent | Work | Done | Next | Skill Used: debugging-discipline |
| 2026-07-26 | NEW2 | Agent | Work | Done | Next | No matching skill — none applicable |
`;
  const root = makeTempRepo({ taskLog });
  try {
    const result = validateSkillUsage(root);
    assert.equal(result.passed, true);
    assert.equal(result.violations.length, 0);
    assert.equal(result.checked, 2);
    assert.equal(result.total, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateSkillUsage fails when a new entry lacks skill notation', () => {
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-24 | OLD | Agent | Work | Done | Next | No notation. |
| 2026-07-25 | NEW | Agent | Work | Done | Next | Forgot to add notation. |
`;
  const root = makeTempRepo({ taskLog });
  try {
    const result = validateSkillUsage(root);
    assert.equal(result.passed, false);
    assert.equal(result.violations.length, 1);
    assert.equal(result.violations[0].date, '2026-07-25');
    assert.equal(result.violations[0].workItem, 'NEW');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateSkillUsage exempts historical entries before cutoff', () => {
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-22 | OLD1 | Agent | Work | Done | Next | No notation. |
| 2026-07-23 | OLD2 | Agent | Work | Done | Next | No notation either. |
`;
  const root = makeTempRepo({ taskLog });
  try {
    const result = validateSkillUsage(root);
    assert.equal(result.passed, true);
    assert.equal(result.checked, 0);
    assert.equal(result.violations.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('validateSkillUsage passes when TASK_LOG.md does not exist', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'skill-usage-no-file-'));
  try {
    const result = validateSkillUsage(root);
    assert.equal(result.passed, true);
    assert.equal(result.total, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- CLI exit code tests -----------------------------------------------------

test('CLI exits 0 when all new entries have skill notation', () => {
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-25 | NEW | Agent | Work | Done | Next | Skill Used: debugging-discipline |
`;
  const root = makeTempRepo({ taskLog });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-skill-usage.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'CLI must exit 0 when all new entries have skill notation');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when a new entry lacks skill notation', () => {
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-25 | NEW | Agent | Work | Done | Next | Forgot. |
`;
  const root = makeTempRepo({ taskLog });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-skill-usage.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'CLI must exit 1 when a new entry lacks skill notation');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 0 when only historical (pre-cutoff) entries exist', () => {
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-22 | OLD | Agent | Work | Done | Next | No notation. |
`;
  const root = makeTempRepo({ taskLog });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-skill-usage.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'CLI must exit 0 when only historical entries exist');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
