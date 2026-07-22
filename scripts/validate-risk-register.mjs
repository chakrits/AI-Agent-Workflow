import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Count open (non-closed) risk entries in RISKS.md.
 * A risk is considered closed if its Status column contains "Closed" (case-sensitive).
 */
export function countOpenRisks(root = process.cwd()) {
  const risksPath = path.join(root, 'RISKS.md');
  if (!existsSync(risksPath)) {
    return { total: 0, open: 0 };
  }

  const content = readFileSync(risksPath, 'utf8');
  const lines = content.split('\n');

  let total = 0;
  let open = 0;

  for (const line of lines) {
    // Match table data rows: lines starting with "| R-"
    if (line.startsWith('| R-')) {
      total++;
      // A closed risk has "Closed" in its Status column (the last column)
      if (!line.includes('| Closed')) {
        open++;
      }
    }
  }

  return { total, open };
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
 * @returns {{ total: number, open: number, activeWork: boolean, passed: boolean }}
 */
export function runRiskValidation(root = process.cwd()) {
  const { total, open } = countOpenRisks(root);
  const activeWork = hasActiveWorkItems(root);

  // Warn when there are active work items but no open risks
  const passed = !(activeWork && open === 0);

  return { total, open, activeWork, passed };
}

function main() {
  const result = runRiskValidation(process.cwd());

  console.log('Risk Register Validation Report');
  console.log('==============================');
  console.log(`Total risk entries:  ${result.total}`);
  console.log(`Open risk entries:   ${result.open}`);
  console.log(`Active work items:   ${result.activeWork ? 'Yes' : 'No'}`);

  if (result.passed) {
    console.log('\nRisk register validation PASSED.');
  } else {
    console.error(
      '\nRisk register validation FAILED: active work items exist but no open risks are tracked.'
    );
    console.error(
      'Add one or more open risk entries to RISKS.md before proceeding with active work.'
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
