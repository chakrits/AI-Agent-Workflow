import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { atomicWriteFileSync, createStateIo, initializeGeneration, lockFilePath, readGeneration } from '../scripts/lib/fenced-commit.mjs';
import { updateProjectStatusFile } from '../scripts/compile-status-projection.mjs';
import { backfillTaskStateV2 } from '../scripts/backfill-task-state-v2.mjs';
import { archiveWorkItem } from '../scripts/archive-work-item.mjs';
import { canonicalizeActor, createTaskState, digestTaskEnvelope, transitionTaskState, unlockTask } from '../scripts/lib/task-state-machine.mjs';

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-277-')); }
function realOps(overrides = {}) {
  return {
    existsSync: fs.existsSync.bind(fs), mkdirSync: fs.mkdirSync.bind(fs), openSync: fs.openSync.bind(fs),
    writeSync: fs.writeSync.bind(fs), fsyncSync: fs.fsyncSync.bind(fs), closeSync: fs.closeSync.bind(fs),
    renameSync: fs.renameSync.bind(fs), unlinkSync: fs.unlinkSync.bind(fs), readFileSync: fs.readFileSync.bind(fs),
    readdirSync: fs.readdirSync.bind(fs), statSync: fs.statSync.bind(fs), ...overrides
  };
}

test('CR-001: projection generation is checked inside the commit guard before publish', () => {
  const root = tempRoot(); fs.mkdirSync(path.join(root, 'docs/records/work-items'), { recursive: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\nold\n<!-- active-work-items-table-end -->\n');
  initializeGeneration(root, 'projection');
  let bumped = false;
  const generationFile = path.join(root, 'docs/records/work-items/.fencing/projection/projection.json');
  const ops = realOps({ openSync(target, ...args) {
    if (!bumped && String(target).endsWith('projection.guard')) {
      fs.writeFileSync(generationFile, '{"schema_version":1,"generation":2}\n'); bumped = true;
    }
    return fs.openSync(target, ...args);
  }});
  assert.throws(() => updateProjectStatusFile(root, createStateIo({ fsOps: ops })), (error) => error.code === 'FENCING_TOKEN_STALE');
  assert.match(fs.readFileSync(path.join(root, 'PROJECT_STATUS.md'), 'utf8'), /old/);
  assert.equal(readGeneration(root, 'projection'), 2);
});

test('CR-004: actor declarations canonicalize through ROLE_REGISTRY before matrix authorization', () => {
  const task = createTaskState({ task_id: 'actor-case' });
  assert.equal(canonicalizeActor(' QA_AGENT '), 'qa-agent');
  assert.throws(() => canonicalizeActor('not-a-role'), (error) => error.code === 'UNAUTHORIZED_ACTOR');
  const next = transitionTaskState(task, { to: 'investigating', actor: 'ORCHESTRATOR', evidence: { requirement_discovery: 'req' }, expected_digest: task.state_digest });
  assert.equal(next.history.at(-1).actor, 'orchestrator');
});

test('CR-005: malformed recovery re-reads and preserves a replacement valid lock', () => {
  const root = tempRoot(); fs.mkdirSync(path.join(root, 'docs/records/work-items'), { recursive: true });
  initializeGeneration(root, 'task', 'lock-case', undefined, { allowExisting: true });
  const lock = lockFilePath(root, 'task', 'lock-case'); fs.mkdirSync(path.dirname(lock), { recursive: true }); fs.writeFileSync(lock, '{');
  const valid = JSON.stringify({ pid: process.pid, nonce: '11111111-1111-4111-8111-111111111111', created_at: 1 }) + '\n'; let reads = 0;
  const ops = realOps({ readFileSync(file, encoding) {
    const value = fs.readFileSync(file, encoding); if (file === lock && reads++ === 1) { fs.writeFileSync(lock, valid); return valid; } return value;
  }});
  assert.throws(() => unlockTask(root, 'lock-case', { malformed: true, quiesced: true, io: createStateIo({ fsOps: ops }) }), (error) => error.code === 'LOCK_BECAME_VALID');
  assert.equal(fs.readFileSync(lock, 'utf8'), valid); assert.equal(readGeneration(root, 'task', 'lock-case'), 1);
});

test('CR-006: v1 backfill is idempotent, generation-bound and byte-restorable', () => {
  const root = tempRoot(); const dir = path.join(root, 'docs/records/work-items/issue-249'); fs.mkdirSync(dir, { recursive: true });
  const original = fs.readFileSync('docs/records/work-items/issue-249/task-state.json.v1-backup', 'utf8'); const file = path.join(dir, 'task-state.json'); fs.writeFileSync(file, original);
  const first = backfillTaskStateV2(file); assert.equal(first.changed, true); assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).contract_version, 2); assert.equal(readGeneration(root, 'task', 'issue-249'), 1);
  assert.equal(backfillTaskStateV2(file).changed, false); backfillTaskStateV2(file, { rollback: true }); assert.equal(fs.readFileSync(file, 'utf8'), original);
});

test('CR-008: temp-file collision never removes another writer\'s artifact', () => {
  const root = tempRoot(); const target = path.join(root, 'data.json'); const collision = path.join(root, '.tmp-data.json-9-1-0');
  let first = true; const ops = realOps({ openSync(file, ...args) { if (first && file === collision) { first = false; fs.writeFileSync(collision, 'other-writer'); const error = new Error('exists'); error.code = 'EEXIST'; throw error; } return fs.openSync(file, ...args); } });
  assert.throws(() => atomicWriteFileSync(target, 'candidate', createStateIo({ fsOps: ops, processOps: { pid: 9 }, clock: { now: () => 1 }, random: () => 0 })), (error) => error.code === 'EEXIST');
  assert.equal(fs.readFileSync(collision, 'utf8'), 'other-writer');
});

test('CR-002: stale compensation is rejected before archive-to-active rename', () => {
  const root = tempRoot(); const active = path.join(root, 'docs/records/work-items/comp-case'); fs.mkdirSync(active, { recursive: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\n<!-- active-work-items-table-end -->\n');
  const task = createTaskState({ task_id: 'comp-case' }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task);
  initializeGeneration(root, 'task', 'comp-case', undefined, { allowExisting: true }); fs.writeFileSync(path.join(active, 'task-state.json'), JSON.stringify(task));
  const malformed = path.join(root, 'docs/records/work-items/bad/task-state.json'); fs.mkdirSync(path.dirname(malformed), { recursive: true }); fs.writeFileSync(malformed, '{');
  const generationFile = path.join(root, 'docs/records/work-items/.fencing/tasks/comp-case.json'); let guardOpens = 0;
  const ops = realOps({ openSync(file, ...args) {
    if (String(file).endsWith('comp-case.guard')) { guardOpens += 1; if (guardOpens === 2) fs.writeFileSync(generationFile, '{"schema_version":1,"generation":2}\n'); }
    return fs.openSync(file, ...args);
  }});
  assert.throws(() => archiveWorkItem('comp-case', root, { io: createStateIo({ fsOps: ops }) }), (error) => error.code === 'ARCHIVE_EXECUTOR_STALE');
  assert.equal(fs.existsSync(path.join(root, 'docs/records/work-items/comp-case')), false);
  assert.equal(fs.existsSync(path.join(root, 'docs/records/work-items/archive/comp-case')), true);
});

test.afterEach(() => {});
