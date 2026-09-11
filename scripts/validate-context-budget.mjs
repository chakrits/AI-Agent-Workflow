import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Maximum number of tokens (approximate) that the canonical reading
 * files may collectively occupy. The approximation divides total
 * character count by 4, which is a conservative rule-of-thumb for
 * English prose in UTF-8. Adjust the TARGET only after updating
 * docs/operating-model/CONTEXT_BUDGET.md.
 */
export const TARGET = 30000;

/**
 * Canonical reading files measured by the context budget. These are
 * the docs an agent is expected to load for a typical workflow task.
 * Keep this list in sync with docs/operating-model/CONTEXT_BUDGET.md.
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
 * Collect the context budget for a list of files.
 *
 * @param {Array<{path: string, label?: string}>} files - Files to measure.
 *   Each entry may carry an optional `label` for display; otherwise the
 *   path is used.
 * @param {string} [root=process.cwd()] - Root directory to resolve
 *   relative paths against.
 * @returns {{rows: Array<{file: string, chars: number, tokens: number, exists: boolean}>, totalTokens: number, totalChars: number, over: boolean}}
 */
export function collectBudget(files, root = process.cwd()) {
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

  return { rows, totalTokens, totalChars, over: totalTokens > TARGET };
}

function main() {
  const root = process.cwd();
  const { rows, totalTokens, totalChars, over } = collectBudget(CANONICAL_FILES, root);

  console.log('Context Budget Report');
  console.log('=====================');
  console.log('');
  console.log('File                                                    Chars    Tokens');
  console.log('------------------------------------------------------------ -------- -------');

  for (const row of rows) {
    const file = row.file.padEnd(52);
    const chars = String(row.chars).padStart(8);
    const tokens = String(row.tokens).padStart(7);
    const flag = row.exists ? '' : '  (missing)';
    console.log(`${file} ${chars} ${tokens}${flag}`);
  }

  console.log('------------------------------------------------------------ -------- -------');
  console.log(`${'TOTAL'.padEnd(52)} ${String(totalChars).padStart(8)} ${String(totalTokens).padStart(7)}`);
  console.log('');
  console.log(`Target: ${TARGET} tokens`);
  console.log(`Status: ${over ? 'OVER BUDGET' : 'within budget'} (${totalTokens}/${TARGET})`);

  if (over) {
    console.error('\nContext budget check FAILED: canonical reading files exceed the token target.');
    console.error('Review docs/operating-model/CONTEXT_BUDGET.md before adding content.');
    process.exitCode = 1;
  } else {
    console.log('\nContext budget check PASSED: canonical reading files are within target.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
