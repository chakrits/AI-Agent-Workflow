import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  countTokens,
  collectBudget,
  evaluateBootloader,
  evaluateRoles,
  TARGET,
  BOOTLOADER_TARGET,
  ROLE_BUDGET_TARGET,
  BOOTLOADER_FILE,
  CANONICAL_FILES
} from '../scripts/validate-context-budget.mjs';

/**
 * Build a disposable temp repo with a small set of canonical reading files.
 */
function makeTempRepo(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'context-budget-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

// --- countTokens unit tests -------------------------------------------------

test('countTokens returns correct approximation for a known string (chars / 4)', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'counttokens-'));
  const file = path.join(root, 'sample.txt');
  try {
    // 40 chars -> 10 tokens
    writeFileSync(file, '0123456789012345678901234567890123456789');
    assert.equal(countTokens(file), 10);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('countTokens returns 0 for a missing file', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'counttokens-missing-'));
  try {
    assert.equal(countTokens(path.join(root, 'does-not-exist.md')), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- collectBudget unit tests ----------------------------------------------

test('collectBudget returns total + per-file breakdown', () => {
  const files = {
    'a.md': 'A'.repeat(40),      // 40 chars -> 10 tokens
    'b.md': 'B'.repeat(80)       // 80 chars -> 20 tokens
  };
  const root = makeTempRepo(files);
  try {
    const result = collectBudget(
      [{ path: 'a.md' }, { path: 'b.md' }],
      root
    );
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].file, 'a.md');
    assert.equal(result.rows[0].chars, 40);
    assert.equal(result.rows[0].tokens, 10);
    assert.equal(result.rows[0].exists, true);
    assert.equal(result.rows[1].file, 'b.md');
    assert.equal(result.rows[1].tokens, 20);
    assert.equal(result.totalChars, 120);
    assert.equal(result.totalTokens, 30);
    assert.equal(result.over, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('collectBudget flags over=true when total exceeds TARGET', () => {
  // Create a single file large enough to exceed the default target of 30000.
  const big = 'X'.repeat((TARGET + 1) * 4);
  const root = makeTempRepo({ 'big.md': big });
  try {
    const result = collectBudget([{ path: 'big.md' }], root);
    assert.ok(result.totalTokens > TARGET);
    assert.equal(result.over, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Bootloader and Role Budget unit tests (TC-001..TC-004, TC-007) ----------

test('TC-001: evaluateBootloader reports <= 3,500 tokens for real repo bootloader', () => {
  const result = evaluateBootloader();
  assert.equal(result.exists, true, 'Bootloader file must exist');
  assert.ok(result.tokens <= BOOTLOADER_TARGET, `Bootloader tokens ${result.tokens} must be <= ${BOOTLOADER_TARGET}`);
  assert.equal(result.over, false);
});

test('TC-002: Core Bootloader contains required golden rules, human approval gates, and manifest', () => {
  const content = readFileSync(BOOTLOADER_FILE, 'utf8');
  assert.match(content, /Operating Principles & Golden Rules/i);
  assert.match(content, /Human Approval Gates/i);
  assert.match(content, /AGENT_OPERATING_MODEL\.md#human-approval-gates/);
  assert.match(content, /Universal Stop Conditions/i);
  assert.match(content, /Dispatch & Handoff Contract Index/i);
  assert.match(content, /Compact Role & Skill Manifest/i);
  assert.match(content, /ba-agent/);
  assert.match(content, /developer-agent/);
  assert.match(content, /qa-agent/);
});

test('TC-003: Bootloader size boundary check at 3,500 and 3,501 tokens', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'bootloader-boundary-'));
  try {
    const bootDir = path.join(root, 'docs/workflow');
    mkdirSync(bootDir, { recursive: true });

    // 14,000 chars -> 3,500 tokens (PASS)
    writeFileSync(path.join(bootDir, 'core-bootloader.md'), 'A'.repeat(3500 * 4));
    const passResult = evaluateBootloader(root);
    assert.equal(passResult.tokens, 3500);
    assert.equal(passResult.over, false);

    // 14,004 chars -> 3,501 tokens (FAIL)
    writeFileSync(path.join(bootDir, 'core-bootloader.md'), 'A'.repeat(3501 * 4));
    const failResult = evaluateBootloader(root);
    assert.equal(failResult.tokens, 3501);
    assert.equal(failResult.over, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('TC-007: Role context size boundary check at 1,500 and 1,501 tokens', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'roles-boundary-'));
  try {
    const rolesDir = path.join(root, 'docs/workflow/roles');
    mkdirSync(rolesDir, { recursive: true });

    // 6,000 chars -> 1,500 tokens (PASS)
    writeFileSync(path.join(rolesDir, 'test-agent.md'), 'R'.repeat(1500 * 4));
    const passResult = evaluateRoles(root);
    assert.equal(passResult.rows[0].tokens, 1500);
    assert.equal(passResult.over, false);

    // 6,004 chars -> 1,501 tokens (FAIL)
    writeFileSync(path.join(rolesDir, 'test-agent.md'), 'R'.repeat(1501 * 4));
    const failResult = evaluateRoles(root);
    assert.equal(failResult.rows[0].tokens, 1501);
    assert.equal(failResult.over, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- CLI exit code regression ----------------------------------------------

function runCli(root, args = []) {
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-context-budget.mjs');
  let exitCode;
  try {
    execFileSync(process.execPath, [scriptPath, ...args], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    exitCode = 0;
  } catch (err) {
    exitCode = err.status ?? 1;
  }
  return exitCode;
}

test('TC-004: CLI exits 0 for canonical check when within target', () => {
  const files = {};
  for (const rel of CANONICAL_FILES) {
    files[rel] = '0'.repeat(100);
  }
  const root = makeTempRepo(files);
  try {
    assert.equal(runCli(root, ['--canonical']), 0, 'CLI must exit 0 when canonical is within target');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when canonical exceeds target (large file)', () => {
  const files = {};
  const smallFiles = CANONICAL_FILES.slice(0, -1);
  for (const rel of smallFiles) {
    files[rel] = '0'.repeat(100);
  }
  const bigFile = CANONICAL_FILES[CANONICAL_FILES.length - 1];
  files[bigFile] = 'X'.repeat((TARGET + 1000) * 4);
  const root = makeTempRepo(files);
  try {
    assert.equal(runCli(root, ['--canonical']), 1, 'CLI must exit 1 when canonical exceeds target');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI --bootloader exits 0 when bootloader is within budget and 1 when over', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'cli-boot-'));
  try {
    const bootDir = path.join(root, 'docs/workflow');
    mkdirSync(bootDir, { recursive: true });

    writeFileSync(path.join(bootDir, 'core-bootloader.md'), '0'.repeat(100));
    assert.equal(runCli(root, ['--bootloader']), 0);

    writeFileSync(path.join(bootDir, 'core-bootloader.md'), 'X'.repeat((BOOTLOADER_TARGET + 10) * 4));
    assert.equal(runCli(root, ['--bootloader']), 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
