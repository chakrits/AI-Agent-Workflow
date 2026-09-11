import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

export const receiptsDir = 'docs/records/dispatch-receipts';

/**
 * True when a receipt (already parsed from YAML) represents a newly
 * `registered` dispatch and is therefore notify-worthy. `consumed`,
 * `expired`, and `cancelled` receipts never trigger a notify action
 * (SDD Component Design §3/§3a).
 */
export function isNotifyCandidate(receipt) {
  return receipt?.state === 'registered';
}

/**
 * Parse a receipt's `work_item_url` into the owner/repo/issue_number tuple
 * the GitHub Issues REST API needs. Accepts both `/issues/<n>` and
 * `/pull/<n>` paths (a Pull Request is addressable via the Issues API using
 * the same numeric id), with or without a trailing slash, query string, or
 * URL fragment. Returns `undefined` for anything that does not match --
 * callers must treat that as an unresolved work item (SDD Error Handling
 * table: "Notify workflow cannot resolve work_item_url").
 */
export function parseWorkItemUrl(workItemUrl) {
  if (typeof workItemUrl !== 'string') return undefined;
  const match = workItemUrl.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)(?:[/?#].*)?$/
  );
  if (!match) return undefined;
  const [, owner, repo, issueNumber] = match;
  return { owner, repo, issueNumber: Number(issueNumber) };
}

/**
 * Slug used in the `agent:<slug>` label (e.g. `Security Reviewer` ->
 * `security-reviewer`). Lower-cases, then replaces any run of
 * non-alphanumeric characters with a single hyphen, trimming leading and
 * trailing hyphens.
 */
export function slugifyAgentName(targetAgent) {
  return String(targetAgent ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildLabelName(targetAgent) {
  return `agent:${slugifyAgentName(targetAgent)}`;
}

export function buildIdempotencyMarker(handoffEventId) {
  return `<!-- dispatch-receipt-notify:handoff-${handoffEventId} -->`;
}

/**
 * `true` when an existing comment on the work item already carries this
 * receipt's idempotency marker as required text within its body. Callers
 * pass in an already-fetched comment list (e.g. `github.paginate(...)`
 * output); this function performs no I/O of its own.
 */
export function hasExistingNotification(comments, handoffEventId) {
  const marker = buildIdempotencyMarker(handoffEventId);
  return (comments ?? []).some((comment) => comment?.body?.includes(marker));
}

/**
 * Build the full notify comment body: idempotency marker as the first
 * line, followed by the assignment summary and a link to the merged
 * receipt file at its commit SHA (SDD §3a "Notify content -- exact
 * mapping").
 */
export function buildCommentBody({
  handoffEventId,
  targetAgent,
  workItemUrl,
  receiptRepoPath,
  commitSha,
  repository
}) {
  const marker = buildIdempotencyMarker(handoffEventId);
  const receiptUrl = `https://github.com/${repository.owner}/${repository.repo}/blob/${commitSha}/${receiptRepoPath}`;
  return [
    marker,
    '',
    `Next Owner: ${targetAgent}`,
    `Handoff Event ID: ${handoffEventId}`,
    `Receipt: ${receiptUrl}`,
    `Work Item: ${workItemUrl}`
  ].join('\n');
}

/**
 * Given the set of receipt file paths changed by a push (added or
 * modified), and a loader that returns each file's parsed YAML content,
 * build the list of notify actions to perform: one per notify-worthy
 * receipt. Pure aside from the injected `loadReceipt` callback, so tests
 * can supply an in-memory map instead of touching the filesystem.
 */
export async function resolveNotifyActions(changedReceiptPaths, loadReceipt) {
  const actions = [];
  for (const relativePath of changedReceiptPaths ?? []) {
    const receipt = await loadReceipt(relativePath);
    if (!receipt || !isNotifyCandidate(receipt)) continue;
    const target = parseWorkItemUrl(receipt.work_item_url);
    actions.push({
      relativePath,
      receipt,
      target
    });
  }
  return actions;
}

/**
 * Determine which `docs/records/dispatch-receipts/*.yaml` files were added
 * or modified by the triggering push, via `git diff --name-only` between
 * the push event's before/after commits -- the same push-range diffing
 * convention `validate-dispatch-receipts.mjs`'s `resolveChangedHandoffPaths`
 * already established in this repo (SDD §3a "Diff-filtering precision").
 * I/O boundary: not unit-tested directly; `resolveNotifyActions` above
 * carries the testable logic once the path list is known.
 */
export function resolveChangedReceiptPaths(rootDir, env = process.env) {
  const before = env.GITHUB_EVENT_BEFORE;
  const after = env.GITHUB_EVENT_AFTER || env.GITHUB_SHA;
  if (!before || !after || /^0+$/.test(before)) return [];
  try {
    const diffOutput = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMR', `${before}`, `${after}`, '--', `${receiptsDir}/*.yaml`],
      { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString();
    return diffOutput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function loadReceiptFromDisk(rootDir, relativePath) {
  const content = await readFile(path.join(rootDir, relativePath), 'utf8');
  return YAML.parse(content) ?? {};
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rootDir = process.cwd();
  const changedPaths = resolveChangedReceiptPaths(rootDir);
  const actions = await resolveNotifyActions(changedPaths, (relativePath) =>
    loadReceiptFromDisk(rootDir, relativePath)
  );
  console.log(JSON.stringify(actions, null, 2));
}
