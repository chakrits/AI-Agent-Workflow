import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import * as harness from '../scripts/verify-reset-template.mjs';

const { runDisposableVerification } = harness;

const execFile = promisify(execFileCallback);
const RUN_PREFIX = 'reset-template-verify-';

async function verificationRuns() {
  return new Set((await readdir(os.tmpdir())).filter((name) => name.startsWith(RUN_PREFIX)));
}

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
      simulateReset: true,
      simulateApplyMutation: mutateApply,
      failResetPhase: failPhase,
      onResetPhase: (phase) => calls.push(phase),
      skipVerification: true
    }
  };
}

test('destructive attestation is not publicly callable with forged ownership data', () => {
  assert.equal('attestDisposableClone' in harness, false);
});

test('public fault injection cannot receive candidate or ownership authority', async () => {
  const roots = await makePrimary();
  const run = injectedRun();
  let exposedAuthority;
  try {
    await assert.rejects(
      runDisposableVerification(roots.primary, {
        ...run.dependencies,
        fault: 'missing-marker',
        afterCandidateCreated: (authority) => { exposedAuthority = authority; }
      }),
      /marker|ENOENT/i
    );
    assert.equal(exposedAuthority, undefined);
    assert.equal(run.calls.length, 0);
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
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
    assert.match(await readFile(path.join(forged, '.git/reset-verification-owner.json'), 'utf8'), /forged/);
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

test('harness owns sentinel, dirty refusal, restoration, apply, idempotency, and cleanup', async () => {
  const roots = await makePrimary();
  const run = injectedRun({ mutateApply: true });
  const beforeRuns = await verificationRuns();
  try {
    const evidence = await runDisposableVerification(roots.primary, {
      ...run.dependencies
    });
    assert.deepEqual(run.calls, ['dirty-refusal', 'apply', 'idempotency']);
    assert.equal(evidence.sentinelPreserved, true);
    assert.equal(evidence.dirtyRefusalPreservedTargets, true);
    assert.equal(evidence.primaryPreserved, true);
    assert.deepEqual(await verificationRuns(), beforeRuns);
    assert.equal((await execFile('git', ['status', '--porcelain'], { cwd: roots.primary })).stdout, '');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

for (const [name, fault, pattern] of [
  ['canonical Git-root mismatch', 'git-root-mismatch', /Git root/i],
  ['wrong exact commit', 'wrong-commit', /exact commit/i]
]) {
  test(`harness refuses ${name} with zero destructive spawn and cleans up`, async () => {
    const roots = await makePrimary();
    const run = injectedRun();
    try {
      await assert.rejects(
        runDisposableVerification(roots.primary, { ...run.dependencies, fault }),
        pattern
      );
      assert.equal(run.calls.length, 0);
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
    assert.ok(run.calls.length > 0);
    assert.equal((await execFile('git', ['status', '--porcelain'], { cwd: roots.primary })).stdout, '');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

test('injected failure cleans candidate and preserves primary integrity', async () => {
  const roots = await makePrimary();
  const run = injectedRun({ failPhase: 'apply' });
  const before = await readFile(path.join(roots.primary, 'DECISIONS.md'));
  try {
    await assert.rejects(
      runDisposableVerification(roots.primary, run.dependencies),
      /injected apply failure/
    );
    assert.deepEqual(await readFile(path.join(roots.primary, 'DECISIONS.md')), before);
    assert.equal((await execFile('git', ['status', '--porcelain'], { cwd: roots.primary })).stdout, '');
  } finally {
    await rm(roots.parent, { recursive: true, force: true });
  }
});

test('cleanup failure cannot skip primary integrity and preserves both operation and cleanup errors', async () => {
  const roots = await makePrimary();
  const run = injectedRun({ failPhase: 'apply' });
  const beforeRuns = await verificationRuns();
  let integrityChecks = 0;
  try {
    await assert.rejects(
      runDisposableVerification(roots.primary, {
        ...run.dependencies,
        beforeCleanup: async () => { throw new Error('injected cleanup failure'); },
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
  } finally {
    for (const name of await verificationRuns()) {
      if (!beforeRuns.has(name)) await rm(path.join(os.tmpdir(), name), { recursive: true, force: true });
    }
    await rm(roots.parent, { recursive: true, force: true });
  }
});

async function expectOpaqueRefusal(name, fault, pattern) {
  const roots = await makePrimary();
  const run = injectedRun();
  let integrityChecks = 0;
  try {
    await assert.rejects(
      runDisposableVerification(roots.primary, {
        ...run.dependencies,
        fault,
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
  await expectOpaqueRefusal(
    'missing marker',
    'missing-marker',
    /marker|ENOENT/i
  );
});

test('foreign marker refuses with zero spawn and checks primary integrity', async () => {
  await expectOpaqueRefusal(
    'foreign marker',
    'foreign-marker',
    /ownership marker/i
  );
});

test('linked/shared common-dir canonical alias refuses with zero spawn and checks integrity', async () => {
  await expectOpaqueRefusal(
    'shared common dir alias',
    'shared-common-dir',
    /linked worktree|common-directory/i
  );
});

test('dirty clone refuses with zero spawn and checks primary integrity', async () => {
  await expectOpaqueRefusal(
    'dirty clone',
    'dirty-clone',
    /not clean/i
  );
});

test('reset script canonical path/cwd mismatch refuses with zero spawn and checks integrity', async () => {
  await expectOpaqueRefusal(
    'script cwd mismatch',
    'script-mismatch',
    /script path.*outside/i
  );
});
