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
import { isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  validateReadiness,
  stripCodeSpans,
  advancesOnlyIssues,
  closingKeywordErrors,
  closingKeywordIssues
} from './work-item-readiness.mjs';
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
  /**
   * A field the two producers do not agree on, stated rather than hidden (AC-05).
   * Pinned by a test that drives the real `buildReadinessCheck()`.
   */
  divergences: Object.freeze({
    isSameRepository:
      'buildReadinessCheck() (CI) hardcodes true, because it resolves the Issue by number through ' +
      'the pull request\'s own repository and has no cross-repository case to distinguish. ' +
      'workItemFromGhIssue() (local) derives it from the fetched Issue\'s url, so it can return ' +
      'false for the same Issue object. The rule "valid same-repository Issue" is therefore ' +
      'unreachable in CI and reachable locally.'
  }),
  limitation:
    'GitHub only. findLinkedIssueNumber() hardcodes https://github.com/ and is deliberately not ' +
    'modified (Issue #236 AC-03 decision 3): it is live in the work-item-readiness-freshness CI ' +
    'check, and this repository ships .gitlab-ci.yml for validator parity but hosts no GitLab ' +
    'issues. A GitLab-hosted clone gets no local PR readiness pre-flight.'
});

const CLOSEOUT_MARKER = /<!-- post-merge-closeout: complete; source-pr-\d+ -->/;

/**
 * The closeout-branch error that no local caller can ever verify: the source
 * pull request's `post-merge-closeout` label needs network.
 *
 * `closeout files are not authorized` is deliberately NOT here. The closeout
 * branch is triggered by author-supplied body text, so filtering both errors
 * unconditionally let a fabricated marker on an ordinary PR drop two checks and
 * the closing-keyword requirement (Issue #236, Finding 2). The authorized-file
 * rule IS locally derivable whenever a changed-file set exists, so it is
 * enforced then and only skipped when no local diff is available.
 */
export const CLOSEOUT_UNVERIFIABLE_ERRORS = Object.freeze(['labeled source pull request']);

/** Skipped only when no local changed-file set is available to derive it from. */
export const CLOSEOUT_FILE_ERROR = 'closeout files are not authorized';

/**
 * Re-exported, not re-implemented (Issue #246, AC-07).
 *
 * The `advances-only` marker, the code-span scrubber and the closing-keyword
 * rule all moved into `work-item-readiness.mjs` so the rule is enforced by CI's
 * `work-item-readiness-freshness` check for every host, not originated here in a
 * Claude-only hook. ADR-0022's invariant — `.claude/settings.json` may invoke a
 * rule but never originate one — holds again as a result. These names stay
 * exported from this module because it is this gate's public surface.
 */
export { stripCodeSpans, advancesOnlyIssues, closingKeywordErrors, closingKeywordIssues };

/**
 * Why `gh issue view` failed: the Issue does not exist, or it could not be reached.
 *
 * A 404 is a body defect the author must fix; anything else is the degraded mode
 * AC-03 decision 2 requires. The match is deliberately narrow and positive: only
 * an explicit not-found signal is classified as 'not-found', so a timeout, an
 * auth failure, a rate limit or an unrecognised stderr all stay in the degraded
 * lane. Getting that backwards would tell an author pushing offline that their
 * Issue does not exist (Issue #236, M2).
 */
export function classifyIssueFetchFailure(stderr = '') {
  const text = String(stderr);
  return /could not resolve to an issue or pull request|HTTP 404/i.test(text)
    ? 'not-found'
    : 'unreachable';
}

const DOC_IMPACT_HEADING = '## Documentation Impact';
const DOC_IMPACT_MARKER = '<!-- documentation-impact: complete -->';

/**
 * Splits a shell command string into the simple commands a shell would execute.
 *
 * A regex over the raw string cannot tell an invocation from text that merely
 * appears inside one: `\s` matches a newline, so any command whose *content*
 * contains a separator followed by the create verb — a heredoc holding a
 * markdown table (rows end in `|`), a quoted string, a file being written —
 * reads as a PR creation. That defect blocked real work (Issue #236, Finding 7).
 *
 * This is a lexer, not a shell parser. It tracks quoting, skips heredoc bodies
 * entirely, and breaks on unquoted separators, so only text a shell would treat
 * as a command position is ever considered. Command substitutions are treated as
 * boundaries rather than skipped, because their contents *are* executed.
 */
