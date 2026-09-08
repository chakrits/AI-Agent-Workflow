/**
 * Local pre-flight for a pull request body draft (Issue #236, AC-03/AC-04/AC-05).
 *
 * Per ADR-0022 the rule lives here, in one script behind one npm script. Both
 * `.githooks/pre-push` and `.claude/settings.json` are thin callers of it, so
 * `.claude/settings.json` invokes a rule `.githooks/` already enforces and can
 * never be the origin of one.
 *
 * `validateReadiness()` is imported, never re-implemented (AC-03), and
 * `findLinkedIssueNumber()` is imported unmodified (AC-03 decision 3).
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateReadiness } from './work-item-readiness.mjs';
import { findLinkedIssueNumber } from './work-item-readiness-check.mjs';

/**
 * The error strings `validateReadiness()` emits that are derived from the linked
 * Issue's labels rather than from the pull request body.
 *
 * AC-03 decision 2 ("degrade, do not fail") requires that offline runs still
 * enforce every body-only rule while skipping label checks. `validateReadiness()`
 * returns both classes in one flat array, so they must be separated by string.
 * That coupling is deliberate but fragile, and it is pinned by a test: if
 * `work-item-readiness.mjs` ever emits a label error not listed here, the test
 * fails rather than this gate silently reporting it as a body failure the author
 * cannot fix by editing the body.
 */
export const LABEL_DERIVED_ERRORS = Object.freeze([
  'valid same-repository Issue',
  'exactly one current phase',
  'status:spec-ready',
  'status:development-done',
  'status:verification-done',
  'plan-only phase planning or development',
  'plan-only cannot claim development or verification completion',
  'labeled source pull request'
]);

/**
 * The input contract both readiness callers must satisfy (AC-05).
 *
 * CI derives `workItem` from octokit in `github-script`
 * (`.github/workflows/work-item-readiness-refresh.yml`); the local path derives
 * it from `gh issue view --json`. Testing that the two callers agree on the same
 * input is vacuous — both invoke the same imported pure function. The real drift
 * surface is input derivation, so the contract is stated here and both producers
 * are tested against it.
 */
export const WORK_ITEM_CONTRACT = Object.freeze({
  host: 'github.com',
  requiredFields: Object.freeze(['isPullRequest', 'isSameRepository', 'labels']),
  fields: Object.freeze({
    isPullRequest: 'boolean — true when the linked number resolves to a pull request, not an Issue',
    isSameRepository: 'boolean — true only when the Issue lives in the PR\'s own repository',
    labels: 'string[] — label names, flattened from octokit\'s {name} objects or gh\'s {name} objects'
  }),
  limitation:
    'GitHub only. findLinkedIssueNumber() hardcodes https://github.com/ and is deliberately not ' +
    'modified (Issue #236 AC-03 decision 3): it is live in the work-item-readiness-freshness CI ' +
    'check, and this repository ships .gitlab-ci.yml for validator parity but hosts no GitLab ' +
    'issues. A GitLab-hosted clone gets no local PR readiness pre-flight.'
});

const CLOSEOUT_MARKER = /<!-- post-merge-closeout: complete; source-pr-\d+ -->/;

/**
 * Errors from `validateReadiness()`'s closeout branch that no local caller can
 * verify: both need data outside the PR body.
 */
export const CLOSEOUT_UNVERIFIABLE_ERRORS = Object.freeze([
  'labeled source pull request',
  'closeout files are not authorized'
]);

const CLOSING_KEYWORD = /\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\b\s*:?\s*#(\d+)/gi;
const DOC_IMPACT_HEADING = '## Documentation Impact';
const DOC_IMPACT_MARKER = '<!-- documentation-impact: complete -->';

/** True when a shell command string is an actual `gh pr create` invocation. */
export function isPrCreateCommand(command = '') {
  return /(?:^|[;&|]\s*)gh\s+pr\s+create\b/.test(String(command).trim());
}

function unquote(value) {
  if (!value) return value;
  const first = value[0];
  if ((first === '"' || first === "'") && value.at(-1) === first) return value.slice(1, -1);
  return value;
}

