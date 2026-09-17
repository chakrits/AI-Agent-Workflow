import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { canonicalizeJcs as canonicalizeStatusJcs } from './status-jcs.mjs';
import {
  atomicWriteFileSync, createStateIo, defaultStateIo, acquireLock, releaseLock,
  acquireCommitGuard, releaseCommitGuard, readGeneration, incrementGeneration,
  lockFilePath
} from './fenced-commit.mjs';

export const STATES = ['intake', 'investigating', 'designing', 'planning', 'implementing', 'verifying', 'rework', 'handoff', 'blocked', 'completed', 'cancelled'];
export const ROLE_REGISTRY = ['orchestrator', 'ba-agent', 'sa-agent', 'developer-agent', 'qa-agent', 'pm-agent', 'config-agent', 'documentation-agent', 'release-agent', 'security-agent', 'data-agent', 'human'];
export const TRANSITION_MATRIX = {
  intake: { destinations: ['investigating', 'designing', 'cancelled'], requires: [['requirement_discovery', 'issue_ref']], actors: ['orchestrator', 'ba-agent'] },
  investigating: { destinations: ['implementing', 'designing', 'planning', 'blocked', 'cancelled'], requires: ['root_cause_analysis'], actors: ['developer-agent', 'sa-agent'] },
  designing: { destinations: ['planning', 'blocked', 'cancelled'], requires: ['sdd_ref', 'adr_ref'], actors: ['sa-agent'] },
  planning: { destinations: ['implementing', 'blocked', 'cancelled'], requires: ['implementation_plan_ref'], actors: ['developer-agent'] },
  implementing: { destinations: ['verifying', 'blocked', 'cancelled'], requires: ['changed_files', 'validation_plan'], actors: ['developer-agent'] },
  verifying: { destinations: ['handoff', 'rework', 'blocked', 'cancelled'], requires: ['test_evidence', 'qa_report_ref'], actors: ['qa-agent'] },
  rework: { destinations: ['implementing', 'blocked', 'cancelled'], requires: ['rework_plan', 'qa_findings'], actors: ['developer-agent'] },
  handoff: { destinations: ['completed', 'blocked', 'cancelled'], requires: ['terminal_handoff_receipt'], actors: ['orchestrator', 'release-agent'] },
  blocked: { destinations: STATES.filter((state) => state !== 'blocked'), requires: ['resume_evidence', 'approver_id'], actors: ['human', 'orchestrator'] },
  completed: { destinations: [], requires: [], actors: [] },
  cancelled: { destinations: [], requires: [], actors: [] }
};

