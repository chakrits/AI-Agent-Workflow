import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let _YAML;
function getYaml() {
  if (!_YAML) {
    try {
      _YAML = require('yaml');
    } catch {
      _YAML = null;
    }
  }
  return _YAML;
}

let _validateFrontmatterSchema;
function getFrontmatterValidator() {
  if (_validateFrontmatterSchema === undefined) {
    try {
      const Ajv2020 = require('ajv/dist/2020.js');
      const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      const prFrontmatterSchemaPath = path.join(repoRoot, 'docs/contracts/schemas/pr-frontmatter.schema.json');
      const prFrontmatterSchema = JSON.parse(readFileSync(prFrontmatterSchemaPath, 'utf8'));
      const ajv = new Ajv2020({ allErrors: true });
      _validateFrontmatterSchema = ajv.compile(prFrontmatterSchema);
    } catch {
      _validateFrontmatterSchema = null;
    }
  }
  return _validateFrontmatterSchema;
}

const closeoutMarker = /<!-- post-merge-closeout: complete; source-pr-\d+ -->/;
const qaEvidence = /QA: evidence comment or review URL:\s*https:\/\//i;
// Anchored to line start (not merely "contains") so guidance prose that mentions this
// phrase — e.g. the PR template's own instructional text — cannot satisfy the check by
// existing unedited. Only a line an author actually wrote as a declaration matches.
const governingWorkflow = /^Governing workflow:\s*Bug Fix\b/im;
const planOnlyMarker = /^<!-- plan-only: true -->$/m;
const planOnlyFile = /^docs\/records\/implementation-plan\/[^/]+\.md$/;

/**
 * The closing keyword that GitHub acts on when a pull request merges.
 */
const closingKeyword = /\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\b\s*:?\s*#(\d+)/gi;

/**
 * The partial-progress marker (Human Maintainer decision, 2026-09-08).
 */
const advancesOnlyMarker = /<!--\s*advances-only:\s*issue-(\d+)\s*-->/gi;

/**
 * Extracts and validates YAML frontmatter from a PR body.
 *
 * Algorithm:
 * 1. Check if line 1 starts with '---' delimiter.
 * 2. Find the second '---' starting on a line.
 * 3. Extract substring between delimiters and parse using YAML.parse (safe, AST).
 * 4. Validate against pr-frontmatter.schema.json.
 */
export function extractFrontmatter(body = '') {
  const text = String(body);
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return { hasFrontmatter: false, data: null, prose: text, errors: [] };
  }

  // Find second '---' delimiter line
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return {
      hasFrontmatter: true,
      data: null,
      prose: '',
      errors: ['malformed frontmatter: missing closing --- delimiter']
    };
  }

  const rawFrontmatter = lines.slice(1, closingIndex).join('\n');
  const prose = lines.slice(closingIndex + 1).join('\n');

  const YAML = getYaml();
  if (!YAML) {
    return {
      hasFrontmatter: true,
      data: null,
      prose,
      errors: ['YAML parser dependency unavailable']
    };
  }

  let parsed;
  try {
    parsed = YAML.parse(rawFrontmatter, { schema: 'failsafe', merge: false });
    // In yaml library, failsafe or core parser: let's use default YAML.parse with standard schemas
    // Re-parse with standard YAML.parse to parse integers, booleans, etc. safely
    parsed = YAML.parse(rawFrontmatter, { customTags: [] });
  } catch (err) {
    return {
      hasFrontmatter: true,
      data: null,
      prose,
      errors: [`malformed YAML frontmatter syntax: ${err.message}`]
    };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      hasFrontmatter: true,
      data: null,
      prose,
      errors: ['frontmatter must be a valid mapping object']
    };
  }

  const validateFrontmatterSchema = getFrontmatterValidator();
  if (!validateFrontmatterSchema) {
    return {
      hasFrontmatter: true,
      data: parsed,
      prose,
      errors: ['schema validator dependency unavailable']
    };
  }

  const valid = validateFrontmatterSchema(parsed);
  if (!valid) {
    const ajvErrors = (validateFrontmatterSchema.errors || []).map((e) => {
      const field = e.instancePath ? e.instancePath.replace(/^\//, '') : (e.params?.missingProperty || e.params?.additionalProperty || 'schema');
      return `frontmatter schema violation: ${field} ${e.message}`;
    });
    return {
      hasFrontmatter: true,
      data: parsed,
      prose,
      errors: ajvErrors
    };
  }

  return {
    hasFrontmatter: true,
    data: parsed,
    prose,
    errors: []
  };
}

/**
 * Blanks out fenced code blocks and inline backtick spans (Issue #236, M1).
 */
