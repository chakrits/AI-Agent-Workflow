import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalEvidenceJson, validateEvidenceRecord } from './lib/workflow-evidence.mjs';

export const DEFAULT_EVIDENCE_PATH = 'docs/records/workflow-evidence';

async function collectEvidenceFiles(target) {
  let metadata;
  try {
    metadata = await stat(target);
  } catch (error) {
    if (error.code === 'ENOENT' && !path.extname(target)) return [];
    if (error.code === 'ENOENT') return [`${target}: file does not exist`];
    throw error;
  }

  if (metadata.isFile()) return [target];
  if (!metadata.isDirectory()) return [`${target}: target must be a file or directory`];

  const files = [];
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...await collectEvidenceFiles(child));
    else if (entry.isFile() && /\.(jsonl|ndjson)$/.test(entry.name)) files.push(child);
  }
  return files.sort();
}

async function validateFile(filePath, identities) {
  const errors = [];
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === '' && index === lines.length - 1) continue;
    const location = `${filePath}:${index + 1}`;
    if (line === '') {
      errors.push(`${location}: blank JSONL line`);
      continue;
    }
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      errors.push(`${location}: invalid JSON (${error.message})`);
      continue;
    }

    const recordErrors = validateEvidenceRecord(record);
    for (const message of recordErrors) errors.push(`${location}: ${message}`);
    if (recordErrors.length === 0) {
      let canonical;
      try {
        canonical = canonicalEvidenceJson(record);
      } catch (error) {
        errors.push(`${location}: canonicalization failed (${error.message})`);
      }
      if (canonical && line !== canonical) errors.push(`${location}: record is not canonical JSON`);
    }

    if (record?.evidence_id) {
      if (identities.evidence.has(record.evidence_id)) {
        errors.push(`${location}: duplicate evidence_id ${record.evidence_id}`);
      }
      identities.evidence.add(record.evidence_id);
    }
    if (record?.event_id) {
      if (identities.event.has(record.event_id)) {
        errors.push(`${location}: duplicate event_id ${record.event_id}`);
      }
      identities.event.add(record.event_id);
    }
  }
  return errors;
}

export async function validateWorkflowEvidence(target = DEFAULT_EVIDENCE_PATH) {
  const files = await collectEvidenceFiles(target);
  if (files.some((file) => file.includes(': file does not exist') || file.includes(': target must be'))) {
    return files;
  }
  const errors = [];
  const identities = { evidence: new Set(), event: new Set() };
  for (const file of files) errors.push(...await validateFile(file, identities));
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targets = process.argv.slice(2);
  const paths = targets.length > 0 ? targets : [DEFAULT_EVIDENCE_PATH];
  const errors = [];
  for (const target of paths) errors.push(...await validateWorkflowEvidence(target));
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Workflow evidence validation passed.');
  }
}
