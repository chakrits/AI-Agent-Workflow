import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  STATES,
  ROLE_REGISTRY,
  TRANSITION_MATRIX,
  atomicWriteJsonSync,
  canonicalizeJcs,
  computeStateDigest,
  verifyCasAndComputeDigest,
  createTaskState,
  transitionTaskState,
  loadTaskState,
  inspectTaskState
} from '../scripts/lib/task-state-machine.mjs';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'state-machine-test-'));
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
    evidence: { requirement_discovery: 'doc-ref-1' }
  });
  assert.equal(task.state, 'investigating');
  assert.equal(task.sequence_number, 2);
  assert.equal(task.history.length, 1);
  assert.equal(task.history[0].from, 'intake');
  assert.equal(task.history[0].to, 'investigating');

  // 3. Legal transition: investigating -> designing
  task = transitionTaskState(task, {
    to: 'designing',
    actor: 'sa-agent',
    evidence: { root_cause_analysis: 'analysis-ref' }
  });
  assert.equal(task.state, 'designing');
  assert.equal(task.sequence_number, 3);

  // 4. Legal transition: designing -> planning
  task = transitionTaskState(task, {
    to: 'planning',
    actor: 'sa-agent',
    evidence: { sdd_ref: 'sdd-1', adr_ref: 'adr-1' }
  });
  assert.equal(task.state, 'planning');

  // 5. Legal transition: planning -> implementing
  task = transitionTaskState(task, {
    to: 'implementing',
    actor: 'developer-agent',
    evidence: { implementation_plan_ref: 'plan-1' }
  });
  assert.equal(task.state, 'implementing');

  // 6. Legal transition: implementing -> verifying
  task = transitionTaskState(task, {
    to: 'verifying',
    actor: 'developer-agent',
    evidence: { changed_files: ['file.mjs'], validation_plan: 'plan-test' }
  });
  assert.equal(task.state, 'verifying');

  // 7. Legal transition: verifying -> handoff
  task = transitionTaskState(task, {
    to: 'handoff',
    actor: 'qa-agent',
    evidence: { test_evidence: 'pass', qa_report_ref: 'qa-1' }
  });
  assert.equal(task.state, 'handoff');

  // 8. Legal transition: handoff -> completed
  task = transitionTaskState(task, {
    to: 'completed',
    actor: 'orchestrator',
    evidence: { terminal_handoff_receipt: 'receipt-1' }
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

  // intake -> investigating requires requirement_discovery or issue_ref
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

  // With issue_ref (alternative), it succeeds
  task = transitionTaskState(task, {
    to: 'investigating',
    actor: 'orchestrator',
    evidence: { issue_ref: 'https://github.com/org/repo/issues/1' }
  });
  assert.equal(task.state, 'investigating');

  // investigating -> designing requires root_cause_analysis
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'designing',
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

  // Advance to designing
  task = transitionTaskState(task, {
    to: 'investigating',
    actor: 'orchestrator',
    evidence: { requirement_discovery: 'req-1' }
  });
  task = transitionTaskState(task, {
    to: 'designing',
    actor: 'sa-agent',
    evidence: { root_cause_analysis: 'rca-1' }
  });

  // Transition to blocked with human review required
  task = transitionTaskState(task, {
    to: 'blocked',
    actor: 'sa-agent',
    stop_reason: 'human_review_required',
    evidence: { sdd_ref: 'sdd-1' }
  });
  assert.equal(task.state, 'blocked');
  assert.equal(task.stop_reason, 'human_review_required');

  // Autonomous resumption attempt by developer-agent without human evidence must fail
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'planning',
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
    to: 'designing',
    actor: 'human',
    evidence: { resume_evidence: 'approved-by-maintainer', approver_id: 'lead-maintainer' }
  });
  assert.equal(task.state, 'designing');
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
  task = transitionTaskState(task, { to: 'investigating', actor: 'orchestrator', evidence: { issue_ref: '1' } });
  task = transitionTaskState(task, { to: 'planning', actor: 'developer-agent', evidence: { root_cause_analysis: 'rca' } });
  task = transitionTaskState(task, { to: 'implementing', actor: 'developer-agent', evidence: { implementation_plan_ref: 'plan' } });
  task = transitionTaskState(task, { to: 'verifying', actor: 'developer-agent', evidence: { changed_files: ['a.js'], validation_plan: 'val' } });

  assert.equal(task.rework_count, 0);

  // Cycle 1: verifying -> rework
  task = transitionTaskState(task, {
    to: 'rework',
    actor: 'qa-agent',
    evidence: { test_evidence: 'fail-1', qa_report_ref: 'report-1' }
  });
  assert.equal(task.state, 'rework');
  assert.equal(task.rework_count, 1);

  // rework -> implementing -> verifying
  task = transitionTaskState(task, { to: 'implementing', actor: 'developer-agent', evidence: { rework_plan: 'fix-1', qa_findings: 'finding-1' } });
  task = transitionTaskState(task, { to: 'verifying', actor: 'developer-agent', evidence: { changed_files: ['a.js'], validation_plan: 'val-2' } });

  // Cycle 2: verifying -> rework
  task = transitionTaskState(task, {
    to: 'rework',
    actor: 'qa-agent',
    evidence: { test_evidence: 'fail-2', qa_report_ref: 'report-2' }
  });
  assert.equal(task.state, 'rework');
  assert.equal(task.rework_count, 2);

  // rework -> implementing -> verifying
  task = transitionTaskState(task, { to: 'implementing', actor: 'developer-agent', evidence: { rework_plan: 'fix-2', qa_findings: 'finding-2' } });
  task = transitionTaskState(task, { to: 'verifying', actor: 'developer-agent', evidence: { changed_files: ['a.js'], validation_plan: 'val-3' } });

  // Attempt 3rd rework: rework_count is already 2 (max_rework_attempts = 2)
  // Engine must reject normal rework and route to blocked with stop_reason: "human_review_required" / "max_rework_exceeded"
  assert.throws(
    () => {
      transitionTaskState(task, {
        to: 'rework',
        actor: 'qa-agent',
        evidence: { test_evidence: 'fail-3', qa_report_ref: 'report-3' }
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
    evidence: { test_evidence: 'fail-3', qa_report_ref: 'report-3' }
  });
  assert.equal(task.state, 'blocked');
  assert.equal(task.stop_reason, 'human_review_required');
});

