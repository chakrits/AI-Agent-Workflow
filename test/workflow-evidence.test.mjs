import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  canonicalEvidenceJson,
  validateEvidenceRecord,
  writeEvidence,
} from '../scripts/lib/workflow-evidence.mjs';

const digest = 'a'.repeat(64);

function baseRecord(overrides = {}) {
  return {
    schema_version: 'workflow-evidence/v1',
    evidence_id: 'evidence-001',
    work_item_id: 'issue-132',
    run_id: 'run-001',
    event_id: 'event-001',
    observed_at: '2026-08-15T00:00:00Z',
    source: 'workflow_record',
    authority: 'legacy',
    correlation: { measurement_id: 'measurement-001' },
    event_type: 'context_loaded',
    outcome_status: 'success',
    attributes: {
      context_mode: 'full',
      source_manifest_digest: digest,
      token_measurement_status: 'available',
      approximate_tokens: 123,
    },
    digest_ref: `sha256:${digest}`,
    evidence_ref: 'docs/records/qa/issue-183-evidence.md#event-001',
    recorded_by: 'Developer Agent',
    ...overrides,
  };
}

function eventRecord(eventType) {
  const common = baseRecord({ evidence_id: `evidence-${eventType}`, event_id: `event-${eventType}` });
  const records = {
    context_loaded: common,
    context_baseline_observed: {
      ...common,
      source: 'validator',
      event_type: 'context_baseline_observed',
      attributes: {
        validator_name: 'validate-context-budget',
        command: 'npm run validate:context-budget',
        source_manifest_digest: digest,
        character_count: 119748,
        target_tokens: 30000,
        token_measurement_status: 'available',
        approximate_tokens: 29937,
      },
    },
    shadow_compared: {
      ...common,
      authority: 'shadow',
      event_type: 'shadow_compared',
      correlation: { pair_id: 'pair-001' },
      attributes: {
        input_digest: digest,
        legacy_result_digest: 'b'.repeat(64),
        candidate_result_digest: 'c'.repeat(64),
        comparison_result: 'match',
      },
    },
    shadow_fallback: {
      ...common,
      authority: 'shadow',
      event_type: 'shadow_fallback',
      outcome_status: 'failure',
      reason: 'candidate pack was rejected',
      correlation: { pair_id: 'pair-001' },
      attributes: {
        fallback_used: true,
        fallback_reason: 'candidate pack was rejected',
        legacy_path: 'legacy-context-loader',
      },
      digest_ref: undefined,
    },
    rollback_completed: {
      ...common,
      authority: 'shadow',
      event_type: 'rollback_completed',
      correlation: { pair_id: 'pair-001' },
      attributes: {
        rollback_result: 'succeeded',
        rollback_target: 'legacy-context-loader',
      },
      digest_ref: undefined,
    },
    human_approval: {
      ...common,
      source: 'human_record',
      authority: 'human_approval',
      event_type: 'human_approval',
      attributes: {
        decision: 'approved',
        approver: 'Human Maintainer',
      },
      digest_ref: undefined,
    },
  };
  for (const record of Object.values(records)) {
    if (!['context_loaded', 'context_baseline_observed', 'shadow_compared'].includes(record.event_type)) {
      delete record.digest_ref;
    }
  }
  if (['context_loaded', 'context_baseline_observed', 'shadow_compared'].includes(eventType)) {
    records[eventType].digest_ref = `sha256:${digest}`;
  }
  return records[eventType];
}

test('accepts every frozen runtime event and the human approval anchor mapping', () => {
  for (const eventType of [
    'context_loaded',
    'context_baseline_observed',
    'shadow_compared',
    'shadow_fallback',
    'rollback_completed',
    'human_approval',
  ]) {
    assert.deepEqual(validateEvidenceRecord(eventRecord(eventType)), [], eventType);
  }
});

test('rejects unknown event/source/authority/outcome values and unknown attributes', () => {
  const cases = [
    ['event_type', { event_type: 'route_selected' }],
    ['source', { source: 'dispatch_receipt' }],
    ['authority', { authority: 'candidate' }],
    ['outcome_status', { outcome_status: 'maybe' }],
    ['attribute', { attributes: { ...baseRecord().attributes, extra: true } }],
  ];
  for (const [label, override] of cases) {
    const errors = validateEvidenceRecord(baseRecord(override));
    assert.ok(errors.length > 0, `${label} should fail closed`);
  }
});

