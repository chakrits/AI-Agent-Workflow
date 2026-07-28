import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';

const receiptsDir = 'docs/records/dispatch-receipts';
const schemaPath = 'docs/contracts/schemas/dispatch-receipt.schema.json';

async function listFiles(dir, extension) {
  try {
    return (await readdir(dir))
      .filter((name) => name.endsWith(extension))
      .map((name) => path.join(dir, name));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readReceiptFiles(rootDir) {
  const files = await listFiles(path.join(rootDir, receiptsDir), '.yaml');
  const receipts = [];
  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath);
    const stem = path.basename(filePath, '.yaml');
    const content = YAML.parse(await readFile(filePath, 'utf8')) ?? {};
    receipts.push({ relativePath, stem, content });
  }
  return receipts;
}

/**
 * Determine which docs/records/HANDOFF-*.md files are part of the current
 * pull request's diff against its base branch merge-base.
 *
 * Only pull_request-triggered CI runs are scoped this way: a PR's own
 * Dispatch declaration is always authored in the same PR/commit as its
 * receipt (SDD "Receipt-authorship duty"), so it is sufficient (and
 * required, to avoid the full-repo blast-radius failure mode) to check
 * only the handoff files this PR itself adds or modifies.
 *
 * Returns `undefined` (meaning "no scoping, fall back to a full scan")
 * when not running as a pull_request check, or when git-based scoping is
 * unavailable (e.g. shallow clone, no origin remote, local ad-hoc run) --
 * a full scan is the correct behavior for a push/post-merge run, since by
 * that point the repo should already be internally consistent.
 */
