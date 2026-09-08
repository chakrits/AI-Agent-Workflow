import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import {
  LABEL_DERIVED_ERRORS,
  WORK_ITEM_CONTRACT,
  extractBodyFromCommand,
  workItemFromGhIssue,
  validateWorkItemShape,
  validatePrReadiness,
  isPrCreateCommand,
  findPrCreateSegment,
  shellCommandSegments,
  isHelpInvocation,
  CLOSEOUT_UNVERIFIABLE_ERRORS,
  CLOSEOUT_FILE_ERROR,
  advancesOnlyIssues,
  stripCodeSpans,
  classifyIssueFetchFailure
} from '../scripts/validate-pr-readiness.mjs';
import { validateReadiness } from '../scripts/work-item-readiness.mjs';
import { buildReadinessCheck } from '../scripts/work-item-readiness-check.mjs';
import { execFileSync } from 'node:child_process';

const repository = { owner: 'chakrits', repo: 'AI-Agent-Workflow' };
const labels = [
  'phase:verification',
  'status:spec-ready',
  'status:development-done',
  'status:verification-done'
];
const workItem = { isPullRequest: false, isSameRepository: true, labels };

function bodyFor({ issue = 236, closes = 236, qa = true, docHeading = true, docMarker = true } = {}) {
  return [
    `Developer: Work Item (Issue) URL: https://github.com/chakrits/AI-Agent-Workflow/issues/${issue}`,
    qa ? 'QA: evidence comment or review URL: https://github.com/chakrits/AI-Agent-Workflow/issues/1#issuecomment-1' : '',
    closes ? `Fixes #${closes}` : '',
    docHeading ? '## Documentation Impact' : '',
    docMarker ? '<!-- documentation-impact: complete -->' : ''
  ].filter(Boolean).join('\n\n');
}

// ---------------------------------------------------------------- AC-03

test('AC-03: a complete PR body draft passes', () => {
  const { errors } = validatePrReadiness({ body: bodyFor(), draft: false, workItem, repository });
  assert.deepEqual(errors, []);
});

test('AC-03: a body missing the Work Item Issue URL is refused', () => {
  const { errors } = validatePrReadiness({
    body: 'Fixes #236\n\n## Documentation Impact\n<!-- documentation-impact: complete -->',
    draft: false,
    workItem,
    repository
  });
  assert.ok(errors.includes('Work Item (Issue) URL'), errors.join(', '));
});

test('AC-03: a body missing the QA evidence URL is refused', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ qa: false }), draft: false, workItem, repository });
  assert.ok(errors.includes('QA evidence URL'), errors.join(', '));
});

test('AC-03: a body missing a closing keyword is refused', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ closes: 0 }), draft: false, workItem, repository });
  assert.ok(
    errors.some((e) => e.includes('closing keyword')),
    errors.join(', ')
  );
});

test('AC-03: a closing keyword referencing a different Issue is refused', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ issue: 236, closes: 999 }), draft: false, workItem, repository });
  assert.ok(
    errors.some((e) => e.includes('closing keyword') && e.includes('236')),
    errors.join(', ')
  );
});

test('AC-03: Closes and Resolves are accepted as closing keywords', () => {
  for (const keyword of ['Closes', 'Resolves', 'fixes']) {
    const body = bodyFor({ closes: 0 }) + `\n\n${keyword} #236`;
    const { errors } = validatePrReadiness({ body, draft: false, workItem, repository });
    assert.deepEqual(errors, [], `${keyword} should be accepted`);
  }
});

test('AC-03: the Documentation Impact heading is required, not only the marker', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ docHeading: false }), draft: false, workItem, repository });
  assert.ok(errors.includes('## Documentation Impact section'), errors.join(', '));
});

test('AC-03: the documentation-impact complete marker is required, not only the heading', () => {
  const { errors } = validatePrReadiness({ body: bodyFor({ docMarker: false }), draft: false, workItem, repository });
  assert.ok(
    errors.some((e) => e.includes('documentation-impact: complete')),
    errors.join(', ')
  );
});

// ------------------------------------------- AC-03 decision 1: fail-closed

test('AC-03 decision 1: a gh pr create command with no --body or --body-file fails closed', () => {
  const result = extractBodyFromCommand('gh pr create --title "x" --base main');
  assert.equal(result.body, undefined);
  assert.ok(result.error, 'an unreadable body must produce an error, not an empty pass');
  assert.ok(result.error.includes('--body'), result.error);
  assert.ok(result.error.includes('--body-file'), result.error);
});

test('AC-03 decision 1: --body and --body-file are both readable', () => {
  assert.equal(extractBodyFromCommand('gh pr create --body "hello world"').body, 'hello world');
  assert.equal(extractBodyFromCommand("gh pr create --body 'hi'").body, 'hi');
  assert.equal(extractBodyFromCommand('gh pr create --body-file /tmp/b.md').bodyFile, '/tmp/b.md');
  assert.equal(extractBodyFromCommand('gh pr create -F /tmp/b.md').bodyFile, '/tmp/b.md');
});

test('AC-03 decision 1: only gh pr create commands are gated', () => {
  assert.equal(isPrCreateCommand('gh pr create --body x'), true);
  assert.equal(isPrCreateCommand('  gh   pr   create --body x'), true);
  assert.equal(isPrCreateCommand('gh pr view 236'), false);
  assert.equal(isPrCreateCommand('git push'), false);
  assert.equal(isPrCreateCommand('echo "gh pr create"'), false);
});

// ------------------------------------ AC-03 decision 2: degrade, not fail

test('AC-03 decision 2: offline still enforces every body-only rule', () => {
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor({ qa: false, closes: 0 }),
    draft: false,
    workItem: undefined,
    repository,
    offline: true
  });
  assert.ok(errors.includes('QA evidence URL'), errors.join(', '));
  assert.ok(errors.some((e) => e.includes('closing keyword')), errors.join(', '));
  assert.ok(warnings.some((w) => w.includes('label')), warnings.join(', '));
});

test('AC-03 decision 2: offline passes a body-complete draft and warns about unverified labels', () => {
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor(),
    draft: false,
    workItem: undefined,
    repository,
    offline: true
  });
  assert.deepEqual(errors, []);
  assert.ok(warnings.length > 0, 'offline mode must name what it did not verify');
});

