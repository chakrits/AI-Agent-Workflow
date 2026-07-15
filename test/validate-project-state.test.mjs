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

test('GitHub requires a completed documentation-impact assessment before a PR can merge', async () => {
  const [workflow, template] = await Promise.all([
    readFile('.github/workflows/documentation-impact-gate.yml', 'utf8'),
    readFile('.github/pull_request_template.md', 'utf8')
  ]);

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /types:\s*\[opened, edited, reopened, synchronize\]/);
  assert.match(workflow, /pull-requests:\s*read/);
  assert.match(workflow, /actions\/github-script@v7/);
  assert.match(workflow, /documentation-impact: complete/);
  assert.match(template, /documentation-impact: pending/);
  assert.match(template, /## Documentation Impact/);
  assert.match(template, /No documentation impact/);
});

test('GitHub separates normal post-merge closeout from documentation-sync exceptions', async () => {
  const workflow = await readFile('.github/workflows/documentation-sync.yml', 'utf8');

  assert.match(workflow, /push:/);
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /validate-project-state/);
  assert.match(workflow, /needs\.validate-project-state\.result\s*==\s*'failure'/);
  assert.match(workflow, /documentation-sync:commit-/);
  assert.match(workflow, /issues:\s*write/);
  const closeoutJob = workflow.slice(workflow.indexOf('  create-post-merge-closeout-handoff:'));
  assert.match(closeoutJob, /permissions:\s*\n\s+issues:\s*write\s*\n\s+pull-requests:\s*write/);
  assert.match(workflow, /actions\/github-script@v7/);
  assert.match(workflow, /needs\.validate-project-state\.result\s*==\s*'success'/);
  assert.match(workflow, /post-merge-closeout/);
  assert.match(workflow, /listPullRequestsAssociatedWithCommit/);
  assert.match(workflow, /github\.paginate\(github\.rest\.issues\.listComments/);
  assert.match(workflow, /post-merge-closeout:commit-/);
  assert.match(workflow, /closeout: complete/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /types:\s*\[closed\]/);
});

test('GitHub post-merge closeout script compiles and preserves its completion instruction', async () => {
  const workflow = await readFile('.github/workflows/documentation-sync.yml', 'utf8');
  const scriptMarker = '          script: |\n';
  const script = workflow.slice(workflow.lastIndexOf(scriptMarker) + scriptMarker.length);
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

  assert.doesNotThrow(() => new AsyncFunction(script));
  assert.match(script, /post-merge-closeout: complete; source-pr-/);
});
