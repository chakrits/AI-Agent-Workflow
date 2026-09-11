import { readdir, readFile, writeFile, rm, mkdir, stat, lstat, realpath } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { countRealAdrs } from './adr-audit.mjs';
import { countOpenRisks } from './validate-risk-register.mjs';

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
|---|---|---|---|---|---|---|
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
  'docs/records/handoffs',
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

function isContained(rootDir, targetPath) {
  const relative = path.relative(rootDir, targetPath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function validateResetTargets(rootDir) {
  const resolvedRoot = await realpath(rootDir);
  const targets = [...Object.keys(STUB_CONTENT), ...CLEARED_DIRECTORIES];

  for (const relativeTarget of targets) {
    const targetPath = path.resolve(resolvedRoot, relativeTarget);
    if (!isContained(resolvedRoot, targetPath)) {
      throw new Error(`Refusing reset: target escapes repository containment: ${relativeTarget}`);
    }

    let currentPath = resolvedRoot;
    for (const segment of relativeTarget.split('/')) {
      currentPath = path.join(currentPath, segment);
      const metadata = await lstat(currentPath).catch((error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (!metadata) break;
      if (metadata.isSymbolicLink()) {
        throw new Error(`Refusing reset: symlinked target path is not allowed: ${relativeTarget}`);
      }
      const resolvedPath = await realpath(currentPath);
      if (!isContained(resolvedRoot, resolvedPath)) {
        throw new Error(`Refusing reset: target resolves outside repository containment: ${relativeTarget}`);
      }
    }
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
    .filter((file) => {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      const commands = [...lines];
      for (let index = 0; index < lines.length; index += 1) {
        const blockStart = lines[index].match(/^(\s*)(?:-\s*)?(?:run|script):\s*[>|][+-]?\s*$/);
        if (!blockStart) continue;
        const parentIndent = blockStart[1].length;
        const blockLines = [];
        for (let next = index + 1; next < lines.length; next += 1) {
          const indent = lines[next].match(/^\s*/)[0].length;
          if (lines[next].trim() && indent <= parentIndent) break;
          blockLines.push(lines[next].trim());
        }
        commands.push(blockLines.join(' '));
      }
      return commands.some(
        (command) =>
          /(?:reset:template|scripts\/reset-to-template\.mjs)/.test(command) &&
          /(?:^|\s)--apply(?:\s|$)/.test(command)
      );
    })
    .map((file) => path.relative(rootDir, file))
    .sort();
}

export async function planReset(rootDir) {
  await validateResetTargets(rootDir);
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
  await validateResetTargets(rootDir);
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

/**
 * ADR headers currently recorded in DECISIONS.md, for the refusal message.
 */
function recordedAdrIds(rootDir) {
  const decisionsPath = path.join(rootDir, 'DECISIONS.md');
  if (!existsSync(decisionsPath)) return [];
  return [...readFileSync(decisionsPath, 'utf8').matchAll(/^### (ADR-[^\s:]+)/gm)].map((m) => m[1]);
}

export async function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const apply = args.includes('--apply');
  const confirmed = args.includes('--confirm-reset');
  const resetDecisions = args.includes('--reset-decisions');
  const resetRisks = args.includes('--reset-risks');
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
  // DECISIONS.md is not a record of past work; it holds decisions that still govern
  // open work items. Blanking it has twice destroyed ADRs that open issues cite, and
  // adr-audit could not see it because TASK_LOG.md was blanked in the same run.
  const adrCount = countRealAdrs(rootDir);
  if (adrCount > 0 && !resetDecisions) {
    const ids = recordedAdrIds(rootDir);
    throw new Error(
      `Refusing to apply: DECISIONS.md holds ${adrCount} recorded decision(s) that this reset would destroy:\n` +
        `${ids.map((id) => `  - ${id}`).join('\n')}\n` +
        'These may still govern open work items. Move or supersede them first, or pass --reset-decisions to blank them deliberately.'
    );
  }

  // RISKS.md is not a record of past work either; it tracks project risks that
  // still apply to open work. Blanking it has twice destroyed tracked risk
  // entries, and validate-risk-register could not see it because it never
  // compared against a prior commit.
  const { total: riskCount, ids: riskIds } = countOpenRisks(rootDir);
  if (riskCount > 0 && !resetRisks) {
    throw new Error(
      `Refusing to apply: RISKS.md holds ${riskCount} recorded risk(s) that this reset would destroy:\n` +
        `${riskIds.map((id) => `  - ${id}`).join('\n')}\n` +
        'These may still apply to open work items. Move or close them first, or pass --reset-risks to blank them deliberately.'
    );
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
