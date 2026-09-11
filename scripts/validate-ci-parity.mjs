import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const GITHUB_VALIDATE_WORKFLOW = '.github/workflows/validate-contracts.yml';
const GITHUB_VALIDATE_JOB = 'validate';
const GITLAB_CI = '.gitlab-ci.yml';

/**
 * Commands the GitHub validate job runs that GitLab deliberately does not.
 *
 * Each entry is `{ command, reason }`. An entry is a recorded decision that a
 * host asymmetry is intended, not a default: `findMissingFromGitlab` rejects an
 * entry with no reason, and rejects one naming a command the GitHub validate job
 * does not run, so a stale exemption is reported rather than sitting inert.
 */
export const HOST_ONLY_COMMANDS = [];

/**
 * Commands that are not validators and are expected on one host only.
 * `npm ci` differs by host (GitLab passes cache flags) and `npm test` is run by
 * both under different job names, so neither is a useful parity signal.
 */
const IGNORED_COMMAND_RE = /^(?:npm (?:ci|install|test)\b|npx --version)/;

/**
 * Normalises a shell step to the command this check compares.
 *
 * Only the invocation shape matters, so `npm run x -- --strict` and `npm run x`
 * compare equal. `node scripts/x.mjs` and `npx x` are included because a
 * validator invoked either way is still a gate; matching only `npm run` let a
 * whole class of steps pass unseen.
 */
export function normaliseCommand(step) {
  if (typeof step !== 'string') return undefined;
  const text = step.trim();
  if (!text || text.startsWith('#')) return undefined;
  if (IGNORED_COMMAND_RE.test(text)) return undefined;

  const npmRun = text.match(/\bnpm run ([a-zA-Z0-9:_-]+)/);
  if (npmRun) return `npm run ${npmRun[1]}`;

  const nodeScript = text.match(/\bnode (scripts\/[\w./-]+)/);
  if (nodeScript) return `node ${nodeScript[1]}`;

  const npx = text.match(/\bnpx ([a-zA-Z0-9@/._-]+)/);
  if (npx) return `npx ${npx[1]}`;

  return undefined;
}

function readYaml(filePath) {
  if (!existsSync(filePath)) return undefined;
  try {
    return parse(readFileSync(filePath, 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Commands run by one named job of a GitHub workflow.
 *
 * Scoped to a single job on purpose: a GitHub-only publish job in the same file
 * must not be reported as something GitLab is failing to run. But scoping by
 * name creates its own failure mode — a renamed or restructured job resolves to
 * `undefined` the same way a genuinely job-less workflow would, and comparing
 * an empty set against anything reports a vacuous PASS. A renamed job must fail
 * the check, not silently disable it, so a missing/malformed `steps` throws.
 *
 * That guard alone is not enough (CR-1115): a job whose `steps` array exists
 * but resolves to zero recognised commands — extracted into a composite
 * action, reduced to `steps: []`, or left with only `uses:` steps — reaches
 * the same silent-PASS outcome through a shape `!Array.isArray` never catches.
 * A validate job with nothing to compare is exactly as broken as one that
 * cannot be found, so both throw through the same path.
 */
export function githubJobCommands(filePath, jobName = GITHUB_VALIDATE_JOB) {
  const doc = readYaml(filePath);
  const steps = doc?.jobs?.[jobName]?.steps;
  if (!Array.isArray(steps)) {
    throw new Error(
      `CI parity check cannot run: job "${jobName}" was not found (or has no steps) in ${filePath}. ` +
        'If the job was renamed or restructured, update GITHUB_VALIDATE_JOB rather than let this check compare nothing.'
    );
  }
  const commands = new Set();
  for (const step of steps) {
    const command = normaliseCommand(step?.run);
    if (command) commands.add(command);
  }
  if (commands.size === 0) {
    throw new Error(
      `CI parity check cannot run: job "${jobName}" in ${filePath} yielded no comparable commands. ` +
        'If the job was restructured (e.g. into a composite action), update GITHUB_VALIDATE_JOB or this ' +
        'check rather than let a job with nothing to compare report a vacuous PASS.'
    );
  }
  return commands;
}

/**
 * Commands run by any GitLab job.
 *
 * Parsed rather than regex-scanned so that a step commented out with `#` is not
 * counted as coverage: commenting out a flaky job is a routine edit, and it must
 * not silently reopen the drift this check exists to prevent.
 */
export function gitlabCommands(filePath) {
  const doc = readYaml(filePath);
  if (!doc || typeof doc !== 'object') return new Set();
  const commands = new Set();
  for (const [key, job] of Object.entries(doc)) {
    if (key.startsWith('.') || !job || typeof job !== 'object') continue;
    for (const field of ['before_script', 'script', 'after_script']) {
      for (const step of [].concat(job[field] ?? [])) {
        const command = normaliseCommand(step);
        if (command) commands.add(command);
      }
    }
  }
  return commands;
}

export function findMissingFromGitlab(root = process.cwd(), { hostOnly = HOST_ONLY_COMMANDS } = {}) {
  const github = githubJobCommands(path.join(root, GITHUB_VALIDATE_WORKFLOW));
  const gitlab = gitlabCommands(path.join(root, GITLAB_CI));

  const exempt = new Set();
  for (const entry of hostOnly) {
    const command = typeof entry === 'string' ? entry : entry?.command;
    const reason = typeof entry === 'string' ? undefined : entry?.reason;
    if (!command) throw new Error('CI parity exemption: every entry needs a command');
    if (!reason) {
      throw new Error(`CI parity exemption for "${command}" needs a reason; an exemption without one is an oversight, not a decision`);
    }
    if (!github.has(command)) {
      throw new Error(`CI parity exemption for "${command}" is stale: it is not run by the GitHub validate job`);
    }
    exempt.add(command);
  }

  return [...github].filter((command) => !gitlab.has(command) && !exempt.has(command)).sort();
}

function main() {
  const root = process.cwd();
  let github;
  let gitlab;
  let missing;
  try {
    github = githubJobCommands(path.join(root, GITHUB_VALIDATE_WORKFLOW));
    gitlab = gitlabCommands(path.join(root, GITLAB_CI));
    missing = findMissingFromGitlab(root);
  } catch (error) {
    console.error(`CI parity check FAILED: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log('CI parity check');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`GitHub "${GITHUB_VALIDATE_JOB}" job runs:  ${github.size} command(s)`);
  console.log(`GitLab CI runs:              ${gitlab.size} command(s)`);
  console.log(`Deliberate host-only:        ${HOST_ONLY_COMMANDS.length}`);
  console.log('─────────────────────────────────────────────────────────');
  console.log('Scope: this compares which commands run, not when they run. A job');
  console.log('whose triggers are narrowed on one host is not detected here.');
  console.log('─────────────────────────────────────────────────────────');

  if (missing.length === 0) {
    console.log('CI parity check PASSED: GitLab runs every command the GitHub validate job enforces.');
    return;
  }

  console.error(`CI parity check FAILED: ${missing.length} command(s) run on GitHub but not on GitLab:`);
  for (const command of missing) console.error(`  - ${command}`);
  console.error(
    `\nA GitLab-hosted clone is therefore gated more weakly than a GitHub-hosted one. ` +
      `Add each to ${GITLAB_CI}, or record it in HOST_ONLY_COMMANDS with a reason if the asymmetry is intended.`
  );
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
