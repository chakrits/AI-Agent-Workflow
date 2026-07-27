import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  parseTaskLogRows,
  extractIssueNumbers,
  groupRowsByWorkItem,
  determineStatus,
  existingIssueNumbers,
  generateBackfill
} from '../scripts/backfill-work-item-records.mjs';

const HEADER = '| Date | Work Item | Agent | Action | Result | Next Agent | Notes |\n';

async function withRootDir(files, run) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'backfill-work-items-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const dest = path.join(rootDir, rel);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content);
    }
    await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

test('parseTaskLogRows extracts cells from a TASK_LOG table, skipping the header', () => {
  const content = `# TASK_LOG.md\n\n${HEADER}| 2026-07-27 | GitHub Issue #111 | Documentation Agent | Closeout | Merged | Human | note |\n`;
  const rows = parseTaskLogRows(content);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, '2026-07-27');
  assert.equal(rows[0].workItem, 'GitHub Issue #111');
  assert.equal(rows[0].agent, 'Documentation Agent');
  assert.equal(rows[0].action, 'Closeout');
  assert.equal(rows[0].result, 'Merged');
});

test('extractIssueNumbers finds a single explicitly-labeled issue', () => {
  assert.deepEqual(extractIssueNumbers('GitHub Issue #111 / PR #114'), { issues: [111], prs: [114] });
});

test('extractIssueNumbers finds multiple issues plus a PR in one column', () => {
  assert.deepEqual(extractIssueNumbers('GitHub Issues #26 / #29; PR #31'), { issues: [26, 29], prs: [31] });
});

test('extractIssueNumbers treats a bare trailing number as an issue reference', () => {
  assert.deepEqual(extractIssueNumbers('AGENT-PERSONAS-2026-07-16 / #16'), { issues: [16], prs: [] });
});

test('extractIssueNumbers finds both issue numbers in a combined retrospective column', () => {
  assert.deepEqual(
    extractIssueNumbers('GitHub Issue #106/#108 retrospective / PR #112'),
    { issues: [106, 108], prs: [112] }
  );
});

test('extractIssueNumbers returns no issues for a pure slug with no number', () => {
  assert.deepEqual(extractIssueNumbers('PHASE1-STABILIZE-CORE-2026-07-13'), { issues: [], prs: [] });
});

test('groupRowsByWorkItem puts a row into every issue group it references', () => {
  const rows = [
    { date: '2026-07-26', workItem: 'GitHub Issue #106/#108 retrospective / PR #112', agent: 'x', action: 'a', result: 'r', nextAgent: 'n', notes: '' }
  ];
  const groups = groupRowsByWorkItem(rows);

  assert.ok(groups.has('issue-106'));
  assert.ok(groups.has('issue-108'));
  assert.equal(groups.get('issue-106').rows.length, 1);
  assert.equal(groups.get('issue-108').rows.length, 1);
});

test('groupRowsByWorkItem merges multiple rows referencing the same issue into one group', () => {
  const rows = [
    { date: '2026-07-26', workItem: 'GitHub Issue #106', agent: 'a', action: 'a1', result: 'r1', nextAgent: 'n', notes: '' },
    { date: '2026-07-26', workItem: 'GitHub Issue #106', agent: 'b', action: 'a2', result: 'r2', nextAgent: 'n', notes: '' }
  ];
  const groups = groupRowsByWorkItem(rows);

  assert.equal(groups.size, 1);
  assert.equal(groups.get('issue-106').rows.length, 2);
});

test('groupRowsByWorkItem creates a slug group for identifier-less work items', () => {
  const rows = [
    { date: '2026-07-13', workItem: 'PHASE1-STABILIZE-CORE-2026-07-13', agent: 'a', action: 'a1', result: 'r1', nextAgent: 'n', notes: '' }
  ];
  const groups = groupRowsByWorkItem(rows);

  assert.equal(groups.size, 1);
  const [key, group] = [...groups.entries()][0];
  assert.equal(group.kind, 'slug');
  assert.match(key, /^slug-/);
});

