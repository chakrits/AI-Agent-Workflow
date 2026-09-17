#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { digestJcs } from './lib/status-jcs.mjs';
import { digestTaskEnvelope, validateEnvelopeSchema } from './lib/task-state-machine.mjs';
import { atomicWriteFileSync, defaultStateIo, acquireLock, releaseLock, acquireCommitGuard, releaseCommitGuard, readGeneration } from './lib/fenced-commit.mjs';
import { updateProjectStatusFile } from './compile-status-projection.mjs';

export const WORK_ITEMS_REL_DIR = 'docs/records/work-items';
export const ARCHIVE_REL_DIR = 'docs/records/work-items/archive';
export const TERMINAL_STATES = ['completed', 'cancelled'];
const PHASES = ['prepared', 'archive_moved', 'compensation_requested', 'compensation_moved', 'terminal_archived', 'terminal_compensated'];

function fail(code, message, extra = {}) { return Object.assign(new Error(message), { code, status: 'REJECTED', ...extra }); }
function validId(id) { if (typeof id !== 'string' || !/^[a-z0-9_-]+$/.test(id) || id === 'archive') throw fail(id === 'archive' ? 'RESERVED_TASK_ID' : 'INVALID_ISSUE_ID', `Invalid issue_id '${id}'`); return id; }
function journalPath(rootDir, taskId) { return path.join(rootDir, WORK_ITEMS_REL_DIR, '.archive-transactions', `${validId(taskId)}.json`); }
function journalDigest(journal) { const copy = { ...journal }; delete copy.journal_digest; return digestJcs(copy); }
function writeJournal(file, journal, io) { journal.journal_digest = journalDigest(journal); atomicWriteFileSync(file, `${JSON.stringify(journal, null, 2)}\n`, io); }
function syncDirectory(directory, io) {
  let fd;
  try { fd = io.fsOps.openSync(directory, 'r'); io.fsOps.fsyncSync(fd); }
  finally { if (fd !== undefined) { try { io.fsOps.closeSync(fd); } catch {} } }
}
function writeInitialJournal(file, journal, io) {
  const parent = path.dirname(file);
  io.fsOps.mkdirSync(parent, { recursive: true });
  const raw = `${JSON.stringify(journal, null, 2)}\n`;
  const bytes = Buffer.from(raw, 'utf8');
  let fd;
  try {
    fd = io.fsOps.openSync(file, 'wx', 0o600);
    let offset = 0;
    while (offset < bytes.length) {
      const written = io.fsOps.writeSync(fd, bytes, offset, bytes.length - offset);
      if (!Number.isInteger(written) || written <= 0) throw fail('ATOMIC_WRITE_NO_PROGRESS', `Zero-progress journal write to ${file}`);
      offset += written;
    }
    io.fsOps.fsyncSync(fd);
  } catch (cause) {
    if (fd !== undefined) { try { io.fsOps.closeSync(fd); } catch {} }
    if (cause?.code === 'EEXIST') throw fail('ARCHIVE_JOURNAL_CONFLICT', `Archive journal already exists: ${file}`);
    throw cause;
  } finally { if (fd !== undefined) { try { io.fsOps.closeSync(fd); } catch {} } }
  syncDirectory(parent, io);
}
function exactKeys(value, keys, code, file) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key))) {
    throw fail(code, `Invalid archive journal schema: ${file}`);
  }
}
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX64 = /^[a-f0-9]{64}$/;
function loadJournal(file, io) {
  if (!io.fsOps.existsSync(file)) return null;
  let journal; try { journal = JSON.parse(io.fsOps.readFileSync(file, 'utf8')); } catch (cause) { throw fail('ARCHIVE_JOURNAL_MALFORMED', `Malformed archive journal: ${file}`, { cause }); }
  exactKeys(journal, ['schema_version', 'journal_revision', 'journal_digest', 'transactions', 'current_txid'], 'ARCHIVE_JOURNAL_MALFORMED', file);
  if (journal.schema_version !== 1 || !Number.isSafeInteger(journal.journal_revision) || journal.journal_revision < 1 || !Array.isArray(journal.transactions) || journal.transactions.length < 1 || !UUID_V4.test(journal.current_txid)) throw fail('ARCHIVE_JOURNAL_MALFORMED', `Invalid archive journal header: ${file}`);
  if (!HEX64.test(journal.journal_digest) || journal.journal_digest !== journalDigest(journal)) throw fail('ARCHIVE_JOURNAL_TAMPERED', `Tampered archive journal: ${file}`);
  const txids = new Set(); const attempts = new Set();
  for (const tx of journal.transactions) {
    exactKeys(tx, ['intent', 'attempts', 'current_attempt_id', 'phase', 'terminal_outcome'], 'ARCHIVE_JOURNAL_MALFORMED', file);
    exactKeys(tx.intent, ['txid', 'task_id', 'intended_outcome', 'source_digest', 'source_generation', 'created_at'], 'ARCHIVE_JOURNAL_MALFORMED', file);
    if (!UUID_V4.test(tx.intent.txid) || tx.intent.intended_outcome !== 'archived' || !/^[a-z0-9_-]+$/.test(tx.intent.task_id) || !HEX64.test(tx.intent.source_digest) || !Number.isSafeInteger(tx.intent.source_generation) || tx.intent.source_generation < 1 || !Number.isSafeInteger(tx.intent.created_at) || tx.intent.created_at < 0) throw fail('ARCHIVE_JOURNAL_MALFORMED', `Invalid archive journal intent: ${file}`);
    if (txids.has(tx.intent.txid)) throw fail('ARCHIVE_JOURNAL_TAMPERED', `Duplicate archive transaction id: ${file}`); txids.add(tx.intent.txid);
    if (!Array.isArray(tx.attempts) || tx.attempts.length < 1 || !UUID_V4.test(tx.current_attempt_id) || !PHASES.includes(tx.phase)) throw fail('ARCHIVE_JOURNAL_MALFORMED', `Invalid archive journal phase: ${file}`);
    for (const attempt of tx.attempts) {
      exactKeys(attempt, ['attempt_id', 'generation', 'adopts_attempt_id', 'started_at'], 'ARCHIVE_JOURNAL_MALFORMED', file);
      if (!UUID_V4.test(attempt.attempt_id) || attempts.has(attempt.attempt_id) || (attempt.adopts_attempt_id !== null && !UUID_V4.test(attempt.adopts_attempt_id)) || !Number.isSafeInteger(attempt.generation) || attempt.generation < 1 || !Number.isSafeInteger(attempt.started_at) || attempt.started_at < 0) throw fail('ARCHIVE_JOURNAL_TAMPERED', `Invalid archive attempt identity: ${file}`);
      attempts.add(attempt.attempt_id);
    }
    if (!tx.attempts.some((attempt) => attempt.attempt_id === tx.current_attempt_id)) throw fail('ARCHIVE_JOURNAL_TAMPERED', `Current archive attempt is not retained: ${file}`);
    if ((tx.phase === 'terminal_archived' && tx.terminal_outcome !== 'archived') || (tx.phase === 'terminal_compensated' && tx.terminal_outcome !== 'compensated') || (!tx.phase.startsWith('terminal_') && tx.terminal_outcome !== null)) throw fail('ARCHIVE_JOURNAL_TAMPERED', `Invalid archive journal outcome: ${file}`);
  }
  if (!txids.has(journal.current_txid)) throw fail('ARCHIVE_JOURNAL_TAMPERED', `Current archive transaction is not retained: ${file}`);
  if (journal.transactions.at(-1).intent.txid !== journal.current_txid) throw fail('ARCHIVE_JOURNAL_TAMPERED', `Current archive transaction pointer is not the latest retained transaction: ${file}`);
  return journal;
}
function assertJournalBinding(journal, taskId) {
  for (const transaction of journal.transactions) {
    if (transaction.intent.task_id !== taskId) {
      throw fail('TASK_IDENTITY_MISMATCH', 'Archive journal intent is bound to a different task.');
    }
    if (!transaction.attempts.every((attempt) => attempt.adopts_attempt_id === null || transaction.attempts.some((candidate) => candidate.attempt_id === attempt.adopts_attempt_id))) throw fail('ARCHIVE_JOURNAL_TAMPERED', 'Archive attempt adoption pointer is not retained.');
  }
}
function newJournal(taskId, source, generation, io) {
  const txid = io.uuid ? io.uuid() : randomUUID(); const attempt = io.uuid ? io.uuid() : randomUUID();
  const now = io.clock?.now ? io.clock.now() : Date.now();
  return { schema_version: 1, journal_revision: 1, journal_digest: '', transactions: [{ intent: { txid, task_id: taskId, intended_outcome: 'archived', source_digest: source.state_digest, source_generation: generation, created_at: now }, attempts: [{ attempt_id: attempt, generation, adopts_attempt_id: null, started_at: now }], current_attempt_id: attempt, phase: 'prepared', terminal_outcome: null }], current_txid: txid };
}

