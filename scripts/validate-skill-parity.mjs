import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const PLATFORM_DIRS = [
  { name: 'agents', dir: '.agents/skills' },
  { name: 'claude', dir: '.claude/skills' },
  { name: 'agent', dir: '.agent/skills' }
];

/**
 * Compute MD5 hex digest of a file's contents.
 * Returns null if the file does not exist.
 */
export function md5File(filePath) {
  if (!existsSync(filePath)) return null;
  const buf = readFileSync(filePath);
  return createHash('md5').update(buf).digest('hex');
}

/**
 * List skill directory names under .agents/skills/ (the canonical source).
 */
export function listCanonicalSkills(root = process.cwd()) {
  const canonicalDir = path.join(root, '.agents/skills');
  return readdirSync(canonicalDir)
    .filter((entry) => {
      const full = path.join(canonicalDir, entry);
      return statSync(full).isDirectory();
    })
    .sort();
}

/**
 * For each skill in the canonical .agents/skills/ directory, compute the
 * MD5 of its SKILL.md across all three platform directories. A skill is
 * "in sync" when all three hashes are identical and non-null.
 *
 * Returns { rows, passed, failed } where each row describes the status of
 * one skill across the three platforms.
 */
export function checkSkillParity(root = process.cwd()) {
  const skills = listCanonicalSkills(root);
  const rows = [];
  let failed = 0;

  for (const skill of skills) {
    const hashes = {};
    let missing = false;

    for (const platform of PLATFORM_DIRS) {
      const skillMd = path.join(root, platform.dir, skill, 'SKILL.md');
      const hash = md5File(skillMd);
      hashes[platform.name] = hash;
      if (hash === null) missing = true;
    }

    const canonical = hashes.agents;
    const inSync =
      !missing && canonical !== null &&
      hashes.claude === canonical &&
      hashes.agent === canonical;

    let status;
    if (missing) {
      status = 'MISSING';
    } else if (inSync) {
      status = 'OK';
    } else {
      status = 'DRIFT';
    }

    if (!inSync) failed++;

    rows.push({ skill, status, ...hashes });
  }

  return { rows, passed: rows.length - failed, failed };
}

function printTable(rows) {
  const header = ['SKILL', 'STATUS', 'AGENTS', 'CLAUDE', 'AGENT'];
  const colWidths = [30, 10, 14, 14, 14];
  const sep = '+';
  const border = colWidths.map((w) => '-'.repeat(w + 2)).join('+');

  console.log(border);
  console.log(sep + header.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join(sep) + sep);
  console.log(border);

  for (const row of rows) {
    const cells = [
      row.skill,
      row.status,
      row.agents ?? '(missing)',
      row.claude ?? '(missing)',
      row.agent ?? '(missing)'
    ];
    console.log(sep + cells.map((c, i) => ` ${String(c).padEnd(colWidths[i])} `).join(sep) + sep);
  }

  console.log(border);
}

async function main() {
  const { rows, passed, failed } = checkSkillParity(process.cwd());

  printTable(rows);

  console.log(`\n${passed} skill(s) in sync, ${failed} skill(s) drifted or missing.`);

  if (failed > 0) {
    console.error('\nSkill parity check FAILED: some skills are missing or drifted.');
    process.exitCode = 1;
  } else {
    console.log('\nSkill parity check PASSED: all skills in sync across .agents/, .claude/, and .agent/.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
