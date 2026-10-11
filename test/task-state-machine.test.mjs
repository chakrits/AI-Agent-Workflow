import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';
import {
  STATES,
  ROLE_REGISTRY,
  TRANSITION_MATRIX,
  deriveTransitionTable,
  atomicWriteJsonSync,
  canonicalizeJcs,
  computeStateDigest,
  verifyCasAndComputeDigest,
  createTaskState,
  transitionTaskState as rawTransitionTaskState,
  resumeTaskState,
  loadTaskState,
  inspectTaskState,
  mutateTaskStateOnDisk
} from '../scripts/lib/task-state-machine.mjs';
import { commitGuardPath, initializeGeneration, lockFilePath } from '../scripts/lib/fenced-commit.mjs';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'state-machine-test-'));
}

// The pure test helper supplies the explicit CAS precondition required by the
// production transition API while keeping each test focused on its matrix case.
function transitionTaskState(current, options = {}) {
  return rawTransitionTaskState(current, {
    ...options,
    expected_digest: options.expected_digest ?? computeStateDigest(current)
  });
}

test('TC-019: POSIX atomic write crash-resilience', () => {
  const tmpDir = createTempDir();
  const targetFile = path.join(tmpDir, 'task-state.json');

  // Initial valid write
  const initialData = { task_id: 'test-crash', state: 'intake', count: 1 };
  atomicWriteJsonSync(targetFile, initialData);
  assert.equal(fs.existsSync(targetFile), true);
  const readBack = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  assert.deepEqual(readBack, initialData);

  // Simulate interruption before rename:
  // Write a temp file and verify that targetFile remains uncorrupted
  const pid = process.pid;
  const fakeTmp = path.join(tmpDir, `.tmp-task-state.json-${pid}-123456789`);
  fs.writeFileSync(fakeTmp, '{"half_written": true'); // corrupted JSON in tmp file

  // targetFile is still intact
  const targetContent = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  assert.deepEqual(targetContent, initialData);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('TC-020: CAS concurrency conflict detection (digest mismatch throws CAS_CONFLICT)', () => {
  const tmpDir = createTempDir();
  const targetFile = path.join(tmpDir, 'task-state.json');

  const task = createTaskState({
    task_id: 'issue-cas',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'medium'
  });
  atomicWriteJsonSync(targetFile, task);

  const diskTask = loadTaskState(targetFile);
  const currentDigest = diskTask.state_digest;
  assert.ok(currentDigest);

  // Mutate file externally or supply wrong expected digest
  assert.throws(
    () => {
      verifyCasAndComputeDigest(diskTask, 'wrong_digest_00000000000000000000000000000000000000000000000000000000');
    },
    (err) => {
      assert.equal(err.code, 'CAS_CONFLICT');
      assert.equal(err.status, 'REJECTED');
      assert.equal(err.current_digest, currentDigest);
      assert.equal(err.expected_digest, 'wrong_digest_00000000000000000000000000000000000000000000000000000000');
      return true;
    }
  );

  // Verify successful CAS with correct digest
  const nextDigest = verifyCasAndComputeDigest(diskTask, currentDigest);
  assert.ok(nextDigest);
  assert.equal(typeof nextDigest, 'string');
  assert.equal(nextDigest.length, 64);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('TC-021: 11-State transition matrix validation', () => {
  const tmpDir = createTempDir();
  const targetFile = path.join(tmpDir, 'task-state.json');

  let task = createTaskState({
    task_id: 'issue-matrix',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'low'
  });
  atomicWriteJsonSync(targetFile, task);

  // 1. Illegal transition: intake -> verifying (direct jump not allowed)
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'verifying',
        actor: 'developer-agent',
        evidence: { test_evidence: 'ok' }
      });
    },
    (err) => {
      assert.equal(err.code, 'ILLEGAL_TRANSITION_REJECTED');
      return true;
    }
  );

  // 2. Legal transition: intake -> investigating
  task = transitionTaskState(task, {
    to: 'investigating',
    actor: 'orchestrator',
    evidence: { failure_description: 'fd-1', repro: 'issuecomment-1' }
  });
  assert.equal(task.state, 'investigating');
  assert.equal(task.sequence_number, 2);
  assert.equal(task.history.length, 1);
  assert.equal(task.history[0].from, 'intake');
  assert.equal(task.history[0].to, 'investigating');

  // 3. Legal transition: investigating -> implementing
  task = transitionTaskState(task, {
    to: 'implementing',
    actor: 'sa-agent',
    evidence: { fail_path: 'issuecomment-2', hypothesis_matrix: 'issuecomment-3' }
  });
  assert.equal(task.state, 'implementing');
  assert.equal(task.sequence_number, 3);

  // 4. Legal transition: implementing -> verifying
  task = transitionTaskState(task, {
    to: 'verifying',
    actor: 'developer-agent',
    evidence: { changed_files: ['file.mjs'], validation_plan: 'plan-test' }
  });
  assert.equal(task.state, 'verifying');

  // 5. Legal transition: verifying -> handoff
  task = transitionTaskState(task, {
    to: 'handoff',
    actor: 'qa-agent',
    evidence: { original_repro_result: 'pass', verification_result: 'qa-1' }
  });
  assert.equal(task.state, 'handoff');

  // 6. Legal transition: handoff -> completed
  task = transitionTaskState(task, {
    to: 'completed',
    actor: 'orchestrator',
    evidence: { closeout_evidence: 'receipt-1' }
  });
  assert.equal(task.state, 'completed');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('TC-022: Mandatory evidence keys enforcement', () => {
  let task = createTaskState({
    task_id: 'issue-evidence',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'low'
  });

  // intake -> investigating requires failure_description and repro
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'investigating',
        actor: 'orchestrator',
        evidence: { wrong_evidence: '123' }
      });
    },
    (err) => {
      assert.equal(err.code, 'MISSING_REQUIRED_EVIDENCE');
      return true;
    }
  );

  // With both policy keys, it succeeds
  task = transitionTaskState(task, {
    to: 'investigating',
    actor: 'orchestrator',
    evidence: { failure_description: 'fd', repro: 'https://example.invalid/r' }
  });
  assert.equal(task.state, 'investigating');

  // investigating -> implementing requires fail_path and hypothesis_matrix
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'implementing',
        actor: 'sa-agent',
        evidence: {}
      });
    },
    (err) => {
      assert.equal(err.code, 'MISSING_REQUIRED_EVIDENCE');
      return true;
    }
  );
});

