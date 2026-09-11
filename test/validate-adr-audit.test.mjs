import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
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

test('runAudit returns passed=true when no ADRs and no decisions exist (clean-slate reset repo)', () => {
  const decisions = `# DECISIONS.md

No ADRs yet — this is a fresh clone of the workflow template.
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
`;
  const root = makeTempRepo({ decisions, taskLog });
  try {
    const result = runAudit(root);
    assert.equal(result.passed, true);
    assert.equal(result.adrCount, 0);
    assert.equal(result.taskLogDecisions, 0);
    assert.equal(result.ratio, 0);
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

test('CLI exits 0 when no ADRs and no decisions exist (clean-slate reset repo)', () => {
  const decisions = `# DECISIONS.md

No ADRs yet — this is a fresh clone of the workflow template.
`;
  const taskLog = `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
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
    assert.equal(exitCode, 0, 'CLI must exit 0 when there are no ADRs and no decisions to audit');
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
// --- Issue #208: a reset blanks DECISIONS.md and TASK_LOG.md together, so the
// --- ratio becomes 0/0 and the audit reports PASS while the decision log is destroyed.

const REAL_ADRS = [
  '# DECISIONS.md',
  '',
  '## Decision Log',
  '',
  '### ADR-0017: Use one authoritative path',
  '',
  '- Date: 2026-07-31',
  '- Status: Accepted',
  '',
  '### ADR-0019: No-Go and freeze',
  '',
  '- Date: 2026-08-22',
  '- Status: Accepted',
  ''
].join('\n');

const BLANK_DECISIONS = '# DECISIONS.md\n\n## Decision Log\n\nNo decisions recorded yet.\n';

function makeGitRepoWithAdrHistory({ committed, current }) {
  const root = mkdtempSync(path.join(tmpdir(), 'adr-regress-'));
  const real = execFileSync('/bin/sh', ['-c', `cd "${root}" && pwd -P`]).toString().trim();
  const git = (...args) => execFileSync('git', args, { cwd: real, stdio: ['ignore', 'pipe', 'ignore'] });

  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(path.join(real, 'DECISIONS.md'), committed);
  writeFileSync(path.join(real, 'TASK_LOG.md'), '# TASK_LOG.md\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'baseline with decisions');

  writeFileSync(path.join(real, 'DECISIONS.md'), current);
  // Always touch a second file so the commit exists even when DECISIONS.md is
  // unchanged; otherwise git creates nothing and HEAD~1 does not resolve.
  writeFileSync(path.join(real, 'TASK_LOG.md'), '# TASK_LOG.md\n\nsecond commit\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'second commit');
  return real;
}

test('runAudit fails when the real ADR count drops relative to the previous commit', () => {
  const root = makeGitRepoWithAdrHistory({ committed: REAL_ADRS, current: BLANK_DECISIONS });
  try {
    const result = runAudit(root);
    assert.equal(result.adrCount, 0);
    assert.equal(result.previousAdrCount, 2, 'the audit must look at what the previous commit held');
    assert.equal(
      result.passed,
      false,
      'blanking a decision log that held two ADRs must fail, even though 0/0 is inside the ratio threshold'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runAudit does not fail when the ADR count is unchanged or grows', () => {
  const root = makeGitRepoWithAdrHistory({ committed: REAL_ADRS, current: REAL_ADRS });
  try {
    const result = runAudit(root);
    assert.equal(result.previousAdrCount, 2);
    assert.equal(result.adrCount, 2);
    assert.equal(result.passed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 and names the lost ADR count when the decision log shrinks', () => {
  const root = makeGitRepoWithAdrHistory({ committed: REAL_ADRS, current: BLANK_DECISIONS });
  try {
    let code = 0;
    let output = '';
    try {
      output = execFileSync(process.execPath, [path.resolve('scripts/adr-audit.mjs')], {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe']
      }).toString();
    } catch (error) {
      code = error.status;
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    assert.equal(code, 1);
    assert.match(output, /2 .*0|decision log/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- QA findings on Issue #208 candidate 3ccd8f4 ---

test('a real ADR is counted whatever shape its date field takes', () => {
  for (const dateLine of ['- Date: 2026-01-01', '**Date:** 2026-01-01', 'Date: 2026-01-01']) {
    const root = makeTempRepo({
      decisions: `# DECISIONS.md\n\n### ADR-0042: real\n\n${dateLine}\n- Status: Accepted\n`
    });
    try {
      assert.equal(
        countRealAdrs(root),
        1,
        `"${dateLine}" is a recorded decision; not counting it means the reset silently destroys it`
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('an unfilled template ADR is still not counted', () => {
  const root = makeTempRepo({
    decisions: '# DECISIONS.md\n\n### ADR-0001: <Title>\n\n- Date:\n- Status: Proposed / Accepted\n'
  });
  try {
    assert.equal(countRealAdrs(root), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * A repository with a real `origin` remote and a feature branch, which is the
 * shape CI actually runs on. Fixtures without a remote always fall through to
 * the HEAD~1 path, leaving the merge-base branch untested.
 */
function makeRepoWithOriginAndBranch({ onMain, onBranch }) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'adr-origin-')));
  const originPath = path.join(dir, 'origin.git');
  const workPath = path.join(dir, 'work');
  execFileSync('git', ['init', '--quiet', '--bare', '--initial-branch=main', originPath]);

  execFileSync('git', ['clone', '--quiet', originPath, workPath]);
  const git = (...args) => execFileSync('git', args, { cwd: workPath, stdio: ['ignore', 'pipe', 'ignore'] });
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');

  writeFileSync(path.join(workPath, 'DECISIONS.md'), onMain);
  writeFileSync(path.join(workPath, 'TASK_LOG.md'), '# TASK_LOG.md\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'main baseline');
  git('push', '--quiet', 'origin', 'main');

  git('checkout', '--quiet', '-b', 'feature');
  for (const [index, content] of onBranch.entries()) {
    writeFileSync(path.join(workPath, 'DECISIONS.md'), content);
    writeFileSync(path.join(workPath, 'TASK_LOG.md'), `# TASK_LOG.md\n\ncommit ${index}\n`);
    git('add', '.');
    git('commit', '--quiet', '-m', `branch commit ${index}`);
  }
  return { dir, workPath };
}

const FIVE_ADRS = [
  '# DECISIONS.md',
  '',
  ...['0001', '0002', '0003', '0004', '0005'].flatMap((id) => [
    `### ADR-${id}: decision ${id}`,
    '',
    '- Date: 2026-01-01',
    '- Status: Accepted',
    ''
  ])
].join('\n');

test('ADRs added and then destroyed inside a feature branch are detected', () => {
  const { dir, workPath } = makeRepoWithOriginAndBranch({
    onMain: BLANK_DECISIONS,
    onBranch: [FIVE_ADRS, BLANK_DECISIONS]
  });
  try {
    const result = runAudit(workPath);
    assert.equal(result.adrCount, 0);
    assert.equal(
      result.previousAdrCount,
      5,
      'the merge base holds none of these ADRs, so comparing only against it hides the loss entirely'
    );
    assert.equal(result.passed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a feature branch that removes an ADR present on main is detected', () => {
  const { dir, workPath } = makeRepoWithOriginAndBranch({
    onMain: FIVE_ADRS,
    onBranch: [BLANK_DECISIONS]
  });
  try {
    const result = runAudit(workPath);
    assert.equal(result.previousAdrCount, 5);
    assert.equal(result.passed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a feature branch that only adds ADRs passes', () => {
  const { dir, workPath } = makeRepoWithOriginAndBranch({
    onMain: BLANK_DECISIONS,
    onBranch: [FIVE_ADRS]
  });
  try {
    const result = runAudit(workPath);
    assert.equal(result.adrCount, 5);
    assert.equal(result.passed, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Re-review findings: the previous "coverage" tests survived deleting the
// --- rev-list walk they existed to prove, so only cases the walk alone can
// --- answer are added here. Each must fail if that block is removed.

test('a loss in the middle of a branch is found only by walking the branch', () => {
  const { dir, workPath } = makeRepoWithOriginAndBranch({
    onMain: BLANK_DECISIONS,
    onBranch: [FIVE_ADRS, BLANK_DECISIONS, BLANK_DECISIONS]
  });
  try {
    const result = runAudit(workPath);
    // merge base holds 0 and HEAD~1 holds 0; only the middle commit holds 5,
    // so this assertion cannot be satisfied by the HEAD~1 fallback alone.
    assert.equal(
      result.previousAdrCount,
      5,
      'neither the fork point nor the parent commit knows about these ADRs'
    );
    assert.equal(result.passed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unfilled template ADR is not counted whatever emphasis it uses', () => {
  for (const dateLine of ['- Date:', 'Date:', '**Date:**', '**Date**:', '* Date:']) {
    const root = makeTempRepo({
      decisions: `# DECISIONS.md\n\n### ADR-0001: <Title>\n\n${dateLine}\n- Status: Proposed\n`
    });
    try {
      assert.equal(
        countRealAdrs(root),
        0,
        `"${dateLine}" has no value; counting it lets a blanked log look populated`
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('a filled date is counted whatever emphasis it uses', () => {
  for (const dateLine of ['- Date: 2026-01-01', 'Date: 2026-01-01', '**Date:** 2026-01-01', '**Date**: 2026-01-01', '* Date: 2026-01-01']) {
    const root = makeTempRepo({
      decisions: `# DECISIONS.md\n\n### ADR-0042: real\n\n${dateLine}\n`
    });
    try {
      assert.equal(countRealAdrs(root), 1, `"${dateLine}" is a recorded decision`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('a placeholder date value is still counted, as it was before this guard existed', () => {
  const root = makeTempRepo({
    decisions: '# DECISIONS.md\n\n### ADR-0001: <Title>\n\n- Date: <YYYY-MM-DD>\n'
  });
  try {
    // Pinned deliberately: this counted before Issue #208 and tightening it now
    // would be scope expansion dressed as a regression fix.
    assert.equal(countRealAdrs(root), 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
