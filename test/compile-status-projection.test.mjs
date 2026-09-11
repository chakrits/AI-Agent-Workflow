import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * Helper to create a temporary mock workspace for compiler and archival testing.
 */
function createMockWorkspace() {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'status-projection-test-'));
  const workItemsDir = path.join(root, 'docs/records/work-items');
  const archiveDir = path.join(workItemsDir, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });

  const initialProjectStatus = `# PROJECT_STATUS.md

## Current Work Item
- None

## Active Work Items
<!-- active-work-items-table-start -->
<!-- active-work-items-table-end -->

## Current Stage
- Phase 4: Implementation

## Completed
- None
`;
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), initialProjectStatus, 'utf8');

  return {
    root,
    workItemsDir,
    archiveDir,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

function writeShard(dir, taskId, overrides = {}) {
  const shardDir = path.join(dir, taskId);
  fs.mkdirSync(shardDir, { recursive: true });
  const shard = {
    task_id: taskId,
    workflow_id: 'bug-fix',
    contract_version: 1,
    change_type: 'bug-fix',
    risk_level: 'medium',
    state: 'implementing',
    rework_count: 0,
    max_rework_attempts: 2,
    history: [
      {
        from: 'intake',
        to: 'implementing',
        at: '2026-09-11T12:00:00Z',
        actor: 'developer-agent',
        evidence_refs: ['plan']
      }
    ],
    evidence: { plan: 'test-plan' },
    next_route: 'qa-agent',
    stop_reason: null,
    ...overrides
  };
  fs.writeFileSync(path.join(shardDir, 'task-state.json'), JSON.stringify(shard, null, 2), 'utf8');
  return shard;
}

test('TC-027 / Shard Discovery: discovers active shards across work-item directories', async () => {
  const { discoverActiveShards } = await import('../scripts/compile-status-projection.mjs');
  const ws = createMockWorkspace();
  try {
    writeShard(ws.workItemsDir, 'issue-301');
    writeShard(ws.workItemsDir, 'issue-302');

    const shards = discoverActiveShards(ws.root);
    assert.equal(shards.length, 2);
    const taskIds = shards.map((s) => s.task_id);
    assert.ok(taskIds.includes('issue-301'));
    assert.ok(taskIds.includes('issue-302'));
  } finally {
    ws.cleanup();
  }
});

test('TC-028 / Exclusion of Archived Shards: strictly ignores archive/** directory shards', async () => {
  const { discoverActiveShards } = await import('../scripts/compile-status-projection.mjs');
  const ws = createMockWorkspace();
  try {
    writeShard(ws.workItemsDir, 'issue-100'); // active
    writeShard(ws.archiveDir, 'issue-099', { state: 'completed' }); // archived

    const shards = discoverActiveShards(ws.root);
    assert.equal(shards.length, 1);
    assert.equal(shards[0].task_id, 'issue-100');
  } finally {
    ws.cleanup();
  }
});

test('TC-029 / Deterministic Markdown table generation: sorts by task_id ascending and generates safe table', async () => {
  const { compileStatusProjection, formatProjectionTable } = await import('../scripts/compile-status-projection.mjs');
  const ws = createMockWorkspace();
  try {
    writeShard(ws.workItemsDir, 'issue-500', { workflow_id: 'bug-fix', state: 'verifying', next_route: 'qa-agent' });
    writeShard(ws.workItemsDir, 'issue-200', { workflow_id: 'new-feature', state: 'implementing', next_route: 'developer-agent' });

    const projection = compileStatusProjection(ws.root);
    assert.equal(projection.shards.length, 2);
    // Ascending order check
    assert.equal(projection.shards[0].task_id, 'issue-200');
    assert.equal(projection.shards[1].task_id, 'issue-500');

    const table = formatProjectionTable(projection.shards);
    assert.match(table, /\| Issue ID \| Workflow \| Current State \| Next Route \/ Owner \| Updated At \|/);
    assert.match(table, /\| issue-200 \| new-feature \| implementing \| developer-agent \|/);
    assert.match(table, /\| issue-500 \| bug-fix \| verifying \| qa-agent \|/);
    assert.ok(table.indexOf('issue-200') < table.indexOf('issue-500'), 'Table rows must be deterministically sorted by task_id ascending');

    // Digest comment check
    assert.match(projection.markdown, /<!-- projection-digest: [a-f0-9]{64} -->/);
  } finally {
    ws.cleanup();
  }
});

test('TC-030 / Drift CI check: --check exit codes (0 on match, 1 on stale)', () => {
  const ws = createMockWorkspace();
  try {
    writeShard(ws.workItemsDir, 'issue-301');

    // Before writing projection, --check should fail (exit 1)
    const check1 = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/compile-status-projection.mjs'), '--check', '--dir', ws.root], {
      encoding: 'utf8'
    });
    assert.equal(check1.status, 1, '--check must fail when PROJECT_STATUS.md is out of sync');

    // Now compile with --write
    const writeRes = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/compile-status-projection.mjs'), '--write', '--dir', ws.root], {
      encoding: 'utf8'
    });
    assert.equal(writeRes.status, 0, '--write must succeed');

    // Now --check should pass (exit 0)
    const check2 = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/compile-status-projection.mjs'), '--check', '--dir', ws.root], {
      encoding: 'utf8'
    });
    assert.equal(check2.status, 0, '--check must exit 0 when PROJECT_STATUS.md is in sync');
  } finally {
    ws.cleanup();
  }
});

