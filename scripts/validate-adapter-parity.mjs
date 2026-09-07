import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const PLATFORM_DIRS = [
  { name: 'agents', dir: '.agents/agents' },
  { name: 'claude', dir: '.claude/agents' },
  { name: 'agent', dir: '.agent/agents' }
];

// Matches a leading YAML frontmatter block only (`---` fence at the very
// start of the file through the closing `---`). Deliberately anchored to
// the start of the string and non-greedy so a `---` horizontal rule
// appearing later in an adapter's body is never mistaken for a second
// frontmatter fence.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Splits a `.md` adapter file's raw text into its frontmatter block (the
 * text between the fences, or '' if none) and its body (everything after
 * the closing fence, or the whole file if there is no leading frontmatter
 * block).
 */
export function stripFrontmatter(text) {
  const match = FRONTMATTER_RE.exec(text);
  if (!match) return { frontmatter: '', body: text };
  return { frontmatter: match[1], body: text.slice(match[0].length) };
}

/**
 * Extracts the `name:` field's value from a frontmatter block. Returns null
 * when no `name:` field is present.
 */
export function extractName(frontmatter) {
  const match = /^name:\s*(.+?)\s*$/m.exec(frontmatter);
  return match ? match[1] : null;
}

/**
 * Reads an adapter `.md` file and returns its stripped body's MD5 hex digest
 * plus its frontmatter `name:` value. Returns nulls when the file does not
 * exist.
 */
export function readAdapter(filePath) {
  if (!existsSync(filePath)) return { hash: null, name: null };
  const text = readFileSync(filePath, 'utf8');
  const { frontmatter, body } = stripFrontmatter(text);
  const hash = createHash('md5').update(body, 'utf8').digest('hex');
  const name = extractName(frontmatter);
  return { hash, name };
}

/**
 * Lists every adapter `.md` basename across the union of all three platform
 * directories (not just the canonical `.agents/agents/` tree). Enumerating
 * only the canonical tree would make an adapter that exists in `.claude/` or
 * `.agent/` but is missing from `.agents/` invisible to the check entirely —
 * exactly the fail-open hole AC-03 exists to close. A directory that does not
 * exist yet contributes no entries rather than throwing.
 */
export function listAllAdapters(root = process.cwd()) {
  const names = new Set();
  for (const platform of PLATFORM_DIRS) {
    const dir = path.join(root, platform.dir);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (entry.endsWith('.md') && statSync(full).isFile()) names.add(entry);
    }
  }
  return [...names].sort();
}

/**
 * For each adapter `.md` file across the union of `.agents/agents/`,
 * `.claude/agents/`, and `.agent/agents/`, checks:
 *
 * - MISSING: the file is absent from any tree (fails closed rather than
 *   being skipped).
 * - NAME_DRIFT: the file exists in all three trees but the frontmatter
 *   `name:` field is not identical across all three (independent of body
 *   content — a body-identical, name-drifted file is still NAME_DRIFT, not
 *   OK).
 * - DRIFT: the file exists in all three trees, names match, but the
 *   content below the frontmatter differs.
 * - OK: present in all three trees, names match, bodies match.
 *
 * Returns { rows, passed, failed }.
 */
export function checkAdapterParity(root = process.cwd()) {
  const adapters = listAllAdapters(root);
  const rows = [];
  let failed = 0;

  for (const adapter of adapters) {
    const hashes = {};
    const names = {};
    let missing = false;

    for (const platform of PLATFORM_DIRS) {
      const filePath = path.join(root, platform.dir, adapter);
      const { hash, name } = readAdapter(filePath);
      hashes[platform.name] = hash;
      names[platform.name] = name;
      if (hash === null) missing = true;
    }

    let status;
    if (missing) {
      status = 'MISSING';
    } else if (!(names.agents === names.claude && names.claude === names.agent)) {
      status = 'NAME_DRIFT';
    } else if (!(hashes.agents === hashes.claude && hashes.claude === hashes.agent)) {
      status = 'DRIFT';
    } else {
      status = 'OK';
    }

    if (status !== 'OK') failed++;

    rows.push({ adapter, status, ...hashes, names });
  }

  return { rows, passed: rows.length - failed, failed };
}

function printTable(rows) {
  const header = ['ADAPTER', 'STATUS', 'AGENTS', 'CLAUDE', 'AGENT'];
  const colWidths = [26, 12, 14, 14, 14];
  const border = colWidths.map((w) => '-'.repeat(w + 2)).join('+');

  console.log(border);
  console.log('+' + header.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('+') + '+');
  console.log(border);

  for (const row of rows) {
    const cells = [
      row.adapter,
      row.status,
      row.agents ?? '(missing)',
      row.claude ?? '(missing)',
      row.agent ?? '(missing)'
    ];
    console.log('+' + cells.map((c, i) => ` ${String(c).padEnd(colWidths[i])} `).join('+') + '+');
  }

  console.log(border);
}

async function main() {
  const { rows, passed, failed } = checkAdapterParity(process.cwd());

  printTable(rows);

  console.log(`\n${passed} adapter(s) in sync, ${failed} adapter(s) drifted, missing, or name-mismatched.`);

  if (failed > 0) {
    console.error('\nAdapter parity check FAILED: some role adapters are missing, drifted, or have mismatched `name:` fields across .agents/agents/, .claude/agents/, and .agent/agents/.');
    process.exitCode = 1;
  } else {
    console.log('\nAdapter parity check PASSED: all role adapters in sync across .agents/, .claude/, and .agent/.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
