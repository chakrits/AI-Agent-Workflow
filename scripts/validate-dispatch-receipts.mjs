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

  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validateDispatchReceipts(process.cwd());
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Dispatch receipt validation passed.');
  }
}
