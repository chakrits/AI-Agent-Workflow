import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

const workflowPath = '.github/workflows/status-runtime-matrix.yml';
const checkoutSha = '34e114876b0b11c390a56381ad16ebd13914f8d5';
const setupNodeSha = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const setupPythonSha = 'a26af69be951a213d495a4c3e4e4022e16d87065';

test('runtime matrix is read-only, bounded, pinned, and dependency-safe', async () => {
  const workflow = parse(await readFile(workflowPath, 'utf8'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(workflow.jobs['node-status'].strategy.matrix.os, ['ubuntu-latest', 'windows-latest']);
  assert.deepEqual(workflow.jobs['python-jcs-reference'].strategy.matrix.os, ['ubuntu-latest', 'windows-latest']);
  assert.equal(workflow.jobs['node-status']['timeout-minutes'], 15);
  assert.equal(workflow.jobs['python-jcs-reference']['timeout-minutes'], 5);

  const steps = Object.values(workflow.jobs).flatMap(({ steps: jobSteps }) => jobSteps);
  assert.equal(steps.filter(({ uses }) => uses === `actions/checkout@${checkoutSha}`).length, 2);
  assert.ok(steps.filter(({ uses }) => uses?.startsWith('actions/checkout@'))
    .every(({ with: options }) => options?.['persist-credentials'] === false));
  assert.equal(steps.filter(({ uses }) => uses === `actions/setup-node@${setupNodeSha}`).length, 1);
  assert.equal(steps.filter(({ uses }) => uses === `actions/setup-python@${setupPythonSha}`).length, 1);
  assert.ok(steps.some(({ run }) => run === 'npm ci --ignore-scripts --no-audit --no-fund'));
  assert.ok(steps.every((step) => !JSON.stringify(step).includes('secrets.')));
});

test('text fixture checkout attributes require LF on every runner', () => {
  for (const fixture of ['manifest.json', 'jcs-u01.json', 'jcs-negative-zero.json', 'parser-forbidden.yaml']) {
    const relative = `test/fixtures/work-item-status/v1/${fixture}`;
    const output = execFileSync('git', ['check-attr', 'text', 'eol', '--', relative], { encoding: 'utf8' });
    assert.match(output, /: text: set\r?\n/);
    assert.match(output, /: eol: lf\r?\n/);
  }
});

test('memory workload uses regular copies instead of hard links', async () => {
  const source = await readFile('test/status-loader.test.mjs', 'utf8');
  assert.match(source, /await copyFile\(source, file\)/);
  assert.doesNotMatch(source, /await link\(source, file\)/);
});
