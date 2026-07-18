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

test('GitHub re-evaluates readiness after linked Issue lifecycle-label changes', async () => {
  const workflow = await readFile('.github/workflows/work-item-readiness-refresh.yml', 'utf8');

  assert.match(workflow, /issues:/);
  assert.match(workflow, /labeled/);
  assert.match(workflow, /unlabeled/);
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /opened, synchronize, reopened, ready_for_review, edited/);
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /group:\s*work-item-readiness-\$\{\{ github\.repository \}\}/);
  assert.match(workflow, /cancel-in-progress:\s*true/);
  assert.match(workflow, /actions\/create-github-app-token@v3/);
  assert.match(workflow, /vars\.WORK_ITEM_REFRESH_APP_CLIENT_ID/);
  assert.match(workflow, /secrets\.WORK_ITEM_REFRESH_APP_PRIVATE_KEY/);
  assert.match(workflow, /environment:\s*work-item-refresh/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /github-token:\s*\$\{\{ steps\.readiness-token\.outputs\.token \}\}/);
  assert.match(workflow, /actions\/github-script@v7/);
  assert.match(workflow, /permission-checks:\s*write/);
  assert.match(workflow, /permission-pull-requests:\s*read/);
  assert.match(workflow, /permission-issues:\s*read/);
  assert.match(workflow, /actions\/checkout@v4/);
  assert.match(workflow, /ref:\s*\$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /checks\.create/);
  assert.match(workflow, /issues\.get/);
  assert.match(workflow, /work-item-readiness-check\.mjs/);
  assert.match(workflow, /pulls\.list/);
  assert.match(workflow, /for \(const pull of pulls\)/);
  assert.match(workflow, /catch \(error\)/);
  assert.match(workflow, /resolutionError/);
  assert.match(workflow, /phase:|status:/);
  assert.doesNotMatch(workflow, /github\.event\.pull_request\.head\.sha/);
  assert.doesNotMatch(workflow, /context\.payload\.pull_request\s*\?/);
  assert.doesNotMatch(workflow, /workflow_run/);
  assert.doesNotMatch(workflow, /pulls\.update/);
  assert.doesNotMatch(workflow, /^\s*-?\s*run:/m);
  assert.doesNotMatch(workflow, /statuses:\s*write/);
  assert.doesNotMatch(workflow, /\$\{context\.payload\.label\.name\}/);
});

test('GitHub readiness refresh workflow script compiles without executing pull request content', async () => {
  const workflow = await readFile('.github/workflows/work-item-readiness-refresh.yml', 'utf8');
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const scripts = [...workflow.matchAll(/          script: \|\n((?:            .*\n?)*)/g)]
    .map(([, script]) => script.replace(/^            /gm, ''));

  assert.equal(scripts.length, 1);
  for (const script of scripts) assert.doesNotThrow(() => new AsyncFunction(script));
});
