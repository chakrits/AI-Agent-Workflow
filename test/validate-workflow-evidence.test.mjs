import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { canonicalEvidenceJson } from '../scripts/lib/workflow-evidence.mjs';
import { validateWorkflowEvidence } from '../scripts/validate-workflow-evidence.mjs';

const execFileAsync = promisify(execFile);
const digest = 'a'.repeat(64);

function validRecord(overrides = {}) {
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
      token_measurement_status: 'not_requested',
    },
    digest_ref: `sha256:${digest}`,
    evidence_ref: 'docs/records/qa/issue-183-evidence.md#event-001',
    recorded_by: 'Developer Agent',
    ...overrides,
  };
}

test('validator accepts writer-shaped canonical JSONL and rejects duplicate event identities', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'validate-workflow-evidence-'));
  const filePath = path.join(rootDir, 'evidence.jsonl');
  const first = validRecord();
  const second = validRecord({ evidence_id: 'evidence-002', event_id: 'event-002' });
  await writeFile(filePath, `${canonicalEvidenceJson(first)}\n${canonicalEvidenceJson(second)}\n`, 'utf8');

  assert.deepEqual(await validateWorkflowEvidence(filePath), []);
  await writeFile(filePath, `${canonicalEvidenceJson(first)}\n${canonicalEvidenceJson(first)}\n`, 'utf8');
  const errors = await validateWorkflowEvidence(filePath);
  assert.ok(errors.some((message) => /duplicate.*(evidence_id|event_id)/i.test(message)));
  await rm(rootDir, { recursive: true, force: true });
});

test('validator fails closed for malformed JSON and non-canonical records', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'validate-workflow-evidence-'));
  const malformedPath = path.join(rootDir, 'malformed.jsonl');
  await writeFile(malformedPath, '{not-json}\n', 'utf8');
  assert.ok((await validateWorkflowEvidence(malformedPath)).some((message) => /invalid JSON/i.test(message)));

  const nonCanonicalPath = path.join(rootDir, 'non-canonical.jsonl');
  const record = validRecord();
  await writeFile(nonCanonicalPath, `${JSON.stringify(record)}\n`, 'utf8');
  assert.ok((await validateWorkflowEvidence(nonCanonicalPath)).some((message) => /canonical/i.test(message)));
  await rm(rootDir, { recursive: true, force: true });
});

test('validator command returns non-zero for invalid evidence and zero for valid evidence', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'validate-workflow-evidence-'));
  const validPath = path.join(rootDir, 'valid.jsonl');
  const invalidPath = path.join(rootDir, 'invalid.jsonl');
  const record = validRecord();
  await writeFile(validPath, `${canonicalEvidenceJson(record)}\n`, 'utf8');
  await writeFile(invalidPath, `${JSON.stringify({ ...record, event_type: 'route_selected' })}\n`, 'utf8');

  await execFileAsync(process.execPath, ['scripts/validate-workflow-evidence.mjs', validPath], {
    cwd: process.cwd(),
  });
  await assert.rejects(
    execFileAsync(process.execPath, ['scripts/validate-workflow-evidence.mjs', invalidPath], {
      cwd: process.cwd(),
    }),
    /workflow evidence|event_type/i,
  );
  await rm(rootDir, { recursive: true, force: true });
});