test('AC-03 decision 2: offline never suppresses a missing Work Item Issue URL', () => {
  const { errors } = validatePrReadiness({ body: 'nothing here', draft: false, workItem: undefined, repository, offline: true });
  assert.ok(errors.includes('Work Item (Issue) URL'), errors.join(', '));
});

test('AC-03 decision 2: the label-derived error strings are exactly those work-item-readiness.mjs emits', () => {
  const emitted = validateReadiness({
    body: '',
    draft: false,
    workItem: { isPullRequest: false, isSameRepository: true, labels: [] }
  });
  for (const error of emitted) {
    if (error === 'QA evidence URL') continue;
    assert.ok(
      LABEL_DERIVED_ERRORS.includes(error),
      `"${error}" is emitted by validateReadiness but is not classified in LABEL_DERIVED_ERRORS; ` +
        'offline mode would report it as a body failure it cannot actually check'
    );
  }
  assert.ok(LABEL_DERIVED_ERRORS.includes('valid same-repository Issue'));
});

// ------------------------------------ AC-03 decision 3: GitHub-only scope

test('AC-03 decision 3: the validator declares GitHub-only support', () => {
  assert.equal(WORK_ITEM_CONTRACT.host, 'github.com');
  assert.ok(WORK_ITEM_CONTRACT.limitation.toLowerCase().includes('github'));
});

// ---------------------------------------------------------------- AC-05

test('AC-05: the documented workItem input contract names its required fields', () => {
  assert.deepEqual(
    [...WORK_ITEM_CONTRACT.requiredFields].sort(),
    ['isPullRequest', 'isSameRepository', 'labels']
  );
});

test('AC-05: the octokit-derived producer satisfies the contract', () => {
  // Shape produced by .github/workflows/work-item-readiness-refresh.yml via octokit.
  const octokitIssue = { pull_request: undefined, labels: [{ name: 'phase:verification' }, 'status:spec-ready'] };
  const produced = {
    isPullRequest: Boolean(octokitIssue.pull_request),
    isSameRepository: true,
    labels: (octokitIssue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name))
  };
  assert.deepEqual(validateWorkItemShape(produced), []);
  assert.deepEqual(produced.labels, ['phase:verification', 'status:spec-ready']);
});

test('AC-05: the gh-derived producer satisfies the same contract', () => {
  // Shape produced by `gh issue view N --json labels,url` locally.
  const ghIssue = { url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/236', labels: [{ name: 'phase:verification' }] };
  const produced = workItemFromGhIssue(ghIssue, repository);
  assert.deepEqual(validateWorkItemShape(produced), []);
  assert.deepEqual(produced.labels, ['phase:verification']);
  assert.equal(produced.isPullRequest, false);
  assert.equal(produced.isSameRepository, true);
});

test('AC-05: both producers yield an equally-valid input for validateReadiness', () => {
  const gh = workItemFromGhIssue({ url: 'https://github.com/chakrits/AI-Agent-Workflow/issues/236', labels: labels.map((name) => ({ name })) }, repository);
  const octokit = { isPullRequest: false, isSameRepository: true, labels };
  const body = bodyFor();
  assert.deepEqual(validateReadiness({ body, draft: false, workItem: gh }), validateReadiness({ body, draft: false, workItem: octokit }));
});

test('AC-05: a gh issue in another repository is not marked same-repository', () => {
  const produced = workItemFromGhIssue({ url: 'https://github.com/other/repo/issues/1', labels: [] }, repository);
  assert.equal(produced.isSameRepository, false);
});

test('AC-05: a producer omitting a required field is reported, not silently accepted', () => {
  assert.ok(validateWorkItemShape({ isPullRequest: false, isSameRepository: true }).length);
  assert.ok(validateWorkItemShape({ labels: [], isSameRepository: true }).length);
  assert.ok(validateWorkItemShape(undefined).length);
  assert.ok(validateWorkItemShape({ isPullRequest: false, isSameRepository: true, labels: 'nope' }).length);
});

// ------------------------------------------ post-merge closeout PR handling

const closeoutBody = [
  '<!-- post-merge-closeout: complete; source-pr-241 -->',
  '<!-- documentation-impact: complete -->',
  'Developer: Work Item (Issue) URL: https://github.com/chakrits/AI-Agent-Workflow/issues/240',
  'QA: evidence comment or review URL: https://github.com/chakrits/AI-Agent-Workflow/issues/237#issuecomment-5581618794',
  '## Documentation Impact',
  'PROJECT_STATUS.md and TASK_LOG.md updated.'
].join('\n\n');

test('closeout: a real post-merge closeout PR body is not refused locally', () => {
  // Body shape of merged PR #242. Its two readiness rules — the source PR's label
  // and the authorized-file list — are not checkable from the body, and closeout
  // PRs carry no closing keyword by design. Refusing them would rebuild the
  // failure mode that got AC-10 withdrawn, at a different hook point.
  const { errors, warnings } = validatePrReadiness({
    body: closeoutBody,
    draft: false,
    workItem: undefined,
    changedFiles: [],
    repository,
    offline: true
  });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.toLowerCase().includes('closeout')), warnings.join(', '));
});

test('closeout: the Documentation Impact rules still apply to a closeout PR', () => {
  const { errors } = validatePrReadiness({
    body: closeoutBody.replace('## Documentation Impact\n', ''),
    draft: false,
    repository,
    offline: true
  });
  assert.ok(errors.includes('## Documentation Impact section'), errors.join(', '));
});

test('closeout: a closeout PR still needs its Work Item Issue URL', () => {
  const { errors } = validatePrReadiness({
    body: closeoutBody.replace(/Developer: Work Item .*\n/, ''),
    draft: false,
    repository,
    offline: true
  });
  assert.ok(errors.includes('Work Item (Issue) URL'), errors.join(', '));
});

// ------------------------------------------------- degraded-mode diagnosis

