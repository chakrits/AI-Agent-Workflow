#!/usr/bin/env node

import path from 'node:path';
import {
  createTaskState,
  loadTaskState,
  inspectTaskState,
  atomicWriteJsonSync,
  mutateTaskStateOnDisk,
  unlockTask
} from './lib/task-state-machine.mjs';
import { initializeGeneration } from './lib/fenced-commit.mjs';

function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    } else {
      parsed._.push(arg);
    }
  }
  return parsed;
}

function printUsage() {
  console.log(`
Usage: node scripts/task-machine-cli.mjs <command> [options]

Commands:
  init          Initialize a new task state envelope
  transition    Execute a verified state transition
  resume        Resume a task out of blocked state
  inspect       Inspect and verify task state and CAS digest
  unlock        Recover an admission lock after operator-established quiescence

Options:
  --file <path>             Path to task-state.json file
  --task-id <id>            Unique work item identifier
  --workflow-id <id>        Workflow type (bug-fix, new-feature, etc.)
  --change-type <type>      Change type
  --risk-level <level>      Risk level (low, medium, high, critical)
  --to <state>              Destination state
  --actor <actor>           Actor performing the transition
  --evidence <json|string>  Evidence payload (JSON string or scalar)
  --expected-digest <hash>  Expected current state digest for CAS check
  --stop-reason <reason>    Stop reason when transitioning to blocked
  --approver-id <id>        Human approver ID (required for resume)
  --next-route <route>      Next routing target agent
  --quiesced                Assert all writers are stopped before recovery
  --nonce <uuid>            Expected admission-lock nonce
  --malformed               Recover a malformed admission lock (offline procedure)
`);
}

function workItemContext(filePath) {
  const marker = `${path.sep}docs${path.sep}records${path.sep}work-items${path.sep}`;
  const index = filePath.indexOf(marker);
  if (index < 0) return null;
  const rootDir = filePath.slice(0, index);
  const remainder = filePath.slice(index + marker.length).split(path.sep);
  if (remainder.length !== 2 || remainder[1] !== 'task-state.json') return null;
  return { rootDir, taskId: remainder[0] };
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const parsed = parseArgs(args.slice(1));

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  const filePath = parsed.file ? path.resolve(parsed.file) : null;

  try {
    switch (command) {
      case 'init': {
        if (!filePath) {
          throw new Error('--file is required for init');
        }
        const taskId = parsed['task-id'] || parsed.taskId;
        const workflowId = parsed['workflow-id'] || parsed.workflowId || 'bug-fix';
        const changeType = parsed['change-type'] || parsed.changeType || 'bug-fix';
        const riskLevel = parsed['risk-level'] || parsed.riskLevel || 'medium';

        const task = createTaskState({
          task_id: taskId,
          workflow_id: workflowId,
          change_type: changeType,
          risk_level: riskLevel
        });

        const context = workItemContext(filePath);
        if (context) initializeGeneration(context.rootDir, 'task', context.taskId);
        atomicWriteJsonSync(filePath, task);
        console.log(JSON.stringify({ status: 'OK', action: 'init', file: filePath, state_digest: task.state_digest }, null, 2));
        break;
      }

      case 'transition': {
        if (!filePath) {
          throw new Error('--file is required for transition');
        }
        const toState = parsed.to;
        if (!toState) {
          throw new Error('--to destination state is required');
        }
        const actor = parsed.actor || 'orchestrator';
        const expectedDigest = parsed['expected-digest'] || parsed.expectedDigest;
        const stopReason = parsed['stop-reason'] || parsed.stopReason;
        const nextRoute = parsed['next-route'] || parsed.nextRoute;

        let evidence = {};
        if (parsed.evidence) {
          try {
            evidence = JSON.parse(parsed.evidence);
          } catch {
            evidence = { raw_evidence: parsed.evidence };
          }
        }

        const context = workItemContext(filePath);
        if (!context) throw Object.assign(new Error('--file must be docs/records/work-items/{task_id}/task-state.json; use the guarded work-item path.'), { code: 'UNSUPPORTED_MUTATION_PATH' });
        const updated = mutateTaskStateOnDisk(context.rootDir, context.taskId, { to: toState, actor, evidence, expected_digest: expectedDigest, stop_reason: stopReason, next_route: nextRoute });
        console.log(JSON.stringify({
          status: 'OK',
          action: 'transition',
          state: updated.state,
          sequence_number: updated.sequence_number,
          state_digest: updated.state_digest
        }, null, 2));
        break;
      }

      case 'resume': {
        if (!filePath) {
          throw new Error('--file is required for resume');
        }
        const toState = parsed.to;
        if (!toState) {
          throw new Error('--to destination state is required');
        }
        const actor = parsed.actor || 'human';
        const approverId = parsed['approver-id'] || parsed.approverId;
        if (!approverId) {
          throw new Error('--approver-id is required for resume');
        }

        let resumeEvidence = parsed.evidence;
        if (!resumeEvidence) {
          resumeEvidence = 'human_approved';
        }

        const evidencePayload = {
          resume_evidence: resumeEvidence,
          approver_id: approverId
        };

        const context = workItemContext(filePath);
        if (!context) throw Object.assign(new Error('--file must be docs/records/work-items/{task_id}/task-state.json; use the guarded work-item path.'), { code: 'UNSUPPORTED_MUTATION_PATH' });
        const updated = mutateTaskStateOnDisk(context.rootDir, context.taskId, { to: toState, actor, evidence: evidencePayload, expected_digest: parsed['expected-digest'] || parsed.expectedDigest, mode: 'resume' });
        console.log(JSON.stringify({
          status: 'OK',
          action: 'resume',
          state: updated.state,
          sequence_number: updated.sequence_number,
          state_digest: updated.state_digest
        }, null, 2));
        break;
      }

      case 'unlock': {
        const taskId = parsed['task-id'] || parsed.taskId;
        const projection = Boolean(parsed.projection);
        if (!projection && !taskId) throw new Error('--task-id is required for task unlock');
        const result = unlockTask(process.cwd(), taskId, { nonce: parsed.nonce, projection, malformed: Boolean(parsed.malformed), quiesced: Boolean(parsed.quiesced) });
        console.log(JSON.stringify({ status: 'OK', action: 'unlock', ...result }, null, 2));
        break;
      }

      case 'inspect': {
        if (!filePath) {
          throw new Error('--file is required for inspect');
        }
        const current = loadTaskState(filePath);
        const inspected = inspectTaskState(current);
        console.log(JSON.stringify(inspected, null, 2));
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(JSON.stringify({
      status: 'ERROR',
      error_code: err.code || 'COMMAND_FAILED',
      message: err.message,
      ...(err.current_digest ? { current_digest: err.current_digest } : {}),
      ...(err.expected_digest ? { expected_digest: err.expected_digest } : {})
    }, null, 2));
    process.exit(1);
  }
}

main();
