# Security Review: Issue #297 S3 (advisory validate:lessons-learned and diff-scope helper)

- Reviewer: Security Reviewer (independent; did not implement)
- Range: `git diff 609f45a..ce3a9cc` (HEAD `ce3a9cc`)
- Verdict: PASS_WITH_FINDINGS (no Critical/High; nothing blocks merge)
- Verification: `npm test` 817 pass / 0 fail; `npm run validate:contracts` passed; `npm run validate:ci-parity` passed.

## Controls

| Control | Result | Evidence |
|---|---|---|
| Ref names reach git only as argv, never a shell | PASS | scripts/lib/diff-scope.mjs:22 `execFileSync('git', args, ...)`, all call sites pass arrays (:36,:48,:58,:64). No `exec`/shell string anywhere in the S3 files. |
| `isSafeRefName` allow-list | PASS | :7 regex (first char alnum/underscore, then `[A-Za-z0-9._/-]`), :9-16 length<=200, no `..`/empty segment, no `.lock`. Probe table below. Declared-but-unsafe returns no-range at :42 before any git call. |
| Failure path is NOT EVALUATED, exit 0, no leak | PASS | makeGit swallows errors and discards stderr (:22-25); validate-lessons-learned.mjs:148-150 prints fixed `NOT EVALUATED: <fixed reason>`; :163-169 catch prints error message, exit 0. Probed hostile ref and a non-git directory: both `NOT EVALUATED: no PR range`, exit 0. |
| Lesson link resolution (name, realpath, symlink) | PASS | :14 name regex, :41-50 realpath of lessons dir and target, `startsWith(base+sep)`, then existsSync. Probes below. |
| Fragment, encoded, absolute links | PASS | `#frag` stripped in wikilink (:15); in markdown links a fragment fails the name regex (false WARN, fail-safe). `%2e%2e`, absolute, `..` all rejected. |
| `issue-<N>` mapping | PASS | :81 N is `\d+` from the regex at :124 (no untrusted text in the RegExp); lookarounds prevent `issue-1` matching `issue-12`/`issue-1a`. |
| Output/log injection | PASS_WITH_FINDING | Static reason strings only; titles and lesson text are never echoed (probe: `# ::set-output` title and `::error::` lesson text never appeared). Only the file name is echoed. See finding 2 (newline in file name in `--all` mode). Annotation line strips CR/LF (:156). |
| Exit-code contract | PASS | main returns 0 on every path (:150,:160); top level catch sets 0 (:169). NOT EVALUATED is a distinct string, no `OK`. No process.exit(1). Hang risk: see finding 1. |
| GitHub step | PASS | validate-contracts.yml adds `- run: npm run validate:lessons-learned` only: no `${{ }}` in run, no continue-on-error, no env/secret, no new permissions, no `pull_request_target`. Existing checkout already `fetch-depth: 0` so merge-base works. GITHUB_TOKEN stays scoped to the dispatch-receipts step only. |
| GitLab job | PASS (partly unverifiable offline) | .gitlab-ci.yml:216-231: `GIT_DEPTH: 0`, same cache/key and rules as validate_ci_parity, no new variables or secrets. validate:ci-parity passes. Not verifiable offline: that `CI_MERGE_REQUEST_TARGET_BRANCH_NAME` is populated in merge_request_event pipelines and that `origin/<target>` exists in the runner clone; if not, the result is NOT EVALUATED (advisory), not a failure. |
| Template/README edits | PASS | README.md one sentence describing the command; LESSONS_LEARNED.md reworded one checklist line. Content-only, no new links, no instructions to agents. |
| Scope constraints | PASS | `archive-work-item.mjs` not in the diff; no skill added; no non-zero exit. |

## Probe inputs and outcomes (scratch git repo under the session scratchpad, since deleted)

isSafeRefName rejected: `--output=/tmp/x`, `-c`, `--upload-pack=x`, `-main`, `--`, `a/../b`, `a@{1}`, `a b`, `a\nb`, `a\0b`, `mañana`, `a;b`, `a|b`, `a&b`, `a$(id)`, a backtick form, 201 chars, `a//b`, `a.lock`, `a/`, `/a`, `a~1`, `a^`, `a:b`, `a*`.
Accepted: 200 chars, `main`, `feat/x-1`, `HEAD`, `a..b` (see finding 4).
resolveBase with env `--output=out.txt`, `-c`, `--upload-pack=touch pwn`, `main;touch pwn`, nonexistent: all no-range; no file created in the repo; `main` resolved a merge-base.
linkResolves false: file symlink out, directory symlink out (`dlink/s`), chain to outside file, `../../x`, `ok#f`, `ok\n`, `%2e%2e/x`, `/etc/passwd`, `ok/../../x`. True: real file, symlink staying inside, and a directory named `*.md` (finding 3).
checkLessons: wikilink with `#frag` ok; markdown link ok; markdown link with `#f` unresolved (fail-safe WARN); `..%2f..%2fx` unresolved.
Timing (single heading/line, one run each): 50k repeated `<!--` 2.0 s; 30k repeated `[[../lessons-learned/` 10.1 s; 30k repeated `](lessons-learned/` 4.9 s; 50k repeated `Work Item: ` 5.0 s; 2M blank lines 0.1 s; long Status whitespace 0 ms.
Output: a work item with title `::set-output name=x::1` and lesson `::error::x` printed only fixed text; GITHUB_ACTIONS annotation strips newlines. A file name containing a newline plus `OK [AC-006] forged` printed a forged `OK` line under `--all` (finding 2) and was silently skipped in PR-range mode (git quotes the name). A non-ASCII work-item file name (`é`) is also skipped in PR-range mode.

## Findings

1. Low: quadratic regex backtracking on pathological single lines (validate-lessons-learned.mjs:57 `<!--.*?-->`, :15 WIKILINK_RE, :16 MDLINK_RE, :124 `Work Item:.*?`). A few hundred KB on one line costs 2-10 s; a megabyte would cost minutes. Input is PR-controlled repo content, and a PR author can already change the workflow itself, so this is only a CI-time nuisance, but a job timeout would turn the advisory step red, against the exit-0 contract. Also no timeout on `execFileSync` (:22), unrealistic for local git. Hardening: cap line/file length or read size before matching. Route to Developer Agent; not blocking.
2. Low: output forging via file name in `--all` mode (:95, :111-112 echo `rel` from `readdirSync`). A committed file name containing a newline can emit a forged `OK [AC-006]` line. CI does not use `--all`; PR-range mode is unaffected because git quotes such names. Hardening: strip control characters from `rel` before printing.
3. Low: a directory named `<name>.md` inside lessons-learned counts as an existing record (:46 existsSync, no isFile). Advisory false negative only. Use statSync().isFile().
4. Informational: `a..b` passes the allow-list. It is only an option-free revision-range token passed to `git merge-base` as one argument; git errors, so the result is NOT EVALUATED. No injection.
5. Informational: PR-range mode silently skips work items whose names git quotes (non-ASCII, control characters) because `--name-only` is run without `-z`; false negative in an advisory check. Using `-z` would close it.
6. Informational (TOCTOU): realpath then existsSync (:44-46) has a swap window, as in S2 finding 3; nothing is opened or read, only a boolean results, so no disclosure.

## Chained findings

1 + 2 + 3 do not compose into higher risk: each is advisory-output or availability only, no read, write, or secret primitive. Finding 1 is the only one touching the exit-0 contract (via job timeout), and the attacker already controls the PR's workflow in same-repo PRs.

## Handoff

No human approval needed. Route findings 1-3 and 5 to Developer Agent as optional hardening; none blocks S3.
