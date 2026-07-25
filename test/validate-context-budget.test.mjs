import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { countTokens, collectBudget, TARGET } from '../scripts/validate-context-budget.mjs';

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

// --- CLI exit code regression ----------------------------------------------
//
// The CLI must exit 0 when the total is within target and exit 1 when it
// is over, so CI can gate on the exit code. The script reads its
// CANONICAL_FILES list relative to cwd, so we run it inside temp repos
// that mirror the expected file layout.

const CANONICAL_FILES = [
  'AGENTS.md',
  'docs/workflow/role-definitions.md',
  'docs/operating-model/SKILL_CATALOG.md',
  'docs/workflow/handoff-contract.md',
  'docs/workflow/quality-gates.md',
  'docs/workflow/dynamic-routing.md',
  'docs/operating-model/AGENT_OPERATING_MODEL.md',
  'docs/operating-model/AGENT_EVALUATION_CHECKLIST.md'
];

function runCli(root) {
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-context-budget.mjs');
  let exitCode;
  try {
    execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    exitCode = 0;
  } catch (err) {
    exitCode = err.status ?? 1;
  }
  return exitCode;
}

test('CLI exits 0 when total is within target', () => {
  const files = {};
  // 8 files, each 100 chars -> 25 tokens each -> 200 tokens total (< TARGET)
  for (const rel of CANONICAL_FILES) {
    files[rel] = '0'.repeat(100);
  }
  const root = makeTempRepo(files);
  try {
    assert.equal(runCli(root), 0, 'CLI must exit 0 when total is within target');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when total exceeds target (large file)', () => {
  const files = {};
  // 7 small files + 1 file large enough to push the total over TARGET.
  const smallFiles = CANONICAL_FILES.slice(0, -1);
  for (const rel of smallFiles) {
    files[rel] = '0'.repeat(100);
  }
  // Last file exceeds TARGET by itself.
  const bigFile = CANONICAL_FILES[CANONICAL_FILES.length - 1];
  files[bigFile] = 'X'.repeat((TARGET + 1000) * 4);
  const root = makeTempRepo(files);
  try {
    assert.equal(runCli(root), 1, 'CLI must exit 1 when total exceeds target');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
