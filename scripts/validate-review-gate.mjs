import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const REVIEW_RECORD_DIR = 'docs/records/qa';
const SCRIPT_EXTENSIONS = ['.mjs', '.js'];

/**
 * Returns true when at least one of `changedFiles` is a script file
 * tracked by the review gate (i.e. has a .mjs or .js extension).
 * Pure function over its input — no filesystem access.
 */
export function hasScriptChanges(changedFiles) {
  if (!Array.isArray(changedFiles)) return false;
  return changedFiles.some((file) => {
    if (typeof file !== 'string' || file.length === 0) return false;
    const ext = path.extname(file).toLowerCase();
    return SCRIPT_EXTENSIONS.includes(ext);
  });
}

/**
 * Returns true when the current diff adds a structured code-review record.
 * Files must be added under `docs/records/qa/` and match
 * `*-code-review.md`. Historical records do not satisfy the gate.
 */
export function hasReviewRecord(addedFiles) {
  if (!Array.isArray(addedFiles)) return false;
  return addedFiles.some((file) =>
    typeof file === 'string' &&
    path.dirname(file) === REVIEW_RECORD_DIR &&
    file.endsWith('-code-review.md')
  );
}

/**
 * Candidate base refs, most specific first. `GITHUB_BASE_REF` is set by GitHub
 * Actions on `pull_request` events and names the target branch.
 */
function candidateBaseRefs(explicitBaseRef) {
  if (explicitBaseRef) return [explicitBaseRef];
  const refs = [];
  if (process.env.GITHUB_BASE_REF) refs.push(`origin/${process.env.GITHUB_BASE_REF}`);
  refs.push('origin/main', 'main');
  return refs;
}

/**
 * Resolves the range the gate should audit.
 *
 * The gate must see every commit on the branch, not just the last one: a branch
 * whose script change lands in an earlier commit and whose final commit touches
 * only docs would otherwise be waved through as "docs-only". `HEAD~1..HEAD` is
 * therefore only a last resort — `docs/workflow/task-execution-mode.md` makes it
 * normative that `HEAD~1` is never a substitute for a multi-commit range.
 *
 * Returns `basis: 'merge-base'` when a base ref resolved, `'fallback'` otherwise,
 * so the caller can report honestly which range it actually audited.
 */
export function resolveDiffRange(cwd, { baseRef } = {}) {
  for (const candidate of candidateBaseRefs(baseRef)) {
    try {
      const mergeBase = execFileSync('git', ['merge-base', candidate, 'HEAD'], {
        cwd,
        stdio: ['ignore', 'pipe', 'ignore']
      })
        .toString()
        .trim();
      if (mergeBase) {
        return { range: `${mergeBase}..HEAD`, basis: 'merge-base', baseRef: candidate };
      }
    } catch {
      // Candidate is not present in this clone; try the next one.
    }
  }
  return { range: 'HEAD~1..HEAD', basis: 'fallback', baseRef: undefined };
}

export function gitDiffNameOnly(refspec, cwd, options = {}) {
  const args = ['diff', '--name-only'];
  if (options.addedOnly) args.push('--diff-filter=A');
  args.push(refspec);

  try {
    const out = execFileSync('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString();
    return out.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const cwd = process.cwd();
  const { range, basis, baseRef } = resolveDiffRange(cwd);
  const changedFiles = gitDiffNameOnly(range, cwd);
  const addedFiles = gitDiffNameOnly(range, cwd, { addedOnly: true });
  const scriptFiles = changedFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return SCRIPT_EXTENSIONS.includes(ext);
  });

  const reviewRecords = addedFiles.filter((file) =>
    path.dirname(file) === REVIEW_RECORD_DIR && file.endsWith('-code-review.md')
  );

  console.log('Review gate audit');
  console.log('─────────────────────────────────────────────────────────');
  if (basis === 'merge-base') {
    console.log(`Range: ${range} (merge-base with ${baseRef})`);
  } else {
    console.log(
      `Range: ${range} — WARNING: no base ref resolved, so only the last commit was audited. ` +
        'A script change in an earlier commit of this branch would not be seen.'
    );
  }
  console.log(`Changed files: ${changedFiles.length}`);
  if (scriptFiles.length) {
    console.log(`Script files (.mjs/.js) changed: ${scriptFiles.length}`);
    for (const file of scriptFiles) console.log(`  - ${file}`);
  } else {
    console.log('Script files (.mjs/.js) changed: 0');
  }
  console.log(`Code-review records added in ${REVIEW_RECORD_DIR}/: ${reviewRecords.length}`);
  if (reviewRecords.length) {
    for (const record of reviewRecords) console.log(`  - ${record}`);
  }
  console.log('─────────────────────────────────────────────────────────');

  if (!hasScriptChanges(changedFiles)) {
    console.log('PASS: no script changes detected; review gate not required (docs-only PR).');
    return;
  }

  if (!hasReviewRecord(addedFiles)) {
    console.error(
      'FAIL: PR has script changes (.mjs/.js) but adds no structured code review record in ' +
        `${REVIEW_RECORD_DIR}/. Add a new *-code-review.md file in the same diff before merge.`
    );
    process.exitCode = 1;
    return;
  }

  console.log('PASS: script changes detected and at least one code-review record found.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
