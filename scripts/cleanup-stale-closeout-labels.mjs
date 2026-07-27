import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

const DEFAULT_LABEL = 'post-merge-closeout';
const DEFAULT_STALE_DAYS = 7;

// Issue #116 review finding: `gh pr list --state merged --label` silently
// ignores the label filter for merged PRs (52 claimed vs 7 actual, verified
// via GraphQL). This script therefore never uses `gh pr list --label` as an
// authority — only the GraphQL API for enumeration, and `gh pr view` per-PR
// for confirmation.
const CANDIDATE_QUERY = `
query($owner: String!, $repo: String!, $label: [String!], $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(states: MERGED, labels: $label, first: 50, after: $after) {
      nodes { number mergedAt }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

export async function listCandidatePRs({ owner, repo, label, graphqlRunner }) {
  const results = [];
  let after = null;
  for (;;) {
    const response = await graphqlRunner(CANDIDATE_QUERY, { owner, repo, label: [label], after });
    const { nodes, pageInfo } = response.data.repository.pullRequests;
    for (const node of nodes) results.push({ number: node.number, mergedAt: node.mergedAt });
    if (!pageInfo.hasNextPage) break;
    after = pageInfo.endCursor;
  }
  return results;
}

// Re-derives ground truth per PR instead of trusting the GraphQL snapshot,
// because label state can change between enumeration and use (Issue #118
// AC-4: "Script uses gh pr view --json labels per-PR, not gh pr list --label").
export async function confirmPRLabel({ number, label, viewRunner }) {
  const state = await viewRunner(number);
  if (state.state !== 'MERGED') return null;
  if (!state.labels.includes(label)) return null;
  return { number, mergedAt: state.mergedAt };
}

export function ageInDays(mergedAt, now) {
  const ms = now.getTime() - new Date(mergedAt).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

// Age is a candidate-review signal only, never deletion evidence (Issue #116
// review finding: age-only removal can erase evidence of an incomplete
// closeout). `reviewRecommended` marks nothing more than "old enough that a
// human should look" — it never triggers automatic removal.
export async function buildDryRunReport({ owner, repo, label = DEFAULT_LABEL, staleDays = DEFAULT_STALE_DAYS, graphqlRunner, viewRunner, now = new Date() }) {
  const rawCandidates = await listCandidatePRs({ owner, repo, label, graphqlRunner });
  const candidates = [];
  for (const raw of rawCandidates) {
    const confirmed = await confirmPRLabel({ number: raw.number, label, viewRunner });
    if (!confirmed) continue; // GraphQL snapshot was stale; not a real candidate
    const ageDays = ageInDays(confirmed.mergedAt, now);
    candidates.push({ ...confirmed, ageDays, reviewRecommended: ageDays > staleDays });
  }
  return { candidates, generatedAt: now.toISOString() };
}

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function requirePositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
}

function validateReconciliationEvidence(evidence, { prefix, manifest, sourcePr }) {
  const evidencePrefix = `${prefix}.reconciliationEvidence`;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw new Error(`${evidencePrefix} must be an object`);
  }
  if (!['closeout_pr', 'project_state'].includes(evidence.kind)) {
    throw new Error(`${evidencePrefix}.kind must be one of: closeout_pr, project_state`);
  }
  if (evidence.owner !== manifest.owner) {
    throw new Error(`${evidencePrefix}.owner must match manifest.owner`);
  }
  if (evidence.repo !== manifest.repo) {
    throw new Error(`${evidencePrefix}.repo must match manifest.repo`);
  }
  requirePositiveInteger(evidence.sourcePr, `${evidencePrefix}.sourcePr`);
  if (evidence.sourcePr !== sourcePr) {
    throw new Error(`${evidencePrefix}.sourcePr must match ${prefix}.sourcePr`);
  }
  if (!evidence.reference || typeof evidence.reference !== 'object' || Array.isArray(evidence.reference)) {
    throw new Error(`${evidencePrefix}.reference must be an object`);
  }
  requirePositiveInteger(evidence.reference.sourcePr, `${evidencePrefix}.reference.sourcePr`);
  if (evidence.reference.sourcePr !== sourcePr) {
    throw new Error(`${evidencePrefix}.reference.sourcePr must match ${prefix}.sourcePr`);
  }
  if (evidence.kind === 'closeout_pr') {
    requirePositiveInteger(evidence.reference.pullRequest, `${evidencePrefix}.reference.pullRequest`);
    if (evidence.reference.pullRequest === sourcePr) {
      throw new Error(`${evidencePrefix}.reference.pullRequest must identify a distinct closeout PR`);
    }
  } else {
    if (evidence.reference.path !== 'PROJECT_STATUS.md') {
      throw new Error(`${evidencePrefix}.reference.path must be PROJECT_STATUS.md`);
    }
  }
}

function validateManifestPR(entry, index) {
  const prefix = `manifest.prs[${index}]`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`${prefix} must be an object with per-PR reconciliation provenance`);
  }
  requirePositiveInteger(entry.number, `${prefix}.number`);
  requirePositiveInteger(entry.sourcePr, `${prefix}.sourcePr`);
  if (entry.sourcePr !== entry.number) {
    throw new Error(`${prefix}.sourcePr must match the PR whose label would be removed`);
  }
  requireNonEmptyString(entry.missedCleanupRationale, `${prefix}.missedCleanupRationale`);
}

function assertManifestBinding(manifest, expected) {
  if (!expected) return;
  for (const field of ['owner', 'repo', 'label']) {
    if (manifest[field] !== expected[field]) {
      throw new Error(`manifest ${field} does not match requested ${field}`);
    }
  }
}

export async function loadManifest(manifestPath, expectedBinding) {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const missing = [];
  if (!manifest.approvedBy) missing.push('approvedBy');
  if (!manifest.approvedAt) missing.push('approvedAt');
  if (!manifest.owner) missing.push('owner');
  if (!manifest.repo) missing.push('repo');
  if (!manifest.label) missing.push('label');
  if (missing.length) throw new Error(`manifest is missing required field(s): ${missing.join(', ')}`);
  if (!Array.isArray(manifest.prs) || manifest.prs.length === 0) {
    throw new Error('manifest.prs must be a non-empty array of approved PR records');
  }
  manifest.prs.forEach((entry, index) => {
    validateManifestPR(entry, index);
    validateReconciliationEvidence(entry.reconciliationEvidence, {
      prefix: `manifest.prs[${index}]`,
      manifest,
      sourcePr: entry.sourcePr
    });
  });
  assertManifestBinding(manifest, expectedBinding);
  return manifest;
}

// `--apply` is an external GitHub write; a human-approved manifest names
// *which* PRs may be touched, but this function still re-confirms each one
// live immediately before removing its label — the manifest authorizes
// intent, it does not substitute for a fresh check (Issue #118: "Developer
// must not remove labels merely because a local test passes").
export async function applyManifest({ owner, repo, label = DEFAULT_LABEL, manifestPath, viewRunner, removeLabelRunner, readManifest = loadManifest }) {
  const manifest = await readManifest(manifestPath, { owner, repo, label });
  const removed = [];
  const skipped = [];
  for (const { number } of manifest.prs) {
    const confirmed = await confirmPRLabel({ number, label, viewRunner });
    if (!confirmed) {
      skipped.push({ number, reason: 'label already removed or PR no longer merged as of live re-check' });
      continue;
    }
    await removeLabelRunner(number, { owner, repo, label });
    removed.push(number);
  }
  return { removed, skipped, manifest };
}

async function ghGraphqlRunner(query, variables) {
  const { stdout } = await execFileAsync('gh', ['api', 'graphql', '-f', `query=${query}`, ...ghVariableArgs(variables)]);
  return JSON.parse(stdout);
}

function ghVariableArgs(variables) {
  const args = [];
  for (const [key, value] of Object.entries(variables)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) args.push('-f', `${key}[]=${v}`);
    } else {
      args.push('-f', `${key}=${value}`);
    }
  }
  return args;
}

// Both gh calls below take an explicit --repo instead of relying on the
// current working directory's git remote. confirmPRLabel/applyManifest are
// given owner/repo explicitly by the caller; silently trusting ambient cwd
// context instead would let --owner/--repo be no-ops for the very calls
// that actually read or mutate GitHub state.
async function ghViewRunner(number, owner, repo) {
  const { stdout } = await execFileAsync('gh', ['pr', 'view', String(number), '--repo', `${owner}/${repo}`, '--json', 'state,mergedAt,labels']);
  const parsed = JSON.parse(stdout);
  return { state: parsed.state, mergedAt: parsed.mergedAt, labels: parsed.labels.map((l) => l.name) };
}

async function ghRemoveLabelRunner(number, { owner, repo, label }) {
  await execFileAsync('gh', ['pr', 'edit', String(number), '--repo', `${owner}/${repo}`, '--remove-label', label]);
}

function parseArgs(argv) {
  const args = { apply: false, manifest: null, owner: 'chakrits', repo: 'AI-Agent-Workflow', label: DEFAULT_LABEL, staleDays: DEFAULT_STALE_DAYS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--owner') args.owner = argv[++i];
    else if (arg === '--repo') args.repo = argv[++i];
    else if (arg === '--label') args.label = argv[++i];
    else if (arg === '--stale-days') args.staleDays = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // confirmPRLabel's interface is viewRunner(number) -- owner/repo are bound
  // here via closure so --owner/--repo actually reach the gh calls that read
  // and mutate GitHub state, instead of those calls silently falling back to
  // whatever repo the cwd's git remote happens to point at.
  const viewRunner = (number) => ghViewRunner(number, args.owner, args.repo);

  if (args.apply) {
    if (!args.manifest) {
      console.error('--apply requires --manifest <approved-file>. A local test result alone never authorizes label removal.');
      process.exitCode = 1;
      return;
    }
    const result = await applyManifest({
      owner: args.owner,
      repo: args.repo,
      label: args.label,
      manifestPath: args.manifest,
      viewRunner,
      removeLabelRunner: ghRemoveLabelRunner
    });
    console.log(`Removed "${args.label}" from: ${result.removed.join(', ') || '(none)'}`);
    if (result.skipped.length) {
      console.log('Skipped (live re-check failed):');
      for (const s of result.skipped) console.log(`  - #${s.number}: ${s.reason}`);
    }
    return;
  }

  const report = await buildDryRunReport({
    owner: args.owner,
    repo: args.repo,
    label: args.label,
    staleDays: args.staleDays,
    graphqlRunner: ghGraphqlRunner,
    viewRunner
  });

  console.log(`Confirmed candidates carrying "${args.label}" on a merged PR: ${report.candidates.length}`);
  for (const c of report.candidates) {
    console.log(`  - #${c.number} merged ${c.mergedAt} (${c.ageDays}d ago)${c.reviewRecommended ? ' — review candidate (>' + args.staleDays + 'd)' : ''}`);
  }
  console.log('\nAge marks review candidates only. Build a human-approved manifest and re-run with --apply --manifest <file> to remove any label.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
