import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';

import {
  evaluateHostCapability,
  preserveTerminalOutcome,
  recordHostMeasurement,
  validateApprovedHumanApprovalEvidence,
  validateCapabilityRecord,
  validateHostMeasurement,
} from '../scripts/lib/host-capability-adapter.mjs';

const capabilityRef = 'docs/records/qa/2026-08-16-issue-132-imp002-task4-code-review.md#corrective-rework';
const testRoot = await mkdtemp(path.join(os.tmpdir(), 'host-capability-adapter-'));
const nativeEvidenceDirectory = path.join(testRoot, 'docs/records/evidence/host-native');
await mkdir(nativeEvidenceDirectory, { recursive: true });

const nativeActivationRef = 'docs/records/evidence/host-native/activation.json#activation-001';
const nativeTokenRef = 'docs/records/evidence/host-native/token-available.json#token-001';
const tokenRefsByStatus = {
  available: nativeTokenRef,
  unsupported: 'docs/records/evidence/host-native/token-unsupported.json#token-unsupported-001',
  unavailable: 'docs/records/evidence/host-native/token-unavailable.json#token-unavailable-001',
  'N/A': 'docs/records/evidence/host-native/token-na.json#token-na-001',
};

async function writeNativeEvidence(ref, overrides = {}) {
  const [relativePath] = ref.split('#');
  const evidence = {
    schema_version: 'host-native-evidence/v1',
    evidence_id: ref.split('#')[1],
    evidence_type: 'native_token_measurement',
    host: 'Codex',
    host_owner: 'Human Maintainer',
    adapter_version: 'host-adapter/v1.0.0',
    measurement_id: 'measurement-001',
    observed_at: '2026-08-16T10:00:00Z',
    measurement_status: 'available',
    evidence_ref: ref,
    source: 'host_telemetry',
    authority: 'host_telemetry',
    recorded_by: 'Human Maintainer',
    ...overrides,
  };
  await writeFile(path.join(testRoot, relativePath), `${JSON.stringify(evidence)}\n`, 'utf8');
}

await writeNativeEvidence(nativeActivationRef, {
  evidence_id: 'activation-001',
  evidence_type: 'native_activation',
});
for (const [status, ref] of Object.entries(tokenRefsByStatus)) {
  await writeNativeEvidence(ref, {
    evidence_id: ref.split('#')[1],
    measurement_status: status,
  });
}

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
    rootDir: testRoot,
  }), []);
});

test('keeps all initial hosts unknown until native evidence is supplied', () => {
  for (const host of ['Codex', 'Claude', 'Gemini', 'Cursor', 'Antigravity']) {
    const outcome = evaluateHostCapability({
      host,
      hostOwner: 'Human Maintainer',
      adapterVersion: 'host-adapter/v1.0.0',
      observedAt: '2026-08-16T10:00:00Z',
      reason: 'Native activation and token evidence are not available in this run',
      rootDir: testRoot,
    });

    assert.equal(outcome.status, 'fallback', host);
    assert.equal(outcome.capabilityRecord.capabilityDecision, 'unknown', host);
    assert.equal(outcome.authority, 'legacy', host);
  }
});

