import path from 'node:path';
import os from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { lstat, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const execFile = promisify(execFileCallback);
const MARKER_NAME = 'reset-verification-owner.json';
const SENTINEL_PATH = 'docs/records/qa/reset-verification-sentinel.txt';
const VERIFY_COMMANDS = [
  ['npm', ['test']], ['npm', ['run', 'validate:contracts']],
  ['npm', ['run', 'validate:project-state']], ['npm', ['run', 'validate:skill-parity']],
  ['npm', ['run', 'adr:audit']], ['npm', ['run', 'validate:risk-register']],
  ['npm', ['run', 'validate:review-gate']], ['npm', ['run', 'validate:skill-usage']],
  ['npm', ['run', 'validate:metrics']], ['npm', ['run', 'validate:context-budget']],
  ['git', ['diff', '--check']]
];

async function git(cwd, args) {
  const { stdout } = await execFile('git', args, { cwd });
  return stdout.trim();
}

function digest(data) {
  return createHash('sha256').update(data).digest('hex');
}

async function treeDigest(root) {
  const hash = createHash('sha256');
  async function visit(relative = '') {
    for (const name of (await readdir(path.join(root, relative))).sort()) {
      if (!relative && (name === '.git' || name === 'node_modules')) continue;
      const childRelative = path.join(relative, name);
      const child = path.join(root, childRelative);
      const stat = await lstat(child);
      hash.update(childRelative);
      if (stat.isSymbolicLink()) hash.update(`link:${await realpath(child)}`);
      else if (stat.isDirectory()) await visit(childRelative);
      else hash.update(await readFile(child));
    }
  }
  await visit();
  return hash.digest('hex');
}

async function runVisible(command, args, cwd) {
  const result = await execFile(command, args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
}

async function defaultRunReset({ cwd, scriptPath, phase }) {
  const invocation = execFile(process.execPath, [scriptPath, '--apply', '--confirm-reset'], {
    cwd, maxBuffer: 20 * 1024 * 1024
  });
  if (phase === 'dirty-refusal') {
    try {
      await invocation;
    } catch (error) {
      if (/dirty targeted paths/i.test(error.stderr ?? '')) return;
      throw error;
    }
    throw new Error('Dirty-target proof failed: reset unexpectedly succeeded.');
  }
  const result = await invocation;
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
}

function assertWithin(root, target, label) {
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Attestation failed: ${label} is outside the candidate root.`);
  }
}

export async function runDisposableVerification(primaryInput = process.cwd(), dependencies = {}) {
  const gitRoot = dependencies.gitRoot ?? (({ cwd }) => git(cwd, ['rev-parse', '--show-toplevel']));
  const gitCommonDir = dependencies.gitCommonDir ?? (async ({ cwd }) => {
    const value = await git(cwd, ['rev-parse', '--git-common-dir']);
    return realpath(path.resolve(cwd, value));
  });
  const gitCommit = dependencies.gitCommit ?? (({ cwd }) => git(cwd, ['rev-parse', 'HEAD']));
  const gitStatus = dependencies.gitStatus ?? (({ cwd }) => git(cwd, ['status', '--porcelain=v1', '--untracked-files=all']));
  const runReset = dependencies.runReset ?? defaultRunReset;
  const runVerification = dependencies.runVerification ?? (async ({ cwd }) => {
    for (const [command, args] of VERIFY_COMMANDS) await runVisible(command, args, cwd);
  });

  const primaryRoot = await realpath(await git(primaryInput, ['rev-parse', '--show-toplevel']));
  const sourceCommit = await git(primaryRoot, ['rev-parse', 'HEAD']);
  const primaryBefore = {
    commit: sourceCommit,
    status: await git(primaryRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
    digest: await treeDigest(primaryRoot)
  };
  if (primaryBefore.status !== '') throw new Error('Primary worktree must be clean before disposable verification.');

  const runParent = await mkdtemp(path.join(os.tmpdir(), 'reset-template-verify-'));
  const candidateRoot = path.join(runParent, 'standalone-clone');
  const ownership = Object.freeze({ runId: randomUUID(), createdRoot: candidateRoot });
  dependencies.onCandidate?.(candidateRoot);

  async function attest(expectedCommit) {
    const [primary, candidate, scriptPath] = await Promise.all([
      realpath(primaryRoot), realpath(candidateRoot),
      realpath(path.join(candidateRoot, 'scripts/reset-to-template.mjs'))
    ]);
    if (candidate === primary) throw new Error('Attestation failed: candidate is the primary root.');
    assertWithin(candidate, scriptPath, 'reset script path');
    const markerPath = path.join(candidate, '.git', MARKER_NAME);
    const marker = JSON.parse(await readFile(markerPath, 'utf8'));
    if (marker.runId !== ownership.runId || marker.createdRoot !== ownership.createdRoot) {
      throw new Error('Attestation failed: ownership marker does not match this harness run.');
    }
    const reportedRoot = await realpath(await gitRoot({ cwd: candidate }));
    if (reportedRoot !== candidate) throw new Error('Attestation failed: canonical Git root mismatch.');
    const [candidateCommon, primaryCommon, candidateGit] = await Promise.all([
      gitCommonDir({ cwd: candidate }).then(realpath),
      gitCommonDir({ cwd: primary }).then(realpath),
      realpath(path.join(candidate, '.git'))
    ]);
    if (candidateCommon !== candidateGit || candidateCommon === primaryCommon) {
      throw new Error('Attestation failed: linked worktree or primary common-directory alias.');
    }
    const commit = await gitCommit({ cwd: candidate });
    if (commit !== expectedCommit) throw new Error('Attestation failed: candidate is not at the exact commit.');
    if ((await gitStatus({ cwd: candidate })) !== '') throw new Error('Attestation failed: candidate is not clean.');
    return { root: candidate, scriptPath, commit, commonDir: candidateCommon };
  }

  try {
    await execFile('git', ['clone', '--quiet', '--no-local', '--no-checkout', primaryRoot, candidateRoot]);
    await execFile('git', ['checkout', '--quiet', '--detach', sourceCommit], { cwd: candidateRoot });
    const markerPath = path.join(candidateRoot, '.git', MARKER_NAME);
    await writeFile(markerPath, `${JSON.stringify(ownership)}\n`, { mode: 0o600 });

    const sentinel = Buffer.from(`reset verification ${ownership.runId}\n`);
    const sentinelPath = path.join(candidateRoot, SENTINEL_PATH);
    await writeFile(path.join(candidateRoot, '.git/info/exclude'), `\n/${SENTINEL_PATH}\n`, { flag: 'a' });
    await writeFile(sentinelPath, sentinel, { mode: 0o600 });
    const sentinelHash = digest(sentinel);

    const firstAttestation = await attest(sourceCommit);
    const dirtyTarget = path.join(candidateRoot, 'DECISIONS.md');
    const targetBefore = await readFile(dirtyTarget);
    await writeFile(dirtyTarget, Buffer.concat([targetBefore, Buffer.from('\n# harness dirty refusal probe\n')]));
    const dirtySnapshot = await treeDigest(candidateRoot);
    await runReset({ cwd: candidateRoot, scriptPath: firstAttestation.scriptPath, phase: 'dirty-refusal' });
    if (await treeDigest(candidateRoot) !== dirtySnapshot) throw new Error('Dirty-target refusal mutated the candidate.');
    await writeFile(dirtyTarget, targetBefore);
    const applyAttestation = await attest(sourceCommit);
    await runReset({ cwd: candidateRoot, scriptPath: applyAttestation.scriptPath, phase: 'apply' });
    if (digest(await readFile(sentinelPath)) !== sentinelHash) throw new Error('QA sentinel changed after apply.');

    const primaryModules = path.join(primaryRoot, 'node_modules');
    const candidateModules = path.join(candidateRoot, 'node_modules');
    if (await lstat(primaryModules).catch(() => null)) await symlink(primaryModules, candidateModules, 'dir');
    await runVerification({ cwd: candidateRoot, commands: VERIFY_COMMANDS });
    await rm(candidateModules, { recursive: true, force: true });

    await execFile('git', ['config', 'user.email', 'reset-harness@example.invalid'], { cwd: candidateRoot });
    await execFile('git', ['config', 'user.name', 'Reset Verification Harness'], { cwd: candidateRoot });
    await execFile('git', ['add', '-A'], { cwd: candidateRoot });
    await execFile('git', ['commit', '--quiet', '-m', 'test: establish reset baseline'], { cwd: candidateRoot });
    const baselineCommit = await git(candidateRoot, ['rev-parse', 'HEAD']);
    const idempotencyAttestation = await attest(baselineCommit);
    await runReset({ cwd: candidateRoot, scriptPath: idempotencyAttestation.scriptPath, phase: 'idempotency' });
    if ((await git(candidateRoot, ['status', '--porcelain=v1', '--untracked-files=all'])) !== '') {
      throw new Error('Idempotency failed: second reset changed the clone.');
    }
    if (digest(await readFile(sentinelPath)) !== sentinelHash) throw new Error('QA sentinel changed during idempotency.');

    return {
      commit: sourceCommit,
      sentinelPreserved: true,
      dirtyRefusalPreservedTargets: true,
      primaryPreserved: true,
      verificationCommands: VERIFY_COMMANDS.length
    };
  } finally {
    await rm(runParent, { recursive: true, force: true });
    const primaryAfter = {
      commit: await git(primaryRoot, ['rev-parse', 'HEAD']),
      status: await git(primaryRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
      digest: await treeDigest(primaryRoot)
    };
    if (JSON.stringify(primaryAfter) !== JSON.stringify(primaryBefore)) {
      throw new Error('Primary worktree changed during disposable verification.');
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const evidence = await runDisposableVerification(process.cwd());
    console.log(`Disposable verification passed at ${evidence.commit}; ${evidence.verificationCommands} post-reset commands passed.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