function archiveLocation(active, archive, taskId, expectedDigest, io) {
  const activeExists = io.fsOps.existsSync(active);
  const archiveExists = io.fsOps.existsSync(archive);
  if (activeExists && archiveExists) throw fail('ARCHIVE_LOCATION_AMBIGUOUS', `Both active and archive paths exist for '${taskId}'`);
  if (!activeExists && !archiveExists) throw fail('ARCHIVE_LOCATION_AMBIGUOUS', `Neither active nor archive path exists for '${taskId}'`);
  const location = activeExists ? 'active' : 'archive';
  const file = path.join(activeExists ? active : archive, 'task-state.json');
  let state; try { state = JSON.parse(io.fsOps.readFileSync(file, 'utf8')); } catch (cause) { throw fail('ARCHIVE_JOURNAL_MALFORMED', `Malformed archive shard: ${file}`, { cause }); }
  if (state.task_id !== taskId || state.state_digest !== expectedDigest) throw fail('ARCHIVE_LOCATION_AMBIGUOUS', `Archive path identity or digest does not match intent for '${taskId}'`);
  return { location, state };
}

function adoptAttempt(taskId, journal, generation, file, io) {
  const tx = journal.transactions.at(-1);
  const previous = tx.attempts.find((item) => item.attempt_id === tx.current_attempt_id);
  if (generation < previous.generation) throw fail('FENCE_GENERATION_REGRESSION', 'Archive generation regressed below the current attempt.');
  if (generation === previous.generation) return { journal, tx, attempt: previous, adopted: false };
  const attempt_id = io.uuid ? io.uuid() : randomUUID();
  if (!UUID_V4.test(attempt_id)) throw fail('ARCHIVE_JOURNAL_MALFORMED', 'Injected archive attempt id is not UUID-v4.');
  if (!['prepared', 'archive_moved', 'compensation_requested'].includes(tx.phase)) throw fail('ARCHIVE_ADOPTION_UNSAFE', `Cannot adopt terminal archive phase ${tx.phase}`);
  const attempt = { attempt_id, generation, adopts_attempt_id: previous.attempt_id, started_at: io.clock?.now ? io.clock.now() : Date.now() };
  tx.attempts.push(attempt); tx.current_attempt_id = attempt_id; journal.journal_revision += 1; writeJournal(file, journal, io);
  return { journal, tx, attempt, adopted: true };
}

