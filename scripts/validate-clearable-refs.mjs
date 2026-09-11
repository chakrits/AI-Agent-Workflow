import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLEARED_DIRECTORIES } from './reset-to-template.mjs';

const CODE_EXTENSIONS = ['.js', '.mjs', '.yml', '.yaml'];
const HISTORICAL_RECORD_DIR = 'docs/records';

/**
 * True when the file is code/mechanism (implementation logic, not content whose
 * meaning a reader depends on). Such files legitimately reference cleared dirs
 * as paths they operate on, so they are excluded from the check.
 */
export function isCodeFile(file) {
  return CODE_EXTENSIONS.includes(path.extname(file).toLowerCase());
}

/**
 * True when the file is a historical record under docs/records/. Historical
 * records document what was true at the time and may reference a document that
 * a later reset cleared. Excluded by rationale, not by an exemption that would
 * hide forward-facing defects.
 */
export function isHistoricalRecord(file) {
  return file.startsWith(HISTORICAL_RECORD_DIR + path.sep);
}

// Meaning-pointer prefixes: when a cleared path follows one of these, the reader
// must consult the referenced document's content to understand the text.
const MEANING_PREFIXES = [
  'authoritative source:',
  'design:',
  'see ',
  '(see ',
];

/**
 * Finds references to a specific document inside CLEARED_DIRECTORIES that a
 * reader must consult for meaning. Returns an array of matched strings.
 *
 * A reference is a meaning dependency when the cleared path names a document
 * (has a file extension) AND appears in a meaning-pointer context (authoritative
 * source / design / see). A bare directory mention, or a filename used as an
 * instruction/location (e.g. "create a record at docs/records/work-items/NN.md
 * using the WORK_ITEM.md template"), is NOT a meaning dependency.
 *
 * Pure function over its input — no filesystem access.
 */
export function findClearedDocMeaningRefs(text) {
  const refs = [];
  if (typeof text !== 'string' || text.length === 0) return refs;

  for (const cleared of CLEARED_DIRECTORIES) {
    // Only references to a *document* inside the cleared dir (a file with an
    // extension) can be a meaning dependency. A bare directory mention is not.
    const escaped = cleared.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docRe = new RegExp('(' + escaped + '/[^\\s`"\\)\\]\\}]+\\.[a-zA-Z0-9]+)', 'g');
    const lowerBound = text.toLowerCase();

    let m;
    const re = new RegExp(docRe.source, 'g');
    while ((m = re.exec(text)) !== null) {
      const full = m[1];
      const before = lowerBound.slice(Math.max(0, m.index - 40), m.index);

      // Instruction/location context: "at <path>" or "create a record at <path>"
      // or "using the <template>" — names a location/shape, not a meaning dep.
      if (/(create|save|write|at|record|template|location)\s+[^.]*$/.test(before)) {
        continue;
      }

      // Meaning-pointer context: the preceding prose demands reading the doc.
      if (MEANING_PREFIXES.some((p) => before.endsWith(p) || before.includes(p))) {
        refs.push(full);
        continue;
      }

      // A bare backtick-quoted path in a sentence that reads as a see/reference
      // pointer ("the rationale is in `docs/...`") — flag conservatively.
      if (/the\s+(rationale|design|source|specification|definition)\s+(is|are)\s+in/.test(before)) {
        refs.push(full);
      }
    }
  }
  return refs;
}

function gitCapture(cwd, args) {
  try {
    const out = execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

function baseRefCandidates(explicitBaseRef) {
  if (explicitBaseRef) return { refs: [explicitBaseRef], authoritative: true };
  const declared = process.env.GITHUB_BASE_REF;
  if (declared) return { refs: [`origin/${declared}`, declared], authoritative: true };
  return { refs: ['origin/main', 'main'], authoritative: false };
}

export function resolveDiffRange(cwd, { baseRef } = {}) {
  const { refs } = baseRefCandidates(baseRef);
  const head = gitCapture(cwd, ['rev-parse', 'HEAD']);
  for (const candidate of refs) {
    const mergeBase = gitCapture(cwd, ['merge-base', candidate, 'HEAD']);
    if (!mergeBase) continue;
    if (head && mergeBase === head) {
      return { range: 'HEAD~1..HEAD', basis: 'fallback', reason: 'empty-range' };
    }
    return { range: `${mergeBase}..HEAD`, basis: 'merge-base', baseRef: candidate };
  }
  return { range: 'HEAD~1..HEAD', basis: 'fallback', reason: 'no-base' };
}

function changedFiles(cwd, range) {
  const out = gitCapture(cwd, ['diff', '--name-only', '--diff-filter=ACMR', range]);
  if (!out) return [];
  return out.split('\n').filter(Boolean);
}

/**
 * Validates that no changed forward-facing content file introduces a
 * cleared-document meaning dependency. Returns { ok, errors, scanned }.
 */
export function validateClearableRefs(cwd = process.cwd()) {
  const { range, basis, reason } = resolveDiffRange(cwd);
  const files = changedFiles(cwd, range);
  const errors = [];
  const scanned = [];

  for (const file of files) {
    if (isCodeFile(file) || isHistoricalRecord(file)) continue;
    let content;
    try {
      content = readFileSync(path.resolve(cwd, file), 'utf8');
    } catch {
      continue; // deleted file (not in ACC set) or unreadable — skip
    }
    const refs = findClearedDocMeaningRefs(content);
    scanned.push(file);
    if (refs.length > 0) {
      errors.push(`  ${file} references cleared document(s): ${refs.join(', ')}`);
    }
  }

  return { ok: errors.length === 0, errors, scanned, range, basis, reason };
}

// CLI entry: run when invoked directly (not imported by a test).
const invokedDirectly = import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const result = validateClearableRefs();
  if (result.scanned.length === 0) {
    console.log(`Range: ${result.range} (${result.basis}${result.reason ? `: ${result.reason}` : ''}) — no content files changed. PASS.`);
    process.exit(0);
  }
  console.log(`Range: ${result.range} (${result.basis})`);
  console.log(`Scanned ${result.scanned.length} content file(s).`);
  if (result.ok) {
    console.log('PASS: no changed content file depends on a cleared document for meaning.');
    process.exit(0);
  }
  console.error('FAIL: forward-facing content file(s) reference a cleared document for meaning:');
  for (const e of result.errors) console.error(e);
  process.exit(1);
}