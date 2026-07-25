import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PR_REF_RE = /#[0-9]+/g;
const TIMEOUT_RE = /timeout|timed[_ ]out/i;
const REWORK_RE = /rework/i;
const ADR_RE = /^### ADR-/;
const RISK_RE = /^\| R-/;
const RISK_OPEN_RE = /\| Open \|/i;
const RISK_CLOSED_RE = /\| Closed/i;

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
    if (!line.startsWith('| 2026-')) continue;

    const cells = line.split('|').map((c) => c.trim());
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
 * Count entries whose Notes column contains a timeout indicator.
 *
 * @param {Array<{notes: string}>} entries - Parsed TASK_LOG entries.
 * @returns {number}
 */
export function countTimeouts(entries) {
  let count = 0;
  for (const entry of entries) {
    if (TIMEOUT_RE.test(entry.notes)) count += 1;
  }
  return count;
}

/**
 * Count entries whose Notes column contains a rework indicator.
 *
 * @param {Array<{notes: string}>} entries - Parsed TASK_LOG entries.
 * @returns {number}
 */
export function countReworks(entries) {
  let count = 0;
  for (const entry of entries) {
    if (REWORK_RE.test(entry.notes)) count += 1;
  }
  return count;
}

/**
 * Count unique PR references (#NN) across all entries' raw text.
 *
 * @param {Array<{raw: string}>} entries - Parsed TASK_LOG entries.
 * @returns {number}
 */
export function countPrReferences(entries) {
  const refs = new Set();
  for (const entry of entries) {
    const matches = entry.raw.match(PR_REF_RE) ?? [];
    for (const m of matches) refs.add(m);
  }
  return refs.size;
}

function readSafe(filePath) {
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
}

function countNpmScripts(root) {
  const pkgPath = path.join(root, 'package.json');
  const content = readSafe(pkgPath);
  if (!content) return 0;
  try {
    const pkg = JSON.parse(content);
    return Object.keys(pkg.scripts ?? {}).length;
  } catch {
    return 0;
  }
}

function countTestFiles(root) {
  const testDir = path.join(root, 'test');
  if (!existsSync(testDir)) return 0;
  let count = 0;
  for (const entry of readdirSync(testDir)) {
    if (entry.endsWith('.test.mjs')) count += 1;
  }
  return count;
}

function countAdrs(root) {
  const content = readSafe(path.join(root, 'DECISIONS.md'));
  if (!content) return 0;
  let count = 0;
  for (const line of content.split('\n')) {
    if (ADR_RE.test(line)) count += 1;
  }
  return count;
}

function countRisks(root) {
  const content = readSafe(path.join(root, 'RISKS.md'));
  if (!content) return { total: 0, open: 0, closed: 0 };
  let total = 0;
  let open = 0;
  let closed = 0;
  for (const line of content.split('\n')) {
    if (!RISK_RE.test(line)) continue;
    total += 1;
    if (RISK_CLOSED_RE.test(line)) closed += 1;
    else if (RISK_OPEN_RE.test(line)) open += 1;
  }
  return { total, open, closed };
}

function countContracts(root) {
  const contractsDir = path.join(root, 'docs', 'contracts');
  if (!existsSync(contractsDir)) return 0;
  let count = 0;
  for (const entry of readdirSync(contractsDir)) {
    const full = path.join(contractsDir, entry);
    if (statSync(full).isFile() && entry.endsWith('.yaml')) count += 1;
  }
  return count;
}

function countSkills(root) {
  const skillsDir = path.join(root, '.agents', 'skills');
  if (!existsSync(skillsDir)) return 0;
  let count = 0;
  for (const entry of readdirSync(skillsDir)) {
    const full = path.join(skillsDir, entry);
    if (statSync(full).isDirectory()) count += 1;
  }
  return count;
}

/**
 * Collect all framework metrics for the dashboard.
 *
 * @param {string} root - Repository root directory.
 * @returns {object} metrics bundle
 */
export function collectMetrics(root = process.cwd()) {
  const taskLogPath = path.join(root, 'TASK_LOG.md');
  const content = readSafe(taskLogPath);
  const entries = parseTaskLogEntries(content);

  const timeouts = countTimeouts(entries);
  const reworks = countReworks(entries);
  const total = entries.length;

  const risks = countRisks(root);

  return {
    workItems: total,
    prs: countPrReferences(entries),
    timeouts,
    timeoutRate: total > 0 ? (timeouts / total) * 100 : 0,
    reworks,
    reworkRate: total > 0 ? (reworks / total) * 100 : 0,
    testFiles: countTestFiles(root),
    ciChecks: countNpmScripts(root),
    adrs: countAdrs(root),
    risks,
    contracts: countContracts(root),
    skills: countSkills(root)
  };
}

function main() {
  const m = collectMetrics(process.cwd());

  const pct = (n) => n.toFixed(1).replace(/\.0$/, '');

  console.log('Framework Metrics Dashboard');
  console.log('===========================');
  console.log(`Total work items:          ${m.workItems}`);
  console.log(`Total PRs referenced:      ${m.prs}`);
  console.log(`Subagent timeouts:         ${m.timeouts} (${pct(m.timeoutRate)}%)`);
  console.log(`Rework cycles:             ${m.reworks} (${pct(m.reworkRate)}%)`);
  console.log(`Test files:                ${m.testFiles}`);
  console.log(`CI checks (npm scripts):   ${m.ciChecks}`);
  console.log(`ADRs:                      ${m.adrs}`);
  console.log(`Risks tracked:             ${m.risks.total} (${m.risks.open} open, ${m.risks.closed} closed)`);
  console.log(`Contracts:                 ${m.contracts}`);
  console.log(`Skills:                    ${m.skills}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