export function stripCodeSpans(body = '') {
  const blank = (text) => text.replace(/[^\n]/g, ' ');
  const lines = String(body).split('\n');
  let fence;
  const out = lines.map((line) => {
    const opener = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const closes = opener && opener[1][0] === fence[0] && opener[1].length >= fence.length;
      if (closes) fence = undefined;
      return blank(line);
    }
    if (opener) {
      fence = opener[1];
      return blank(line);
    }
    // Inline spans: a run of N backticks closed by the next run of exactly N.
    return line.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, blank);
  });
  return out.join('\n');
}

/** Every Issue number the body's advances-only markers name, in order. */
export function advancesOnlyIssues(body = '') {
  return [...stripCodeSpans(body).matchAll(new RegExp(advancesOnlyMarker.source, 'gi'))].map((m) =>
    Number(m[1])
  );
}

/** Every Issue number a closing keyword in the body would close on merge. */
export function closingKeywordIssues(body = '') {
  return [...stripCodeSpans(body).matchAll(new RegExp(closingKeyword.source, 'gi'))].map((m) =>
    Number(m[1])
  );
}

export function closingKeywordErrors(body = '', linkedIssueNumber) {
  if (!linkedIssueNumber) return [];
  const closed = closingKeywordIssues(body);
  const declared = advancesOnlyIssues(body);
  const misnamed = declared.filter((n) => n !== linkedIssueNumber);
  const errors = [];
  if (misnamed.length) {
    errors.push(
      `advances-only marker naming the linked Issue #${linkedIssueNumber} ` +
        `(found issue-${misnamed.join(', issue-')} instead)`
    );
  }
  const advancesOnly = declared.length > 0 && misnamed.length === 0;
  // The marker waives the requirement that a keyword be *present*; it does not
  // waive the requirement that a keyword which IS present point at the linked
  // Issue (Issue #236, round 3 Blocker).
  if (advancesOnly && closed.length === 0) return errors;
  if (!closed.includes(linkedIssueNumber)) {
    errors.push(
      closed.length
        ? `closing keyword referencing the linked Issue #${linkedIssueNumber} (found #${closed.join(', #')} instead)`
        : `closing keyword referencing the linked Issue #${linkedIssueNumber} (e.g. "Fixes #${linkedIssueNumber}")`
    );
  }
  return errors;
}

/**
 * `linkedIssueNumber` is optional and additive: callers that do not supply it
 * get exactly the behaviour they had before Issue #246 (AC-07).
 */
export function validateReadiness({
  body = '',
  draft,
  workItem,
  changedFiles = [],
  sourcePullRequest,
  linkedIssueNumber
}) {
  const frontmatterResult = extractFrontmatter(body);

  // If frontmatter is present (starts on line 1 with ---)
  if (frontmatterResult.hasFrontmatter) {
    // Mode A: Frontmatter Present
    if (frontmatterResult.errors.length > 0) {
      // Fail closed immediately with structured diagnostics (AC-008)
      return frontmatterResult.errors;
    }

    // Evaluate closeout first if applicable
    if (closeoutMarker.test(body)) {
      return evaluateCloseout({ changedFiles, sourcePullRequest });
    }

    return evaluateModeA({
      frontmatter: frontmatterResult.data,
      draft,
      workItem,
      changedFiles,
      linkedIssueNumber
    });
  }

  // Mode B: Frontmatter Absent - Legacy Fallback
  console.warn('[ADVISORY] PR body lacks YAML frontmatter; falling back to legacy regex parser.');

  const errors = evaluateLifecycle({ body, draft, workItem, changedFiles, sourcePullRequest });
  // A closeout pull request closes no Issue by design: its source Issues are
  // auto-closed by the source pull requests' own keywords.
  if (!closeoutMarker.test(body)) errors.push(...closingKeywordErrors(body, linkedIssueNumber));
  return errors;
}

function evaluateCloseout({ changedFiles, sourcePullRequest }) {
  const allowed = (name) =>
    ['PROJECT_STATUS.md', 'TASK_LOG.md', 'CHANGELOG.md'].includes(name) ||
    /^docs\/records\/HANDOFF-POST-MERGE-CLOSEOUT-[^/]+\.md$/.test(name) ||
    /^docs\/records\/work-items\/archive\/[^/]+\/task-state\.json$/.test(name);
  const errors = [];
  if (!sourcePullRequest?.isPullRequest || !sourcePullRequest.labels?.includes('post-merge-closeout')) {
    errors.push('labeled source pull request');
  }
  if (!changedFiles.length || !changedFiles.every(allowed)) {
    errors.push('closeout files are not authorized');
  }
  return errors;
}

