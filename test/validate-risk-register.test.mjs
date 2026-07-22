import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
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