export function adoptArchiveTransaction(issueId, rootDir = process.cwd(), { io = defaultStateIo } = {}) {
  const taskId = validId(issueId); const active = path.join(rootDir, WORK_ITEMS_REL_DIR, taskId); const archive = path.join(rootDir, ARCHIVE_REL_DIR, taskId); const file = journalPath(rootDir, taskId);
  const admission = acquireLock(rootDir, 'task', taskId, io); let guard;
  try {
    const journal = loadJournal(file, io); if (!journal) throw fail('ARCHIVE_JOURNAL_MISSING', `Archive journal not found: ${file}`); assertJournalBinding(journal, taskId);
    const generation = readGeneration(rootDir, 'task', taskId, io); guard = acquireCommitGuard(rootDir, 'task', taskId, io);
    const guardedGeneration = readGeneration(rootDir, 'task', taskId, io);
    if (guardedGeneration !== generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive adoption generation changed before the guarded journal update.');
    const current = loadJournal(file, io); const tx = current.transactions.at(-1); const attempt = tx.attempts.find((item) => item.attempt_id === tx.current_attempt_id);
    assertJournalBinding(current, taskId);
    if (guardedGeneration < attempt.generation) throw fail('FENCE_GENERATION_REGRESSION', 'Archive adoption generation regressed below the current attempt.');
    if (guardedGeneration === attempt.generation) return { adopted: false, generation: guardedGeneration, attempt_id: attempt.attempt_id };
    archiveLocation(active, archive, taskId, tx.intent.source_digest, io);
    const result = adoptAttempt(taskId, current, guardedGeneration, file, io);
    return { adopted: result.adopted, generation: guardedGeneration, attempt_id: result.attempt.attempt_id, adopts_attempt_id: attempt.attempt_id, phase: tx.phase };
  } finally { if (guard) releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); releaseLock(rootDir, 'task', taskId, admission.nonce, io); }
}

