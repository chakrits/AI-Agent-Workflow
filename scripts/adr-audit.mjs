import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ADR_HEADER_RE = /^### ADR-/m;
const DECISION_KEYWORDS = /excluded|deliberately|skipped|deferred|rejected/gi;

/**
 * Count real (non-stub) ADR entries in DECISIONS.md.
 * A stub ADR has an empty Date field ("- Date:" with no value after it).
 */
export function countRealAdrs(root = process.cwd()) {
  const decisionsPath = path.join(root, 'DECISIONS.md');
  if (!existsSync(decisionsPath)) return 0;

  const content = readFileSync(decisionsPath, 'utf8');
  const sections = content.split(ADR_HEADER_RE);

  // First element is everything before the first ADR header — skip it
  let realCount = 0;
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    // A stub ADR has "- Date:" followed immediately by end-of-line or whitespace-only
    const dateLine = section.match(/- Date:[ \t]*(\S+)/);
    if (dateLine && dateLine[1]) {
      realCount++;
    }
  }

  return realCount;
}

/**
 * Count decision keyword occurrences in TASK_LOG.md.
 * Decision keywords: excluded, deliberately, skipped, deferred, rejected.
 */
export function countTaskLogDecisions(root = process.cwd()) {
  const taskLogPath = path.join(root, 'TASK_LOG.md');
  if (!existsSync(taskLogPath)) return 0;

  const content = readFileSync(taskLogPath, 'utf8');
  const lines = content.split('\n');

  let decisionCount = 0;
  for (const line of lines) {
    // Skip the table header row
    if (line.startsWith('|') && line.includes('Date |')) continue;
    // Skip separator row
    if (line.startsWith('|') && line.includes('---')) continue;

    const matches = line.match(DECISION_KEYWORDS);
    if (matches) {
      decisionCount += matches.length;
    }
  }

  return decisionCount;
}

/**
 * Run the ADR audit.
 * @returns {{ adrCount: number, taskLogDecisions: number, ratio: number, threshold: number, passed: boolean }}
 */
export function runAudit(root = process.cwd()) {
  const adrCount = countRealAdrs(root);
  const taskLogDecisions = countTaskLogDecisions(root);
  const threshold = 10;
  const ratio = adrCount > 0 ? taskLogDecisions / adrCount : Infinity;

  return {
    adrCount,
    taskLogDecisions,
    ratio,
    threshold,
    passed: ratio <= threshold
  };
}

function main() {
  const result = runAudit(process.cwd());

  console.log(`ADR Audit Report`);
  console.log(`===============`);
  console.log(`Real ADR entries in DECISIONS.md:  ${result.adrCount}`);
  console.log(`Decision keywords in TASK_LOG.md:  ${result.taskLogDecisions}`);
  console.log(`Ratio (decisions/ADRs):            ${result.ratio.toFixed(2)}:1`);
  console.log(`Threshold:                         ${result.threshold}:1`);

  if (result.ratio === Infinity) {
    console.error('\nADR audit FAILED: no real ADR entries found in DECISIONS.md.');
    process.exitCode = 1;
  } else if (result.passed) {
    console.log(`\nADR audit PASSED: ratio ${result.ratio.toFixed(2)}:1 is within threshold (≤ ${result.threshold}:1).`);
  } else {
    console.error(`\nADR audit FAILED: ratio ${result.ratio.toFixed(2)}:1 exceeds threshold (≤ ${result.threshold}:1).`);
    console.error(`Create new ADR entries in DECISIONS.md to reduce the gap.`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
