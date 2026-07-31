import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';

import { attestDisposableClone } from '../scripts/verify-reset-template.mjs';

async function fixture() {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'reset-harness-guard-'));
  const primaryRoot = path.join(parent, 'primary');
  const candidateRoot = path.join(parent, 'candidate');
  await mkdir(path.join(primaryRoot, '.git'), { recursive: true });
  await mkdir(path.join(primaryRoot, 'scripts'), { recursive: true });
  await mkdir(path.join(candidateRoot, '.git'), { recursive: true });
  await mkdir(path.join(candidateRoot, 'scripts'), { recursive: true });
  await writeFile(path.join(primaryRoot, 'scripts/reset-to-template.mjs'), '// foreign fixture\n');
  await writeFile(path.join(candidateRoot, 'scripts/reset-to-template.mjs'), '// fixture\n');
  return { parent, primaryRoot, candidateRoot };
}

function probes(overrides = {}) {
  return {
    gitRoot: async ({ cwd }) => realpath(cwd),
    gitCommonDir: async ({ cwd }) => realpath(path.join(cwd, '.git')),
    gitCommit: async () => 'expected-commit',
    gitStatus: async () => '',
    ...overrides
  };
}

async function expectRefusal(setup, pattern) {
  const roots = await fixture();
  let spawnCount = 0;
  try {
    const options = await setup(roots);
    await assert.rejects(
      attestDisposableClone({
        primaryRoot: roots.primaryRoot,
        candidateRoot: roots.candidateRoot,
        cwd: roots.candidateRoot,
        scriptPath: path.join(roots.candidateRoot, 'scripts/reset-to-template.mjs'),
        expectedCommit: 'expected-commit',
        marker: { runId: 'run-specific-token', createdRoot: roots.candidateRoot },
        readMarker: async () => ({ runId: 'run-specific-token', createdRoot: roots.candidateRoot }),
        probes: probes(),
        spawnReset: async () => { spawnCount += 1; },
        ...options
      }),
      pattern
    );
    assert.equal(spawnCount, 0, 'reset child must never spawn after failed attestation');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
}

test('guard refuses wrong cwd before reset spawn', async () => {
  await expectRefusal(({ primaryRoot }) => ({ cwd: primaryRoot }), /cwd/i);
});

test('guard refuses the primary root before reset spawn', async () => {
  await expectRefusal(({ primaryRoot }) => ({ candidateRoot: primaryRoot, cwd: primaryRoot }), /primary/i);
});

test('guard refuses a linked worktree common directory before reset spawn', async () => {
  await expectRefusal(({ primaryRoot }) => ({
    probes: probes({ gitCommonDir: async () => path.join(primaryRoot, '.git') })
  }), /common directory|linked worktree/i);
});

test('guard refuses a missing ownership marker before reset spawn', async () => {
  await expectRefusal(() => ({ readMarker: async () => null }), /ownership marker/i);
});

test('guard refuses a foreign ownership marker before reset spawn', async () => {
  await expectRefusal(() => ({ readMarker: async () => ({ runId: 'foreign-token' }) }), /ownership marker/i);
});

test('guard refuses a script-path mismatch before reset spawn', async () => {
  await expectRefusal(({ primaryRoot }) => ({
    scriptPath: path.join(primaryRoot, 'scripts/reset-to-template.mjs')
  }), /script path/i);
});

test('guard refuses a dirty clone before reset spawn', async () => {
  await expectRefusal(() => ({ probes: probes({ gitStatus: async () => ' M DECISIONS.md\n' }) }), /clean/i);
});

test('guard invokes reset exactly once only after every proof passes', async () => {
  const roots = await fixture();
  let spawnCount = 0;
  try {
    const evidence = await attestDisposableClone({
      primaryRoot: roots.primaryRoot,
      candidateRoot: roots.candidateRoot,
      cwd: roots.candidateRoot,
      scriptPath: path.join(roots.candidateRoot, 'scripts/reset-to-template.mjs'),
      expectedCommit: 'expected-commit',
      marker: { runId: 'run-specific-token', createdRoot: roots.candidateRoot },
      readMarker: async () => ({ runId: 'run-specific-token', createdRoot: roots.candidateRoot }),
      probes: probes(),
      spawnReset: async () => { spawnCount += 1; }
    });
    assert.equal(spawnCount, 1);
    assert.equal(evidence.commit, 'expected-commit');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});
