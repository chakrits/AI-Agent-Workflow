import { readdir, readFile, writeFile, rm, mkdir, stat } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const execFile = promisify(execFileCallback);

export const STUB_CONTENT = {
  'PROJECT_STATUS.md': `# PROJECT_STATUS.md

## Current Work Item
- None yet.

## Current Stage
- None yet.

## Change Classification
- Change Type: N/A
- Risk Level: N/A
- Code Change Required: N/A
- Architecture Change Required: N/A
- Security Review Required: N/A

## Completed
- Nothing yet — this is a fresh clone of the workflow template.

## In Progress
- Nothing in progress.

## Blockers / Open Questions
- None.

## Required Artifacts
- None.

## Next Quality Gate
- N/A.

## Recommended Next Agent
- Orchestrator Agent (or PM Agent for a new business request).

## Notes
- Reset to template baseline by \`npm run reset:template\`.
`,
  'TASK_LOG.md': `# TASK_LOG.md

| Date | Work Item | Agent | Action | Result | Next Agent | Notes |
`,
  'CHANGELOG.md': `# CHANGELOG.md

## Unreleased

### Added

### Changed

### Fixed

### Security
`,
  'RISKS.md': `# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
`,
  'DECISIONS.md': `# DECISIONS.md

## Decision Log

No decisions recorded yet.
`
};

export const CLEARED_DIRECTORIES = [
  'docs/records/sdd',
  'docs/records/requirements',
  'docs/records/security-review',
  'docs/records/implementation-plan',
  'docs/records/handoff',
  'docs/records/work-items',
  'docs/records/lessons-learned',
  'docs/records/postmortem',
  'docs/records/misc',
  'docs/records/dispatch-receipts',
  'docs/superpowers/specs',
  'docs/superpowers/plans'
];

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function clearDirectory(rootDir, relativeDir) {
  const dirPath = path.join(rootDir, relativeDir);
  const entries = (await exists(dirPath)) ? await readdir(dirPath) : [];
  const removed = [];
  for (const entry of entries) {
    if (entry === '.gitkeep') continue;
    await rm(path.join(dirPath, entry), { recursive: true, force: true });
    removed.push(entry);
  }
  await mkdir(dirPath, { recursive: true });
  const gitkeepPath = path.join(dirPath, '.gitkeep');
  if (!(await exists(gitkeepPath))) await writeFile(gitkeepPath, '', 'utf8');
  return { dir: relativeDir, removed };
}

function workflowFiles(rootDir) {
  const files = [];
  const githubDir = path.join(rootDir, '.github/workflows');
  if (existsSync(githubDir)) {
    for (const name of readdirSync(githubDir)) {
      if (/\.ya?ml$/i.test(name)) files.push(path.join(githubDir, name));
    }
  }
  const gitlabFile = path.join(rootDir, '.gitlab-ci.yml');
  if (existsSync(gitlabFile)) files.push(gitlabFile);
  return files;
}

export function findDestructiveCiInvocations(rootDir) {
  return workflowFiles(rootDir)
    .filter((file) =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .some(
          (line) =>
            /(?:reset:template|scripts\/reset-to-template\.mjs)/.test(line) &&
            /(?:^|\s)--apply(?:\s|$)/.test(line)
        )
    )
    .map((file) => path.relative(rootDir, file))
    .sort();
}

export async function planReset(rootDir) {
  const fileChanges = [];
  for (const [relativeFile, stub] of Object.entries(STUB_CONTENT)) {
    const filePath = path.join(rootDir, relativeFile);
    const current = (await exists(filePath)) ? await readFile(filePath, 'utf8') : null;
    fileChanges.push({ file: relativeFile, changed: current !== stub });
  }
  const dirChanges = [];
  for (const relativeDir of CLEARED_DIRECTORIES) {
    const dirPath = path.join(rootDir, relativeDir);
    if (!(await exists(dirPath))) {
      dirChanges.push({ dir: relativeDir, fileCount: 0 });
      continue;
    }
    const entries = (await readdir(dirPath)).filter((e) => e !== '.gitkeep');
    dirChanges.push({ dir: relativeDir, fileCount: entries.length });
  }
  return { fileChanges, dirChanges };
}

export async function applyReset(rootDir) {
  const fileResults = [];
  for (const [relativeFile, stub] of Object.entries(STUB_CONTENT)) {
    await writeFile(path.join(rootDir, relativeFile), stub, 'utf8');
    fileResults.push(relativeFile);
  }
  const dirResults = [];
  for (const relativeDir of CLEARED_DIRECTORIES) {
    dirResults.push(await clearDirectory(rootDir, relativeDir));
  }
  return { filesReset: fileResults, dirsCleared: dirResults };
}

async function repositoryRoot(cwd) {
  try {
    const { stdout } = await execFile('git', ['rev-parse', '--show-toplevel'], { cwd });
    return stdout.trim();
  } catch {
    throw new Error('Reset requires a Git working tree so dirty targets can be checked.');
  }
}

async function dirtyTargets(rootDir) {
  const targets = [...Object.keys(STUB_CONTENT), ...CLEARED_DIRECTORIES];
  const { stdout } = await execFile(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all', '--', ...targets],
    { cwd: rootDir }
  );
  return stdout
    .trimEnd()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3));
}

function printInventory({ fileChanges, dirChanges }) {
  console.log('Files that would be reset to a blank template:');
  for (const { file, changed } of fileChanges) {
    console.log(`  - ${file}${changed ? '' : ' (already at template baseline)'}`);
  }
  console.log('\nDirectories that would be cleared (contents removed, .gitkeep left):');
  for (const { dir, fileCount } of dirChanges) {
    console.log(`  - ${dir} (${fileCount} entr${fileCount === 1 ? 'y' : 'ies'} would be removed)`);
  }
  const entryCount =
    fileChanges.filter(({ changed }) => changed).length +
    dirChanges.reduce((total, { fileCount }) => total + fileCount, 0);
  console.log(`\nInventory total: ${entryCount} entries would be deleted or replaced.`);
}

export async function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const apply = args.includes('--apply');
  const confirmed = args.includes('--confirm-reset');
  const rootDir = await repositoryRoot(cwd);
  const plan = await planReset(rootDir);

  if (!apply) {
    console.log(
      'DRY RUN — nothing will be modified. Re-run with --apply --confirm-reset to actually reset.\n'
    );
    printInventory(plan);
    return;
  }

  printInventory(plan);
  if (!confirmed) {
    throw new Error('Refusing to apply: --apply also requires the explicit --confirm-reset token.');
  }
  const dirty = await dirtyTargets(rootDir);
  if (dirty.length > 0) {
    throw new Error(`Refusing to apply because dirty targeted paths were found:\n${dirty.map((p) => `  - ${p}`).join('\n')}`);
  }

  const { filesReset, dirsCleared } = await applyReset(rootDir);
  console.log(`Reset ${filesReset.length} file(s) to template baseline:`);
  for (const file of filesReset) console.log(`  - ${file}`);
  console.log(`\nCleared ${dirsCleared.length} record director${dirsCleared.length === 1 ? 'y' : 'ies'}:`);
  for (const { dir, removed } of dirsCleared) {
    console.log(`  - ${dir} (removed ${removed.length} item${removed.length === 1 ? '' : 's'})`);
  }
  console.log('\nDone. This repo is now at a clean working-tree template baseline.');
  console.log('Git history was not changed. Any optional new-root operation is human-only.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
