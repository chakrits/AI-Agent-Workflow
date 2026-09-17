import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX64 = /^[a-f0-9]{64}$/;

const nodeFsOps = {
  existsSync: fs.existsSync.bind(fs), mkdirSync: fs.mkdirSync.bind(fs), openSync: fs.openSync.bind(fs),
  writeSync: fs.writeSync.bind(fs), fsyncSync: fs.fsyncSync.bind(fs), closeSync: fs.closeSync.bind(fs),
  renameSync: fs.renameSync.bind(fs), unlinkSync: fs.unlinkSync.bind(fs), readFileSync: fs.readFileSync.bind(fs),
  readdirSync: fs.readdirSync.bind(fs), statSync: fs.statSync.bind(fs)
};
const nodeProcessOps = { kill: process.kill.bind(process), pid: process.pid };

export function createStateIo({ fsOps = nodeFsOps, processOps = nodeProcessOps, clock = Date, random = Math.random, uuid = randomUUID } = {}) {
  return { fsOps, processOps, clock, random, uuid };
}

export const defaultStateIo = createStateIo();

function failure(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = 'REJECTED';
  Object.assign(error, extra);
  return error;
}

function safeId(id, field = 'task_id') {
  if (typeof id !== 'string' || !/^[a-z0-9_-]+$/.test(id) || id === 'archive') {
    throw failure(id === 'archive' ? 'RESERVED_TASK_ID' : 'INVALID_TASK_ID', `Invalid ${field}: ${id}`);
  }
  return id;
}

export function atomicWriteFileSync(targetPath, content, io = defaultStateIo) {
  const ops = io.fsOps;
  const resolved = path.resolve(targetPath);
  const dir = path.dirname(resolved);
  if (!ops.existsSync(dir)) ops.mkdirSync(dir, { recursive: true });
  const base = path.basename(resolved);
  const stamp = io.clock.now ? io.clock.now() : Date.now();
  const tmpPath = path.join(dir, `.tmp-${base}-${io.processOps.pid ?? process.pid}-${stamp}-${Math.floor(io.random() * 1e9).toString(36)}`);
  const buffer = Buffer.from(content, 'utf8');
  let fd;
  try {
    fd = ops.openSync(tmpPath, 'wx', 0o600);
    let offset = 0;
    while (offset < buffer.length) {
      const written = ops.writeSync(fd, buffer, offset, buffer.length - offset);
      if (!Number.isInteger(written) || written <= 0) throw failure('ATOMIC_WRITE_NO_PROGRESS', `Zero-progress write to ${tmpPath}`);
      offset += written;
    }
    ops.fsyncSync(fd);
  } catch (error) {
    if (fd !== undefined) { try { ops.closeSync(fd); } catch {} }
    try { ops.unlinkSync(tmpPath); } catch {}
    throw error;
  } finally {
    if (fd !== undefined) { try { ops.closeSync(fd); } catch {} }
  }
  try {
    ops.renameSync(tmpPath, resolved);
  } catch (error) {
    try { ops.unlinkSync(tmpPath); } catch {}
    throw error;
  }
  let dirFd;
  try { dirFd = ops.openSync(dir, 'r'); ops.fsyncSync(dirFd); } finally { if (dirFd !== undefined) { try { ops.closeSync(dirFd); } catch {} } }
}

export function readJsonStrict(filePath, io = defaultStateIo) {
  try { return JSON.parse(io.fsOps.readFileSync(filePath, 'utf8')); } catch (error) {
    throw failure('FENCE_STATE_MALFORMED', `Malformed JSON: ${filePath}`, { cause: error });
  }
}

function validateGeneration(value, filePath) {
  if (!value || value.schema_version !== 1 || !Number.isSafeInteger(value.generation) || value.generation < 1) {
    throw failure('FENCE_STATE_MALFORMED', `Malformed fence state: ${filePath}`);
  }
  return value.generation;
}

