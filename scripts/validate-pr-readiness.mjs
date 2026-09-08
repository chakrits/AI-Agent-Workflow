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
 * The partial-progress marker (Human Maintainer decision, 2026-09-08).
 *
 * This repository routinely opens PRs that advance a multi-AC Issue without
 * closing it, and the closing-keyword rule refused every one of them — PRs #232
 * and #234 among them. The rule cannot simply be dropped: Issue #224 stayed open
 * precisely because its PR carried no closing keyword, which is the failure this
 * gate exists to prevent. So the author may *declare* that no Issue is being
 * closed, but may not *forget* to close one.
 *
 * The marker names its Issue, and naming any other Issue is an error rather than
 * a no-op. A marker that suppressed the rule regardless of the number it carries
 * would be a blanket escape hatch, copy-pasteable between Issues without ever
 * being wrong — which the decision explicitly rejects.
 *
 * Syntax mirrors the two markers already in the body vocabulary
 * (`<!-- post-merge-closeout: complete; source-pr-N -->`,
 * `<!-- documentation-impact: complete -->`): an HTML comment, `name: value`,
 * with the `issue-N` form paralleling `source-pr-N`. Spelling the number as
 * `issue-236` rather than `#236` keeps it out of GitHub's cross-reference
 * rendering and out of CLOSING_KEYWORD's way.
 */
const ADVANCES_ONLY_MARKER = /<!--\s*advances-only:\s*issue-(\d+)\s*-->/gi;

/**
 * Every Issue number the body's advances-only markers name, in order.
 *
 * Markers inside a fenced code block or an inline backtick span are ignored: this
 * repository documents the marker syntax (README.md) and writes about its own
 * gates constantly, so prose explaining the marker must neither waive the
 * closing-keyword rule nor raise an error (Issue #236, M1).
 *
 * The fresh regex per call is *not* defensive against `lastIndex`: `matchAll`
 * clones its argument and never advances the original's `lastIndex`, so sharing
 * the global regex would be safe (Issue #236, M9 — an equivalent mutant, and the
 * comment that stood here described a hazard that does not exist). It is kept
 * only so the module-level literal stays a declaration rather than mutable state.
 */
export function advancesOnlyIssues(body = '') {
  return [...stripCodeSpans(body).matchAll(new RegExp(ADVANCES_ONLY_MARKER.source, 'gi'))].map((m) =>
    Number(m[1])
  );
}

/**
 * Blanks out fenced code blocks and inline backtick spans (Issue #236, M1).
 *
 * Deliberately a scrubber, not a Markdown parser. What it covers: ``` and ~~~
 * fences (any length >= 3, opened and closed at line start with optional
 * indentation), and inline spans delimited by a matching run of backticks on one
 * line. What it does NOT cover: indented (four-space) code blocks, HTML <code>
 * or <pre> elements, fences nested inside list items or blockquotes at a deeper
 * indent than three spaces, and backtick spans that straddle a newline. An
 * unterminated fence blanks the remainder of the body. Both directions are then
 * fail-closed: the marker stops waiving and the closing keyword stops satisfying,
 * so such a body is refused rather than passed silently.
 *
 * Scrubbed: this parser and the closing-keyword scan, and only those. Read from
 * the raw body, deliberately: findLinkedIssueNumber() (a fenced Work Item URL
 * still resolves), validateReadiness()'s QA-evidence check, the Documentation
 * Impact heading and marker, and CLOSEOUT_MARKER — scrubbing the last would
 * change post-merge closeout behaviour, which Issue #236 cycle 3 puts out of
 * scope. A fenced closeout marker therefore still flips the closeout branch.
 *
 * Content is replaced by spaces rather than removed so that surrounding text
 * cannot be joined into a marker or keyword that the author never wrote.
 */
export function stripCodeSpans(body = '') {
  const blank = (text) => text.replace(/[^\n]/g, ' ');
  const lines = String(body).split('\n');
  let fence;
  const out = lines.map((line) => {
    const opener = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const closes = opener && opener[1][0] === fence[0] && opener[1].length >= fence.length;
      if (closes) fence = undefined;
      return blank(line);
    }
    if (opener) {
      fence = opener[1];
      return blank(line);
    }
    // Inline spans: a run of N backticks closed by the next run of exactly N.
    return line.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, blank);
  });
  return out.join('\n');
}

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

const CLOSING_KEYWORD = /\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\b\s*:?\s*#(\d+)/gi;
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
    sourcePullRequest
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

  // Closing keyword must reference the *linked* Issue (AC-03). "Some Fixes #N is
  // present" would pass a body that closes the wrong Issue — which is exactly the
  // #224 failure this gate exists to prevent.
  // Read from the scrubbed body, not the raw one, so the two scans cannot drift
  // apart in their code-fence awareness (Issue #236, M1). A `Fixes #N` that only
  // appears inside a fence closes nothing on merge, so it must not satisfy the
  // rule either.
  const closed = [...stripCodeSpans(body).matchAll(CLOSING_KEYWORD)].map((m) => Number(m[1]));

  // A partial-progress declaration, and only for the Issue it names. When no Issue
  // could be resolved from the body the marker is inert and silent: there is
  // nothing to check it against, and that state already carries its own error
  // ('Work Item (Issue) URL') or the out-of-scope warning above.
  const declaredAdvances = advancesOnlyIssues(body);
  const misnamedAdvances = linkedIssue ? declaredAdvances.filter((n) => n !== linkedIssue) : [];
  const advancesOnly =
    Boolean(linkedIssue) && declaredAdvances.length > 0 && misnamedAdvances.length === 0;
  if (misnamedAdvances.length) {
    errors.push(
      `advances-only marker naming the linked Issue #${linkedIssue} ` +
        `(found issue-${misnamedAdvances.join(', issue-')} instead)`
    );
  }

  if (isCloseout) {
    // Closeout PRs close no Issue by design: their source Issues are auto-closed by
    // the source PRs' own keywords, and the marker names the source PR instead.
  } else if (advancesOnly && closed.length === 0) {
    // Declared partial progress, and only when no closing keyword is present at
    // all (Human Maintainer decision, 2026-09-08 — Issue #236, B1). The marker
    // waives the requirement that a keyword be *present*; it does not waive the
    // requirement that a keyword which IS present point at the linked Issue.
    // Suppressing the wrong-Issue arm too meant a body carrying `Fixes #212`
    // passed while this very warning told the author the PR closed nothing — and
    // merging it closed #212. The `closed.length === 0` guard is also what makes
    // the wording below true: it can only be reached when no keyword stands.
    warnings.push(
      `Partial-progress PR: the body carries \`<!-- advances-only: issue-${linkedIssue} -->\`, so ` +
        `the closing-keyword requirement for Issue #${linkedIssue} was SKIPPED — this PR advances ` +
        'that Issue without closing it, and the Issue must be closed by a later PR or by hand. ' +
        'Every other readiness rule was enforced normally.'
    );
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
  let body = extracted.body;
  if (extracted.bodyFile) {
    try {
      body = readFileSync(extracted.bodyFile, 'utf8');
    } catch {
      return deny(`PR readiness pre-flight could not read --body-file ${extracted.bodyFile}.`);
    }
  }
  if (extracted.error) return deny(extracted.error);

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
