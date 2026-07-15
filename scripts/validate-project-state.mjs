import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const staleMergeStateMarkers = ['uncommitted', 'pending review', 'pending merge'];

export async function validateProjectState(rootDir) {
  const projectStatus = await readFile(path.join(rootDir, 'PROJECT_STATUS.md'), 'utf8');
  const statusFields = projectStatus
    .split('\n')
    .filter((line) => /^\s*-\s+Status:\s*/i.test(line))
    .join('\n')
    .toLowerCase();

  return staleMergeStateMarkers
    .filter((marker) => statusFields.includes(marker))
    .map((marker) => `PROJECT_STATUS.md: stale merge-state marker "${marker}"`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validateProjectState(process.cwd());
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Project state validation passed.');
  }
}
