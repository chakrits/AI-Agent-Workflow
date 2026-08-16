import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateHostCapability,
  preserveTerminalOutcome,
  recordHostMeasurement,
  validateApprovedHumanApprovalEvidence,
  validateCapabilityRecord,
  validateHostMeasurement,
} from '../scripts/lib/host-capability-adapter.mjs';

const capabilityRef = 'docs/records/qa/2026-08-16-issue-132-imp002-task4-code-review.md#corrective-rework';
const nativeActivationRef = 'docs/records/qa/2026-08-16-issue-132-imp002-task4-code-review.md#scope-reviewed';
const nativeTokenRef = 'docs/records/qa/2026-08-16-issue-132-imp002-task4-code-review.md#verification-performed';

function nativeEvidence(ref, evidenceId = ref.split('#')[1]) {
  return {
    evidenceId,
    ref,
    class: 'host_native',
  };
}

function validCapability(overrides = {}) {
  return {
    host: 'Codex',
    hostOwner: 'Human Maintainer',
    adapterVersion: 'host-adapter/v1.0.0',
    activationEvidenceRef: nativeActivationRef,
    tokenEvidenceRef: nativeTokenRef,
    tokenMeasurementStatus: 'available',
    observedAt: '2026-08-16T10:00:00Z',
    capabilityDecision: 'supported',
    ...overrides,
  };
}

function validMeasurement(overrides = {}) {
  return {
    measurementId: 'measurement-001',
    host: 'Codex',
    adapterVersion: 'host-adapter/v1.0.0',
    observedAt: '2026-08-16T10:01:00Z',
    tokenMeasurementStatus: 'available',
    tokenEvidenceRef: nativeTokenRef,
    waitPolicy: 'operator_wait',
    terminalOutcome: {
      status: 'success',
      resultId: 'terminal-001',
      observedAt: '2026-08-16T10:02:00Z',
    },
    ...overrides,
  };
}

function validApproval(overrides = {}) {
  return {
    schema_version: 'workflow-evidence/v1',
    evidence_id: 'evidence-approval-001',
    work_item_id: 'issue-132',
    run_id: 'run-001',
    event_id: 'event-approval-001',
    observed_at: '2026-08-16T09:59:00Z',
    source: 'human_record',
    authority: 'human_approval',
    correlation: { measurement_id: 'measurement-001' },
    event_type: 'human_approval',
    outcome_status: 'success',
    attributes: {
      decision: 'approved',
      approver: 'Human Maintainer',
    },
    evidence_ref: capabilityRef,
    recorded_by: 'Human Maintainer',
    ...overrides,
  };
}

test('accepts a native supported capability record with the frozen fields', () => {
  assert.deepEqual(validateCapabilityRecord(validCapability(), {
    activationEvidence: nativeEvidence(nativeActivationRef),
    tokenEvidence: nativeEvidence(nativeTokenRef),
  }), []);
});

test('keeps all initial hosts unknown until native evidence is supplied', () => {
  for (const host of ['Codex', 'Claude', 'Gemini', 'Cursor', 'Antigravity']) {
    const outcome = evaluateHostCapability({
      host,
      hostOwner: 'Human Maintainer',
      adapterVersion: 'host-adapter/v1.0.0',
      activationEvidence: nativeEvidence(nativeActivationRef),
      tokenEvidence: { ...nativeEvidence(nativeTokenRef), status: 'unavailable' },
      observedAt: '2026-08-16T10:00:00Z',
      reason: 'Native activation and token evidence are not available in this run',
    });

    assert.equal(outcome.status, 'accepted', host);
    assert.equal(outcome.capabilityRecord.capabilityDecision, 'unavailable', host);
    assert.equal(outcome.authority, 'legacy', host);
  }
});

test('records explicit unsupported and N/A token paths without promoting support', () => {
  for (const [status, decision] of [['unsupported', 'unsupported'], ['N/A', 'N/A']]) {
    const outcome = evaluateHostCapability({
      host: 'Codex',
      hostOwner: 'Human Maintainer',
      adapterVersion: 'host-adapter/v1.0.0',
      activationEvidence: nativeEvidence(nativeActivationRef),
      tokenEvidence: { ...nativeEvidence(nativeTokenRef), status },
      observedAt: '2026-08-16T10:00:00Z',
      reason: `Token measurement is ${status}`,
    });
    assert.equal(outcome.status, 'accepted');
    assert.equal(outcome.capabilityRecord.capabilityDecision, decision);
    assert.notEqual(outcome.capabilityRecord.capabilityDecision, 'supported');
  }
});

test('does not accept arbitrary evidence references as native support', () => {
  const record = validCapability({
    activationEvidenceRef: 'garbage',
    tokenEvidenceRef: 'garbage2',
  });
  const outcome = evaluateHostCapability({
    capabilityRecord: record,
    activationEvidence: nativeEvidence('garbage'),
    tokenEvidence: nativeEvidence('garbage2'),
  });
  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.capabilityRecord.capabilityDecision, 'unknown');
  assert.match(outcome.reason, /addressable|canonical|resolv|reference/i);
});