/**
 * Reads the PR body out of a `gh pr create` command string.
 *
 * AC-03 decision 1 — **fail-closed**. A PreToolUse hook sees only the command
 * string, so an interactive editor yields nothing. Rather than pass silently
 * when it cannot see its input, this returns an error naming the required flags:
 * a gate that passes when it cannot read its input is not a gate.
 */
export function extractBodyFromCommand(command = '') {
  const text = String(command);
  const bodyMatch = text.match(/(?:^|\s)(?:--body|-b)[= ]\s*("(?:[^"\\]|\\.)*"|'[^']*'|\S+)/);
  if (bodyMatch) {
    const raw = unquote(bodyMatch[1]);
    // The hook sees the command *before* the shell expands it, so `--body "$(cat
    // body.md)"` yields the literal substitution. Validating that text would fail
    // every rule and report "missing QA evidence URL" — fail-closed, but with a
    // cause that is not true. Diagnose it instead.
    if (/\$\(|`|\$\{/.test(raw)) {
      return {
        error:
          'PR readiness pre-flight cannot read the pull request body: --body contains an ' +
          'unexpanded shell substitution, so the hook sees the command text rather than the body. ' +
          'Use --body-file <path> instead.'
      };
    }
    return { body: raw.replace(/\\n/g, '\n').replace(/\\"/g, '"'), source: '--body' };
  }

  const fileMatch = text.match(/(?:^|\s)(?:--body-file|-F)[= ]\s*("[^"]*"|'[^']*'|\S+)/);
  if (fileMatch) {
    const file = unquote(fileMatch[1]);
    if (file === '-') {
      return {
        error:
          'PR readiness pre-flight cannot read the pull request body: --body-file - reads from ' +
          'stdin, which the hook cannot observe. Write the body to a file and pass its path.'
      };
    }
    return { bodyFile: file, source: '--body-file' };
  }

  return {
    error:
      'PR readiness pre-flight cannot read the pull request body: neither --body nor --body-file ' +
      'was supplied, so the body would be composed in an interactive editor and cannot be checked ' +
      'locally. Re-run `gh pr create` with --body or --body-file (Issue #236, AC-03 decision 1).'
  };
}

/** Builds the AC-05 `workItem` from `gh issue view N --json url,labels`. */
export function workItemFromGhIssue(issue, { owner, repo } = {}) {
  if (!issue) return undefined;
  const url = issue.url ?? '';
  return {
    isPullRequest: /\/pull\/\d+/.test(url),
    isSameRepository:
      !owner || !repo ? false : url.startsWith(`https://github.com/${owner}/${repo}/`),
    labels: (issue.labels ?? []).map((label) => (typeof label === 'string' ? label : label?.name)).filter(Boolean)
  };
}

/** Reports how a producer violates WORK_ITEM_CONTRACT (AC-05). */
export function validateWorkItemShape(workItem) {
  if (!workItem || typeof workItem !== 'object') return ['workItem must be an object'];
  const errors = [];
  if (typeof workItem.isPullRequest !== 'boolean') errors.push('workItem.isPullRequest must be a boolean');
  if (typeof workItem.isSameRepository !== 'boolean') errors.push('workItem.isSameRepository must be a boolean');
  if (!Array.isArray(workItem.labels) || workItem.labels.some((l) => typeof l !== 'string')) {
    errors.push('workItem.labels must be an array of strings');
  }
  return errors;
}

/**
 * Validates a local PR body draft.
 *
 * Offline (`offline: true`) it degrades rather than fails (AC-03 decision 2):
 * body-only rules still gate, label rules are skipped with a warning naming what
 * went unverified. `.githooks/pre-push` must work without network, as every other
 * validator in this repository does.
 */
export function validatePrReadiness({
  body = '',
  draft = false,
  workItem,
  changedFiles = [],
  sourcePullRequest,
  repository,
  offline = false
} = {}) {
  const errors = [];
  const warnings = [];

  const linkedIssue = repository ? findLinkedIssueNumber(body, repository) : undefined;

  const isCloseout = CLOSEOUT_MARKER.test(body);

  const effectiveWorkItem = offline || !workItem
    ? { isPullRequest: false, isSameRepository: true, labels: [] }
    : workItem;

  let readinessErrors = validateReadiness({
    body,
    draft,
    workItem: effectiveWorkItem,
    changedFiles,
    sourcePullRequest
  });

  if (offline || !workItem) {
    readinessErrors = readinessErrors.filter((error) => !LABEL_DERIVED_ERRORS.includes(error));
    // Name the cause honestly. A body with no Work Item URL leaves nothing to look
    // up, which is not a network failure — and that is the single most common
    // failure case, so blaming the network there would misdirect every author.
    warnings.push(
      linkedIssue
        ? 'Degraded mode: the linked Issue\'s lifecycle label checks ' +
            `(${LABEL_DERIVED_ERRORS.join(', ')}) were NOT verified — they need \`gh issue view\`, ` +
            'i.e. network and auth, which were unavailable. Body-only checks were fully enforced. ' +
            'CI still enforces the labels.'
        : 'Degraded mode: no linked Issue was resolved from the body, so no lifecycle label check ' +
            'could run. This is not a network failure — supply the Work Item (Issue) URL. ' +
            'Body-only checks were fully enforced.'
    );
  }

  // A post-merge closeout PR is a legitimate class this repository opens routinely
  // (e.g. PR #242). validateReadiness short-circuits on the closeout marker into two
  // rules that are not body-derivable: the source PR's label needs network, and the
  // authorized-file list needs a changed-file set that is unreliable before a push.
  // Refusing closeout PRs locally would rebuild the failure mode that got AC-10
  // withdrawn, at a different hook point. They are reported as unverified, not failed.
  if (isCloseout) {
    readinessErrors = readinessErrors.filter((error) => !CLOSEOUT_UNVERIFIABLE_ERRORS.includes(error));
    warnings.push(
      'Post-merge closeout PR: the source pull request\'s label and the authorized closeout file ' +
        'set were NOT verified locally — neither is derivable from the body. CI still enforces both.'
    );
  }
  errors.push(...readinessErrors);

  // The Issue URL is normally covered by validateReadiness's 'valid same-repository
  // Issue', but that string is label-derived and filtered out offline. Checked
  // explicitly so offline mode can never suppress it.
  if (!linkedIssue) errors.push('Work Item (Issue) URL');

  // Closing keyword must reference the *linked* Issue (AC-03). "Some Fixes #N is
  // present" would pass a body that closes the wrong Issue — which is exactly the
  // #224 failure this gate exists to prevent.
  const closed = [...body.matchAll(CLOSING_KEYWORD)].map((m) => Number(m[1]));
  if (isCloseout) {
    // Closeout PRs close no Issue by design: their source Issues are auto-closed by
    // the source PRs' own keywords, and the marker names the source PR instead.
  } else if (linkedIssue && !closed.includes(linkedIssue)) {
    errors.push(
      closed.length
        ? `closing keyword referencing the linked Issue #${linkedIssue} (found #${closed.join(', #')} instead)`
        : `closing keyword referencing the linked Issue #${linkedIssue} (e.g. "Fixes #${linkedIssue}")`
    );
  } else if (!linkedIssue && !closed.length) {
    errors.push('closing keyword referencing the linked Issue (e.g. "Fixes #N")');
  }

  // Not in AC-03's text, but .github/workflows/documentation-impact-gate.yml
  // requires BOTH strings, and a PR opened here on 2026-09-08 failed that check
  // having supplied only the marker. Mirroring only the heading would leave this
  // local gate weaker than the CI gate it exists to pre-empt.
  if (!body.includes(DOC_IMPACT_HEADING)) errors.push(`${DOC_IMPACT_HEADING} section`);
  if (!body.includes(DOC_IMPACT_MARKER)) errors.push(`${DOC_IMPACT_MARKER} marker`);

  return { errors, warnings };
}

export function formatFailure(errors) {
  return `Work item readiness is incomplete\nLinked Issue is missing: ${errors.join(', ')}.`;
}

// ------------------------------------------------------------------ runtime

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export function currentRepository() {
  const remote = git(['remote', 'get-url', 'origin']);
  const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/);
  return match ? { owner: match[1], repo: match[2] } : undefined;
}

function changedFilesAgainstMain() {
  const base = git(['merge-base', 'HEAD', 'origin/main']) || git(['merge-base', 'HEAD', 'main']);
  if (!base) return [];
  const out = git(['diff', '--name-only', `${base}..HEAD`]);
  return out ? out.split('\n').filter(Boolean) : [];
}

function fetchWorkItem(issueNumber, repository) {
  if (!issueNumber || !repository || process.env.PR_READINESS_OFFLINE === '1') return undefined;
  try {
    const raw = execFileSync(
      'gh',
      ['issue', 'view', String(issueNumber), '--repo', `${repository.owner}/${repository.repo}`, '--json', 'url,labels'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }
    );
    return workItemFromGhIssue(JSON.parse(raw), repository);
  } catch {
    return undefined;
  }
}

function readBodyDraft() {
  const file = process.env.PR_BODY_FILE;
  if (file) {
    try {
      return readFileSync(file, 'utf8');
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function evaluate({ body, draft }) {
  const repository = currentRepository();
  const linked = repository ? findLinkedIssueNumber(body, repository) : undefined;
  const workItem = fetchWorkItem(linked, repository);
  return validatePrReadiness({
    body,
    draft,
    workItem,
    changedFiles: changedFilesAgainstMain(),
    repository,
    offline: !workItem
  });
}

/** `--hook` mode: PreToolUse on Bash, reading the tool invocation as JSON on stdin. */
function runHookMode() {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    input = {};
  }
  const command = input?.tool_input?.command ?? '';
  const allow = () => process.stdout.write(JSON.stringify({}) + '\n');

  if (input.tool_name !== 'Bash' || !isPrCreateCommand(command)) return allow();

  const extracted = extractBodyFromCommand(command);
  let body = extracted.body;
  if (extracted.bodyFile) {
    try {
      body = readFileSync(extracted.bodyFile, 'utf8');
    } catch {
      return deny(`PR readiness pre-flight could not read --body-file ${extracted.bodyFile}.`);
    }
  }
  if (extracted.error) return deny(extracted.error);

  const draft = /\s--draft\b/.test(command);
  const { errors, warnings } = evaluate({ body, draft });
  if (!errors.length) {
    return process.stdout.write(
      JSON.stringify(warnings.length ? { systemMessage: warnings.join('\n') } : {}) + '\n'
    );
  }
  return deny(
    `${formatFailure(errors)}\n\nRefused locally before \`gh pr create\` ran, by ` +
      '`npm run validate:pr-readiness` (Issue #236, AC-04). Fix the body and re-run.' +
      (warnings.length ? `\n\n${warnings.join('\n')}` : '')
  );

  function deny(message) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: message
        },
        systemMessage: message
      }) + '\n'
    );
  }
}

function main() {
  if (process.argv.includes('--hook')) {
    runHookMode();
    // Hook mode signals refusal through permissionDecision on stdout, so it
    // always exits 0; a non-zero status here would be a hook execution error.
    return;
  }

  const body = readBodyDraft();
  if (body === undefined) {
    // No draft to check. Callers such as `.githooks/pre-push` run on every push,
    // where no PR body exists yet; refusing there would rebuild the withdrawn
    // AC-10 failure mode at a different hook point.
    console.log(
      'PR readiness pre-flight skipped: no PR body draft found. Set PR_BODY_FILE=<path> to check one.'
    );
    return;
  }

  const draft = process.argv.includes('--draft');
  const { errors, warnings } = evaluate({ body, draft });
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  if (errors.length) {
    console.error(formatFailure(errors));
    process.exitCode = 1;
    return;
  }
  console.log('PR readiness pre-flight PASSED.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
