import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  npmScriptsIn,
  findMissingFromGitlab,
  HOST_ONLY_SCRIPTS
} from '../scripts/validate-ci-parity.mjs';

function makeRepo({ github, gitlab }) {
  const root = mkdtempSync(path.join(tmpdir(), 'ci-parity-'));
  mkdirSync(path.join(root, '.github/workflows'), { recursive: true });
  writeFileSync(path.join(root, '.github/workflows/validate-contracts.yml'), github);
  writeFileSync(path.join(root, '.gitlab-ci.yml'), gitlab);
  return root;
}

const GH = `name: v
jobs:
  validate:
    steps:
      - run: npm test
      - run: npm run validate:contracts
      - run: npm run validate:dispatch-receipts
      - run: npm run adr:audit
`;

test('npmScriptsIn extracts every npm run invocation from a CI file', () => {
  const root = makeRepo({ github: GH, gitlab: 'script:\n  - npm run validate:contracts\n' });
  try {
    const scripts = npmScriptsIn(path.join(root, '.github/workflows/validate-contracts.yml'));
    assert.deepEqual(
      [...scripts].sort(),
      ['adr:audit', 'validate:contracts', 'validate:dispatch-receipts']
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('findMissingFromGitlab reports a validator GitHub runs and GitLab does not', () => {
  const root = makeRepo({
    github: GH,
    gitlab: 'validate:\n  script:\n    - npm run validate:contracts\n    - npm run adr:audit\n'
  });
  try {
    assert.deepEqual(findMissingFromGitlab(root), ['validate:dispatch-receipts']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('findMissingFromGitlab reports nothing when GitLab runs everything GitHub does', () => {
  const root = makeRepo({
    github: GH,
    gitlab:
      'a:\n  script:\n    - npm run validate:contracts\n' +
      'b:\n  script:\n    - npm run validate:dispatch-receipts\n' +
      'c:\n  script:\n    - npm run adr:audit\n'
  });
  try {
    assert.deepEqual(findMissingFromGitlab(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a script may be excluded from parity only by naming it in the exemption list', () => {
  const root = makeRepo({
    github: GH,
    gitlab: 'validate:\n  script:\n    - npm run validate:contracts\n    - npm run adr:audit\n'
  });
  try {
    assert.deepEqual(
      findMissingFromGitlab(root, { hostOnly: ['validate:dispatch-receipts'] }),
      [],
      'an explicitly exempted script must not be reported'
    );
    assert.deepEqual(
      findMissingFromGitlab(root, { hostOnly: [] }),
      ['validate:dispatch-receipts'],
      'clearing the exemption list must surface it again, so an exemption is a decision and not a default'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the exemption list is empty, so every portable validator must run on both hosts', () => {
  assert.deepEqual(
    HOST_ONLY_SCRIPTS,
    [],
    'adding an entry here is a deliberate asymmetry and must carry a recorded reason'
  );
});

test('this repository runs the same portable validators on GitHub and GitLab', () => {
  assert.deepEqual(
    findMissingFromGitlab(process.cwd()),
    [],
    'a validator GitHub enforces but GitLab does not means a GitLab clone is gated more weakly'
  );
});