test('records explicit unsupported and N/A token paths without promoting support', () => {
  for (const [status, decision] of [['unsupported', 'unsupported'], ['N/A', 'N/A']]) {
    const tokenEvidenceRef = tokenRefsByStatus[status];
    const outcome = evaluateHostCapability({
      host: 'Codex',
      hostOwner: 'Human Maintainer',
      adapterVersion: 'host-adapter/v1.0.0',
      activationEvidence: nativeEvidence(nativeActivationRef),
      tokenEvidenceRef,
      tokenEvidence: { ...nativeEvidence(tokenEvidenceRef), status },
      observedAt: '2026-08-16T10:00:00Z',
      reason: `Token measurement is ${status}`,
      rootDir: testRoot,
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

test('does not accept a generic code-review record marked host_native', () => {
  const outcome = evaluateHostCapability({
    capabilityRecord: validCapability({
      activationEvidenceRef: capabilityRef,
      tokenEvidenceRef: capabilityRef,
    }),
    activationEvidence: nativeEvidence(capabilityRef),
    tokenEvidence: { ...nativeEvidence(capabilityRef), status: 'available' },
    rootDir: process.cwd(),
  });

  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.capabilityRecord.capabilityDecision, 'unknown');
  assert.match(outcome.reason, /host-native|canonical|native evidence/i);
});

test('rejects missing and wrong host-native evidence types', () => {
  const missingErrors = validateCapabilityRecord(validCapability(), {
    rootDir: testRoot,
    activationEvidence: nativeEvidence(nativeActivationRef),
  });
  assert.match(missingErrors.join('\n'), /token evidence object|required/i);

  const wrongTypeRef = 'docs/records/evidence/host-native/wrong-type.json#wrong-type-001';
  return writeNativeEvidence(wrongTypeRef, {
    evidence_id: 'wrong-type-001',
    evidence_type: 'native_activation',
  }).then(() => {
    const errors = validateCapabilityRecord(validCapability({ tokenEvidenceRef: wrongTypeRef }), {
      rootDir: testRoot,
      activationEvidence: nativeEvidence(nativeActivationRef),
      tokenEvidence: { ...nativeEvidence(wrongTypeRef), status: 'available' },
    });
    assert.match(errors.join('\n'), /evidence type|token.*measurement|native_token/i);
  });
});

test('rejects host-native evidence with mismatched host or measurement identity', async () => {
  const wrongHostRef = 'docs/records/evidence/host-native/wrong-host.json#wrong-host-001';
  const wrongMeasurementRef = 'docs/records/evidence/host-native/wrong-measurement.json#wrong-measurement-001';
  await writeNativeEvidence(wrongHostRef, {
    evidence_id: 'wrong-host-001',
    host: 'Claude',
  });
  await writeNativeEvidence(wrongMeasurementRef, {
    evidence_id: 'wrong-measurement-001',
    measurement_id: 'measurement-999',
  });

  for (const tokenRef of [wrongHostRef, wrongMeasurementRef]) {
    const errors = validateCapabilityRecord(validCapability({ tokenEvidenceRef: tokenRef }), {
      rootDir: testRoot,
      activationEvidence: nativeEvidence(nativeActivationRef),
      tokenEvidence: { ...nativeEvidence(tokenRef), status: 'available' },
    });
    assert.match(errors.join('\n'), /host|measurement/i);
  }
});

test('does not accept a supported record from caller-only evidence classes', () => {
  const missingEvidenceErrors = validateCapabilityRecord(validCapability());
  assert.ok(missingEvidenceErrors.length > 0);
  const errors = validateCapabilityRecord(validCapability(), {
    activationEvidenceClass: 'host_native',
    tokenEvidenceClass: 'host_native',
    rootDir: testRoot,
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
    rootDir: testRoot,
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
    assert.ok(validateCapabilityRecord(validCapability(overrides), { rootDir: testRoot }).length > 0);
  }
  assert.ok(validateCapabilityRecord(validCapability(), {
    activationEvidence: { ...nativeEvidence('garbage'), stale: true },
    rootDir: testRoot,
  }).some((error) => /stale|match/i.test(error)));
});

test('repository simulation cannot mark a host supported', () => {
  const outcome = evaluateHostCapability({
    capabilityRecord: validCapability(),
    activationEvidence: { ref: 'test/fixtures/context-pack-v1/vectors.json', class: 'repository_simulation' },
    tokenEvidence: { ref: 'test/fixtures/context-pack-v1/vectors.json', class: 'repository_simulation', status: 'available' },
    rootDir: testRoot,
  });

  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.capabilityRecord.capabilityDecision, 'unknown');
  assert.match(outcome.reason, /native|simulation|fixture/i);
});

test('preserves measurement identity and timestamps while validating host alignment', () => {
  const measurement = validMeasurement();
  assert.deepEqual(validateHostMeasurement(measurement, validCapability(), { rootDir: testRoot }), []);
  const legacy = { stopBackwardReworkResult: 'completed', value: 7 };
  const outcome = recordHostMeasurement({
    capabilityRecord: validCapability(),
    measurement,
    legacyResult: legacy,
    activationEvidence: nativeEvidence(nativeActivationRef),
    tokenEvidence: { ...nativeEvidence(nativeTokenRef), status: 'available' },
    rootDir: testRoot,
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
  assert.ok(validateCapabilityRecord({ ...validCapability(), observedAt: 'not-a-timestamp' }, { rootDir: testRoot }).length > 0);
  assert.ok(validateCapabilityRecord({ ...validCapability(), extra: true }, { rootDir: testRoot }).length > 0);
  const outcome = recordHostMeasurement({
    capabilityRecord: validCapability(),
    measurement: validMeasurement({ host: 'Claude' }),
    legacyResult: { value: 7 },
    rootDir: testRoot,
  });
  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.authority, 'legacy');
  assert.equal(outcome.mutationAttempted, false);
  assert.deepEqual(outcome.result, { value: 7 });
});
