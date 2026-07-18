import { validateReadiness } from './work-item-readiness.mjs';

export const readinessCheckName = 'work-item-readiness-freshness';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findLinkedIssueNumber(body = '', { owner, repo }) {
  const workItemUrl = new RegExp(
    `Developer: Work Item \\(Issue\\) URL:\\s*https://github\\.com/${escapeRegExp(owner)}/${escapeRegExp(repo)}/issues/(\\d+)(?:\\b|/)`,
    'i'
  );
  const match = body.match(workItemUrl);
  return match ? Number(match[1]) : undefined;
}

export function buildReadinessCheck({
  pull,
  issue,
  repository,
  changedFiles = [],
  sourcePullRequest,
  resolutionError
}) {
  if (!pull?.head?.sha) return undefined;

  const linkedIssueNumber = findLinkedIssueNumber(pull.body, repository);
  const workItem = linkedIssueNumber && issue
    ? {
        isPullRequest: Boolean(issue.pull_request),
        isSameRepository: true,
        labels: (issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name)
      }
    : undefined;
  const errors = [
    ...validateReadiness({
      body: pull.body ?? '',
      draft: pull.draft,
      workItem,
      changedFiles,
      sourcePullRequest
    }),
    ...(resolutionError ? [resolutionError] : [])
  ];
  const passed = errors.length === 0;

  return {
    name: readinessCheckName,
    headSha: pull.head.sha,
    conclusion: passed ? 'success' : 'failure',
    title: passed ? 'Work item readiness is current' : 'Work item readiness is incomplete',
    summary: passed
      ? 'Linked Issue lifecycle state passed the trusted readiness evaluation.'
      : `Linked Issue is missing: ${errors.join(', ')}.`
  };
}