test('degraded mode names the real cause when there is no Issue to look up', () => {
  const { warnings } = validatePrReadiness({ body: 'no traceability', draft: false, repository, offline: true });
  const text = warnings.join(' ');
  assert.ok(!/network and auth/i.test(text), `must not blame the network when no Issue was linked: ${text}`);
  assert.ok(/not a network failure/i.test(text), text);
  assert.ok(/Work Item \(Issue\) URL/.test(text), 'must name the real cause');
});

test('degraded mode blames network/auth only when an Issue was linked but unfetchable', () => {
  const { warnings } = validatePrReadiness({ body: bodyFor(), draft: false, workItem: undefined, repository, offline: true });
  assert.ok(/network|auth/i.test(warnings.join(' ')), warnings.join(' '));
});

// ------------------------------------ unexpanded shell substitution guard

test('an unexpanded shell substitution in --body is diagnosed, not misreported', () => {
  const result = extractBodyFromCommand('gh pr create --body "$(cat body.md)"');
  assert.ok(result.error, 'must refuse rather than validate the literal $(cat body.md)');
  assert.ok(/substitution|--body-file/.test(result.error), result.error);
});

test('--body-file - (stdin) is diagnosed rather than read as a path', () => {
  const result = extractBodyFromCommand('gh pr create --body-file -');
  assert.ok(result.error, result.error);
});

// ----------------------------------------------- AC-04 hook cwd anchoring

test('AC-04: the PreToolUse hook anchors to the project directory', () => {
  const settings = JSON.parse(readFileSync(path.join(repoRoot, '.claude', 'settings.json'), 'utf8'));
  const command = settings.hooks.PreToolUse.flatMap((e) => e.hooks).map((h) => h.command).join(' ');
  assert.ok(
    command.includes('CLAUDE_PROJECT_DIR'),
    'npm run resolves package.json from cwd, and a PreToolUse hook is not guaranteed to run at ' +
      'the repo root; without an anchor the gate silently produces no output, which allows the tool call'
  );
});

// ============================================ Finding 7 (Blocker) — hook scope
//
// `isPrCreateCommand` must distinguish the command a shell would EXECUTE from
// text that merely appears inside one. The previous regex allowed `\s` to match
// a newline, so any command text containing a separator followed by the create
// verb — notably heredoc CONTENT — was refused. That blocked the QA report that
// found it.

const CREATE = ['gh', 'pr', 'create'].join(' ');

test('Finding 7: the create verb inside a quoted string is not an invocation', () => {
  assert.equal(isPrCreateCommand(`echo "harmless; ${CREATE} in a doc"`), false);
  assert.equal(isPrCreateCommand(`echo 'x | ${CREATE}'`), false);
});

test('Finding 7: a heredoc whose body contains a markdown table and the create verb is allowed', () => {
  // Parent-reproduced case 1: table rows end in `|`, the verb appears on a later line.
  const command = ['cat <<EOF > report.md', '| Command | Result |', '|---|---|', `| \`x\` | ok |`, `${CREATE} --help`, 'EOF', ''].join('\n');
  assert.equal(isPrCreateCommand(command), false, 'heredoc content is data, not a command');
});

test('Finding 7: a heredoc line ending in a pipe followed by the create verb is allowed', () => {
  // Parent-reproduced case 2.
  const command = ['cat <<EOF', 'a row ending in |', CREATE, 'EOF', ''].join('\n');
  assert.equal(isPrCreateCommand(command), false);
});

test('Finding 7: heredoc variants — quoted, tab-stripped and unterminated delimiters', () => {
  assert.equal(isPrCreateCommand(["cat <<'EOF'", `; ${CREATE}`, 'EOF', ''].join('\n')), false);
  assert.equal(isPrCreateCommand(['cat <<-EOF', `; ${CREATE}`, '\tEOF', ''].join('\n')), false);
  assert.equal(isPrCreateCommand(['cat <<EOF', `; ${CREATE}`].join('\n')), false, 'unterminated heredoc must not fall back to scanning its body');
});

test('Finding 7: <<< is a herestring, not a heredoc, and must not swallow the rest', () => {
  assert.equal(isPrCreateCommand(`cat <<<"x; ${CREATE}"`), false, 'quoted herestring content is data');
  assert.equal(isPrCreateCommand(`cat <<<x; ${CREATE} --body b`), true, 'a real invocation after a herestring still gates');
});

test('Finding 7: real invocations in every command position still gate', () => {
  assert.equal(isPrCreateCommand(`${CREATE} --body x`), true);
  assert.equal(isPrCreateCommand(`echo done | ${CREATE}`), true);
  assert.equal(isPrCreateCommand(`true; ${CREATE} --body-file b.md`), true);
  assert.equal(isPrCreateCommand(`true && ${CREATE} --body x`), true);
  assert.equal(isPrCreateCommand(`echo $(${CREATE} --body x)`), true, 'command substitutions are executed');
  assert.equal(isPrCreateCommand(`GH_TOKEN=x ${CREATE} --body x`), true, 'a leading env assignment is not the command');
  assert.equal(isPrCreateCommand([`${CREATE} --body x`, ''].join('\n')), true);
  // Reserved words are command positions: the verb sits at token 1, not token 0.
  assert.equal(isPrCreateCommand(`if true; then ${CREATE} --body x; fi`), true);
  assert.equal(isPrCreateCommand(`for f in x; do ${CREATE} --body x; done`), true);
  assert.equal(isPrCreateCommand(`! ${CREATE} --body x`), true);
  assert.equal(isPrCreateCommand(`xargs ${CREATE} --body x`), true);
  // A line continuation must not be read as a token between `gh` and `pr`.
  assert.equal(isPrCreateCommand(['gh \\', 'pr create --body x'].join('\n')), true);
});

test('Finding 7: the lexer never throws and fails open on hostile input', () => {
  // This hook runs on EVERY Bash tool call; a throw yields no stdout, which the
  // host reads as a hook execution error on an unrelated command.
  const hostile = [
    'echo "unterminated',
    "echo 'unterminated",
    'cat <<',
    'cat <<-',
    'echo \\',
    'x'.repeat(100000),
    `${'('.repeat(500)}${CREATE}`
  ];
  for (const command of hostile) {
    assert.doesNotThrow(() => isPrCreateCommand(command), command.slice(0, 40));
    assert.doesNotThrow(() => shellCommandSegments(command));
  }
});