export function archiveWorkItem(issueId, rootDir = process.cwd(), { io = defaultStateIo } = {}) {
  const taskId = validId(issueId); const active = path.join(rootDir, WORK_ITEMS_REL_DIR, taskId); const sourceFile = path.join(active, 'task-state.json'); const archive = path.join(rootDir, ARCHIVE_REL_DIR, taskId); const file = journalPath(rootDir, taskId);
  const admission = acquireLock(rootDir, 'task', taskId, io); let guard;
  try {
    const sourcePath = io.fsOps.existsSync(sourceFile) ? sourceFile : (io.fsOps.existsSync(file) && io.fsOps.existsSync(path.join(archive, 'task-state.json')) ? path.join(archive, 'task-state.json') : sourceFile);
    if (!io.fsOps.existsSync(sourcePath)) throw fail('SHARD_NOT_FOUND', `Task state shard not found at ${sourceFile}`);
    let source; try { source = JSON.parse(io.fsOps.readFileSync(sourcePath, 'utf8')); } catch (cause) { throw fail('MALFORMED_SHARD', `Malformed JSON in shard file ${sourcePath}`, { cause }); }
    if (source.task_id !== taskId || path.basename(active) !== taskId) throw fail('TASK_IDENTITY_MISMATCH', 'Task identity does not match the operation identifier.');
    if (!TERMINAL_STATES.includes(source.state)) throw fail('NON_TERMINAL_STATE', `Cannot archive work item '${taskId}': state '${source.state}' is not terminal.`);
    // Legacy v1 records are retained for the pre-migration tooling and tests.
    if (source.contract_version !== 2 && !Object.hasOwn(source, 'policy_contract_version')) {
      io.fsOps.mkdirSync(path.dirname(archive), { recursive: true });
      if (io.fsOps.existsSync(archive)) throw fail('ARCHIVE_COLLISION', `Target archive directory already exists at ${archive}`);
      io.fsOps.renameSync(active, archive);
      return { archived: true, issue_id: taskId, previous_path: active, archived_path: archive, state: source.state };
    }
    validateEnvelopeSchema(source); const generation = readGeneration(rootDir, 'task', taskId, io); guard = acquireCommitGuard(rootDir, 'task', taskId, io);
    const guardedGeneration = readGeneration(rootDir, 'task', taskId, io);
    if (guardedGeneration !== generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive generation changed before the forward commit guard was entered.');
    let journal = loadJournal(file, io);
    if (!journal) {
      const guardedSourceFile = path.join(active, 'task-state.json');
      if (!io.fsOps.existsSync(guardedSourceFile)) throw fail('ARCHIVE_EXECUTOR_STALE', 'Active shard disappeared before the forward archive rename.');
      try { source = JSON.parse(io.fsOps.readFileSync(guardedSourceFile, 'utf8')); } catch (cause) { throw fail('MALFORMED_SHARD', `Malformed JSON in shard file ${guardedSourceFile}`, { cause }); }
      if (source.task_id !== taskId || source.state_digest !== digestTaskEnvelope(source)) throw fail('TASK_IDENTITY_MISMATCH', 'Task identity or digest changed before the forward archive rename.');
      validateEnvelopeSchema(source);
      journal = newJournal(taskId, source, guardedGeneration, io); journal.journal_digest = journalDigest(journal); writeInitialJournal(file, journal, io);
    } else {
      assertJournalBinding(journal, taskId);
      const guardedTx = journal.transactions.at(-1);
      if (guardedTx.phase === 'prepared') {
        const guardedSourceFile = path.join(active, 'task-state.json');
        if (!io.fsOps.existsSync(guardedSourceFile)) throw fail('ARCHIVE_EXECUTOR_STALE', 'Active shard disappeared before the forward archive rename.');
        try { source = JSON.parse(io.fsOps.readFileSync(guardedSourceFile, 'utf8')); } catch (cause) { throw fail('MALFORMED_SHARD', `Malformed JSON in shard file ${guardedSourceFile}`, { cause }); }
        if (source.task_id !== taskId || source.state_digest !== digestTaskEnvelope(source) || source.state_digest !== guardedTx.intent.source_digest) throw fail('TASK_IDENTITY_MISMATCH', 'Task identity or digest changed before the forward archive rename.');
        validateEnvelopeSchema(source);
      } else {
        archiveLocation(active, archive, taskId, guardedTx.intent.source_digest, io);
      }
    }
    let tx = journal.transactions.at(-1); let attempt = tx.attempts.find((item) => item.attempt_id === tx.current_attempt_id);
    if (tx.phase === 'terminal_archived') { archiveLocation(active, archive, taskId, tx.intent.source_digest, io); return { archived: true, issue_id: taskId, archived_path: archive, state: source.state }; }
    if (tx.phase === 'terminal_compensated') { archiveLocation(active, archive, taskId, tx.intent.source_digest, io); return { archived: false, compensated: true, issue_id: taskId, restored_path: active, state: source.state }; }
    if (!['prepared', 'archive_moved'].includes(tx.phase)) throw fail('ARCHIVE_JOURNAL_CONFLICT', `Archive transaction is already in phase ${tx.phase}`);
    if (generation < attempt.generation) throw fail('FENCE_GENERATION_REGRESSION', 'Archive generation regressed below the current attempt.');
    if (generation > attempt.generation) {
      archiveLocation(active, archive, taskId, tx.intent.source_digest, io);
      const adopted = adoptAttempt(taskId, journal, generation, file, io); journal = adopted.journal; tx = adopted.tx; attempt = adopted.attempt;
    }
    if (tx.intent.source_digest !== source.state_digest && tx.phase === 'prepared') throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive executor digest is stale.');
    if (tx.phase === 'prepared') {
      const renameGeneration = readGeneration(rootDir, 'task', taskId, io);
      if (renameGeneration !== attempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive generation changed immediately before the forward rename.');
      const location = archiveLocation(active, archive, taskId, tx.intent.source_digest, io);
      if (location.location === 'active') {
        io.fsOps.mkdirSync(path.dirname(archive), { recursive: true });
        io.fsOps.renameSync(active, archive); syncDirectory(path.dirname(active), io); syncDirectory(path.dirname(archive), io);
      }
      journal.journal_revision += 1; tx.phase = 'archive_moved'; writeJournal(file, journal, io);
    } else {
      archiveLocation(active, archive, taskId, tx.intent.source_digest, io);
    }
    releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); guard = undefined;
    try { updateProjectStatusFile(rootDir, io); } catch (projectionError) {
      guard = acquireCommitGuard(rootDir, 'task', taskId, io); journal = loadJournal(file, io); assertJournalBinding(journal, taskId); const current = journal.transactions.at(-1); const compensationAttempt = current.attempts.find((item) => item.attempt_id === current.current_attempt_id); const compensationGeneration = readGeneration(rootDir, 'task', taskId, io); if (current.phase !== 'archive_moved' || compensationGeneration !== compensationAttempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Compensation executor generation or phase is stale.'); archiveLocation(active, archive, taskId, current.intent.source_digest, io); current.phase = 'compensation_requested'; journal.journal_revision += 1; writeJournal(file, journal, io); const checkedGeneration = readGeneration(rootDir, 'task', taskId, io); if (checkedGeneration !== compensationAttempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Compensation generation changed before rename.'); archiveLocation(active, archive, taskId, current.intent.source_digest, io); io.fsOps.renameSync(archive, active); syncDirectory(path.dirname(archive), io); syncDirectory(path.dirname(active), io); current.phase = 'compensation_moved'; journal.journal_revision += 1; writeJournal(file, journal, io); releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); guard = undefined;
      try { updateProjectStatusFile(rootDir, io); } catch (compensationProjectionError) { throw compensationProjectionError; }
      guard = acquireCommitGuard(rootDir, 'task', taskId, io); journal = loadJournal(file, io); assertJournalBinding(journal, taskId); const compensated = journal.transactions.at(-1); const compensatedAttempt = compensated.attempts.find((item) => item.attempt_id === compensated.current_attempt_id); const compensatedGeneration = readGeneration(rootDir, 'task', taskId, io); if (compensatedGeneration !== compensatedAttempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Compensation finalization generation is stale.'); archiveLocation(active, archive, taskId, compensated.intent.source_digest, io); compensated.phase = 'terminal_compensated'; compensated.terminal_outcome = 'compensated'; journal.journal_revision += 1; writeJournal(file, journal, io);
      return { archived: false, compensated: true, issue_id: taskId, previous_path: archive, restored_path: active, state: source.state, journal_path: file, cause_code: projectionError.code };
    }
    guard = acquireCommitGuard(rootDir, 'task', taskId, io); journal = loadJournal(file, io); assertJournalBinding(journal, taskId); const current = journal.transactions.at(-1); const finalAttempt = current.attempts.find((item) => item.attempt_id === current.current_attempt_id); const finalGeneration = readGeneration(rootDir, 'task', taskId, io); if (finalGeneration !== finalAttempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive finalization generation is stale.'); archiveLocation(active, archive, taskId, current.intent.source_digest, io); current.phase = 'terminal_archived'; current.terminal_outcome = 'archived'; journal.journal_revision += 1; writeJournal(file, journal, io);
    return { archived: true, issue_id: taskId, previous_path: active, archived_path: archive, state: source.state, journal_path: file };
  } finally { if (guard) releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); releaseLock(rootDir, 'task', taskId, admission.nonce, io); }
}

function parseArgs(args) { const parsed = { _: [] }; for (let i = 0; i < args.length; i++) { if (args[i] === '--dir') parsed.dir = args[++i]; else if (args[i].startsWith('--dir=')) parsed.dir = args[i].slice(6); else parsed._.push(args[i]); } return parsed; }
export function main() { const parsed = parseArgs(process.argv.slice(2)); if (!parsed._[0]) { console.error('Usage: node scripts/archive-work-item.mjs <issue_id> [--dir <root_dir>]'); process.exit(1); } try { console.log(JSON.stringify({ status: 'OK', action: 'archive', ...archiveWorkItem(parsed._[0], parsed.dir ? path.resolve(parsed.dir) : process.cwd()) }, null, 2)); } catch (err) { console.error(JSON.stringify({ status: 'ERROR', error_code: err.code || 'ARCHIVE_FAILED', message: err.message }, null, 2)); process.exit(1); } }
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
