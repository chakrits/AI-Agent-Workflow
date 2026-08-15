const closeoutMarker = /<!-- post-merge-closeout: complete; source-pr-\d+ -->/;
const qaEvidence = /QA: evidence comment or review URL:\s*https:\/\//i;
// Anchored to line start (not merely "contains") so guidance prose that mentions this
// phrase — e.g. the PR template's own instructional text — cannot satisfy the check by
// existing unedited. Only a line an author actually wrote as a declaration matches.
const governingWorkflow = /^Governing workflow:\s*Bug Fix\b/im;
const planOnlyMarker = /^<!-- plan-only: true -->$/m;
const planOnlyFile = /^docs\/records\/implementation-plan\/[^/]+\.md$/;

export function validateReadiness({
  body = '',
  draft,
  workItem,
  changedFiles = [],
  sourcePullRequest
}) {
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
