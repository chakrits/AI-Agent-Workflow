import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { changedFiles, makeGit, numstat, resolveBase } from './lib/diff-scope.mjs';

// AC-001 / AC-002 (Issue #297): advisory execution-discipline check.
//   AC-001: behavior files changed but the PR text cites no existing plan,
//           Task Brief or SDD (AGENTS.md Implementation Planning Rule).
//   AC-002: diff size against AGENTS.md Change Sizing, and (only when a Task
//           Brief is cited) changed files outside its `- Write set:`.
// Always exits 0. Findings print `WARN [AC-00x] ...`; anything that cannot be
// evaluated prints `NOT EVALUATED: ...` or `INFO: ...`, never a false pass.
// The rule is originated here (CI step); .githooks/pre-push is a thin caller.
//
// Known limitation: editing a PR body does not re-trigger `pull_request`
// runs, so a warning can be stale until the next push.
//
// Trust: the PR body and Task Brief content are UNTRUSTED (fork PRs). The body
// is read only from PR_BODY_FILE or env PR_BODY, never passed to a shell, and
// never echoed; only regex-validated reference names and sanitized changed
// file names are printed. References pass a name regex and realpath
// containment before any existence check. Offline; git via execFile only.
//
// UNVERIFIED (GitLab): the variable CI_MERGE_REQUEST_DESCRIPTION_IS_TRUNCATED
// could not be confirmed offline. It is honoured if set to "true", and a
// second, name-independent guard treats any GitLab body of >= 2700 characters
// as possibly truncated. In both cases a missing reference degrades to
// NOT EVALUATED instead of a WARN.

// Thresholds mirror AGENTS.md "Change Sizing"; a test pins them to that sentence.
export const SIZE_ACCEPTABLE = 300;
export const SIZE_TOO_LARGE = 1000;

export const MAX_LINE_CHARS = 4096;
export const MAX_FILE_BYTES = 256 * 1024;
const GITLAB_TRUNCATION_CHARS = 2700;
const MAX_REPORTED = 20;
const MAX_PATTERNS = 100;