export function generationPath(rootDir, scope, id) {
  const safeScope = scope === 'projection' ? 'projection' : 'tasks';
  return path.join(rootDir, 'docs/records/work-items/.fencing', safeScope, scope === 'projection' ? 'projection.json' : `${safeId(id)}.json`);
}
export function commitGuardPath(rootDir, scope, id) {
  const safeScope = scope === 'projection' ? 'projection' : 'tasks';
  return path.join(rootDir, 'docs/records/work-items/.commit-guards', safeScope, scope === 'projection' ? 'projection.guard' : `${safeId(id)}.guard`);
}

export function readGeneration(rootDir, scope, id, io = defaultStateIo) {
  const filePath = generationPath(rootDir, scope, id);
  if (!io.fsOps.existsSync(filePath)) throw failure('FENCE_STATE_MISSING', `Fence state missing: ${filePath}`);
  return validateGeneration(readJsonStrict(filePath, io), filePath);
}

export function initializeGeneration(rootDir, scope, id, io = defaultStateIo, { allowExisting = false } = {}) {
  const filePath = generationPath(rootDir, scope, id);
  if (io.fsOps.existsSync(filePath)) return readGeneration(rootDir, scope, id, io);
  if (scope !== 'projection') {
    const active = path.join(rootDir, 'docs/records/work-items', safeId(id));
    const archived = path.join(rootDir, 'docs/records/work-items/archive', safeId(id));
    if (!allowExisting && (io.fsOps.existsSync(active) || io.fsOps.existsSync(archived))) throw failure('FENCE_STATE_MISSING', `Cannot initialize existing scope without migration: ${id}`);
  }
  const guard = acquireCommitGuard(rootDir, scope, id, io);
  try {
    if (io.fsOps.existsSync(filePath)) return readGeneration(rootDir, scope, id, io);
    atomicWriteFileSync(filePath, JSON.stringify({ schema_version: 1, generation: 1 }) + '\n', io);
    return 1;
  } finally { releaseCommitGuard(rootDir, scope, id, guard.nonce, io); }
}

export function incrementGeneration(rootDir, scope, id, io = defaultStateIo) {
  const current = readGeneration(rootDir, scope, id, io);
  if (current >= Number.MAX_SAFE_INTEGER) throw failure('FENCE_GENERATION_EXHAUSTED', `Fence generation exhausted for ${scope}:${id}`);
  const next = current + 1;
  atomicWriteFileSync(generationPath(rootDir, scope, id), JSON.stringify({ schema_version: 1, generation: next }) + '\n', io);
  return next;
}

function lockPath(rootDir, scope, id) {
  return scope === 'projection'
    ? path.join(rootDir, 'docs/records/work-items/.projection.lock')
    : path.join(rootDir, 'docs/records/work-items/.locks', `${safeId(id)}.lock`);
}

function parseLock(raw, filePath) {
  let record;
  try { record = JSON.parse(raw); } catch (error) { throw failure('LOCK_MALFORMED', `Malformed lock ${filePath}; use --malformed --quiesced`, { cause: error }); }
  if (!record || Object.keys(record).some((key) => !['pid', 'nonce', 'created_at'].includes(key)) ||
      !Number.isInteger(record.pid) || record.pid <= 0 || !UUID_V4.test(record.nonce) ||
      !Number.isSafeInteger(record.created_at) || record.created_at < 0) {
    throw failure('LOCK_MALFORMED', `Malformed lock ${filePath}; use --malformed --quiesced`);
  }
  return record;
}

function pidIsLive(pid, io) {
  try { io.processOps.kill(pid, 0); return true; } catch (error) { if (error?.code === 'ESRCH') return false; return true; }
}

