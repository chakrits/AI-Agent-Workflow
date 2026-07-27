import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  listCandidatePRs,
  confirmPRLabel,
  ageInDays,
  buildDryRunReport,
  loadManifest,
  applyManifest
} from '../scripts/cleanup-stale-closeout-labels.mjs';

test('listCandidatePRs follows GraphQL pagination to collect every labeled merged PR', async () => {
  const pages = [
    { pullRequests: { nodes: [{ number: 21, mergedAt: '2026-07-16T00:00:00Z' }], pageInfo: { hasNextPage: true, endCursor: 'A' } } },
    { pullRequests: { nodes: [{ number: 22, mergedAt: '2026-07-18T00:00:00Z' }], pageInfo: { hasNextPage: false, endCursor: null } } }
  ];
  let call = 0;
  const graphqlRunner = async (query, variables) => {
    assert.match(query, /pullRequests\(states: MERGED/);
    if (call === 0) assert.equal(variables.after, null);
    else assert.equal(variables.after, 'A');
    return { data: { repository: pages[call++] } };
  };

  const result = await listCandidatePRs({ owner: 'chakrits', repo: 'AI-Agent-Workflow', label: 'post-merge-closeout', graphqlRunner });

  assert.deepEqual(result, [
    { number: 21, mergedAt: '2026-07-16T00:00:00Z' },
    { number: 22, mergedAt: '2026-07-18T00:00:00Z' }
  ]);
});

test('confirmPRLabel accepts a PR that is genuinely merged and still carries the label', async () => {
  const viewRunner = async (number) => {
    assert.equal(number, 21);
    return { state: 'MERGED', mergedAt: '2026-07-16T00:00:00Z', labels: ['post-merge-closeout'] };
  };

  const result = await confirmPRLabel({ number: 21, label: 'post-merge-closeout', viewRunner });

  assert.deepEqual(result, { number: 21, mergedAt: '2026-07-16T00:00:00Z' });
});

test('confirmPRLabel rejects a PR whose label was already removed since the GraphQL snapshot', async () => {
  const viewRunner = async () => ({ state: 'MERGED', mergedAt: '2026-07-16T00:00:00Z', labels: [] });

  const result = await confirmPRLabel({ number: 21, label: 'post-merge-closeout', viewRunner });

  assert.equal(result, null);
});

test('confirmPRLabel rejects a PR that is not actually merged', async () => {
  const viewRunner = async () => ({ state: 'OPEN', mergedAt: null, labels: ['post-merge-closeout'] });

  const result = await confirmPRLabel({ number: 21, label: 'post-merge-closeout', viewRunner });

  assert.equal(result, null);
});

test('ageInDays computes whole days between mergedAt and now', () => {
  assert.equal(ageInDays('2026-07-16T00:00:00Z', new Date('2026-07-27T00:00:00Z')), 11);
  assert.equal(ageInDays('2026-07-25T00:00:00Z', new Date('2026-07-27T00:00:00Z')), 2);
});

test('buildDryRunReport confirms every GraphQL candidate per-PR and only flags age as a review signal, never as deletion evidence', async () => {
  const graphqlRunner = async () => ({
    data: {
      repository: {
        pullRequests: {
          nodes: [
            { number: 21, mergedAt: '2026-07-16T00:00:00Z' },
            { number: 94, mergedAt: '2026-07-25T00:00:00Z' },
            { number: 999, mergedAt: '2026-07-10T00:00:00Z' } // stale GraphQL snapshot: label already gone
          ],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      }
    }
  });
  const viewRunner = async (number) => {
    if (number === 999) return { state: 'MERGED', mergedAt: '2026-07-10T00:00:00Z', labels: [] };
    return { state: 'MERGED', mergedAt: number === 21 ? '2026-07-16T00:00:00Z' : '2026-07-25T00:00:00Z', labels: ['post-merge-closeout'] };
  };

  const report = await buildDryRunReport({
    owner: 'chakrits',
    repo: 'AI-Agent-Workflow',
    label: 'post-merge-closeout',
    staleDays: 7,
    graphqlRunner,
    viewRunner,
    now: new Date('2026-07-27T00:00:00Z')
  });

  assert.equal(report.candidates.length, 2);
  const byNumber = Object.fromEntries(report.candidates.map((c) => [c.number, c]));
  assert.equal(byNumber[21].ageDays, 11);
  assert.equal(byNumber[21].reviewRecommended, true);
  assert.equal(byNumber[94].ageDays, 2);
  assert.equal(byNumber[94].reviewRecommended, false);
  assert.ok(!byNumber[999], 'a candidate whose label is already gone must not appear in the report');
});

test('loadManifest requires approver identity, date, and evidence before any PR is trusted', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'manifest-'));
  try {
    const badPath = path.join(dir, 'bad.json');
    await writeFile(badPath, JSON.stringify({ prs: [21] }));
    await assert.rejects(() => loadManifest(badPath), /approvedBy/);

    const goodPath = path.join(dir, 'good.json');
    await writeFile(
      goodPath,
      JSON.stringify({ approvedBy: 'chakrits', approvedAt: '2026-07-28', evidence: 'closeout merged, label missed by automation', prs: [21, 22] })
    );
    const manifest = await loadManifest(goodPath);
    assert.deepEqual(manifest.prs, [21, 22]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadManifest rejects an empty PR list', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'manifest-'));
  try {
    const emptyPath = path.join(dir, 'empty.json');
    await writeFile(emptyPath, JSON.stringify({ approvedBy: 'chakrits', approvedAt: '2026-07-28', evidence: 'x', prs: [] }));
    await assert.rejects(() => loadManifest(emptyPath), /prs/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('applyManifest re-confirms every PR live before removing the label — a stale local test result never authorizes removal on its own', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'manifest-'));
  try {
    const manifestPath = path.join(dir, 'manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify({ approvedBy: 'chakrits', approvedAt: '2026-07-28', evidence: 'x', prs: [21, 22] })
    );

    const viewRunner = async (number) => {
      if (number === 21) return { state: 'MERGED', mergedAt: '2026-07-16T00:00:00Z', labels: ['post-merge-closeout'] };
      // #22's label was already removed by someone else between manifest approval and apply time
      return { state: 'MERGED', mergedAt: '2026-07-18T00:00:00Z', labels: [] };
    };
    const removed = [];
    const removeLabelRunner = async (number) => removed.push(number);

    const result = await applyManifest({
      owner: 'chakrits',
      repo: 'AI-Agent-Workflow',
      label: 'post-merge-closeout',
      manifestPath,
      viewRunner,
      removeLabelRunner
    });

    assert.deepEqual(removed, [21]);
    assert.deepEqual(result.removed, [21]);
    assert.deepEqual(result.skipped, [{ number: 22, reason: 'label already removed or PR no longer merged as of live re-check' }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('applyManifest never removes a label for a PR outside the approved manifest', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'manifest-'));
  try {
    const manifestPath = path.join(dir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({ approvedBy: 'chakrits', approvedAt: '2026-07-28', evidence: 'x', prs: [21] }));
    const removed = [];
    const viewRunner = async () => ({ state: 'MERGED', mergedAt: '2026-07-16T00:00:00Z', labels: ['post-merge-closeout'] });
    const removeLabelRunner = async (number) => removed.push(number);

    await applyManifest({ owner: 'chakrits', repo: 'AI-Agent-Workflow', label: 'post-merge-closeout', manifestPath, viewRunner, removeLabelRunner });

    assert.deepEqual(removed, [21]);
    assert.equal(removed.includes(22), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
