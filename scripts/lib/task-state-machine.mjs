import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/**
 * 11 discrete states supported by the state machine engine (SDD §3.1).
 */
export const STATES = [
  'intake',
  'investigating',
  'designing',
  'planning',
  'implementing',
  'verifying',
  'rework',
  'handoff',
  'blocked',
  'completed',
  'cancelled'
];

/**
 * Valid actors registry.
 */
export const ROLE_REGISTRY = [
  'orchestrator',
  'ba-agent',
  'sa-agent',
  'developer-agent',
  'qa-agent',
  'pm-agent',
  'config-agent',
  'documentation-agent',
  'release-agent',
  'security-agent',
  'data-agent',
  'human'
];

/**
 * 11-State Transition Matrix Specification (SDD §3.1 Table).
 */
export const TRANSITION_MATRIX = {
  intake: {
    destinations: ['investigating', 'designing', 'cancelled'],
    requires: [['requirement_discovery', 'issue_ref']],
    actors: ['orchestrator', 'ba-agent']
  },
  investigating: {
    destinations: ['designing', 'planning', 'blocked', 'cancelled'],
    requires: ['root_cause_analysis'],
    actors: ['developer-agent', 'sa-agent']
  },
  designing: {
    destinations: ['planning', 'blocked', 'cancelled'],
    requires: ['sdd_ref', 'adr_ref'],
    actors: ['sa-agent']
  },
  planning: {
    destinations: ['implementing', 'blocked', 'cancelled'],
    requires: ['implementation_plan_ref'],
    actors: ['developer-agent']
  },
  implementing: {
    destinations: ['verifying', 'blocked', 'cancelled'],
    requires: ['changed_files', 'validation_plan'],
    actors: ['developer-agent']
  },
  verifying: {
    destinations: ['handoff', 'rework', 'blocked', 'cancelled'],
    requires: ['test_evidence', 'qa_report_ref'],
    actors: ['qa-agent']
  },
  rework: {
    destinations: ['implementing', 'blocked', 'cancelled'],
    requires: ['rework_plan', 'qa_findings'],
    actors: ['developer-agent']
  },
  handoff: {
    destinations: ['completed', 'blocked', 'cancelled'],
    requires: ['terminal_handoff_receipt'],
    actors: ['orchestrator', 'release-agent']
  },
  blocked: {
    destinations: STATES, // can return to prior_state, any valid state or cancelled
    requires: ['resume_evidence', 'approver_id'],
    actors: ['human', 'orchestrator']
  }
};

/**
 * Canonicalize JSON object using RFC 8785 principles (lexicographically sorted keys, no whitespace).
 * Omits 'state_digest' from the digested object to ensure deterministic hashing.
 */