test('Finding 7: the matched segment is returned, so flags elsewhere are not read as the invocation\'s', () => {
  const segment = findPrCreateSegment(`echo --body-file decoy.md; ${CREATE} --body-file real.md`);
  assert.ok(segment.startsWith(CREATE), segment);
  assert.equal(extractBodyFromCommand(segment).bodyFile, 'real.md');
});

// -------------------------------------------------- Finding 1 — --help / -h

test('Finding 1: --help and -h are not refused — they create no PR and have no body', () => {
  assert.equal(isHelpInvocation(`${CREATE} --help`), true);
  assert.equal(isHelpInvocation(`${CREATE} -h`), true);
});

test('Finding 1: -H is --head, not help, and a quoted --help is not a help invocation', () => {
  assert.equal(isHelpInvocation(`${CREATE} -H feature-branch --body x`), false);
  assert.equal(isHelpInvocation(`${CREATE} --title "--help" --body x`), false);
});

test('Finding 1: --web, --fill and --template remain refused (decision 1 working as intended)', () => {
  for (const flag of ['--web', '--fill', '--template t.md']) {
    const command = `${CREATE} ${flag}`;
    assert.equal(isHelpInvocation(command), false, flag);
    assert.ok(extractBodyFromCommand(command).error, `${flag} must still fail closed`);
  }
});

// ------------------------------- Finding 2 — the closeout marker is not trusted

test('Finding 2: a fabricated closeout marker on an ordinary PR does not bypass the gate', () => {
  // QA's repro: PR #241's real body, closing keyword removed, marker appended.
  const forged = bodyFor({ closes: 0 }) + '\n\n<!-- post-merge-closeout: complete; source-pr-241 -->';
  const { errors } = validatePrReadiness({
    body: forged,
    draft: false,
    workItem: undefined,
    changedFiles: ['scripts/validate-pr-readiness.mjs'],
    repository,
    offline: true
  });
  assert.ok(errors.includes(CLOSEOUT_FILE_ERROR), `expected the authorized-file rule to fire: ${errors.join(', ')}`);
});

test('Finding 2: the authorized-file rule is skipped only when no local diff is available', () => {
  assert.ok(!CLOSEOUT_UNVERIFIABLE_ERRORS.includes(CLOSEOUT_FILE_ERROR),
    'the file rule is locally derivable and must not be unconditionally skipped');
  const { errors } = validatePrReadiness({
    body: closeoutBody, draft: false, changedFiles: [], repository, offline: true
  });
  assert.deepEqual(errors, [], 'with no changed-file set there is nothing to derive it from');
});

test('Finding 2: a genuine closeout diff still passes', () => {
  const { errors } = validatePrReadiness({
    body: closeoutBody,
    draft: false,
    changedFiles: ['PROJECT_STATUS.md', 'TASK_LOG.md', 'CHANGELOG.md'],
    repository,
    offline: true
  });
  assert.deepEqual(errors, []);
});

test('Finding 2: the closeout warning reports the closing-keyword skip and what was actually checked', () => {
  const checked = validatePrReadiness({
    body: closeoutBody, draft: false, changedFiles: ['PROJECT_STATUS.md'], repository, offline: true
  }).warnings.join(' ');
  assert.ok(/closing[- ]keyword/i.test(checked), `must disclose the skipped closing-keyword rule: ${checked}`);
  assert.ok(/WAS checked/.test(checked), `must not claim the file set went unverified when it was checked: ${checked}`);

  const unchecked = validatePrReadiness({
    body: closeoutBody, draft: false, changedFiles: [], repository, offline: true
  }).warnings.join(' ');
  assert.ok(/NOT verified either/.test(unchecked), unchecked);
});

// ------------------------------ Finding 5 — an unresolvable origin is out of scope

test('Finding 5: an unresolvable origin reports out-of-scope, not a false body defect', () => {
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor(), draft: false, workItem: undefined,
    repository: undefined, repositoryResolved: false, offline: true
  });
  assert.ok(!errors.includes('Work Item (Issue) URL'),
    `the body contains the URL; blaming it is the misdiagnosis class of Finding 5: ${errors.join(', ')}`);
  const text = warnings.join(' ');
  assert.ok(/out of scope/i.test(text), text);
  assert.ok(/origin/.test(text) && /github\.com/.test(text), text);
  assert.ok(/ssh host alias/i.test(text),
    'origin may be an SSH alias for a GitHub repo, so the message must not assert "not GitHub"');
});

test('Finding 5: the out-of-scope reason is stated even when not running offline', () => {
  // Suppressing the Issue-linkage rule without saying why would be a gate that
  // silently passes when it cannot see its input.
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor(), draft: false, workItem,
    repository: undefined, repositoryResolved: false, offline: false
  });
  assert.ok(!errors.includes('Work Item (Issue) URL'), errors.join(', '));
  assert.ok(/out of scope/i.test(warnings.join(' ')),
    'the suppression must never be silent');
});

test('Finding 5: a resolvable origin still reports a genuinely missing Work Item URL', () => {
  const { errors } = validatePrReadiness({
    body: 'nothing here', draft: false, repository, repositoryResolved: true, offline: true
  });
  assert.ok(errors.includes('Work Item (Issue) URL'), errors.join(', '));
});

// ---------------- Finding 3 — AC-05 tests the real CI producer, not a copy of it

const ciPull = {
  head: { sha: 'deadbeef' },
  draft: false,
  body: bodyFor()
};

test('AC-05/Finding 3: the real buildReadinessCheck() is exercised, not a hand-written copy', () => {
  const check = buildReadinessCheck({
    pull: ciPull,
    issue: { pull_request: undefined, labels: labels.map((name) => ({ name })) },
    repository,
    changedFiles: []
  });
  assert.equal(check.conclusion, 'success', check.summary);
  assert.equal(check.title, 'Work item readiness is current');
});

test('AC-05/Finding 3: buildReadinessCheck() flattens octokit label objects per the contract', () => {
  const check = buildReadinessCheck({
    pull: ciPull,
    issue: { pull_request: undefined, labels: [{ name: 'phase:verification' }, { name: 'status:spec-ready' }] },
    repository,
    changedFiles: []
  });
  // Only the two labels above are present, so the two missing status labels must
  // be named — which is only possible if the {name} objects were flattened.
  assert.match(check.summary, /status:development-done/);
  assert.match(check.summary, /status:verification-done/);
});

