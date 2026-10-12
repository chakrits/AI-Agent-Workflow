import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { changedFiles, makeGit, resolveBase } from './lib/diff-scope.mjs';

// AC-006 (Issue #297): advisory check that closeout records Lessons Learned.
// Always exits 0; findings print `WARN [AC-006] ...`. Not a skill, and
// archive-work-item.mjs is untouched. Offline and read-only.

// Input caps applied BEFORE any regex runs (security finding 1: quadratic
// backtracking). Largest real line in repo records is ~715 chars, so 4096
// leaves headroom; 256 KiB bounds total work to ~64 max-length lines.
export const MAX_LINE_CHARS = 4096;
export const MAX_FILE_BYTES = 256 * 1024;
const OVERSIZE = Symbol('oversize');

const WORK_ITEM_DIR = 'docs/records/work-items';
const LESSONS_DIR = 'docs/records/lessons-learned';
const WORK_ITEM_RE = /^docs\/records\/work-items\/[^/]+\.md$/;
const HANDOFF_RE = /^docs\/records\/HANDOFF-POST-MERGE-CLOSEOUT-[^/]+\.md$/;
const LINK_NAME_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$/;
const WIKILINK_RE = /\[\[\.\.\/lessons-learned\/([^\]|#]*)(?:[|#][^\]]*)?\]\]/g;
const MDLINK_RE = /\]\((?:\.\.\/|\.\/)?(?:docs\/records\/)?(?:\.\.\/)?lessons-learned\/([^)\s]*?)(?:\.md)?\)/g;

export function isClosed(text) {
  const inline = text.match(/^##\s+Status\s*:\s*(.*)$/m);
  if (inline) return /^Closed\b/.test(inline[1].trim());
  const lines = text.split('\n');
  const i = lines.findIndex((l) => /^##\s+Status\s*$/.test(l));
  if (i < 0) return false;
  const next = lines.slice(i + 1).find((l) => l.trim() !== '');
  return next !== undefined && /^Closed\b/.test(next.trim());
}

export function lessonsSection(text) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => /^##\s+Lessons Learned\s*$/.test(l));
  if (i < 0) return undefined;
  const body = [];
  for (const l of lines.slice(i + 1)) {
    if (/^##\s/.test(l)) break;
    body.push(l);
  }
  return body;
}

/** Name regex, then realpath containment, then existence. Never existsSync first. */
export function linkResolves(root, name) {
  if (!LINK_NAME_RE.test(name)) return false;
  try {
    const base = realpathSync(path.join(root, LESSONS_DIR));
    const target = realpathSync(path.join(base, `${name}.md`));
    return target.startsWith(base + path.sep) && existsSync(target);
  } catch {
    return false;
  }
}

/** Returns { ok } or { ok:false, reason }. */
export function checkLessons(root, text) {
  const body = lessonsSection(text);
  if (body === undefined) return { ok: false, reason: 'no `## Lessons Learned` section' };
  if (body.some((l) => l.length > MAX_LINE_CHARS)) {
    return { ok: false, notEvaluated: true, reason: `a Lessons Learned line exceeds ${MAX_LINE_CHARS} characters` };
  }
  const lines = body
    .map((l) => l.replace(/<!--.*?-->/g, '').trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s+(\[[ xX]\]\s+)?/, ''));
  if (lines.length === 0) return { ok: false, reason: '`## Lessons Learned` section is empty' };
  let reason = 'only placeholder content';
  for (const line of lines) {
    if (line.includes('YYYY-MM-DD-slug')) { reason = 'template placeholder left in place'; continue; }
    const names = [...line.matchAll(WIKILINK_RE), ...line.matchAll(MDLINK_RE)].map((m) => m[1]);
    if (names.length > 0) {
      if (names.some((n) => linkResolves(root, n))) return { ok: true };
      reason = 'lessons-learned link does not resolve to an existing record';
      continue;
    }
    if (/^N\/A$/i.test(line)) { reason = 'bare N/A (use `N/A — <reason>`)'; continue; }
    return { ok: true };
  }
  return { ok: false, reason };
}

function read(root, rel) {
  try {
    const file = path.join(root, rel);
    if (statSync(file).size > MAX_FILE_BYTES) return OVERSIZE;
    return readFileSync(file, 'utf8');
  } catch { return undefined; }
}

function workItemsForIssue(root, n) {
  const re = new RegExp(`(?<![a-z0-9])issue-${n}(?![a-z0-9])`, 'i');
  let names = [];
  try { names = readdirSync(path.join(root, WORK_ITEM_DIR)); } catch { /* none */ }
  return names.filter((f) => f.endsWith('.md') && re.test(f)).map((f) => `${WORK_ITEM_DIR}/${f}`);
}

/** Pure-ish core: returns { notEvaluated?, findings: [{level, message}] }. */
export function evaluate({ root = process.cwd(), env = process.env, all = false, git = makeGit(root) } = {}) {
  const findings = [];
  const add = (level, message) => findings.push({ level, message });
  let items = [];
  let handoffs = [];
  if (all) {
    try {
      items = readdirSync(path.join(root, WORK_ITEM_DIR)).filter((f) => f.endsWith('.md')).map((f) => `${WORK_ITEM_DIR}/${f}`);
    } catch { /* none */ }
  } else {
    const range = resolveBase(env, git);
    if (range.notEvaluated) return { notEvaluated: range.notEvaluated, findings };
    const files = changedFiles(git, range.mergeBase);
    items = files.filter((f) => WORK_ITEM_RE.test(f));
    handoffs = files.filter((f) => HANDOFF_RE.test(f));
  }

  let scoped = 0;
  const seen = new Set();
  const evalItem = (rel, text) => {
    scoped += 1;
    const r = checkLessons(root, text);
    if (r.ok) add('ok', `${rel} records lessons`);
    else if (r.notEvaluated) add('info', `${rel}: NOT EVALUATED (${r.reason})`);
    else add('warn', `${rel}: ${r.reason}`);
  };

  for (const rel of items) {
    const text = read(root, rel);
    if (text === OVERSIZE) { add('info', `${rel}: NOT EVALUATED (file exceeds ${MAX_FILE_BYTES} bytes)`); continue; }
    if (text === undefined || !isClosed(text)) continue;
    seen.add(rel);
    evalItem(rel, text);
  }

  for (const rel of handoffs) {
    const text = read(root, rel);
    if (text === OVERSIZE) { add('info', `${rel}: NOT EVALUATED (file exceeds ${MAX_FILE_BYTES} bytes)`); continue; }
    if (text === undefined) continue;
    let m = null;
    for (const l of text.split('\n')) {
      if (l.length > MAX_LINE_CHARS) continue;
      m = l.match(/Work Item:.*?\/issues\/(\d+)/);
      if (m) break;
    }
    if (!m) { add('info', `${rel}: no Work Item URL; not evaluated`); continue; }
    const n = m[1];
    const records = workItemsForIssue(root, n);
    if (records.length === 0) { add('info', `no work-item record for #${n}; not evaluated`); continue; }
    if (lessonsSection(text) && checkLessons(root, text).ok) {
      scoped += 1;
      add('ok', `${rel} records lessons for #${n}`);
      continue;
    }
    for (const rec of records) {
      if (seen.has(rec)) continue;
      seen.add(rec);
      const itemText = read(root, rec);
      if (itemText === OVERSIZE) add('info', `${rec}: NOT EVALUATED (file exceeds ${MAX_FILE_BYTES} bytes)`);
      else if (itemText !== undefined) evalItem(rec, itemText);
    }
  }

  if (scoped === 0 && !findings.some((f) => f.level === 'info')) add('info', 'no closeout scope');
  return { findings };
}

export function main(argv = process.argv.slice(2), env = process.env, root = process.cwd()) {
  const result = evaluate({ root, env, all: argv.includes('--all') });
  if (result.notEvaluated) {
    console.log(`NOT EVALUATED: ${result.notEvaluated}`);
    return 0;
  }
  const annotate = env.GITHUB_ACTIONS === 'true';
  for (const { level, message } of result.findings) {
    if (level === 'warn') {
      console.log(`WARN [AC-006] ${message}`);
      if (annotate) console.log(`::warning::[AC-006] ${message.replace(/[\r\n]+/g, ' ')}`);
    } else if (level === 'ok') console.log(`OK [AC-006] ${message}`);
    else console.log(`INFO: ${message}`);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.log(`NOT EVALUATED: ${error?.message ?? error}`);
    process.exitCode = 0;
  }
}
