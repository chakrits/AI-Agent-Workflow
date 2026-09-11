import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Target token budgets across the 3 context tiers.
 */
export const TARGET = 30000;
export const BOOTLOADER_TARGET = 3500;
export const BOOTLOADER_FILE = 'docs/workflow/core-bootloader.md';
export const ROLE_BUDGET_TARGET = 1500;
export const ROLES_DIR = 'docs/workflow/roles';

/**
 * Canonical reading files measured by the context budget (Tier 3 Canonical Reference Library).
 * These are the docs an agent is expected to load for a typical workflow task.
 * Keep this list in sync with docs/operating-model/CONTEXT_BUDGET.md.
 * Strictly preserved for scripts/validate-edit-guards.mjs compatibility.
 */
export const CANONICAL_FILES = [
  'AGENTS.md',
  'docs/workflow/role-definitions.md',
  'docs/operating-model/SKILL_CATALOG.md',
  'docs/workflow/handoff-contract.md',
  'docs/workflow/quality-gates.md',
  'docs/workflow/dynamic-routing.md',
  'docs/operating-model/AGENT_OPERATING_MODEL.md',
  'docs/operating-model/AGENT_EVALUATION_CHECKLIST.md'
];

/**
 * Count approximate tokens in a file (character length / 4).
 * Returns 0 when the file does not exist so that the budget report
 * still prints, but a missing file is surfaced separately.
 *
 * @param {string} filePath - Absolute or repo-relative path to the file.
 * @returns {number} Approximate token count (chars / 4, floored).
 */
export function countTokens(filePath) {
  if (!existsSync(filePath)) return 0;
  const content = readFileSync(filePath, 'utf8');
  return Math.floor(content.length / 4);
}

/**
 * Collect the context budget for a list of files against a target.
 *
 * @param {Array<{path: string, label?: string}>|Array<string>} files - Files to measure.
 * @param {string} [root=process.cwd()] - Root directory to resolve relative paths against.
 * @param {number} [target=TARGET] - Token limit.
 * @returns {{rows: Array<{file: string, chars: number, tokens: number, exists: boolean}>, totalTokens: number, totalChars: number, over: boolean}}
 */
export function collectBudget(files, root = process.cwd(), target = TARGET) {
  const rows = [];
  let totalChars = 0;
  let totalTokens = 0;

  for (const entry of files) {
    const rel = typeof entry === 'string' ? entry : entry.path;
    const label = typeof entry === 'string' ? entry : (entry.label ?? entry.path);
    const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
    const exists = existsSync(abs);
    const chars = exists ? readFileSync(abs, 'utf8').length : 0;
    const tokens = Math.floor(chars / 4);

    rows.push({ file: label, chars, tokens, exists });
    totalChars += chars;
    totalTokens += tokens;
  }

  return { rows, totalTokens, totalChars, over: totalTokens > target };
}

/**
 * Collect evaluation for Tier 1: Core Bootloader.
 *
 * @param {string} [root=process.cwd()]
 * @returns {{file: string, chars: number, tokens: number, exists: boolean, over: boolean}}
 */
export function evaluateBootloader(root = process.cwd()) {
  const abs = path.isAbsolute(BOOTLOADER_FILE) ? BOOTLOADER_FILE : path.join(root, BOOTLOADER_FILE);
  const exists = existsSync(abs);
  const chars = exists ? readFileSync(abs, 'utf8').length : 0;
  const tokens = Math.floor(chars / 4);
  return {
    file: BOOTLOADER_FILE,
    chars,
    tokens,
    exists,
    over: tokens > BOOTLOADER_TARGET
  };
}

/**
 * Collect evaluation for Tier 2: Modular Role Contexts.
 *
 * @param {string} [root=process.cwd()]
 * @returns {{rows: Array<{file: string, chars: number, tokens: number, exists: boolean, over: boolean}>, over: boolean}}
 */