test('AC-05/Finding 3: buildReadinessCheck() reports isPullRequest per the contract', () => {
  const check = buildReadinessCheck({
    pull: ciPull,
    issue: { pull_request: { url: 'x' }, labels: labels.map((name) => ({ name })) },
    repository,
    changedFiles: []
  });
  assert.match(check.summary, /valid same-repository Issue/);
});

test('AC-05/Finding 3: the two producers diverge on isSameRepository, and the contract says so', () => {
  // The divergence is NOT reachable through a cross-repository body URL: both
  // paths call the same repo-scoped findLinkedIssueNumber and both would return
  // undefined. It is only observable when the Issue OBJECT's url disagrees with
  // the pull request's repository while the body URL still resolves.
  const foreignIssue = {
    pull_request: undefined,
    url: 'https://github.com/other/repo/issues/236',
    labels: labels.map((name) => ({ name }))
  };
  const check = buildReadinessCheck({ pull: ciPull, issue: foreignIssue, repository, changedFiles: [] });
  assert.equal(check.conclusion, 'success',
    'CI hardcodes isSameRepository: true, so the same-repository rule is unreachable there');

  assert.equal(workItemFromGhIssue(foreignIssue, repository).isSameRepository, false,
    'the local producer derives it from the url, so it disagrees on the same input');

  assert.ok(WORK_ITEM_CONTRACT.divergences?.isSameRepository,
    'a field the two producers do not agree on must be stated in the contract, not hidden');
  assert.match(WORK_ITEM_CONTRACT.divergences.isSameRepository, /hardcodes true/);
});

// ---------------------------- Finding 6 — the three mutation survivors (M10/M14/M19)

test('M14: validateWorkItemShape rejects a non-boolean isSameRepository', () => {
  const errors = validateWorkItemShape({ isPullRequest: false, isSameRepository: 'yes', labels: [] });
  assert.deepEqual(errors, ['workItem.isSameRepository must be a boolean']);
  assert.deepEqual(validateWorkItemShape({ isPullRequest: false, labels: [] }),
    ['workItem.isSameRepository must be a boolean']);
});

test('M10: LABEL_DERIVED_ERRORS carries no entry validateReadiness cannot emit', () => {
  // The forward direction (emitted is a subset of the list) is pinned above. This
  // is the reverse: a stale entry left after a rename would silently suppress a
  // real body error offline. Kept separate because the plan-only branch also
  // emits a changed-file-derived error that is correctly absent from the list.
  const emitted = new Set([
    ...validateReadiness({ body: '', draft: false, workItem: { isPullRequest: true, isSameRepository: true, labels: [] } }),
    ...validateReadiness({ body: '', draft: false, workItem: { isPullRequest: false, isSameRepository: true, labels: [] } }),
    ...validateReadiness({
      body: '<!-- plan-only: true -->',
      draft: false,
      workItem: { isPullRequest: false, isSameRepository: true, labels: ['phase:verification', 'status:development-done'] }
    }),
    ...validateReadiness({
      body: '<!-- post-merge-closeout: complete; source-pr-1 -->',
      draft: false,
      workItem: { isPullRequest: false, isSameRepository: true, labels: [] }
    })
  ]);
  for (const error of LABEL_DERIVED_ERRORS) {
    assert.ok(emitted.has(error),
      `"${error}" is classified as label-derived but validateReadiness never emits it; a stale ` +
        'entry silently suppresses a real body error in offline mode');
  }
});

test('M19: the offline warning names each skipped check individually', () => {
  const { warnings } = validatePrReadiness({
    body: bodyFor(), draft: false, workItem: undefined, repository, offline: true
  });
  const text = warnings.join(' ');
  for (const skipped of LABEL_DERIVED_ERRORS) {
    assert.ok(text.includes(skipped),
      `decision 2 requires the warning to name what went unverified; "${skipped}" is missing from: ${text}`);
  }
});

// ------------------- Finding 4 — the two callers agree on an unreadable PR_BODY_FILE

function runValidator(env) {
  try {
    execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'validate-pr-readiness.mjs')], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, PR_READINESS_OFFLINE: '1', ...env }
    });
    return 0;
  } catch (error) {
    return error.status;
  }
}

test('Finding 4: a named-but-unreadable PR_BODY_FILE refuses instead of failing open', () => {
  // .githooks/pre-push propagates this exit code, so exit 0 here told an author
  // who typoed the path that their draft was checked when it was not — while
  // runHookMode() denied on the identical condition.
  assert.equal(runValidator({ PR_BODY_FILE: path.join(repoRoot, 'no-such-draft-9c1f.md') }), 1);
});

test('Finding 4: an unset PR_BODY_FILE never refuses — no PR body is in play', () => {
  // A fail-closed push gate would rebuild the failure mode ADR-0022 withdrew.
  const env = { ...process.env };
  delete env.PR_BODY_FILE;
  const status = (() => {
    try {
      execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'validate-pr-readiness.mjs')], {
        cwd: repoRoot, encoding: 'utf8', stdio: 'pipe', env: { ...env, PR_READINESS_OFFLINE: '1' }
      });
      return 0;
    } catch (error) {
      return error.status;
    }
  })();
  assert.equal(status, 0);
});

// ------------------------------------------ partial-progress PRs (decision 2026-09-08)

const ADVANCES_ONLY = '<!-- advances-only: issue-236 -->';

test('advances-only: a body declaring partial progress passes without a closing keyword', () => {
  const { errors } = validatePrReadiness({
    body: `${bodyFor({ closes: 0 })}\n\n${ADVANCES_ONLY}`,
    workItem,
    repository
  });
  assert.deepEqual(errors, []);
});

test('advances-only: the same body without the marker is still refused', () => {
  // The #224 protection: you cannot *forget* a closing keyword, only declare its absence.
  const { errors } = validatePrReadiness({ body: bodyFor({ closes: 0 }), workItem, repository });
  assert.ok(
    errors.some((e) => e.startsWith('closing keyword referencing the linked Issue #236')),
    errors.join(', ')
  );
});

