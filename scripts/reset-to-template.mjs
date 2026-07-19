import { readdir, readFile, writeFile, rm, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
`
};

export const CLEARED_DIRECTORIES = [
  'docs/records/sdd',
  'docs/records/requirements',
  'docs/records/security-review',
  'docs/records/implementation-plan',
  'docs/records/handoff',
  'docs/records/qa',
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
  if (!(await exists(dirPath))) return { dir: relativeDir, removed: [] };
  const entries = await readdir(dirPath);
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

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const rootDir = process.cwd();

  if (!apply) {
    const { fileChanges, dirChanges } = await planReset(rootDir);
    console.log('DRY RUN — nothing will be modified. Re-run with --apply to actually reset.\n');
    console.log('Files that would be reset to a blank template:');
    for (const { file, changed } of fileChanges) {
      console.log(`  - ${file}${changed ? '' : ' (already at template baseline)'}`);
    }
    console.log('\nDirectories that would be cleared (contents removed, .gitkeep left):');
    for (const { dir, fileCount } of dirChanges) {
      console.log(`  - ${dir} (${fileCount} file${fileCount === 1 ? '' : 's'} would be removed)`);
    }
    return;
  }

  const { filesReset, dirsCleared } = await applyReset(rootDir);
  console.log(`Reset ${filesReset.length} file(s) to template baseline:`);
  for (const file of filesReset) console.log(`  - ${file}`);
  console.log(`\nCleared ${dirsCleared.length} record director${dirsCleared.length === 1 ? 'y' : 'ies'}:`);
  for (const { dir, removed } of dirsCleared) {
    console.log(`  - ${dir} (removed ${removed.length} item${removed.length === 1 ? '' : 's'})`);
  }
  console.log('\nDone. This repo is now at a clean template baseline.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