export function shellCommandSegments(command = '') {
  const text = String(command);
  const segments = [];
  const pendingHeredocs = [];
  let current = '';
  let i = 0;
  const push = () => {
    if (current.trim()) segments.push(current.trim());
    current = '';
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '\\') {
      current += ch + (text[i + 1] ?? '');
      i += 2;
      continue;
    }

    if (ch === "'") {
      let end = text.indexOf("'", i + 1);
      if (end === -1) end = text.length;
      current += text.slice(i, end + 1);
      i = end + 1;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      current += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    // `<<` opens a heredoc; `<<<` is a herestring and opens nothing. The body
    // begins after the next newline, so only the delimiter is consumed here.
    if (ch === '<' && text[i + 1] === '<' && text[i + 2] !== '<') {
      let j = i + 2;
      if (text[j] === '-') j += 1;
      while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j += 1;
      let delimiter = '';
      if (text[j] === "'" || text[j] === '"') {
        const quote = text[j];
        let end = text.indexOf(quote, j + 1);
        if (end === -1) end = text.length;
        delimiter = text.slice(j + 1, end);
        j = end + 1;
      } else {
        const word = /^[A-Za-z0-9_.-]+/.exec(text.slice(j));
        delimiter = word ? word[0] : '';
        j += delimiter.length;
      }
      if (delimiter) pendingHeredocs.push(delimiter);
      i = j;
      continue;
    }

    if (ch === '\n') {
      push();
      i += 1;
      while (pendingHeredocs.length) {
        const delimiter = pendingHeredocs.shift();
        while (i < text.length) {
          let eol = text.indexOf('\n', i);
          if (eol === -1) eol = text.length;
          const line = text.slice(i, eol);
          i = eol < text.length ? eol + 1 : text.length;
          if (line.replace(/^\t+/, '').trim() === delimiter) break;
        }
      }
      continue;
    }

    if (ch === '$' && text[i + 1] === '(') {
      push();
      i += 2;
      continue;
    }

    if (';&|()`{}'.includes(ch)) {
      push();
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  push();
  return segments;
}

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
// Reserved words are command positions too: `if true; then gh pr create ...` puts
// the verb at token 1, not token 0. Wrappers behave the same way.
const COMMAND_PREFIXES = new Set([
  'command', 'sudo', 'env', 'time', 'nohup', 'exec',
  'then', 'do', 'else', 'elif', '!', 'nice', 'timeout', 'stdbuf', 'xargs'
]);

function segmentTokens(segment) {
  // A `\`+newline line continuation is kept in the segment (splitting there would
  // be wrong), so the stray backslash must not be read as a token.
  return String(segment).split(/\s+/).filter((token) => token && token !== '\\');
}

/**
 * The simple command that would actually run `gh pr create`, or `undefined`.
 *
 * Fails open on a lexer failure. This hook runs on every Bash tool call, and a
 * throw would produce no stdout — a hook execution error on unrelated commands.
 * A local false negative costs a convenience check that CI still enforces; a
 * false positive blocks real work, which is what Finding 7 was.
 */
export function findPrCreateSegment(command = '') {
  let segments;
  try {
    segments = shellCommandSegments(command);
  } catch {
    return undefined;
  }
  for (const segment of segments) {
    const tokens = segmentTokens(segment);
    while (tokens.length && (ENV_ASSIGNMENT.test(tokens[0]) || COMMAND_PREFIXES.has(tokens[0]))) {
      tokens.shift();
    }
    if (tokens[0] === 'gh' && tokens[1] === 'pr' && tokens[2] === 'create') return segment;
  }
  return undefined;
}

/** True when a shell command string is an actual `gh pr create` invocation. */
export function isPrCreateCommand(command = '') {
  return findPrCreateSegment(command) !== undefined;
}

/**
 * True when the invocation only asks for help. `--help`/`-h` create no pull
 * request and have no body, so there is no input the gate is failing to see;
 * decision 1 is fail-closed for an unreadable body, not for every shape.
 * `-H` is `--head`, not help, so this must stay case-sensitive. Quoted tokens
 * retain their quotes here, so `--title "--help"` is not a help invocation.
 */
export function isHelpInvocation(segment = '') {
  return segmentTokens(segment).some((token) => token === '--help' || token === '-h');
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
  // The attached short-flag form (`-b<value>`, `-F<value>`) is accepted because
  // `gh` accepts it. Missing it made the flag invisible and fell through to the
  // no-flag branch, which DENIES — a false deny of a command carrying a
  // perfectly good body (found while implementing Issue #246, AC-08).
  const bodyMatch = text.match(/(?:^|\s)(?:--body[= ]\s*|-b[= ]?\s*)("(?:[^"\\]|\\.)*"|'[^']*'|\S+)/);
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

  const fileMatch = text.match(/(?:^|\s)(?:--body-file[= ]\s*|-F[= ]?\s*)("[^"]*"|'[^']*'|\S+)/);
  if (fileMatch) {
    const file = unquote(fileMatch[1]);
    if (file === '-') {
      // Unknowable at EVERY point in the command's life: stdin is consumed by
      // `gh`, and no path exists that the hook could read later. Fail-closed is
      // retained here, unchanged (ADR-0024 D1).
      return {
        error:
          'PR readiness pre-flight cannot read the pull request body: --body-file - reads from ' +
          'stdin, which the hook cannot observe. Write the body to a file and pass its path.'
      };
    }

    // ORDER MATTERS (Issue #246, AC-08). An unexpandable path is classified
    // BEFORE the relative-path refusal, because `$S/body.md` and `~/body.md` are
    // not absolute *literals* and a naive "does not start with /" test would
    // refuse them — re-creating shape 5 of the refuses-legitimate-work table
    // while fixing shape 7. They are declined, not refused (AC-03 / D2).
    if (/[$`~]/.test(file)) {
      return {
        bodyFile: file,
        source: '--body-file',
        unresolvable:
          `PR readiness pre-flight did not check --body-file ${file}: the path contains shell ` +
          'syntax (a variable, a command substitution, or ~) that only the shell can expand. ' +
          'Expanding it here would need the environment of a shell that has not started yet, ' +
          'including assignments made earlier in this same command string; a wrong guess would ' +
          'read a different file than `gh` reads and could pass a bad body (Issue #246, AC-03 / ' +
          'ADR-0024 D2). The pull request body was NOT validated locally. CI still enforces ' +
          'every rule. To check it locally, pass an absolute literal path.'
      };
    }

    if (!isAbsolute(file)) {
      // A FALSE PASS, categorically worse than a false deny (ADR-0024 D4).
      // `.claude/settings.json` runs `cd "${CLAUDE_PROJECT_DIR:-.}"`, so a
      // relative path resolves against the project root here and against the
      // calling shell's cwd for `gh`. Where the two differ the hook validates
      // one file and `gh` submits another. Refusing is the narrowest fix: the
      // alternative is guessing which cwd was meant, and skipping would stop
      // checking every relative path, including the ones that resolve alike.
      return {
        error:
          `PR readiness pre-flight refuses the relative --body-file path ${file}: this hook runs ` +
          'from the project root, while `gh` runs from your shell\'s working directory, so the ' +
          'two can resolve the same relative path to different files — and the gate would then ' +
          'validate a file that `gh` never submits (Issue #246, AC-08). Pass an absolute path, ' +
          `e.g. --body-file "$(pwd)/${file}".`
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
  repositoryResolved = repository !== undefined,
  offline = false,
  /**
   * How the linked Issue lookup ended: 'ok', 'not-found', 'unreachable', or
   * undefined when no lookup was attempted (Issue #236, M2).
   */
  issueResolution
} = {}) {
  const errors = [];
  const warnings = [];

  const linkedIssue = repository ? findLinkedIssueNumber(body, repository) : undefined;

  // Stated unconditionally, not only offline: suppressing the Issue-linkage rule
  // without saying why would be a gate that silently passes when it cannot see its
  // input — the shape decision 1 exists to reject (Issue #236, Finding 5).
  if (!repositoryResolved) {
    warnings.push(
      'Out of scope: `git remote get-url origin` could not be resolved to a github.com ' +
        'owner/repo (no remote, a non-GitHub host, an SSH host alias, or an unusual worktree ' +
        'configuration), so no linked Issue could be identified and no Issue-linkage or ' +
        'lifecycle label check could run. This validator supports GitHub only (Issue #236, ' +
        'AC-03 decision 3). Body-only checks were fully enforced; CI still enforces the rest.'
    );
  }

  const isCloseout = CLOSEOUT_MARKER.test(body);

  const effectiveWorkItem = offline || !workItem
    ? { isPullRequest: false, isSameRepository: true, labels: [] }
    : workItem;

  let readinessErrors = validateReadiness({
    body,
    draft,
    workItem: effectiveWorkItem,
    changedFiles,
    sourcePullRequest,
    // The closing-keyword rule is evaluated by the shared core now (AC-07); this
    // caller supplies the linked Issue and reports the result, rather than
    // owning a second copy of the rule.
    linkedIssueNumber: linkedIssue
  });

  if (offline || !workItem) {
    readinessErrors = readinessErrors.filter((error) => !LABEL_DERIVED_ERRORS.includes(error));
    // Name the cause honestly. A body with no Work Item URL leaves nothing to look
    // up, which is not a network failure — and that is the single most common
    // failure case, so blaming the network there would misdirect every author.
    if (repositoryResolved && issueResolution === 'not-found' && linkedIssue) {
      // A 404 is not a network failure. `fetchWorkItem()`'s bare catch used to
      // collapse the two, so a fabricated Issue URL passed *with* network while
      // the warning blamed the network (Issue #236, M2).
      errors.push(
        `Work Item (Issue) URL naming an Issue that exists (#${linkedIssue} was not found in ` +
          'this repository)'
      );
      warnings.push(
        `The linked Issue #${linkedIssue} does not exist in this repository, so its lifecycle ` +
          'label checks could not run. This is NOT a network failure — correct the Work Item ' +
          '(Issue) URL. Body-only checks were fully enforced.'
      );
    } else if (repositoryResolved) warnings.push(
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
    // The marker is author-supplied text, so trusting it unconditionally is a
    // bypass. The authorized-file rule is derivable from the local diff whenever
    // one exists, so it is enforced then: a marker pasted onto an ordinary PR
    // fails it, because that PR touches files no closeout may touch.
    const fileRuleDerivable = changedFiles.length > 0;
    const skipped = fileRuleDerivable
      ? CLOSEOUT_UNVERIFIABLE_ERRORS
      : [...CLOSEOUT_UNVERIFIABLE_ERRORS, CLOSEOUT_FILE_ERROR];
    readinessErrors = readinessErrors.filter((error) => !skipped.includes(error));
    warnings.push(
      'Post-merge closeout PR: the closing-keyword requirement was SKIPPED (closeout PRs close no ' +
        'Issue by design), and the source pull request\'s `post-merge-closeout` label was NOT ' +
        'verified locally — it is not derivable from the body. ' +
        (fileRuleDerivable
          ? 'The authorized closeout file set WAS checked against the local diff. '
          : 'The authorized closeout file set was NOT verified either: no local changed-file set ' +
            'was available to derive it from. ') +
        'CI re-derives the label server-side and still enforces both.'
    );
  }
  errors.push(...readinessErrors);

  // The Issue URL is normally covered by validateReadiness's 'valid same-repository
  // Issue', but that string is label-derived and filtered out offline. Checked
  // explicitly so offline mode can never suppress it.
  // When origin could not be resolved to a github.com owner/repo, no body can
  // satisfy this rule and the body is not the defect — reporting it as one is the
  // same misdiagnosis class handled for the `$(...)` case. Reported as out of
  // scope in the warning above instead (Issue #236, Finding 5).
  if (repositoryResolved && !linkedIssue) errors.push('Work Item (Issue) URL');

  // The closing-keyword rule itself is enforced by the shared core, which this
  // caller invoked above with `linkedIssueNumber` (Issue #246, AC-07). What
  // remains here is caller-local reporting: the warning that explains a waived
  // requirement, and the one arm the core cannot express — no linked Issue at
  // all, where the core returns [] because there is nothing to check against.
  const closed = closingKeywordIssues(body);
  const declaredAdvances = advancesOnlyIssues(body);
  const advancesOnly =
    Boolean(linkedIssue) &&
    declaredAdvances.length > 0 &&
    declaredAdvances.every((n) => n === linkedIssue);

  if (isCloseout) {
    // Closeout PRs close no Issue by design: their source Issues are auto-closed by
    // the source PRs' own keywords, and the marker names the source PR instead.
  } else if (advancesOnly && closed.length === 0) {
    // Declared partial progress, and only when no closing keyword is present at
    // all (Human Maintainer decision, 2026-09-08 — Issue #236, B1). The marker
    // waives the requirement that a keyword be *present*; it does not waive the
    // requirement that a keyword which IS present point at the linked Issue.
    // The `closed.length === 0` guard is also what makes the wording below true:
    // it can only be reached when no keyword stands.
    warnings.push(
      `Partial-progress PR: the body carries \`<!-- advances-only: issue-${linkedIssue} -->\`, so ` +
        `the closing-keyword requirement for Issue #${linkedIssue} was SKIPPED — this PR advances ` +
        'that Issue without closing it, and the Issue must be closed by a later PR or by hand. ' +
        'Every other readiness rule was enforced normally.'
    );
  } else if (!linkedIssue && !closed.length && !isCloseout) {
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

/**
 * Fetches the linked Issue, reporting *why* it failed rather than collapsing every
 * failure into "offline" (Issue #236, M2).
 *
 * Returns `{ state, workItem }` where state is 'skipped' (no lookup attempted),
 * 'ok', 'not-found' or 'unreachable'. stderr is captured rather than discarded
 * because it carries the only signal distinguishing the last two.
 */
function fetchWorkItem(issueNumber, repository) {
  if (!issueNumber || !repository || process.env.PR_READINESS_OFFLINE === '1') {
    return { state: 'skipped' };
  }
  let raw;
  try {
    raw = execFileSync(
      'gh',
      ['issue', 'view', String(issueNumber), '--repo', `${repository.owner}/${repository.repo}`, '--json', 'url,labels'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }
    );
  } catch (error) {
    return { state: classifyIssueFetchFailure(error?.stderr ?? '') };
  }
  try {
    return { state: 'ok', workItem: workItemFromGhIssue(JSON.parse(raw), repository) };
  } catch {
    // Valid exit, unparseable payload: not a 404, so degrade rather than accuse.
    return { state: 'unreachable' };
  }
}

/**
 * Reads the PR body draft, distinguishing "no draft in play" from "a draft was
 * named but could not be read".
 *
 * `.githooks/pre-push` propagates this script's exit code, so collapsing the two
 * made an unreadable `PR_BODY_FILE` fail open on the push path while the
 * identical condition denied in `runHookMode()` (Issue #236, Finding 4). An
 * author who typos the path was told their draft was checked when it was not.
 */
/*
 * Why this path does NOT adopt AC-02's allow-with-warning or AC-08's relative-path
 * refusal (Issue #246 — stated because Issue #236's Finding 4 was exactly the two
 * paths disagreeing about an identical-looking condition):
 *
 * Both of those rules exist because a `PreToolUse` hook inspects a command string.
 * Neither condition can arise here.
 *   - cwd: `PR_BODY_FILE` is resolved by the same process the author's own shell
 *     started, so a relative path means what the author meant. The hook, by
 *     contrast, runs after `cd "${CLAUDE_PROJECT_DIR:-.}"` and can resolve the
 *     same path to a different file than `gh` would. No ambiguity here, so no
 *     refusal here.
 *   - timing: nothing executes after this check, so a named-but-missing draft is
 *     never "not written yet" — it is simply wrong. Exiting non-zero costs a push,
 *     not a `git commit` that shared a command line. Fail-closed stays.
 */
function readBodyDraft() {
  const file = process.env.PR_BODY_FILE;
  if (!file) return { state: 'unset' };
  try {
    return { state: 'read', body: readFileSync(file, 'utf8') };
  } catch {
    return { state: 'unreadable', file };
  }
}

function evaluate({ body, draft }) {
  const repository = currentRepository();
  const linked = repository ? findLinkedIssueNumber(body, repository) : undefined;
  const resolution = fetchWorkItem(linked, repository);
  const workItem = resolution.workItem;
  return validatePrReadiness({
    body,
    draft,
    workItem,
    changedFiles: changedFilesAgainstMain(),
    repository,
    repositoryResolved: repository !== undefined,
    offline: !workItem,
    issueResolution: resolution.state
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
  // Allowing WITH a warning, never silently: the author is told exactly what went
  // unchecked and why. `systemMessage` alone carries no permission decision, so
  // the call proceeds.
  const allowWith = (message) =>
    process.stdout.write(JSON.stringify({ systemMessage: message }) + '\n');

  if (input.tool_name !== 'Bash') return allow();

  // Scope to the simple command a shell would execute, never the whole string.
  let segment;
  try {
    segment = findPrCreateSegment(command);
  } catch {
    return allow();
  }
  if (!segment) return allow();

  // `--help`/`-h` create no pull request and have no body (Issue #236, Finding 1).
  if (isHelpInvocation(segment)) return allow();

  const extracted = extractBodyFromCommand(segment);

  // Precedence, stated explicitly (Issue #246, AC-02):
  //   1. error shapes            -> deny  (no flag at all; --body-file -)
  //   2. unresolvable path       -> allow with a warning (AC-03 / D2)
  //   3. declared-but-unreadable -> allow with a warning (AC-02 / D1)
  //   4. readable file           -> full validation, and deny on any rule failure
  if (extracted.error) return deny(extracted.error);
  if (extracted.unresolvable) return allowWith(extracted.unresolvable);

  let body = extracted.body;
  if (extracted.bodyFile) {
    try {
      body = readFileSync(extracted.bodyFile, 'utf8');
    } catch {
      // A PreToolUse hook fires BEFORE the command runs. When the body file is
      // written and consumed in the same command string — `cat > body.md <<EOF
      // ... EOF && gh pr create --body-file body.md` — the path is absolute and
      // correct yet does not exist yet. Denying here was not merely a false
      // deny: a PreToolUse deny discards the WHOLE tool call, so the `git
      // commit` and `git push` earlier in that same string never ran (Issue
      // #236, "Finding from live use", 2026-09-09).
      //
      // Fail-closed is retained for a body that is uncheckable at EVERY point in
      // the command's life. This one is not unknowable, only not-yet-knowable,
      // and CI enforces every rule on it minutes later (ADR-0024 D1).
      return allowWith(
        `PR readiness pre-flight did NOT validate the pull request body: --body-file ` +
          `${extracted.bodyFile} does not exist yet at hook time — this hook runs before the ` +
          'command does, so a body written earlier in this same command string is not on disk ' +
          'when the hook looks. Allowing the call rather than refusing it (Issue #246, AC-02 / ' +
          'ADR-0024 D1): refusing would discard the entire command, including any work before ' +
          'the `gh pr create`. CI still enforces every readiness rule on the opened pull request.'
      );
    }
  }

  const draft = /\s--draft\b/.test(segment);
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
    // This hook runs on every Bash tool call. A throw would emit no stdout, which
    // the host reads as a hook execution error on an unrelated command, so any
    // unexpected failure allows the call rather than breaking the session.
    try {
      runHookMode();
    } catch {
      process.stdout.write(JSON.stringify({}) + '\n');
    }
    // Hook mode signals refusal through permissionDecision on stdout, so it
    // always exits 0; a non-zero status here would be a hook execution error.
    return;
  }

  const draft0 = readBodyDraft();
  if (draft0.state === 'unset') {
    // No draft to check. Callers such as `.githooks/pre-push` run on every push,
    // where no PR body exists yet; refusing there would rebuild the withdrawn
    // AC-10 failure mode at a different hook point.
    console.log(
      'PR readiness pre-flight skipped: no PR body draft found. Set PR_BODY_FILE=<path> to check one.'
    );
    return;
  }
  if (draft0.state === 'unreadable') {
    console.error(
      `PR readiness pre-flight could not read PR_BODY_FILE ${draft0.file}. A draft was named but ` +
        'not read, so nothing was checked. Fix the path or unset PR_BODY_FILE.'
    );
    process.exitCode = 1;
    return;
  }
  const body = draft0.body;

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