test('TC-023: Human approval gate invariant (state: blocked, stop_reason: human_review_required)', () => {
  let task = createTaskState({
    task_id: 'issue-human-gate',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'high'
  });

  // Advance to investigating
  task = transitionTaskState(task, {
    to: 'investigating',
    actor: 'orchestrator',
    evidence: { failure_description: 'fd', repro: 'issuecomment-1' }
  });

  // Transition to blocked with human review required
  task = transitionTaskState(task, {
    to: 'blocked',
    actor: 'sa-agent',
    stop_reason: 'human_review_required',
    evidence: { stop_reason: 'human_review_required' }
  });
  assert.equal(task.state, 'blocked');
  assert.equal(task.stop_reason, 'human_review_required');

  // Autonomous resumption attempt by developer-agent without human evidence must fail
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'investigating',
        actor: 'developer-agent',
        evidence: { resume_evidence: 'auto-resume' } // missing approver_id and actor not human
      });
    },
    (err) => {
      assert.equal(err.code, 'HUMAN_APPROVAL_REQUIRED');
      return true;
    }
  );

  // Resume with human actor and approver_id and resume_evidence succeeds back to prior_state (or target state)
  task = transitionTaskState(task, {
    to: 'investigating',
    actor: 'human',
    evidence: { resume_evidence: 'approved-by-maintainer', approver_id: 'lead-maintainer' }
  });
  assert.equal(task.state, 'investigating');
  assert.equal(task.stop_reason, null);
});

