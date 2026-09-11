import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { countOpenRisks, hasActiveWorkItems, runRiskValidation } from '../scripts/validate-risk-register.mjs';

/**
 * Build a disposable temp repo with RISKS.md and/or PROJECT_STATUS.md.
 */
function makeTempRepo({ risks, projectStatus }) {
  const root = mkdtempSync(path.join(tmpdir(), 'risk-register-test-'));
  mkdirSync(root, { recursive: true });
  if (risks !== undefined) {
    writeFileSync(path.join(root, 'RISKS.md'), risks);
  }
  if (projectStatus !== undefined) {
    writeFileSync(path.join(root, 'PROJECT_STATUS.md'), projectStatus);
  }
  return root;
}

// --- countOpenRisks unit tests -----------------------------------------------

test('countOpenRisks returns 0 total and 0 open when RISKS.md does not exist', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'risk-register-no-file-'));
  try {
    const result = countOpenRisks(root);
    assert.equal(result.total, 0);
    assert.equal(result.open, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('countOpenRisks counts total and open risks correctly', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |
| R-002 | Another risk. | Area | Low | Medium | Mitigation. | Owner | Open |
| R-003 | Yet another risk. | Area | Medium | Medium | Mitigation. | Owner | Open |
`;
  const root = makeTempRepo({ risks });
  try {
    const result = countOpenRisks(root);
    assert.equal(result.total, 3);
    assert.equal(result.open, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('countOpenRisks returns 0 open when all risks are closed', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |
| R-002 | Another risk. | Area | Low | Medium | Mitigation. | Owner | Closed |
`;
  const root = makeTempRepo({ risks });
  try {
    const result = countOpenRisks(root);
    assert.equal(result.total, 2);
    assert.equal(result.open, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- hasActiveWorkItems unit tests -------------------------------------------

test('hasActiveWorkItems returns false when PROJECT_STATUS.md does not exist', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'risk-register-no-ps-'));
  try {
    assert.equal(hasActiveWorkItems(root), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('hasActiveWorkItems returns false when project is idle', () => {
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: None
- Title: None
- Owner: None
- Status: Idle

## Current Stage
- Idle — P0 complete, awaiting next work item.
`;
  const root = makeTempRepo({ projectStatus });
  try {
    assert.equal(hasActiveWorkItems(root), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('hasActiveWorkItems returns true when active work items exist', () => {
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: ISSUE-99
- Title: Some work item
- Owner: Developer
- Status: Active

## Current Stage
- Development — working on ISSUE-99.
`;
  const root = makeTempRepo({ projectStatus });
  try {
    assert.equal(hasActiveWorkItems(root), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- runRiskValidation integration tests -------------------------------------

test('runRiskValidation passes when open risks exist (active work)', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |
| R-002 | Another risk. | Area | Low | Medium | Mitigation. | Owner | Open |
`;
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: ISSUE-99
- Title: Some work item
- Owner: Developer
- Status: Active
`;
  const root = makeTempRepo({ risks, projectStatus });
  try {
    const result = runRiskValidation(root);
    assert.equal(result.passed, true);
    assert.equal(result.total, 2);
    assert.equal(result.open, 1);
    assert.equal(result.activeWork, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runRiskValidation passes when project is idle with no open risks', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |
`;
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: None
- Title: None
- Owner: None
- Status: Idle
`;
  const root = makeTempRepo({ risks, projectStatus });
  try {
    const result = runRiskValidation(root);
    assert.equal(result.passed, true);
    assert.equal(result.total, 1);
    assert.equal(result.open, 0);
    assert.equal(result.activeWork, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runRiskValidation fails when active work exists but no open risks', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |
`;
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: ISSUE-99
- Title: Some work item
- Owner: Developer
- Status: Active
`;
  const root = makeTempRepo({ risks, projectStatus });
  try {
    const result = runRiskValidation(root);
    assert.equal(result.passed, false);
    assert.equal(result.total, 1);
    assert.equal(result.open, 0);
    assert.equal(result.activeWork, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- CLI exit code tests -----------------------------------------------------

test('CLI exits 0 when open risks exist', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Open |
`;
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: ISSUE-99
- Title: Work
- Owner: Dev
- Status: Active
`;
  const root = makeTempRepo({ risks, projectStatus });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-risk-register.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'CLI must exit 0 when open risks exist');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 0 when project is idle with no open risks', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |
`;
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: None
- Title: None
- Owner: None
- Status: Idle
`;
  const root = makeTempRepo({ risks, projectStatus });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-risk-register.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'CLI must exit 0 when project is idle with no open risks');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when active work exists but no open risks', () => {
  const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |
`;
  const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: ISSUE-99
- Title: Work
- Owner: Dev
- Status: Active
`;
  const root = makeTempRepo({ risks, projectStatus });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-risk-register.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'CLI must exit 1 when active work exists but no open risks');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
// --- Issue #214: a reset blanks RISKS.md, and this validator only ever
// --- read the current row count, so it could never detect the regression.

const REAL_RISKS = [
  '# RISKS.md',
  '',
  '| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |',
  '|---|---|---|---|---|---|---|---|',
  '| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Open |',
  '| R-002 | Another risk. | Area | Low | Medium | Mitigation. | Owner | Open |',
  ''
].join('\n');

const BLANK_RISKS = '# RISKS.md\n\n| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |\n|---|---|---|---|---|---|---|---|\n';

function makeGitRepoWithRiskHistory({ committed, current }) {
  const root = mkdtempSync(path.join(tmpdir(), 'risk-regress-'));
  const real = execFileSync('/bin/sh', ['-c', `cd "${root}" && pwd -P`]).toString().trim();
  const git = (...args) => execFileSync('git', args, { cwd: real, stdio: ['ignore', 'pipe', 'ignore'] });

  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(path.join(real, 'RISKS.md'), committed);
  git('add', '.');
  git('commit', '--quiet', '-m', 'baseline with risks');

  writeFileSync(path.join(real, 'RISKS.md'), current);
  git('add', '.');
  git('commit', '--quiet', '--allow-empty', '-m', 'second commit');
  return real;
}

test('runRiskValidation fails when the total risk count drops relative to the previous commit', () => {
  const root = makeGitRepoWithRiskHistory({ committed: REAL_RISKS, current: BLANK_RISKS });
  try {
    const result = runRiskValidation(root);
    assert.equal(result.total, 0);
    assert.equal(result.previousTotal, 2, 'the validator must look at what the previous commit held');
    assert.equal(
      result.passed,
      false,
      'blanking a risk register that held two entries must fail, even with no active work item'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runRiskValidation does not fail when the risk count is unchanged or grows', () => {
  const root = makeGitRepoWithRiskHistory({ committed: REAL_RISKS, current: REAL_RISKS });
  try {
    const result = runRiskValidation(root);
    assert.equal(result.previousTotal, 2);
    assert.equal(result.total, 2);
    assert.equal(result.passed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runRiskValidation does not fail when open risks drop but total is unchanged (legitimate closure)', () => {
  const closedRisks = [
    '# RISKS.md',
    '',
    '| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |',
    '|---|---|---|---|---|---|---|---|',
    '| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Closed |',
    '| R-002 | Another risk. | Area | Low | Medium | Mitigation. | Owner | Open |',
    ''
  ].join('\n');
  const root = makeGitRepoWithRiskHistory({ committed: REAL_RISKS, current: closedRisks });
  try {
    const result = runRiskValidation(root);
    assert.equal(result.previousTotal, 2);
    assert.equal(result.total, 2);
    assert.equal(result.open, 1);
    assert.equal(result.passed, true, 'closing a risk in place must not be treated as a regression');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 and names the previous count when the risk register shrinks', () => {
  const root = makeGitRepoWithRiskHistory({ committed: REAL_RISKS, current: BLANK_RISKS });
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-risk-register.mjs');
  try {
    let code = 0;
    let output = '';
    try {
      output = execFileSync(process.execPath, [scriptPath], {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe']
      }).toString();
    } catch (error) {
      code = error.status;
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    assert.equal(code, 1);
    assert.match(output, /2 .*0|risk register/i);
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
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'risk-origin-')));
  const originPath = path.join(dir, 'origin.git');
  const workPath = path.join(dir, 'work');
  execFileSync('git', ['init', '--quiet', '--bare', '--initial-branch=main', originPath]);

  execFileSync('git', ['clone', '--quiet', originPath, workPath]);
  const git = (...args) => execFileSync('git', args, { cwd: workPath, stdio: ['ignore', 'pipe', 'ignore'] });
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');

  writeFileSync(path.join(workPath, 'RISKS.md'), onMain);
  git('add', '.');
  git('commit', '--quiet', '-m', 'main baseline');
  git('push', '--quiet', 'origin', 'main');

  git('checkout', '--quiet', '-b', 'feature');
  for (const [index, content] of onBranch.entries()) {
    writeFileSync(path.join(workPath, 'RISKS.md'), content);
    git('add', '.');
    git('commit', '--quiet', '--allow-empty', '-m', `branch commit ${index}`);
  }
  return { dir, workPath };
}

const FIVE_RISKS = [
  '# RISKS.md',
  '',
  '| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |',
  '|---|---|---|---|---|---|---|---|',
  ...['001', '002', '003', '004', '005'].map(
    (id) => `| R-${id} | Risk ${id}. | Area | Medium | Medium | Mitigation. | Owner | Open |`
  ),
  ''
].join('\n');

test('risks added and then destroyed inside a feature branch are detected', () => {
  const { dir, workPath } = makeRepoWithOriginAndBranch({
    onMain: BLANK_RISKS,
    onBranch: [FIVE_RISKS, BLANK_RISKS]
  });
  try {
    const result = runRiskValidation(workPath);
    assert.equal(result.total, 0);
    assert.equal(
      result.previousTotal,
      5,
      'the merge base holds none of these risks, so comparing only against it hides the loss entirely'
    );
    assert.equal(result.passed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a loss in the middle of a branch is found only by walking the branch', () => {
  const { dir, workPath } = makeRepoWithOriginAndBranch({
    onMain: BLANK_RISKS,
    onBranch: [FIVE_RISKS, BLANK_RISKS, BLANK_RISKS]
  });
  try {
    const result = runRiskValidation(workPath);
    assert.equal(
      result.previousTotal,
      5,
      'neither the fork point nor the parent commit knows about these risks'
    );
    assert.equal(result.passed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Issue #220 AC-01: lock in the fail-open path (mirrors adr-audit.mjs's
// --- `previousAdrCount === undefined` design) with a real regression test.

test(
  'runRiskValidation fail-opens (previousTotal stays undefined, never 0) when no comparison commit can be read',
  () => {
    // A plain non-git temp dir: comparisonRefs(root) cannot even resolve HEAD,
    // so it returns [] and no comparison count is ever attempted — the same
    // "shallow clone or unreachable base" shape the docstring names. This is
    // the identical intentional design already present in adr-audit.mjs's
    // `previousAdrCount === undefined` branch: undefined must never be
    // conflated with 0, and the guard being *absent* here must not be
    // reported as passing an assertion it never made.
    const risks = `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Some risk. | Area | Medium | Medium | Mitigation. | Owner | Open |
`;
    const projectStatus = `# PROJECT_STATUS.md

## Current Work Item
- ID: None
- Title: None
- Owner: None
- Status: Idle
`;
    const root = makeTempRepo({ risks, projectStatus });
    try {
      const result = runRiskValidation(root);
      assert.equal(
        result.previousTotal,
        undefined,
        'no comparison commit could be read, so previousTotal must stay undefined, never 0'
      );
      assert.equal(result.regressed, false);
      assert.equal(result.passed, true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
);

test('a feature branch that only adds risks passes', () => {
  const { dir, workPath } = makeRepoWithOriginAndBranch({
    onMain: BLANK_RISKS,
    onBranch: [FIVE_RISKS]
  });
  try {
    const result = runRiskValidation(workPath);
    assert.equal(result.total, 5);
    assert.equal(result.passed, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
