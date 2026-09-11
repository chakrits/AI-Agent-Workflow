import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

const consumers = [
  'docs/operating-model/CONTEXT_BUDGET.md',
  'docs/operating-model/README.md',
  'docs/vault/00-Index.md',
  'docs/workflows/stabilize-core.md',
  'docs/operating-model/AGENT_EVALUATION_CHECKLIST.md'
];

const skillIds = [
  'ba-requirement-analysis',
  'sa-architecture-design',
  'data-config-change',
  'requirement-brainstorming',
  'implementation-planning',
  'tdd-implementation',
  'verification-before-completion',
  'code-review-gate',
  'git-workflow-and-versioning',
  'api-contract-testing',
  'performance-testing',
  'mutation-testing',
  'test-quality-discipline',
  'static-logic-review',
  'defect-analysis',
  'api-testing-tooling',
  'api-test-design',
  'api-compliance-patterns',
  'api-security-patterns',
  'api-versioning-deprecation',
  'api-observability-monitoring',
  'api-integration-patterns',
  'api-mocking-sandbox',
  'js-unit-testing',
  'python-unit-testing',
  'coding-standards',
  'backend-patterns',
  'frontend-react-patterns',
  'frontend-visual-design',
  'documentation-closeout',
  'release-readiness-checklist',
];

test('AC-14 consumers retain catalog links and do not depend on removed skill headings', async () => {
  const contents = await Promise.all(consumers.map((file) => readFile(file, 'utf8')));
  const catalog = await readFile('docs/operating-model/SKILL_CATALOG.md', 'utf8');

  for (const skillId of skillIds) {
    assert.match(catalog, new RegExp(`^\\| ${skillId} \\|`, 'm'), `catalog lost the ${skillId} row`);
  }

  const catalogPath = resolve('docs/operating-model/SKILL_CATALOG.md');
  for (const [index, content] of contents.entries()) {
    assert.match(content, /SKILL_CATALOG\.md/, `${consumers[index]} lost its catalog reference`);
    const wikiLinks = [...content.matchAll(/\[\[([^|\]]+)\|SKILL_CATALOG\.md\]\]/g)];
    for (const [, target] of wikiLinks) {
      assert.equal(
        resolve(dirname(consumers[index]), target),
        catalogPath,
        `${consumers[index]} link target must resolve to SKILL_CATALOG.md`
      );
    }
    for (const skillId of skillIds) {
      assert.doesNotMatch(
        content,
        new RegExp(`^## ${skillId}$`, 'm'),
        `${consumers[index]} still depends on the removed ## ${skillId} block`
      );
    }
    assert.doesNotMatch(content, /^\| Input \| Output \|/m, `${consumers[index]} still depends on removed catalog columns`);
    assert.doesNotMatch(content, /^###? Skill Routing$/m, `${consumers[index]} still embeds catalog routing headings`);
  }
});

test('AC-14 budget consumer records the measured post-collapse catalog values', async () => {
  const budget = await readFile(consumers[0], 'utf8');
  assert.match(budget, /Commit SHA \| `d978a66` \(pre-AC-14 baseline\)/);
  assert.match(budget, /Total tokens \(approx\.\) \| 26,196/);
  assert.match(budget, /`docs\/operating-model\/SKILL_CATALOG\.md` \| 19,034 \| 4,758/);
});