export function resolveChangedHandoffPaths(rootDir, env = process.env) {
  if (env.GITHUB_EVENT_NAME && env.GITHUB_EVENT_NAME !== 'pull_request') return undefined;
  const baseRef = env.GITHUB_BASE_REF || 'main';
  try {
    const mergeBase = execFileSync('git', ['merge-base', `origin/${baseRef}`, 'HEAD'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();
    if (!mergeBase) return undefined;
    const diffOutput = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}...HEAD`, '--', 'docs/records/handoff/*.md'],
      { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString();
    return diffOutput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return undefined;
  }
}

async function readHandoffFiles(rootDir, changedHandoffPaths) {
  const files = await listFiles(path.join(rootDir, 'docs/records/handoff'), '.md');
  const scoped = changedHandoffPaths ? new Set(changedHandoffPaths) : undefined;
  const handoffs = [];
  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath);
    if (scoped && !scoped.has(relativePath)) continue;
    const content = await readFile(filePath, 'utf8');
    handoffs.push({ relativePath, content });
  }
  return handoffs;
}

function extractField(markdown, fieldName) {
  const pattern = new RegExp(`^##\\s*${fieldName}\\s*\\n+([^\\n]*)`, 'im');
  const match = markdown.match(pattern);
  if (!match) return undefined;
  const value = match[1].trim();
  return value.length ? value : undefined;
}

export function parseHandoffDispatchDeclarations(handoffFiles) {
  const declarations = [];
  for (const { relativePath, content } of handoffFiles) {
    const nextAction = extractField(content, 'Next Action');
    if (nextAction !== 'Dispatch') continue;
    declarations.push({
      relativePath,
      handoffEventId: extractField(content, 'Handoff Event ID'),
      nextOwner: extractField(content, 'Next Owner')
    });
  }
  return declarations;
}

let cachedValidator;
async function getSchemaValidator(rootDir) {
  if (cachedValidator) return cachedValidator;
  const schema = JSON.parse(await readFile(path.join(rootDir, schemaPath), 'utf8'));
  cachedValidator = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  return cachedValidator;
}

export function validateReceiptSchema(receipt, validateSchema) {
  if (validateSchema(receipt)) return [];
  return validateSchema.errors.map((error) => `${error.instancePath || '(root)'} ${error.message}`);
}

function groupByWorkItem(receipts) {
  const groups = new Map();
  for (const receipt of receipts) {
    const key = receipt.content.work_item_url;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(receipt);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => String(a.content.registered_at).localeCompare(String(b.content.registered_at)));
  }
  return groups;
}

export function validateDispatchDepth(receiptsByWorkItem) {
  const errors = [];
  for (const [workItemUrl, group] of receiptsByWorkItem) {
    group.forEach((receipt, index) => {
      const expected = index + 1;
      const depth = receipt.content.dispatch_depth;
      if (depth === undefined || depth === null) {
        errors.push(`${receipt.relativePath}: receipt omits required dispatch_depth field`);
        return;
      }
      if (depth !== expected) {
        errors.push(
          `${receipt.relativePath}: dispatch_depth does not match prior ledger state for ${workItemUrl} (expected ${expected}, got ${depth})`
        );
      }
    });
  }
  return errors;
}

const ROUND_TRIP_BOUND = 2;

export function validateEscalationBound(receiptsByWorkItem) {
  const errors = [];
  for (const group of receiptsByWorkItem.values()) {
    let streak = 0;
    let previous;
    for (const receipt of group) {
      const source = receipt.content.source_agent;
      const target = receipt.content.target_agent;
      const continuesAlternation =
        previous && previous.target === source && previous.source === target;
      streak = continuesAlternation ? streak + 1 : 1;
      const roundTrips = Math.ceil(streak / 2);
      if (roundTrips > ROUND_TRIP_BOUND) {
        const escalated = receipt.content.escalated === true;
        const hasNotes = typeof receipt.content.notes === 'string' && receipt.content.notes.trim().length > 0;
        if (!escalated || !hasNotes) {
          errors.push(
            `${receipt.relativePath}: same-role-pair bound exceeded without escalated: true and a notes reference`
          );
        }
      }
      previous = { source, target };
    }
  }
  return errors;
}

export function validateMatching(declarations, receipts) {
  const errors = [];
  const byStem = new Map(receipts.map((receipt) => [receipt.stem, receipt]));
  for (const declaration of declarations) {
    const { relativePath, handoffEventId, nextOwner } = declaration;
    if (!handoffEventId) {
      errors.push(`${relativePath}: Dispatch declared with no Handoff Event ID`);
      continue;
    }
    const receipt = byStem.get(handoffEventId);
    if (!receipt) {
      errors.push(`${relativePath}: Dispatch declared for Handoff Event ID "${handoffEventId}" with no matching receipt file`);
      continue;
    }
    if (receipt.content.handoff_event_id !== handoffEventId) {
      errors.push(`${receipt.relativePath}: handoff_event_id field does not match filename "${handoffEventId}"`);
    }
    if (receipt.content.target_agent !== nextOwner) {
      errors.push(
        `${relativePath}: receipt target_agent "${receipt.content.target_agent}" does not match Next Owner "${nextOwner}" for Handoff Event ID "${handoffEventId}"`
      );
    }
    if (!['registered', 'consumed'].includes(receipt.content.state)) {
      errors.push(
        `${relativePath}: matching receipt for Handoff Event ID "${handoffEventId}" is in state "${receipt.content.state}", which does not satisfy a still-live Dispatch`
      );
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// ADR-0013 anti-forgery controls (Issue #119). Assurance model is
// repository-audited, not runtime-attested: these controls prove the paper
// trail is internally consistent and its cited evidence exists, not that the
// named target_agent actually executed the work. See
// docs/superpowers/specs/2026-07-28-dispatch-receipt-lifecycle-security-revision.md.
// ---------------------------------------------------------------------------

// Control 2 — identity binding for registered_by / state_changed_by.
const CANONICAL_IDENTITIES = new Set([
  'Orchestrator Agent',
  'BA Agent',
  'SA Agent',
  'Developer Agent',
  'QA Agent',
  'Security Reviewer',
  'Documentation Agent',
  'Config Agent',
  'Data Agent',
  'Release Agent',
  'PM Agent',
  'Human Maintainer',
  'Boss'
]);

export function isCanonicalIdentity(value) {
  if (typeof value !== 'string') return false;
  const base = value.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return CANONICAL_IDENTITIES.has(base);
}

export function validateIdentityBinding(receipts) {
  const errors = [];
  for (const receipt of receipts) {
    for (const field of ['registered_by', 'state_changed_by']) {
      const value = receipt.content[field];
      if (value === undefined) continue; // schema `required`-when rules already cover presence
      if (!isCanonicalIdentity(value)) {
        errors.push(
          `${receipt.relativePath}: ${field} "${value}" is not one of this repository's canonical AGENTS.md role identities (Control 2)`
        );
      }
    }
  }
  return errors;
}

// Control 3 — evidence-bound terminal consumption.
const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/;
const QA_FILE_PATTERN = /^docs\/records\/(qa|work-items)\/.+\.md$/;
const COMMENT_URL_PATTERN =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/\d+#issuecomment-(\d+)$/;

export function parseTerminalResultId(value) {
  if (typeof value !== 'string') return { kind: 'invalid' };
  if (COMMIT_SHA_PATTERN.test(value)) return { kind: 'commit', sha: value };
  if (QA_FILE_PATTERN.test(value)) return { kind: 'qa-file', path: value };
  const match = COMMENT_URL_PATTERN.exec(value);
  if (match) return { kind: 'comment-url', owner: match[1], repo: match[2], commentId: Number(match[4]) };
  return { kind: 'invalid' };
}

function hasGitRepo(rootDir) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return true;
  } catch {
    return false;
  }
}

// Gracefully skips (returns true, "cannot disprove") when no git repository
// is available at all, matching resolveChangedHandoffPaths's existing
// fall-back-to-full-scan philosophy for git-dependent optional checks. In
// this repository's real CI (fetch-depth: 0), a git repo is always present,
// so this only degrades in ad-hoc/local-tmpdir contexts.
export function defaultCommitExists(rootDir, sha) {
  if (!hasGitRepo(rootDir)) return true;
  try {
    execFileSync('git', ['cat-file', '-e', sha], { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

export async function defaultFileExists(rootDir, relativePath) {
  try {
    await readFile(path.join(rootDir, relativePath), 'utf8');
    return true;
  } catch {
    return false;
  }
}

// Live GitHub API check, per Boss's 2026-07-28 decision to tighten Control
// 3.3 now (this repository's CI already has an ambient GITHUB_TOKEN and
// precedent for authenticated API calls -- see ADR-0013).
export async function defaultCommentExists({ owner, repo, commentId }, env = process.env) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`,
    { headers }
  );
  return response.ok;
}

export async function validateTerminalEvidence(
  receipts,
  {
    rootDir,
    owner = 'chakrits',
    repo = 'AI-Agent-Workflow',
    commitExists = defaultCommitExists,
    fileExists = defaultFileExists,
    commentExists = defaultCommentExists
  } = {}
) {
  const errors = [];
  for (const receipt of receipts) {
    if (receipt.content.state !== 'consumed') continue;
    const value = receipt.content.terminal_result_id;
    const parsed = parseTerminalResultId(value);
    if (parsed.kind === 'invalid') {
      errors.push(
        `${receipt.relativePath}: terminal_result_id "${value}" matches none of the permitted evidence shapes (Control 3.3)`
      );
      continue;
    }
    if (parsed.kind === 'commit') {
      if (!(await commitExists(rootDir, parsed.sha))) {
        errors.push(
          `${receipt.relativePath}: terminal_result_id commit SHA "${parsed.sha}" does not exist in this repository (Control 3.1)`
        );
      }
    } else if (parsed.kind === 'qa-file') {
      if (!(await fileExists(rootDir, parsed.path))) {
        errors.push(`${receipt.relativePath}: terminal_result_id path "${parsed.path}" does not exist (Control 3.2)`);
      }
    } else if (parsed.kind === 'comment-url') {
      if (parsed.owner !== owner || parsed.repo !== repo) {
        errors.push(
          `${receipt.relativePath}: terminal_result_id comment URL references ${parsed.owner}/${parsed.repo}, not this repository ${owner}/${repo} (Control 3.3)`
        );
        continue;
      }
      if (!(await commentExists({ owner, repo, commentId: parsed.commentId }))) {
        errors.push(
          `${receipt.relativePath}: terminal_result_id comment URL does not resolve to an existing comment (Control 3.3, live-verification)`
        );
      }
    }
  }
  return errors;
}

// Control 1 — append-only state transitions, checked via git history.
const TERMINAL_STATES = new Set(['consumed', 'expired', 'cancelled']);

// Gracefully returns [] ("no history to replay") when no git repository is
// available, mirroring the same fall-back philosophy as defaultCommitExists.
export function defaultGetRevisions(rootDir, relativePath) {
  if (!hasGitRepo(rootDir)) return [];
  let log;
  try {
    log = execFileSync(
      'git',
      ['log', '--follow', '--diff-filter=ACMR', '--format=%H', '--', relativePath],
      { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }
    )
      .toString()
      .trim();
  } catch {
    return [];
  }
  if (!log) return [];
  const shas = log.split('\n').reverse(); // oldest first
  const revisions = [];
  for (const sha of shas) {
    try {
      const content = execFileSync('git', ['show', `${sha}:${relativePath}`], {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'ignore']
      }).toString();
      revisions.push({ sha, content: YAML.parse(content) ?? {} });
    } catch {
      // file didn't exist at this revision (e.g. a rename source) -- skip
    }
  }
  return revisions;
}

export function validateAppendOnlyHistory(receipts, { rootDir, getRevisions = defaultGetRevisions } = {}) {
  const errors = [];
  for (const receipt of receipts) {
    const revisions = getRevisions(rootDir, receipt.relativePath);
    if (revisions.length === 0) continue; // no history available -- cannot disprove, skip

    if (revisions[0].content.state !== 'registered') {
      errors.push(
        `${receipt.relativePath}: first committed revision (${revisions[0].sha}) has state "${revisions[0].content.state}", must be "registered" (Control 1.1)`
      );
    }

    let terminalState = null;
    let prior = revisions[0];
    for (let i = 1; i < revisions.length; i++) {
      const rev = revisions[i];
      const stateChanged = rev.content.state !== prior.content.state;
      if (stateChanged) {
        if (terminalState !== null) {
          errors.push(
            `${receipt.relativePath}: state moved from terminal "${terminalState}" to "${rev.content.state}" at revision ${rev.sha} (Control 1.2)`
          );
        } else if (!TERMINAL_STATES.has(rev.content.state)) {
          errors.push(
            `${receipt.relativePath}: state transitioned to non-terminal "${rev.content.state}" at revision ${rev.sha} (Control 1.2)`
          );
        } else {
          terminalState = rev.content.state;
          const sameChangedAt = rev.content.state_changed_at === prior.content.state_changed_at;
          const sameChangedBy = rev.content.state_changed_by === prior.content.state_changed_by;
          if (sameChangedAt && sameChangedBy) {
            errors.push(
              `${receipt.relativePath}: state_changed_at/state_changed_by unchanged from the prior revision despite a state transition at ${rev.sha} (Control 1.3)`
            );
          }
        }
      }
      prior = rev;
    }
  }
  return errors;
}

// Control 5 — bounded expiry, warning-only (never returned by
// validateDispatchReceipts / never blocks CI). Per Issue #118's lesson,
// automation must never silently mutate audit-relevant state -- a human or
// the dispatching agent must author the `expired` transition explicitly.
export function checkExpiryWarnings(receipts, { now = new Date(), ttlDays = 14 } = {}) {
  const warnings = [];
  for (const receipt of receipts) {
    if (receipt.content.state !== 'registered') continue;
    const registeredAt = new Date(receipt.content.registered_at);
    if (Number.isNaN(registeredAt.getTime())) continue;
    const ageDays = (now.getTime() - registeredAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > ttlDays) {
      warnings.push(
        `${receipt.relativePath}: registered ${Math.floor(ageDays)} days ago (> ${ttlDays}d TTL) -- should transition to expired (Control 5, non-blocking)`
      );
    }
  }
  return warnings;
}

export async function validateDispatchReceipts(rootDir, options = {}) {
  const changedHandoffPaths =
    'changedHandoffPaths' in options ? options.changedHandoffPaths : resolveChangedHandoffPaths(rootDir);
  const [receipts, handoffFiles] = await Promise.all([
    readReceiptFiles(rootDir),
    readHandoffFiles(rootDir, changedHandoffPaths)
  ]);
  const validateSchema = await getSchemaValidator(rootDir);
  const errors = [];

  for (const receipt of receipts) {
    if (receipt.stem !== receipt.content.handoff_event_id) {
      errors.push(
        `${receipt.relativePath}: filename stem "${receipt.stem}" does not equal handoff_event_id field "${receipt.content.handoff_event_id}"`
      );
    }
    errors.push(
      ...validateReceiptSchema(receipt.content, validateSchema).map(
        (message) => `${receipt.relativePath}: ${message}`
      )
    );
  }

  const receiptsByWorkItem = groupByWorkItem(receipts);
  errors.push(...validateDispatchDepth(receiptsByWorkItem));
  errors.push(...validateEscalationBound(receiptsByWorkItem));

  const declarations = parseHandoffDispatchDeclarations(handoffFiles);
  errors.push(...validateMatching(declarations, receipts));

  errors.push(...validateIdentityBinding(receipts));
  errors.push(...validateAppendOnlyHistory(receipts, { rootDir, getRevisions: options.getRevisions }));
  errors.push(
    ...(await validateTerminalEvidence(receipts, {
      rootDir,
      owner: options.owner,
      repo: options.repo,
      commitExists: options.commitExists,
      fileExists: options.fileExists,
      commentExists: options.commentExists
    }))
  );

  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rootDir = process.cwd();
  const errors = await validateDispatchReceipts(rootDir);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Dispatch receipt validation passed.');
  }
  const receipts = await readReceiptFiles(rootDir);
  const warnings = checkExpiryWarnings(receipts);
  if (warnings.length) console.warn(warnings.join('\n'));
}
