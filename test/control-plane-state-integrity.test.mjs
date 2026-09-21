import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { atomicWriteFileSync, acquireCommitGuard, commitGuardPath, createStateIo, incrementGeneration, initializeGeneration, lockFilePath, readGeneration } from '../scripts/lib/fenced-commit.mjs';
import { digestJcs } from '../scripts/lib/status-jcs.mjs';
import { updateProjectStatusFile } from '../scripts/compile-status-projection.mjs';
import { backfillTaskStateV2 } from '../scripts/backfill-task-state-v2.mjs';
import { adoptArchiveTransaction, archiveWorkItem } from '../scripts/archive-work-item.mjs';
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
function journalFor(taskId, task, generation, phase = 'prepared', intentTaskId = taskId) {
  const txid = '11111111-1111-4111-8111-111111111111'; const attemptId = '22222222-2222-4222-8222-222222222222';
  const journal = { schema_version: 1, journal_revision: 1, journal_digest: '', transactions: [{ intent: { txid, task_id: intentTaskId, intended_outcome: 'archived', source_digest: task.state_digest, source_generation: generation, created_at: 1 }, attempts: [{ attempt_id: attemptId, generation, adopts_attempt_id: null, started_at: 1 }], current_attempt_id: attemptId, phase, terminal_outcome: phase === 'terminal_archived' ? 'archived' : (phase === 'terminal_compensated' ? 'compensated' : null) }], current_txid: txid };
  journal.journal_digest = digestJcs(Object.fromEntries(Object.entries(journal).filter(([key]) => key !== 'journal_digest')));
  return journal;
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

test('SEC-008: unlock fails closed when admission-lock directory sync fails after unlink', () => {
  const root = tempRoot(); const taskId = 'unlock-sync-failure';
  fs.mkdirSync(path.join(root, 'docs/records/work-items'), { recursive: true });
  initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
  const lock = lockFilePath(root, 'task', taskId); fs.mkdirSync(path.dirname(lock), { recursive: true });
  const nonce = '11111111-1111-4111-8111-111111111111';
  fs.writeFileSync(lock, `${JSON.stringify({ pid: process.pid, nonce, created_at: 1 })}\n`);
  const opened = new Map(); let failLockDirectorySync = true;
  const ops = realOps({
    openSync(file, ...args) { const fd = fs.openSync(file, ...args); opened.set(fd, file); return fd; },
    fsyncSync(fd) {
      const file = opened.get(fd);
      if (failLockDirectorySync && file === path.dirname(lock)) {
        failLockDirectorySync = false;
        const error = new Error('injected admission-lock directory sync failure'); error.code = 'EIO'; throw error;
      }
      return fs.fsyncSync(fd);
    },
    closeSync(fd) { opened.delete(fd); return fs.closeSync(fd); }
  });
  assert.throws(() => unlockTask(root, taskId, { nonce, quiesced: true, io: createStateIo({ fsOps: ops }) }), (error) => error.code === 'EIO');
  assert.equal(readGeneration(root, 'task', taskId), 2);
  assert.equal(fs.existsSync(lock), false, 'the lock unlink occurred before the failed directory sync');
  assert.equal(fs.existsSync(commitGuardPath(root, 'task', taskId)), false, 'commit guard must be cleaned up on sync failure');
});

test('CR-006: v1 backfill is idempotent, generation-bound and byte-restorable', () => {
  const root = tempRoot(); const dir = path.join(root, 'docs/records/work-items/issue-249'); fs.mkdirSync(dir, { recursive: true });
  const original = fs.readFileSync('docs/records/work-items/issue-249/task-state.json.v1-backup', 'utf8'); const file = path.join(dir, 'task-state.json'); fs.writeFileSync(file, original);
  const first = backfillTaskStateV2(file); assert.equal(first.changed, true); assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).contract_version, 2); assert.equal(readGeneration(root, 'task', 'issue-249'), 1);
  assert.equal(backfillTaskStateV2(file).changed, false); backfillTaskStateV2(file, { rollback: true }); assert.equal(fs.readFileSync(file, 'utf8'), original);
});