test('TC-024: Rework retry budget enforcement (fails closed at >2 cycles)', () => {
  let task = createTaskState({
    task_id: 'issue-rework',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'medium'
  });

  // Advance to verifying
  task = transitionTaskState(task, { to: 'investigating', actor: 'orchestrator', evidence: { failure_description: 'fd', repro: 'issuecomment-1' } });
  task = transitionTaskState(task, { to: 'implementing', actor: 'developer-agent', evidence: { fail_path: 'issuecomment-2', hypothesis_matrix: 'issuecomment-3' } });
  task = transitionTaskState(task, { to: 'verifying', actor: 'developer-agent', evidence: { changed_files: ['a.js'], validation_plan: 'val' } });

  assert.equal(task.rework_count, 0);

  // Cycle 1: verifying -> rework
  task = transitionTaskState(task, {
    to: 'rework',
    actor: 'qa-agent',
    evidence: { verification_failed: 'fail-1', rework_route: 'developer-agent' }
  });
  assert.equal(task.state, 'rework');
  assert.equal(task.rework_count, 1);

  // rework -> implementing -> verifying
  task = transitionTaskState(task, { to: 'implementing', actor: 'developer-agent', evidence: { rework_route: 'developer-agent' } });
  task = transitionTaskState(task, { to: 'verifying', actor: 'developer-agent', evidence: { changed_files: ['a.js'], validation_plan: 'val-2' } });

  // Cycle 2: verifying -> rework
  task = transitionTaskState(task, {
    to: 'rework',
    actor: 'qa-agent',
    evidence: { verification_failed: 'fail-2', rework_route: 'developer-agent' }
  });
  assert.equal(task.state, 'rework');
  assert.equal(task.rework_count, 2);

  // rework -> implementing -> verifying
  task = transitionTaskState(task, { to: 'implementing', actor: 'developer-agent', evidence: { rework_route: 'developer-agent' } });
  task = transitionTaskState(task, { to: 'verifying', actor: 'developer-agent', evidence: { changed_files: ['a.js'], validation_plan: 'val-3' } });

  // Attempt 3rd rework: rework_count is already 2 (max_rework_attempts = 2)
  // Engine must reject normal rework and route to blocked with stop_reason: "human_review_required" / "max_rework_exceeded"
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'rework',
        actor: 'qa-agent',
        evidence: { verification_failed: 'fail-3', rework_route: 'developer-agent' }
      });
    },
    (err) => {
      assert.equal(err.code, 'MAX_REWORK_EXCEEDED');
      return true;
    }
  );

  // Fails closed by transitioning to blocked
  task = transitionTaskState(task, {
    to: 'blocked',
    actor: 'qa-agent',
    stop_reason: 'human_review_required',
    evidence: { verification_failed: 'fail-3', human_review_required: true }
  });
  assert.equal(task.state, 'blocked');
  assert.equal(task.stop_reason, 'human_review_required');
});

test('TC-024b: derived transition table equals YAML destinations and actors', () => {
  const policy = YAML.parse(fs.readFileSync('docs/contracts/bug-fix-workflow.yaml', 'utf8'));
  const derived = deriveTransitionTable(policy);
  assert.deepEqual(derived, TRANSITION_MATRIX);
  const expected = {};
  for (const row of [...policy.transitions, ...policy.resume]) {
    expected[row.from] ??= { destinations: new Set(), actors: new Set() };
    for (const destination of row.to ? [row.to] : row.destinations) expected[row.from].destinations.add(destination);
    for (const actor of row.actors) expected[row.from].actors.add(actor);
  }
  for (const [from, entry] of Object.entries(expected)) {
    assert.deepEqual([...derived[from].destinations].sort(), [...entry.destinations].sort(), `destinations for ${from}`);
    assert.deepEqual([...derived[from].actors].sort(), [...entry.actors].sort(), `actors for ${from}`);
  }
  for (const state of STATES.filter((name) => !expected[name])) {
    assert.deepEqual(derived[state], { destinations: [], actors: [] }, `${state} has no policy row`);
  }
});