export function canonicalizeJcs(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalizeJcs).join(',')}]`;
  return `{${Object.keys(obj).filter((key) => key !== 'state_digest').sort().map((key) => `${JSON.stringify(key)}:${canonicalizeJcs(obj[key])}`).join(',')}}`;
}
export function computeStateDigest(obj) { return createHash('sha256').update(canonicalizeJcs(obj), 'utf8').digest('hex'); }
export function digestTaskEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw Object.assign(new Error('Invalid envelope object for digestion'), { code: 'INVALID_ENVELOPE' });
  const normalized = { ...envelope };
  delete normalized.state_digest;
  return computeStateDigest(normalized);
}
function error(code, message, extra = {}) { return Object.assign(new Error(message), { code, status: 'REJECTED', ...extra }); }
function schemaPath() { return fileURLToPath(new URL('../../docs/contracts/schemas/durable-task-envelope.schema.json', import.meta.url)); }
export function validateEnvelopeSchema(data) {
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(JSON.parse(fs.readFileSync(schemaPath(), 'utf8')));
  if (!validate(data)) throw error('MALFORMED_SHARD', `Invalid durable task envelope: ${validate.errors?.map((e) => e.message).join(', ')}`);
  const recomputed = digestTaskEnvelope(data);
  if (data.state_digest !== recomputed) throw error('DIGEST_INTEGRITY_MISMATCH', 'Envelope digest does not match its content', { stored_digest: data.state_digest, recomputed_digest: recomputed });
  return data;
}
export function atomicWriteJsonSync(targetPath, data, io = defaultStateIo) { return atomicWriteFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, io); }
export function loadTaskState(filePath, { validate = false, io = defaultStateIo } = {}) {
  if (!io.fsOps.existsSync(filePath)) throw Object.assign(new Error(`Task state file not found: ${filePath}`), { code: 'FILE_NOT_FOUND', status: 'ERROR' });
  const state = JSON.parse(io.fsOps.readFileSync(filePath, 'utf8'));
  return validate ? validateEnvelopeSchema(state) : state;
}
export function verifyCasAndComputeDigest(stateObj, expectedDigest) {
  const currentDigest = computeStateDigest(stateObj);
  if (expectedDigest !== undefined && expectedDigest !== null && expectedDigest !== currentDigest) throw error('CAS_CONFLICT', 'Task state was mutated concurrently. Re-read and retry.', { current_digest: currentDigest, expected_digest: expectedDigest });
  return currentDigest;
}
export function createTaskState({ task_id, workflow_id = 'bug-fix', change_type = 'bug-fix', risk_level = 'medium', max_rework_attempts = 2 }) {
  if (!task_id || !/^[a-z0-9_-]+$/.test(task_id) || task_id === 'archive') throw error(task_id === 'archive' ? 'RESERVED_TASK_ID' : 'INVALID_TASK_ID', `Invalid task_id: ${task_id}`);
  const initial = { task_id, workflow_id, contract_version: 2, policy_contract_version: 1, change_type, risk_level, state: 'intake', rework_count: 0, max_rework_attempts, sequence_number: 1, state_digest: '', history: [], evidence: {}, next_route: null, stop_reason: null };
  initial.state_digest = digestTaskEnvelope(initial);
  return initial;
}
function meaningful(value) { return value !== undefined && value !== null && value !== '' && value !== false && (!Array.isArray(value) || value.length > 0); }
function validateEvidence(requirements, evidence) {
  for (const requirement of requirements || []) {
    if (Array.isArray(requirement)) { if (!requirement.some((key) => meaningful(evidence[key]))) throw error('MISSING_REQUIRED_EVIDENCE', `Missing mandatory evidence from oneOf: [${requirement.join(', ')}]`); }
    else if (!meaningful(evidence[requirement])) throw error('MISSING_REQUIRED_EVIDENCE', `Missing mandatory evidence: '${requirement}'`);
  }
}
function makeTransition(currentState, { to, actor, evidence = {}, expected_digest, stop_reason = null, next_route = null, resume = false, clock = Date }) {
  if (!currentState || typeof currentState !== 'object') throw error('INVALID_STATE', 'Invalid currentState provided.');
  if (expected_digest !== undefined) verifyCasAndComputeDigest(currentState, expected_digest);
  const fromState = currentState.state;
  if (!STATES.includes(to)) throw error('ILLEGAL_TRANSITION_REJECTED', `Unknown destination state: '${to}'.`);
  const matrixEntry = TRANSITION_MATRIX[fromState];
  if (!matrixEntry) throw error('UNKNOWN_SOURCE_STATE', `No transition rule defined for source state '${fromState}'.`);
  if (!matrixEntry.destinations.includes(to)) throw error('ILLEGAL_TRANSITION_REJECTED', `Illegal transition from '${fromState}' to '${to}'.`);
  if (fromState === 'blocked' && currentState.stop_reason === 'human_review_required' &&
      (!matrixEntry.actors.includes(actor) || !meaningful(evidence.resume_evidence) || !meaningful(evidence.approver_id))) {
    throw error('HUMAN_APPROVAL_REQUIRED', 'Transitions out of human approval gate require human actor, approver_id, and resume_evidence.');
  }
  if (!matrixEntry.actors.includes(actor)) throw error('UNAUTHORIZED_ACTOR', `Actor '${actor}' is not authorized from '${fromState}'.`);
  if (resume) {
    if (fromState !== 'blocked') throw error('RESUME_OPERATION_REQUIRED', 'Resume operation requires blocked state.');
    const lastBlocked = [...(currentState.history || [])].reverse().find((event) => event.to === 'blocked');
    if (!lastBlocked || lastBlocked.from !== to) throw error('INVALID_RESUME_TARGET', `Resume target must be '${lastBlocked?.from ?? 'unknown'}'.`);
    validateEvidence(['resume_evidence', 'approver_id'], evidence);
  } else {
    if (fromState === 'blocked') {
      if (currentState.stop_reason === 'human_review_required' && (!matrixEntry.actors.includes(actor) || !meaningful(evidence.resume_evidence) || !meaningful(evidence.approver_id))) {
        throw error('HUMAN_APPROVAL_REQUIRED', 'Transitions out of human approval gate require human actor, approver_id, and resume_evidence.');
      }
      // Keep the historical pure-function API compatible for approved human
      // resumes. Disk-bound callers still select mode=resume and enforce the
      // policy operation explicitly before entering this pure helper.
      if (!meaningful(evidence.resume_evidence) || !meaningful(evidence.approver_id)) throw error('RESUME_OPERATION_REQUIRED', 'Blocked recovery must use the resume operation.');
    }
    // The pure helper preserves the historical blocked-state construction
    // seam; disk-bound mutations apply the policy row before calling it.
    if (to !== 'blocked' && to !== 'cancelled') validateEvidence(matrixEntry.requires, evidence);
  }
  let reworkCount = currentState.rework_count ?? 0;
  if (to === 'rework') {
    if (reworkCount >= (currentState.max_rework_attempts ?? 2)) throw error('MAX_REWORK_EXCEEDED', `Rework retry ceiling exceeded (${reworkCount} >= ${currentState.max_rework_attempts ?? 2}). Human review required.`);
    reworkCount += 1;
  }
  const next = { ...currentState, state: to, sequence_number: (currentState.sequence_number ?? 1) + 1, rework_count: reworkCount, history: [...(currentState.history || []), { from: fromState, to, at: new Date(clock.now ? clock.now() : Date.now()).toISOString(), actor: actor || 'orchestrator', evidence_refs: Object.keys(evidence) }], evidence: { ...(currentState.evidence || {}), ...evidence }, next_route: next_route ?? currentState.next_route ?? null, stop_reason: to === 'blocked' ? (stop_reason || 'human_review_required') : null };
  next.state_digest = digestTaskEnvelope(next);
  return next;
}
export function transitionTaskState(currentState, options) { return makeTransition(currentState, options); }
export function resumeTaskState(currentState, options) { return makeTransition(currentState, { ...options, resume: true }); }
function policyFor(workflowId, io = defaultStateIo) {
  if (workflowId !== 'bug-fix') throw error('UNKNOWN_WORKFLOW', `Unsupported durable workflow: ${workflowId}`);
  return YAML.parse(io.fsOps.readFileSync(fileURLToPath(new URL('../../docs/contracts/bug-fix-workflow.yaml', import.meta.url)), 'utf8'));
}
function policyTransition(policy, from, to, resume = false) { return (resume ? (policy.resume || []) : (policy.transitions || [])).find((row) => row.from === from && (row.to === to || row.destinations?.includes(to))); }
function validatePolicyTransition(current, to, evidence, resume, io = defaultStateIo) {
  const row = policyTransition(policyFor(current.workflow_id, io), current.state, to, resume);
  if (!row) throw error(resume ? 'INVALID_RESUME_TARGET' : 'ILLEGAL_TRANSITION_REJECTED', `Policy does not permit ${current.state} -> ${to}`);
  validateEvidence(row.requires, evidence);
}
function activeShardPath(rootDir, taskId) { if (!taskId || !/^[a-z0-9_-]+$/.test(taskId) || taskId === 'archive') throw error(taskId === 'archive' ? 'RESERVED_TASK_ID' : 'INVALID_TASK_ID', `Invalid expectedTaskId: ${taskId}`); return path.join(rootDir, 'docs/records/work-items', taskId, 'task-state.json'); }
export function mutateTaskStateOnDisk(rootDir, expectedTaskId, { to, actor = 'orchestrator', expected_digest, evidence = {}, mode = 'transition', io = defaultStateIo, stop_reason = null, next_route = null } = {}) {
  const shardPath = activeShardPath(rootDir, expectedTaskId);
  if (!expected_digest || typeof expected_digest !== 'string') throw error('MISSING_EXPECTED_DIGEST', 'A non-empty expected_digest is required.');
  const admission = acquireLock(rootDir, 'task', expectedTaskId, io);
  let guard;
  try {
    const current = JSON.parse(io.fsOps.readFileSync(shardPath, 'utf8'));
    if (current.task_id !== expectedTaskId || path.basename(path.dirname(shardPath)) !== expectedTaskId) throw error('TASK_IDENTITY_MISMATCH', 'Task identity does not match the operation identifier.');
    validateEnvelopeSchema(current);
    if (current.workflow_id !== 'bug-fix' || current.change_type !== 'bug-fix') throw error('UNKNOWN_WORKFLOW', 'Durable mutation supports bug-fix only.');
    verifyCasAndComputeDigest(current, expected_digest);
    validatePolicyTransition(current, to, evidence, mode === 'resume', io);
    const candidate = mode === 'resume' ? resumeTaskState(current, { to, actor, evidence, stop_reason, next_route, clock: io.clock }) : transitionTaskState(current, { to, actor, expected_digest, evidence, stop_reason, next_route, clock: io.clock });
    const generation = readGeneration(rootDir, 'task', expectedTaskId, io);
    guard = acquireCommitGuard(rootDir, 'task', expectedTaskId, io);
    const fresh = JSON.parse(io.fsOps.readFileSync(shardPath, 'utf8'));
    const currentGeneration = readGeneration(rootDir, 'task', expectedTaskId, io);
    validateEnvelopeSchema(fresh);
    if (currentGeneration !== generation) throw error('FENCING_TOKEN_STALE', 'Writer generation is stale; reread and recompute.', { scope: expectedTaskId, observed_generation: generation, current_generation: currentGeneration, retryable: true, recompute_required: true });
    if (fresh.task_id !== expectedTaskId) throw error('TASK_IDENTITY_MISMATCH', 'Task identity changed under commit guard.');
    verifyCasAndComputeDigest(fresh, expected_digest);
    atomicWriteJsonSync(shardPath, candidate, io);
    return candidate;
  } finally {
    if (guard) releaseCommitGuard(rootDir, 'task', expectedTaskId, guard.nonce, io);
    releaseLock(rootDir, 'task', expectedTaskId, admission.nonce, io);
  }
}
export function inspectTaskState(taskState) { const currentDigest = digestTaskEnvelope(taskState); return { task_id: taskState.task_id, workflow_id: taskState.workflow_id, state: taskState.state, sequence_number: taskState.sequence_number, rework_count: taskState.rework_count, max_rework_attempts: taskState.max_rework_attempts, stop_reason: taskState.stop_reason, next_route: taskState.next_route, history_events: taskState.history.length, state_digest: taskState.state_digest, computed_digest: currentDigest, digest_verified: taskState.state_digest === currentDigest }; }
export function unlockTask(rootDir, taskId, { nonce, projection = false, malformed = false, quiesced = false, io = defaultStateIo } = {}) {
  if (!quiesced) throw error('QUIESCENCE_REQUIRED', 'Explicit --quiesced is required for unlock.');
  const scope = projection ? 'projection' : 'task'; const target = lockFilePath(rootDir, scope, taskId);
  if (!io.fsOps.existsSync(target)) throw error('LOCK_NOT_FOUND', `Lock not found: ${target}`);
  let observed; try { observed = JSON.parse(io.fsOps.readFileSync(target, 'utf8')); } catch { if (!malformed) throw error('LOCK_MALFORMED', `Malformed lock ${target}; use --malformed --quiesced`); }
  if (!malformed && (!observed || observed.nonce !== nonce)) throw error('LOCK_NONCE_MISMATCH', 'Observed lock nonce does not match.');
  const guard = acquireCommitGuard(rootDir, scope, taskId, io);
  try { const generation = incrementGeneration(rootDir, scope, taskId, io); io.fsOps.unlinkSync(target); return { unlocked: true, generation }; } finally { releaseCommitGuard(rootDir, scope, taskId, guard.nonce, io); }
}
export { createStateIo, defaultStateIo, acquireLock as acquireShardLock, releaseLock as releaseShardLock, acquireCommitGuard, releaseCommitGuard, readGeneration, incrementGeneration, atomicWriteFileSync };
