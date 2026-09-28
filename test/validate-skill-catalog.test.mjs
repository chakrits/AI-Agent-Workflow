import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateSkillCatalog } from '../scripts/validate-skill-catalog.mjs';

const skillTrees = ['.agents/skills', '.claude/skills', '.agent/skills'];
const catalogPath = 'docs/operating-model/SKILL_CATALOG.md';
const vaultPath = 'docs/vault/00-Index.md';

function frontmatter(id, description) {
  return `---\nname: ${id}\ndescription: ${description}\n---\n# ${id}\n`;
}

function catalogRow(id) {
  return `| ${id} | trigger for ${id} | QA Agent | never for another task | next-agent |`;
}

function vaultLink(id) {
  return `- ${id} — [[../../.agents/skills/${id}/SKILL.md|portable]] · [[../../.claude/skills/${id}/SKILL.md|claude]] · [[../../.agent/skills/${id}/SKILL.md|antigravity]]`;
}

function makeTempRepo({ skills = { alpha: 'alpha trigger', beta: 'beta trigger' }, catalogIds, vaultIds } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'skill-catalog-test-'));
  const ids = Object.keys(skills);

  for (const tree of skillTrees) {
    for (const id of ids) {
      const dir = path.join(root, tree, id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'SKILL.md'), frontmatter(id, skills[id]));
    }
  }

  mkdirSync(path.join(root, path.dirname(catalogPath)), { recursive: true });
  mkdirSync(path.join(root, path.dirname(vaultPath)), { recursive: true });
  writeFileSync(
    path.join(root, catalogPath),
    `# Skill Catalog\n\n## Available Skills\n\n| Skill | Trigger | Primary Agent | Do Not Use When | Next Skill / Agent |\n|---|---|---|---|---|\n${(catalogIds ?? ids).map(catalogRow).join('\n')}\n`
  );
  writeFileSync(
    path.join(root, vaultPath),
    `# Index\n\n## Skills\n\n${(vaultIds ?? ids).map(vaultLink).join('\n')}\n`
  );

  return root;
}

function withTempRepo(options, action) {
  const root = makeTempRepo(options);
  try {
    return action(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function assertInvalid(root, expectedCategory) {
  const result = validateSkillCatalog(root);
  assert.ok(result.errors.length > 0, 'expected at least one validation error');
  if (expectedCategory) {
    assert.match(
      result.errors.join('\n'),
      expectedCategory,
      `expected a ${expectedCategory} diagnostic, got: ${result.errors.join('; ')}`
    );
  }
}

test('accepts_exact_inventory_and_description_budgets', () => {
  withTempRepo({}, (root) => {
    const result = validateSkillCatalog(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.canonicalSkillCount, 2);
    assert.equal(result.descriptionCount, 2);
    assert.equal(result.totalDescriptionCodePoints, 'alpha trigger'.length + 'beta trigger'.length);
  });
});

test('rejects_missing_or_mirror_only_skill_directories', () => {
  withTempRepo({}, (root) => {
    rmSync(path.join(root, '.agents/skills/alpha'), { recursive: true, force: true });
    assertInvalid(root, /inventory|canonical/i);
  });

  withTempRepo({}, (root) => {
    rmSync(path.join(root, '.claude/skills/alpha'), { recursive: true, force: true });
    assertInvalid(root, /inventory|mirror|claude/i);
  });

  withTempRepo({}, (root) => {
    const mirrorOnly = path.join(root, '.claude/skills/orphan');
    mkdirSync(mirrorOnly, { recursive: true });
    writeFileSync(path.join(mirrorOnly, 'SKILL.md'), frontmatter('orphan', 'orphan trigger'));
    assertInvalid(root, /inventory|mirror|orphan/i);
  });
});

test('rejects_missing_stale_or_duplicate_catalog_entries', () => {
  withTempRepo({ catalogIds: ['alpha'] }, (root) => assertInvalid(root, /catalog/i));
  withTempRepo({ catalogIds: ['alpha', 'beta', 'stale'] }, (root) => assertInvalid(root, /catalog/i));
  withTempRepo({ catalogIds: ['alpha', 'alpha', 'beta'] }, (root) => assertInvalid(root, /catalog/i));
});

test('rejects_malformed_catalog_rows_even_when_valid_entries_are_complete', () => {
  for (const id of ['stale', 'alpha']) {
    withTempRepo({}, (root) => {
      const catalogFile = path.join(root, catalogPath);
      const validCatalog = readFileSync(catalogFile, 'utf8');
      writeFileSync(
        catalogFile,
        `${validCatalog}\n### QA\n\nThis prose is not a skill row.\n| ${id} | trigger | QA Agent | exclusion | next-agent | extra cell |\n`
      );
      const result = validateSkillCatalog(root);
      assert.equal(result.errors.length, 1, `expected only the malformed row error: ${result.errors.join('; ')}`);
      assert.match(result.errors[0], /malformed catalog row/i);
    });
  }
});

test('rejects_missing_stale_or_duplicate_vault_links', () => {
  withTempRepo({ vaultIds: ['alpha'] }, (root) => assertInvalid(root, /vault|index/i));
  withTempRepo({ vaultIds: ['alpha', 'beta', 'stale'] }, (root) => assertInvalid(root, /vault|index/i));
  withTempRepo({ vaultIds: ['alpha', 'alpha', 'beta'] }, (root) => assertInvalid(root, /vault|index/i));
});

test('rejects_invalid_or_empty_skill_frontmatter', () => {
  withTempRepo({}, (root) => {
    const malformed = '# missing frontmatter\n';
    for (const tree of skillTrees) {
      writeFileSync(path.join(root, tree, 'alpha/SKILL.md'), malformed);
    }
    assertInvalid(root, /frontmatter/i);
  });

  withTempRepo({ skills: { alpha: '' } }, (root) => assertInvalid(root, /description|frontmatter/i));
});

test('accepts_160_code_points_and_rejects_161', () => {
  const validDescription = '😀'.repeat(160);
  withTempRepo({ skills: { alpha: validDescription } }, (root) => {
    const result = validateSkillCatalog(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.descriptionCount, 1);
    assert.equal(result.totalDescriptionCodePoints, 160);
  });

  withTempRepo({ skills: { alpha: '😀'.repeat(161) } }, (root) => assertInvalid(root, /description/i));
});

test('accepts_5500_total_code_points_and_rejects_5501', () => {
  const atLimit = Object.fromEntries(
    Array.from({ length: 35 }, (_, index) => [`skill-${index}`, 'x'.repeat(index === 34 ? 60 : 160)])
  );
  withTempRepo({ skills: atLimit }, (root) => {
    const result = validateSkillCatalog(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.canonicalSkillCount, 35);
    assert.equal(result.descriptionCount, 35);
    assert.equal(result.totalDescriptionCodePoints, 5500);
  });

  const overLimit = { ...atLimit, 'skill-34': 'x'.repeat(61) };
  withTempRepo({ skills: overLimit }, (root) => assertInvalid(root, /description/i));
});
