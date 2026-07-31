import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import * as harness from '../scripts/verify-reset-template.mjs';

const { runDisposableVerification } = harness;

const execFile = promisify(execFileCallback);

async function makePrimary() {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'reset-harness-integration-'));
  const primary = path.join(parent, 'primary');
  await mkdir(path.join(primary, 'scripts'), { recursive: true });
  await mkdir(path.join(primary, 'docs/records/qa'), { recursive: true });
  await writeFile(path.join(primary, 'scripts/reset-to-template.mjs'), '// fixture reset\n');
  await writeFile(path.join(primary, 'DECISIONS.md'), '# decisions\n');
  await writeFile(path.join(primary, 'docs/records/qa/existing.md'), 'existing evidence\n');
  await execFile('git', ['init', '-q'], { cwd: primary });
  await execFile('git', ['config', 'user.email', 'fixture@example.test'], { cwd: primary });
  await execFile('git', ['config', 'user.name', 'Fixture'], { cwd: primary });
  await execFile('git', ['add', '.'], { cwd: primary });
  await execFile('git', ['commit', '-qm', 'fixture'], { cwd: primary });
  return { parent, primary };
}

function injectedRun({ failPhase, mutateApply = false } = {}) {
  const calls = [];
  return {
    calls,
    dependencies: {
      runReset: async ({ cwd, phase }) => {
        calls.push({ cwd: await realpath(cwd), phase });
        if (phase === failPhase) throw new Error(`injected ${phase} failure`);
        if (phase === 'dirty-refusal') return;
        if (mutateApply && phase === 'apply') await writeFile(path.join(cwd, 'DECISIONS.md'), '# reset\n');
      },
      runVerification: async () => {}
    }
  };
}

test('destructive attestation is not publicly callable with forged ownership data', () => {
  assert.equal('attestDisposableClone' in harness, false);
});

