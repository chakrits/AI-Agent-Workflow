import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';
import { validateEnvelopeSchema } from './lib/task-state-machine.mjs';

async function readYaml(file) {
  return YAML.parse(await readFile(file, 'utf8'));
}

async function examplePaths(rootDir) {
  const directory = path.join(rootDir, 'docs/contracts/examples');
  return (await readdir(directory))
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => path.join('docs/contracts/examples', name));
}

export async function activeShardPaths(rootDir) {
  const directory = path.join(rootDir, 'docs/records/work-items');
  if (!(await access(directory).then(() => true).catch(() => false))) return [];
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
    .map((entry) => path.join('docs/records/work-items', entry.name, 'task-state.json'));
}

export async function validateActiveShards(rootDir) {
  const paths = await activeShardPaths(rootDir);
  const errors = [];
  let validated = 0;
  for (const relativePath of paths) {
    const fullPath = path.join(rootDir, relativePath);
    let state;
    try { state = JSON.parse(await readFile(fullPath, 'utf8')); } catch (err) { errors.push(`${relativePath}: MALFORMED_SHARD (${err.message})`); continue; }
    try {
      validateEnvelopeSchema(state);
      if (state.policy_contract_version !== 1) errors.push(`${relativePath}: policy_contract_version does not match bug-fix policy`);
      if (state.sequence_number !== state.history.length + 1) errors.push(`${relativePath}: sequence_number must equal history.length + 1`);
      validated += 1;
    } catch (err) { errors.push(`${relativePath}: ${err.code || 'MALFORMED_SHARD'}: ${err.message}`); }
  }
  return { errors, validated, discovered: paths.length };
}

async function loadPolicies(rootDir) {
  const contractDir = path.join(rootDir, 'docs/contracts');
  const policyFiles = (await readdir(contractDir))
    .filter((name) => name.endsWith('-workflow.yaml'))
    .map((name) => path.join(contractDir, name));
  const policies = {};
  for (const file of policyFiles) {
    const policy = await readYaml(file);
    policies[policy.workflow_id] = policy;
  }
  return policies;
}

async function loadSchemas(rootDir) {
  const schemaDir = path.join(rootDir, 'docs/contracts/schemas');
  const schemaFiles = (await readdir(schemaDir))
    .filter((name) => name.endsWith('-state.schema.json'))
    .map((name) => path.join(schemaDir, name));
  const schemas = {};
  for (const file of schemaFiles) {
    const schema = JSON.parse(await readFile(file, 'utf8'));
    // Map schema filename to workflow_id:
    //   task-state.schema.json  -> bug-fix
    //   new-feature-state.schema.json -> new-feature
    const basename = path.basename(file, '-state.schema.json');
    const workflowId = basename === 'task' ? 'bug-fix' : basename;
    schemas[workflowId] = schema;
  }
  return schemas;
}

function eventKey(event) {
  return `${event.from} -> ${event.to}`;
}