// Single constant list of non-behavior paths (docs/contracts data files are re-included below).
const NON_BEHAVIOR = [
  /^docs\//, /\.md$/i, /^test\//, /^\.obsidian\//,
  /(^|\/)package-lock\.json$/, /(^|\/)yarn\.lock$/, /(^|\/)pnpm-lock\.yaml$/, /(^|\/)npm-shrinkwrap\.json$/, /\.lock$/,
];
const CONTRACT_DATA = /^docs\/contracts\/.+\.(yaml|json)$/;
const SIZE_EXCLUDED = [/^package-lock\.json$/, /^docs\/records\//, /^test\/fixtures\//];

const REF_RE = /(?<![A-Za-z0-9_.\/-])docs\/records\/(implementation-plan|task-brief|sdd)\/([A-Za-z0-9][A-Za-z0-9_-]*)\.md(?![A-Za-z0-9_.\/-])/g;

export const isBehaviorFile = (f) => CONTRACT_DATA.test(f) || !NON_BEHAVIOR.some((re) => re.test(f));
const sizeCounted = (f) => !SIZE_EXCLUDED.some((re) => re.test(f));

/** Strip control characters (incl. CR/LF, ESC) and cap length for anything printed. */
export function clean(s) {
  return String(s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').slice(0, 200);
}

/** Name regex already applied by REF_RE; then realpath containment, then existence at HEAD. */
function resolves(root, git, rel) {
  try {
    if (rel.includes('..') || path.isAbsolute(rel)) return false;
    const base = realpathSync(root);
    const target = realpathSync(path.join(base, rel));
    if (!target.startsWith(base + path.sep)) return false;
    return git(['cat-file', '-e', `HEAD:${rel}`]) !== undefined;
  } catch {
    return false;
  }
}

/** Scan body for references; returns { refs: Set<rel>, skippedLines }. */
export function scanReferences(body) {
  const refs = new Set();
  let skippedLines = 0;
  for (const line of body.split('\n')) {
    if (line.length > MAX_LINE_CHARS) { skippedLines += 1; continue; }
    for (const m of line.matchAll(REF_RE)) refs.add(`docs/records/${m[1]}/${m[2]}.md`);
  }
  return { refs, skippedLines };
}

/** Convert a repo glob (`*`, `**`) to a RegExp; undefined when unsafe. */
function globToRegExp(glob) {
  if (glob.length > 200 || (glob.match(/\*+/g) ?? []).length > 4) return undefined;
  let g = glob.replace(/^\.\//, '');
  if (g.endsWith('/')) g += '**';
  const src = g.split(/(\*\*|\*)/).map((p) => (p === '**' ? '.*' : p === '*' ? '[^/]*' : p.replace(/[.+^${}()|[\]\\?]/g, '\\$&'))).join('');
  return new RegExp(`^${src}$`);
}

/** Best-effort parse of `- Write set:`; returns RegExp[] or undefined when missing/unparsable. */
export function parseWriteSet(text) {
  const all = text.split('\n');
  const i = all.findIndex((l) => l.length <= MAX_LINE_CHARS && /^\s*[-*]\s*Write set\s*:/i.test(l));
  if (i < 0) return undefined;
  const parts = [all[i].replace(/^\s*[-*]\s*Write set\s*:/i, '')];
  for (const l of all.slice(i + 1)) {
    if (l.length > MAX_LINE_CHARS || !/^\s{2,}[-*]\s+/.test(l)) break;
    parts.push(l.replace(/^\s+[-*]\s+/, ''));
  }
  const items = parts.join(',').split(',').map((s) => s.replace(/`/g, '').trim())
    .filter((s) => /^[A-Za-z0-9_.\/*@+-]+$/.test(s)).slice(0, MAX_PATTERNS);
  const res = items.map(globToRegExp).filter(Boolean);
  return res.length > 0 ? res : undefined;
}

function readCapped(file) {
  if (statSync(file).size > MAX_FILE_BYTES) return undefined;
  return readFileSync(file, 'utf8');
}

/** Returns { body } | { absent: true } | { notEvaluated }. */
export function loadBody(env) {
  const event = env.GITHUB_EVENT_NAME === 'push' || env.CI_PIPELINE_SOURCE === 'push';
  if (env.PR_BODY_FILE) {
    try {
      const body = readCapped(env.PR_BODY_FILE);
      if (body === undefined) return { notEvaluated: `PR body file exceeds ${MAX_FILE_BYTES} bytes` };
      return { body };
    } catch {
      return { notEvaluated: 'PR body file unreadable' };
    }
  }
  if (event || env.PR_BODY === undefined) return { absent: true };
  if (env.PR_BODY.length > MAX_FILE_BYTES) return { notEvaluated: `PR body exceeds ${MAX_FILE_BYTES} characters` };
  return { body: env.PR_BODY };
}

export function evaluate({ root = process.cwd(), env = process.env, git = makeGit(root) } = {}) {
  const findings = [];
  const add = (level, message) => findings.push({ level, message });
  const range = resolveBase(env, git);
  if (range.notEvaluated) return { notEvaluated: range.notEvaluated, findings };
  const files = changedFiles(git, range.mergeBase);

  const input = loadBody(env);
  const refs = [];
  let truncated = false;
  if (input.body !== undefined) {
    const scan = scanReferences(input.body);
    for (const rel of scan.refs) if (resolves(root, git, rel)) refs.push(rel);
    if (scan.skippedLines > 0) add('info', `${scan.skippedLines} PR body line(s) over ${MAX_LINE_CHARS} characters were not scanned`);
    truncated = env.CI_MERGE_REQUEST_DESCRIPTION_IS_TRUNCATED === 'true'
      || (Boolean(env.GITLAB_CI) && input.body.length >= GITLAB_TRUNCATION_CHARS);
  }

  // AC-001
  const behavior = files.filter(isBehaviorFile);
  if (behavior.length === 0) add('ok', '[AC-001] no behavior files changed');
  else if (input.notEvaluated) add('info', `NOT EVALUATED: ${input.notEvaluated}`);
  else if (input.absent) add('info', 'NOT EVALUATED: no PR body');
  else if (refs.length > 0) add('ok', `[AC-001] PR text cites ${refs.length} existing plan/Task Brief/SDD reference(s)`);
  else if (truncated) add('info', 'NOT EVALUATED: PR description may be truncated by the host');
  else add('warn', `[AC-001] behavior files changed (${behavior.length}) but the PR text cites no existing plan/Task Brief/SDD (AGENTS.md Implementation Planning Rule)`);

  // AC-002 size
  const size = numstat(git, range.mergeBase).filter((e) => sizeCounted(e.file)).reduce((n, e) => n + e.added + e.deleted, 0);
  if (size > SIZE_TOO_LARGE) add('warn', `[AC-002] ${size} counted changed lines exceeds ~${SIZE_TOO_LARGE} (too large; must be split, AGENTS.md Change Sizing)`);
  else if (size > SIZE_ACCEPTABLE) add('warn', `[AC-002] ${size} counted changed lines exceeds ~${SIZE_ACCEPTABLE} (acceptable for one logical change; consider splitting)`);
  else add('ok', `[AC-002] ${size} counted changed lines within ~${SIZE_ACCEPTABLE}`);

  // AC-002 write set, only when a Task Brief is cited
  const briefs = refs.filter((r) => r.startsWith('docs/records/task-brief/'));
  if (briefs.length === 0) {
    add('info', '[AC-002] no Task Brief cited; write-set comparison skipped (size only)');
  } else {
    const patterns = [];
    for (const brief of briefs) {
      let set;
      try {
        const text = readCapped(path.join(root, brief));
        set = text === undefined ? undefined : parseWriteSet(text);
      } catch { set = undefined; }
      if (set) patterns.push(...set);
      else add('warn', `[AC-002] write set not parseable; not compared (${brief})`);
    }
    if (patterns.length > 0) {
      const outside = files.filter((f) => !patterns.some((re) => re.test(f)));
      for (const f of outside.slice(0, MAX_REPORTED)) add('warn', `[AC-002] ${clean(f)} is outside the Task Brief write set`);
      if (outside.length > MAX_REPORTED) add('warn', `[AC-002] ${outside.length - MAX_REPORTED} more file(s) outside the Task Brief write set`);
    }
  }
  return { findings };
}

export function main(env = process.env, root = process.cwd()) {
  const result = evaluate({ root, env });
  if (result.notEvaluated) {
    console.log(`NOT EVALUATED: ${result.notEvaluated}`);
    return 0;
  }
  const annotate = env.GITHUB_ACTIONS === 'true';
  for (const { level, message } of result.findings) {
    const m = clean(message);
    if (level === 'warn') {
      console.log(`WARN ${m}`);
      if (annotate) console.log(`::warning::${m}`);
    } else if (level === 'ok') console.log(`OK ${m}`);
    else console.log(m.startsWith('NOT EVALUATED') ? m : `INFO: ${m}`);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.log(`NOT EVALUATED: ${clean(error?.message ?? error)}`);
    process.exitCode = 0;
  }
}
