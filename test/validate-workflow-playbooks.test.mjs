import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const WORKFLOWS_DIR = 'docs/workflows';

async function listPlaybooks() {
  const entries = await readdir(WORKFLOWS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(WORKFLOWS_DIR, entry.name));
}

test('new-feature playbook references its contract', async () => {
  const newFeature = await readFile('docs/workflows/new-feature.md', 'utf8');
  assert.match(newFeature, /docs\/contracts\/new-feature-workflow\.yaml/);
});

test('every playbook in docs/workflows/ contains at least one outbound wiki link', async () => {
  const playbooks = await listPlaybooks();
  assert.equal(playbooks.length, 12, 'expected exactly 12 playbook files in docs/workflows/');
  for (const playbook of playbooks) {
    const content = await readFile(playbook, 'utf8');
    assert.ok(content.includes('[['), `${playbook} does not contain any [[ wiki link`);
  }
});

test('every wiki-link target in docs/workflows/ resolves to a file on disk', async () => {
  const playbooks = await listPlaybooks();
  const linkPattern = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  let totalLinksChecked = 0;

  for (const playbook of playbooks) {
    const content = await readFile(playbook, 'utf8');
    const dir = path.dirname(playbook);
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const target = match[1];
      const resolved = path.resolve(dir, target);
      totalLinksChecked += 1;
      await assert.doesNotReject(
        () => readFile(resolved, 'utf8'),
        `${playbook}: wiki-link target "${target}" (resolved to ${resolved}) does not exist`
      );
    }
  }

  assert.ok(totalLinksChecked > 0, 'expected at least one wiki link to be checked across all playbooks');
});

test('the five expanded thin playbooks each contain their required headings', async () => {
  const requiredHeadingsByFile = {
    'docs/workflows/config-change.md': [/^##\s+Use when/im, /^##\s+Gate Rules/im, /^##\s+Handoff/im],
    'docs/workflows/data-change.md': [/^##\s+Use when/im, /^##\s+Gate Rules/im, /^##\s+Handoff/im],
    'docs/workflows/new-feature.md': [/^##\s+Use when/im, /^##\s+Gate Rules/im, /^##\s+Handoff/im],
    'docs/workflows/code-review-gate.md': [/^##\s+Use when/im, /^##\s+Gate Rules/im, /^##\s+Handoff/im],
    'docs/workflows/tdd-implementation-flow.md': [/^##\s+Use when/im, /^##\s+Gate Rules/im, /^##\s+Handoff/im]
  };

  for (const [file, patterns] of Object.entries(requiredHeadingsByFile)) {
    const content = await readFile(file, 'utf8');
    for (const pattern of patterns) {
      assert.match(content, pattern, `${file} is missing a heading matching ${pattern}`);
    }
  }
});

test('bug-fix.md keeps its plain-text contract path (regression guard for validate-contracts.test.mjs)', async () => {
  const bugFix = await readFile('docs/workflows/bug-fix.md', 'utf8');
  assert.match(bugFix, /docs\/contracts\/bug-fix-workflow\.yaml/);
});