function hasMeaningfulValue(value) {
  if (value === undefined || value === null || value === false) {
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

// The state name that precedes `rework` is contract-specific (bug-fix/
// new-feature call it "verifying"; config-change calls it "monitoring";
// data-change calls it "validating"). Derived from the policy's own
// transitions rather than hardcoded, so this generalizes to any contract
// shape instead of silently misfiring for one whose pre-rework state isn't
// literally named "verifying".
function reworkSourceStates(policy) {
  return new Set(policy.transitions.filter((transition) => transition.to === 'rework').map((transition) => transition.from));
}

// A transition's optional `when` clause branches the same `from` state on an
// evidence field's value -- e.g. Config Change's risk_tier (single value) or
// Data Change's data_change_kind (a combinable set, hence the `_includes`/
// `_excludes` suffix forms). This catches an instance that takes a branch
// inconsistent with its own recorded evidence (e.g. risk_tier: medium but
// took the low-risk fast-track transition anyway).
function validateWhenClause(transition, event, state, displayPath, snapshot = null) {
  if (!transition.when) return [];
  const errors = [];
  for (const [key, expected] of Object.entries(transition.when)) {
    if (key.endsWith('_includes')) {
      const field = key.slice(0, -'_includes'.length);
      const actual = (snapshot ?? state.evidence)[field];
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        errors.push(
          `${displayPath}: ${eventKey(event)} requires evidence ${field} to include "${expected}" (got ${JSON.stringify(actual)})`
        );
      }
    } else if (key.endsWith('_excludes')) {
      const field = key.slice(0, -'_excludes'.length);
      const actual = (snapshot ?? state.evidence)[field];
      if (Array.isArray(actual) && actual.includes(expected)) {
        errors.push(`${displayPath}: ${eventKey(event)} requires evidence ${field} to exclude "${expected}"`);
      }
    } else {
      const actual = (snapshot ?? state.evidence)[key];
      if (actual !== expected) {
        errors.push(
          `${displayPath}: ${eventKey(event)} requires evidence ${key} to equal "${expected}" (got ${JSON.stringify(actual)})`
        );
      }
    }
    const field = key.replace(/_(includes|excludes)$/, '');
    if (!snapshot && Object.hasOwn(state, field)) {
      const actual = state[field];
      const matches = key.endsWith('_includes') ? Array.isArray(actual) && actual.includes(expected)
        : key.endsWith('_excludes') ? !Array.isArray(actual) || !actual.includes(expected)
          : actual === expected;
      if (!matches) errors.push(`${displayPath}: ${eventKey(event)} top-level ${field} does not satisfy when-clause ${key}`);
    }
  }
  return errors;
}

const AUTHORITATIVE_FIELDS = ['change_type', 'risk_level', 'risk_tier', 'contains_pii', 'data_change_kind'];
const REMEDIATION_HOLD_STATES = new Set(['discovery', 'designing', 'rework', 'blocked']);

function validateTopLevelEvidenceParity(state, displayPath) {
  const normalize = (value) => Array.isArray(value) ? [...new Set(value)].sort() : value;
  return AUTHORITATIVE_FIELDS.flatMap((field) => {
    if (!Object.hasOwn(state, field) || !Object.hasOwn(state.evidence, field)) return [];
    if (JSON.stringify(normalize(state[field])) === JSON.stringify(normalize(state.evidence[field]))) return [];
    return [`${displayPath}: top-level ${field} (${JSON.stringify(state[field])}) does not match evidence.${field} (${JSON.stringify(state.evidence[field])})`];
  });
}

function selectTransitionBranch(candidates, prefix, event, workflowId) {
  if (!candidates || candidates.length <= 1) return candidates?.[0];
  if (workflowId !== 'new-feature' || event.from !== 'planning' || event.to !== 'implementing') return candidates[0];
  const episodeStart = prefix.findLastIndex((item) => item.to === 'discovery');
  const hasDesign = prefix.slice(episodeStart + 1).some((item) => item.from === 'designing' && item.to === 'planning');
  return candidates.find((candidate) => hasDesign ? !candidate.when : Boolean(candidate.when));
}

function validateFastTrackHistory(policy, transition, event, index, state, displayPath) {
  const errors = [];
  const remediated = state.history.slice(index + 1).some((later) => later.from === 'designing' && later.to === 'planning');
  const held = REMEDIATION_HOLD_STATES.has(state.state);
  if (transition.historical_only === true) {
    if (policy.sunset_effective_at !== undefined) {
      const cutoff = Date.parse(policy.sunset_effective_at);
      const instant = Date.parse(event.at);
      if (!Number.isFinite(cutoff)) errors.push(`${displayPath}: invalid policy.sunset_effective_at "${policy.sunset_effective_at}"`);
      else if (!Number.isFinite(instant)) errors.push(`${displayPath}: invalid event timestamp "${event.at}" at history[${index}]`);
      else if (instant > cutoff) errors.push(`${displayPath}: ${eventKey(event)} at history[${index}] occurred at ${event.at}, after sunset_effective_at (${policy.sunset_effective_at}); fast-track is disabled for new entries`);
    }
    if (!remediated && !held && state.state !== 'release') {
      errors.push(`${displayPath}: ${eventKey(event)} at history[${index}] is marked historical_only (fast-track disabled for active/new work items; route through designing -> planning before state "${state.state}")`);
    }
  }
  const currentErrors = validateWhenClause(transition, event, state, displayPath);
  if (!event.classification_snapshot) return [...errors, ...currentErrors];
  errors.push(...validateWhenClause(transition, event, state, displayPath, event.classification_snapshot));
  if (currentErrors.length) {
    const hasReason = ['risk_escalation_reason', 'redesign_scope', 'design_gap', 'requirement_gap']
      .some((field) => hasMeaningfulValue(state.evidence[field]));
    if (!hasReason) errors.push(`${displayPath}: fast-track escalation requires a meaningful risk_escalation_reason, redesign_scope, design_gap, or requirement_gap`);
    if (!remediated && !held) errors.push(`${displayPath}: unremediated fast-track escalation at history[${index}] (${eventKey(event)}): current classification no longer satisfies fast-track when-clause and requires routing through designing -> planning before state "${state.state}"`);
  }
  return errors;
}

function validateHistory(policy, state, displayPath) {
  const errors = validateTopLevelEvidenceParity(state, displayPath);
  const transitions = new Map();
  for (const transition of policy.transitions) {
    const key = eventKey(transition);
    if (!transitions.has(key)) transitions.set(key, []);
    transitions.get(key).push(transition);
  }
  const reworkSources = reworkSourceStates(policy);
  const reworks = state.history.filter(
    (event) => reworkSources.has(event.from) && event.to === 'rework'
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
    const transition = selectTransitionBranch(transitions.get(eventKey(event)), state.history.slice(0, index), event, policy.workflow_id);
    if (!transition) {
      errors.push(`${displayPath}: illegal transition: ${eventKey(event)}`);
      continue;
    }
    errors.push(...(policy.workflow_id === 'new-feature' && transition.when
      ? validateFastTrackHistory(policy, transition, event, index, state, displayPath)
      : validateWhenClause(transition, event, state, displayPath)));
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
      terminalEvent &&
      reworkSources.has(terminalEvent.from) &&
      terminalEvent.to === 'blocked' &&
      terminalEvent.evidence_refs.includes('human_review_required') &&
      state.evidence.human_review_required === true;
    if (!hasTerminalHumanReview) {
      errors.push(
        `${displayPath}: blocked task after retry limit requires a terminal rework-source-state -> blocked transition with human_review_required: true`
      );
    }
    if (state.stop_reason !== 'human_review_required') {
      errors.push(`${displayPath}: blocked task after retry limit requires human_review_required`);
    }
  }
  return errors;
}

export async function validateContracts(rootDir, statePaths = []) {
  const policies = await loadPolicies(rootDir);
  const schemas = await loadSchemas(rootDir);
  const validateSchema = {};
  for (const [workflowId, schema] of Object.entries(schemas)) {
    validateSchema[workflowId] = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  }
  const paths = statePaths.length ? statePaths : await examplePaths(rootDir);
  const errors = [];

  for (const relativePath of paths) {
    const state = await readYaml(path.join(rootDir, relativePath));
    const workflowId = state.workflow_id;
    const policy = policies[workflowId];
    const validator = validateSchema[workflowId];

    if (!policy) {
      errors.push(`${relativePath}: unknown workflow_id ${workflowId}`);
      continue;
    }
    if (!validator) {
      errors.push(`${relativePath}: no schema for workflow_id ${workflowId}`);
      continue;
    }
    if (!validator(state)) {
      errors.push(
        `${relativePath}: ${validator.errors.map((error) => error.message).join(', ')}`
      );
      continue;
    }
    if (state.contract_version !== policy.contract_version) {
      errors.push(`${relativePath}: contract_version does not match policy`);
      continue;
    }
    errors.push(...validateHistory(policy, state, relativePath));
  }
  // The active durable-envelope lane is intentionally separate from the
  // legacy example lane. It is enabled once migration has produced v2 shards;
  // pre-migration v1 records remain covered by the legacy policy lane.
  if (!statePaths.length) {
    const active = await activeShardPaths(rootDir);
    const activeStates = await Promise.all(active.map(async (p) => {
      try { return JSON.parse(await readFile(path.join(rootDir, p), 'utf8')); } catch { return null; }
    }));
    if (active.length && activeStates.every((state) => state && state.contract_version === 2)) {
      const result = await validateActiveShards(rootDir);
      errors.push(...result.errors);
    }
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