test('TC-031 / Idempotence: --write mode is idempotent and preserves surrounding content', async () => {
  const { updateProjectStatusFile } = await import('../scripts/compile-status-projection.mjs');
  const ws = createMockWorkspace();
  try {
    writeShard(ws.workItemsDir, 'issue-301');

    updateProjectStatusFile(ws.root);
    const content1 = fs.readFileSync(path.join(ws.root, 'PROJECT_STATUS.md'), 'utf8');

    updateProjectStatusFile(ws.root);
    const content2 = fs.readFileSync(path.join(ws.root, 'PROJECT_STATUS.md'), 'utf8');

    assert.equal(content1, content2, 'Consecutive --write executions must produce identical content');
    assert.match(content1, /## Current Stage/, 'Surrounding content must be preserved');
    assert.match(content1, /## Completed/, 'Surrounding content must be preserved');
  } finally {
    ws.cleanup();
  }
});

test('TC-032 / Performance benchmark: compile time < 300ms for 100 shards', async () => {
  const { compileStatusProjection } = await import('../scripts/compile-status-projection.mjs');
  const ws = createMockWorkspace();
  try {
    for (let i = 0; i < 100; i++) {
      const id = `issue-${String(i).padStart(3, '0')}`;
      writeShard(ws.workItemsDir, id);
    }

    const start = performance.now();
    const result = compileStatusProjection(ws.root);
    const duration = performance.now() - start;

    assert.equal(result.shards.length, 100);
    assert.ok(duration < 300, `Compile time must be < 300ms, measured ${duration.toFixed(2)}ms`);
  } finally {
    ws.cleanup();
  }
});

test('TC-035 / Stale Marker Prevention: validate-project-state passes on compiled projection without collisions', async () => {
  const ws = createMockWorkspace();
  try {
    // Write shards with various states that might look like merge-state markers if in bullet points
    writeShard(ws.workItemsDir, 'issue-101', { state: 'verifying' });
    writeShard(ws.workItemsDir, 'issue-102', { state: 'implementing' });

    // Update PROJECT_STATUS.md
    const writeRes = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/compile-status-projection.mjs'), '--write', '--dir', ws.root], {
      encoding: 'utf8'
    });
    assert.equal(writeRes.status, 0);

    // Run validate-project-state.mjs logic on ws.root
    const { validateProjectState } = await import('../scripts/validate-project-state.mjs');
    const errors = await validateProjectState(ws.root);
    assert.deepEqual(errors, [], 'Compiled projection table must not trigger validate-project-state stale marker errors');
  } finally {
    ws.cleanup();
  }
});

test('Archival Lifecycle: archive-work-item moves terminal shard and refuses non-terminal shard', () => {
  const ws = createMockWorkspace();
  try {
    // 1. Non-terminal shard (implementing)
    writeShard(ws.workItemsDir, 'issue-active', { state: 'implementing' });

    const failRes = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/archive-work-item.mjs'), 'issue-active', '--dir', ws.root], {
      encoding: 'utf8'
    });
    assert.notEqual(failRes.status, 0, 'Must refuse archival for non-terminal state');
    assert.match(failRes.stderr + failRes.stdout, /terminal/i);
    assert.ok(fs.existsSync(path.join(ws.workItemsDir, 'issue-active/task-state.json')));
    assert.ok(!fs.existsSync(path.join(ws.archiveDir, 'issue-active/task-state.json')));

    // 2. Terminal shard (completed)
    writeShard(ws.workItemsDir, 'issue-done', { state: 'completed' });

    const okRes = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/archive-work-item.mjs'), 'issue-done', '--dir', ws.root], {
      encoding: 'utf8'
    });
    assert.equal(okRes.status, 0, 'Must succeed archival for terminal state (completed)');
    assert.ok(!fs.existsSync(path.join(ws.workItemsDir, 'issue-done/task-state.json')));
    assert.ok(fs.existsSync(path.join(ws.archiveDir, 'issue-done/task-state.json')));

    // 3. Terminal shard (cancelled)
    writeShard(ws.workItemsDir, 'issue-cancelled', { state: 'cancelled' });

    const cancelRes = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/archive-work-item.mjs'), 'issue-cancelled', '--dir', ws.root], {
      encoding: 'utf8'
    });
    assert.equal(cancelRes.status, 0, 'Must succeed archival for terminal state (cancelled)');
    assert.ok(!fs.existsSync(path.join(ws.workItemsDir, 'issue-cancelled/task-state.json')));
    assert.ok(fs.existsSync(path.join(ws.archiveDir, 'issue-cancelled/task-state.json')));
  } finally {
    ws.cleanup();
  }
});
