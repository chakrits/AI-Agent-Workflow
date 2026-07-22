import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync, existsSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkSkillParity } from '../scripts/validate-skill-parity.mjs';

/**
 * Build a disposable temp repo that mirrors this repo's skill layout:
 * .agents/skills/<skill>/SKILL.md, .claude/skills/<skill>/SKILL.md,
 * .agent/skills/<skill>/SKILL.md. All three copies are identical.
 */
function makeTempSkillRepo(skills) {
  const root = mkdtempSync(path.join(tmpdir(), 'skill-parity-test-'));
  for (const skill of skills) {
    for (const dir of ['.agents/skills', '.claude/skills', '.agent/skills']) {
      const skillDir = path.join(root, dir, skill);
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---\nname: ${skill}\ndescription: test skill\n---\n# ${skill}\n\nTest content.\n`
      );
    }
  }
  return root;
}

test('checkSkillParity returns 0 failed (all in sync) when all three copies match', () => {
  const root = makeTempSkillRepo(['alpha', 'beta']);
  try {
    const { rows, passed, failed } = checkSkillParity(root);
    assert.equal(failed, 0);
    assert.equal(passed, 2);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.status, 'OK');
      assert.ok(row.agents);
      assert.equal(row.claude, row.agents);
      assert.equal(row.agent, row.agents);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkSkillParity reports MISSING when a skill is absent from .claude/', () => {
  const root = makeTempSkillRepo(['alpha', 'beta']);
  try {
    // Remove the .claude/skills/alpha directory to simulate a missing skill
    rmSync(path.join(root, '.claude/skills/alpha'), { recursive: true, force: true });

    const { rows, failed } = checkSkillParity(root);
    assert.equal(failed, 1);

    const alpha = rows.find((r) => r.skill === 'alpha');
    assert.equal(alpha.status, 'MISSING');
    assert.equal(alpha.claude, null);
    assert.ok(alpha.agents); // canonical copy still exists

    const beta = rows.find((r) => r.skill === 'beta');
    assert.equal(beta.status, 'OK');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkSkillParity reports DRIFT when a skill content differs across platforms', () => {
  const root = makeTempSkillRepo(['alpha', 'beta']);
  try {
    // Modify the .claude copy to introduce drift
    writeFileSync(
      path.join(root, '.claude/skills/alpha/SKILL.md'),
      '---\nname: alpha\ndescription: DRIFTED\n---\n# alpha\n\nDifferent content.\n'
    );

    const { rows, failed } = checkSkillParity(root);
    assert.equal(failed, 1);

    const alpha = rows.find((r) => r.skill === 'alpha');
    assert.equal(alpha.status, 'DRIFT');
    assert.notEqual(alpha.claude, alpha.agents);
    assert.equal(alpha.agent, alpha.agents); // agent copy still matches canonical

    const beta = rows.find((r) => r.skill === 'beta');
    assert.equal(beta.status, 'OK');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Exit code regression -----------------------------------------------
//
// The CLI must exit 0 when all skills are in sync, and exit 1 when any
// skill is missing or drifted, so CI can gate on the exit code.

test('CLI exits 0 when all skills are in sync', () => {
  const root = makeTempSkillRepo(['alpha']);
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-skill-parity.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'CLI must exit 0 when all skills are in sync');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when a skill is drifted', () => {
  const root = makeTempSkillRepo(['alpha']);
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-skill-parity.mjs');
  try {
    writeFileSync(
      path.join(root, '.claude/skills/alpha/SKILL.md'),
      '---\nname: alpha\ndescription: DRIFTED\n---\nDifferent content.\n'
    );

    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'CLI must exit 1 when a skill is drifted');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
