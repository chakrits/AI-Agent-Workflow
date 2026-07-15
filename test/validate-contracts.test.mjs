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

test('AGENTS.md defines the Always/Ask First/Never boundary without introducing new policy', async () => {
  const agents = await readFile('AGENTS.md', 'utf8');
  assert.match(agents, /### Boundaries \(Always \/ Ask First \/ Never\)/);
  assert.match(agents, /\*\*Always\*\*/);
  assert.match(agents, /\*\*Ask First\*\*/);
  assert.match(agents, /\*\*Never\*\*/);
  assert.match(agents, /Commit secrets, credentials, or tokens/);
  assert.match(agents, /does not add new policy/i);
});

const requirementBrainstormingPaths = [
  '.agents/skills/requirement-brainstorming/SKILL.md',
  '.claude/skills/requirement-brainstorming/SKILL.md',
  '.agent/skills/requirement-brainstorming/SKILL.md'
];

test('requirement-brainstorming adapters all carry the assumptions-surfacing technique', async () => {
  for (const path of requirementBrainstormingPaths) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /### 2a\. Assumptions surfacing/);
    assert.match(content, /ASSUMPTIONS I'M MAKING:/);
    assert.match(content, /Correct me now/);
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
    assert.match(content, /invoked when Orchestrator/i);
    assert.match(content, /does not approve architecture, implementation, or release decisions/i);
  }
  for (const heading of requiredHeadings) {
    assert.match(template, new RegExp(`#+ ${heading}`));
  }
});

test('Orchestrator Agent requires the unclassified-request rule and escalation tiers', async () => {
  const [roleDefinition, adapter] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/orchestrator-agent.md', 'utf8')
  ]);
  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /Unclassified/);
    assert.match(content, /Escalate now/i);
    assert.match(content, /Log and proceed/i);
    assert.match(content, /Park/);
    assert.match(content, /reversible or irreversible|reversibility/i);
  }
});

test('Orchestrator Agent requires contradiction detection and a routing circuit breaker', async () => {
  const [roleDefinition, adapter] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/orchestrator-agent.md', 'utf8')
  ]);
  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /### Contradiction Detection and Resolution|## Contradiction Detection and Resolution/);
    assert.match(content, /does not let the conflict pass forward silently|do not let the conflict pass forward silently/i);
    assert.match(content, /### Routing Circuit Breaker|## Routing Circuit Breaker/);
    assert.match(content, /more than twice without resolution/i);
    assert.match(content, /bug-fix-workflow\.yaml/);
  }
});

test('SA Agent requires architecture pattern discipline, API contract governance, and migration safety', async () => {
  const [roleDefinition, adapter, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/sa-agent.md', 'utf8'),
    readFile('docs/templates/SDD.md', 'utf8')
  ]);
  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /modular monolith/i);
    assert.match(content, /service layer/i);
    assert.match(content, /OpenAPI/);
    assert.match(content, /migration strategy/i);
    assert.match(content, /expand\/contract/i);
  }
  const requiredTemplateFields = [
    'OpenAPI schema reference',
    'Migration strategy',
    'Backfill plan',
    'Rollback plan',
    'Performance target',
    'Reliability target',
    'Observability plan',
    'Scalability target'
  ];
  for (const field of requiredTemplateFields) {
    assert.match(template, new RegExp(field));
  }
});

test('BA Agent requires the illustrative-draft boundary and production-UI escalation', async () => {
  const [roleDefinition, adapter, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/ba-agent.md', 'utf8'),
    readFile('docs/templates/REQUIREMENT_DISCOVERY.md', 'utf8')
  ]);
  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /Illustrative — not a UI spec/);
    assert.match(content, /layout system, component hierarchy/i);
    assert.match(content, /No UI\/UX design role exists/i);
  }
  assert.match(template, /Illustrative UX Sketch/);
  assert.match(template, /Illustrative — not a UI spec/);
});

test('QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules', async () => {
  const [roleDefinition, adapter, testPlan, playwrightSkill] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/qa-agent.md', 'utf8'),
    readFile('docs/templates/TEST_PLAN.md', 'utf8'),
    readFile('.agents/skills/qa-playwright-testing/SKILL.md', 'utf8')
  ]);

  assert.match(roleDefinition, /### Skill Routing/);
  assert.match(roleDefinition, /### Dynamic Routing/);
  assert.match(roleDefinition, /### Output Expectations/);

  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /Evidence-Based Reporting/);
    assert.match(content, /must reference the actual command output|attached evidence/i);
    assert.match(content, /API Contract Validation/);
    assert.match(content, /NFR Validation/);
  }
  assert.doesNotMatch(roleDefinition, /minimum of \d+[-–]\d+ issues/i);

  assert.match(testPlan, /Test Types In Scope/);
  assert.match(testPlan, /NFR Targets Under Test/);

  assert.match(playwrightSkill, /Automation Discipline/);
  assert.match(playwrightSkill, /No hard waits/);
  assert.match(playwrightSkill, /role-based selectors/i);
  assert.match(playwrightSkill, /24 hours/);
});

