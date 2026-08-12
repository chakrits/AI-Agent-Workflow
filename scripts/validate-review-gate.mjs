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
 * Candidate base refs, plus whether they came from an explicit signal.
 *
 * `GITHUB_BASE_REF` is set by GitHub Actions on `pull_request` events and names
 * the target branch. When such a signal exists it is *authoritative*: if it does
 * not resolve we must not quietly substitute `main`. Widening the range past the
 * declared base makes `--diff-filter=A` harvest review records added on an
 * intermediate branch, so a stacked branch could be credited with a record it
 * never added — the gate would fail open, which is the failure mode it exists
 * to prevent.
 */
function baseRefCandidates(explicitBaseRef) {
  if (explicitBaseRef) return { refs: [explicitBaseRef], authoritative: true };
  const declared = process.env.GITHUB_BASE_REF;
  if (declared) return { refs: [`origin/${declared}`, declared], authoritative: true };
  return { refs: ['origin/main', 'main'], authoritative: false };
}

function gitCapture(cwd, args) {
  try {
    const out = execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out || undefined;
  } catch {
    return undefined;
  }
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
  const { refs, authoritative } = baseRefCandidates(baseRef);
  const head = gitCapture(cwd, ['rev-parse', 'HEAD']);

  for (const candidate of refs) {
    const mergeBase = gitCapture(cwd, ['merge-base', candidate, 'HEAD']);
    if (!mergeBase) continue;

    // HEAD is at or behind the base — every `push` to the base branch has this
    // shape. `${mergeBase}..HEAD` would be empty and audit nothing, which the
    // caller would otherwise print as a confident "docs-only" pass.
    if (head && mergeBase === head) {
      return { range: 'HEAD~1..HEAD', basis: 'fallback', baseRef: undefined, reason: 'empty-range' };
    }

    return { range: `${mergeBase}..HEAD`, basis: 'merge-base', baseRef: candidate };
  }

  return {
    range: 'HEAD~1..HEAD',
    basis: 'fallback',
    baseRef: undefined,
    reason: authoritative ? 'declared-base-unresolvable' : 'no-base-ref'
  };
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
  const { range, basis, baseRef, reason } = resolveDiffRange(cwd);
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
  const FALLBACK_REASONS = {
    'empty-range': 'HEAD is at or behind the base branch, so there is no branch-wide range to audit',
    'declared-base-unresolvable': `the declared base ref (${process.env.GITHUB_BASE_REF}) could not be resolved in this clone`,
    'no-base-ref': 'no base ref could be resolved in this clone'
  };

  if (basis === 'merge-base') {
    console.log(`Range: ${range} (merge-base with ${baseRef})`);
  } else {
    console.log(
      `Range: ${range} — WARNING: only the last commit was audited because ` +
        `${FALLBACK_REASONS[reason] ?? 'no base ref could be resolved'}. ` +
        'A script change in an earlier commit would not be seen.'
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