test('determineStatus stays Unknown when no merge/closeout evidence exists', () => {
  const group = {
    rows: [
      { date: '2026-07-26', result: 'Design proposal drafted, not implemented.' }
    ]
  };

  assert.deepEqual(determineStatus(group), { status: 'Unknown — requires review', closedDate: null });
});

test('determineStatus reports Closed only when a row shows merged closeout evidence', () => {
  const group = {
    rows: [
      { date: '2026-07-25', result: 'Implemented the fix.' },
      { date: '2026-07-27', result: 'PR #114 merged as `cb8a9e2`; post-merge closeout complete.' }
    ]
  };

  assert.deepEqual(determineStatus(group), { status: 'Closed (2026-07-27)', closedDate: '2026-07-27' });
});

test('determineStatus never infers Closed from a bare "merged" mention without closeout context', () => {
  const group = {
    rows: [
      { date: '2026-07-25', result: 'Two branches were merged into a shared fixture for testing.' }
    ]
  };

  assert.deepEqual(determineStatus(group), { status: 'Unknown — requires review', closedDate: null });
});

test('existingIssueNumbers scans docs/records/work-items filenames for issue numbers', async () => {
  await withRootDir(
    {
      'docs/records/work-items/2026-07-22-issue-59-new-feature-contract.md': '# x',
      'docs/records/work-items/2026-07-26-issue-102-dispatch-prompt-contract.md': '# x',
      'docs/records/postmortem/2026-07-27-framework-gap-analysis.md': '# not a work item'
    },
    async (rootDir) => {
      const existing = await existingIssueNumbers(rootDir);
      assert.deepEqual([...existing].sort((a, b) => a - b), [59, 102]);
    }
  );
});

test('generateBackfill dry-run reports the plan without writing any files', async () => {
  const taskLog = `# TASK_LOG.md\n\n${HEADER}| 2026-07-27 | GitHub Issue #200 | Developer Agent | Did work | Result text | QA | note |\n`;
  await withRootDir({ 'TASK_LOG.md': taskLog }, async (rootDir) => {
    const plan = await generateBackfill({ rootDir, write: false });

    assert.equal(plan.written.length, 0);
    assert.equal(plan.candidates.length, 1);
    assert.equal(plan.candidates[0].key, 'issue-200');
    await assert.rejects(readFile(path.join(rootDir, 'docs/records/work-items/2026-07-27-issue-200.md')));
  });
});

test('generateBackfill --pilot limits output to the first 10 new groups in file order', async () => {
  const rows = Array.from({ length: 15 }, (_, i) => `| 2026-07-27 | GitHub Issue #${300 + i} | Developer Agent | Did work | Result text | QA | note |`).join('\n');
  const taskLog = `# TASK_LOG.md\n\n${HEADER}${rows}\n`;
  await withRootDir({ 'TASK_LOG.md': taskLog }, async (rootDir) => {
    const plan = await generateBackfill({ rootDir, write: true, pilot: true });

    assert.equal(plan.written.length, 10);
    assert.deepEqual(plan.written.map((w) => w.key).sort(), Array.from({ length: 10 }, (_, i) => `issue-${300 + i}`).sort());
  });
});

test('generateBackfill never overwrites a group whose issue number already has a record', async () => {
  const taskLog = `# TASK_LOG.md\n\n${HEADER}| 2026-07-27 | GitHub Issue #102 | Developer Agent | Did work | Result text | QA | note |\n`;
  await withRootDir(
    {
      'TASK_LOG.md': taskLog,
      'docs/records/work-items/2026-07-26-issue-102-dispatch-prompt-contract.md': '# existing, untouched'
    },
    async (rootDir) => {
      const plan = await generateBackfill({ rootDir, write: true });

      assert.equal(plan.written.length, 0);
      assert.equal(plan.skippedExisting.length, 1);
      assert.equal(plan.skippedExisting[0], 'issue-102');
      const existingContent = await readFile(
        path.join(rootDir, 'docs/records/work-items/2026-07-26-issue-102-dispatch-prompt-contract.md'),
        'utf8'
      );
      assert.equal(existingContent, '# existing, untouched');
    }
  );
});