test('Developer Agent requires architecture compliance, definition-of-done restatement, incremental verification, and escalation discipline', async () => {
  const [roleDefinition, adapter] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/developer-agent.md', 'utf8')
  ]);

  assert.match(roleDefinition, /### Architecture & Contract Compliance/);
  assert.match(roleDefinition, /### Definition-of-Done Restatement/);
  assert.match(roleDefinition, /### Incremental Verification Discipline/);
  assert.match(roleDefinition, /### Escalation Discipline/);
  assert.match(roleDefinition, /### Scope Discipline/);

  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /Dependency Boundary Rule/);
    assert.match(content, /route back to SA Agent/i);
    assert.match(content, /acceptance criteria/i);
    assert.match(content, /not only.*the end/i);
    assert.match(content, /do not resolve/i);
    assert.match(content, /smallest diff/i);
  }
});

test('AGENTS.md Change Sizing gives concrete size thresholds and splitting strategies', async () => {
  const agents = await readFile('AGENTS.md', 'utf8');
  assert.match(agents, /### Change Sizing/);
  assert.match(agents, /~100 changed lines/);
  assert.match(agents, /\*\*Vertical slice\*\*/);
  assert.match(agents, /Refactoring and feature work are two different changes/);
});

const gitWorkflowPaths = [
  '.agents/skills/git-workflow-and-versioning/SKILL.md',
  '.claude/skills/git-workflow-and-versioning/SKILL.md',
  '.agent/skills/git-workflow-and-versioning/SKILL.md'
];

test('git-workflow-and-versioning skill exists in all three adapter copies with the commit and change-summary rules', async () => {
  for (const path of gitWorkflowPaths) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /## Atomic Commits/);
    assert.match(content, /<type>: <short, imperative description>/);
    assert.match(content, /Scan the diff for secrets/);
    assert.match(content, /NOTICED BUT NOT TOUCHING:/);
  }
  const agents = await readFile('AGENTS.md', 'utf8');
  assert.match(agents, /### Git Workflow Rule/);
  assert.match(agents, /`git-workflow-and-versioning`/);
  const catalog = await readFile('docs/operating-model/SKILL_CATALOG.md', 'utf8');
  assert.match(catalog, /## git-workflow-and-versioning/);
});

const tddPaths = [
  '.agents/skills/tdd-implementation/SKILL.md',
  '.claude/skills/tdd-implementation/SKILL.md',
  '.agent/skills/tdd-implementation/SKILL.md'
];

test('tdd-implementation adapters all carry the test-sizing, mock-preference, and DAMP rules', async () => {
  for (const path of tddPaths) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /## Test Design Rules/);
    assert.match(content, /real implementation > fake .*> stub .*> mock/i);
    assert.match(content, /DAMP over DRY/);
  }
});

const codeReviewGatePaths = [
  '.agents/skills/code-review-gate/SKILL.md',
  '.claude/skills/code-review-gate/SKILL.md',
  '.agent/skills/code-review-gate/SKILL.md'
];

test('code-review-gate adapters all carry structural remedies, dead code hygiene, and dependency discipline', async () => {
  for (const path of codeReviewGatePaths) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /## Structural Remedies/);
    assert.match(content, /## Dead Code Hygiene/);
    assert.match(content, /DEAD CODE IDENTIFIED:/);
    assert.match(content, /## Dependency Discipline/);
    assert.match(content, /one dependency per change/i);
  }
});

const implementationPlanningPaths = [
  '.agents/skills/implementation-planning/SKILL.md',
  '.claude/skills/implementation-planning/SKILL.md',
  '.agent/skills/implementation-planning/SKILL.md'
];

test('implementation-planning adapters all carry dependency mapping, vertical slicing, task sizing, and checkpoints', async () => {
  for (const path of implementationPlanningPaths) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /dependency graph/i);
    assert.match(content, /slice vertically/i);
    assert.match(content, /## Task Sizing/);
    assert.match(content, /needs "and" to describe it/);
    assert.match(content, /checkpoint every 2-3 tasks/i);
    assert.match(content, /safe to parallelize/i);
  }
});

test('Security Reviewer carries the scan checklist, severity scale, and fix-before-merge rule', async () => {
  const [roleDefinition, adapter, skill, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/security-reviewer.md', 'utf8'),
    readFile('.agents/skills/security-review/SKILL.md', 'utf8'),
    readFile('docs/templates/SECURITY_REVIEW.md', 'utf8')
  ]);

  for (const content of [roleDefinition, adapter, skill]) {
    assert.match(content, /DEBUG = True/);
    assert.match(content, /CORS_ALLOW_ALL_ORIGINS/);
    assert.match(content, /permission_classes/);
    assert.match(content, /Critical/);
    assert.match(content, /Informational/);
    assert.match(content, /Never downgrade a Critical/);
    assert.match(content, /compose(?:s)? into/i);
  }

  assert.match(template, /## Scan Checklist/);
  assert.match(template, /Fix-Before-Merge\?/);
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
