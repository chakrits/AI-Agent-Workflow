import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateProjectState } from '../scripts/validate-project-state.mjs';

async function withProjectStatus(content, run) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'project-state-'));
  try {
    await writeFile(path.join(rootDir, 'PROJECT_STATUS.md'), content);
    await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

test('accepts the current project status when it contains no stale merge-state marker', async () => {
  const errors = await validateProjectState(process.cwd());

  assert.deepEqual(errors, []);
});

test('rejects a status that says work is uncommitted after it reached main', async () => {
  await withProjectStatus('# Project Status\n\n- Status: Implemented, uncommitted — pending review\n', async (rootDir) => {
    const errors = await validateProjectState(rootDir);

    assert.deepEqual(errors, [
      'PROJECT_STATUS.md: stale merge-state marker "uncommitted"',
      'PROJECT_STATUS.md: stale merge-state marker "pending review"'
    ]);
  });
});

test('rejects a status that still says pending merge', async () => {
  await withProjectStatus('# Project Status\n\n- Status: Pending merge\n', async (rootDir) => {
    const errors = await validateProjectState(rootDir);

    assert.deepEqual(errors, ['PROJECT_STATUS.md: stale merge-state marker "pending merge"']);
  });
});

test('GitHub creates one documentation-sync follow-up only for a merged PR into main', async () => {
  const workflow = await readFile('.github/workflows/documentation-sync.yml', 'utf8');

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /types:\s*\[closed\]/);
  assert.match(workflow, /github\.event\.pull_request\.merged\s*==\s*true/);
  assert.match(workflow, /github\.event\.pull_request\.base\.ref\s*==\s*'main'/);
  assert.match(workflow, /codex\/documentation-sync\//);
  assert.match(workflow, /issues:\s*write/);
  assert.match(workflow, /pull-requests:\s*read/);
  assert.match(workflow, /actions\/github-script@v7/);
  assert.match(workflow, /documentation-sync/);
});