test('generateBackfill never overwrites a slug-kind record a human already hand-edited on disk', async () => {
  const taskLog = `# TASK_LOG.md\n\n${HEADER}| 2026-07-13 | STANDALONE-SLUG-2026-07-13 | Dev | did work | some result | QA | note |\n`;
  await withRootDir({ 'TASK_LOG.md': taskLog }, async (rootDir) => {
    const first = await generateBackfill({ rootDir, write: true });
    assert.equal(first.written.length, 1);
    const filePath = path.join(rootDir, 'docs/records/work-items', first.written[0].filename);
    await writeFile(filePath, '# HAND-EDITED, DO NOT LOSE THIS\n');

    const second = await generateBackfill({ rootDir, write: true });

    assert.equal(second.written.length, 0);
    assert.deepEqual(second.skippedExisting, ['slug-standalone-slug-2026-07-13']);
    const contentAfter = await readFile(filePath, 'utf8');
    assert.equal(contentAfter, '# HAND-EDITED, DO NOT LOSE THIS\n');
  });
});

test('generateBackfill is idempotent: running twice with --write produces the same file set', async () => {
  const taskLog = `# TASK_LOG.md\n\n${HEADER}| 2026-07-27 | GitHub Issue #400 | Developer Agent | Did work | Result text | QA | note |\n`;
  await withRootDir({ 'TASK_LOG.md': taskLog }, async (rootDir) => {
    const first = await generateBackfill({ rootDir, write: true });
    const second = await generateBackfill({ rootDir, write: true });

    assert.equal(first.written.length, 1);
    assert.equal(second.written.length, 0);
    assert.deepEqual(second.skippedExisting, ['issue-400']);
  });
});

test('generateBackfill marks status Unknown, never guesses Closed, for a plain in-progress row', async () => {
  const taskLog = `# TASK_LOG.md\n\n${HEADER}| 2026-07-27 | GitHub Issue #500 | Developer Agent | Designed the approach | Design proposal only, awaiting review | Boss | note |\n`;
  await withRootDir({ 'TASK_LOG.md': taskLog }, async (rootDir) => {
    const plan = await generateBackfill({ rootDir, write: true });

    const content = await readFile(path.join(rootDir, 'docs/records/work-items/2026-07-27-issue-500.md'), 'utf8');
    assert.match(content, /Unknown — requires review/);
    assert.doesNotMatch(content, /Status: Closed/);
  });
});

test('generateBackfill writes a record carrying TASK_LOG provenance for every source row', async () => {
  const taskLog = `# TASK_LOG.md\n\n${HEADER}| 2026-07-27 | GitHub Issue #600 / PR #601 | Developer Agent | Did work | PR #601 merged as \`abc1234\`; post-merge closeout complete. | Human | note |\n`;
  await withRootDir({ 'TASK_LOG.md': taskLog }, async (rootDir) => {
    const plan = await generateBackfill({ rootDir, write: true });

    assert.equal(plan.written.length, 1);
    const content = await readFile(path.join(rootDir, 'docs/records/work-items/2026-07-27-issue-600.md'), 'utf8');
    assert.match(content, /Status: Closed \(2026-07-27\)/);
    assert.match(content, /TASK_LOG\.md/);
    assert.match(content, /PR #601/);
    assert.match(content, /Generated by `scripts\/backfill-work-item-records\.mjs`/);
  });
});

test('the real repository TASK_LOG.md parses without throwing and groups by distinct issue', async () => {
  const content = await readFile('TASK_LOG.md', 'utf8');
  const rows = parseTaskLogRows(content);
  const groups = groupRowsByWorkItem(rows);
  const issueGroups = [...groups.values()].filter((g) => g.kind === 'issue');

  assert.ok(rows.length > 100, `expected >100 TASK_LOG rows, got ${rows.length}`);
  assert.ok(issueGroups.length > 15, `expected >15 distinct issue groups, got ${issueGroups.length}`);
  for (const group of issueGroups) {
    assert.ok(group.rows.length >= 1);
  }
});
