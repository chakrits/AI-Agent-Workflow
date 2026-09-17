#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { digestJcs } from './lib/status-jcs.mjs';
import { digestTaskEnvelope, validateEnvelopeSchema } from './lib/task-state-machine.mjs';
import { atomicWriteFileSync, defaultStateIo, acquireLock, releaseLock, acquireCommitGuard, releaseCommitGuard, readGeneration } from './lib/fenced-commit.mjs';
import { checkProjectStatusSync, updateProjectStatusFile } from './compile-status-projection.mjs';

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
  if (!['prepared', 'archive_moved', 'compensation_requested', 'compensation_moved'].includes(tx.phase)) throw fail('ARCHIVE_ADOPTION_UNSAFE', `Cannot adopt terminal archive phase ${tx.phase}`);
  const attempt = { attempt_id, generation, adopts_attempt_id: previous.attempt_id, started_at: io.clock?.now ? io.clock.now() : Date.now() };
  tx.attempts.push(attempt); tx.current_attempt_id = attempt_id; journal.journal_revision += 1; writeJournal(file, journal, io);
  return { journal, tx, attempt, adopted: true };
}

const AUTO_ADOPTION_CELLS = new Set([
  'prepared:active', 'prepared:archive',
  'archive_moved:archive',
  'compensation_requested:archive', 'compensation_requested:active',
  'compensation_moved:active'
]);