test('advances-only: a marker naming a different Issue is refused, not honoured', () => {
  // The marker cannot be copy-pasted between Issues without being wrong; if it were
  // inert-but-silent it would be the blanket escape hatch the decision rejects.
  const { errors } = validatePrReadiness({
    body: `${bodyFor({ closes: 0 })}\n\n<!-- advances-only: issue-212 -->`,
    workItem,
    repository
  });
  assert.ok(
    errors.some((e) => e.includes('advances-only marker naming the linked Issue #236')),
    errors.join(', ')
  );
  // and the suppressed rule comes back, so a wrong marker is strictly worse than none
  assert.ok(
    errors.some((e) => e.startsWith('closing keyword referencing the linked Issue #236')),
    errors.join(', ')
  );
});

test('advances-only: a second marker naming another Issue cannot ride along with a correct one', () => {
  const { errors } = validatePrReadiness({
    body: `${bodyFor({ closes: 0 })}\n\n${ADVANCES_ONLY}\n<!-- advances-only: issue-999 -->`,
    workItem,
    repository
  });
  assert.ok(
    errors.some((e) => e.includes('advances-only marker naming the linked Issue #236')),
    errors.join(', ')
  );
});

test('B1: the marker does NOT suppress a wrong-Issue closing keyword (decision 2026-09-08)', () => {
  // Inverted from the assertion this test carried before cycle 3. The Human
  // Maintainer confirmed the old behaviour a defect: merging that body closes
  // #999 while the tool's own warning says the PR closes nothing. The marker
  // waives the requirement that a keyword be *present*, not the requirement that
  // a keyword present point at the linked Issue.
  const { errors, warnings } = validatePrReadiness({
    body: `${bodyFor({ closes: 999 })}\n\n${ADVANCES_ONLY}`,
    workItem,
    repository
  });
  assert.ok(
    errors.some((e) => e.startsWith('closing keyword referencing the linked Issue #236')),
    errors.join(', ')
  );
  // and the warning must not claim the PR closes nothing while a keyword stands
  assert.ok(
    !warnings.some((w) => w.includes('advances that Issue without closing it')),
    warnings.join(' | ')
  );
});

test('B1: the marker still coexists with a CORRECT closing keyword, which is not an error', () => {
  // The over-correction of B1 would be "a marker beside any keyword is refused".
  // The decision does not ask for that, so it is pinned against.
  const { errors } = validatePrReadiness({
    body: `${bodyFor({ closes: 236 })}\n\n${ADVANCES_ONLY}`,
    workItem,
    repository
  });
  assert.deepEqual(errors, []);
});

test('advances-only: every other body rule still applies', () => {
  const missingQa = validatePrReadiness({
    body: `${bodyFor({ closes: 0, qa: false })}\n\n${ADVANCES_ONLY}`,
    workItem,
    repository
  }).errors;
  assert.ok(missingQa.length, 'a missing QA evidence URL must still be refused');

  const noHeading = validatePrReadiness({
    body: `${bodyFor({ closes: 0, docHeading: false })}\n\n${ADVANCES_ONLY}`,
    workItem,
    repository
  }).errors;
  assert.ok(noHeading.includes('## Documentation Impact section'), noHeading.join(', '));

  const noMarker = validatePrReadiness({
    body: `${bodyFor({ closes: 0, docMarker: false })}\n\n${ADVANCES_ONLY}`,
    workItem,
    repository
  }).errors;
  assert.ok(noMarker.includes('<!-- documentation-impact: complete --> marker'), noMarker.join(', '));

  const noIssueUrl = validatePrReadiness({
    body: `## Documentation Impact\n<!-- documentation-impact: complete -->\n${ADVANCES_ONLY}`,
    workItem,
    repository
  }).errors;
  assert.ok(noIssueUrl.includes('Work Item (Issue) URL'), noIssueUrl.join(', '));
});

test('advances-only: it filters no label-derived error when the Issue is fetchable', () => {
  const notReady = { isPullRequest: false, isSameRepository: true, labels: ['phase:development'] };
  const { errors } = validatePrReadiness({
    body: `${bodyFor({ closes: 0 })}\n\n${ADVANCES_ONLY}`,
    workItem: notReady,
    repository
  });
  assert.ok(
    errors.some((e) => LABEL_DERIVED_ERRORS.includes(e)),
    `label rules must survive the marker: ${errors.join(', ')}`
  );
});

test('advances-only: the warning states what was suppressed rather than passing silently', () => {
  const { warnings } = validatePrReadiness({
    body: `${bodyFor({ closes: 0 })}\n\n${ADVANCES_ONLY}`,
    workItem,
    repository
  });
  assert.ok(warnings.some((w) => w.includes('advances-only')), warnings.join(' | '));
  assert.ok(warnings.some((w) => w.includes('#236')), warnings.join(' | '));
});

test('advances-only: it does not weaken the closeout path, which stays a separate class', () => {
  const closeoutBody = [
    'Developer: Work Item (Issue) URL: https://github.com/chakrits/AI-Agent-Workflow/issues/236',
    '<!-- post-merge-closeout: complete; source-pr-1 -->',
    ADVANCES_ONLY,
    '## Documentation Impact',
    '<!-- documentation-impact: complete -->'
  ].join('\n\n');
  // an ordinary diff under a closeout marker is still refused: the authorized-file rule holds
  const { errors } = validatePrReadiness({
    body: closeoutBody,
    workItem,
    repository,
    changedFiles: ['README.md']
  });
  assert.ok(errors.includes(CLOSEOUT_FILE_ERROR), errors.join(', '));
  // and the Documentation Impact rules still apply under both markers
  const noDocs = validatePrReadiness({
    body: closeoutBody.replace('## Documentation Impact\n\n', ''),
    workItem,
    repository,
    changedFiles: ['PROJECT_STATUS.md']
  }).errors;
  assert.ok(noDocs.includes('## Documentation Impact section'), noDocs.join(', '));
});

