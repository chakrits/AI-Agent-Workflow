import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  githubJobCommands,
  findMissingFromGitlab,
  HOST_ONLY_COMMANDS
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

test('githubJobCommands extracts the validate job commands, ignoring npm test', () => {
  const root = makeRepo({ github: GH, gitlab: 'a:\n  script:\n    - npm run validate:contracts\n' });
  try {
    const commands = githubJobCommands(path.join(root, '.github/workflows/validate-contracts.yml'));
    assert.deepEqual(
      [...commands].sort(),
      ['npm run adr:audit', 'npm run validate:contracts', 'npm run validate:dispatch-receipts']
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
    assert.deepEqual(findMissingFromGitlab(root), ['npm run validate:dispatch-receipts']);
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

test('a command may be excluded from parity only by naming it in the exemption list', () => {
  const root = makeRepo({
    github: GH,
    gitlab: 'validate:\n  script:\n    - npm run validate:contracts\n    - npm run adr:audit\n'
  });
  try {
    assert.deepEqual(
      findMissingFromGitlab(root, {
        hostOnly: [{ command: 'npm run validate:dispatch-receipts', reason: 'needs a GitHub App token' }]
      }),
      [],
      'an explicitly exempted command must not be reported'
    );
    assert.deepEqual(
      findMissingFromGitlab(root, { hostOnly: [] }),
      ['npm run validate:dispatch-receipts'],
      'clearing the exemption list must surface it again, so an exemption is a decision and not a default'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the exemption list is empty, so every portable validator must run on both hosts', () => {
  assert.deepEqual(
    HOST_ONLY_COMMANDS,
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

// --- QA findings on the Issue #210 candidate 973180d ---

const GH_JOB = (steps) => `name: v
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
${steps.map((s) => `      - run: ${s}`).join('\n')}
  publish:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:publish-github-only
`;

test('a GitLab job that is only present inside a comment does not count as coverage', () => {
  const root = makeRepo({
    github: GH_JOB(['npm run validate:workflow-evidence']),
    gitlab: 'validate:\n  script:\n    # - npm run validate:workflow-evidence\n    - npm test\n'
  });
  try {
    assert.deepEqual(
      findMissingFromGitlab(root),
      ['npm run validate:workflow-evidence'],
      'commenting out a flaky GitLab job would otherwise silently restore the drift this check exists to prevent'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a validator invoked without npm run is still compared', () => {
  const root = makeRepo({
    github: GH_JOB(['node scripts/validate-new-thing.mjs']),
    gitlab: 'validate:\n  script:\n    - npm test\n'
  });
  try {
    assert.deepEqual(findMissingFromGitlab(root), ['node scripts/validate-new-thing.mjs']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('only the GitHub validate job is compared, not every job in the file', () => {
  const root = makeRepo({
    github: GH_JOB(['npm run validate:contracts']),
    gitlab: 'validate:\n  script:\n    - npm run validate:contracts\n'
  });
  try {
    assert.deepEqual(
      findMissingFromGitlab(root),
      [],
      'a GitHub-only publish job must not be demanded of GitLab'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an exemption must carry a reason and name a command GitHub actually runs', () => {
  const root = makeRepo({
    github: GH_JOB(['npm run validate:workflow-evidence']),
    gitlab: 'validate:\n  script:\n    - npm test\n'
  });
  try {
    assert.deepEqual(
      findMissingFromGitlab(root, {
        hostOnly: [{ command: 'npm run validate:workflow-evidence', reason: 'needs a GitHub App token' }]
      }),
      []
    );
    assert.throws(
      () => findMissingFromGitlab(root, { hostOnly: [{ command: 'npm run validate:workflow-evidence' }] }),
      /reason/i,
      'an exemption without a reason is an oversight wearing the costume of a decision'
    );
    assert.throws(
      () => findMissingFromGitlab(root, { hostOnly: [{ command: 'npm run not-run-anywhere', reason: 'x' }] }),
      /not run by the GitHub validate job/i,
      'a stale exemption must be reported rather than sitting inert'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
