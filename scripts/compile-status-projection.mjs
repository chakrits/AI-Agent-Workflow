#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { digestTaskEnvelope, validateEnvelopeSchema } from './lib/task-state-machine.mjs';
import { atomicWriteFileSync, defaultStateIo, acquireLock, releaseLock, acquireCommitGuard, releaseCommitGuard, readGeneration, initializeGeneration } from './lib/fenced-commit.mjs';
import { canonicalizeJcs } from './lib/status-jcs.mjs';

export const WORK_ITEMS_REL_DIR = 'docs/records/work-items';
export const ARCHIVE_REL_DIR = 'docs/records/work-items/archive';
export const PROJECT_STATUS_FILE = 'PROJECT_STATUS.md';
export const TABLE_START_MARKER = '<!-- active-work-items-table-start -->';
export const TABLE_END_MARKER = '<!-- active-work-items-table-end -->';

function shardIsV2(shard) { return shard?.contract_version === 2 || Object.hasOwn(shard || {}, 'policy_contract_version'); }

export function discoverActiveShards(rootDir = process.cwd()) {
  const workItemsDir = path.join(rootDir, WORK_ITEMS_REL_DIR);
  if (!fs.existsSync(workItemsDir)) return [];
  const shards = [];
  for (const entry of fs.readdirSync(workItemsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'archive' || entry.name.startsWith('.')) continue;
    const shardFile = path.join(workItemsDir, entry.name, 'task-state.json');
    if (!fs.existsSync(shardFile)) continue;
    try {
      const shard = JSON.parse(fs.readFileSync(shardFile, 'utf8'));
      if (shardIsV2(shard)) validateEnvelopeSchema(shard);
      shards.push(shard);
    } catch (err) {
      const wrapped = new Error(`Failed to read shard at ${shardFile}: ${err.message}`);
      wrapped.code = err.code === 'DIGEST_INTEGRITY_MISMATCH' ? err.code : 'MALFORMED_SHARD';
      throw wrapped;
    }
  }
  shards.sort((a, b) => (a.task_id || '').localeCompare(b.task_id || ''));
  return shards;
}

export function formatProjectionTable(shards) {
  const headers = ['| Issue ID | Workflow | Current State | Next Route / Owner | Updated At |', '|---|---|---|---|---|'];
  if (!shards.length) return [...headers, '| _None_ | - | - | - | - |'].join('\n');
  return [...headers, ...shards.map((s) => {
    const updated = Array.isArray(s.history) && s.history.length ? s.history.at(-1).at || '-' : '-';
    const route = s.next_route || (Array.isArray(s.history) && s.history.length ? s.history.at(-1).actor : 'unassigned') || '-';
    return `| ${s.task_id || 'unknown'} | ${s.workflow_id || s.change_type || 'unknown'} | ${s.state || 'unknown'} | ${route} | ${updated} |`;
  })].join('\n');
}

export function compileStatusProjection(rootDir = process.cwd()) {
  const shards = discoverActiveShards(rootDir);
  const digest = createHash('sha256').update(canonicalizeJcs(shards), 'utf8').digest('hex');
  const table = formatProjectionTable(shards);
  return { shards, table, digest, markdown: `${TABLE_START_MARKER}\n<!-- projection-digest: ${digest} -->\n${table}\n${TABLE_END_MARKER}` };
}

export function detectArchivedShardDrift(rootDir = process.cwd()) {
  const workItemsDir = path.join(rootDir, WORK_ITEMS_REL_DIR);
  const archiveDir = path.join(rootDir, ARCHIVE_REL_DIR);
  const content = fs.existsSync(path.join(rootDir, PROJECT_STATUS_FILE)) ? fs.readFileSync(path.join(rootDir, PROJECT_STATUS_FILE), 'utf8') : '';
  const findings = [];
  if (fs.existsSync(archiveDir)) for (const entry of fs.readdirSync(archiveDir, { withFileTypes: true })) if (entry.isDirectory() && !entry.name.startsWith('.')) {
    if (content.includes(`| ${entry.name} |`)) findings.push({ type: 'archived_still_projected', task_id: entry.name });
  }
  if (fs.existsSync(workItemsDir)) for (const entry of fs.readdirSync(workItemsDir, { withFileTypes: true })) if (entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.')) {
    const file = path.join(workItemsDir, entry.name, 'task-state.json');
    if (fs.existsSync(file)) { try { const shard = JSON.parse(fs.readFileSync(file, 'utf8')); if (['completed', 'cancelled'].includes(shard.state)) findings.push({ type: 'terminal_still_active', task_id: entry.name }); } catch {} }
  }
  return { drifted: findings.length > 0, findings };
}