export function evaluateRoles(root = process.cwd()) {
  const absDir = path.isAbsolute(ROLES_DIR) ? ROLES_DIR : path.join(root, ROLES_DIR);
  const rows = [];
  let anyOver = false;

  if (existsSync(absDir)) {
    const entries = readdirSync(absDir).filter((name) => name.endsWith('.md')).sort();
    for (const name of entries) {
      const relPath = path.join(ROLES_DIR, name);
      const absPath = path.join(absDir, name);
      const chars = readFileSync(absPath, 'utf8').length;
      const tokens = Math.floor(chars / 4);
      const over = tokens > ROLE_BUDGET_TARGET;
      if (over) anyOver = true;
      rows.push({
        file: relPath,
        chars,
        tokens,
        exists: true,
        over
      });
    }
  }

  return { rows, over: anyOver };
}

/**
 * Print a table of files and their token measurements.
 */
function printTable(rows, totalChars, totalTokens, target, label) {
  console.log(`\n${label}`);
  console.log('='.repeat(label.length));
  console.log('');
  console.log('File                                                    Chars    Tokens');
  console.log('------------------------------------------------------------ -------- -------');

  for (const row of rows) {
    const file = row.file.padEnd(52);
    const chars = String(row.chars).padStart(8);
    const tokens = String(row.tokens).padStart(7);
    const flag = !row.exists ? '  (missing)' : (row.over ? '  (OVER)' : '');
    console.log(`${file} ${chars} ${tokens}${flag}`);
  }

  console.log('------------------------------------------------------------ -------- -------');
  if (totalChars !== undefined && totalTokens !== undefined) {
    console.log(`${'TOTAL'.padEnd(52)} ${String(totalChars).padStart(8)} ${String(totalTokens).padStart(7)}`);
    console.log('');
    console.log(`Target: ${target} tokens`);
  }
}

export function main() {
  const root = process.cwd();
  const args = process.argv.slice(2);

  const checkBootloader = args.includes('--bootloader') || (!args.includes('--canonical') && !args.includes('--roles'));
  const checkRoles = args.includes('--roles') || (!args.includes('--bootloader') && !args.includes('--canonical'));
  const checkCanonical = args.includes('--canonical') || (!args.includes('--bootloader') && !args.includes('--roles'));

  let failed = false;

  // Tier 1: Bootloader
  if (checkBootloader) {
    const boot = evaluateBootloader(root);
    printTable(
      [{ file: boot.file, chars: boot.chars, tokens: boot.tokens, exists: boot.exists, over: boot.over }],
      boot.chars,
      boot.tokens,
      BOOTLOADER_TARGET,
      'Tier 1: Core Bootloader'
    );
    console.log(`Status: ${boot.over ? 'OVER BUDGET' : 'within budget'} (${boot.tokens}/${BOOTLOADER_TARGET})`);
    if (boot.over) {
      console.error(`Bootloader exceeds budget: ${boot.tokens} > ${BOOTLOADER_TARGET}`);
      failed = true;
    }
  }

  // Tier 2: Roles
  if (checkRoles) {
    const roles = evaluateRoles(root);
    if (roles.rows.length > 0) {
      printTable(
        roles.rows,
        undefined,
        undefined,
        ROLE_BUDGET_TARGET,
        'Tier 2: Modular Role Contexts (max 1,500 tokens each)'
      );
      console.log(`Status: ${roles.over ? 'OVER BUDGET' : 'within budget'}`);
      if (roles.over) {
        console.error('One or more role contexts exceed the 1,500 token limit.');
        failed = true;
      }
    }
  }

  // Tier 3: Canonical Reference Library
  if (checkCanonical) {
    const { rows, totalTokens, totalChars, over } = collectBudget(CANONICAL_FILES, root, TARGET);
    printTable(rows, totalChars, totalTokens, TARGET, 'Tier 3: Canonical Reference Library');
    console.log(`Status: ${over ? 'OVER BUDGET' : 'within budget'} (${totalTokens}/${TARGET})`);
    if (over) {
      console.error('\nContext budget check FAILED: canonical reading files exceed the token target.');
      console.error('Review docs/operating-model/CONTEXT_BUDGET.md before adding content.');
      failed = true;
    }
  }

  if (failed) {
    process.exitCode = 1;
  } else {
    console.log('\nContext budget check PASSED: all evaluated tiers are within target.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
