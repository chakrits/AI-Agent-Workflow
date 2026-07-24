import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { validateContracts } from '../scripts/validate-contracts.mjs';

const adapterPaths = [
  '.agents/skills/dynamic-workflow/SKILL.md',
  '.agents/workflows/dynamic-workflow.md',
  '.claude/agents/orchestrator-agent.md',
  '.claude/skills/dynamic-workflow/SKILL.md',
  '.agent/skills/dynamic-workflow/SKILL.md'
];

test('every .agents/skills/ directory is named somewhere in SKILL_CATALOG.md', async () => {
  const [entries, catalog] = await Promise.all([
    readdir('.agents/skills', { withFileTypes: true }),
    readFile('docs/operating-model/SKILL_CATALOG.md', 'utf8')
  ]);
  const skillNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  assert.ok(skillNames.length > 0);
  for (const name of skillNames) {
    assert.match(catalog, new RegExp(name), `SKILL_CATALOG.md does not mention the "${name}" skill`);
  }
});

test('Frontend UI Engineering stays discoverable and routes UI work safely', async () => {
  const paths = [
    '.agents/skills/frontend-ui-engineering/SKILL.md',
    '.claude/skills/frontend-ui-engineering/SKILL.md',
    '.agent/skills/frontend-ui-engineering/SKILL.md'
  ];
  const [canonical, claudeAdapter, antigravityAdapter, catalog] = await Promise.all([
    readFile(paths[0], 'utf8'),
    readFile(paths[1], 'utf8'),
    readFile(paths[2], 'utf8'),
    readFile('docs/operating-model/SKILL_CATALOG.md', 'utf8')
  ]);

  // Under skill parity (Issue #50), all three copies are byte-identical to the
  // canonical .agents/ version. Every requirement that used to be checked only
  // against the canonical must now hold across all three platforms.
  for (const content of [canonical, claudeAdapter, antigravityAdapter]) {
    for (const requirement of [
      /semantic HTML/i,
      /WCAG 2\.1 AA/i,
      /keyboard/i,
      /focus/i,
      /loading, error, and empty states/i,
      /320px, 768px, 1024px, and 1440px/i,
      /qa-playwright-testing/i,
      /design system/i
    ]) {
      assert.match(content, requirement);
    }
  }
  assert.match(catalog, /frontend-ui-engineering/);
});

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