export function updateProjectStatusFile(rootDir = process.cwd(), io = defaultStateIo) {
  const filePath = path.join(rootDir, PROJECT_STATUS_FILE);
  if (!fs.existsSync(filePath)) throw new Error(`PROJECT_STATUS.md not found at ${filePath}`);
  initializeGeneration(rootDir, 'projection', undefined, io);
  const admission = acquireLock(rootDir, 'projection', undefined, io);
  let guard;
  try {
    const projection = compileStatusProjection(rootDir);
    readGeneration(rootDir, 'projection', undefined, io);
    guard = acquireCommitGuard(rootDir, 'projection', undefined, io);
    const current = fs.readFileSync(filePath, 'utf8');
    let block;
    if (current.includes(TABLE_START_MARKER) && current.includes(TABLE_END_MARKER)) {
      block = current.slice(0, current.indexOf(TABLE_START_MARKER)) + projection.markdown + current.slice(current.indexOf(TABLE_END_MARKER) + TABLE_END_MARKER.length);
    } else {
      const insertionPoint = current.indexOf('## Current Stage');
      block = insertionPoint !== -1
        ? current.slice(0, insertionPoint) + `## Active Work Items\n${projection.markdown}\n\n` + current.slice(insertionPoint)
        : current + `\n\n## Active Work Items\n${projection.markdown}\n`;
    }
    atomicWriteFileSync(filePath, block, io);
    return { updated: true, digest: projection.digest };
  } finally {
    if (guard) releaseCommitGuard(rootDir, 'projection', undefined, guard.nonce, io);
    releaseLock(rootDir, 'projection', undefined, admission.nonce, io);
  }
}

export function checkProjectStatusSync(rootDir = process.cwd()) {
  const filePath = path.join(rootDir, PROJECT_STATUS_FILE);
  if (!fs.existsSync(filePath)) return { inSync: false, reason: 'PROJECT_STATUS.md does not exist' };
  const current = fs.readFileSync(filePath, 'utf8');
  const projection = compileStatusProjection(rootDir);
  if (!current.includes(TABLE_START_MARKER) || !current.includes(TABLE_END_MARKER)) return { inSync: false, reason: 'Table markers missing from PROJECT_STATUS.md', recovery: 'npm run compile:status-projection -- --reconcile' };
  const start = current.indexOf(TABLE_START_MARKER); const end = current.indexOf(TABLE_END_MARKER) + TABLE_END_MARKER.length;
  return current.slice(start, end) === projection.markdown ? { inSync: true, digest: projection.digest } : { inSync: false, reason: 'PROJECT_STATUS.md active table block does not match current shards projection', expectedDigest: projection.digest, recovery: 'npm run compile:status-projection -- --reconcile' };
}

export function reconcileArchivedShards(rootDir = process.cwd(), io = defaultStateIo) { const drift = detectArchivedShardDrift(rootDir); return { ...drift, projection: updateProjectStatusFile(rootDir, io) }; }

function parseArgs(args) { const parsed = { _: [] }; for (let i = 0; i < args.length; i++) { const arg = args[i]; if (arg === '--check') parsed.check = true; else if (arg === '--write') parsed.write = true; else if (arg === '--json') parsed.json = true; else if (arg === '--reconcile') parsed.reconcile = true; else if (arg === '--dir') parsed.dir = args[++i]; else if (arg.startsWith('--dir=')) parsed.dir = arg.slice(6); else parsed._.push(arg); } return parsed; }
export function main() { const parsed = parseArgs(process.argv.slice(2)); const rootDir = parsed.dir ? path.resolve(parsed.dir) : process.cwd(); if (parsed.json) return console.log(JSON.stringify(compileStatusProjection(rootDir), null, 2)); if (parsed.reconcile) return console.log(JSON.stringify(reconcileArchivedShards(rootDir), null, 2)); if (parsed.write) return console.log(`Updated PROJECT_STATUS.md with status projection (digest: ${updateProjectStatusFile(rootDir).digest}).`); if (parsed.check) { const result = checkProjectStatusSync(rootDir); if (!result.inSync) { console.error(`Status projection check failed: ${result.reason}`); process.exitCode = 1; } else console.log(`Status projection check passed: in sync (digest: ${result.digest}).`); return; } console.log(compileStatusProjection(rootDir).markdown); }
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