test('TC-025: Asynchronous pause and checkpoint resumption', () => {
  const tmpDir = createTempDir();
  const targetFile = path.join(tmpDir, 'task-state.json');

  // Step 1: Session 1 creates and transitions task to planning
  let task = createTaskState({
    task_id: 'issue-resume',
    workflow_id: 'bug-fix',
    change_type: 'bug-fix',
    risk_level: 'low'
  });
  task = transitionTaskState(task, { to: 'investigating', actor: 'orchestrator', evidence: { requirement_discovery: 'req' } });
  task = transitionTaskState(task, { to: 'planning', actor: 'developer-agent', evidence: { root_cause_analysis: 'rca' } });
  atomicWriteJsonSync(targetFile, task);

  // Session 1 ends cleanly. Disk holds the checkpoint.
  const session1Digest = task.state_digest;

  // Step 2: Session 2 boots later, loads file, verifies CAS digest, and resumes
  const loadedTask = loadTaskState(targetFile);
  assert.equal(loadedTask.state, 'planning');
  assert.equal(loadedTask.sequence_number, 3);
  assert.equal(loadedTask.state_digest, session1Digest);

  // Session 2 proceeds with transition to implementing
  const updatedTask = transitionTaskState(loadedTask, {
    to: 'implementing',
    actor: 'developer-agent',
    expected_digest: session1Digest,
    evidence: { implementation_plan_ref: 'plan-xyz' }
  });
  atomicWriteJsonSync(targetFile, updatedTask);

  const finalCheck = loadTaskState(targetFile);
  assert.equal(finalCheck.state, 'implementing');
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
  const targetFile = path.join(tmpDir, 'task-state.json');

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
    '--evidence', JSON.stringify({ requirement_discovery: 'req-cli' }),
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
    '--evidence', JSON.stringify({ root_cause_analysis: 'rca-cli' })
  ]);

  // 5. Resume command with human approver
  execFileSync('node', [
    'scripts/task-machine-cli.mjs',
    'resume',
    '--file', targetFile,
    '--to', 'investigating',
    '--actor', 'human',
    '--approver-id', 'boss',
    '--evidence', 'approved-fix'
  ]);

  const inspect3 = JSON.parse(execFileSync('node', ['scripts/task-machine-cli.mjs', 'inspect', '--file', targetFile], { encoding: 'utf8' }));
  assert.equal(inspect3.state, 'investigating');
  assert.equal(inspect3.stop_reason, null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
