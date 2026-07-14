import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateContracts } from '../scripts/validate-contracts.mjs';

const adapterPaths = [
  '.agents/skills/dynamic-workflow/SKILL.md',
  '.agents/workflows/dynamic-workflow.md',
  '.claude/agents/orchestrator-agent.md',
  '.claude/skills/dynamic-workflow/SKILL.md',
  '.agent/skills/dynamic-workflow/SKILL.md'
];

test('all dynamic-workflow adapters point to the canonical Bug Fix contract', async () => {
  for (const path of adapterPaths) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /docs\/contracts\/bug-fix-workflow\.yaml/);
    assert.doesNotMatch(content, /max_rework_attempts:\s*[^2]/);
  }
});

test('CI runs install, tests, and contract validation', async () => {
  const ci = await readFile('.github/workflows/validate-contracts.yml', 'utf8');
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run validate:contracts/);
});

test('Bug Fix documentation points to the canonical contract and uses the two-rework rule', async () => {
  const bugFix = await readFile('docs/workflows/bug-fix.md', 'utf8');
  const routing = await readFile('docs/workflow/dynamic-routing.md', 'utf8');
  assert.match(bugFix, /docs\/contracts\/bug-fix-workflow\.yaml/);
  assert.match(routing, /two rework transitions/);
  assert.doesNotMatch(routing, /more than 3 fix attempts/);
});

test('handoff vocabulary stays in parity across AGENTS, contract, and template', async () => {
  const [agents, contract, template] = await Promise.all([
    readFile('AGENTS.md', 'utf8'),
    readFile('docs/workflow/handoff-contract.md', 'utf8'),
    readFile('docs/templates/HANDOFF.md', 'utf8')
  ]);
  const requiredFields = [
    'From Agent',
    'To Agent',
    'Work Item',
    'Change Type',
    'Risk Level',
    'Current Stage',
    'Task State',
    'Contract Version',
    'Rework Count',
    'Completed Work',
    'Artifacts Produced',
    'Files Changed',
    'Verification Performed',
    'Evidence References',
    'Stop Reason',
    'Known Limitations',
    'Open Questions',
    'QA / Review Focus',
    'Recommended Next Step'
  ];
  const listFields = (content, heading) => content
    .match(new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`))[1]
    .match(/^- (.+)$/gm)
    .map((field) => field.slice(2));
  const templateFields = [...template.matchAll(/^## (.+)$/gm)].map(([, field]) => field);

  assert.deepEqual(listFields(agents, 'Required Handoff'), requiredFields);
  assert.deepEqual(listFields(contract, 'Required Fields'), requiredFields);
  assert.deepEqual(templateFields, requiredFields);
});

test('Documentation Agent requires post-merge review and a complete record', async () => {
  const [roleDefinition, adapter, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/documentation-agent.md', 'utf8'),
    readFile('docs/templates/POST_MERGE_DOCUMENTATION_REVIEW.md', 'utf8')
  ]);
  const requiredTargets = [
    'PROJECT_INDEX.md',
    'PROJECT_STATUS.md',
    'TASK_LOG.md',
    'CHANGELOG.md',
    'DECISIONS.md',
    'RISKS.md',
    'Canonical workflow documents and platform adapters'
  ];
  const requiredHeadings = [
    'Merge Reference',
    'Change Classification',
    'Impact Assessment',
    'Documentation Updates',
    'Verification Performed',
    'Known Limitations and Unverified Evidence',
    'Risks and Open Questions',
    'Reviewer Handoff',
    'Completion Check'
  ];

  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /every merge into `?main`?/i);
    assert.match(content, /POST_MERGE_DOCUMENTATION_REVIEW\.md/);
    assert.match(content, /No update required/);
  }
  for (const target of requiredTargets) {
    assert.match(roleDefinition, new RegExp(target.replace('.', '\\.')));
  }
  for (const heading of requiredHeadings) {
    assert.match(template, new RegExp(`## ${heading}`));
  }
  assert.match(adapter, /must not approve release, hosted CI, human gates, or risk closure without evidence/i);
});

test('PM Agent requires the mandatory business assessment and measurable success metrics', async () => {
  const [roleDefinition, adapter, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/pm-agent.md', 'utf8'),
    readFile('docs/templates/PROJECT_BRIEF.md', 'utf8')
  ]);
  const requiredDimensions = [
    'Business Goal',
    'Scope',
    'Stakeholder Impact',
    'Success Metric',
    'Priority',
    'Release Intent'
  ];
  const requiredHeadings = [
    'Metadata',
    'Business Goal',
    'In Scope',
    'Out of Scope',
    'Stakeholder Impact',
    'Success Metric',
    'Priority',
    'Release Intent / Roadmap Fit',
    'Assumptions',
    'Open Questions',
    'Risks',
    'Approval / Review'
  ];

  for (const content of [roleDefinition, adapter]) {
    for (const dimension of requiredDimensions) {
      assert.match(content, new RegExp(dimension));
    }
    assert.match(content, /must be measurable/i);
    assert.match(content, /not traceable to the original request/i);
  }
  for (const heading of requiredHeadings) {
    assert.match(template, new RegExp(`#+ ${heading}`));
  }
  assert.match(
    adapter,
    /does not approve architecture, implementation, or release decisions/i
  );
});

test('accepts the three canonical Bug Fix examples', async () => {
  const errors = await validateContracts(process.cwd());
  assert.deepEqual(errors, []);
});

test('rejects a transition not declared by the Bug Fix policy', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-illegal-transition.yaml'
  ]);
  assert.match(errors.join('\n'), /illegal transition: intake -> verifying/);
});

test('rejects a third Bug Fix rework transition', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-third-rework.yaml'
  ]);
  assert.match(errors.join('\n'), /rework_count must not exceed 2/);
});

test('rejects disconnected Bug Fix history', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-disconnected-history.yaml'
  ]);
  assert.match(errors.join('\n'), /history must be continuous/);
});

test('rejects history whose final transition does not reach the task state', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-final-state-mismatch.yaml'
  ]);
  assert.match(errors.join('\n'), /final history transition must reach state implementing/);
});

test('rejects transition evidence that is absent from the evidence map', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-missing-evidence.yaml'
  ]);
  assert.match(errors.join('\n'), /evidence failure_description must exist in evidence map/);
});

test('rejects a task retry limit that differs from the policy', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-mismatched-retry-limit.yaml'
  ]);
  assert.match(errors.join('\n'), /max_rework_attempts must equal policy value 2/);
});

test('rejects a retry-limit block without a terminal human-review event', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-retry-limit-block.yaml'
  ]);
  assert.match(
    errors.join('\n'),
    /blocked task after retry limit requires terminal verifying -> blocked with human_review_required: true/
  );
});

test('rejects a retry-limit block when human-review evidence is not true', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-human-review-evidence.yaml'
  ]);
  assert.match(
    errors.join('\n'),
    /blocked task after retry limit requires terminal verifying -> blocked with human_review_required: true/
  );
});

test('rejects verifying -> blocked before the retry budget is exhausted', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-premature-human-review-block.yaml'
  ]);
  assert.match(
    errors.join('\n'),
    /verifying -> blocked is allowed only after exactly 2 rework transitions/
  );
});

test('rejects empty or false evidence on a permitted rework transition', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-empty-rework-evidence.yaml'
  ]);
  assert.match(errors.join('\n'), /evidence verification_failed must have a meaningful value/);
  assert.match(errors.join('\n'), /evidence rework_route must have a meaningful value/);
});