test('pre-existing clone with forged marker cannot become the destructive candidate', async () => {
  const roots = await makePrimary();
  const forged = path.join(roots.parent, 'forged-clone');
  await execFile('git', ['clone', '-q', roots.primary, forged]);
  await writeFile(path.join(forged, '.git/reset-verification-owner.json'), JSON.stringify({ runId: 'forged', createdRoot: forged }));
  const run = injectedRun({ mutateApply: true });
  try {
    await runDisposableVerification(roots.primary, run.dependencies);
    assert.ok(run.calls.length > 0);
    const canonicalForged = await realpath(forged);
    assert.ok(run.calls.every(({ cwd }) => cwd !== canonicalForged));
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

test('harness owns sentinel, dirty refusal, restoration, apply, idempotency, and cleanup', async () => {
  const roots = await makePrimary();
  const run = injectedRun({ mutateApply: true });
  let candidate;
  try {
    const evidence = await runDisposableVerification(roots.primary, {
      ...run.dependencies,
      onCandidate: (root) => { candidate = root; }
    });
    assert.deepEqual(run.calls.map(({ phase }) => phase), ['dirty-refusal', 'apply', 'idempotency']);
    assert.equal(evidence.sentinelPreserved, true);
    assert.equal(evidence.dirtyRefusalPreservedTargets, true);
    assert.equal(evidence.primaryPreserved, true);
    await assert.rejects(readFile(candidate), /ENOENT/);
    assert.equal((await execFile('git', ['status', '--porcelain'], { cwd: roots.primary })).stdout, '');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

for (const [name, dependencies, pattern] of [
  ['canonical Git-root mismatch', { gitRoot: async ({ cwd }) => path.dirname(cwd) }, /Git root/i],
  ['wrong exact commit', { gitCommit: async () => 'wrong-commit' }, /exact commit/i]
]) {
  test(`harness refuses ${name} with zero destructive spawn and cleans up`, async () => {
    const roots = await makePrimary();
    const run = injectedRun();
    let candidate;
    try {
      await assert.rejects(
        runDisposableVerification(roots.primary, { ...run.dependencies, ...dependencies, onCandidate: (root) => { candidate = root; } }),
        pattern
      );
      assert.equal(run.calls.length, 0);
      await assert.rejects(readFile(candidate), /ENOENT/);
      assert.equal((await execFile('git', ['status', '--porcelain'], { cwd: roots.primary })).stdout, '');
    } finally {
      await rm(roots.parent, { recursive: true, force: true });
    }
  });
}

test('path alias resolves to the primary root and cannot be used as a candidate', async () => {
  const roots = await makePrimary();
  const alias = path.join(roots.parent, 'primary-alias');
  await execFile('ln', ['-s', roots.primary, alias]);
  const run = injectedRun({ failPhase: 'apply' });
  try {
    await assert.rejects(runDisposableVerification(alias, run.dependencies), /injected apply failure/);
    const canonicalPrimary = await realpath(alias);
    assert.ok(run.calls.every(({ cwd }) => cwd !== canonicalPrimary));
    assert.equal((await execFile('git', ['status', '--porcelain'], { cwd: roots.primary })).stdout, '');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

test('injected failure cleans candidate and preserves primary integrity', async () => {
  const roots = await makePrimary();
  const run = injectedRun({ failPhase: 'apply' });
  let candidate;
  const before = await readFile(path.join(roots.primary, 'DECISIONS.md'));
  try {
    await assert.rejects(
      runDisposableVerification(roots.primary, { ...run.dependencies, onCandidate: (root) => { candidate = root; } }),
      /injected apply failure/
    );
    await assert.rejects(readFile(candidate), /ENOENT/);
    assert.deepEqual(await readFile(path.join(roots.primary, 'DECISIONS.md')), before);
    assert.equal((await execFile('git', ['status', '--porcelain'], { cwd: roots.primary })).stdout, '');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

test('cleanup failure cannot skip primary integrity and preserves both operation and cleanup errors', async () => {
  const roots = await makePrimary();
  const run = injectedRun({ failPhase: 'apply' });
  let candidate;
  let integrityChecks = 0;
  try {
    await assert.rejects(
      runDisposableVerification(roots.primary, {
        ...run.dependencies,
        onCandidate: (root) => { candidate = root; },
        cleanup: async () => { throw new Error('injected cleanup failure'); },
        onPrimaryIntegrityCheck: () => {
          integrityChecks += 1;
          throw new Error('injected integrity probe failure');
        }
      }),
      (error) =>
        error instanceof AggregateError &&
        /injected apply failure/.test(error.message) &&
        /injected cleanup failure/.test(error.message) &&
        /injected integrity probe failure/.test(error.message)
    );
    assert.equal(integrityChecks, 1);
    assert.ok(await realpath(candidate));
  } finally {
    if (candidate) await rm(path.dirname(candidate), { recursive: true, force: true });
    await rm(roots.parent, { recursive: true, force: true });
  }
});

async function expectPostCreationRefusal(name, hook, overrides = {}, pattern) {
  const roots = await makePrimary();
  const run = injectedRun();
  let integrityChecks = 0;
  try {
    await assert.rejects(
      runDisposableVerification(roots.primary, {
        ...run.dependencies,
        ...overrides,
        afterCandidateCreated: hook,
        onPrimaryIntegrityCheck: () => { integrityChecks += 1; }
      }),
      pattern,
      name
    );
    assert.equal(run.calls.length, 0, `${name}: destructive reset must not spawn`);
    assert.equal(integrityChecks, 1, `${name}: primary integrity must be checked`);
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
}

test('missing marker refuses with zero spawn and checks primary integrity', async () => {
  await expectPostCreationRefusal(
    'missing marker',
    ({ markerPath }) => unlink(markerPath),
    {},
    /marker|ENOENT/i
  );
});

test('foreign marker refuses with zero spawn and checks primary integrity', async () => {
  await expectPostCreationRefusal(
    'foreign marker',
    ({ markerPath, candidateRoot }) =>
      writeFile(markerPath, JSON.stringify({ runId: 'foreign', createdRoot: candidateRoot })),
    {},
    /ownership marker/i
  );
});

test('linked/shared common-dir canonical alias refuses with zero spawn and checks integrity', async () => {
  let primaryCommonAlias;
  await expectPostCreationRefusal(
    'shared common dir alias',
    async ({ primaryRoot, runParent }) => {
      primaryCommonAlias = path.join(runParent, 'primary-common-alias');
      await symlink(path.join(primaryRoot, '.git'), primaryCommonAlias);
    },
    { gitCommonDir: async ({ cwd }) => cwd.includes('standalone-clone') ? primaryCommonAlias : path.join(cwd, '.git') },
    /linked worktree|common-directory/i
  );
});

test('dirty clone refuses with zero spawn and checks primary integrity', async () => {
  await expectPostCreationRefusal(
    'dirty clone',
    async () => {},
    { gitStatus: async ({ cwd }) => cwd.includes('standalone-clone') ? ' M DECISIONS.md' : '' },
    /not clean/i
  );
});

test('reset script canonical path/cwd mismatch refuses with zero spawn and checks integrity', async () => {
  await expectPostCreationRefusal(
    'script cwd mismatch',
    async ({ candidateRoot, primaryRoot }) => {
      const script = path.join(candidateRoot, 'scripts/reset-to-template.mjs');
      await unlink(script);
      await symlink(path.join(primaryRoot, 'scripts/reset-to-template.mjs'), script);
    },
    {},
    /script path.*outside/i
  );
});
