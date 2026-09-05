import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { comparisonRefs } from './adr-audit.mjs';

/**
 * Count total and open (non-closed) risk entries in a RISKS.md's content, and
 * the ids of the rows found. Split out from `countOpenRisks` so the same
 * parsing logic can be run against both the working tree and a historical
 * git ref — a divergent second implementation reading the same table shape
 * differently is exactly the bug class this guard exists to prevent.
 * A risk is considered closed if its Status column contains "Closed" (case-sensitive).
 */
export function countRisksInContent(content) {
  if (typeof content !== 'string') return { total: 0, open: 0, ids: [] };
  const lines = content.split('\n');

  let total = 0;
  let open = 0;
  const ids = [];

  for (const line of lines) {
    // Match table data rows: lines starting with "| R-"
    if (line.startsWith('| R-')) {
      total++;
      const idMatch = line.match(/^\|\s*(R-[^\s|]+)/);
      if (idMatch) ids.push(idMatch[1]);
      // A closed risk has "Closed" in its Status column (the last column)
      if (!line.includes('| Closed')) {
        open++;
      }
    }
  }

  return { total, open, ids };
}

/**
 * Count total and open (non-closed) risk entries in RISKS.md.
 */
export function countOpenRisks(root = process.cwd()) {
  const risksPath = path.join(root, 'RISKS.md');
  if (!existsSync(risksPath)) {
    return { total: 0, open: 0, ids: [] };
  }

  return countRisksInContent(readFileSync(risksPath, 'utf8'));
}

function gitCapture(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return undefined;
  }
}

/**
 * Total risk-entry count in RISKS.md as of `ref`, or undefined when the file
 * or the ref cannot be read. Undefined means "cannot compare", never "zero".
 */
export function countRisksAtRef(root, ref) {
  if (!ref) return undefined;
  const content = gitCapture(root, ['show', `${ref}:RISKS.md`]);
  if (content === undefined) return undefined;
  return countRisksInContent(content).total;
}

/**
 * Check if PROJECT_STATUS.md shows active work items.
 * Returns true when the Current Work Item has a non-None ID and non-Idle Status.
 */
export function hasActiveWorkItems(root = process.cwd()) {
  const statusPath = path.join(root, 'PROJECT_STATUS.md');
  if (!existsSync(statusPath)) {
    return false;
  }

  const content = readFileSync(statusPath, 'utf8');

  // Check for an active (non-idle) work item
  const idMatch = content.match(/^\- ID: (.+)$/m);
  const statusMatch = content.match(/^\- Status: (.+)$/m);
  const stageMatch = content.match(/^\- Idle/);

  if (!idMatch || !statusMatch) {
    return false;
  }

  const id = idMatch[1].trim();
  const status = statusMatch[1].trim();

  // Active if there's a non-None ID and status is not Idle
  // Also check if the stage indicates idle
  return id !== 'None' && status.toLowerCase() !== 'idle' && !stageMatch;
}

/**
 * Run the risk register validation.
 *
 * Compares the current total risk-entry count against every reachable
 * comparison commit (mirroring `adr-audit.mjs`'s merge-base + branch-walk
 * strategy). Total, not open, is the regression signal: marking a risk
 * Closed is a legitimate lifecycle change that reduces `open` without
 * destroying anything, but a row disappearing reduces `total` and that is
 * exactly what an unconditional reset does.
 *
 * @returns {{ total: number, open: number, ids: string[], activeWork: boolean,
 *   previousTotal: number|undefined, regressed: boolean, passed: boolean }}
 */
export function runRiskValidation(root = process.cwd()) {
  const { total, open, ids } = countOpenRisks(root);
  const activeWork = hasActiveWorkItems(root);

  // The worst loss is what matters, so take the highest count any comparison
  // commit held. undefined means no comparison was possible, never zero.
  const previousCounts = comparisonRefs(root)
    .map((ref) => countRisksAtRef(root, ref))
    .filter((count) => count !== undefined);
  const previousTotal = previousCounts.length > 0 ? Math.max(...previousCounts) : undefined;
  const regressed = previousTotal !== undefined && total < previousTotal;

  // Warn when there are active work items but no open risks
  const passed = !(activeWork && open === 0) && !regressed;

  return { total, open, ids, activeWork, previousTotal, regressed, passed };
}

function main() {
  const result = runRiskValidation(process.cwd());

  console.log('Risk Register Validation Report');
  console.log('==============================');
  console.log(`Total risk entries:  ${result.total}`);
  console.log(`Open risk entries:   ${result.open}`);
  console.log(`Active work items:   ${result.activeWork ? 'Yes' : 'No'}`);
  if (result.previousTotal === undefined) {
    console.log('Previous total:      unavailable — no comparison commit could be read');
    console.log('(a shallow clone or an unreachable base leaves this guard absent, not passing)');
  } else {
    console.log(`Previous total:      ${result.previousTotal}`);
  }

  if (result.regressed) {
    console.error(
      `\nRisk register validation FAILED: RISKS.md shrank from ${result.previousTotal} to ${result.total} entr${
        result.total === 1 ? 'y' : 'ies'
      }.`
    );
    console.error(
      'RISKS.md records tracked project risks, not clearable history. Restore the removed entries, ' +
        'or mark them Closed in place rather than deleting them.'
    );
    process.exitCode = 1;
  } else if (!result.passed) {
    console.error(
      '\nRisk register validation FAILED: active work items exist but no open risks are tracked.'
    );
    console.error(
      'Add one or more open risk entries to RISKS.md before proceeding with active work.'
    );
    process.exitCode = 1;
  } else {
    console.log('\nRisk register validation PASSED.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
