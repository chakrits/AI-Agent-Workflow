import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  stripFrontmatter,
  extractName,
  checkAdapterParity
} from '../scripts/validate-adapter-parity.mjs';

/**
 * Build a disposable temp repo that mirrors this repo's adapter layout:
 * .agents/agents/<adapter>.md, .claude/agents/<adapter>.md,
 * .agent/agents/<adapter>.md. All three copies are identical by default,
 * each with host-appropriate (but here identical) frontmatter.
 */
function makeTempAdapterRepo(adapters) {
  const root = mkdtempSync(path.join(tmpdir(), 'adapter-parity-test-'));
  for (const adapter of adapters) {
    for (const dir of ['.agents/agents', '.claude/agents', '.agent/agents']) {
      mkdirSync(path.join(root, dir), { recursive: true });
      writeFileSync(
        path.join(root, dir, `${adapter}.md`),
        `---\nname: ${adapter}\ndescription: test adapter\n---\n\n# ${adapter}\n\nTest body content.\n`
      );
    }
  }
  return root;
}

// --- stripFrontmatter / extractName --------------------------------------

test('stripFrontmatter separates the leading frontmatter block from the body', () => {
  const text = '---\nname: alpha\ndescription: d\n---\n\n# alpha\n\nBody text.\n';
  const { frontmatter, body } = stripFrontmatter(text);
  assert.match(frontmatter, /name: alpha/);
  assert.equal(body, '\n# alpha\n\nBody text.\n');
});

test('stripFrontmatter returns the whole file as body when there is no leading frontmatter fence', () => {
  const text = '# alpha\n\nNo frontmatter here.\n\n---\n\nA horizontal rule, not frontmatter.\n';
  const { frontmatter, body } = stripFrontmatter(text);
  assert.equal(frontmatter, '');
  assert.equal(body, text);
});

