#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const WORK_ITEMS_REL_DIR = 'docs/records/work-items';
export const ARCHIVE_REL_DIR = 'docs/records/work-items/archive';
export const TERMINAL_STATES = ['completed', 'cancelled'];

/**
 * Archive a work item shard:
 * Moves docs/records/work-items/{issue_id} to docs/records/work-items/archive/{issue_id}.
 * Refuses archival if state is not terminal ('completed' or 'cancelled').
 */
export function archiveWorkItem(issueId, rootDir = process.cwd()) {
  if (!issueId || typeof issueId !== 'string') {
    throw new Error('Valid issue_id argument is required.');
  }

  // Prevent directory traversal
  if (issueId.includes('..') || issueId.includes('/') || issueId.includes('\\')) {
    const error = new Error(`Invalid issue_id '${issueId}': path traversal not permitted.`);
    error.code = 'INVALID_ISSUE_ID';
    throw error;
  }

  const workItemsDir = path.join(rootDir, WORK_ITEMS_REL_DIR);
  const archiveDir = path.join(rootDir, ARCHIVE_REL_DIR);
  const shardDir = path.join(workItemsDir, issueId);
  const shardFile = path.join(shardDir, 'task-state.json');

  if (!fs.existsSync(shardFile)) {
    const error = new Error(`Task state shard not found at ${shardFile}`);
    error.code = 'SHARD_NOT_FOUND';
    throw error;
  }

  let stateObj;
  try {
    const raw = fs.readFileSync(shardFile, 'utf8');
    stateObj = JSON.parse(raw);
  } catch (err) {
    const error = new Error(`Malformed JSON in shard file ${shardFile}: ${err.message}`);
    error.code = 'MALFORMED_SHARD';
    throw error;
  }

  const currentState = stateObj.state;
  if (!TERMINAL_STATES.includes(currentState)) {
    const error = new Error(
      `Cannot archive work item '${issueId}': state '${currentState}' is not terminal. Only terminal states (${TERMINAL_STATES.join(', ')}) can be archived.`
    );
    error.code = 'NON_TERMINAL_STATE';
    throw error;
  }

  // Ensure archive directory exists
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const targetShardDir = path.join(archiveDir, issueId);
  if (fs.existsSync(targetShardDir)) {
    const error = new Error(`Target archive directory already exists at ${targetShardDir}`);
    error.code = 'ARCHIVE_COLLISION';
    throw error;
  }

  // Move entire work item shard directory to archive
  fs.renameSync(shardDir, targetShardDir);

  return {
    archived: true,
    issue_id: issueId,
    previous_path: shardDir,
    archived_path: targetShardDir,
    state: currentState
  };
}

function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dir') {
      parsed.dir = args[++i];
    } else if (arg.startsWith('--dir=')) {
      parsed.dir = arg.slice(6);
    } else {
      parsed._.push(arg);
    }
  }
  return parsed;
}

export function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const issueId = parsed._[0];

  if (!issueId) {
    console.error('Usage: node scripts/archive-work-item.mjs <issue_id> [--dir <root_dir>]');
    process.exit(1);
  }

  const rootDir = parsed.dir ? path.resolve(parsed.dir) : process.cwd();

  try {
    const result = archiveWorkItem(issueId, rootDir);
    console.log(JSON.stringify({ status: 'OK', action: 'archive', ...result }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({
      status: 'ERROR',
      error_code: err.code || 'ARCHIVE_FAILED',
      message: err.message
    }, null, 2));
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
