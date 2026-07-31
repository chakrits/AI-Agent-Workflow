import path from 'node:path';
import os from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const execFile = promisify(execFileCallback);
const MARKER_NAME = 'reset-verification-owner.json';
const VERIFY_COMMANDS = [
  ['npm', ['test']],
  ['npm', ['run', 'validate:contracts']],
  ['npm', ['run', 'validate:project-state']],
  ['npm', ['run', 'validate:skill-parity']],
  ['npm', ['run', 'adr:audit']],
  ['npm', ['run', 'validate:risk-register']],
  ['npm', ['run', 'validate:review-gate']],
  ['npm', ['run', 'validate:skill-usage']],
  ['npm', ['run', 'validate:metrics']],
  ['npm', ['run', 'validate:context-budget']],
  ['git', ['diff', '--check']]
];

async function git(cwd, args) {
  const { stdout } = await execFile('git', args, { cwd });
  return stdout.trim();
}

const defaultProbes = {
  gitRoot: ({ cwd }) => git(cwd, ['rev-parse', '--show-toplevel']),
  gitCommonDir: async ({ cwd }) => {
    const common = await git(cwd, ['rev-parse', '--git-common-dir']);
    return realpath(path.resolve(cwd, common));
  },
  gitCommit: ({ cwd }) => git(cwd, ['rev-parse', 'HEAD']),
  gitStatus: ({ cwd }) => git(cwd, ['status', '--porcelain=v1', '--untracked-files=all'])
};

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export async function attestDisposableClone({
  primaryRoot,
  candidateRoot,
  cwd,
  scriptPath,
  expectedCommit,
  marker,
  readMarker,
  probes = defaultProbes,
  spawnReset
}) {
  const [primary, candidate, actualCwd, actualScript] = await Promise.all([
    realpath(primaryRoot),
    realpath(candidateRoot),
    realpath(cwd),
    realpath(scriptPath)
  ]);
  if (candidate === primary) throw new Error('Attestation failed: candidate is the primary root.');
  if (actualCwd !== candidate) throw new Error('Attestation failed: cwd is not the candidate root.');
  if (!within(candidate, actualScript)) throw new Error('Attestation failed: reset script path is outside the candidate root.');

  const owned = await readMarker();
  if (!owned || owned.runId !== marker.runId || owned.createdRoot !== marker.createdRoot) {
    throw new Error('Attestation failed: missing or foreign ownership marker.');
  }

  const reportedRoot = await realpath(await probes.gitRoot({ cwd: candidate }));
  if (reportedRoot !== candidate) throw new Error('Attestation failed: canonical Git root does not match candidate root.');

  const [candidateCommon, primaryCommon] = await Promise.all([
    probes.gitCommonDir({ cwd: candidate }).then(realpath),
    probes.gitCommonDir({ cwd: primary }).then(realpath)
  ]);
  const candidateGitDir = await realpath(path.join(candidate, '.git'));
  if (candidateCommon !== candidateGitDir || candidateCommon === primaryCommon) {
    throw new Error('Attestation failed: candidate is a linked worktree or shares the primary Git common directory.');
  }

  const commit = await probes.gitCommit({ cwd: candidate });
  if (commit !== expectedCommit) throw new Error('Attestation failed: candidate is not at the exact commit under verification.');
  if ((await probes.gitStatus({ cwd: candidate })) !== '') {
    throw new Error('Attestation failed: candidate clone is not clean immediately before reset.');
  }

  await spawnReset({ cwd: candidate, scriptPath: actualScript });
  return { root: candidate, commonDir: candidateCommon, scriptPath: actualScript, commit };
}

async function treeDigest(root) {
  const hash = createHash('sha256');
  async function visit(relative = '') {
    const absolute = path.join(root, relative);
    for (const name of (await readdir(absolute)).sort()) {
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

export async function runDisposableVerification(primaryInput = process.cwd()) {
  const primaryRoot = await realpath(await git(primaryInput, ['rev-parse', '--show-toplevel']));
  const expectedCommit = await git(primaryRoot, ['rev-parse', 'HEAD']);
  const primaryBefore = {
    commit: expectedCommit,
    status: await git(primaryRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
    digest: await treeDigest(primaryRoot)
  };
  if (primaryBefore.status !== '') throw new Error('Primary worktree must be clean before disposable verification.');

  const runParent = await mkdtemp(path.join(os.tmpdir(), 'reset-template-verify-'));
  const candidateRoot = path.join(runParent, 'standalone-clone');
  const marker = { runId: randomUUID(), createdRoot: candidateRoot };
  try {
    await execFile('git', ['clone', '--quiet', '--no-local', '--no-checkout', primaryRoot, candidateRoot]);
    await execFile('git', ['checkout', '--quiet', '--detach', expectedCommit], { cwd: candidateRoot });
    const markerPath = path.join(candidateRoot, '.git', MARKER_NAME);
    await writeFile(markerPath, `${JSON.stringify(marker)}\n`, { mode: 0o600 });

    const evidence = await attestDisposableClone({
      primaryRoot,
      candidateRoot,
      cwd: candidateRoot,
      scriptPath: path.join(candidateRoot, 'scripts/reset-to-template.mjs'),
      expectedCommit,
      marker,
      readMarker: async () => JSON.parse(await readFile(markerPath, 'utf8')),
      spawnReset: ({ cwd, scriptPath }) =>
        runVisible(process.execPath, [scriptPath, '--apply', '--confirm-reset'], cwd)
    });

    const primaryModules = path.join(primaryRoot, 'node_modules');
    const candidateModules = path.join(candidateRoot, 'node_modules');
    if (await lstat(primaryModules).catch(() => null)) await symlink(primaryModules, candidateModules, 'dir');

    for (const [command, args] of VERIFY_COMMANDS) await runVisible(command, args, candidateRoot);

    await rm(candidateModules, { recursive: true, force: true });
    await execFile('git', ['config', 'user.email', 'reset-harness@example.invalid'], { cwd: candidateRoot });
    await execFile('git', ['config', 'user.name', 'Reset Verification Harness'], { cwd: candidateRoot });
    await execFile('git', ['add', '-A'], { cwd: candidateRoot });
    await execFile('git', ['commit', '--quiet', '-m', 'test: establish reset baseline'], { cwd: candidateRoot });
    const resetBaselineCommit = await git(candidateRoot, ['rev-parse', 'HEAD']);
    await attestDisposableClone({
      primaryRoot,
      candidateRoot,
      cwd: candidateRoot,
      scriptPath: evidence.scriptPath,
      expectedCommit: resetBaselineCommit,
      marker,
      readMarker: async () => JSON.parse(await readFile(markerPath, 'utf8')),
      spawnReset: ({ cwd, scriptPath }) =>
        runVisible(process.execPath, [scriptPath, '--apply', '--confirm-reset'], cwd)
    });
    if ((await git(candidateRoot, ['status', '--porcelain=v1', '--untracked-files=all'])) !== '') {
      throw new Error('Idempotency failed: second verified reset changed the disposable clone.');
    }

    return { ...evidence, primaryDigest: primaryBefore.digest, verificationCommands: VERIFY_COMMANDS.length };
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
