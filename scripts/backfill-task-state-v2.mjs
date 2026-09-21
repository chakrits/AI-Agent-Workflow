#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { digestTaskEnvelope, validateEnvelopeSchema } from './lib/task-state-machine.mjs';
import { atomicWriteFileSync, initializeGeneration, readGeneration } from './lib/fenced-commit.mjs';

function fail(code, message) { return Object.assign(new Error(message), { code }); }
function stateFile(target) { const resolved = path.resolve(target); return path.basename(resolved) === 'task-state.json' ? resolved : path.join(resolved, 'task-state.json'); }
function backupFile(file) { return `${file}.v1-backup`; }

export function backfillTaskStateV2(target, { rollback = false } = {}) {
  const file = stateFile(target);
  if (rollback) {
    const backup = backupFile(file);
    if (!fs.existsSync(backup)) throw fail('BACKUP_NOT_FOUND', `Migration backup not found: ${backup}`);
    fs.copyFileSync(backup, file);
    return { rolled_back: true, file };
  }
  if (!fs.existsSync(file)) throw fail('SHARD_NOT_FOUND', `Task state shard not found: ${file}`);
  const before = fs.readFileSync(file, 'utf8');
  let state; try { state = JSON.parse(before); } catch (cause) { throw fail('MALFORMED_SHARD', `Malformed task-state.json: ${cause.message}`); }
  if (state.workflow_id !== 'bug-fix' || state.change_type !== 'bug-fix') throw fail('UNSUPPORTED_WORKFLOW', 'Package 1 backfill supports bug-fix shards only.');
  const workItemsMarker = `${path.sep}docs${path.sep}records${path.sep}work-items${path.sep}`;
  const markerIndex = file.indexOf(workItemsMarker);
  const migrationScope = markerIndex >= 0 ? { rootDir: file.slice(0, markerIndex), taskId: file.slice(markerIndex + workItemsMarker.length).split(path.sep)[0] } : null;
  if (state.contract_version === 2 && state.policy_contract_version === 1) {
    // A v2 shard is already activated. Missing or malformed fencing state is
    // an integrity failure; generation 1 is reserved for the explicit v1
    // migration path below and must never be recreated here.
    if (migrationScope) readGeneration(migrationScope.rootDir, 'task', migrationScope.taskId);
    validateEnvelopeSchema(state);
    return { changed: false, file, sequence_number: state.sequence_number, state_digest: state.state_digest };
  }
  if (state.contract_version !== 1) throw fail('UNSUPPORTED_CONTRACT_VERSION', `Expected v1 source envelope, got ${state.contract_version}`);
  if (migrationScope) initializeGeneration(migrationScope.rootDir, 'task', migrationScope.taskId, undefined, { allowExisting: true });
  if (!fs.existsSync(backupFile(file))) fs.writeFileSync(backupFile(file), before, { encoding: 'utf8', flag: 'wx' });
  const migrated = { ...state, contract_version: 2, policy_contract_version: 1, sequence_number: (state.history?.length || 0) + 1, state_digest: '' };
  migrated.state_digest = digestTaskEnvelope(migrated);
  atomicWriteFileSync(file, `${JSON.stringify(migrated, null, 2)}\n`);
  validateEnvelopeSchema(migrated);
  return { changed: true, file, sequence_number: migrated.sequence_number, state_digest: migrated.state_digest };
}

export function main() {
  const args = process.argv.slice(2); const rollback = args.includes('--rollback'); const target = args.find((arg) => !arg.startsWith('--'));
  if (!target) { console.error('Usage: node scripts/backfill-task-state-v2.mjs <shard-dir> [--rollback]'); process.exit(1); }
  try { console.log(JSON.stringify(backfillTaskStateV2(target, { rollback }), null, 2)); } catch (err) { console.error(JSON.stringify({ status: 'ERROR', error_code: err.code || 'BACKFILL_FAILED', message: err.message }, null, 2)); process.exit(1); }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
