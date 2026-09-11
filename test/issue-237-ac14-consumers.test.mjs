import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const consumers = [
  'docs/operating-model/CONTEXT_BUDGET.md',
  'docs/operating-model/README.md',
  'docs/vault/00-Index.md',
  'docs/workflows/stabilize-core.md',
  'docs/operating-model/AGENT_EVALUATION_CHECKLIST.md'
];

const skillIds = [
  'dynamic-workflow', 'frontend-ui-engineering', 'management-status-update',
  'functional-test-design', 'static-logic-review', 'playwright-qa',
  'security-review', 'defect-analysis', 'debugging-discipline',
  'engineering-postmortem', 'ba-requirement-analysis', 'sa-architecture-design'
];

test('AC-14 consumers retain catalog links and do not depend on removed skill headings', async () => {
  const contents = await Promise.all(consumers.map((file) => readFile(file, 'utf8')));

  for (const [index, content] of contents.entries()) {
    assert.match(content, /SKILL_CATALOG\.md/, `${consumers[index]} lost its catalog reference`);
    for (const skillId of skillIds) {
      assert.doesNotMatch(
        content,
        new RegExp(`^## ${skillId}$`, 'm'),
        `${consumers[index]} still depends on the removed ## ${skillId} block`
      );
    }
  }
});

test('AC-14 budget consumer records the measured post-collapse catalog values', async () => {
  const budget = await readFile(consumers[0], 'utf8');
  assert.match(budget, /Commit SHA \| `d978a66` \(pre-AC-14 baseline\)/);
  assert.match(budget, /Total tokens \(approx\.\) \| 26,196/);
  assert.match(budget, /`docs\/operating-model\/SKILL_CATALOG\.md` \| 19,034 \| 4,758/);
});
