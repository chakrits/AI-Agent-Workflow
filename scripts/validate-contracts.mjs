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

function hasMeaningfulValue(value) {
  if (value === null || value === false) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(hasMeaningfulValue);
  }
  if (typeof value === 'object') {
    const values = Object.values(value);
    return values.length > 0 && values.every(hasMeaningfulValue);
  }
  return true;
}

function validateHistory(policy, state, displayPath) {
  const errors = [];
  const transitions = new Map(
    policy.transitions.map((transition) => [`${transition.from} -> ${transition.to}`, transition])
  );
  const reworks = state.history.filter(
    (event) => event.from === 'verifying' && event.to === 'rework'
  ).length;

  if (state.history.length === 0 && state.state !== 'intake') {
    errors.push(`${displayPath}: non-intake state requires history`);
  }
  if (state.history.length > 0 && state.history[0].from !== 'intake') {
    errors.push(`${displayPath}: history must start at intake`);
  }

  for (const [index, event] of state.history.entries()) {
    const previousEvent = state.history[index - 1];
    if (previousEvent && previousEvent.to !== event.from) {
      errors.push(`${displayPath}: history must be continuous`);
    }
    const transition = transitions.get(eventKey(event));
    if (!transition) {
      errors.push(`${displayPath}: illegal transition: ${eventKey(event)}`);
      continue;
    }
    for (const evidence of transition.requires) {
      if (!event.evidence_refs.includes(evidence)) {
        errors.push(`${displayPath}: ${eventKey(event)} requires evidence ${evidence}`);
      }
      if (!hasMeaningfulValue(state.evidence[evidence])) {
        errors.push(`${displayPath}: evidence ${evidence} must have a meaningful value`);
      }
    }
    for (const evidence of event.evidence_refs) {
      if (!Object.hasOwn(state.evidence, evidence)) {
        errors.push(`${displayPath}: evidence ${evidence} must exist in evidence map`);
      }
    }
    if (transition.terminal_requirements) {
      const requirements = transition.terminal_requirements;
      if (state.rework_count !== requirements.rework_count) {
        errors.push(
          `${displayPath}: ${eventKey(event)} is allowed only after exactly ${requirements.rework_count} rework transitions`
        );
      }
      if (
        index !== state.history.length - 1 ||
        state.state !== requirements.state ||
        state.stop_reason !== requirements.stop_reason ||
        state.next_route !== requirements.next_route ||
        Object.entries(requirements.evidence).some(
          ([key, value]) => state.evidence[key] !== value
        )
      ) {
        errors.push(
          `${displayPath}: ${eventKey(event)} requires terminal blocked state, human_review_required stop reason, human-reviewer route, and human_review_required: true`
        );
      }
    }
  }
  if (state.history.length > 0 && state.history.at(-1).to !== state.state) {
    errors.push(`${displayPath}: final history transition must reach state ${state.state}`);
  }
  if (state.max_rework_attempts !== policy.max_rework_attempts) {
    errors.push(
      `${displayPath}: max_rework_attempts must equal policy value ${policy.max_rework_attempts}`
    );
  }
  if (reworks !== state.rework_count) {
    errors.push(`${displayPath}: rework_count must equal history rework transitions`);
  }
  if (reworks > policy.max_rework_attempts) {
    errors.push(`${displayPath}: rework_count must not exceed ${policy.max_rework_attempts}`);
  }
  if (state.state === 'blocked' && reworks === policy.max_rework_attempts) {
    const terminalEvent = state.history.at(-1);
    const hasTerminalHumanReview =
      terminalEvent?.from === 'verifying' &&
      terminalEvent.to === 'blocked' &&
      terminalEvent.evidence_refs.includes('human_review_required') &&
      state.evidence.human_review_required === true;
    if (!hasTerminalHumanReview) {
      errors.push(
        `${displayPath}: blocked task after retry limit requires terminal verifying -> blocked with human_review_required: true`
      );
    }
    if (state.stop_reason !== 'human_review_required') {
      errors.push(`${displayPath}: blocked task after retry limit requires human_review_required`);
    }
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
