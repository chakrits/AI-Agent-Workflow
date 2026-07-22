import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { countRealAdrs, countTaskLogDecisions, runAudit } from '../scripts/adr-audit.mjs';

/**
 * Build a disposable temp repo with DECISIONS.md and TASK_LOG.md.
 */
function makeTempRepo({ decisions, taskLog }) {
  const root = mkdtempSync(path.join(tmpdir(), 'adr-audit-test-'));
  mkdirSync(root, { recursive: true });
  if (decisions !== undefined) {
    writeFileSync(path.join(root, 'DECISIONS.md'), decisions);
  }
  if (taskLog !== undefined) {
    writeFileSync(path.join(root, 'TASK_LOG.md'), taskLog);
  }
  return root;
}

// --- countRealAdrs unit tests -----------------------------------------------

test('countRealAdrs returns 0 when DECISIONS.md does not exist', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'adr-audit-no-file-'));
  try {
    assert.equal(countRealAdrs(root), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('countRealAdrs returns 0 when only stub ADRs exist', () => {
  const content = `# DECISIONS.md

### ADR-0001: <Title>

- Date:
- Status: Proposed / Accepted / Superseded / Rejected
- Context:
- Decision:
- Alternatives Considered:
- Consequences:
- Owner:
`;
  const root = makeTempRepo({ decisions: content });
  try {
    assert.equal(countRealAdrs(root), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('countRealAdrs counts only non-stub ADRs', () => {
  const content = `# DECISIONS.md

### ADR-0001: <Title>

- Date:
- Status: Proposed / Accepted / Superseded / Rejected
- Context:
- Decision:
- Alternatives Considered:
- Consequences:
- Owner:

### ADR-0002: A Real Decision

- Date: 2026-07-13
- Status: Accepted
- Context: Some context.
- Decision: Some decision.
- Alternatives Considered: Some alternative.
- Consequences: Some consequence.
- Owner: Human Product / Process Owner

### ADR-0003: Another Real Decision

- Date: 2026-07-14
- Status: Accepted
- Context: More context.
- Decision: More decision.
- Alternatives Considered: More alternative.
- Consequences: More consequence.
- Owner: Human Product / Process Owner
`;
  const root = makeTempRepo({ decisions: content });
  try {
    assert.equal(countRealAdrs(root), 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- countTaskLogDecisions unit tests ---------------------------------------

test('countTaskLogDecisions returns 0 when TASK_LOG.md does not exist', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'adr-audit-no-tl-'));
  try {
    assert.equal(countTaskLogDecisions(root), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('countTaskLogDecisions counts decision keywords excluding header row', () => {
  const content = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM | Agent | Did something | Excluded feature X and deferred feature Y | Next | Deliberately skipped Z. |
| 2026-07-15 | WORK-ITEM-2 | Agent | Did more | Rejected option A. Deferred option B. | Next | |
`;
  const root = makeTempRepo({ taskLog: content });
  try {
    // excluded (1), deferred (1), deliberately (1), skipped (1), rejected (1), deferred (1) = 6
    assert.equal(countTaskLogDecisions(root), 6);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('countTaskLogDecisions returns 0 when no keywords match', () => {
  const content = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM | Agent | Did something | Did the thing. | Next | All good. |
`;
  const root = makeTempRepo({ taskLog: content });
  try {
    assert.equal(countTaskLogDecisions(root), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- runAudit integration tests ---------------------------------------------

test('runAudit returns passed=true when ratio is within threshold (≤ 10:1)', () => {
  // 2 ADRs, 5 decisions = 2.5:1 ratio → pass
  const decisions = `# DECISIONS.md

### ADR-0002: A Decision

- Date: 2026-07-13
- Status: Accepted
- Context: Context.
- Decision: Decision.
- Alternatives Considered: Alternative.
- Consequences: Consequence.
- Owner: Owner

### ADR-0003: Another Decision

- Date: 2026-07-14
- Status: Accepted
- Context: Context.
- Decision: Decision.
- Alternatives Considered: Alternative.
- Consequences: Consequence.
- Owner: Owner
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM | Agent | Work | Excluded feature A. Deferred feature B. | Next | Skipped C. Rejected D. Deliberately skipped E. |
`;
  const root = makeTempRepo({ decisions, taskLog });
  try {
    const result = runAudit(root);
    assert.equal(result.passed, true);
    assert.equal(result.adrCount, 2);
    assert.equal(result.taskLogDecisions, 6);
    assert.equal(result.ratio, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runAudit returns passed=false when ratio exceeds threshold (> 10:1)', () => {
  // 1 ADR, 16 decisions = 16:1 ratio → fail
  const decisions = `# DECISIONS.md

### ADR-0002: A Decision

- Date: 2026-07-13
- Status: Accepted
- Context: C.
- Decision: D.
- Alternatives Considered: A.
- Consequences: C.
- Owner: O
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM-1 | Agent | Work | Excluded feature A. | Next | |
| 2026-07-14 | WORK-ITEM-2 | Agent | Work | Deferred feature B. | Next | |
| 2026-07-14 | WORK-ITEM-3 | Agent | Work | Rejected option C. | Next | |
| 2026-07-14 | WORK-ITEM-4 | Agent | Work | Skipped task D. | Next | |
| 2026-07-14 | WORK-ITEM-5 | Agent | Work | Opted out of E. | Next | |
| 2026-07-14 | WORK-ITEM-6 | Agent | Work | Deferred feature F. | Next | |
| 2026-07-14 | WORK-ITEM-7 | Agent | Work | Excluded feature G. | Next | |
| 2026-07-14 | WORK-ITEM-8 | Agent | Work | Rejected option H. | Next | |
| 2026-07-14 | WORK-ITEM-9 | Agent | Work | Skipped task I. | Next | |
| 2026-07-14 | WORK-ITEM-10 | Agent | Work | Deferred feature J. | Next | |
| 2026-07-14 | WORK-ITEM-11 | Agent | Work | Excluded feature K. | Next | |
| 2026-07-14 | WORK-ITEM-12 | Agent | Work | Rejected option L. | Next | |
| 2026-07-14 | WORK-ITEM-13 | Agent | Work | Skipped task M. | Next | |
| 2026-07-14 | WORK-ITEM-14 | Agent | Work | Deferred feature N. | Next | |
| 2026-07-14 | WORK-ITEM-15 | Agent | Work | Excluded feature O. | Next | |
| 2026-07-14 | WORK-ITEM-16 | Agent | Work | Rejected option P. | Next | |
| 2026-07-14 | WORK-ITEM-17 | Agent | Work | Skipped task Q. | Next | |
`;
  const root = makeTempRepo({ decisions, taskLog });
  try {
    const result = runAudit(root);
    assert.equal(result.passed, false);
    assert.equal(result.adrCount, 1);
    assert.equal(result.taskLogDecisions, 16);
    assert.equal(result.ratio, 16);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runAudit returns passed=false when no ADRs exist (ratio = Infinity)', () => {
  const decisions = `# DECISIONS.md

### ADR-0001: <Title>

- Date:
- Status: Proposed / Accepted / Superseded / Rejected
- Context:
- Decision:
- Alternatives Considered:
- Consequences:
- Owner:
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM | Agent | Work | Excluded feature A. | Next | |
`;
  const root = makeTempRepo({ decisions, taskLog });
  try {
    const result = runAudit(root);
    assert.equal(result.passed, false);
    assert.equal(result.adrCount, 0);
    assert.equal(result.ratio, Infinity);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- CLI exit code tests ----------------------------------------------------

test('CLI exits 0 when ratio is within threshold', () => {
  const decisions = `# DECISIONS.md

### ADR-0002: A Decision

- Date: 2026-07-13
- Status: Accepted
- Context: C.
- Decision: D.
- Alternatives Considered: A.
- Consequences: C.
- Owner: O
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM | Agent | Work | Excluded feature A. | Next | |
`;
  const root = makeTempRepo({ decisions, taskLog });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'adr-audit.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'CLI must exit 0 when ratio is within threshold');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when ratio exceeds threshold', () => {
  const decisions = `# DECISIONS.md

### ADR-0002: A Decision

- Date: 2026-07-13
- Status: Accepted
- Context: C.
- Decision: D.
- Alternatives Considered: A.
- Consequences: C.
- Owner: O
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM-1 | Agent | Work | Excluded feature A. | Next | |
| 2026-07-14 | WORK-ITEM-2 | Agent | Work | Deferred feature B. | Next | |
| 2026-07-14 | WORK-ITEM-3 | Agent | Work | Rejected option C. | Next | |
| 2026-07-14 | WORK-ITEM-4 | Agent | Work | Skipped task D. | Next | |
| 2026-07-14 | WORK-ITEM-5 | Agent | Work | Deliberately excluded E. | Next | |
| 2026-07-14 | WORK-ITEM-6 | Agent | Work | Deferred feature F. | Next | |
| 2026-07-14 | WORK-ITEM-7 | Agent | Work | Excluded feature G. | Next | |
| 2026-07-14 | WORK-ITEM-8 | Agent | Work | Rejected option H. | Next | |
| 2026-07-14 | WORK-ITEM-9 | Agent | Work | Skipped task I. | Next | |
| 2026-07-14 | WORK-ITEM-10 | Agent | Work | Deferred feature J. | Next | |
| 2026-07-14 | WORK-ITEM-11 | Agent | Work | Excluded feature K. | Next | |
`;
  const root = makeTempRepo({ decisions, taskLog });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'adr-audit.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'CLI must exit 1 when ratio exceeds threshold');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when no ADRs exist', () => {
  const decisions = `# DECISIONS.md

### ADR-0001: <Title>

- Date:
- Status: Proposed / Accepted / Superseded / Rejected
- Context:
- Decision:
- Alternatives Considered:
- Consequences:
- Owner:
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
| 2026-07-14 | WORK-ITEM | Agent | Work | Excluded feature A. | Next | |
`;
  const root = makeTempRepo({ decisions, taskLog });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'adr-audit.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'CLI must exit 1 when no real ADR entries exist');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});