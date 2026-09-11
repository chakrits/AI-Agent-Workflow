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
 *
 * This rule, and `advances-only` below, live HERE rather than in
 * `scripts/validate-pr-readiness.mjs` (Issue #246, AC-07 / ADR-0024 decision 3).
 * ADR-0022's invariant says `.claude/settings.json` may only invoke a rule that
 * `.githooks/` or CI already enforces and may never originate one. Of the four
 * rules the local pre-flight added beyond CI, three were already enforced
 * server-side; this was the one that existed nowhere else, so the Claude-only
 * hook originated it and every non-Claude host silently lost it. Placing it in
 * the shared core makes `work-item-readiness-refresh.yml`'s
 * `work-item-readiness-freshness` check enforce it for every host, and restores
 * the invariant.
 */
const closingKeyword = /\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\b\s*:?\s*#(\d+)/gi;

/**
 * The partial-progress marker (Human Maintainer decision, 2026-09-08).
 *
 * This repository routinely opens pull requests that advance a multi-AC Issue
 * without closing it, and the closing-keyword rule refused every one of them —
 * PRs #232 and #234 among them. The rule cannot simply be dropped: Issue #224
 * stayed open precisely because its pull request carried no closing keyword.
 * So the author may *declare* that no Issue is being closed, but may not
 * *forget* to close one. The marker names its Issue, and naming any other Issue
 * is an error rather than a no-op: a marker that waived the rule regardless of
 * the number it carries would be a copy-pasteable blanket escape hatch.
 */
const advancesOnlyMarker = /<!--\s*advances-only:\s*issue-(\d+)\s*-->/gi;

/**
 * Blanks out fenced code blocks and inline backtick spans (Issue #236, M1).
 *
 * Deliberately a scrubber, not a Markdown parser. What it covers: ``` and ~~~
 * fences (any length >= 3, opened and closed at line start with optional
 * indentation), and inline spans delimited by a matching run of backticks on one
 * line. What it does NOT cover: indented (four-space) code blocks, HTML <code>
 * or <pre> elements, fences nested inside list items or blockquotes at a deeper
 * indent than three spaces, and backtick spans that straddle a newline. An
 * unterminated fence blanks the remainder of the body. Both directions are then
 * fail-closed: the marker stops waiving and the closing keyword stops satisfying,
 * so such a body is refused rather than passed silently.
 *
 * Scrubbed: the marker scan and the closing-keyword scan, and only those. The
 * QA-evidence check, the governing-workflow declaration, the plan-only marker
 * and the closeout marker read the raw body, deliberately — scrubbing the last
 * would change post-merge closeout behaviour, which is out of scope.
 *
 * Content is replaced by spaces rather than removed so that surrounding text
 * cannot be joined into a marker or keyword that the author never wrote.
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

/**
 * The closing-keyword errors for a body whose linked Issue is known.
 *
 * Returns `[]` when `linkedIssueNumber` is absent: nothing can be checked
 * against, and that state already carries its own error from the caller (CI
 * reports `valid same-repository Issue`; the local pre-flight reports
 * `Work Item (Issue) URL`). Read from the scrubbed body: a `Fixes #N` inside a
 * fence closes nothing on merge, so it must not satisfy the rule either, and
 * prose documenting the marker must not waive it.
 */
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
  const errors = evaluateLifecycle({ body, draft, workItem, changedFiles, sourcePullRequest });
  // A closeout pull request closes no Issue by design: its source Issues are
  // auto-closed by the source pull requests' own keywords.
  if (!closeoutMarker.test(body)) errors.push(...closingKeywordErrors(body, linkedIssueNumber));
  return errors;
}

function evaluateLifecycle({ body, draft, workItem, changedFiles, sourcePullRequest }) {
  if (closeoutMarker.test(body)) {
    const allowed = (name) =>
      ['PROJECT_STATUS.md', 'TASK_LOG.md', 'CHANGELOG.md'].includes(name) ||
      /^docs\/records\/HANDOFF-POST-MERGE-CLOSEOUT-[^/]+\.md$/.test(name);
    const errors = [];
    if (!sourcePullRequest?.isPullRequest || !sourcePullRequest.labels?.includes('post-merge-closeout')) {
      errors.push('labeled source pull request');
    }
    if (!changedFiles.length || !changedFiles.every(allowed)) errors.push('closeout files are not authorized');
    return errors;
  }

  const errors = [];
  if (!workItem || workItem.isPullRequest || workItem.isSameRepository !== true) {
    errors.push('valid same-repository Issue');
    return errors;
  }

  const labels = workItem.labels ?? [];

  // Bug Fix work items are governed by docs/contracts/bug-fix-workflow.yaml, not the
  // phase:/status: lifecycle label contract (AGENTS.md: "Bug Fix work continues to use
  // docs/contracts/bug-fix-workflow.yaml rather than this lifecycle label contract").
  // They correctly carry no status:* labels; only QA evidence is still required.
  //
  // The `bug` label alone is not a strong enough signal for a required merge check: a
  // mislabeled Feature/Enhancement Issue would silently skip the entire lifecycle gate.
  // The PR must also declare its governing workflow in the body — a second signal the
  // implementer controls directly and that cannot drift from an Issue's labels the way a
  // stale or wrong label can. Absent that declaration, a `bug`-labeled work item falls
  // through to the strict Feature/Enhancement path below (the safe default).
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