test('CI runs install, tests, contract validation, and a dedicated main-state audit', async () => {
  const [ci, documentationSync] = await Promise.all([
    readFile('.github/workflows/validate-contracts.yml', 'utf8'),
    readFile('.github/workflows/documentation-sync.yml', 'utf8')
  ]);
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run validate:contracts/);
  assert.doesNotMatch(ci, /npm run validate:project-state/);
  assert.match(documentationSync, /npm run validate:project-state/);
  assert.match(documentationSync, /branches:\s*\[main\]/);
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
    'Work Item URL',
    'Change Request URL',
    'Change Type',
    'Risk Level',
    'Lifecycle Phase',
    'Specification Readiness',
    'Current Stage',
    'Task State',
    'Contract Version',
    'Rework Count',
    'Completed Work',
    'Artifacts Produced',
    'Files Changed',
    'Verification Performed',
    'Evidence References',
    'Acceptance Criteria Verification Status',
    'Acceptance Traceability Matrix URL',
    'Verified Commit SHA',
    'Platform Activation Record URL / Status',
    'QA Evidence URL',
    'Stop Reason',
    'Known Limitations',
    'Open Questions',
    'QA / Review Focus',
    'Recommended Next Step',
    'Next Action',
    'Next Owner',
    'Orchestration Turn ID',
    'Boss Event Required',
    'Dispatch State',
    'Source Agent',
    'Target Agent',
    'Dispatch Result',
    'Acknowledgement Evidence',
    'Boss Event',
    'Handoff Event ID',
    'Parent Orchestrator ID',
    'Child Task ID',
    'Terminal Result ID',
    'Completion Event Evidence',
    'Consumption Evidence',
    'Timeout / Cancellation Reason'
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

test('terminal handoffs require a receipt, an explicit routing outcome, and a Boss-visible event', async () => {
  const [agents, contract, template, routing, qualityGates, roles] = await Promise.all([
    readFile('AGENTS.md', 'utf8'),
    readFile('docs/workflow/handoff-contract.md', 'utf8'),
    readFile('docs/templates/HANDOFF.md', 'utf8'),
    readFile('docs/workflow/dynamic-routing.md', 'utf8'),
    readFile('docs/workflow/quality-gates.md', 'utf8'),
    readFile('docs/workflow/role-definitions.md', 'utf8')
  ]);

  const requiredFields = [
    'Next Action',
    'Next Owner',
    'Orchestration Turn ID',
    'Boss Event Required',
    'Dispatch State',
    'Source Agent',
    'Target Agent',
    'Dispatch Result',
    'Acknowledgement Evidence',
    'Boss Event',
    'Handoff Event ID',
    'Parent Orchestrator ID',
    'Child Task ID',
    'Terminal Result ID',
    'Completion Event Evidence',
    'Consumption Evidence',
    'Timeout / Cancellation Reason'
  ];
  const listFields = (content, heading) => content
    .match(new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`))[1]
    .match(/^- (.+)$/gm)
    .map((field) => field.slice(2));
  const handoffFields = listFields(contract, 'Required Fields');
  const templateFields = [...template.matchAll(/^## (.+)$/gm)].map(([, field]) => field);

  for (const field of requiredFields) {
    assert.ok(handoffFields.includes(field), `handoff contract is missing ${field}`);
    assert.ok(templateFields.includes(field), `handoff template is missing ${field}`);
    assert.match(agents, new RegExp(`- ${field.replace(/[\\/]/g, '\\$&')}`));
  }
  for (const content of [contract, routing, qualityGates, roles]) {
    assert.match(content, /exactly one.*Dispatch.*Human review.*Blocked|Dispatch.*Human review.*Blocked/i);
    assert.match(content, /same active (Orchestrator )?turn/i);
    assert.match(content, /acknowledg/i);
    assert.match(content, /Boss-visible|Boss event/i);
  }
  assert.match(contract, /non-human.*Dispatch|Dispatch.*non-human/i);
  assert.match(contract, /human_review_required/);
  assert.match(contract, /not.*lifecycle label/i);
});

test('dynamic-workflow adapters require receipt evidence instead of prose-only non-human routing', async () => {
  const contents = await Promise.all(adapterPaths.map((path) => readFile(path, 'utf8')));

  for (const content of contents) {
    assert.match(content, /docs\/workflow\/handoff-contract\.md/);
    assert.match(content, /Dispatch.*Human review.*Blocked/i);
    assert.match(content, /dispatch receipt|receipt.*dispatch/i);
    assert.match(content, /acknowledgement pending/i);
    assert.doesNotMatch(content, /GitHub-only|GitHub specific/i);
  }
});

test('in-turn dispatch completion requires parent ownership, native evidence, and truthful unsupported-host blocking', async () => {
  const [contract, routing, gates, roles, codexAdapter] = await Promise.all([
    readFile('docs/workflow/handoff-contract.md', 'utf8'),
    readFile('docs/workflow/dynamic-routing.md', 'utf8'),
    readFile('docs/workflow/quality-gates.md', 'utf8'),
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.codex/orchestrator-supervision.md', 'utf8')
  ]);

  for (const content of [contract, routing, gates, roles]) {
    assert.match(content, /Handoff Event ID/);
    assert.match(content, /Parent Orchestrator ID/);
    assert.match(content, /Child Task ID/);
    assert.match(content, /Completion Event Evidence/);
    assert.match(content, /Consumption Evidence/);
    assert.match(content, /before (the )?(parent|Root|Orchestrator).*(end|yield)|before.*(end|yield).*parent/i);
    assert.match(content, /host_completion_unavailable/);
    assert.match(content, /timed_out/);
    assert.match(content, /cancelled/);
    assert.match(content, /exactly.once|idempoten/i);
  }
  assert.match(codexAdapter, /collaboration\.wait_agent/);
  assert.match(codexAdapter, /parent.*await|await.*parent/i);
  assert.match(codexAdapter, /native.*terminal.*receipt|terminal.*receipt.*native/i);
  assert.match(codexAdapter, /host_completion_unavailable/);
  assert.match(codexAdapter, /diagnostic-only/i);
  assert.doesNotMatch(codexAdapter, /heartbeat.*before.*yield|yield.*heartbeat/i);
  assert.match(codexAdapter, /does not create a webhook, queue, persistent worker, or auto-merge/i);
});

test('lifecycle stages make specification readiness a portable pre-development gate', async () => {
  const [agents, routing, roles, qualityGates, handoff, template, portableWorkflow, claudeAdapter] = await Promise.all([
    readFile('AGENTS.md', 'utf8'),
    readFile('docs/workflow/dynamic-routing.md', 'utf8'),
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('docs/workflow/quality-gates.md', 'utf8'),
    readFile('docs/workflow/handoff-contract.md', 'utf8'),
    readFile('docs/templates/HANDOFF.md', 'utf8'),
    readFile('.agents/workflows/dynamic-workflow.md', 'utf8'),
    readFile('.claude/agents/orchestrator-agent.md', 'utf8')
  ]);

  const expectedPhases = [
    'phase:requirements',
    'phase:design',
    'phase:planning',
    'phase:development',
    'phase:verification',
    'phase:human-review',
    'phase:blocked'
  ];
  for (const phase of expectedPhases) {
    assert.match(routing, new RegExp(phase.replace(':', '\\:')));
  }
  for (const content of [agents, routing, roles, qualityGates]) {
    assert.match(content, /status:spec-ready/);
    assert.match(content, /mutually exclusive|exactly one/i);
  }
  assert.match(qualityGates, /## Specification Readiness Gate/);
  assert.match(roles, /Developer.*must not.*begin implementation/i);
  assert.match(roles, /Developer.*QA|QA.*Developer/i);
  for (const content of [handoff, template]) {
    assert.match(content, /Lifecycle Phase/);
    assert.match(content, /Specification Readiness/);
  }
  for (const content of [portableWorkflow, claudeAdapter]) {
    assert.match(content, /specification readiness|spec-ready/i);
  }
});

test('work-item and change-request templates preserve lifecycle readiness ownership across platforms', async () => {
  const [githubIssue, gitlabIssue, githubPr, gitlabMr, claudeSkill, antigravitySkill] = await Promise.all([
    readFile('.github/ISSUE_TEMPLATE/work-item.md', 'utf8'),
    readFile('.gitlab/issue_templates/Work Item.md', 'utf8'),
    readFile('.github/pull_request_template.md', 'utf8'),
    readFile('.gitlab/merge_request_templates/Default.md', 'utf8'),
    readFile('.claude/skills/dynamic-workflow/SKILL.md', 'utf8'),
    readFile('.agent/skills/dynamic-workflow/SKILL.md', 'utf8')
  ]);

  for (const template of [githubIssue, gitlabIssue]) {
    assert.match(template, /phase:requirements/);
    assert.match(template, /Required Specification/i);
    assert.match(template, /Lightweight specification|SDD/i);
    assert.match(template, /Acceptance Criteria/i);
  }
  for (const template of [githubPr, gitlabMr]) {
    assert.match(template, /Lifecycle Readiness/i);
    assert.match(template, /status:spec-ready/);
    assert.match(template, /phase:verification/);
    assert.match(template, /phase:human-review/);
    assert.match(template, /Ownership: Developer/i);
    assert.match(template, /QA:.*evidence/i);
  }
  for (const adapter of [claudeSkill, antigravitySkill]) {
    assert.match(adapter, /status:spec-ready/);
    assert.match(adapter, /docs\/workflow\/dynamic-routing\.md/);
  }
});

test('platform readiness and AC traceability remain portable and evidence-owned', async () => {
  const paths = [
    'docs/templates/AC_TRACEABILITY.md',
    'docs/templates/PLATFORM_ACTIVATION.md',
    '.github/ISSUE_TEMPLATE/work-item.md',
    '.gitlab/issue_templates/Work Item.md',
    '.github/pull_request_template.md',
    '.gitlab/merge_request_templates/Default.md'
  ];
  const content = await Promise.all(paths.map((path) => readFile(path, 'utf8')));
  for (const template of [content[0], content[2], content[3]]) {
    assert.match(template, /Acceptance Traceability Matrix/i);
  }
  for (const template of [content[0]]) {
    assert.match(template, /AC ID/i);
    assert.match(template, /Evidence/i);
  }
  assert.match(content[1], /least-privilege/i);
  assert.match(content[1], /rollback|disable/i);
  for (const template of content.slice(4)) {
    assert.match(template, /verified commit SHA/i);
    assert.match(template, /must not self-certify/i);
    assert.match(template, /applicable AC IDs/i);
    assert.match(template, /N\/A rows.*rationale/i);
  }
});

test('GitLab documents lifecycle label setup and manual readiness enforcement without API credentials', async () => {
  const guide = await readFile('docs/workflow/platform-readiness.md', 'utf8');

  for (const label of ['phase:requirements', 'phase:design', 'phase:planning', 'phase:development', 'phase:verification', 'phase:human-review', 'phase:blocked', 'status:spec-ready', 'status:development-done', 'status:verification-done']) {
    assert.match(guide, new RegExp(label.replace(':', '\\:')));
  }
  assert.match(guide, /GitLab CI/i);
  assert.match(guide, /does not.*API.*readiness/i);
  assert.match(guide, /without.*approved credentials/i);
  assert.match(guide, /manual/i);
  assert.match(guide, /Issue label.*does not.*pull_request/i);
});

test('QA verifies issue acceptance criteria across GitHub PRs and GitLab MRs', async () => {
  const [roleDefinition, adapter, githubTemplate, gitlabTemplate, qualityGates] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/qa-agent.md', 'utf8'),
    readFile('.github/pull_request_template.md', 'utf8'),
    readFile('.gitlab/merge_request_templates/Default.md', 'utf8'),
    readFile('docs/workflow/quality-gates.md', 'utf8')
  ]);

  const qaGate = roleDefinition.match(
    /### Cross-Platform Acceptance Criteria Gate([\s\S]*?)### Output Expectations/
  )?.[1];
  assert.ok(qaGate, 'canonical QA acceptance gate should exist');
  assert.match(qaGate, /Work Item/i);
  assert.match(qaGate, /Change Request/i);
  assert.doesNotMatch(qaGate, /GitHub|GitLab|Pull Request|Merge Request/i);
  for (const content of [adapter]) {
    assert.match(content, /Acceptance Criteria/i);
    assert.match(content, /QA Evidence/i);
    assert.match(content, /must not self-certify/i);
  }
  for (const template of [githubTemplate, gitlabTemplate]) {
    assert.match(template, /## QA Acceptance Criteria Verification/);
    assert.match(template, /Ownership: Developer/i);
    assert.match(template, /QA:\s*evidence/i);
  }
  assert.match(qualityGates, /## QA Acceptance Criteria Gate/);
  assert.match(roleDefinition, /does not automatically create.*Issue/i);
});

test('post-merge closeout keeps QA evidence and normal-merge handoff ownership explicit', async () => {
  const [roleDefinition, qaAdapter, documentationAdapter, githubTemplate, gitlabTemplate, qualityGates] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/qa-agent.md', 'utf8'),
    readFile('.claude/agents/documentation-agent.md', 'utf8'),
    readFile('.github/pull_request_template.md', 'utf8'),
    readFile('.gitlab/merge_request_templates/Default.md', 'utf8'),
    readFile('docs/workflow/quality-gates.md', 'utf8')
  ]);

  const closeout = roleDefinition.match(
    /### Post-Merge Closeout Contract([\s\S]*?)### Completion and Escalation/
  )?.[1];
  assert.ok(closeout, 'canonical post-merge closeout contract should exist');
  assert.match(closeout, /Developer Agent/);
  assert.match(closeout, /QA Agent/);
  assert.match(closeout, /Documentation Agent/);
  assert.match(closeout, /Human Maintainer/);
  assert.match(closeout, /Work Item/);
  assert.match(closeout, /Change Request/);
  assert.match(closeout, /post-merge-closeout/);
  assert.match(closeout, /documentation-sync/);
  assert.doesNotMatch(closeout, /GitHub|GitLab|Pull Request|Merge Request/i);

  for (const content of [qaAdapter, documentationAdapter]) {
    assert.match(content, /status:development-done/);
    assert.match(content, /status:verification-done/);
    assert.match(content, /post-merge-closeout/);
  }
  for (const template of [githubTemplate, gitlabTemplate]) {
    assert.match(template, /Developer:.*Work Item/i);
    assert.match(template, /QA:.*evidence/i);
    assert.match(template, /Documentation-only closeout/i);
  }
  assert.match(qualityGates, /## Post-Merge Closeout Gate/);
});

test('Documentation Agent requires a pre-merge review and an exception-only post-merge record', async () => {
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
    assert.match(content, /before.*merge.*`?main`?/i);
    assert.match(content, /Documentation Impact/);
    assert.match(content, /POST_MERGE_DOCUMENTATION_REVIEW\.md/);
    assert.match(content, /state audit/i);
    assert.match(content, /exception/i);
    assert.match(content, /documentation-sync/);
    assert.match(content, /does not automatically create.*Issue/i);
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

const personaAdapterPaths = [
  '.claude/agents/orchestrator-agent.md',
  '.claude/agents/pm-agent.md',
  '.claude/agents/ba-agent.md',
  '.claude/agents/sa-agent.md',
  '.claude/agents/developer-agent.md',
  '.claude/agents/qa-agent.md',
  '.claude/agents/security-reviewer.md',
  '.claude/agents/config-agent.md',
  '.claude/agents/data-agent.md',
  '.claude/agents/release-agent.md',
  '.claude/agents/documentation-agent.md'
];

test('canonical agent personas cover every role without becoming operating policy', async () => {
  const personas = await readFile('docs/operating-model/AGENT_PERSONAS.md', 'utf8');
  const roles = [
    'Orchestrator Agent',
    'PM Agent',
    'BA Agent',
    'SA Agent',
    'Developer Agent',
    'QA Agent',
    'Security Reviewer',
    'Config Agent',
    'Data Agent',
    'Release Agent',
    'Documentation Agent'
  ];

  assert.match(personas, /does not replace or override/i);
  assert.match(personas, /must not claim personal feelings, lived experience, or authority/i);
  assert.match(personas, /do not use gender, appearance, or fictional biography/i);
  for (const role of roles) {
    assert.match(personas, new RegExp(`## ${role}`));
  }
});

test('Claude, portable, and Antigravity adapters discover canonical agent personas', async () => {
  const portablePaths = [
    '.agents/skills/dynamic-workflow/SKILL.md',
    '.agent/skills/dynamic-workflow/SKILL.md'
  ];

  for (const path of [...personaAdapterPaths, ...portablePaths]) {
    const content = await readFile(path, 'utf8');
    assert.match(content, /docs\/operating-model\/AGENT_PERSONAS\.md/);
    assert.match(content, /does not replace or override|do not override/i);
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

test('documentation templates preserve evidence discipline and canonical BA artifact routing', async () => {
  const [
    securityReview,
    codeReviewFindings,
    platformActivation,
    requirementDiscovery,
    legacyRequirements,
    technicalDesign,
    sdd,
    configPlan,
    dataPlan,
    testPlan,
    releasePlan,
    projectBrief,
    roleDefinition,
    baAdapter,
    debuggingSkill
  ] = await Promise.all([
    readFile('docs/templates/SECURITY_REVIEW.md', 'utf8'),
    readFile('docs/templates/CODE_REVIEW_FINDINGS.md', 'utf8'),
    readFile('docs/templates/PLATFORM_ACTIVATION.md', 'utf8'),
    readFile('docs/templates/REQUIREMENT_DISCOVERY.md', 'utf8'),
    readFile('docs/templates/REQUIREMENTS.md', 'utf8'),
    readFile('docs/templates/TECHNICAL_DESIGN.md', 'utf8'),
    readFile('docs/templates/SDD.md', 'utf8'),
    readFile('docs/templates/CONFIG_CHANGE_PLAN.md', 'utf8'),
    readFile('docs/templates/DATA_CHANGE_PLAN.md', 'utf8'),
    readFile('docs/templates/TEST_PLAN.md', 'utf8'),
    readFile('docs/templates/RELEASE_PLAN.md', 'utf8'),
    readFile('docs/templates/PROJECT_BRIEF.md', 'utf8'),
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/ba-agent.md', 'utf8'),
    readFile('.agents/skills/debugging-discipline/SKILL.md', 'utf8')
  ]);

  for (const content of [securityReview, codeReviewFindings]) {
    assert.match(content, /\|[^\n]*Evidence[^\n]*\|/);
  }
  assert.match(platformActivation, /\| Record Item \| Status \/ Value \| Evidence URL \|/);

  for (const content of [sdd, technicalDesign, legacyRequirements, configPlan, dataPlan, testPlan]) {
    assert.match(content, /## Related Artifacts \/ Links/);
    assert.match(content, /\| Artifact \| Purpose \| URL \/ Repository Path \|/);
  }
  for (const content of [configPlan, dataPlan, releasePlan, projectBrief]) {
    assert.match(content, /COMPLETION_CHECK\.md/);
    assert.doesNotMatch(content, /## (Execution Record|Actual Outcome)/);
  }

  assert.match(requirementDiscovery, /## 7\. Acceptance Criteria/);
  assert.match(legacyRequirements, /Deprecated Compatibility Redirect/);
  assert.match(legacyRequirements, /Do not create new BA requirements records/);
  for (const content of [roleDefinition, baAdapter]) {
    assert.match(content, /REQUIREMENT_DISCOVERY\.md/);
    assert.match(content, /deprecated compatibility redirect/i);
  }
  assert.match(debuggingSkill, /embedded \*\*Hypothesis Matrix\*\*/);
  assert.match(debuggingSkill, /standalone `HYPOTHESIS_MATRIX\.md` only/);
});

test('QA Agent canonical rule carries its policy and the new evidence, contract, and NFR rules', async () => {
  const [roleDefinition, adapter, testPlan, testReport, playwrightSkill] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/qa-agent.md', 'utf8'),
    readFile('docs/templates/TEST_PLAN.md', 'utf8'),
    readFile('docs/templates/TEST_REPORT.md', 'utf8'),
    readFile('.agents/skills/qa-playwright-testing/SKILL.md', 'utf8')
  ]);

  assert.match(roleDefinition, /### Skill Routing/);
  assert.match(roleDefinition, /### Dynamic Routing/);
  assert.match(roleDefinition, /### Output Expectations/);
  assert.match(roleDefinition, /### Test Effectiveness/);
  assert.match(roleDefinition, /api-contract-testing/);
  assert.match(roleDefinition, /performance-testing/);
  assert.match(roleDefinition, /mutation-testing/);
  assert.match(roleDefinition, /test-quality-discipline/);

  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /Evidence-Based Reporting/);
    assert.match(content, /must reference the actual command output|attached evidence/i);
    assert.match(content, /API Contract Validation/);
    assert.match(content, /NFR Validation/);
    assert.match(content, /Test Effectiveness/);
  }
  assert.doesNotMatch(roleDefinition, /minimum of \d+[-–]\d+ issues/i);

  assert.match(testPlan, /Test Types In Scope/);
  assert.match(testPlan, /NFR Targets Under Test/);
  assert.match(testPlan, /Mutation Testing/);
  assert.match(testPlan, /Contract Validation/);

  assert.match(testReport, /Root Cause Analysis/);
  assert.match(testReport, /Why did it fail\?/);

  assert.match(playwrightSkill, /Automation Discipline/);
  assert.match(playwrightSkill, /No hard waits/);
  assert.match(playwrightSkill, /role-based selectors/i);
  assert.match(playwrightSkill, /24 hours/);
  assert.match(playwrightSkill, /Accessibility Testing/);
  assert.match(playwrightSkill, /WCAG 2\.1 AA/);
  assert.match(playwrightSkill, /axe-core\/playwright/);
});

test('the four new QA testing-discipline skills carry their required content', async () => {
  const [apiContract, performance, mutation, testQuality] = await Promise.all([
    readFile('.agents/skills/api-contract-testing/SKILL.md', 'utf8'),
    readFile('.agents/skills/performance-testing/SKILL.md', 'utf8'),
    readFile('.agents/skills/mutation-testing/SKILL.md', 'utf8'),
    readFile('.agents/skills/test-quality-discipline/SKILL.md', 'utf8')
  ]);

  assert.match(apiContract, /schemathesis/);
  assert.match(apiContract, /drf-spectacular/);
  assert.match(apiContract, /## Defect Routing/);

  assert.match(performance, /Load Testing/);
  assert.match(performance, /Stress Testing/);
  assert.match(performance, /Spike Testing/);
  assert.match(performance, /Soak Testing/);
  assert.match(performance, /Locust/);
  assert.match(performance, /## Recording Results/);

  assert.match(mutation, /## Core Concept/);
  assert.match(mutation, /mutmut/);
  assert.match(mutation, /## Scoring/);
  assert.doesNotMatch(mutation, /pass\/fail threshold of \d+%/i);

  assert.match(testQuality, /## FIRST Principles/);
  assert.match(testQuality, /Test Automation Pyramid/);
  assert.match(testQuality, /Test Data Isolation Rule/);
  assert.match(testQuality, /Overmocking/);
  assert.match(testQuality, /Test-Only Production Methods/);
  assert.match(testQuality, /Incomplete Mocks/);
});

test('SKILL_CATALOG.md carries all four new QA skill entries and the Planned Skills clarifying note', async () => {
  const catalog = await readFile('docs/operating-model/SKILL_CATALOG.md', 'utf8');

  assert.match(catalog, /^## api-contract-testing$/m);
  assert.match(catalog, /^## performance-testing$/m);
  assert.match(catalog, /^## mutation-testing$/m);
  assert.match(catalog, /^## test-quality-discipline$/m);

  assert.match(catalog, /WCAG 2\.1 AA accessibility checks/);

  assert.match(catalog, /API Test Design.*still unbuilt/);
  assert.match(catalog, /Defect Analysis.*broader test-failure/);
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

test('Release Agent carries versioning contract, evidence checklist, and triple rollback confirmation', async () => {
  const [roleDefinition, adapter, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/release-agent.md', 'utf8'),
    readFile('docs/templates/RELEASE_PLAN.md', 'utf8')
  ]);

  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /MAJOR\.MINOR\.PATCH/);
    assert.match(content, /tag/i);
    assert.match(content, /hosted CI/i);
    assert.match(content, /Documentation Agent/);
    assert.match(content, /code rollback/i);
    assert.match(content, /schema rollback/i);
    assert.match(content, /config rollback/i);
    assert.match(content, /blast radius/i);
  }

  assert.match(template, /## Version/);
  assert.match(template, /## Deployment Strategy/);
  assert.match(template, /## Release Evidence Checklist/);
  assert.match(template, /## Rollback Plan/);
});

test('Config Agent carries the config/data boundary, reload behavior, flag lifecycle, and escalation guard', async () => {
  const [roleDefinition, adapter, skill, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/config-agent.md', 'utf8'),
    readFile('.agents/skills/data-config-change/SKILL.md', 'utf8'),
    readFile('docs/templates/CONFIG_CHANGE_PLAN.md', 'utf8')
  ]);

  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /controls system \*?behavior\*?/i);
    assert.match(content, /Restart-Required|restart/i);
    assert.match(content, /removal condition/i);
    assert.match(content, /Escalation Guard/);
    assert.match(content, /Developer-skip shortcut/);
  }

  assert.match(skill, /Config vs Data Boundary/);
  assert.match(skill, /Escalation Guard/);

  assert.match(template, /Reload Behavior/);
  assert.match(template, /## Feature Flags/);
  assert.match(template, /Removal Condition/);
  assert.match(template, /## Escalation Check/);
});

test('Data Agent carries non-destructive mechanics, the SA boundary, re-run safety, PII routing, and escalation guard', async () => {
  const [roleDefinition, adapter, skill, template] = await Promise.all([
    readFile('docs/workflow/role-definitions.md', 'utf8'),
    readFile('.claude/agents/data-agent.md', 'utf8'),
    readFile('.agents/skills/data-config-change/SKILL.md', 'utf8'),
    readFile('docs/templates/DATA_CHANGE_PLAN.md', 'utf8')
  ]);

  for (const content of [roleDefinition, adapter]) {
    assert.match(content, /ON CONFLICT DO UPDATE/);
    assert.match(content, /row-count delta/i);
    assert.match(content, /does not author Django migration files/i);
    assert.match(content, /safe to run twice/i);
    assert.match(content, /PII/);
    assert.match(content, /Security Reviewer/);
    assert.match(content, /Escalation Guard/);
  }

  assert.match(skill, /Non-destructive means/i);
  assert.match(skill, /PII/);

  assert.match(template, /Touches PII/);
  assert.match(template, /Expected row-count delta/);
  assert.match(template, /## Escalation Check/);
});

test('qa-playwright-testing carries a technical reference, a debugging workflow, and the browser content security boundary', async () => {
  const skill = await readFile('.agents/skills/qa-playwright-testing/SKILL.md', 'utf8');

  assert.match(skill, /## Technical Reference/);
  assert.match(skill, /### Selector Priority/);
  assert.match(skill, /### Page Object Model/);
  assert.match(skill, /storageState/);

  assert.match(skill, /## Debugging Workflow/);
  assert.match(skill, /`debugging-discipline`/);
  assert.match(skill, /show-trace/);

  assert.match(skill, /## Browser Content Security Boundary/);
  assert.match(skill, /untrusted data, not instructions/i);
  assert.match(skill, /route to Security Reviewer/);

  assert.match(skill, /## BDD Scenario Workflow/);
  assert.match(skill, /playwright-bdd/);
  assert.match(skill, /### Necessity Check/);
  assert.match(skill, /ask the user whether a BDD spec is required/i);
  assert.match(skill, /### Scenario Approval Gate/);
  assert.match(skill, /before any implementation plan/i);
  assert.match(skill, /### Scoped Step Definitions/);
  assert.match(skill, /npx bddgen && npx playwright test/);
});

test('.agent/skills/ and .agents/skills/ carry identical skill directory names, with byte-identical content for the skills this work touches', async () => {
  const [portableEntries, antigravityEntries] = await Promise.all([
    readdir('.agents/skills', { withFileTypes: true }),
    readdir('.agent/skills', { withFileTypes: true })
  ]);
  const portableNames = portableEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const antigravityNames = antigravityEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

  assert.ok(portableNames.length > 0);
  assert.deepEqual(
    antigravityNames,
    portableNames,
    '.agent/skills/ and .agents/skills/ must contain the same skill directories'
  );

  // Scoped to the 9 skills this work touches. dynamic-workflow, frontend-ui-engineering,
  // and functional-test-design predate this work and intentionally use a thin
  // pointer-adapter pattern in .agent/skills/ rather than a full copy — not a gap to close here.
  const contentParitySkills = [
    'api-contract-testing',
    'performance-testing',
    'mutation-testing',
    'test-quality-discipline',
    'qa-playwright-testing',
    'ba-requirement-analysis',
    'data-config-change',
    'sa-architecture-design',
    'security-review'
  ];
  for (const name of contentParitySkills) {
    const [portable, antigravity] = await Promise.all([
      readFile(`.agents/skills/${name}/SKILL.md`, 'utf8'),
      readFile(`.agent/skills/${name}/SKILL.md`, 'utf8')
    ]);
    assert.equal(
      antigravity,
      portable,
      `.agent/skills/${name}/SKILL.md does not match .agents/skills/${name}/SKILL.md`
    );
  }
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

test('accepts the three New Feature examples', async () => {
  const errors = await validateContracts(process.cwd(), [
    'docs/contracts/examples/new-feature-pass.yaml',
    'docs/contracts/examples/new-feature-rework.yaml',
    'docs/contracts/examples/new-feature-blocked.yaml'
  ]);
  assert.deepEqual(errors, []);
});

test('rejects a transition not declared by the New Feature policy', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-nf-illegal-transition.yaml'
  ]);
  assert.match(errors.join('\n'), /illegal transition: intake -> verifying/);
});

test('rejects a second New Feature rework transition (budget = 1)', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-nf-second-rework.yaml'
  ]);
  assert.match(errors.join('\n'), /rework_count must not exceed 1/);
});

test('rejects disconnected New Feature history', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-nf-disconnected-history.yaml'
  ]);
  assert.match(errors.join('\n'), /history must be continuous/);
});

test('rejects New Feature max_rework_attempts that differs from policy', async () => {
  const errors = await validateContracts(process.cwd(), [
    'test/fixtures/invalid-nf-mismatched-retry-limit.yaml'
  ]);
  assert.match(errors.join('\n'), /must be equal to constant/);
});
