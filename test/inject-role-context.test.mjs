import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROLE_REGISTRY, getRoleContext, injectRoleContext } from '../scripts/inject-role-context.mjs';

const SCRIPT_PATH = path.resolve(import.meta.dirname, '..', 'scripts', 'inject-role-context.mjs');

function runCli(args = [], options = {}) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });
    return { status: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? ''
    };
  }
}

test('ROLE_REGISTRY contains exactly 11 canonical agents', () => {
  const expected = [
    'ba-agent',
    'sa-agent',
    'developer-agent',
    'qa-agent',
    'pm-agent',
    'config-agent',
    'documentation-agent',
    'orchestrator-agent',
    'release-agent',
    'security-agent',
    'data-agent'
  ];
  assert.equal(ROLE_REGISTRY.length, 11);
  for (const role of expected) {
    assert.ok(ROLE_REGISTRY.includes(role), `Missing role: ${role}`);
  }
});

test('TC-005: CLI injects markdown role context for all 11 registered roles to stdout', () => {
  for (const role of ROLE_REGISTRY) {
    const res = runCli([role]);
    assert.equal(res.status, 0, `Role ${role} should exit 0`);
    assert.ok(res.stdout.length > 0, `Role ${role} should produce stdout output`);
    assert.match(res.stdout, new RegExp(`# .*Context`, 'i'), `Role ${role} output should contain context header`);
  }
});

test('TC-006: Each role payload is strictly <= 1,500 tokens (<= 6,000 characters)', () => {
  for (const role of ROLE_REGISTRY) {
    const context = getRoleContext(role);
    assert.ok(context.length > 0, `Context for ${role} should not be empty`);
    const tokens = Math.floor(context.length / 4);
    assert.ok(
      tokens <= 1500,
      `Role ${role} exceeds token budget: ${tokens} tokens (length: ${context.length})`
    );
  }
});

test('CLI supports --json flag for structured role context output', () => {
  const res = runCli(['developer-agent', '--json']);
  assert.equal(res.status, 0);
  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.status, 'SUCCESS');
  assert.equal(parsed.role, 'developer-agent');
  assert.ok(parsed.tokens <= 1500);
  assert.ok(typeof parsed.content === 'string');
});

test('TC-008: Invalid role identifier is rejected with exit code 1 and structured JSON error', () => {
  const res = runCli(['invalid-agent-role']);
  assert.equal(res.status, 1);
  const err = JSON.parse(res.stderr);
  assert.equal(err.status, 'ERROR');
  assert.equal(err.error_code, 'INVALID_ROLE_IDENTIFIER');
  assert.match(err.message, /invalid-agent-role/);
  assert.deepEqual(err.allowed_roles, ROLE_REGISTRY);
});

test('TC-009: Path traversal inputs in role ID are rejected with status 1 and structured error', () => {
  const dangerousInputs = [
    '../../etc/passwd',
    'roles/developer-agent',
    'developer-agent; rm -rf',
    'developer-agent/extra'
  ];

  for (const input of dangerousInputs) {
    const res = runCli([input]);
    assert.equal(res.status, 1, `Input "${input}" should be rejected with exit code 1`);
    const err = JSON.parse(res.stderr);
    assert.equal(err.status, 'ERROR');
    assert.equal(err.error_code, 'INVALID_ROLE_IDENTIFIER');
  }
});

test('TC-010: Missing or empty role argument exits 1 with structured usage error', () => {
  const noArgs = runCli([]);
  assert.equal(noArgs.status, 1);
  const errNoArgs = JSON.parse(noArgs.stderr);
  assert.equal(errNoArgs.status, 'ERROR');
  assert.equal(errNoArgs.error_code, 'INVALID_ROLE_IDENTIFIER');

  const emptyArg = runCli(['']);
  assert.equal(emptyArg.status, 1);
  const errEmpty = JSON.parse(emptyArg.stderr);
  assert.equal(errEmpty.status, 'ERROR');
  assert.equal(errEmpty.error_code, 'INVALID_ROLE_IDENTIFIER');
});