function phaseLocationError(tx, location) {
  const code = tx.phase.startsWith('terminal_') ? 'ARCHIVE_TERMINAL_LOCATION_MISMATCH' : 'ARCHIVE_PHASE_LOCATION_MISMATCH';
  throw fail(code, `Archive phase '${tx.phase}' is inconsistent with physical location '${location}'.`);
}
function inspectPhaseLocation(tx, active, archive, taskId, io) {
  const location = archiveLocation(active, archive, taskId, tx.intent.source_digest, io);
  const allowed = {
    prepared: ['active', 'archive'],
    archive_moved: ['archive'],
    compensation_requested: ['archive', 'active'],
    compensation_moved: ['active'],
    terminal_archived: ['archive'],
    terminal_compensated: ['active']
  }[tx.phase] || [];
  if (!allowed.includes(location.location)) phaseLocationError(tx, location.location);
  return location;
}
function loadCurrentTransaction(file, taskId, io) {
  const journal = loadJournal(file, io);
  if (!journal) throw fail('ARCHIVE_JOURNAL_MISSING', `Archive journal not found: ${file}`);
  assertJournalBinding(journal, taskId);
  const tx = journal.transactions.at(-1);
  const attempt = tx.attempts.find((item) => item.attempt_id === tx.current_attempt_id);
  return { journal, tx, attempt };
}
function assertTransactionTuple(expected, current, currentJournal = null) {
  const expectedAttempt = expected.attempts.find((item) => item.attempt_id === expected.current_attempt_id);
  const currentAttempt = current.attempts.find((item) => item.attempt_id === current.current_attempt_id);
  if (!expectedAttempt || !currentAttempt ||
      current.intent.txid !== expected.intent.txid ||
      (currentJournal && currentJournal.current_txid !== expected.intent.txid) ||
      current.current_attempt_id !== expected.current_attempt_id ||
      current.phase !== expected.phase ||
      current.terminal_outcome !== expected.terminal_outcome ||
      currentAttempt.generation !== expectedAttempt.generation ||
      currentAttempt.attempt_id !== expectedAttempt.attempt_id) {
    throw fail('ARCHIVE_JOURNAL_CONFLICT', 'Archive journal tuple changed before the conditional update.');
  }
}
function advancePhase(rootDir, file, expectedJournal, expectedTx, phase, outcome, taskId, io) {
  const current = loadCurrentTransaction(file, taskId, io);
  assertTransactionTuple(expectedTx, current.tx, current.journal);
  if (current.journal.journal_revision !== expectedJournal.journal_revision) throw fail('ARCHIVE_JOURNAL_CONFLICT', 'Archive journal revision changed before the conditional update.');
  const expectedAttempt = expectedTx.attempts.find((item) => item.attempt_id === expectedTx.current_attempt_id);
  const currentGeneration = readGeneration(rootDir, 'task', taskId, io);
  if (!expectedAttempt || currentGeneration !== expectedAttempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive generation changed before the conditional journal update.');
  current.tx.phase = phase; current.tx.terminal_outcome = outcome; current.journal.journal_revision += 1; writeJournal(file, current.journal, io);
  return current;
}
function rereadState(file, taskId, expectedDigest, io) {
  let state;
  try { state = JSON.parse(io.fsOps.readFileSync(file, 'utf8')); } catch (cause) { throw fail('ARCHIVE_JOURNAL_MALFORMED', `Malformed archive shard: ${file}`, { cause }); }
  if (state.task_id !== taskId || state.state_digest !== expectedDigest || state.state_digest !== digestTaskEnvelope(state)) throw fail('TASK_IDENTITY_MISMATCH', 'Archive shard identity or digest changed before recovery.');
  validateEnvelopeSchema(state);
  return state;
}
function projectionMustMatch(rootDir) {
  const result = checkProjectStatusSync(rootDir);
  if (!result.inSync) throw fail('ARCHIVE_PROJECTION_DRIFT', `Archive projection is stale: ${result.reason}`);
}
function revalidateLocation(rootDir, taskId, active, archive, file, expectedJournal, expectedTx, expectedLocation, io) {
  const attempt = expectedTx.attempts.find((item) => item.attempt_id === expectedTx.current_attempt_id);
  const generation = readGeneration(rootDir, 'task', taskId, io);
  if (generation !== attempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive generation changed before the guarded archive action.');
  const current = loadCurrentTransaction(file, taskId, io);
  assertTransactionTuple(expectedTx, current.tx, current.journal);
  if (current.journal.journal_revision !== expectedJournal.journal_revision) throw fail('ARCHIVE_JOURNAL_CONFLICT', 'Archive journal revision changed before the guarded archive action.');
  const location = inspectPhaseLocation(current.tx, active, archive, taskId, io);
  if (location.location !== expectedLocation) phaseLocationError(current.tx, location.location);
  const stateFile = path.join(location.location === 'active' ? active : archive, 'task-state.json');
  const state = rereadState(stateFile, taskId, current.tx.intent.source_digest, io);
  return { ...current, attempt, location, state };
}
export function adoptArchiveTransaction(issueId, rootDir = process.cwd(), { io = defaultStateIo } = {}) {
  const taskId = validId(issueId); const active = path.join(rootDir, WORK_ITEMS_REL_DIR, taskId); const archive = path.join(rootDir, ARCHIVE_REL_DIR, taskId); const file = journalPath(rootDir, taskId);
  const admission = acquireLock(rootDir, 'task', taskId, io); let guard;
  try {
    guard = acquireCommitGuard(rootDir, 'task', taskId, io);
    const loaded = loadCurrentTransaction(file, taskId, io); const { journal, tx, attempt } = loaded;
    const generation = readGeneration(rootDir, 'task', taskId, io);
    const currentGeneration = readGeneration(rootDir, 'task', taskId, io);
    if (currentGeneration !== generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive adoption generation changed before the guarded journal update.');
    if (generation < attempt.generation) throw fail('FENCE_GENERATION_REGRESSION', 'Archive adoption generation regressed below the current attempt.');
    const location = inspectPhaseLocation(tx, active, archive, taskId, io);
    if (generation === attempt.generation) {
      if (tx.phase.startsWith('terminal_')) throw fail('ARCHIVE_ADOPTION_UNSAFE', `Cannot adopt terminal archive phase ${tx.phase}`);
      return { adopted: false, generation, attempt_id: attempt.attempt_id };
    }
    if (!AUTO_ADOPTION_CELLS.has(`${tx.phase}:${location.location}`)) {
      if (tx.phase.startsWith('terminal_')) throw fail('ARCHIVE_ADOPTION_UNSAFE', `Cannot adopt terminal archive phase ${tx.phase}`);
      phaseLocationError(tx, location.location);
    }
    const result = adoptAttempt(taskId, journal, generation, file, io);
    return { adopted: result.adopted, generation, attempt_id: result.attempt.attempt_id, adopts_attempt_id: attempt.attempt_id, phase: tx.phase };
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
      io.fsOps.renameSync(active, archive); return { archived: true, issue_id: taskId, previous_path: active, archived_path: archive, state: source.state };
    }
    validateEnvelopeSchema(source); const initialGeneration = readGeneration(rootDir, 'task', taskId, io); guard = acquireCommitGuard(rootDir, 'task', taskId, io);
    const generation = readGeneration(rootDir, 'task', taskId, io);
    if (generation !== initialGeneration) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive generation changed before the guarded archive action.');
    let journal = loadJournal(file, io); let tx; let attempt; let location;
    if (!journal) {
      source = rereadState(sourceFile, taskId, source.state_digest, io);
      journal = newJournal(taskId, source, generation, io); journal.journal_digest = journalDigest(journal); writeInitialJournal(file, journal, io);
      tx = journal.transactions.at(-1); attempt = tx.attempts[0]; location = { location: 'active', state: source };
    } else {
      assertJournalBinding(journal, taskId); tx = journal.transactions.at(-1); attempt = tx.attempts.find((item) => item.attempt_id === tx.current_attempt_id);
      if (generation < attempt.generation) throw fail('FENCE_GENERATION_REGRESSION', 'Archive generation regressed below the current attempt.');
      location = inspectPhaseLocation(tx, active, archive, taskId, io);
      source = location.state;
      if (tx.phase === 'terminal_archived') {
        projectionMustMatch(rootDir); return { archived: true, issue_id: taskId, archived_path: archive, state: source.state, journal_path: file };
      }
      if (tx.phase === 'terminal_compensated') {
        projectionMustMatch(rootDir);
        const fresh = newJournal(taskId, rereadState(sourceFile, taskId, source.state_digest, io), generation, io).transactions[0];
        const txids = new Set(journal.transactions.map((item) => item.intent.txid)); const attemptIds = new Set(journal.transactions.flatMap((item) => item.attempts.map((item) => item.attempt_id)));
        if (txids.has(fresh.intent.txid) || attemptIds.has(fresh.attempts[0].attempt_id)) throw fail('ARCHIVE_JOURNAL_TAMPERED', 'Fresh archive transaction reused a retained identifier.');
        journal.transactions.push(fresh); journal.current_txid = fresh.intent.txid; journal.journal_revision += 1; writeJournal(file, journal, io); tx = fresh; attempt = fresh.attempts[0]; source = rereadState(sourceFile, taskId, fresh.intent.source_digest, io); location = { location: 'active', state: source };
      } else {
        if (generation > attempt.generation) {
          if (!AUTO_ADOPTION_CELLS.has(`${tx.phase}:${location.location}`)) phaseLocationError(tx, location.location);
          const adopted = adoptAttempt(taskId, journal, generation, file, io); journal = adopted.journal; tx = adopted.tx; attempt = adopted.attempt;
          location = inspectPhaseLocation(tx, active, archive, taskId, io); source = location.state;
        }
      }
    }
    if (tx.phase === 'prepared') {
      if (location.location === 'archive') {
        const advanced = advancePhase(rootDir, file, journal, tx, 'archive_moved', null, taskId, io); journal = advanced.journal; tx = advanced.tx;
      } else {
        const checked = revalidateLocation(rootDir, taskId, active, archive, file, journal, tx, 'active', io);
        io.fsOps.mkdirSync(path.dirname(archive), { recursive: true }); io.fsOps.renameSync(active, archive); syncDirectory(path.dirname(active), io); syncDirectory(path.dirname(archive), io);
        const advanced = advancePhase(rootDir, file, checked.journal, checked.tx, 'archive_moved', null, taskId, io); journal = advanced.journal; tx = advanced.tx;
      }
    }
    if (tx.phase === 'archive_moved') {
      const checked = revalidateLocation(rootDir, taskId, active, archive, file, journal, tx, 'archive', io); source = checked.state;
      releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); guard = undefined;
      try { updateProjectStatusFile(rootDir, io); }
      catch (projectionError) {
        guard = acquireCommitGuard(rootDir, 'task', taskId, io); const current = loadCurrentTransaction(file, taskId, io); const currentLocation = inspectPhaseLocation(current.tx, active, archive, taskId, io);
        if (current.tx.phase !== 'archive_moved' || currentLocation.location !== 'archive') throw fail('ARCHIVE_JOURNAL_CONFLICT', 'Archive phase changed before compensation request.');
        const requested = advancePhase(rootDir, file, current.journal, current.tx, 'compensation_requested', null, taskId, io); journal = requested.journal; tx = requested.tx;
        const comp = revalidateLocation(rootDir, taskId, active, archive, file, journal, tx, 'archive', io);
        io.fsOps.renameSync(archive, active); syncDirectory(path.dirname(archive), io); syncDirectory(path.dirname(active), io);
        const moved = advancePhase(rootDir, file, comp.journal, comp.tx, 'compensation_moved', null, taskId, io); journal = moved.journal; tx = moved.tx;
        releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); guard = undefined;
        try { updateProjectStatusFile(rootDir, io); }
        catch { throw projectionError; }
        guard = acquireCommitGuard(rootDir, 'task', taskId, io); const final = loadCurrentTransaction(file, taskId, io); const finalLocation = inspectPhaseLocation(final.tx, active, archive, taskId, io); if (final.tx.phase !== 'compensation_moved' || finalLocation.location !== 'active') throw fail('ARCHIVE_JOURNAL_CONFLICT', 'Compensation phase changed before terminal finalization.'); final.tx.phase = 'terminal_compensated'; final.tx.terminal_outcome = 'compensated'; final.journal.journal_revision += 1; writeJournal(file, final.journal, io); return { archived: false, compensated: true, issue_id: taskId, previous_path: archive, restored_path: active, state: finalLocation.state.state, journal_path: file, cause_code: projectionError.code };
      }
      guard = acquireCommitGuard(rootDir, 'task', taskId, io); const final = loadCurrentTransaction(file, taskId, io); const finalLocation = inspectPhaseLocation(final.tx, active, archive, taskId, io); const finalGeneration = readGeneration(rootDir, 'task', taskId, io); if (final.tx.phase !== 'archive_moved' || finalLocation.location !== 'archive' || finalGeneration !== final.attempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Archive finalization generation or phase is stale.'); final.tx.phase = 'terminal_archived'; final.tx.terminal_outcome = 'archived'; final.journal.journal_revision += 1; writeJournal(file, final.journal, io); return { archived: true, issue_id: taskId, previous_path: active, archived_path: archive, state: finalLocation.state.state, journal_path: file };
    }
    if (tx.phase === 'compensation_requested' || tx.phase === 'compensation_moved') {
      if (tx.phase === 'compensation_requested' && location.location === 'archive') {
        const comp = revalidateLocation(rootDir, taskId, active, archive, file, journal, tx, 'archive', io); io.fsOps.renameSync(archive, active); syncDirectory(path.dirname(archive), io); syncDirectory(path.dirname(active), io); const moved = advancePhase(rootDir, file, comp.journal, comp.tx, 'compensation_moved', null, taskId, io); journal = moved.journal; tx = moved.tx;
      } else if (tx.phase === 'compensation_requested' && location.location === 'active') {
        const moved = advancePhase(rootDir, file, journal, tx, 'compensation_moved', null, taskId, io); journal = moved.journal; tx = moved.tx;
      } else if (location.location !== 'active') phaseLocationError(tx, location.location);
      const state = rereadState(sourceFile, taskId, tx.intent.source_digest, io);
      releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); guard = undefined;
      updateProjectStatusFile(rootDir, io);
      guard = acquireCommitGuard(rootDir, 'task', taskId, io); const final = loadCurrentTransaction(file, taskId, io); const finalLocation = inspectPhaseLocation(final.tx, active, archive, taskId, io); const finalGeneration = readGeneration(rootDir, 'task', taskId, io); if (final.tx.phase !== 'compensation_moved' || finalLocation.location !== 'active' || finalGeneration !== final.attempt.generation) throw fail('ARCHIVE_EXECUTOR_STALE', 'Compensation finalization generation or phase is stale.'); final.tx.phase = 'terminal_compensated'; final.tx.terminal_outcome = 'compensated'; final.journal.journal_revision += 1; writeJournal(file, final.journal, io); return { archived: false, compensated: true, issue_id: taskId, restored_path: active, state: state.state, journal_path: file };
    }
    throw fail('ARCHIVE_JOURNAL_CONFLICT', `Archive transaction is already in phase ${tx.phase}`);
  } finally { if (guard) releaseCommitGuard(rootDir, 'task', taskId, guard.nonce, io); releaseLock(rootDir, 'task', taskId, admission.nonce, io); }
}

function parseArgs(args) { const parsed = { _: [] }; for (let i = 0; i < args.length; i++) { if (args[i] === '--dir') parsed.dir = args[++i]; else if (args[i].startsWith('--dir=')) parsed.dir = args[i].slice(6); else parsed._.push(args[i]); } return parsed; }
export function main() { const parsed = parseArgs(process.argv.slice(2)); if (!parsed._[0]) { console.error('Usage: node scripts/archive-work-item.mjs <issue_id> [--dir <root_dir>]'); process.exit(1); } try { console.log(JSON.stringify({ status: 'OK', action: 'archive', ...archiveWorkItem(parsed._[0], parsed.dir ? path.resolve(parsed.dir) : process.cwd()) }, null, 2)); } catch (err) { console.error(JSON.stringify({ status: 'ERROR', error_code: err.code || 'ARCHIVE_FAILED', message: err.message }, null, 2)); process.exit(1); } }
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
