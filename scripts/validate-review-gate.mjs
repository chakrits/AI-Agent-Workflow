import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
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
 * Returns true when at least one structured code-review record exists
 * in `reviewDir`. Files must match the glob `*-code-review.md`.
 *
 * `reviewDir` may be either absolute or relative to the cwd; callers
 * that need reproducible behaviour across test working directories
 * should pass an absolute path (e.g. `path.resolve(root, REVIEW_RECORD_DIR)`).
 */
export function hasReviewRecord(reviewDir) {
  if (!reviewDir || !existsSync(reviewDir)) return false;
  let entries;
  try {
    entries = readdirSync(reviewDir);
  } catch {
    return false;
  }
  return entries.some((name) => name.endsWith('-code-review.md'));
}

function gitDiffNameOnly(refspec, cwd) {
  try {
    const out = execFileSync('git', ['diff', '--name-only', refspec], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString();
    return out.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function listReviewRecords(reviewDir) {
  if (!existsSync(reviewDir)) return [];
  try {
    return readdirSync(reviewDir).filter((name) => name.endsWith('-code-review.md')).sort();
  } catch {
    return [];
  }
}

async function main() {
  const cwd = process.cwd();
  const changedFiles = gitDiffNameOnly('HEAD~1..HEAD', cwd);
  const scriptFiles = changedFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return SCRIPT_EXTENSIONS.includes(ext);
  });

  const reviewDir = path.join(cwd, REVIEW_RECORD_DIR);
  const reviewRecords = listReviewRecords(reviewDir);

  console.log('Review gate audit');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Changed files (HEAD~1..HEAD): ${changedFiles.length}`);
  if (scriptFiles.length) {
    console.log(`Script files (.mjs/.js) changed: ${scriptFiles.length}`);
    for (const file of scriptFiles) console.log(`  - ${file}`);
  } else {
    console.log('Script files (.mjs/.js) changed: 0');
  }
  console.log(`Code-review records in ${REVIEW_RECORD_DIR}/: ${reviewRecords.length}`);
  if (reviewRecords.length) {
    for (const record of reviewRecords) console.log(`  - ${record}`);
  }
  console.log('─────────────────────────────────────────────────────────');

  if (!hasScriptChanges(changedFiles)) {
    console.log('PASS: no script changes detected; review gate not required (docs-only PR).');
    return;
  }

  if (!hasReviewRecord(reviewDir)) {
    console.error(
      'FAIL: PR has script changes (.mjs/.js) but no code review record in ' +
        `${REVIEW_RECORD_DIR}/. Add a structured *-code-review.md file before merge.`
    );
    process.exitCode = 1;
    return;
  }

  console.log('PASS: script changes detected and at least one code-review record found.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
