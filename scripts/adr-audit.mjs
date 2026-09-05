import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ADR_HEADER_RE = /^### ADR-/m;
const DECISION_KEYWORDS = /excluded|deliberately|skipped|deferred|rejected/gi;

/**
 * Count real (non-stub) ADR entries in DECISIONS.md.
 * A stub ADR has an empty Date field ("- Date:" with no value after it).
 */
// A recorded decision carries a filled-in date. The field has been written as
// `- Date: x`, `**Date:** x` and bare `Date: x`; requiring one exact spelling made
// a correctly-headed ADR invisible, so the reset destroyed it and the audit passed.
// An unfilled template entry has the key and no value, and still must not count.
const DATED_FIELD_RE = /^[ \t]*(?:[-*][ \t]*)?(?:\*\*)?Date(?:\*\*)?[ \t]*:[ \t]*(\S+)/im;

export function countAdrsInContent(content) {
  if (typeof content !== 'string') return 0;
  const sections = content.split(ADR_HEADER_RE);
  let realCount = 0;
  for (let i = 1; i < sections.length; i++) {
    if (DATED_FIELD_RE.test(sections[i])) realCount++;
  }
  return realCount;
}

function gitCapture(root, args) {
  try {
    const out = execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return out;
  } catch {
    return undefined;
  }
}

/**
 * The commit this working tree should be compared against.
 *
 * On a branch, that is the merge base with the base branch. On the base branch
 * itself the merge base is HEAD, which would compare a commit to itself and see
 * no change, so fall back to the previous commit. Returns undefined when neither
 * resolves (a fresh repository with no history), in which case no comparison is
 * possible and none is claimed.
 */
export function comparisonRefs(root = process.cwd()) {
  const head = gitCapture(root, ['rev-parse', 'HEAD'])?.trim();
  if (!head) return [];

  const declared = process.env.GITHUB_BASE_REF;
  const candidates = declared
    ? [`origin/${declared}`, declared]
    : ['origin/main', 'main'];

  const refs = new Set();
  for (const candidate of candidates) {
    const mergeBase = gitCapture(root, ['merge-base', candidate, 'HEAD'])?.trim();
    if (!mergeBase || mergeBase === head) continue;
    refs.add(mergeBase);
    // Comparing only against the fork point hides a loss that happens entirely
    // inside the branch: add five ADRs, delete them, and the fork point still
    // reports the count it held before any of them existed.
    const revList = gitCapture(root, ['rev-list', '--max-count=100', `${mergeBase}..HEAD`]);
    for (const sha of (revList ?? '').split('\n').map((line) => line.trim()).filter(Boolean)) {
      if (sha !== head) refs.add(sha);
    }
    break;
  }
  const parent = gitCapture(root, ['rev-parse', 'HEAD~1'])?.trim();
  if (parent) refs.add(parent);
  return [...refs];
}

/**
 * Real ADR count in DECISIONS.md as of `ref`, or undefined when the file or the
 * ref cannot be read. Undefined means "cannot compare", never "zero".
 */
export function countRealAdrsAtRef(root, ref) {
  if (!ref) return undefined;
  const content = gitCapture(root, ['show', `${ref}:DECISIONS.md`]);
  if (content === undefined) return undefined;
  return countAdrsInContent(content);
}

export function countRealAdrs(root = process.cwd()) {
  const decisionsPath = path.join(root, 'DECISIONS.md');
  if (!existsSync(decisionsPath)) return 0;
  return countAdrsInContent(readFileSync(decisionsPath, 'utf8'));
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
  // The worst loss is what matters, so take the highest count any comparison
  // commit held. undefined means no comparison was possible, never zero.
  const previousCounts = comparisonRefs(root)
    .map((ref) => countRealAdrsAtRef(root, ref))
    .filter((count) => count !== undefined);
  const previousAdrCount = previousCounts.length > 0 ? Math.max(...previousCounts) : undefined;
  // A reset blanks DECISIONS.md and TASK_LOG.md in the same commit, so the ratio
  // becomes 0/0 and reads as healthy. Losing recorded decisions is the failure the
  // ratio cannot see, so it is checked separately and fails closed.
  const regressed = previousAdrCount !== undefined && adrCount < previousAdrCount;
  const taskLogDecisions = countTaskLogDecisions(root);
  const threshold = 10;
  const ratio =
    adrCount > 0 ? taskLogDecisions / adrCount
    : taskLogDecisions === 0 ? 0 // clean slate — nothing to audit yet
    : Infinity; // decisions were made with zero ADRs to show for it — real gap

  return {
    adrCount,
    previousAdrCount,
    regressed,
    taskLogDecisions,
    ratio,
    threshold,
    passed: ratio <= threshold && !regressed
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

  if (result.regressed) {
    console.error(
      `\nADR audit FAILED: the decision log shrank from ${result.previousAdrCount} to ${result.adrCount} ADR(s).`
    );
    console.error(
      'DECISIONS.md records governing decisions, not clearable history. Restore the removed entries, ' +
        'or mark them Superseded in place rather than deleting them.'
    );
    process.exitCode = 1;
  } else if (result.ratio === Infinity) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
