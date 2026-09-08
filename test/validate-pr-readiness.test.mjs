import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LABEL_DERIVED_ERRORS,
  WORK_ITEM_CONTRACT,
  extractBodyFromCommand,
  workItemFromGhIssue,
  validateWorkItemShape,
  validatePrReadiness,
  isPrCreateCommand
} from '../scripts/validate-pr-readiness.mjs';
import { validateReadiness } from '../scripts/work-item-readiness.mjs';

const repository = { owner: 'chakrits', repo: 'AI-Agent-Workflow' };
const labels = [
  'phase:verification',
  'status:spec-ready',
  'status:development-done',
  'status:verification-done'
];
const workItem = { isPullRequest: false, isSameRepository: true, labels };

function bodyFor({ issue = 236, closes = 236, qa = true, docHeading = true, docMarker = true } = {}) {
  return [
    `Developer: Work Item (Issue) URL: https://github.com/chakrits/AI-Agent-Workflow/issues/${issue}`,
    qa ? 'QA: evidence comment or review URL: https://github.com/chakrits/AI-Agent-Workflow/issues/1#issuecomment-1' : '',
    closes ? `Fixes #${closes}` : '',
    docHeading ? '## Documentation Impact' : '',
    docMarker ? '<!-- documentation-impact: complete -->' : ''
  ].filter(Boolean).join('\n\n');
}

// ---------------------------------------------------------------- AC-03

test('AC-03: a complete PR body draft passes', () => {
  const { errors } = validatePrReadiness({ body: bodyFor(), draft: false, workItem, repository });
  assert.deepEqual(errors, []);
});

test('AC-03: a body missing the Work Item Issue URL is refused', () => {
  const { errors } = validatePrReadiness({
    body: 'Fixes #236\n\n## Documentation Impact\n<!-- documentation-impact: complete -->',
    draft: false,
    workItem,
    repository
  });
  assert.ok(errors.includes('Work Item (Issue) URL'), errors.join(', '));
});

test('AC-03: a body missing the QA evidence URL is refused', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ qa: false }), draft: false, workItem, repository });
  assert.ok(errors.includes('QA evidence URL'), errors.join(', '));
});

test('AC-03: a body missing a closing keyword is refused', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ closes: 0 }), draft: false, workItem, repository });
  assert.ok(
    errors.some((e) => e.includes('closing keyword')),
    errors.join(', ')
  );
});

test('AC-03: a closing keyword referencing a different Issue is refused', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ issue: 236, closes: 999 }), draft: false, workItem, repository });
  assert.ok(
    errors.some((e) => e.includes('closing keyword') && e.includes('236')),
    errors.join(', ')
  );
});

test('AC-03: Closes and Resolves are accepted as closing keywords', () => {
  for (const keyword of ['Closes', 'Resolves', 'fixes']) {
    const body = bodyFor({ closes: 0 }) + `\n\n${keyword} #236`;
    const { errors } = validatePrReadiness({ body, draft: false, workItem, repository });
    assert.deepEqual(errors, [], `${keyword} should be accepted`);
  }
});

test('AC-03: the Documentation Impact heading is required, not only the marker', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ docHeading: false }), draft: false, workItem, repository });
  assert.ok(errors.includes('## Documentation Impact section'), errors.join(', '));
});

test('AC-03: the documentation-impact complete marker is required, not only the heading', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ docMarker: false }), draft: false, workItem, repository });
  assert.ok(
    errors.some((e) => e.includes('documentation-impact: complete')),
    errors.join(', ')
  );
});

// ------------------------------------------- AC-03 decision 1: fail-closed

test('AC-03 decision 1: a gh pr create command with no --body or --body-file fails closed', () => {
  const result = extractBodyFromCommand('gh pr create --title "x" --base main');
  assert.equal(result.body, undefined);
  assert.ok(result.error, 'an unreadable body must produce an error, not an empty pass');
  assert.ok(result.error.includes('--body'), result.error);
  assert.ok(result.error.includes('--body-file'), result.error);
});

test('AC-03 decision 1: --body and --body-file are both readable', () => {
  assert.equal(extractBodyFromCommand('gh pr create --body "hello world"').body, 'hello world');
  assert.equal(extractBodyFromCommand("gh pr create --body 'hi'").body, 'hi');
  assert.equal(extractBodyFromCommand('gh pr create --body-file /tmp/b.md').bodyFile, '/tmp/b.md');
  assert.equal(extractBodyFromCommand('gh pr create -F /tmp/b.md').bodyFile, '/tmp/b.md');
});

test('AC-03 decision 1: only gh pr create commands are gated', () => {
  assert.equal(isPrCreateCommand('gh pr create --body x'), true);
  assert.equal(isPrCreateCommand('  gh   pr   create --body x'), true);
  assert.equal(isPrCreateCommand('gh pr view 236'), false);
  assert.equal(isPrCreateCommand('git push'), false);
  assert.equal(isPrCreateCommand('echo "gh pr create"'), false);
});