function evaluateModeA({
  frontmatter,
  draft,
  workItem,
  changedFiles,
  linkedIssueNumber
}) {
  const errors = [];

  if (!workItem || workItem.isPullRequest || workItem.isSameRepository !== true) {
    errors.push('valid same-repository Issue');
    return errors;
  }

  const effectiveLinkedIssue = linkedIssueNumber ?? frontmatter.work_item;
  if (effectiveLinkedIssue && frontmatter.work_item !== effectiveLinkedIssue) {
    errors.push(`frontmatter work_item #${frontmatter.work_item} does not match linked Issue #${effectiveLinkedIssue}`);
  }

  // Closing action validation in Mode A (deterministic, immune to prose)
  if (effectiveLinkedIssue) {
    if (frontmatter.closing_action === 'advances-only') {
      if (frontmatter.advances_issue !== effectiveLinkedIssue) {
        errors.push(
          `advances-only marker naming the linked Issue #${effectiveLinkedIssue} (found #${frontmatter.advances_issue} instead)`
        );
      }
    } else if (['fixes', 'closes', 'resolves'].includes(frontmatter.closing_action)) {
      // Satisfies closing requirement for effectiveLinkedIssue
    } else if (frontmatter.closing_action === 'none') {
      errors.push(`closing keyword referencing the linked Issue #${effectiveLinkedIssue} (e.g. "Fixes #${effectiveLinkedIssue}")`);
    }
  }

  const labels = workItem.labels ?? [];

  // Bug Fix workflow
  if (frontmatter.governing_workflow === 'bug_fix') {
    if (labels.includes('bug')) {
      if (!draft && !frontmatter.qa_evidence) {
        errors.push('QA evidence URL');
      }
      return errors;
    }
    // If not labeled bug, fall through to lifecycle checks
  }

  // Plan-only
  if (frontmatter.plan_only && !labels.includes('bug')) {
    const phases = labels.filter((label) => label.startsWith('phase:'));
    if (phases.length !== 1) errors.push('exactly one current phase');
    if (!['phase:planning', 'phase:development'].includes(phases[0])) {
      errors.push('plan-only phase planning or development');
    }
    if (!labels.includes('status:spec-ready')) errors.push('status:spec-ready');
    if (labels.includes('status:development-done') || labels.includes('status:verification-done')) {
      errors.push('plan-only cannot claim development or verification completion');
    }
    if (!changedFiles.length || !changedFiles.every((file) => planOnlyFile.test(file))) {
      errors.push('plan-only implementation-plan files only');
    }
    return errors;
  }

  const phases = labels.filter((label) => label.startsWith('phase:'));
  if (phases.length !== 1) errors.push('exactly one current phase');
  if (!labels.includes('status:spec-ready')) errors.push('status:spec-ready');
  const qaHandoff = phases[0] === 'phase:verification';
  if (!draft || qaHandoff) {
    if (!labels.includes('status:development-done')) errors.push('status:development-done');
  }
  if (!draft) {
    if (!labels.includes('status:verification-done')) errors.push('status:verification-done');
    if (!frontmatter.qa_evidence) errors.push('QA evidence URL');
  }

  return errors;
}

function evaluateLifecycle({ body, draft, workItem, changedFiles, sourcePullRequest }) {
  if (closeoutMarker.test(body)) {
    return evaluateCloseout({ changedFiles, sourcePullRequest });
  }

  const errors = [];
  if (!workItem || workItem.isPullRequest || workItem.isSameRepository !== true) {
    errors.push('valid same-repository Issue');
    return errors;
  }

  const labels = workItem.labels ?? [];

  if (labels.includes('bug') && governingWorkflow.test(body)) {
    if (!draft && !qaEvidence.test(body)) errors.push('QA evidence URL');
    return errors;
  }

  if (planOnlyMarker.test(body) && !labels.includes('bug')) {
    const phases = labels.filter((label) => label.startsWith('phase:'));
    if (phases.length !== 1) errors.push('exactly one current phase');
    if (!['phase:planning', 'phase:development'].includes(phases[0])) {
      errors.push('plan-only phase planning or development');
    }
    if (!labels.includes('status:spec-ready')) errors.push('status:spec-ready');
    if (labels.includes('status:development-done') || labels.includes('status:verification-done')) {
      errors.push('plan-only cannot claim development or verification completion');
    }
    if (!changedFiles.length || !changedFiles.every((file) => planOnlyFile.test(file))) {
      errors.push('plan-only implementation-plan files only');
    }
    return errors;
  }

  const phases = labels.filter((label) => label.startsWith('phase:'));
  if (phases.length !== 1) errors.push('exactly one current phase');
  if (!labels.includes('status:spec-ready')) errors.push('status:spec-ready');
  const qaHandoff = phases[0] === 'phase:verification';
  if (!draft || qaHandoff) {
    if (!labels.includes('status:development-done')) errors.push('status:development-done');
  }
  if (!draft) {
    if (!labels.includes('status:verification-done')) errors.push('status:verification-done');
    if (!qaEvidence.test(body)) errors.push('QA evidence URL');
  }
  return errors;
}