test('advances-only: advancesOnlyIssues() is the single parser both the gate and the docs pin', () => {
  assert.deepEqual(advancesOnlyIssues(ADVANCES_ONLY), [236]);
  assert.deepEqual(advancesOnlyIssues('<!--advances-only:issue-236-->'), [236]);
  assert.deepEqual(advancesOnlyIssues('no marker here'), []);
  assert.deepEqual(advancesOnlyIssues('<!-- advances-only: 236 -->'), []);
  assert.deepEqual(advancesOnlyIssues('advances-only: issue-236'), []);
  // the exported parser must be re-runnable: a shared global regex would drop the second call
  assert.deepEqual(advancesOnlyIssues(ADVANCES_ONLY), [236]);
});

test('M1: a marker inside a fenced code block does not waive the closing-keyword rule', () => {
  // README.md documents this syntax, so a PR body that *explains* the marker is a
  // realistic input. The silent direction is the consequential one: prose must not
  // quietly disable the #224 protection.
  const { errors } = validatePrReadiness({
    body: `${bodyFor({ closes: 0 })}\n\n\`\`\`\n${ADVANCES_ONLY}\n\`\`\`\n`,
    workItem,
    repository
  });
  assert.ok(
    errors.some((e) => e.startsWith('closing keyword referencing the linked Issue #236')),
    errors.join(', ')
  );
});

test('M1: a wrong-Issue marker inside a fence or backticks is not a hard error on prose', () => {
  const fenced = validatePrReadiness({
    body: `${bodyFor()}\n\n\`\`\`\n<!-- advances-only: issue-999 -->\n\`\`\`\n`,
    workItem,
    repository
  }).errors;
  assert.deepEqual(fenced, []);

  const inline = validatePrReadiness({
    body: `${bodyFor()}\n\nUse \`<!-- advances-only: issue-999 -->\` to declare partial progress.`,
    workItem,
    repository
  }).errors;
  assert.deepEqual(inline, []);
});

test('M1: a fenced closing keyword does not satisfy the closing-keyword rule either', () => {
  // Both scans read the same scrubbed body, so the awareness cannot drift apart.
  const { errors } = validatePrReadiness({
    body: `${bodyFor({ closes: 0 })}\n\n\`\`\`\nFixes #236\n\`\`\`\n`,
    workItem,
    repository
  });
  assert.ok(
    errors.some((e) => e.startsWith('closing keyword referencing the linked Issue #236')),
    errors.join(', ')
  );
});

test('M1: stripCodeSpans removes fenced blocks and inline spans, and nothing else', () => {
  assert.equal(stripCodeSpans('a\n```\nsecret\n```\nb').includes('secret'), false);
  assert.equal(stripCodeSpans('a\n~~~\nsecret\n~~~\nb').includes('secret'), false);
  assert.equal(stripCodeSpans('a `secret` b').includes('secret'), false);
  assert.equal(stripCodeSpans('a ``x `secret` y`` b').includes('secret'), false);
  assert.ok(stripCodeSpans('a\n```\nx\n```\nkeep me').includes('keep me'));
  assert.ok(stripCodeSpans('plain text').includes('plain text'));
  // an unterminated fence swallows the rest of the body — stated, not accidental
  assert.equal(stripCodeSpans('a\n```\ntail').includes('tail'), false);
});

test('M3: a marker with no resolvable linked Issue is inert — the rule is NOT suppressed', () => {
  const { errors } = validatePrReadiness({
    body: `QA: evidence comment or review URL: https://github.com/chakrits/AI-Agent-Workflow/issues/1#issuecomment-1\n\n## Documentation Impact\n\n<!-- documentation-impact: complete -->\n\n${ADVANCES_ONLY}`,
    workItem,
    repository,
    repositoryResolved: true
  });
  assert.ok(errors.includes('Work Item (Issue) URL'), errors.join(', '));
  assert.ok(
    errors.some((e) => e.startsWith('closing keyword referencing the linked Issue')),
    errors.join(', ')
  );
});

test('M4: a marker with no resolvable linked Issue is silent — no #undefined error', () => {
  const { errors } = validatePrReadiness({
    body: `QA: evidence comment or review URL: https://github.com/chakrits/AI-Agent-Workflow/issues/1#issuecomment-1\n\n## Documentation Impact\n\n<!-- documentation-impact: complete -->\n\n${ADVANCES_ONLY}`,
    workItem,
    repository,
    repositoryResolved: true
  });
  assert.ok(!errors.some((e) => e.includes('advances-only marker naming')), errors.join(', '));
  assert.ok(!errors.some((e) => e.includes('undefined')), errors.join(', '));
});

test('M8: the marker is case-insensitive', () => {
  assert.deepEqual(advancesOnlyIssues('<!-- ADVANCES-ONLY: ISSUE-236 -->'), [236]);
  assert.deepEqual(advancesOnlyIssues('<!-- Advances-Only: Issue-236 -->'), [236]);
});

test('M2: a linked Issue that does not exist is a body defect, not a network failure', () => {
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor({ issue: 999999, closes: 999999 }),
    workItem: undefined,
    repository,
    offline: true,
    issueResolution: 'not-found'
  });
  assert.ok(
    errors.some((e) => e.includes('#999999') && e.includes('not found')),
    errors.join(', ')
  );
  // the misdiagnosis M2 filed: it must NOT blame network and auth
  assert.ok(
    !warnings.some((w) => w.includes('network and auth, which were unavailable')),
    warnings.join(' | ')
  );
});

test('M2: an unreachable host still degrades rather than claiming the Issue is absent', () => {
  const { errors, warnings } = validatePrReadiness({
    body: bodyFor(), workItem: undefined, repository, offline: true, issueResolution: 'unreachable'
  });
  assert.deepEqual(errors, []);
  assert.ok(
    warnings.some((w) => w.includes('network and auth, which were unavailable')),
    warnings.join(' | ')
  );
});

test('M2: classifyIssueFetchFailure separates a 404 from an unreachable host', () => {
  // The literal stderr `gh issue view 999999` printed against this repository.
  assert.equal(
    classifyIssueFetchFailure(
      'GraphQL: Could not resolve to an issue or pull request with the number of 999999. (repository.issue)'
    ),
    'not-found'
  );
  assert.equal(classifyIssueFetchFailure('HTTP 404: Not Found'), 'not-found');
  // everything else must stay in the degraded lane — fail open, not "does not exist"
  assert.equal(classifyIssueFetchFailure('dial tcp: lookup api.github.com: no such host'), 'unreachable');
  assert.equal(classifyIssueFetchFailure('gh: authentication required'), 'unreachable');
  assert.equal(classifyIssueFetchFailure('context deadline exceeded'), 'unreachable');
  assert.equal(classifyIssueFetchFailure(''), 'unreachable');
});


