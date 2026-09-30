import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

const TREES = ['.agents', '.claude', '.agent'];
const CATALOG = 'docs/operating-model/SKILL_CATALOG.md';
const VAULT = 'docs/vault/00-Index.md';
const DESCRIPTION_LIMIT = 160;
const TOTAL_DESCRIPTION_LIMIT = 5500;

function readRequired(rootDir, relativePath, errors) {
  const filePath = path.join(rootDir, relativePath);
  if (!existsSync(filePath)) {
    errors.push(`Missing ${relativePath}`);
    return null;
  }
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`Cannot read ${relativePath}: ${error.message}`);
    return null;
  }
}

function skillDirectories(rootDir, tree, errors) {
  const relativePath = `${tree}/skills`;
  try {
    return new Set(readdirSync(path.join(rootDir, relativePath), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name));
  } catch (error) {
    errors.push(`Cannot read ${relativePath} inventory: ${error.message}`);
    return new Set();
  }
}

function compareMembership(label, expected, actual, errors) {
  for (const id of [...expected].sort()) {
    if (!actual.has(id)) errors.push(`${label}: missing ${id}`);
  }
  for (const id of [...actual].sort()) {
    if (!expected.has(id)) errors.push(`${label}: stale ${id}`);
  }
}

function catalogIds(content, errors) {
  const counts = new Map();
  let inDirectory = false;
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (/^##\s+Available Skills\s*$/.test(line)) {
      inDirectory = true;
      continue;
    }
    if (inDirectory && /^##\s+/.test(line)) break;
    const row = line.trim();
    if (!inDirectory || !row.startsWith('|')) continue;
    const cells = row.endsWith('|') ? row.split('|').slice(1, -1).map((cell) => cell.trim()) : [];
    if (cells.length !== 5) {
      errors.push(`Malformed catalog row at ${CATALOG}:${index + 1}: expected five columns`);
      continue;
    }
    if (cells[0] === 'Skill' || /^:?-{3,}:?$/.test(cells[0])) continue;
    const id = cells[0].replace(/^.*\(`([^`]+)`\).*$/, '$1');
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return { counts, found: inDirectory };
}

function vaultIds(content, tree) {
  const counts = new Map();
  const links = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g);
  for (const [, target] of links) {
    const match = target.match(new RegExp(`^(?:\\.\\.\\/)+\\${tree}\\/skills\\/([^/]+)\\/SKILL\\.md$`));
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

function validateCounts(label, canonicalIds, counts, errors) {
  for (const id of [...canonicalIds].sort()) {
    const count = counts.get(id) ?? 0;
    if (count !== 1) errors.push(`${label}: ${id} has ${count} entries; expected exactly one`);
  }
  for (const [id, count] of counts) {
    if (!canonicalIds.has(id)) errors.push(`${label}: stale ${id} (${count} entries)`);
  }
}

export function validateSkillCatalog(rootDir = process.cwd()) {
  const errors = [];
  const canonicalIds = skillDirectories(rootDir, TREES[0], errors);
  let descriptionCount = 0;
  let totalDescriptionCodePoints = 0;

  for (const tree of TREES.slice(1)) {
    const mirrorIds = skillDirectories(rootDir, tree, errors);
    compareMembership(`${tree} inventory`, canonicalIds, mirrorIds, errors);
  }

  for (const id of [...canonicalIds].sort()) {
    const relativePath = `${TREES[0]}/skills/${id}/SKILL.md`;
    const content = readRequired(rootDir, relativePath, errors);
    if (content === null) continue;
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatter) {
      errors.push(`${relativePath}: missing or malformed frontmatter`);
      continue;
    }
    let metadata;
    try {
      const document = YAML.parseDocument(frontmatter[1], { uniqueKeys: true });
      if (document.errors.length > 0) {
        errors.push(`${relativePath}: malformed frontmatter YAML: ${document.errors.map((error) => error.message).join('; ')}`);
        continue;
      }
      metadata = document.toJS();
    } catch (error) {
      errors.push(`${relativePath}: malformed frontmatter YAML: ${error.message}`);
      continue;
    }
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      errors.push(`${relativePath}: frontmatter must be a mapping`);
      continue;
    }
    if (typeof metadata.name !== 'string' || !metadata.name.trim()) {
      errors.push(`${relativePath}: missing or empty frontmatter name`);
    }
    if (typeof metadata.description !== 'string' || !metadata.description.trim()) {
      errors.push(`${relativePath}: missing or empty frontmatter description`);
      continue;
    }
    const length = Array.from(metadata.description).length;
    descriptionCount++;
    totalDescriptionCodePoints += length;
    if (length > DESCRIPTION_LIMIT) {
      errors.push(`${relativePath}: description has ${length} code points (limit ${DESCRIPTION_LIMIT})`);
    }
  }

  if (totalDescriptionCodePoints > TOTAL_DESCRIPTION_LIMIT) {
    errors.push(`Canonical descriptions total ${totalDescriptionCodePoints} code points (limit ${TOTAL_DESCRIPTION_LIMIT})`);
  }

  const catalog = readRequired(rootDir, CATALOG, errors);
  if (catalog !== null) {
    const { counts, found } = catalogIds(catalog, errors);
    if (!found) errors.push(`${CATALOG}: missing Available Skills directory`);
    validateCounts('Catalog', canonicalIds, counts, errors);
  }

  const vault = readRequired(rootDir, VAULT, errors);
  if (vault !== null) {
    for (const tree of TREES) {
      validateCounts(`Vault index ${tree}`, canonicalIds, vaultIds(vault, tree), errors);
    }
  }

  return { errors, canonicalSkillCount: canonicalIds.size, descriptionCount, totalDescriptionCodePoints };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateSkillCatalog();
  for (const error of result.errors) console.error(error);
  console.log(`${result.canonicalSkillCount} canonical skills; ${result.descriptionCount} descriptions; ${result.totalDescriptionCodePoints} description code points.`);
  process.exitCode = result.errors.length > 0 ? 1 : 0;
}