test('I297-F3: pure resumeTaskState rejects missing resume_evidence or approver_id for a non-human-review block', () => {
  let task = createTaskState({ task_id: 'issue-f3-resume', workflow_id: 'bug-fix', change_type: 'bug-fix', risk_level: 'low' });
  task = transitionTaskState(task, { to: 'investigating', actor: 'orchestrator', evidence: { failure_description: 'fd', repro: 'rp' } });
  task = transitionTaskState(task, { to: 'blocked', actor: 'sa-agent', stop_reason: 'awaiting_input', evidence: { stop_reason: 'awaiting_input' } });
  assert.equal(task.state, 'blocked');
  assert.notEqual(task.stop_reason, 'human_review_required');
  const resume = (evidence) => resumeTaskState(task, { to: 'investigating', actor: 'orchestrator', expected_digest: computeStateDigest(task), evidence });
  for (const evidence of [{ approver_id: 'human-1' }, { resume_evidence: 'ok' }, {}]) {
    assert.throws(() => resume(evidence), (error) => error.code === 'MISSING_REQUIRED_EVIDENCE');
  }
  assert.equal(resume({ resume_evidence: 'ok', approver_id: 'human-1' }).state, 'investigating');
});

test('I297-TC-003: pure and disk-bound transitions share YAML evidence', () => {
  const { root, task } = createDurableTaskRoot('shared-evidence');
  try {
    const accepted = { failure_description: 'fd', repro: 'issuecomment-1' };
    const pure = rawTransitionTaskState(task, { to: 'investigating', actor: 'ba-agent', expected_digest: task.state_digest, evidence: accepted });
    assert.equal(pure.state, 'investigating');
    assert.throws(
      () => rawTransitionTaskState(task, { to: 'investigating', actor: 'ba-agent', expected_digest: task.state_digest, evidence: { requirement_discovery: 'req' } }),
      (error) => error.code === 'MISSING_REQUIRED_EVIDENCE'
    );
    assert.throws(
      () => mutateTaskStateOnDisk(root, task.task_id, { to: 'investigating', actor: 'ba-agent', expected_digest: task.state_digest, evidence: { requirement_discovery: 'req' } }),
      (error) => error.code === 'MISSING_REQUIRED_EVIDENCE'
    );
    const disk = mutateTaskStateOnDisk(root, task.task_id, { to: 'investigating', actor: 'ba-agent', expected_digest: task.state_digest, evidence: accepted });
    assert.equal(disk.state, pure.state);
    assert.deepEqual(disk.history.at(-1).evidence_refs, pure.history.at(-1).evidence_refs);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('I297-TC-003: matrix-only edges are removed from the pure API', () => {
  const task = createTaskState({ task_id: 'issue-no-matrix-edges' });
  assert.throws(
    () => transitionTaskState(task, { to: 'designing', actor: 'orchestrator', evidence: { requirement_discovery: 'req' } }),
    (error) => error.code === 'ILLEGAL_TRANSITION_REJECTED'
  );
  assert.throws(
    () => transitionTaskState(task, { to: 'cancelled', actor: 'orchestrator', evidence: {} }),
    (error) => error.code === 'ILLEGAL_TRANSITION_REJECTED'
  );
});

test('I297-TC-003: workflow policy pins contract_version 1 and declares actors on every row', () => {
  const policy = YAML.parse(fs.readFileSync('docs/contracts/bug-fix-workflow.yaml', 'utf8'));
  assert.equal(policy.contract_version, 1);
  assert.equal(createTaskState({ task_id: 'pin-version' }).policy_contract_version, 1);
  for (const row of [...policy.transitions, ...policy.resume]) {
    assert.ok(Array.isArray(row.actors) && row.actors.length > 0, `row ${row.from} needs actors`);
  }
});

test('I297-TC-003: invalid policy fails closed with POLICY_UNAVAILABLE', () => {
  for (const bad of [undefined, null, 'x', {}, { transitions: [] }, { transitions: [{ from: 'intake', to: 'investigating', requires: [] }], resume: [] }]) {
    assert.throws(() => deriveTransitionTable(bad), (error) => error.code === 'POLICY_UNAVAILABLE');
  }
});

test('I297-S1-F1: every policy row must declare a requires array', () => {
  const policy = YAML.parse(fs.readFileSync('docs/contracts/bug-fix-workflow.yaml', 'utf8'));
  for (const bad of [undefined, null, 'repro', {}]) {
    const transitions = policy.transitions.map((row, index) => (index === 0 ? { ...row, requires: bad } : row));
    assert.throws(() => deriveTransitionTable({ ...policy, transitions }), (error) => error.code === 'POLICY_UNAVAILABLE');
  }
  const noRequires = policy.transitions.map((row, index) => { if (index !== 0) return row; const { requires, ...rest } = row; return rest; });
  assert.throws(() => deriveTransitionTable({ ...policy, transitions: noRequires }), (error) => error.code === 'POLICY_UNAVAILABLE');
  const resume = policy.resume.map((row) => { const { requires, ...rest } = row; return rest; });
  assert.throws(() => deriveTransitionTable({ ...policy, resume }), (error) => error.code === 'POLICY_UNAVAILABLE');
});

test('I297-S1-F2: a policy row with empty actors fails closed with POLICY_UNAVAILABLE', () => {
  const policy = YAML.parse(fs.readFileSync('docs/contracts/bug-fix-workflow.yaml', 'utf8'));
  const transitions = policy.transitions.map((row, index) => (index === 0 ? { ...row, actors: [] } : row));
  assert.throws(() => deriveTransitionTable({ ...policy, transitions }), (error) => error.code === 'POLICY_UNAVAILABLE');
});

test('I297-S1-F4: exact YAML edge set is pinned and removed matrix-only edges are rejected', () => {
  const expected = {
    intake: ['investigating'], investigating: ['implementing', 'blocked'], implementing: ['verifying'],
    verifying: ['handoff', 'rework', 'blocked'], rework: ['implementing'], handoff: ['completed'],
    blocked: ['investigating', 'verifying'], completed: [], cancelled: [], designing: [], planning: []
  };
  for (const state of STATES) assert.deepEqual([...TRANSITION_MATRIX[state].destinations].sort(), [...expected[state]].sort(), `destinations for ${state}`);
  const removed = [['implementing', 'blocked'], ['rework', 'blocked'], ['handoff', 'blocked'], ['blocked', 'implementing'], ['blocked', 'rework'], ['blocked', 'handoff'], ['blocked', 'completed'], ['blocked', 'cancelled']];
  for (const [from, to] of removed) {
    const task = { ...createTaskState({ task_id: `removed-${from}-${to}` }), state: from, stop_reason: null };
    task.state_digest = computeStateDigest(task);
    assert.throws(
      () => rawTransitionTaskState(task, { to, actor: 'orchestrator', expected_digest: task.state_digest, evidence: { stop_reason: 'x', resume_evidence: 'r', approver_id: 'a' } }),
      (error) => error.code === 'ILLEGAL_TRANSITION_REJECTED',
      `${from} -> ${to}`
    );
  }
});

function createDurableTaskRoot(taskId = 'durable-evidence') {
  const root = createTempDir();
  const taskDir = path.join(root, 'docs', 'records', 'work-items', taskId);
  fs.mkdirSync(taskDir, { recursive: true });
  const task = createTaskState({ task_id: taskId, workflow_id: 'bug-fix', change_type: 'bug-fix', risk_level: 'medium' });
  const taskFile = path.join(taskDir, 'task-state.json');
  atomicWriteJsonSync(taskFile, task);
  initializeGeneration(root, 'task', taskId, undefined, { allowExisting: true });
  return { root, task, taskFile };
}

test('TC-007: durable transition uses policy evidence without matrix-only keys', () => {
  const { root, task, taskFile } = createDurableTaskRoot();
  try {
    const pure = rawTransitionTaskState(task, {
      to: 'investigating',
      actor: 'ba-agent',
      expected_digest: task.state_digest,
      evidence: { failure_description: 'fd', repro: 'rp' }
    });
    assert.equal(pure.state, 'investigating', 'pure transitionTaskState must share YAML policy evidence');
    const next = mutateTaskStateOnDisk(root, task.task_id, {
      to: 'investigating',
      actor: 'ba-agent',
      expected_digest: task.state_digest,
      evidence: { failure_description: 'fd', repro: 'issuecomment-1' }
    });
    assert.equal(next.state, 'investigating');
    assert.equal(next.sequence_number, 2);
    assert.deepEqual(next.history.at(-1).evidence_refs.sort(), ['failure_description', 'repro']);
    assert.equal(JSON.parse(fs.readFileSync(taskFile, 'utf8')).state, 'investigating');
    assert.equal(fs.existsSync(lockFilePath(root, 'task', task.task_id)), false);
    assert.equal(fs.existsSync(commitGuardPath(root, 'task', task.task_id)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('TC-007: durable policy evidence rejection preserves bytes and cleans guards', () => {
  for (const evidence of [
    { failure_description: 'fd' },
    { repro: 'rp' },
    { requirement_discovery: 'rd', issue_ref: '1' }
  ]) {
    const { root, task, taskFile } = createDurableTaskRoot(`durable-evidence-${Object.keys(evidence).join('-')}`);
    try {
      const before = fs.readFileSync(taskFile);
      assert.throws(
        () => mutateTaskStateOnDisk(root, task.task_id, {
          to: 'investigating',
          actor: 'ba-agent',
          expected_digest: task.state_digest,
          evidence
        }),
        (error) => error.code === 'MISSING_REQUIRED_EVIDENCE'
      );
      assert.deepEqual(fs.readFileSync(taskFile), before);
      assert.equal(fs.existsSync(lockFilePath(root, 'task', task.task_id)), false);
      assert.equal(fs.existsSync(commitGuardPath(root, 'task', task.task_id)), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('I297-TC-001: durable mutation rejects prose fail_path/hypothesis_matrix/repro and preserves bytes', () => {
  const cases = [
    { from: [], to: 'investigating', actor: 'ba-agent', evidence: { failure_description: 'fd', repro: 'rp' } },
    { from: ['investigating'], to: 'implementing', actor: 'developer-agent', evidence: { fail_path: 'fp', hypothesis_matrix: 'issuecomment-3' } },
    { from: ['investigating'], to: 'implementing', actor: 'developer-agent', evidence: { fail_path: 'issuecomment-2', hypothesis_matrix: 'hm' } },
    { from: [], to: 'investigating', actor: 'ba-agent', evidence: { failure_description: 'fd', repro: { url: 'https://example.com/a' } } },
    { from: [], to: 'investigating', actor: 'ba-agent', evidence: { failure_description: 'fd', repro: ['issuecomment-1', 'rp'] } }
  ];
  let n = 0;
  for (const c of cases) {
    const { root, task, taskFile } = createDurableTaskRoot(`durable-ref-${n++}`);
    try {
      let current = task;
      if (c.from.length) current = mutateTaskStateOnDisk(root, task.task_id, { to: 'investigating', actor: 'ba-agent', expected_digest: task.state_digest, evidence: { failure_description: 'fd', repro: 'issuecomment-1' } });
      const before = fs.readFileSync(taskFile);
      assert.throws(
        () => mutateTaskStateOnDisk(root, task.task_id, { to: c.to, actor: c.actor, expected_digest: current.state_digest, evidence: c.evidence }),
        (error) => error.code === 'EVIDENCE_NOT_REFERENCE' && error.status === 'REJECTED'
      );
      assert.deepEqual(fs.readFileSync(taskFile), before);
      assert.equal(fs.existsSync(lockFilePath(root, 'task', task.task_id)), false);
      assert.equal(fs.existsSync(commitGuardPath(root, 'task', task.task_id)), false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test('I297-TC-001: key presence is checked before reference form', () => {
  const { root, task, taskFile } = createDurableTaskRoot('durable-order');
  try {
    const before = fs.readFileSync(taskFile);
    assert.throws(
      () => mutateTaskStateOnDisk(root, task.task_id, { to: 'investigating', actor: 'ba-agent', expected_digest: task.state_digest, evidence: { repro: 'rp' } }),
      (error) => error.code === 'MISSING_REQUIRED_EVIDENCE'
    );
    assert.deepEqual(fs.readFileSync(taskFile), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('I297-TC-001: reference grammar is not enforced by the pure API (disk-only, OQ-P2)', () => {
  const task = createTaskState({ task_id: 'pure-prose-ok' });
  assert.equal(rawTransitionTaskState(task, { to: 'investigating', actor: 'ba-agent', expected_digest: task.state_digest, evidence: { failure_description: 'fd', repro: 'rp' } }).state, 'investigating');
});

test('I297-TC-003: policy declares reference_evidence additively and contract_version stays 1', () => {
  const policy = YAML.parse(fs.readFileSync('docs/contracts/bug-fix-workflow.yaml', 'utf8'));
  assert.deepEqual(policy.reference_evidence, ['repro', 'fail_path', 'hypothesis_matrix']);
  assert.equal(policy.contract_version, 1);
});

test('TC-025: Asynchronous pause and checkpoint resumption', () => {
  const tmpDir = createTempDir();
  const targetFile = path.join(tmpDir, 'task-state.json');

  // Step 1: Session 1 creates and transitions task to implementing
  let task = createTaskState({
    task_id: 'issue-resume',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'low'
  });
  task = transitionTaskState(task, { to: 'investigating', actor: 'orchestrator', evidence: { failure_description: 'fd', repro: 'issuecomment-1' } });
  task = transitionTaskState(task, { to: 'implementing', actor: 'developer-agent', evidence: { fail_path: 'issuecomment-2', hypothesis_matrix: 'issuecomment-3' } });
  atomicWriteJsonSync(targetFile, task);

  // Session 1 ends cleanly. Disk holds the checkpoint.
  const session1Digest = task.state_digest;

  // Step 2: Session 2 boots later, loads file, verifies CAS digest, and resumes
  const loadedTask = loadTaskState(targetFile);
  assert.equal(loadedTask.state, 'implementing');
  assert.equal(loadedTask.sequence_number, 3);
  assert.equal(loadedTask.state_digest, session1Digest);

  // Session 2 proceeds with transition to verifying
  const updatedTask = transitionTaskState(loadedTask, {
    to: 'verifying',
    actor: 'developer-agent',
    expected_digest: session1Digest,
    evidence: { changed_files: ['a.js'], validation_plan: 'plan-xyz' }
  });
  atomicWriteJsonSync(targetFile, updatedTask);

  const finalCheck = loadTaskState(targetFile);
  assert.equal(finalCheck.state, 'verifying');
  assert.equal(finalCheck.sequence_number, 4);
  assert.notEqual(finalCheck.state_digest, session1Digest);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('TC-026: Envelope schema validation', () => {
  const schemaPath = path.resolve('docs/contracts/schemas/durable-task-envelope.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const validate = ajv.compile(schema);

  const validTask = createTaskState({
    task_id: 'issue-schema',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'medium'
  });

  const isValid = validate(validTask);
  assert.equal(isValid, true, JSON.stringify(validate.errors));

  // Invalid: missing required field
  const invalidTask = { ...validTask };
  delete invalidTask.sequence_number;
  assert.equal(validate(invalidTask), false);

  // Invalid: invalid state
  const invalidStateTask = { ...validTask, state: 'invalid-state' };
  assert.equal(validate(invalidStateTask), false);
});

test('TC-038: Contract schema validator verifies non-colliding envelope schemas', () => {
  const schemaDir = path.resolve('docs/contracts/schemas');
  const files = fs.readdirSync(schemaDir);

  // Verify non-colliding schemas do NOT end in -state.schema.json
  const nonColliding = ['durable-task-envelope.schema.json', 'status-cas-request.schema.json', 'pr-frontmatter.schema.json'];
  for (const file of nonColliding) {
    assert.ok(files.includes(file), `Expected ${file} to exist`);
    assert.equal(file.endsWith('-state.schema.json'), false, `${file} must not end in -state.schema.json`);
  }

  // Execute scripts/validate-contracts.mjs and verify it exits 0
  const result = execFileSync('node', ['scripts/validate-contracts.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  assert.match(result, /Contract validation passed/);
});

test('CLI: task-machine-cli commands (init, transition, resume, inspect)', () => {
  const tmpDir = createTempDir();
  const targetFile = path.join(tmpDir, 'docs', 'records', 'work-items', 'issue-cli', 'task-state.json');

  // 1. Init command
  execFileSync('node', [
    'scripts/task-machine-cli.mjs',
    'init',
    '--file', targetFile,
    '--task-id', 'issue-cli',
    '--workflow-id', 'bug-fix',
    '--change-type', 'bug-fix',
    '--risk-level', 'low'
  ]);
  assert.ok(fs.existsSync(targetFile));

  // 2. Inspect command
  const inspectOut = execFileSync('node', [
    'scripts/task-machine-cli.mjs',
    'inspect',
    '--file', targetFile
  ], { encoding: 'utf8' });
  const inspectData = JSON.parse(inspectOut);
  assert.equal(inspectData.task_id, 'issue-cli');
  assert.equal(inspectData.state, 'intake');
  const digest1 = inspectData.state_digest;

  // 3. Transition command
  execFileSync('node', [
    'scripts/task-machine-cli.mjs',
    'transition',
    '--file', targetFile,
    '--to', 'investigating',
    '--actor', 'orchestrator',
    '--evidence', JSON.stringify({ failure_description: 'failure-cli', repro: 'issuecomment-1' }),
    '--expected-digest', digest1
  ]);

  const inspect2 = JSON.parse(execFileSync('node', ['scripts/task-machine-cli.mjs', 'inspect', '--file', targetFile], { encoding: 'utf8' }));
  assert.equal(inspect2.state, 'investigating');
  assert.equal(inspect2.sequence_number, 2);

  // 4. Transition to blocked
  execFileSync('node', [
    'scripts/task-machine-cli.mjs',
    'transition',
    '--file', targetFile,
    '--to', 'blocked',
    '--actor', 'sa-agent',
    '--stop-reason', 'human_review_required',
    '--evidence', JSON.stringify({ stop_reason: 'human_review_required' }),
    '--expected-digest', inspect2.state_digest
  ]);

  const blocked = JSON.parse(execFileSync('node', ['scripts/task-machine-cli.mjs', 'inspect', '--file', targetFile], { encoding: 'utf8' }));

  // 5. Resume command with human approver
  execFileSync('node', [
    'scripts/task-machine-cli.mjs',
    'resume',
    '--file', targetFile,
    '--to', 'investigating',
    '--actor', 'human',
    '--approver-id', 'boss',
    '--evidence', 'approved-fix',
    '--expected-digest', blocked.state_digest
  ]);

  const inspect3 = JSON.parse(execFileSync('node', ['scripts/task-machine-cli.mjs', 'inspect', '--file', targetFile], { encoding: 'utf8' }));
  assert.equal(inspect3.state, 'investigating');
  assert.equal(inspect3.stop_reason, null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