test('stripFrontmatter does not mistake a body horizontal rule for a second fence', () => {
  const text = '---\nname: alpha\n---\n# alpha\n\nSome text.\n\n---\n\nMore text after a rule.\n';
  const { body } = stripFrontmatter(text);
  assert.match(body, /More text after a rule\./);
  assert.match(body, /^# alpha/);
});

test('extractName reads the name: field from a frontmatter block', () => {
  assert.equal(extractName('name: developer-agent\ndescription: x\n'), 'developer-agent');
});

test('extractName returns null when no name: field is present', () => {
  assert.equal(extractName('description: x\n'), null);
});

// --- checkAdapterParity ---------------------------------------------------

test('checkAdapterParity returns 0 failed (all OK) when all three copies match', () => {
  const root = makeTempAdapterRepo(['alpha', 'beta']);
  try {
    const { rows, passed, failed } = checkAdapterParity(root);
    assert.equal(failed, 0);
    assert.equal(passed, 2);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.status, 'OK');
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkAdapterParity reports MISSING when an adapter is absent from .claude/agents/', () => {
  const root = makeTempAdapterRepo(['alpha', 'beta']);
  try {
    rmSync(path.join(root, '.claude/agents/alpha.md'), { force: true });

    const { rows, failed } = checkAdapterParity(root);
    assert.equal(failed, 1);

    const alpha = rows.find((r) => r.adapter === 'alpha.md');
    assert.equal(alpha.status, 'MISSING');
    assert.equal(alpha.claude, null);
    assert.ok(alpha.agents);

    const beta = rows.find((r) => r.adapter === 'beta.md');
    assert.equal(beta.status, 'OK');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkAdapterParity fails closed (MISSING) when an adapter exists in .claude/ and .agent/ but is absent from the canonical .agents/ tree', () => {
  // This is the enumeration hole AC-03 exists to close: a canonical-only
  // directory listing would never see this adapter at all, since it does
  // not exist under .agents/agents/. Enumerating the union of all three
  // trees is what makes this case detectable rather than silently skipped.
  const root = makeTempAdapterRepo(['alpha']);
  try {
    rmSync(path.join(root, '.agents/agents/alpha.md'), { force: true });

    const { rows, failed } = checkAdapterParity(root);
    assert.equal(failed, 1);
    assert.equal(rows.length, 1);

    const alpha = rows[0];
    assert.equal(alpha.adapter, 'alpha.md');
    assert.equal(alpha.status, 'MISSING');
    assert.equal(alpha.agents, null);
    assert.ok(alpha.claude);
    assert.ok(alpha.agent);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkAdapterParity reports DRIFT when an adapter body differs across platforms (frontmatter-only differences do not count as drift)', () => {
  const root = makeTempAdapterRepo(['alpha', 'beta']);
  try {
    // Change only frontmatter (description/tools may legitimately differ
    // per host) plus a real body change, to prove the body is what's hashed.
    writeFileSync(
      path.join(root, '.claude/agents/alpha.md'),
      '---\nname: alpha\ndescription: DIFFERENT DESCRIPTION\ntools: Read, Edit\n---\n\n# alpha\n\nDifferent body content.\n'
    );

    const { rows, failed } = checkAdapterParity(root);
    assert.equal(failed, 1);

    const alpha = rows.find((r) => r.adapter === 'alpha.md');
    assert.equal(alpha.status, 'DRIFT');
    assert.notEqual(alpha.claude, alpha.agents);
    assert.equal(alpha.agent, alpha.agents);

    const beta = rows.find((r) => r.adapter === 'beta.md');
    assert.equal(beta.status, 'OK');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkAdapterParity does NOT report drift when only frontmatter differs and bodies match', () => {
  const root = makeTempAdapterRepo(['alpha']);
  try {
    writeFileSync(
      path.join(root, '.agents/agents/alpha.md'),
      '---\nname: alpha\ndescription: canonical description\n---\n\n# alpha\n\nTest body content.\n'
    );
    writeFileSync(
      path.join(root, '.agent/agents/alpha.md'),
      '---\nname: alpha\ndescription: a different, host-appropriate description\n---\n\n# alpha\n\nTest body content.\n'
    );

    const { rows, failed } = checkAdapterParity(root);
    assert.equal(failed, 0);
    assert.equal(rows[0].status, 'OK');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkAdapterParity reports NAME_DRIFT when name: differs across platforms even though bodies are identical', () => {
  const root = makeTempAdapterRepo(['alpha']);
  try {
    writeFileSync(
      path.join(root, '.agent/agents/alpha.md'),
      '---\nname: alpha-renamed\ndescription: test adapter\n---\n\n# alpha\n\nTest body content.\n'
    );

    const { rows, failed } = checkAdapterParity(root);
    assert.equal(failed, 1);

    const alpha = rows[0];
    assert.equal(alpha.status, 'NAME_DRIFT');
    // The body hash is identical across all three trees — proves NAME_DRIFT
    // is detected independently of the body-hash comparison, not folded into
    // the DRIFT branch.
    assert.equal(alpha.agents, alpha.claude);
    assert.equal(alpha.claude, alpha.agent);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Exit code regression -----------------------------------------------

test('CLI exits 0 when all adapters are in sync', () => {
  const root = makeTempAdapterRepo(['alpha']);
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-adapter-parity.mjs');
  try {
    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 0, 'CLI must exit 0 when all adapters are in sync');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when an adapter is missing from a tree', () => {
  const root = makeTempAdapterRepo(['alpha']);
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-adapter-parity.mjs');
  try {
    rmSync(path.join(root, '.agent/agents/alpha.md'), { force: true });

    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'CLI must exit 1 when an adapter is missing from a tree');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI exits 1 when an adapter drifts across platforms', () => {
  const root = makeTempAdapterRepo(['alpha']);
  const scriptPath = path.resolve(import.meta.dirname, '..', 'scripts', 'validate-adapter-parity.mjs');
  try {
    writeFileSync(
      path.join(root, '.claude/agents/alpha.md'),
      '---\nname: alpha\ndescription: test adapter\n---\n\n# alpha\n\nDrifted body.\n'
    );

    let exitCode;
    try {
      execFileSync('node', [scriptPath], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status ?? 1;
    }
    assert.equal(exitCode, 1, 'CLI must exit 1 when an adapter is drifted');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
