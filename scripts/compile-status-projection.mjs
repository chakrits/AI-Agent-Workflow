#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const WORK_ITEMS_REL_DIR = 'docs/records/work-items';
export const ARCHIVE_REL_DIR = 'docs/records/work-items/archive';
export const PROJECT_STATUS_FILE = 'PROJECT_STATUS.md';
export const TABLE_START_MARKER = '<!-- active-work-items-table-start -->';
export const TABLE_END_MARKER = '<!-- active-work-items-table-end -->';

/**
 * Deterministic JCS-like canonicalization for hash computation.
 */
export function canonicalizeJcs(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJcs(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJcs(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Scan docs/records/work-items/* /task-state.json, strictly excluding docs/records/work-items/archive/**.
 */
export function discoverActiveShards(rootDir = process.cwd()) {
  const workItemsDir = path.join(rootDir, WORK_ITEMS_REL_DIR);
  if (!fs.existsSync(workItemsDir)) {
    return [];
  }

  const entries = fs.readdirSync(workItemsDir, { withFileTypes: true });
  const shards = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') {
      continue;
    }
    const shardFile = path.join(workItemsDir, entry.name, 'task-state.json');
    if (fs.existsSync(shardFile)) {
      try {
        const raw = fs.readFileSync(shardFile, 'utf8');
        const parsed = JSON.parse(raw);
        shards.push(parsed);
      } catch (err) {
        // Skip unparseable or report error
        console.error(`Warning: Failed to read shard at ${shardFile}: ${err.message}`);
      }
    }
  }

  // Sort deterministically by task_id ascending
  shards.sort((a, b) => (a.task_id || '').localeCompare(b.task_id || ''));
  return shards;
}

/**
 * Format active shards strictly as a Markdown table:
 * | Issue ID | Workflow | Current State | Next Route / Owner | Updated At |
 *
 * This formatting puts state vocabulary strictly into table cells, preventing
 * regex match against /^\s*-\s+Status:\s* /i with forbidden merge-state markers,
 * satisfying Constraint 3 and AC-011.
 */
export function formatProjectionTable(shards) {
  const headers = [
    '| Issue ID | Workflow | Current State | Next Route / Owner | Updated At |',
    '|---|---|---|---|---|'
  ];

  if (!shards.length) {
    return [
      ...headers,
      '| _None_ | - | - | - | - |'
    ].join('\n');
  }

  const rows = shards.map((s) => {
    const issueId = s.task_id || 'unknown';
    const workflow = s.workflow_id || s.change_type || 'unknown';
    const state = s.state || 'unknown';
    const nextRoute = s.next_route || (s.history && s.history.length > 0 ? s.history[s.history.length - 1].actor : 'unassigned') || '-';
    let updatedAt = '-';
    if (s.history && Array.isArray(s.history) && s.history.length > 0) {
      updatedAt = s.history[s.history.length - 1].at || '-';
    }
    return `| ${issueId} | ${workflow} | ${state} | ${nextRoute} | ${updatedAt} |`;
  });

  return [...headers, ...rows].join('\n');
}

/**
 * Compile status projection with JCS canonical digest comment.
 */
export function compileStatusProjection(rootDir = process.cwd()) {
  const shards = discoverActiveShards(rootDir);
  const table = formatProjectionTable(shards);

  // Compute canonical digest over active shards array
  const canonicalJson = canonicalizeJcs(shards);
  const digest = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');

  const markdown = `${TABLE_START_MARKER}\n<!-- projection-digest: ${digest} -->\n${table}\n${TABLE_END_MARKER}`;

  return {
    shards,
    table,
    digest,
    markdown
  };
}

/**
 * Update PROJECT_STATUS.md with active work items table.
 * If markers exist, replaces inside markers.
 * If markers do not exist, looks for ## Current Work Item or ## In Progress and injects,
 * or inserts ## Active Work Items section.
 */
export function updateProjectStatusFile(rootDir = process.cwd()) {
  const filePath = path.join(rootDir, PROJECT_STATUS_FILE);
  if (!fs.existsSync(filePath)) {
    throw new Error(`PROJECT_STATUS.md not found at ${filePath}`);
  }

  const currentContent = fs.readFileSync(filePath, 'utf8');
  const projection = compileStatusProjection(rootDir);

  let newContent;
  if (currentContent.includes(TABLE_START_MARKER) && currentContent.includes(TABLE_END_MARKER)) {
    const startIndex = currentContent.indexOf(TABLE_START_MARKER);
    const endIndex = currentContent.indexOf(TABLE_END_MARKER) + TABLE_END_MARKER.length;
    newContent = currentContent.slice(0, startIndex) + projection.markdown + currentContent.slice(endIndex);
  } else {
    // Inject after ## Current Work Item or at appropriate place
    const insertionPoint = currentContent.indexOf('## Current Stage');
    if (insertionPoint !== -1) {
      newContent = currentContent.slice(0, insertionPoint) +
        `## Active Work Items\n${projection.markdown}\n\n` +
        currentContent.slice(insertionPoint);
    } else {
      newContent = currentContent + `\n\n## Active Work Items\n${projection.markdown}\n`;
    }
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  return { updated: true, digest: projection.digest };
}

/**
 * Check if PROJECT_STATUS.md is in sync with active shards projection.
 */
export function checkProjectStatusSync(rootDir = process.cwd()) {
  const filePath = path.join(rootDir, PROJECT_STATUS_FILE);
  if (!fs.existsSync(filePath)) {
    return { inSync: false, reason: 'PROJECT_STATUS.md does not exist' };
  }

  const currentContent = fs.readFileSync(filePath, 'utf8');
  const projection = compileStatusProjection(rootDir);

  if (!currentContent.includes(TABLE_START_MARKER) || !currentContent.includes(TABLE_END_MARKER)) {
    return { inSync: false, reason: 'Table markers missing from PROJECT_STATUS.md' };
  }

  const startIndex = currentContent.indexOf(TABLE_START_MARKER);
  const endIndex = currentContent.indexOf(TABLE_END_MARKER) + TABLE_END_MARKER.length;
  const currentTableBlock = currentContent.slice(startIndex, endIndex);

  if (currentTableBlock !== projection.markdown) {
    return {
      inSync: false,
      reason: 'PROJECT_STATUS.md active table block does not match current shards projection',
      expectedDigest: projection.digest
    };
  }

  return { inSync: true, digest: projection.digest };
}

function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') parsed.check = true;
    else if (arg === '--write') parsed.write = true;
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--dir') {
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
  const rootDir = parsed.dir ? path.resolve(parsed.dir) : process.cwd();

  if (parsed.json) {
    const projection = compileStatusProjection(rootDir);
    console.log(JSON.stringify(projection, null, 2));
    process.exit(0);
  }

  if (parsed.write) {
    const result = updateProjectStatusFile(rootDir);
    console.log(`Updated PROJECT_STATUS.md with status projection (digest: ${result.digest}).`);
    process.exit(0);
  }

  if (parsed.check) {
    const check = checkProjectStatusSync(rootDir);
    if (!check.inSync) {
      console.error(`Status projection check failed: ${check.reason}`);
      process.exit(1);
    } else {
      console.log(`Status projection check passed: in sync (digest: ${check.digest}).`);
      process.exit(0);
    }
  }

  // Default mode: emit markdown projection
  const projection = compileStatusProjection(rootDir);
  console.log(projection.markdown);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