// ------------------------------------------------------ N1: runHookMode() coverage

function runHook(command, { toolName = 'Bash', input, env = {} } = {}) {
  const payload = input ?? JSON.stringify({ tool_name: toolName, tool_input: { command } });
  const stdout = execFileSync(
    process.execPath,
    [path.join(repoRoot, 'scripts', 'validate-pr-readiness.mjs'), '--hook'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      input: payload,
      stdio: 'pipe',
      env: { ...process.env, PR_READINESS_OFFLINE: '1', ...env }
    }
  );
  return JSON.parse(stdout);
}

function hookDecision(output) {
  return output?.hookSpecificOutput?.permissionDecision;
}

const hookBody = (extra = '', { qa = true } = {}) => [
  'Developer: Work Item (Issue) URL: https://github.com/chakrits/AI-Agent-Workflow/issues/236',
  qa ? 'QA: evidence comment or review URL: https://github.com/chakrits/AI-Agent-Workflow/issues/1#issuecomment-1' : '',
  extra,
  '## Documentation Impact',
  '<!-- documentation-impact: complete -->'
].filter(Boolean).join('\n\n');

test('N1/AC-04: a non-Bash tool call is allowed untouched', () => {
  assert.deepEqual(runHook('gh pr create --body x', { toolName: 'Read' }), {});
});

test('N1/AC-04: malformed stdin allows rather than breaking the session', () => {
  assert.deepEqual(runHook(undefined, { input: 'not json at all' }), {});
});

test('N1/AC-04: a Bash command that is not a pr create invocation is allowed', () => {
  assert.deepEqual(runHook('git status && npm test'), {});
});

test('N1/AC-04: --help is allowed — it creates no PR and has no body (Finding 1)', () => {
  // Mutant H3 deleted this guard with a green suite before this test existed.
  assert.deepEqual(runHook('gh pr create --help'), {});
  assert.deepEqual(runHook('gh pr create -h'), {});
});

test('N1/AC-04: an invocation with no --body or --body-file is denied with the deny shape', () => {
  const out = runHook('gh pr create --title "x"');
  assert.equal(hookDecision(out), 'deny');
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /neither --body nor --body-file/);
  assert.equal(out.systemMessage, out.hookSpecificOutput.permissionDecisionReason);
});

test('N1/AC-04: an unreadable --body-file is denied, not allowed', () => {
  const out = runHook('gh pr create --body-file /nonexistent-9c1f/body.md');
  assert.equal(hookDecision(out), 'deny');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /could not read --body-file/);
});

test('N1/AC-04: an incomplete --body is denied and names the missing rules', () => {
  const out = runHook('gh pr create --title "t" --body "nothing useful here"');
  assert.equal(hookDecision(out), 'deny');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /Work Item \(Issue\) URL/);
});

test('N1/AC-04: a complete body is allowed, with the degraded-mode warning as systemMessage', () => {
  const out = runHook(`gh pr create --title "t" --body "${hookBody('Fixes #236').replace(/\n/g, '\\n')}"`);
  assert.equal(hookDecision(out), undefined, JSON.stringify(out));
  assert.match(out.systemMessage ?? '', /Degraded mode/);
});

test('N1: the hook honours a correct advances-only marker', () => {
  const out = runHook(
    `gh pr create --title "t" --body "${hookBody(ADVANCES_ONLY).replace(/\n/g, '\\n')}"`
  );
  assert.equal(hookDecision(out), undefined, JSON.stringify(out));
});

test('N1: the hook denies an advances-only marker naming the wrong Issue', () => {
  const out = runHook(
    `gh pr create --title "t" --body "${hookBody('<!-- advances-only: issue-212 -->').replace(/\n/g, '\\n')}"`
  );
  assert.equal(hookDecision(out), 'deny');
  assert.match(
    out.hookSpecificOutput.permissionDecisionReason,
    /advances-only marker naming the linked Issue #236/
  );
});

test('N1/AC-04: a readable --body-file is read and validated — the shape the README recommends', () => {
  const file = path.join(os.tmpdir(), `pr-readiness-hook-${process.pid}.md`);
  writeFileSync(file, hookBody(ADVANCES_ONLY), 'utf8');
  try {
    assert.equal(hookDecision(runHook(`gh pr create --title "t" --body-file ${file}`)), undefined);
    writeFileSync(file, hookBody('<!-- advances-only: issue-212 -->'), 'utf8');
    const out = runHook(`gh pr create --title "t" --body-file ${file}`);
    assert.equal(hookDecision(out), 'deny');
  } finally {
    rmSync(file, { force: true });
  }
});

test('M17: --draft is detected on the hook path — the assertion dies if the detection is removed', () => {
  // The assertion this replaces claimed to pin `--draft` but asserted `deny` on a
  // body that already denied for an unrelated reason, so deleting the detection
  // left it green. `draft` only ever *relaxes* a rule (work-item-readiness.mjs
  // skips the QA evidence URL), so the discriminating body is one that is complete
  // except for QA evidence: it must deny without --draft and allow with it.
  const file = path.join(os.tmpdir(), `pr-readiness-draft-${process.pid}.md`);
  writeFileSync(file, hookBody('Fixes #236', { qa: false }), 'utf8');
  try {
    const withoutDraft = runHook(`gh pr create --title "t" --body-file ${file}`);
    assert.equal(hookDecision(withoutDraft), 'deny', JSON.stringify(withoutDraft));
    assert.match(withoutDraft.hookSpecificOutput.permissionDecisionReason, /QA evidence URL/);

    const withDraft = runHook(`gh pr create --draft --title "t" --body-file ${file}`);
    assert.equal(hookDecision(withDraft), undefined, JSON.stringify(withDraft));
  } finally {
    rmSync(file, { force: true });
  }
});
