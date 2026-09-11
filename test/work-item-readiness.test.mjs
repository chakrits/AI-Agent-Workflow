import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReadiness } from '../scripts/work-item-readiness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const body = 'QA: evidence comment or review URL: https://github.com/x/y/issues/1#comment';
const labels = ['phase:verification', 'status:spec-ready', 'status:development-done', 'status:verification-done'];
const bugFixBody = 'Governing workflow: Bug Fix\n\nQA: evidence comment or review URL: https://github.com/x/y/issues/1#comment';
const planOnlyBody = '<!-- plan-only: true -->\n\nPlan-only approval artifact';

test('accepts a ready same-repository work item', () => {
  assert.deepEqual(
    validateReadiness({ body, draft: false, workItem: { labels, isPullRequest: false, isSameRepository: true } }),
    []
  );
});

test('accepts an approved plan-only PR with only an implementation-plan artifact', () => {
  assert.deepEqual(
    validateReadiness({
      body: planOnlyBody,
      draft: false,
      changedFiles: ['docs/records/implementation-plan/2026-08-15-example.md'],
      workItem: {
        labels: ['phase:development', 'status:spec-ready'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    []
  );
});

test('rejects plan-only PRs that change runtime or test files', () => {
  assert.deepEqual(
    validateReadiness({
      body: planOnlyBody,
      draft: false,
      changedFiles: [
        'docs/records/implementation-plan/2026-08-15-example.md',
        'scripts/work-item-readiness.mjs'
      ],
      workItem: {
        labels: ['phase:development', 'status:spec-ready'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['plan-only implementation-plan files only']
  );
});

test('requires specification readiness for plan-only PRs', () => {
  assert.deepEqual(
    validateReadiness({
      body: planOnlyBody,
      draft: false,
      changedFiles: ['docs/records/implementation-plan/2026-08-15-example.md'],
      workItem: {
        labels: ['phase:planning'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['status:spec-ready']
  );
});

test('rejects plan-only PRs that claim development or verification completion', () => {
  assert.deepEqual(
    validateReadiness({
      body: planOnlyBody,
      draft: false,
      changedFiles: ['docs/records/implementation-plan/2026-08-15-example.md'],
      workItem: {
        labels: ['phase:development', 'status:spec-ready', 'status:development-done'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['plan-only cannot claim development or verification completion']
  );
});

test('does not let a plan-only marker bypass Bug Fix governance', () => {
  assert.deepEqual(
    validateReadiness({
      body: planOnlyBody,
      draft: false,
      changedFiles: ['docs/records/implementation-plan/2026-08-15-example.md'],
      workItem: {
        labels: ['bug', 'phase:planning', 'status:spec-ready'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('does not let a plan-only marker bypass declared Bug Fix QA evidence', () => {
  assert.deepEqual(
    validateReadiness({
      body: `${planOnlyBody}\n\nGoverning workflow: Bug Fix`,
      draft: false,
      changedFiles: ['docs/records/implementation-plan/2026-08-15-example.md'],
      workItem: {
        labels: ['bug', 'phase:requirements'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['QA evidence URL']
  );
});

test('requires specification readiness for drafts', () => {
  assert.deepEqual(
    validateReadiness({ draft: true, workItem: { labels: ['phase:development'], isPullRequest: false, isSameRepository: true } }),
    ['status:spec-ready']
  );
});

test('rejects more than one current phase label', () => {
  assert.deepEqual(
    validateReadiness({
      draft: true,
      workItem: {
        labels: ['phase:development', 'phase:verification', 'status:spec-ready', 'status:development-done'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['exactly one current phase']
  );
});

test('requires development evidence before a draft QA handoff', () => {
  assert.deepEqual(
    validateReadiness({
      draft: true,
      workItem: {
        labels: ['phase:verification', 'status:spec-ready'],
        isPullRequest: false,
        isSameRepository: true
      }
    }),
    ['status:development-done']
  );
});

test('rejects a pull request or external item as a work item', () => {
  assert.deepEqual(
    validateReadiness({ draft: true, workItem: { labels, isPullRequest: true, isSameRepository: true } }),
    ['valid same-repository Issue']
  );
  assert.deepEqual(
    validateReadiness({ draft: true, workItem: { labels, isPullRequest: false, isSameRepository: false } }),
    ['valid same-repository Issue']
  );
});

test('requires QA evidence before a non-draft pull request is ready', () => {
  assert.deepEqual(
    validateReadiness({ body: '', draft: false, workItem: { labels, isPullRequest: false, isSameRepository: true } }),
    ['QA evidence URL']
  );
});

test('accepts a Bug Fix work item with a declared governing workflow, QA evidence, and no lifecycle status labels', () => {
  assert.deepEqual(
    validateReadiness({
      body: bugFixBody,
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('still requires QA evidence for a non-draft Bug Fix work item that declares its governing workflow', () => {
  assert.deepEqual(
    validateReadiness({
      body: 'Governing workflow: Bug Fix',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['QA evidence URL']
  );
});

test('does not require QA evidence for a draft Bug Fix work item that declares its governing workflow', () => {
  assert.deepEqual(
    validateReadiness({
      body: 'Governing workflow: Bug Fix',
      draft: true,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('does not require lifecycle status labels for a Bug Fix work item even without any phase label, once its governing workflow is declared', () => {
  assert.deepEqual(
    validateReadiness({
      body: bugFixBody,
      draft: false,
      workItem: { labels: ['bug'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('falls through to the strict lifecycle path when the bug label is present but the PR body does not declare its governing workflow', () => {
  assert.deepEqual(
    validateReadiness({
      body: '',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('a declared governing workflow alone, without the bug label, does not trigger the Bug Fix carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: bugFixBody,
      draft: false,
      workItem: { labels: ['phase:development'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done']
  );
});

test('the unedited PR template guidance text does not itself satisfy the governing-workflow declaration', () => {
  const template = readFileSync(path.join(repoRoot, '.github/pull_request_template.md'), 'utf8');
  assert.ok(
    template.includes('Governing workflow: Bug Fix'),
    'the template must still document the exact phrase authors are told to copy'
  );
  assert.deepEqual(
    validateReadiness({
      body: template,
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('a blockquoted copy of the declaration line does not trigger the carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: '> Governing workflow: Bug Fix',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('a backtick-wrapped copy of the declaration line does not trigger the carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: '`Governing workflow: Bug Fix`',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('the PR template guidance no longer wraps the declaration phrase in backticks', () => {
  const template = readFileSync(path.join(repoRoot, '.github/pull_request_template.md'), 'utf8');
  assert.ok(
    !template.includes('`Governing workflow: Bug Fix`'),
    'a backtick-wrapped copy of the declaration invites a good-faith author to paste the ' +
      'backticks too, which then fails the anchored regex — Issue #111'
  );
  assert.ok(
    template.includes('Governing workflow: Bug Fix'),
    'the corrected guidance must still state the exact phrase, just not backtick-wrapped'
  );
});

test('the GitLab merge-request template documents the Bug Fix governing-workflow requirement', () => {
  const template = readFileSync(
    path.join(repoRoot, '.gitlab/merge_request_templates/Default.md'),
    'utf8'
  );
  assert.ok(
    /Bug Fix work items/.test(template),
    'GitLab authors need the same Bug Fix carve-out guidance the GitHub template documents — Issue #111'
  );
  assert.ok(
    template.includes('Governing workflow: Bug Fix'),
    'the GitLab template must state the exact declaration phrase'
  );
});

test('the unedited GitLab template guidance text does not itself satisfy the governing-workflow declaration', () => {
  const template = readFileSync(
    path.join(repoRoot, '.gitlab/merge_request_templates/Default.md'),
    'utf8'
  );
  assert.deepEqual(
    validateReadiness({
      body: template,
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('a genuine declaration on its own line, anywhere in the body, triggers the carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: 'Summary\n\nGoverning workflow: Bug Fix\n\nQA: evidence comment or review URL: https://github.com/x/y/issues/1#comment',
      draft: false,
      workItem: { labels: ['bug', 'phase:requirements'], isPullRequest: false, isSameRepository: true }
    }),
    []
  );
});

test('a non-draft Feature/Enhancement work item still requires every lifecycle label, unaffected by the Bug Fix carve-out', () => {
  assert.deepEqual(
    validateReadiness({
      body: '',
      draft: false,
      workItem: { labels: ['phase:development'], isPullRequest: false, isSameRepository: true }
    }),
    ['status:spec-ready', 'status:development-done', 'status:verification-done', 'QA evidence URL']
  );
});

test('allows only an authenticated closeout with authorized files', () => {
  const closeout = '<!-- post-merge-closeout: complete; source-pr-1 -->';
  assert.deepEqual(
    validateReadiness({ body: closeout, changedFiles: ['PROJECT_STATUS.md'], sourcePullRequest: { isPullRequest: true, labels: ['post-merge-closeout'] } }),
    []
  );
  assert.deepEqual(
    validateReadiness({ body: closeout, changedFiles: ['README.md'], sourcePullRequest: { isPullRequest: true, labels: ['post-merge-closeout'] } }),
    ['closeout files are not authorized']
  );
  assert.deepEqual(
    validateReadiness({ body: closeout, changedFiles: ['PROJECT_STATUS.md'], sourcePullRequest: { isPullRequest: true, labels: [] } }),
    ['labeled source pull request']
  );
});

// --------------------------------------------------- Issue #246, AC-07
// `linkedIssueNumber` is additive: omitting it must reproduce pre-#246 behaviour
// exactly, because every other caller of this live core omits it.

test('AC-07: omitting linkedIssueNumber leaves the result unchanged', () => {
  const args = {
    body: 'QA: evidence comment or review URL: https://example.com/x',
    draft: false,
    workItem: {
      isPullRequest: false,
      isSameRepository: true,
      labels: ['phase:verification', 'status:spec-ready', 'status:development-done', 'status:verification-done']
    }
  };
  assert.deepEqual(validateReadiness(args), []);
  assert.deepEqual(validateReadiness({ ...args, linkedIssueNumber: undefined }), []);
  assert.deepEqual(validateReadiness({ ...args, linkedIssueNumber: 19 }), [
    'closing keyword referencing the linked Issue #19 (e.g. "Fixes #19")'
  ]);
  assert.deepEqual(validateReadiness({ ...args, body: `${args.body}\nFixes #19`, linkedIssueNumber: 19 }), []);
});

test('AC-07: the closing-keyword rule is appended to, not substituted for, lifecycle errors', () => {
  const errors = validateReadiness({
    body: 'QA: evidence comment or review URL: https://example.com/x',
    draft: false,
    workItem: { isPullRequest: false, isSameRepository: true, labels: ['phase:verification'] },
    linkedIssueNumber: 19
  });
  assert.ok(errors.includes('status:spec-ready'));
  assert.ok(errors.some((e) => e.startsWith('closing keyword referencing the linked Issue #19')));
});

// --------------------------------------------------- Issue #272, IMP-002: TC-011..TC-018, TC-033
import { extractFrontmatter } from '../scripts/work-item-readiness.mjs';

test('TC-011: valid YAML frontmatter parsed accurately via AST', () => {
  const frontmatterBody = `---
work_item: 272
governing_workflow: framework_meta
closing_action: advances-only
advances_issue: 272
qa_evidence: "https://github.com/chakrits/AI-Agent-Workflow/issues/272#issuecomment-5630763664"
documentation_impact: completed
plan_only: false
risk_level: high
schema_version: 1
---

## Description
This is a test description.
`;
  const res = extractFrontmatter(frontmatterBody);
  assert.equal(res.hasFrontmatter, true);
  assert.equal(res.data.work_item, 272);
  assert.equal(res.data.governing_workflow, 'framework_meta');
  assert.equal(res.data.closing_action, 'advances-only');
  assert.equal(res.data.advances_issue, 272);
});

test('TC-012: markdown prose below frontmatter completely ignored (immune to fences, quotes, fake keywords)', () => {
  const frontmatterBody = `---
work_item: 272
governing_workflow: framework_meta
closing_action: advances-only
advances_issue: 272
qa_evidence: "https://github.com/chakrits/AI-Agent-Workflow/issues/272#issuecomment-1"
schema_version: 1
---

## Description
\`\`\`markdown
Fixes #999
Governing workflow: Bug Fix
<!-- advances-only: issue-888 -->
\`\`\`
> Fixes #777
`;
  const res = extractFrontmatter(frontmatterBody);
  assert.equal(res.hasFrontmatter, true);
  assert.equal(res.data.work_item, 272);
  assert.equal(res.data.closing_action, 'advances-only');
  assert.equal(res.data.advances_issue, 272);

  // Validation should also ignore prose below frontmatter
  const errors = validateReadiness({
    body: frontmatterBody,
    draft: false,
    workItem: {
      isPullRequest: false,
      isSameRepository: true,
      labels: ['phase:verification', 'status:spec-ready', 'status:development-done', 'status:verification-done']
    },
    linkedIssueNumber: 272
  });
  assert.deepEqual(errors, []);
});

test('TC-013: frontmatter validates against JSON schema; rejects unknown properties', () => {
  const invalidFrontmatter = `---
work_item: 272
governing_workflow: framework_meta
closing_action: fixes
schema_version: 1
unknown_field: "illegal"
---
# Title
`;
  const res = extractFrontmatter(invalidFrontmatter);
  assert.equal(res.hasFrontmatter, true);
  assert.ok(res.errors && res.errors.length > 0);
  assert.ok(res.errors.some((e) => e.includes('unknown_field') || e.includes('additionalProperties')));
});

test('TC-014: Mode A: valid frontmatter PR body passes readiness evaluation', () => {
  const frontmatterBody = `---
work_item: 272
governing_workflow: bug_fix
closing_action: fixes
qa_evidence: "https://github.com/chakrits/AI-Agent-Workflow/issues/272#issuecomment-123"
schema_version: 1
---
Fixes #272
`;
  const errors = validateReadiness({
    body: frontmatterBody,
    draft: false,
    workItem: {
      isPullRequest: false,
      isSameRepository: true,
      labels: ['bug']
    },
    linkedIssueNumber: 272
  });
  assert.deepEqual(errors, []);
});

test('TC-015: Mode B: legacy PR body without frontmatter emits advisory and passes legacy rules', () => {
  const legacyBody = 'Governing workflow: Bug Fix\n\nQA: evidence comment or review URL: https://github.com/x/y/issues/1#comment\n\nFixes #1';
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(msg);
  try {
    const errors = validateReadiness({
      body: legacyBody,
      draft: false,
      workItem: { labels: ['bug'], isPullRequest: false, isSameRepository: true },
      linkedIssueNumber: 1
    });
    assert.deepEqual(errors, []);
    assert.ok(warnings.some((w) => w.includes('[ADVISORY] PR body lacks YAML frontmatter; falling back to legacy regex parser.')));
  } finally {
    console.warn = origWarn;
  }
});

test('TC-016: Mode A negative: malformed YAML syntax fails closed immediately', () => {
  const malformedYaml = `---
work_item: [unclosed array
schema_version: 1
---
Body text
`;
  const errors = validateReadiness({
    body: malformedYaml,
    draft: false,
    workItem: { labels: ['bug'], isPullRequest: false, isSameRepository: true },
    linkedIssueNumber: 272
  });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('YAML') || e.includes('frontmatter')));
});

test('TC-017: Mode A negative: schema violation in frontmatter fails closed', () => {
  const schemaViolation = `---
governing_workflow: invalid_workflow_name
closing_action: fixes
schema_version: 1
---
`;
  const errors = validateReadiness({
    body: schemaViolation,
    draft: false,
    workItem: { labels: ['bug'], isPullRequest: false, isSameRepository: true },
    linkedIssueNumber: 272
  });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('frontmatter') || e.includes('work_item') || e.includes('governing_workflow')));
});

test('TC-018: Mode A boundary: closing_action advances-only requires advances_issue', () => {
  const missingAdvancesIssue = `---
work_item: 272
governing_workflow: framework_meta
closing_action: advances-only
schema_version: 1
---
`;
  const errors1 = validateReadiness({
    body: missingAdvancesIssue,
    draft: false,
    workItem: { labels: ['phase:requirements'], isPullRequest: false, isSameRepository: true },
    linkedIssueNumber: 272
  });
  assert.ok(errors1.length > 0);
  assert.ok(errors1.some((e) => e.includes('advances_issue')));

  const withAdvancesIssue = `---
work_item: 272
governing_workflow: framework_meta
closing_action: advances-only
advances_issue: 272
qa_evidence: "https://github.com/chakrits/AI-Agent-Workflow/issues/272#issuecomment-1"
schema_version: 1
---
`;
  const errors2 = validateReadiness({
    body: withAdvancesIssue,
    draft: false,
    workItem: {
      labels: ['phase:verification', 'status:spec-ready', 'status:development-done', 'status:verification-done'],
      isPullRequest: false,
      isSameRepository: true
    },
    linkedIssueNumber: 272
  });
  assert.deepEqual(errors2, []);
});

test('TC-033: closeout PR file allowlist authorizes archived shard files', () => {
  const closeout = '<!-- post-merge-closeout: complete; source-pr-1 -->';
  const changedFiles = [
    'PROJECT_STATUS.md',
    'TASK_LOG.md',
    'CHANGELOG.md',
    'docs/records/HANDOFF-POST-MERGE-CLOSEOUT-issue-249.md',
    'docs/records/work-items/archive/issue-249/task-state.json'
  ];
  assert.deepEqual(
    validateReadiness({
      body: closeout,
      changedFiles,
      sourcePullRequest: { isPullRequest: true, labels: ['post-merge-closeout'] }
    }),
    []
  );
});
