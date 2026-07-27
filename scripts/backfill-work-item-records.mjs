import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PILOT_SIZE = 10;

// Design note (Issue #117): the parser boundary is the Work Item column only.
// Other columns (Action/Result/Notes) routinely mention other issues in prose
// ("fixed the readiness gate for Issue #106's own fix") — scanning them would
// misattribute unrelated rows to the wrong work item. Only the Work Item
// column identifies what a row's evidence is *about*.
export function parseTaskLogRows(content) {
  const lines = content.split('\n').filter((line) => line.trim().startsWith('|'));
  if (lines.length < 2) return [];

  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6) continue;
    if (/^-+$/.test(cells[0])) continue; // markdown header separator row
    const [date, workItem, agent, action, result, nextAgent, ...noteParts] = cells;
    rows.push({ date, workItem, agent, action, result, nextAgent, notes: noteParts.join(' | ') });
  }
  return rows;
}

// Returns {issues:number[], prs:number[]} found in a single Work Item column.
// A number explicitly labeled "PR #NN" is a pull request, not an issue.
// Every other number (labeled "Issue(s) #NN" or bare "#NN") is treated as an
// issue reference — verified against this repo's real Issues (#5, #7, #10,
// #12, #16 all exist and match their slug context) before adopting this rule.
export function extractIssueNumbers(workItemColumn) {
  const prMatches = [...workItemColumn.matchAll(/\bPR\s*#(\d+)/gi)].map((m) => Number(m[1]));
  const prPositions = new Set();
  for (const m of workItemColumn.matchAll(/\bPR\s*#(\d+)/gi)) {
    prPositions.add(m.index + m[0].indexOf('#'));
  }

  const issues = [];
  for (const m of workItemColumn.matchAll(/#(\d+)/g)) {
    if (prPositions.has(m.index)) continue;
    const n = Number(m[1]);
    if (!issues.includes(n)) issues.push(n);
  }

  return { issues, prs: [...new Set(prMatches)] };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Groups TASK_LOG rows by distinct work item, not by row. A row referencing
// multiple issues (e.g. a combined retrospective) is attributed to every
// issue it names — under-grouping (extra slug groups) is the safe failure
// direction; silently merging unrelated work items is not.
export function groupRowsByWorkItem(rows) {
  const groups = new Map();

  const addRow = (key, kind, row, extra = {}) => {
    if (!groups.has(key)) {
      groups.set(key, { kind, rows: [], ...extra });
    }
    groups.get(key).rows.push(row);
  };

  for (const row of rows) {
    const { issues } = extractIssueNumbers(row.workItem);
    if (issues.length > 0) {
      for (const issueNumber of issues) {
        addRow(`issue-${issueNumber}`, 'issue', row, { issueNumber });
      }
    } else {
      const slug = slugify(row.workItem);
      addRow(`slug-${slug}`, 'slug', row, { slug: row.workItem });
    }
  }

  return groups;
}

// A row is closeout evidence only when it names both a merge and a closeout
// context in the same breath — a bare "merged" mention (e.g. describing a
// test fixture) must never be read as the work item being done. No status is
// ever inferred; absent this evidence the record stays "Unknown — requires
// review" per the Issue #116 review feedback ("do not infer a complete/closed
// work item from a TASK_LOG entry alone").
function isCloseoutEvidence(text) {
  const hasMergeSignal = /\bmerged\b/i.test(text) || /\bmerged as\b/i.test(text);
  const hasCloseoutSignal = /closeout/i.test(text) || /post-merge/i.test(text);
  return hasMergeSignal && hasCloseoutSignal;
}

export function determineStatus(group) {
  let closedDate = null;
  for (const row of group.rows) {
    if (isCloseoutEvidence(row.result || '')) {
      closedDate = row.date; // last matching row wins — rows are in file order (newest first in this repo's TASK_LOG)
    }
  }
  if (!closedDate) {
    // fall back to the earliest closeout-evidence row if rows aren't newest-first
    for (const row of [...group.rows].reverse()) {
      if (isCloseoutEvidence(row.result || '')) {
        closedDate = row.date;
        break;
      }
    }
  }
  return closedDate ? { status: `Closed (${closedDate})`, closedDate } : { status: 'Unknown — requires review', closedDate: null };
}

export async function existingIssueNumbers(rootDir) {
  const dir = path.join(rootDir, 'docs/records/work-items');
  let entries;
  try {
    entries = await readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return new Set();
    throw err;
  }
  const numbers = new Set();
  for (const entry of entries) {
    const m = entry.match(/issue-(\d+)/);
    if (m) numbers.add(Number(m[1]));
  }
  return numbers;
}

function earliestDate(group) {
  return [...group.rows].map((r) => r.date).sort()[0];
}

function buildRecordMarkdown(key, group, statusInfo) {
  const title = group.kind === 'issue' ? `Issue #${group.issueNumber}` : group.slug;
  const issueUrl =
    group.kind === 'issue' ? `https://github.com/chakrits/AI-Agent-Workflow/issues/${group.issueNumber}` : 'N/A — no Issue number found in TASK_LOG';

  const subtasks = group.rows
    .map((row) => `- ${row.date} — ${row.agent}: ${row.action}`)
    .join('\n');

  const provenance = group.rows
    .map((row) => `- TASK_LOG.md row: \`${row.date} | ${row.workItem}\` — ${row.result}`)
    .join('\n');

  return `# Work Item: ${title} (backfilled)

## Source
- Issue: ${issueUrl}
- Umbrella issue: N/A
- Boss directive: N/A — generated by \`scripts/backfill-work-item-records.mjs\` from historical TASK_LOG.md rows

## Classification
- Change type: Unknown — requires review
- Risk level: Unknown — requires review
- Workflow route: Unknown — requires review

## Artifacts
- Requirement: N/A
- SDD: N/A
- Implementation plan: N/A
- PRs: Unknown — requires review
- Closeout PR: Unknown — requires review
- Postmortem: N/A

## Sub-tasks
${subtasks}

## Provenance
${provenance}

## Lessons Learned
- N/A

## Metrics
- Tests before: N/A
- Subagent timeouts: N/A
- Rework cycles: N/A
- Packet version: N/A

## Status: ${statusInfo.status}

<!-- Generated by \`scripts/backfill-work-item-records.mjs\`. Do not hand-edit generated status without also correcting the underlying TASK_LOG.md evidence. -->
`;
}

export async function generateBackfill({ rootDir, write = false, pilot = false }) {
  const taskLogPath = path.join(rootDir, 'TASK_LOG.md');
  const content = await readFile(taskLogPath, 'utf8');
  const rows = parseTaskLogRows(content);
  const groups = groupRowsByWorkItem(rows);
  const existing = await existingIssueNumbers(rootDir);

  // Deterministic order: first appearance in TASK_LOG.md, top to bottom.
  const orderedKeys = [];
  const seen = new Set();
  for (const row of rows) {
    const { issues } = extractIssueNumbers(row.workItem);
    const keys = issues.length > 0 ? issues.map((n) => `issue-${n}`) : [`slug-${slugify(row.workItem)}`];
    for (const key of keys) {
      if (!seen.has(key)) {
        seen.add(key);
        orderedKeys.push(key);
      }
    }
  }

  const candidates = [];
  const skippedExisting = [];
  const written = [];

  for (const key of orderedKeys) {
    const group = groups.get(key);
    if (group.kind === 'issue' && existing.has(group.issueNumber)) {
      skippedExisting.push(key);
      continue;
    }
    candidates.push({ key, rowCount: group.rows.length, kind: group.kind });
  }

  const toWrite = pilot ? candidates.slice(0, PILOT_SIZE) : candidates;

  if (write) {
    const outDir = path.join(rootDir, 'docs/records/work-items');
    await mkdir(outDir, { recursive: true });
    for (const candidate of toWrite) {
      const group = groups.get(candidate.key);
      const statusInfo = determineStatus(group);
      const date = earliestDate(group);
      const filename =
        group.kind === 'issue' ? `${date}-issue-${group.issueNumber}.md` : `${date}-${slugify(group.slug)}.md`;
      const filePath = path.join(outDir, filename);
      await writeFile(filePath, buildRecordMarkdown(candidate.key, group, statusInfo));
      written.push({ key: candidate.key, filename, status: statusInfo.status });
    }
  }

  return { candidates, written, skippedExisting };
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const pilot = args.includes('--pilot');
  const rootDir = process.cwd();

  const plan = await generateBackfill({ rootDir, write, pilot });

  console.log(`Distinct work items found: ${plan.candidates.length + plan.skippedExisting.length}`);
  console.log(`Already has a record (skipped, never overwritten): ${plan.skippedExisting.length}`);
  console.log(`Candidates ${write ? 'written' : '(dry-run, nothing written)'}: ${pilot ? Math.min(PILOT_SIZE, plan.candidates.length) : plan.candidates.length}`);
  for (const candidate of plan.candidates.slice(0, pilot ? PILOT_SIZE : plan.candidates.length)) {
    console.log(`  - ${candidate.key} (${candidate.rowCount} TASK_LOG row${candidate.rowCount === 1 ? '' : 's'}, kind=${candidate.kind})`);
  }
  if (write) {
    console.log('\nWritten files:');
    for (const w of plan.written) console.log(`  - docs/records/work-items/${w.filename} — ${w.status}`);
  } else {
    console.log('\nRe-run with --write to generate files (add --pilot to limit to the first 10 for human review).');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
