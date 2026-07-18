const closeoutMarker = /<!-- post-merge-closeout: complete; source-pr-\d+ -->/;
const qaEvidence = /QA: evidence comment or review URL:\s*https:\/\//i;

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