test('CR-011: activated v2 backfill refuses a missing or corrupt generation', () => {
  for (const [label, fenceBytes] of [['missing', null], ['corrupt', '{"schema_version":1,"generation":0}\n']]) {
    const root = tempRoot(); const dir = path.join(root, 'docs/records/work-items', `backfill-${label}`); fs.mkdirSync(dir, { recursive: true });
    const task = createTaskState({ task_id: `backfill-${label}` }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task);
    const file = path.join(dir, 'task-state.json'); fs.writeFileSync(file, `${JSON.stringify(task)}\n`);
    if (fenceBytes !== null) { const fence = path.join(root, 'docs/records/work-items/.fencing/tasks', `backfill-${label}.json`); fs.mkdirSync(path.dirname(fence), { recursive: true }); fs.writeFileSync(fence, fenceBytes); }
    assert.throws(() => backfillTaskStateV2(file), (error) => error.code === 'FENCE_STATE_MISSING' || error.code === 'FENCE_STATE_MALFORMED');
    assert.equal(fs.readFileSync(file, 'utf8'), `${JSON.stringify(task)}\n`);
  }
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

test('CR-009: stale forward archiver is rejected before active-to-archive rename', () => {
  const root = tempRoot(); const active = path.join(root, 'docs/records/work-items/forward-case'); fs.mkdirSync(active, { recursive: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\n<!-- active-work-items-table-end -->\n');
  const task = createTaskState({ task_id: 'forward-case' }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`);
  initializeGeneration(root, 'task', 'forward-case', undefined, { allowExisting: true });
  const generationFile = path.join(root, 'docs/records/work-items/.fencing/tasks/forward-case.json'); let generationReads = 0; let forwardRenames = 0;
  const ops = realOps({ readFileSync(file, encoding) {
    const value = fs.readFileSync(file, encoding);
    if (file === generationFile && generationReads++ === 2) { fs.writeFileSync(generationFile, '{"schema_version":1,"generation":2}\n'); return fs.readFileSync(file, encoding); }
    return value;
  }, renameSync(from, to) { if (from === active && to.endsWith(path.join('archive', 'forward-case'))) forwardRenames += 1; return fs.renameSync(from, to); }});
  assert.throws(() => archiveWorkItem('forward-case', root, { io: createStateIo({ fsOps: ops }) }), (error) => error.code === 'ARCHIVE_EXECUTOR_STALE');
  assert.equal(fs.existsSync(active), true); assert.equal(fs.existsSync(path.join(root, 'docs/records/work-items/archive/forward-case')), false); assert.equal(forwardRenames, 0); assert.equal(readGeneration(root, 'task', 'forward-case'), 2);
});

test('CR-015: stale compensation request leaves journal and shards byte-identical', () => {
  const root = tempRoot(); const taskId = 'comp-request-stale'; const archive = path.join(root, 'docs/records/work-items/archive', taskId); fs.mkdirSync(archive, { recursive: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\n<!-- active-work-items-table-end -->\n');
  const task = createTaskState({ task_id: taskId }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(archive, 'task-state.json'), `${JSON.stringify(task)}\n`);
  const bad = path.join(root, 'docs/records/work-items/bad-projection/task-state.json'); fs.mkdirSync(path.dirname(bad), { recursive: true }); fs.writeFileSync(bad, '{');
  initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
  const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions', `${taskId}.json`); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor(taskId, task, 1, 'archive_moved'))}\n`);
  const beforeJournal = fs.readFileSync(journalFile); const beforeArchive = fs.readFileSync(path.join(archive, 'task-state.json')); const beforeProjection = fs.readFileSync(path.join(root, 'PROJECT_STATUS.md')); const generationFile = path.join(root, 'docs/records/work-items/.fencing/tasks', `${taskId}.json`); let taskGuardOpens = 0;
  const ops = realOps({ openSync(file, ...args) {
    if (String(file).endsWith(`${taskId}.guard`)) { taskGuardOpens += 1; if (taskGuardOpens === 2) fs.writeFileSync(generationFile, '{"schema_version":1,"generation":2}\n'); }
    return fs.openSync(file, ...args);
  }, renameSync(from, to) { if (from === archive && to === path.join(root, 'docs/records/work-items', taskId)) throw new Error('stale compensator must not rename'); return fs.renameSync(from, to); } });
  assert.throws(() => archiveWorkItem(taskId, root, { io: createStateIo({ fsOps: ops }) }), (error) => error.code === 'ARCHIVE_EXECUTOR_STALE' || error.code === 'ARCHIVE_JOURNAL_CONFLICT');
  assert.deepEqual(fs.readFileSync(journalFile), beforeJournal);
  assert.deepEqual(fs.readFileSync(path.join(archive, 'task-state.json')), beforeArchive);
  assert.deepEqual(fs.readFileSync(path.join(root, 'PROJECT_STATUS.md')), beforeProjection);
  assert.equal(fs.existsSync(path.join(root, 'docs/records/work-items', taskId)), false);
  assert.equal(fs.existsSync(archive), true);
  assert.equal(fs.existsSync(lockFilePath(root, 'task', taskId)), false);
  assert.equal(fs.existsSync(commitGuardPath(root, 'task', taskId)), false);
});

test('CR-015: stale compensation journal revision is rejected before conditional persist', () => {
  const root = tempRoot(); const taskId = 'comp-journal-stale'; const archive = path.join(root, 'docs/records/work-items/archive', taskId); fs.mkdirSync(archive, { recursive: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\n<!-- active-work-items-table-end -->\n');
  const task = createTaskState({ task_id: taskId }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(archive, 'task-state.json'), `${JSON.stringify(task)}\n`);
  const bad = path.join(root, 'docs/records/work-items/bad-journal-projection/task-state.json'); fs.mkdirSync(path.dirname(bad), { recursive: true }); fs.writeFileSync(bad, '{');
  initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
  const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions', `${taskId}.json`); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor(taskId, task, 1, 'archive_moved'))}\n`);
  const beforeArchive = fs.readFileSync(path.join(archive, 'task-state.json')); let journalReads = 0; let reverseRenames = 0;
  const ops = realOps({ readFileSync(file, encoding) {
    const value = fs.readFileSync(file, encoding);
    if (file === journalFile && journalReads++ === 2) {
      const changed = JSON.parse(value); changed.journal_revision += 1; changed.journal_digest = digestJcs(Object.fromEntries(Object.entries(changed).filter(([key]) => key !== 'journal_digest'))); fs.writeFileSync(journalFile, `${JSON.stringify(changed)}\n`);
    }
    return value;
  }, renameSync(from, to) { if (from === archive && to === path.join(root, 'docs/records/work-items', taskId)) reverseRenames += 1; return fs.renameSync(from, to); } });
  assert.throws(() => archiveWorkItem(taskId, root, { io: createStateIo({ fsOps: ops }) }), (error) => error.code === 'ARCHIVE_JOURNAL_CONFLICT');
  assert.equal(reverseRenames, 0); assert.deepEqual(fs.readFileSync(path.join(archive, 'task-state.json')), beforeArchive);
  const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8')); assert.equal(journal.journal_revision, 2); assert.equal(journal.transactions.at(-1).phase, 'archive_moved');
  assert.equal(fs.existsSync(lockFilePath(root, 'task', taskId)), false); assert.equal(fs.existsSync(commitGuardPath(root, 'task', taskId)), false);
});

test('CR-010: digest-valid journal for another task is rejected before any move', () => {
  const root = tempRoot(); const active = path.join(root, 'docs/records/work-items/journal-case'); fs.mkdirSync(active, { recursive: true });
  const task = createTaskState({ task_id: 'journal-case' }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`);
  initializeGeneration(root, 'task', 'journal-case', undefined, { allowExisting: true });
  const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions/journal-case.json'); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor('journal-case', task, 1, 'prepared', 'other-task'))}\n`);
  assert.throws(() => archiveWorkItem('journal-case', root), (error) => error.code === 'TASK_IDENTITY_MISMATCH');
  assert.equal(fs.existsSync(active), true); assert.equal(fs.existsSync(path.join(root, 'docs/records/work-items/archive/journal-case')), false);
});

test('CR-012: adoption is generation-bound and resumes through the guarded forward path', () => {
  const root = tempRoot(); const active = path.join(root, 'docs/records/work-items/adopt-case'); fs.mkdirSync(active, { recursive: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\n<!-- active-work-items-table-end -->\n');
  const task = createTaskState({ task_id: 'adopt-case' }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`);
  initializeGeneration(root, 'task', 'adopt-case', undefined, { allowExisting: true });
  const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions/adopt-case.json'); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor('adopt-case', task, 1))}\n`);
  const guard = acquireCommitGuard(root, 'task', 'adopt-case'); incrementGeneration(root, 'task', 'adopt-case'); fs.unlinkSync(guard.path);
  const adopted = adoptArchiveTransaction('adopt-case', root); assert.equal(adopted.adopted, true); assert.equal(adopted.generation, 2);
  const afterAdoption = JSON.parse(fs.readFileSync(journalFile, 'utf8')); const tx = afterAdoption.transactions.at(-1); assert.equal(tx.attempts.length, 2); assert.equal(tx.attempts[1].generation, 2); assert.equal(tx.attempts[1].adopts_attempt_id, tx.attempts[0].attempt_id);
  const result = archiveWorkItem('adopt-case', root); assert.equal(result.archived, true); assert.equal(fs.existsSync(active), false); assert.equal(fs.existsSync(path.join(root, 'docs/records/work-items/archive/adopt-case')), true);
});

test('CR-012: stale adoption and unsafe phase/path combinations fail closed', () => {
  const staleRoot = tempRoot(); const staleActive = path.join(staleRoot, 'docs/records/work-items/adopt-stale'); fs.mkdirSync(staleActive, { recursive: true });
  const staleTask = createTaskState({ task_id: 'adopt-stale' }); staleTask.state = 'completed'; staleTask.state_digest = digestTaskEnvelope(staleTask); fs.writeFileSync(path.join(staleActive, 'task-state.json'), `${JSON.stringify(staleTask)}\n`); initializeGeneration(staleRoot, 'task', 'adopt-stale', undefined, { allowExisting: true });
  const staleJournalFile = path.join(staleRoot, 'docs/records/work-items/.archive-transactions/adopt-stale.json'); fs.mkdirSync(path.dirname(staleJournalFile), { recursive: true }); fs.writeFileSync(staleJournalFile, `${JSON.stringify(journalFor('adopt-stale', staleTask, 1))}\n`);
  const staleGenerationFile = path.join(staleRoot, 'docs/records/work-items/.fencing/tasks/adopt-stale.json'); let generationReads = 0;
  const staleOps = realOps({ readFileSync(file, encoding) { const value = fs.readFileSync(file, encoding); if (file === staleGenerationFile && generationReads++ === 0) fs.writeFileSync(staleGenerationFile, '{"schema_version":1,"generation":2}\n'); return value; } });
  assert.throws(() => adoptArchiveTransaction('adopt-stale', staleRoot, { io: createStateIo({ fsOps: staleOps }) }), (error) => error.code === 'ARCHIVE_EXECUTOR_STALE');
  assert.equal(JSON.parse(fs.readFileSync(staleJournalFile, 'utf8')).journal_revision, 1); assert.equal(fs.existsSync(staleActive), true);

  const terminalRoot = tempRoot(); const terminalActive = path.join(terminalRoot, 'docs/records/work-items/adopt-terminal'); fs.mkdirSync(terminalActive, { recursive: true });
  const terminalTask = createTaskState({ task_id: 'adopt-terminal' }); terminalTask.state = 'completed'; terminalTask.state_digest = digestTaskEnvelope(terminalTask); fs.writeFileSync(path.join(terminalActive, 'task-state.json'), `${JSON.stringify(terminalTask)}\n`); initializeGeneration(terminalRoot, 'task', 'adopt-terminal', undefined, { allowExisting: true });
  const terminalArchive = path.join(terminalRoot, 'docs/records/work-items/archive/adopt-terminal'); fs.mkdirSync(path.dirname(terminalArchive), { recursive: true }); fs.renameSync(terminalActive, terminalArchive);
  const terminalJournalFile = path.join(terminalRoot, 'docs/records/work-items/.archive-transactions/adopt-terminal.json'); fs.mkdirSync(path.dirname(terminalJournalFile), { recursive: true }); fs.writeFileSync(terminalJournalFile, `${JSON.stringify(journalFor('adopt-terminal', terminalTask, 1, 'terminal_archived'))}\n`);
  fs.writeFileSync(path.join(terminalRoot, 'docs/records/work-items/.fencing/tasks/adopt-terminal.json'), '{"schema_version":1,"generation":2}\n');
  assert.throws(() => adoptArchiveTransaction('adopt-terminal', terminalRoot), (error) => error.code === 'ARCHIVE_ADOPTION_UNSAFE');

  const ambiguousRoot = tempRoot(); const ambiguousActive = path.join(ambiguousRoot, 'docs/records/work-items/adopt-ambiguous'); fs.mkdirSync(ambiguousActive, { recursive: true });
  const ambiguousTask = createTaskState({ task_id: 'adopt-ambiguous' }); ambiguousTask.state = 'completed'; ambiguousTask.state_digest = digestTaskEnvelope(ambiguousTask); fs.writeFileSync(path.join(ambiguousActive, 'task-state.json'), `${JSON.stringify(ambiguousTask)}\n`); const ambiguousArchive = path.join(ambiguousRoot, 'docs/records/work-items/archive/adopt-ambiguous'); fs.mkdirSync(ambiguousArchive, { recursive: true }); fs.writeFileSync(path.join(ambiguousArchive, 'task-state.json'), `${JSON.stringify(ambiguousTask)}\n`); initializeGeneration(ambiguousRoot, 'task', 'adopt-ambiguous', undefined, { allowExisting: true });
  const ambiguousJournalFile = path.join(ambiguousRoot, 'docs/records/work-items/.archive-transactions/adopt-ambiguous.json'); fs.mkdirSync(path.dirname(ambiguousJournalFile), { recursive: true }); fs.writeFileSync(ambiguousJournalFile, `${JSON.stringify(journalFor('adopt-ambiguous', ambiguousTask, 1))}\n`); fs.writeFileSync(path.join(ambiguousRoot, 'docs/records/work-items/.fencing/tasks/adopt-ambiguous.json'), '{"schema_version":1,"generation":2}\n');
  assert.throws(() => adoptArchiveTransaction('adopt-ambiguous', ambiguousRoot), (error) => error.code === 'ARCHIVE_LOCATION_AMBIGUOUS');
  assert.equal(JSON.parse(fs.readFileSync(ambiguousJournalFile, 'utf8')).journal_revision, 1);
});

test('CR-012: adoption oracle covers the six phases, four paths and three generation relations', () => {
  const phases = ['prepared', 'archive_moved', 'compensation_requested', 'compensation_moved', 'terminal_archived', 'terminal_compensated'];
  const paths = ['A', 'R', 'B', 'N'];
  const relations = ['equal', 'greater', 'lower'];
  let cells = 0;
  for (const phase of phases) for (const location of paths) for (const relation of relations) {
    cells += 1; const taskId = `matrix-${cells}`; const root = tempRoot(); const active = path.join(root, 'docs/records/work-items', taskId); fs.mkdirSync(active, { recursive: true });
    const task = createTaskState({ task_id: taskId }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`); initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
    const archive = path.join(root, 'docs/records/work-items/archive', taskId);
    if (location === 'R') { fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.renameSync(active, archive); }
    if (location === 'B') { fs.mkdirSync(archive, { recursive: true }); fs.writeFileSync(path.join(archive, 'task-state.json'), `${JSON.stringify(task)}\n`); }
    if (location === 'N') fs.rmSync(active, { recursive: true });
    const attemptGeneration = relation === 'lower' ? 2 : 1; const currentGeneration = relation === 'greater' ? 2 : 1;
    const generationFile = path.join(root, 'docs/records/work-items/.fencing/tasks', `${taskId}.json`); fs.writeFileSync(generationFile, `{"schema_version":1,"generation":${currentGeneration}}\n`);
    const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions', `${taskId}.json`); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor(taskId, task, attemptGeneration, phase))}\n`);
    const validLocation = { prepared: ['A', 'R'], archive_moved: ['R'], compensation_requested: ['A', 'R'], compensation_moved: ['A'], terminal_archived: ['R'], terminal_compensated: ['A'] }[phase].includes(location);
    const expected = relation === 'lower' ? 'FENCE_GENERATION_REGRESSION' : (location === 'B' || location === 'N' ? 'ARCHIVE_LOCATION_AMBIGUOUS' : (!validLocation ? (phase.startsWith('terminal_') ? 'ARCHIVE_TERMINAL_LOCATION_MISMATCH' : 'ARCHIVE_PHASE_LOCATION_MISMATCH') : (phase.startsWith('terminal_') ? 'ARCHIVE_ADOPTION_UNSAFE' : null)));
    if (expected) assert.throws(() => adoptArchiveTransaction(taskId, root), (error) => error.code === expected);
    else { const result = adoptArchiveTransaction(taskId, root); assert.equal(result.adopted, relation === 'greater'); }
    assert.equal(JSON.parse(fs.readFileSync(journalFile, 'utf8')).journal_revision, relation === 'greater' && expected === null ? 2 : 1);
  }
  assert.equal(cells, 72);
});

test('CR-013: compensation phases recover after restart and finalize a fresh active projection', () => {
  for (const [phase, location] of [['compensation_requested', 'archive'], ['compensation_requested', 'active'], ['compensation_moved', 'active']]) {
    const root = tempRoot(); const taskId = `recover-${phase.replaceAll('_', '-')}-${location}`; const active = path.join(root, 'docs/records/work-items', taskId); fs.mkdirSync(active, { recursive: true });
    fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\n<!-- active-work-items-table-end -->\n');
    const task = createTaskState({ task_id: taskId }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`); initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
    if (location === 'archive') { const archive = path.join(root, 'docs/records/work-items/archive', taskId); fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.renameSync(active, archive); }
    const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions', `${taskId}.json`); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor(taskId, task, 1, phase))}\n`);
    const result = archiveWorkItem(taskId, root); assert.equal(result.compensated, true); assert.equal(fs.existsSync(active), true); assert.equal(fs.existsSync(path.join(root, 'docs/records/work-items/archive', taskId)), false);
    const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8')); assert.equal(journal.transactions.at(-1).phase, 'terminal_compensated'); assert.equal(journal.transactions.at(-1).terminal_outcome, 'compensated');
  }
});

test('CR-013: stale compensation recovery fails before reverse rename', () => {
  const root = tempRoot(); const taskId = 'recover-stale'; const active = path.join(root, 'docs/records/work-items', taskId); fs.mkdirSync(active, { recursive: true });
  const task = createTaskState({ task_id: taskId }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`); initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
  const archive = path.join(root, 'docs/records/work-items/archive', taskId); fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.renameSync(active, archive);
  const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions', `${taskId}.json`); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor(taskId, task, 1, 'compensation_requested'))}\n`);
  const generationFile = path.join(root, 'docs/records/work-items/.fencing/tasks', `${taskId}.json`); let reads = 0;
  const ops = realOps({ readFileSync(file, encoding) { const value = fs.readFileSync(file, encoding); if (file === generationFile && reads++ === 0) fs.writeFileSync(generationFile, '{"schema_version":1,"generation":2}\n'); return value; }, renameSync() { throw new Error('reverse rename must not be reached'); } });
  assert.throws(() => archiveWorkItem(taskId, root, { io: createStateIo({ fsOps: ops }) }), (error) => error.code === 'ARCHIVE_EXECUTOR_STALE');
  assert.equal(fs.existsSync(archive), true); assert.equal(fs.existsSync(active), false); assert.equal(JSON.parse(fs.readFileSync(journalFile, 'utf8')).transactions.at(-1).phase, 'compensation_requested');
});

test('CR-014: terminal compensation permits a fresh immutable archive transaction only with matching projection', () => {
  const root = tempRoot(); const taskId = 'fresh-retry'; const active = path.join(root, 'docs/records/work-items', taskId); fs.mkdirSync(active, { recursive: true });
  const task = createTaskState({ task_id: taskId }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`); initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), '<!-- active-work-items-table-start -->\n<!-- active-work-items-table-end -->\n'); updateProjectStatusFile(root);
  const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions', `${taskId}.json`); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor(taskId, task, 1, 'terminal_compensated'))}\n`);
  assert.throws(() => adoptArchiveTransaction(taskId, root), (error) => error.code === 'ARCHIVE_ADOPTION_UNSAFE');
  const result = archiveWorkItem(taskId, root); assert.equal(result.archived, true); assert.equal(fs.existsSync(active), false);
  const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8')); assert.equal(journal.transactions.length, 2); assert.notEqual(journal.transactions[0].intent.txid, journal.transactions[1].intent.txid); assert.equal(journal.transactions[0].phase, 'terminal_compensated'); assert.equal(journal.transactions[1].phase, 'terminal_archived');
});

test('CR-014: projection drift blocks a fresh transaction append', () => {
  const root = tempRoot(); const taskId = 'fresh-drift'; const active = path.join(root, 'docs/records/work-items', taskId); fs.mkdirSync(active, { recursive: true });
  const task = createTaskState({ task_id: taskId }); task.state = 'completed'; task.state_digest = digestTaskEnvelope(task); fs.writeFileSync(path.join(active, 'task-state.json'), `${JSON.stringify(task)}\n`); initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
  fs.writeFileSync(path.join(root, 'PROJECT_STATUS.md'), 'stale\n');
  const journalFile = path.join(root, 'docs/records/work-items/.archive-transactions', `${taskId}.json`); fs.mkdirSync(path.dirname(journalFile), { recursive: true }); fs.writeFileSync(journalFile, `${JSON.stringify(journalFor(taskId, task, 1, 'terminal_compensated'))}\n`);
  assert.throws(() => archiveWorkItem(taskId, root), (error) => error.code === 'ARCHIVE_PROJECTION_DRIFT');
  const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8')); assert.equal(journal.transactions.length, 1); assert.equal(fs.existsSync(active), true);
});

test.afterEach(() => {});