export function acquireLock(rootDir, scope = 'task', id, io = defaultStateIo, { timeoutMs = 5000 } = {}) {
  const filePath = lockPath(rootDir, scope, id);
  io.fsOps.mkdirSync(path.dirname(filePath), { recursive: true });
  const started = io.clock.now ? io.clock.now() : Date.now();
  for (;;) {
    const nonce = io.uuid();
    let fd;
    try {
      fd = io.fsOps.openSync(filePath, 'wx', 0o600);
      const record = { pid: io.processOps.pid ?? process.pid, nonce, created_at: io.clock.now ? io.clock.now() : Date.now() };
      const raw = JSON.stringify(record) + '\n';
      const buffer = Buffer.from(raw);
      let offset = 0;
      while (offset < buffer.length) {
        const written = io.fsOps.writeSync(fd, buffer, offset, buffer.length - offset);
        if (!Number.isInteger(written) || written <= 0) throw failure('ATOMIC_WRITE_NO_PROGRESS', `Zero-progress lock write to ${filePath}`);
        offset += written;
      }
      io.fsOps.fsyncSync(fd); io.fsOps.closeSync(fd);
      return { nonce, path: filePath };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        if (fd !== undefined) { try { io.fsOps.closeSync(fd); } catch {} }
        try { io.fsOps.unlinkSync(filePath); } catch {}
        throw error;
      }
      const observed = parseLock(io.fsOps.readFileSync(filePath, 'utf8'), filePath);
      const now = io.clock.now ? io.clock.now() : Date.now();
      const age = Math.max(0, now - observed.created_at);
      if (!pidIsLive(observed.pid, io)) throw failure('LOCK_ABANDONED', `Lock abandoned; run node scripts/task-machine-cli.mjs unlock --task ${id} --nonce ${observed.nonce} --quiesced`, { holder: observed, lock_path: filePath });
      if (age > 30_000) throw failure('LOCK_ACQUISITION_TIMEOUT', `LOCK_HELD_LONG; holder pid=${observed.pid} nonce=${observed.nonce}; run node scripts/task-machine-cli.mjs unlock --task ${id} --nonce ${observed.nonce} --quiesced`, { advisory_code: 'LOCK_HELD_LONG', holder: observed, age_ms: age, lock_path: filePath });
      if ((now - started) >= timeoutMs) throw failure('LOCK_ACQUISITION_TIMEOUT', `Lock acquisition timed out: ${filePath}`, { holder: observed, age_ms: age, lock_path: filePath });
    }
  }
}

export function releaseLock(rootDir, scope, id, nonce, io = defaultStateIo) {
  const filePath = lockPath(rootDir, scope, id);
  if (!io.fsOps.existsSync(filePath)) return;
  const observed = parseLock(io.fsOps.readFileSync(filePath, 'utf8'), filePath);
  if (observed.nonce === nonce) io.fsOps.unlinkSync(filePath);
}

export function acquireCommitGuard(rootDir, scope, id, io = defaultStateIo) {
  const filePath = commitGuardPath(rootDir, scope, id);
  io.fsOps.mkdirSync(path.dirname(filePath), { recursive: true });
  const nonce = io.uuid();
  let fd;
  try {
    fd = io.fsOps.openSync(filePath, 'wx', 0o600);
    const raw = JSON.stringify({ schema_version: 1, pid: io.processOps.pid ?? process.pid, nonce, created_at: io.clock.now ? io.clock.now() : Date.now() }) + '\n';
    const bytes = Buffer.from(raw); let offset = 0;
    while (offset < bytes.length) {
      const written = io.fsOps.writeSync(fd, bytes, offset, bytes.length - offset);
      if (!Number.isInteger(written) || written <= 0) throw failure('ATOMIC_WRITE_NO_PROGRESS', `Zero-progress commit guard write to ${filePath}`);
      offset += written;
    }
    io.fsOps.fsyncSync(fd); io.fsOps.closeSync(fd);
    return { nonce, path: filePath };
  } catch (error) {
    if (fd !== undefined) { try { io.fsOps.closeSync(fd); } catch {} }
    if (error?.code === 'EEXIST') throw failure('COMMIT_GUARD_ABANDONED', `Commit guard exists and cannot be reclaimed online: ${filePath}`);
    throw error;
  }
}

export function releaseCommitGuard(rootDir, scope, id, nonce, io = defaultStateIo) {
  const filePath = commitGuardPath(rootDir, scope, id);
  if (!io.fsOps.existsSync(filePath)) return;
  let observed;
  try { observed = JSON.parse(io.fsOps.readFileSync(filePath, 'utf8')); } catch { return; }
  if (observed?.nonce === nonce) io.fsOps.unlinkSync(filePath);
}

export function lockFilePath(rootDir, scope, id) { return lockPath(rootDir, scope, id); }

export { UUID_V4 };