test('requires typed correlation IDs, reasons, digest references, and evidence references', () => {
  const missingCorrelation = validateEvidenceRecord(baseRecord({ correlation: {} }));
  assert.match(missingCorrelation.join('\n'), /measurement_id|required/i);

  const missingDigest = validateEvidenceRecord(baseRecord({ digest_ref: undefined }));
  assert.match(missingDigest.join('\n'), /digest_ref|required/i);

  const missingEvidence = validateEvidenceRecord(baseRecord({ evidence_ref: '' }));
  assert.match(missingEvidence.join('\n'), /evidence_ref|minLength/i);

  const missingReason = validateEvidenceRecord(baseRecord({ outcome_status: 'failure' }));
  assert.match(missingReason.join('\n'), /reason|required/i);

  const invalidTimestamp = validateEvidenceRecord(baseRecord({ observed_at: '2026-02-30T00:00:00Z' }));
  assert.match(invalidTimestamp.join('\n'), /observed_at|RFC 3339/i);

  const wrongCorrelation = validateEvidenceRecord(
    eventRecord('shadow_compared'),
  ).concat(validateEvidenceRecord({
    ...eventRecord('shadow_compared'),
    correlation: { measurement_id: 'measurement-001' },
  }));
  assert.ok(wrongCorrelation.some((message) => /pair_id|correlation/i.test(message)));
});

test('enforces explicit token N/A semantics and baseline outcome rules', () => {
  const unsupported = eventRecord('context_loaded');
  unsupported.attributes = {
    ...unsupported.attributes,
    token_measurement_status: 'unsupported',
  };
  delete unsupported.attributes.approximate_tokens;
  assert.deepEqual(validateEvidenceRecord(unsupported), [], 'unsupported has explicit N/A semantics');

  const silentZero = eventRecord('context_loaded');
  silentZero.attributes = {
    ...silentZero.attributes,
    token_measurement_status: 'unsupported',
    approximate_tokens: 0,
  };
  assert.ok(validateEvidenceRecord(silentZero).length > 0);

  const unavailableBaseline = eventRecord('context_baseline_observed');
  unavailableBaseline.attributes = {
    ...unavailableBaseline.attributes,
    token_measurement_status: 'unavailable',
  };
  delete unavailableBaseline.attributes.approximate_tokens;
  unavailableBaseline.outcome_status = 'inconclusive';
  unavailableBaseline.reason = 'host did not provide native token telemetry';
  assert.deepEqual(validateEvidenceRecord(unavailableBaseline), []);

  const overTarget = eventRecord('context_baseline_observed');
  overTarget.attributes = { ...overTarget.attributes, approximate_tokens: 30001 };
  overTarget.outcome_status = 'success';
  assert.ok(validateEvidenceRecord(overTarget).some((message) => /target|outcome|failure/i.test(message)));
});

test('writer appends deterministic canonical JSON and does not mutate the input', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'workflow-evidence-'));
  const destination = path.join(rootDir, 'evidence.jsonl');
  const record = eventRecord('context_loaded');
  const before = structuredClone(record);

  await writeEvidence(record, destination);
  await writeEvidence({
    ...eventRecord('context_loaded'),
    evidence_id: 'evidence-002',
    event_id: 'event-002',
  }, destination);

  const second = { ...record, evidence_id: 'evidence-002', event_id: 'event-002' };
  const expected = `${canonicalEvidenceJson(record)}\n${canonicalEvidenceJson(second)}\n`;
  assert.equal(await readFile(destination, 'utf8'), expected);
  assert.deepEqual(record, before);
  await rm(rootDir, { recursive: true, force: true });
});

test('writer rejects malformed records before creating or changing the destination', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'workflow-evidence-'));
  const destination = path.join(rootDir, 'evidence.jsonl');
  const invalid = eventRecord('context_loaded');
  delete invalid.correlation.measurement_id;

  await assert.rejects(writeEvidence(invalid, destination), /invalid workflow evidence/i);
  await assert.rejects(readFile(destination, 'utf8'), { code: 'ENOENT' });
  await rm(rootDir, { recursive: true, force: true });
});

test('writer refuses dispatch-receipt destinations and leaves receipts unchanged', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'workflow-evidence-'));
  const receiptPath = path.join(rootDir, 'docs/records/dispatch-receipts/evt-001.yaml');
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, 'handoff_event_id: evt-001\nstate: registered\n', 'utf8');
  const before = await readFile(receiptPath, 'utf8');

  await assert.rejects(writeEvidence(eventRecord('context_loaded'), receiptPath), /dispatch receipt/i);
  assert.equal(await readFile(receiptPath, 'utf8'), before);
  await rm(rootDir, { recursive: true, force: true });
});