test('does not accept a supported record from caller-only evidence classes', () => {
  const missingEvidenceErrors = validateCapabilityRecord(validCapability());
  assert.ok(missingEvidenceErrors.length > 0);
  const errors = validateCapabilityRecord(validCapability(), {
    activationEvidenceClass: 'host_native',
    tokenEvidenceClass: 'host_native',
  });
  assert.ok(errors.length > 0);
  assert.match(errors.join('\n'), /evidence object|verif|native/i);
});

test('rejects native evidence objects with unverifiable references', () => {
  const errors = validateCapabilityRecord(validCapability({
    activationEvidenceRef: 'garbage',
    tokenEvidenceRef: 'garbage2',
  }), {
    activationEvidence: nativeEvidence('garbage'),
    tokenEvidence: nativeEvidence('garbage2'),
  });
  assert.ok(errors.length > 0);
  assert.match(errors.join('\n'), /addressable|canonical|resolv|reference/i);
});

test('fails closed for missing owner or activation/token evidence', () => {
  for (const overrides of [
    { hostOwner: '' },
    { activationEvidenceRef: '' },
    { tokenEvidenceRef: '' },
    { tokenMeasurementStatus: 'not-a-status' },
  ]) {
    assert.ok(validateCapabilityRecord(validCapability(overrides)).length > 0);
  }
  assert.ok(validateCapabilityRecord(validCapability(), {
    activationEvidence: { ...nativeEvidence('garbage'), stale: true },
  }).some((error) => /stale|match/i.test(error)));
});

test('repository simulation cannot mark a host supported', () => {
  const outcome = evaluateHostCapability({
    capabilityRecord: validCapability(),
    activationEvidence: { ref: 'test/fixtures/context-pack-v1/vectors.json', class: 'repository_simulation' },
    tokenEvidence: { ref: 'test/fixtures/context-pack-v1/vectors.json', class: 'repository_simulation', status: 'available' },
  });

  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.capabilityRecord.capabilityDecision, 'unknown');
  assert.match(outcome.reason, /native|simulation|fixture/i);
});

test('preserves measurement identity and timestamps while validating host alignment', () => {
  const measurement = validMeasurement();
  assert.deepEqual(validateHostMeasurement(measurement, validCapability()), []);
  const legacy = { stopBackwardReworkResult: 'completed', value: 7 };
  const outcome = recordHostMeasurement({
    capabilityRecord: validCapability(),
    measurement,
    legacyResult: legacy,
    activationEvidence: nativeEvidence(nativeActivationRef),
    tokenEvidence: { ...nativeEvidence(nativeTokenRef), status: 'available' },
  });

  assert.equal(outcome.status, 'measured');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.measurement.measurementId, measurement.measurementId);
  assert.equal(outcome.measurement.observedAt, measurement.observedAt);
  assert.equal(outcome.measurement.terminalOutcome.resultId, 'terminal-001');
  assert.equal(outcome.measurement.terminalOutcome.observedAt, '2026-08-16T10:02:00Z');
  assert.deepEqual(outcome.result, legacy);
});

test('operator_wait preserves timed_out and host_completion_unavailable outcomes', () => {
  for (const status of ['timed_out', 'host_completion_unavailable']) {
    const terminalOutcome = {
      status,
      resultId: `terminal-${status}`,
      observedAt: '2026-08-16T10:03:00Z',
      reason: `canonical ${status} result`,
    };
    const preserved = preserveTerminalOutcome({ waitPolicy: 'operator_wait', terminalOutcome });
    assert.equal(preserved.waitPolicy, 'operator_wait');
    assert.deepEqual(preserved.terminalOutcome, terminalOutcome);
  }
});

test('reuses and validates an approved human_approval event linked to the capability record', () => {
  assert.deepEqual(validateApprovedHumanApprovalEvidence(validApproval(), capabilityRef), []);
  assert.ok(validateApprovedHumanApprovalEvidence(
    validApproval({ attributes: { decision: 'deferred', approver: 'Human Maintainer' } }),
    capabilityRef,
  ).length > 0);
  assert.ok(validateApprovedHumanApprovalEvidence(validApproval({ evidence_ref: 'fixture-only' }), capabilityRef).length > 0);
});

test('malformed records and measurements fail closed without changing legacy authority', () => {
  assert.ok(validateCapabilityRecord({ ...validCapability(), observedAt: 'not-a-timestamp' }).length > 0);
  assert.ok(validateCapabilityRecord({ ...validCapability(), extra: true }).length > 0);
  const outcome = recordHostMeasurement({
    capabilityRecord: validCapability(),
    measurement: validMeasurement({ host: 'Claude' }),
    legacyResult: { value: 7 },
  });
  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.mutationAttempted, false);
  assert.deepEqual(outcome.result, { value: 7 });
});
