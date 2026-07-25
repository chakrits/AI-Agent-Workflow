import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CUTOVER = '2026-07-25';
const SKILL_NOTATION_RE = /Skill Used:|No matching skill —/;

/**
 * Parse TASK_LOG.md table rows into structured entries.
 * A data row starts with `| 2026-` (the date column). Header and separator
 * rows are skipped. Columns are split on `|`; the first column is the date
 * and the last column is the Notes column.
 *
 * @param {string} content - Full contents of TASK_LOG.md.
 * @returns {Array<{date: string, workItem: string, notes: string, raw: string}>}
 */
export function parseTaskLogEntries(content) {
  const lines = content.split('\n');
  const entries = [];

  for (const line of lines) {
    // Data rows start with `| 2026-` — this skips the header and separator.
    if (!line.startsWith('| 2026-')) continue;

    const cells = line.split('|').map((c) => c.trim());
    // split('|') on "| a | b |" yields ['', 'a', 'b', ''] — drop the two empties.
    const trimmed = cells.slice(1, -1);
    if (trimmed.length < 2) continue;

    const date = trimmed[0];
    const workItem = trimmed[1] ?? '';
    const notes = trimmed[trimmed.length - 1] ?? '';

    entries.push({ date, workItem, notes, raw: line });
  }

  return entries;
}

/**
 * Returns true if a date string is on or after the cutover date.
 * ISO date strings (YYYY-MM-DD) compare correctly lexicographically.
 *
 * @param {string} date - ISO date string (e.g. "2026-07-25").
 * @param {string} [cutoff=CUTOVER] - ISO cutover date.
 * @returns {boolean}
 */
export function isNewEntry(date, cutoff = CUTOVER) {
  return date >= cutoff;
}

/**
 * Returns true if the Notes column contains one of the accepted skill
 * notation markers: `Skill Used:` or `No matching skill —`.
 *
 * @param {string} notes - The Notes column text.
 * @returns {boolean}
 */
export function hasSkillNotation(notes) {
  return SKILL_NOTATION_RE.test(notes);
}

/**
 * Validate that every TASK_LOG.md entry on or after the cutover date
 * carries skill notation in its Notes column.
 *
 * @param {string} root - Repository root directory.
 * @returns {{ total: number, checked: number, violations: Array<{date,workItem,raw}>, passed: boolean }}
 */
export function validateSkillUsage(root = process.cwd()) {
  const taskLogPath = path.join(root, 'TASK_LOG.md');
  if (!existsSync(taskLogPath)) {
    return { total: 0, checked: 0, violations: [], passed: true };
  }

  const content = readFileSync(taskLogPath, 'utf8');
  const entries = parseTaskLogEntries(content);

  const violations = [];
  for (const entry of entries) {
    if (!isNewEntry(entry.date)) continue;
    if (!hasSkillNotation(entry.notes)) {
      violations.push(entry);
    }
  }

  return {
    total: entries.length,
    checked: entries.filter((e) => isNewEntry(e.date)).length,
    violations,
    passed: violations.length === 0
  };
}

function main() {
  const result = validateSkillUsage(process.cwd());

  console.log('Skill-Usage Audit Report');
  console.log('=========================');
  console.log(`Total TASK_LOG entries:            ${result.total}`);
  console.log(`Entries on/after ${CUTOVER}:        ${result.checked}`);
  console.log(`Entries missing skill notation:    ${result.violations.length}`);

  if (result.violations.length > 0) {
    console.error('\nSkill-usage check FAILED: new entries missing skill notation:');
    for (const v of result.violations) {
      console.error(`  ${v.date}  ${v.workItem}`);
    }
    console.error('\nEach TASK_LOG entry on or after ' + CUTOVER +
      ' must include "Skill Used: <name>" or "No matching skill — <rationale>" in the Notes column.');
    process.exitCode = 1;
  } else {
    console.log('\nSkill-usage check PASSED: all new entries carry skill notation.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
