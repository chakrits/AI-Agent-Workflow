import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectValidationChecks } from './lib/validation-scope.mjs';

const HASH_RE = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function run(command, args, { env = process.env, input, capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    input,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit']
  });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: result.stdout ?? '' };
}

export function diffArguments(base, head) {
  if (!HASH_RE.test(base ?? '') || !HASH_RE.test(head ?? '')) return undefined;
  return ['diff', '--name-only', '--no-renames', '-z', `${base}...${head}`];
}

export function parseChangedPaths(output) {
  return output.split('\0').filter(Boolean);
}

function comparison() {
  const provider = process.env.VALIDATION_PROVIDER;
  const base = process.env.VALIDATION_BASE_SHA;
  const head = process.env.VALIDATION_HEAD_SHA;
  const args = diffArguments(base, head);
  if (!['github', 'gitlab'].includes(provider) || !args) {
    return { changedPaths: [], comparisonComplete: false, base, head };
  }
  const result = run('git', args, { env: process.env, capture: true });
  if (result.status !== 0) return { changedPaths: [], comparisonComplete: false, base, head };
  return { changedPaths: parseChangedPaths(result.stdout), comparisonComplete: true, base, head };
}

function commandParts(command, diff) {
  if (command === 'git diff --check') {
    return ['git', diff.comparisonComplete ? ['diff', '--check', `${diff.base}...${diff.head}`] : ['diff', '--check']];
  }
  if (command === 'npm test') return ['npm', ['test']];
  const npm = command.match(/^npm run ([a-zA-Z0-9:_-]+)$/);
  if (npm) return ['npm', ['run', npm[1]]];
  throw new Error(`Validation command is outside the allowlist: ${command}`);
}

export function runScopedValidations() {
  const diff = comparison();
  const selection = selectValidationChecks(diff);
  console.log(`Validation scope: ${selection.reasonCodes.join(', ') || 'none'}`);
  console.log(`Changed paths: ${diff.comparisonComplete ? diff.changedPaths.length : 'unknown'}`);
  if (!diff.comparisonComplete) console.warn('Diff comparison unavailable; running conservative checks.');
  if (selection.commands.length === 0) {
    console.log('No applicable validation commands for this complete diff.');
    return 0;
  }

  if (selection.commands.some((command) => command.startsWith('npm ')) && !existsSync('node_modules')) {
    const installEnv = { ...process.env };
    delete installEnv.GITHUB_TOKEN;
    const installArgs = ['ci', '--ignore-scripts', '--no-audit', '--no-fund'];
    if (process.env.CI_PROJECT_DIR) installArgs.push('--cache', '.npm', '--prefer-offline');
    const install = run('npm', installArgs, { env: installEnv });
    if (install.status !== 0) return install.status;
  }

  for (const selected of selection.commands) {
    const [command, args] = commandParts(selected, diff);
    const env = { ...process.env };
    delete env.GITHUB_TOKEN;
    const isReceiptValidator = selected === 'npm run validate:dispatch-receipts';
    if (isReceiptValidator && GITHUB_TOKEN) env.GITHUB_TOKEN = GITHUB_TOKEN;
    console.log(`\n> ${selected}`);
    const result = run(command, args, { env });
    if (result.status !== 0) return result.status;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = runScopedValidations();
  } catch (error) {
    console.error(`Scoped validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