export function canonicalizeJcs(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJcs(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).filter((k) => k !== 'state_digest').sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJcs(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Compute SHA-256 state digest.
 */
export function computeStateDigest(obj) {
  const canonical = canonicalizeJcs(obj);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * POSIX Atomic File Writer.
 * Writes to .tmp-{basename}-{pid}-{timestamp}, fsyncs, then renames to target.
 * Guarantees 0.0% mid-write file corruption (AC-005, R-002).
 */
export function atomicWriteJsonSync(targetPath, data) {
  const dir = path.dirname(path.resolve(targetPath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const baseName = path.basename(targetPath);
  const tmpName = `.tmp-${baseName}-${process.pid}-${Date.now()}`;
  const tmpPath = path.join(dir, tmpName);

  const jsonContent = JSON.stringify(data, null, 2) + '\n';

  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeSync(fd, jsonContent);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.renameSync(tmpPath, targetPath);
}

/**
 * Load and parse task-state.json from disk.
 */
export function loadTaskState(filePath) {
  if (!fs.existsSync(filePath)) {
    const error = new Error(`Task state file not found: ${filePath}`);
    error.code = 'FILE_NOT_FOUND';
    error.status = 'ERROR';
    throw error;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Verify CAS expected digest and compute next state digest.
 * Aborts and throws CAS_CONFLICT if expected_digest does not match observed.
 */
export function verifyCasAndComputeDigest(stateObj, expectedDigest) {
  const currentDigest = computeStateDigest(stateObj);
  if (expectedDigest !== undefined && expectedDigest !== null && expectedDigest !== currentDigest) {
    const error = new Error('Task state was mutated concurrently. Re-read and retry.');
    error.code = 'CAS_CONFLICT';
    error.status = 'REJECTED';
    error.current_digest = currentDigest;
    error.expected_digest = expectedDigest;
    error.message = 'Task state was mutated concurrently. Re-read and retry.';
    throw error;
  }
  return currentDigest;
}

/**
 * Initialize a new task state envelope (v2 / universal envelope format).
 */
export function createTaskState({
  task_id,
  workflow_id = 'bug-fix',
  change_type = 'bug-fix',
  risk_level = 'medium',
  max_rework_attempts = 2
}) {
  if (!task_id || !/^[a-z0-9_-]+$/.test(task_id)) {
    const error = new Error(`Invalid task_id: ${task_id}. Must match ^[a-z0-9_-]+$`);
    error.code = 'INVALID_TASK_ID';
    error.status = 'ERROR';
    throw error;
  }

  const initial = {
    task_id,
    workflow_id,
    contract_version: 2,
    change_type,
    risk_level,
    state: 'intake',
    rework_count: 0,
    max_rework_attempts,
    sequence_number: 1,
    state_digest: '',
    history: [],
    evidence: {},
    next_route: null,
    stop_reason: null
  };

  initial.state_digest = computeStateDigest(initial);
  return initial;
}

/**
 * Transition task state with transition matrix enforcement, mandatory evidence validation,
 * rework budget ceiling check, and human approval gate invariant.
 */
export function transitionTaskState(currentState, {
  to,
  actor,
  evidence = {},
  expected_digest,
  stop_reason = null,
  next_route = null
}) {
  if (!currentState || typeof currentState !== 'object') {
    const error = new Error('Invalid currentState provided.');
    error.code = 'INVALID_STATE';
    throw error;
  }

  // 1. Verify CAS if expected_digest provided
  if (expected_digest !== undefined) {
    verifyCasAndComputeDigest(currentState, expected_digest);
  }

  const fromState = currentState.state;

  // 2. Validate destination state
  if (!STATES.includes(to)) {
    const error = new Error(`Unknown destination state: '${to}'. Allowed states: ${STATES.join(', ')}`);
    error.code = 'ILLEGAL_TRANSITION_REJECTED';
    error.status = 'REJECTED';
    throw error;
  }

  // 3. Human Approval Gate Preservation (BR-002, AC-006):
  // If leaving 'blocked' where stop_reason was 'human_review_required'
  if (fromState === 'blocked' && currentState.stop_reason === 'human_review_required') {
    const isHumanActor = actor === 'human' || actor === 'orchestrator';
    const hasApprover = Boolean(evidence.approver_id);
    const hasResumeEvidence = Boolean(evidence.resume_evidence);
    if (!isHumanActor || !hasApprover || !hasResumeEvidence) {
      const error = new Error('Transitions out of human approval gate require human actor, approver_id, and resume_evidence.');
      error.code = 'HUMAN_APPROVAL_REQUIRED';
      error.status = 'REJECTED';
      throw error;
    }
  }

  // 4. Validate transition matrix
  const matrixEntry = TRANSITION_MATRIX[fromState];
  if (matrixEntry) {
    // Check permitted destination
    const isPermitted = matrixEntry.destinations.includes(to);
    if (!isPermitted) {
      const error = new Error(`Illegal transition from '${fromState}' to '${to}'.`);
      error.code = 'ILLEGAL_TRANSITION_REJECTED';
      error.status = 'REJECTED';
      throw error;
    }

    // Check mandatory evidence keys (except when transitioning to blocked or cancelled, where specific evidence applies)
    if (to !== 'blocked' && to !== 'cancelled' && matrixEntry.requires) {
      for (const requirement of matrixEntry.requires) {
        if (Array.isArray(requirement)) {
          // OneOf requirements: e.g. ['requirement_discovery', 'issue_ref']
          const hasOne = requirement.some((k) => Object.hasOwn(evidence, k) && evidence[k] !== undefined && evidence[k] !== null && evidence[k] !== '');
          if (!hasOne) {
            const error = new Error(`Missing mandatory evidence from oneOf: [${requirement.join(', ')}]`);
            error.code = 'MISSING_REQUIRED_EVIDENCE';
            error.status = 'REJECTED';
            throw error;
          }
        } else {
          if (!Object.hasOwn(evidence, requirement) || evidence[requirement] === undefined || evidence[requirement] === null || evidence[requirement] === '') {
            const error = new Error(`Missing mandatory evidence: '${requirement}' for transition '${fromState}' -> '${to}'`);
            error.code = 'MISSING_REQUIRED_EVIDENCE';
            error.status = 'REJECTED';
            throw error;
          }
        }
      }
    }
  }

  // 5. Rework Retry Ceiling: enforce at most max_rework_attempts (default 2)
  let reworkCount = currentState.rework_count;
  const maxRework = currentState.max_rework_attempts ?? 2;

  if (to === 'rework') {
    if (reworkCount >= maxRework) {
      const error = new Error(`Rework retry ceiling exceeded (${reworkCount} >= ${maxRework}). Human review required.`);
      error.code = 'MAX_REWORK_EXCEEDED';
      error.status = 'REJECTED';
      throw error;
    }
    reworkCount += 1;
  }

  // 6. Human Gate Invariant: If entering blocked with human review, ensure stop_reason
  let finalStopReason = stop_reason;
  if (to === 'blocked' && !finalStopReason) {
    finalStopReason = 'human_review_required';
  } else if (to !== 'blocked') {
    finalStopReason = null;
  }

  // 7. Update merged evidence
  const mergedEvidence = {
    ...currentState.evidence,
    ...evidence
  };

  // 8. Construct history event
  const evidenceRefs = Object.keys(evidence);
  const historyEvent = {
    from: fromState,
    to,
    at: new Date().toISOString(),
    actor: actor || 'orchestrator',
    evidence_refs: evidenceRefs
  };

  const nextSequence = currentState.sequence_number + 1;

  const nextState = {
    ...currentState,
    state: to,
    sequence_number: nextSequence,
    rework_count: reworkCount,
    history: [...currentState.history, historyEvent],
    evidence: mergedEvidence,
    next_route: next_route ?? currentState.next_route,
    stop_reason: finalStopReason
  };

  nextState.state_digest = computeStateDigest(nextState);
  return nextState;
}

/**
 * Inspect a task state object, returning summary statistics and verification details.
 */
export function inspectTaskState(taskState) {
  const currentDigest = computeStateDigest(taskState);
  const isDigestValid = taskState.state_digest === currentDigest;
  return {
    task_id: taskState.task_id,
    workflow_id: taskState.workflow_id,
    state: taskState.state,
    sequence_number: taskState.sequence_number,
    rework_count: taskState.rework_count,
    max_rework_attempts: taskState.max_rework_attempts,
    stop_reason: taskState.stop_reason,
    next_route: taskState.next_route,
    history_events: taskState.history.length,
    state_digest: taskState.state_digest,
    computed_digest: currentDigest,
    digest_verified: isDigestValid
  };
}