// ------------------------------------ AC-03 decision 2: degrade, not fail

test('AC-03 decision 2: offline still enforces every body-only rule', () => {
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor({ qa: false, closes: 0 }),
    draft: false,
    workItem: undefined,
    repository,
    offline: true
  });
  assert.ok(errors.includes('QA evidence URL'), errors.join(', '));
  assert.ok(errors.some((e) => e.includes('closing keyword')), errors.join(', '));
  assert.ok(warnings.some((w) => w.includes('label')), warnings.join(', '));
});

test('AC-03 decision 2: offline passes a body-complete draft and warns about unverified labels', () => {
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor(),
    draft: false,
    workItem: undefined,
    repository,
    offline: true
  });
  assert.deepEqual(errors, []);
  assert.ok(warnings.length > 0, 'offline mode must name what it did not verify');
});

test('AC-03 decision 2: offline never suppresses a missing Work Item Issue URL', () => {
  const { errors } = validatePrReadiness({ body: 'nothing here', draft: false, workItem: undefined, repository, offline: true });
  assert.ok(errors.includes('Work Item (Issue) URL'), errors.join(', '));
});

test('AC-03 decision 2: the label-derived error strings are exactly those work-item-readiness.mjs emits', () => {
  const emitted = validateReadiness({
    body: '',
    draft: false,
    workItem: { isPullRequest: false, isSameRepository: true, labels: [] }
  });
  for (const error of emitted) {
    if (error === 'QA evidence URL') continue;
    assert.ok(
      LABEL_DERIVED_ERRORS.includes(error),
      `"${error}" is emitted by validateReadiness but is not classified in LABEL_DERIVED_ERRORS; ` +
        'offline mode would report it as a body failure it cannot actually check'
    );
  }
  assert.ok(LABEL_DERIVED_ERRORS.includes('valid same-repository Issue'));
});

// ------------------------------------ AC-03 decision 3: GitHub-only scope

test('AC-03 decision 3: the validator declares GitHub-only support', () => {
  assert.equal(WORK_ITEM_CONTRACT.host, 'github.com');
  assert.ok(WORK_ITEM_CONTRACT.limitation.toLowerCase().includes('github'));
});

// ---------------------------------------------------------------- AC-05

test('AC-05: the documented workItem input contract names its required fields', () => {
  assert.deepEqual(
    [...WORK_ITEM_CONTRACT.requiredFields].sort(),
    ['isPullRequest', 'isSameRepository', 'labels']
  );
});

test('AC-05: the octokit-derived producer satisfies the contract', () => {
  // Shape produced by .github/workflows/work-item-readiness-refresh.yml via octokit.
  const octokitIssue = { pull_request: undefined, labels: [{ name: 'phase:verification' }, 'status:spec-ready'] };
  const produced = {
    isPullRequest: Boolean(octokitIssue.pull_request),
    isSameRepository: true,
    labels: (octokitIssue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name))
  };
  assert.deepEqual(validateWorkItemShape(produced), []);
  assert.deepEqual(produced.labels, ['phase:verification', 'status:spec-ready']);
});

test('AC-05: the gh-derived producer satisfies the same contract', () => {
  // Shape produced by `gh issue view N --json labels,url` locally.
  const ghIssue = { url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/236', labels: [{ name: 'phase:verification' }] };
  const produced = workItemFromGhIssue(ghIssue, repository);
  assert.deepEqual(validateWorkItemShape(produced), []);
  assert.deepEqual(produced.labels, ['phase:verification']);
  assert.equal(produced.isPullRequest, false);
  assert.equal(produced.isSameRepository, true);
});

test('AC-05: both producers yield an equally-valid input for validateReadiness', () => {
  const gh = workItemFromGhIssue({ url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/236', labels: labels.map((name) => ({ name })) }, repository);
  const octokit = { isPullRequest: false, isSameRepository: true, labels };
  const body = bodyFor();
  assert.deepEqual(validateReadiness({ body, draft: false, workItem: gh }), validateReadiness({ body, draft: false, workItem: octokit }));
});

test('AC-05: a gh issue in another repository is not marked same-repository', () => {
  const produced = workItemFromGhIssue({ url: 'https://github.com/other/repo/issues/1', labels: [] }, repository);
  assert.equal(produced.isSameRepository, false);
});

test('AC-05: a producer omitting a required field is reported, not silently accepted', () => {
  assert.ok(validateWorkItemShape({ isPullRequest: false, isSameRepository: true }).length);
  assert.ok(validateWorkItemShape({ labels: [], isSameRepository: true }).length);
  assert.ok(validateWorkItemShape(undefined).length);
  assert.ok(validateWorkItemShape({ isPullRequest: false, isSameRepository: true, labels: 'nope' }).length);
});
