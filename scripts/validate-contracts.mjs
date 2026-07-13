import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';

async function readYaml(file) {
  return YAML.parse(await readFile(file, 'utf8'));
}

async function examplePaths(rootDir) {
  const directory = path.join(rootDir, 'docs/contracts/examples');
  return (await readdir(directory))
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => path.join('docs/contracts/examples', name));
}

function eventKey(event) {
  return `${event.from} -> ${event.to}`;
}

function validateHistory(policy, state, displayPath) {
  const errors = [];
  const transitions = new Map(
    policy.transitions.map((transition) => [`${transition.from} -> ${transition.to}`, transition])
  );
  const reworks = state.history.filter(
    (event) => event.from === 'verifying' && event.to === 'rework'
  ).length;

  for (const event of state.history) {
    const transition = transitions.get(eventKey(event));
    if (!transition) {
      errors.push(`${displayPath}: illegal transition: ${eventKey(event)}`);
      continue;
    }
    for (const evidence of transition.requires) {
      if (!event.evidence_refs.includes(evidence)) {
        errors.push(`${displayPath}: ${eventKey(event)} requires evidence ${evidence}`);
      }
    }
  }
  if (reworks !== state.rework_count) {
    errors.push(`${displayPath}: rework_count must equal history rework transitions`);
  }
  if (reworks > policy.max_rework_attempts) {
    errors.push(`${displayPath}: rework_count must not exceed ${policy.max_rework_attempts}`);
  }
  if (
    state.state === 'blocked' &&
    reworks === policy.max_rework_attempts &&
    state.stop_reason !== 'human_review_required'
  ) {
    errors.push(`${displayPath}: blocked task after retry limit requires human_review_required`);
  }
  return errors;
}

export async function validateContracts(rootDir, statePaths = []) {
  const contractDir = path.join(rootDir, 'docs/contracts');
  const policy = await readYaml(path.join(contractDir, 'bug-fix-workflow.yaml'));
  const schema = JSON.parse(
    await readFile(path.join(contractDir, 'schemas/task-state.schema.json'), 'utf8')
  );
  const validateSchema = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  const paths = statePaths.length ? statePaths : await examplePaths(rootDir);
  const errors = [];

  for (const relativePath of paths) {
    const state = await readYaml(path.join(rootDir, relativePath));
    if (!validateSchema(state)) {
      errors.push(
        `${relativePath}: ${validateSchema.errors.map((error) => error.message).join(', ')}`
      );
      continue;
    }
    if (state.workflow_id !== policy.workflow_id || state.contract_version !== policy.contract_version) {
      errors.push(`${relativePath}: workflow_id or contract_version does not match policy`);
      continue;
    }
    errors.push(...validateHistory(policy, state, relativePath));
  }
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validateContracts(process.cwd());
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Contract validation passed.');
  }
}
