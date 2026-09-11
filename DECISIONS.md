# DECISIONS.md

## Decision Log

Restored on 2026-09-05 under Issue #208. The blank-template resets of 2026-08-12 (PR #162) and
2026-08-22 (PR #205) each blanked this file. Restoration is deliberately limited to the two ADRs
that currently-open issues cite; ADR-0002 through ADR-0016 and ADR-0018 remain recoverable via
`git show afe8091:DECISIONS.md` and were left out by Human Maintainer decision.

### ADR-0025: Expose argument tokens from the existing lexer for Issue #249

- Date: 2026-09-09
- Work Items: [Issue #249](https://github.com/chakrits/AI-Agent-Workflow/issues/249)
- Status: Accepted — Human Maintainer approved in the continuing session on 2026-09-09

#### Context

AC-01 assumes `shellCommandSegments()` already produces argument tokens. At `a53c66f`
it returns command-segment strings; `segmentTokens()` splits those strings on whitespace
without preserving quoted argument boundaries. Parent and Developer independently reproduced
a quoted title containing `--body` being mistaken for the actual body flag. Consuming that
whitespace split cannot satisfy AC-02's quoted values or AC-03's title case.

#### Decision

Clarify AC-01: `extractBodyFromCommand()` consumes argument tokens exposed by the existing
lexer. Extending that lexer to retain argument boundaries and quoted values is authorized,
while preserving its existing command-segmentation behavior. No second shell parser, shell
evaluation, variable expansion, or new dependency is authorized. All other Issue #249 ACs
and ADR-0024's retained behavior remain binding. This approval permits implementation,
not merge.

#### Alternatives Considered

- Consume the existing whitespace split unchanged — rejected because quoted argument
  boundaries have already been lost, as the baseline repro demonstrates.
- Add another parser or more body-extraction regex patches — rejected; this would retain
  competing interpretations of the command, contrary to ADR-0024's rationale.

#### Consequences

The approved change has a larger lexer scope than the original AC-01 wording implied.
Independent QA must check command detection and heredoc behavior as well as argument
extraction, compare flag semantics with `gh`, and use real historical PR bodies with
changed-file sets derived from their merge commits. AC-05's mutation requirements remain
binding; numeric test-count floors remain prohibited. No implementation claim is made
by this decision record.

### ADR-0024: A `--body-file` the hook cannot yet read is allowed with a warning; decision 1's fail-closed rule is scoped to genuinely uncheckable bodies

- Date: 2026-09-09
- Work Items: [Issue #246](https://github.com/chakrits/AI-Agent-Workflow/issues/246) (AC-01), arising from [Issue #236](https://github.com/chakrits/AI-Agent-Workflow/issues/236) (IMP-007)
- Status: Accepted

#### Context

Issue #236's AC-02–AC-05 shipped `scripts/validate-pr-readiness.mjs` as a `PreToolUse` hook on
`gh pr create` and as `.githooks/pre-push` (PR #243, `0fa6c30`). Human Maintainer decision 1
(2026-09-08) made the gate fail closed when the body cannot be read, reasoning that a gate which
silently passes when it cannot see its input is not a gate. That decision was made about the
interactive-editor case: no `--body` or `--body-file` is supplied, so no path exists on disk that
the hook could read at any point, and the author chose that shape.

Issue #246 reports the same rule firing on a different case. A body file written and consumed in
one shell invocation does not exist when the hook runs, but does exist when the command runs.
Reproduced at `51b4129`: an absolute, correct `--body-file` path preceded by its own heredoc write
is refused.

A denial blocks the entire tool call, not the offending command. SA Agent proved this with a
canary: `touch <canary> && gh pr create --title t --body-file /nonexistent/nope.md` was denied and
the canary did not exist afterwards. `findPrCreateSegment()` narrows what is inspected, not what is
blocked; `permissionDecision` applies to the whole `tool_input.command`.

Enforcement coverage was re-derived rather than assumed. `work-item-readiness-refresh.yml` runs the
shared readiness core on pull-request `opened`/`synchronize`/`reopened`/`ready_for_review`/`edited`,
and `documentation-impact-gate.yml` enforces both the `## Documentation Impact` heading and its
completion marker. Of the four rules the local gate adds beyond CI, three are already total
server-side. Only one is enforced nowhere else: the closing keyword must reference the linked
Issue, with its `advances-only` qualification. `.githooks/pre-push` exits 0 unless `PR_BODY_FILE`
is set, so it does not carry that rule either.

Every pull request in this repository's recent history is opened with `--body-file`, so the rule's
false-deny rate on the common path is effectively total.

#### Decision

1. **A declared `--body-file` that cannot be read at hook time is allowed with a warning** naming
   the unread path and the checkable alternatives — write the draft in a prior tool call, or run
   `PR_BODY_FILE=<path> npm run validate:pr-readiness`.
2. **Fail-closed is retained, unchanged**, for bodies that are uncheckable at every point in the
   command's life: no `--body`/`--body-file` flag at all, `--body-file -`, and any body file that
   is readable and fails a readiness rule.
3. **Decision 1 is scoped, not overridden.** Its rule governs bodies that are unknowable. A file
   that will exist at execution time is not unknowable but not-yet-knowable, and enforcing it early
   with a whole-call denial is a scheduling constraint imposed by the most destructive instrument
   available.
4. **Shell-variable expansion is declined.** No `$VAR`, `${VAR}`, `~`, or command substitution is
   resolved at hook time. Correct expansion needs the environment of a shell that has not started,
   including assignments made earlier in the same string; a wrong guess makes the hook validate a
   different file than `gh` will read, which can pass a bad body. Decision 1 above removes the
   symptom.
5. **The closing-keyword-references-linked-Issue rule, including `advances-only` semantics, is
   relocated into `work-item-readiness-refresh.yml`'s check.** This repairs ADR-0022's invariant,
   which code merged in PR #243 already violates: that rule is originated in
   `.claude/settings.json` today, because CI does not carry it and `.githooks/pre-push` is opt-in.
6. **A relative `--body-file` path must not produce a false pass.** The hook command runs
   `cd "${CLAUDE_PROJECT_DIR:-.}"`, so a relative path resolves against the project root while `gh`
   resolves it against the calling shell's working directory. Where the two differ, the hook
   validates one file while `gh` submits another. The narrowest correct behaviour is to refuse a
   relative path rather than guess which working directory was meant.
7. **Numeric test-count floors are not acceptance criteria** for this work. 101 tests written for
   this gate missed six defects, and the defect behind this ADR survived four independent QA rounds
   before being found by use. Criteria state what must hold, not how many assertions exist.

#### Alternatives Considered

- **Keep fail-closed and document the two-call workaround.** Rejected. It leaves a near-total
  false-deny rate on the common path, enforced by a mechanism that destroys unrelated work in the
  same tool call. This is the shape that has refused legitimate work seven times across Issue #236.
- **Resolve and expand the `--body-file` path at hook time.** Rejected. It cannot address the case
  at all, since the file genuinely does not exist yet, and it introduces a false-pass mode strictly
  worse than the false-deny it would replace.
- **Parse the command for a heredoc or redirect writing that same path, and allow only then.**
  Rejected on principle. Every defect in this family stems from the hook parsing shell text it does
  not own; adding more shell parsing to fix a shell-parsing bug enlarges the surface that produced
  the bug.
- **Prompt the human instead of denying.** Not adopted: host support was not verified in this
  configuration, and it would stall non-interactive runs.
- **Remove the hook and rely on `.githooks/pre-push`.** Rejected. `pre-push` is opt-in on
  `PR_BODY_FILE` and fires on no ordinary push, so this would be a net loss of enforcement rather
  than a relocation.
- **Amend ADR-0022 to permit hook-originated rules.** Rejected. It would discard the portability
  this repository paid for in Issues #210 and #212, and every non-Claude host would silently lose
  the closing-keyword rule. Relocating the rule repairs the invariant instead.
- **Guess a working directory for a relative `--body-file`.** Rejected. A gate that reports success
  on the wrong input is more dangerous than no gate, because it is trusted.

#### Consequences

- The write-then-create shape stops being refused, and no longer risks destroying a `git commit` or
  `git push` earlier in the same tool call.
- A body passed via a not-yet-written file goes unchecked locally. Three of the four extra rules are
  already total in CI; the fourth is relocated by decision 5.
- **Residual, explicitly retained and out of this Issue's scope:** the no-flag deny is still
  whole-call destructive. `git commit && gh pr create --title t` still loses the commit. Blast
  radius is a property of the hook point, not of this defect, and that hazard is decision 1 working
  as designed. Changing it is a separate decision about whether a `PreToolUse` deny is an acceptable
  instrument at all.
- **Residuals carried forward unchanged from Issue #236:** the `advances-only` marker parser scrubs
  fenced and inline-backtick regions but not four-space indented blocks, HTML `<code>`/`<pre>`,
  fences indented more than three spaces inside lists or blockquotes, or spans straddling a newline;
  `isCloseout` reads the body unscrubbed, bounded by the authorized-file rule; and a `--title`
  containing the literal `--body` hijacks body extraction, failing closed.
- The relocated closing-keyword rule fires after the pull request is open rather than before it, so
  it prevents a merge rather than a mistaken pull request.
- Recording this ADR moves `npm run adr:audit` further inside the 10:1 threshold.
- Owner: Human Maintainer (approval, granted 2026-09-09), then Developer Agent. This ADR authorises
  no implementation on its own.

### ADR-0023: Canonical duplication elimination — scoped relocation set, retained Boundaries index, five-field catalog row

- Date: 2026-09-08
- Work Items: [Issue #237](https://github.com/chakrits/AI-Agent-Workflow/issues/237) (IMP-008)
- Status: Accepted

#### Context

Issue #237 (IMP-008 — canonical duplication elimination) requires AC-01 to decide, before
implementation, three things: which of the proposed relocations are genuine duplication safe to
replace with a pointer; whether `AGENTS.md`'s Boundaries (Always / Ask First / Never) index is
kept, which is a rejected removal and therefore needs an ADR under the Completion Rule; and the
target row shape for the collapsed `SKILL_CATALOG.md` table.

The measured baseline on `main` @ `429c0da` is 29,534/30,000 tokens, leaving 466 of headroom, with
565 tests passing, skill parity at 39 and adapter parity at 11. The Issue's premise was that four
blocks of content are written twice across two files that are both counted against the budget,
with no validator keeping the copies in sync — both a token cost and an unguarded drift surface,
unlike skills and role adapters which have `validate-skill-parity` and `validate-adapter-parity`.

SA Agent read both sides of every proposed relocation rather than accepting the Issue's table, and
examined `scripts/lib/context-compatibility-v1.mjs`, which the Issue did not address and which
partitions canonical files into `BOOT_SOURCES` (always loaded) and `ON_DEMAND_BASE_SOURCES`.
**Three of the Issue's measurements and two of its acceptance criteria did not survive that
check.** The parent independently re-derived every load-bearing finding before accepting it.

The governing constraint beyond token count: a relocation that makes a rule harder to find at the
moment it applies is a regression even when the budget improves.

#### Decision

**Approved relocations.** AC-02 (the 46-field handoff list into `handoff-contract.md`), verified as
46/46 identical fields in the same order with none unique to either side, **conditional on the
replacement pointer being imperative** — "load `docs/workflow/handoff-contract.md` before emitting
any handoff" — because this is the one genuine boot→on-demand crossing and
`docs/templates/HANDOFF.md`, which both files cite, is registered to no role in either load mode.
AC-03 (Lifecycle Label Contract into `dynamic-routing.md:46-77`), a verified superset, measured at
298 tokens rather than the Issue's 531. AC-07 (the Release Agent's four subsections into the
`release-readiness-checklist` skill), **conditional on first moving `role-definitions.md:346`'s
R-001 provenance sentence into the skill**, which does not currently carry it.

**AC-05 approved only with a retargeted pointer.** The Issue's premise that the same list exists in
three files is false. Three sections carry similar names and different content:
`AGENTS.md:81-89`'s Stop Conditions lists subject-matter triggers;
`AGENT_OPERATING_MODEL.md:91-100`'s **Stop Conditions** lists situational triggers — a different
list; and `AGENT_OPERATING_MODEL.md:51-60`'s **Human Approval Gates** is the actual superset. The
pointer must target `#human-approval-gates`, and the same change must retarget `AGENTS.md:104`'s
reference, which the relocation would otherwise leave dangling.

**AC-04 and AC-06 are rejected.** AC-04's stated destination does not own the content:
`dynamic-routing.md`'s Standard and Backward Paths governs phase-label transitions, not
role-to-role backward routing. Verified by grep across every counted file, three of the six
backward rules and the prohibition "Do not skip QA for user-visible, business-rule, or production
data/config changes" exist only in `AGENTS.md`. Executing AC-04 as written would delete policy,
contradicting the Issue's own "Policy statements removed: 0" measure. AC-06's two lists overlap in
substance but not in shape, and `AGENTS.md`'s numbered principles are cited **by number** four
times inside the Boundaries index; 132 tokens does not justify four broken cross-references when
repairing them costs nearly as much as the move saves.

**AC-08 approved with a five-field row shape:**
`Skill | Trigger | Primary Agent | Do Not Use When | Next Skill / Agent`, applied consistently
across `## Current Skills` and `## Engineering Discipline` as well, so the file carries one row
shape rather than three. `Next Skill / Agent` must remain in the catalog because
`validateSourceMatrix()` (`context-compatibility-v1.mjs:139`) grants each role exactly one
`allowedSkillId`, so an agent selecting among 31 skills cannot open the other 30 `SKILL.md` files
as registered sources — chaining information is consumed at selection time and becomes unreachable
if moved. Input and Output are execution detail and may move.

**The Boundaries index is kept.** It is the only single-surface Always / Ask First / Never check in
the tree, and boot mode carries just three files; converting a one-look stop check into a
seven-section scan is a usability regression the 316 tokens do not buy back.

**AC-11 is re-baselined from ≤24,600 to ≤26,300 tokens.** The original target was unachievable
**even accepting every acceptance criterion verbatim** (~25,410, missing by ~810), because three
estimates were high. #178's 30,000-token target is unchanged; only this Issue's interim waypoint
moves. **AC-12 is restated** as "≥565 tests with no assertion removed without an equivalent
replacement", resolving its contradiction with AC-09, which authorises consolidating assertion
sites into fewer cases.

#### Alternatives Considered

- **Accept the relocation set as a block, per the Issue's table** — rejected. Two items fail
  independent verification. Per-item judgment was required and produced two rejections.
- **Execute AC-04 as written** — rejected; it deletes three backward-routing rules and one QA-skip
  prohibition that exist nowhere else. The expand-then-point variant — add the missing rules to
  `dynamic-routing.md` first, verify, then replace — is legitimate but is a content change rather
  than a pointer swap, and is carried separately as AC-13.
- **Point AC-05 at `AGENT_OPERATING_MODEL.md` without a section anchor** — rejected; the section
  sharing the name carries different content, so the pointer would route an agent to the wrong
  list at the moment a stop decision is being made.
- **Remove the Boundaries index for 316 tokens** — rejected. It is the only consolidated boundary
  check, and it would not rescue AC-11 regardless, since the gap is ~1,600 tokens. The choice was
  never "usability versus passing AC-11".
- **Collapse the catalog to Trigger / Primary Agent / Do Not Use When** — rejected. Measured at
  2,216 tokens against the five-field shape's 2,735, it saves ~519 more and breaks skill chaining
  for every role, because only one `SKILL.md` per role is a registered source.
- **Relocate `AGENTS.md`'s nine change-type "Recommended flow" blocks** — considered as the only
  unscoped lever large enough to close AC-11's original gap, and declined. Measured at 602 tokens
  with only the flow arrows genuinely redundant against `dynamic-routing.md:83-96`'s Change Types
  table; the Required-artifacts lists and the Security-sensitive enumeration exist nowhere else, so
  realistic net is ~250-300. Recorded as revisitable if more headroom is needed later.
- **Raise the 30,000-token target** — not considered; prohibited by Issue #178's standing scope rule.

#### Consequences

- AC-04 and AC-06 are closed as rejected; the Issue's `AGENTS.md` target falls from −1,165 tokens
  to ~−590. AC-13 carries AC-04's safe expand-then-point variant and may be deferred without
  blocking the Issue.
- Measured landing for the approved set is **~26,262 against the ≤26,300 target — only ~38 tokens
  of margin.** Pointer wording must be terse, and the budget must be re-measured after each
  relocation rather than only at the end.
- The AC-08 collapse was measured, not estimated: composing all 31 five-field rows from the current
  catalog's real values yields 2,735 tokens at ~88 per row, against the region's 4,856 — a net
  reduction of 2,121. The Issue's ~1,500 estimate was high by ~700.
- AC-09's implementation note is corrected to **6 test cases across 11 assertion sites covering 20
  skills**. Line 909's assertion is unanchored (`/## git-workflow-and-versioning/`) and will be
  missed by a search for the anchored pattern, though it still breaks against a table row. The
  `tokenPattern` safety claim is verified true, with the caveat that it guards only the 11 skills in
  `ROLE_SOURCE_CONTRACT`, not all 31. `validate-contracts.test.mjs:1937` already asserts a table
  row, so it is precedent for the target shape and constrains `## Current Skills`' column order.
- AC-10's repin is a hard build dependency, not housekeeping: `required-source-matrix.json` pins the
  six touched files by sha256 **99 times**.
- AC-14 is added for five non-test consumers that read stale after the collapse and which the Issue
  listed none of: `CONTEXT_BUDGET.md`, `operating-model/README.md`, `docs/vault/00-Index.md`,
  `docs/workflows/stabilize-core.md`, and `AGENT_EVALUATION_CHECKLIST.md`.
- AC-02's approved form leaves a residual: the handoff field enumeration is no longer reachable in
  boot mode. Accepted because the list is a write-time checklist rather than a decision rule, and
  mitigated by the imperative pointer wording.
- Recorded but not closed here: the **"Stop Conditions" naming collision** across `AGENTS.md`,
  `AGENT_OPERATING_MODEL.md`, and `dynamic-routing.md` — three sections sharing a name with
  different content — is an unguarded drift surface. A follow-up to rename one of them is
  recommended.
- Implementation of AC-02 through AC-08, AC-13 and AC-14 is gated on Issue #236 (IMP-007 AC-07)
  landing, so `validate:context-budget` guards canonical-file edits while the budget itself is edited.
- Recording this ADR keeps `npm run adr:audit` far inside the 10:1 threshold.
- Owner: Human Maintainer (approval, granted 2026-09-08), then Developer Agent. This ADR authorises
  no implementation on its own.

### ADR-0022: Local enforcement hook layer — portable core with thin invokers; no blocking commit gate

- Date: 2026-09-08
- Work Items: [Issue #236](https://github.com/chakrits/AI-Agent-Workflow/issues/236) (IMP-007)
- Status: Accepted

#### Context

Issue #236 (IMP-007 — local enforcement hook layer) requires AC-01 to decide, before
implementation, three things: where hook logic lives given this repository's host-neutrality
commitments; which hooks are blocking and which are advisory; and what escape hatch a blocking
commit-time gate would need.

The repository holds 15 `scripts/validate-*.mjs` validators and 6 GitHub workflows plus
`.gitlab-ci.yml`, but **zero local enforcement points**. `.githooks/post-merge` exists, is
executable, and documents its own activation, yet `git config core.hooksPath` is empty — it has
never run since it was added on 2026-07-20. There is no `.claude/settings.json`, only a
`settings.local.json` holding three permission entries. Every framework rule is therefore
enforced only after a pull request exists.

Five failures observed during the 2026-09-07 session motivated the Issue: PR #223 failed
`work-item-readiness-freshness` twice and required Issue #224 to be opened retroactively;
Issue #224 then stayed open because that PR used no closing keyword; editing a file pinned in
`required-source-matrix.json` breaks seven tests with no hint; adapter and skill drift surface
only in CI; and sandbox worktree isolation placed a dispatched agent on a different branch than
its packet stated, three times in one session.

SA Agent evaluated the Issue's proposed design against the tree rather than accepting it. Its
load-bearing premises verified; two of the Issue's incidental counts did not, and two of its
acceptance criteria were found to be wrongly scoped.

#### Decision

**Hook logic lives in `scripts/*.mjs` behind an npm script; `.githooks/` and CI invoke those
scripts, and `.claude/settings.json` invokes them too.** This is already house style — 
`validate-ci-parity.mjs`, `validate-adapter-parity.mjs`, `validate-context-budget.mjs`, and
`validate-project-state.mjs` all export pure functions behind an
`import.meta.url === pathToFileURL(process.argv[1]).href` CLI guard, so adding a caller class
costs nothing incremental.

SA established a fact the Issue did not: `.agents/` and `.agent/` contain only `agents/`,
`skills/`, and `workflows/` — **no hook runtime exists outside Claude Code.** `.githooks/` is
therefore the only portable enforcement point, and `.claude/settings.json` is a latency
optimisation that moves feedback earlier for one host. That supports a sharper invariant than
the Issue's original AC-12 stated, and it is adopted as governing:

> `.claude/settings.json` may only invoke a rule that `.githooks/` or CI already enforces.
> It may never be the origin of a rule.

**Enforcement level is mostly determined by the hook point, not chosen.** `PostToolUse` fires
after the write has landed, so the repin guard, the context-budget guard, and the parity guard
cannot prevent an edit under any policy; they surface feedback. The session-context surface is a
display, and blocking a `SubagentStop` would mean refusing subagent termination for a condition
the parent can fix. **The PR readiness pre-flight is the only genuinely blocking gate**, justified
by the failure mode that a published pull request cannot be cleanly withdrawn.

**No blocking commit-time gate. The Issue's AC-10 is withdrawn rather than given an escape
hatch.** `scripts/validate-project-state.mjs` greps `PROJECT_STATUS.md`'s `- Status:` lines for
`uncommitted`, `pending review`, and `pending merge` — states that describe normal mid-work-item
progress, not a commit-time invariant. Commit `3b49fca` (2026-07-15) legitimately committed
`- Status: Implemented, uncommitted — pending review`; a blocking hook would have refused it and
every commit until `826b980` cleared the marker. The validator keeps its place at closeout, where
those markers genuinely indicate staleness.

**Two acceptance criteria are re-pointed.** The Issue's AC-05 proposed testing that the local and
CI readiness paths agree — vacuous, since both invoke the same imported pure function. The real
drift surface is input derivation: CI builds `workItem` from octokit in `github-script`
(`.github/workflows/work-item-readiness-refresh.yml:47`), while the local path must build it from
`gh` and `git diff`. AC-05 now tests that documented input contract. AC-12 is re-pointed from npm
resolvability to containment of the invariant above, and must additionally surface validators no
entry point reaches.

#### Alternatives Considered

- **Hook logic inside `.claude/settings.json`** — rejected. Unreachable from the other two trees
  and from a human running plain git; precisely the host asymmetry that `validate-adapter-parity`
  (Issue #212) and `validate-ci-parity` (Issue #210) exist to close, and contrary to `CLAUDE.md`'s
  rule that canonical workflow files win over Claude adapters.
- **Blocking the repin, context-budget, and parity guards** — rejected as unimplementable.
  `PostToolUse` runs after the write; the choice does not exist at that hook point.
- **An escape hatch for a blocking commit gate — `--no-verify`, a `SKIP_HOOKS=1` environment
  variable, or a `wip:` commit-message prefix** — all rejected. Each becomes habitual within a
  single session, leaving the appearance of a gate without the gate. The problem is not a missing
  hatch; it is that `validate-project-state.mjs` is not a commit-time invariant.
- **Re-implementing readiness validation locally rather than importing it** — rejected.
  `validateReadiness()` is already pure over `{body, draft, workItem, changedFiles,
  sourcePullRequest}` and `findLinkedIssueNumber()` is already exported, so a second
  implementation would buy nothing and create the divergence this repository repeatedly pays to
  prevent.

#### Consequences

- AC-10 is closed as rejected; the Issue's success measure is corrected from "local enforcement
  points 0 → 8", which counted displays and post-hoc feedback as gates, to separate counts for
  blocking gates (1), advisory feedback points (4), and session-context surfaces (1).
- Two counts in the Issue are corrected: **15** `scripts/validate-*.mjs` and **6** GitHub
  workflows, not 21 and 7. The 21 was a count of all npm scripts.
- The readiness pre-flight carries three unresolved design holes that its acceptance criterion now
  states explicitly: a `PreToolUse` hook on `gh pr create` sees only the command string, so an
  interactive editor body is invisible and the fail-closed-versus-fail-open choice must be stated;
  `workItem.labels` requires `gh issue view`, meaning network and auth, whereas every other
  validator here runs offline, which matters most for `.githooks/pre-push`; and
  `findLinkedIssueNumber()` (`scripts/work-item-readiness-check.mjs:11`) hardcodes
  `https://github\.com/` in its regex while this repository ships `.gitlab-ci.yml`.
- A pre-existing counterexample to this Issue's own containment rule is recorded but not closed
  here: `scripts/validate-qa-evidence.mjs` has no `package.json` script and no CI invocation, and
  is reached only by `test/qa-evidence.test.mjs`. AC-12's test must surface it; whether to wire it
  or document it as test-only is left open.
- Recording this ADR moves `npm run adr:audit` from 3.50:1 (14/4) to 2.80:1 (14/5) — it improves
  and stays far inside the 10:1 threshold. `DECISIONS.md` is not in `CANONICAL_FILES`, so this
  costs nothing against the 466-token context headroom.
- Owner: Human Maintainer (approval, granted 2026-09-08), then Developer Agent. This ADR authorises
  no implementation on its own.

### ADR-0021: Role-adapter parity via body comparison (Option B); relocate role-definitions.md's Terminal Dispatch section for headroom

- Date: 2026-09-07
- Work Items: [Issue #212](https://github.com/chakrits/AI-Agent-Workflow/issues/212) (IMP-006)
- Status: Accepted

#### Context

Issue #212 (IMP-006 — canonical-source consolidation and adapter conformance) requires AC-01
to decide, before implementation, which of three candidate mechanisms closes the gap that role
adapters under `.claude/agents/` have no drift gate across hosts, unlike the 38 skills which do.
It also requires AC-05: a measured `docs/workflow/role-definitions.md` context-budget audit,
since the canonical reading budget sat at 29,985/30,000 tokens, leaving no room to land AC-06/
AC-07 (wiring 5 unwired adapters, adding a Release Agent skill). SA Agent was dispatched twice:
once producing the Issue's own preliminary options table, and once (2026-09-07) to verify or
challenge that table against the actual current code and files, not the Issue's abstract example.

#### Decision

**AC-01: Option B — body-below-frontmatter comparison across `.claude/agents/`,
`.agents/agents/`, `.agent/agents/`.** Each tree keeps its own frontmatter; the parity check
compares only the content below it. SA's code-level check found every current adapter's
frontmatter is exactly three fields (`name`, `description`, `tools`) — not just `tools:` as the
Issue's illustrative example showed — and that adapter bodies contain no host-specific syntax.
**`name:` is pinned equal across all three trees even though `description` and `tools` are
allowed to diverge**, so a renamed adapter cannot drift invisibly past the check. Body content
is free to differ per host only in what `tools:` and `description:` legitimately require.

Option C (generated adapters, one canonical definition rendering per-host copies) was
considered and explicitly declined for this Issue's scope. SA found a real gap B does not
close: `.claude/agents/sa-agent.md`'s body is a condensed paraphrase of
`docs/workflow/role-definitions.md:104-138`, not a copy, so B's tree-to-tree comparison will
not catch an adapter silently diverging from the canonical role description — only C would.
The Human Maintainer weighed this and accepted it as an accepted residual gap for now: B
matches the guarantee the skill-parity mechanism already provides (copies agree with each
other), and C's cost (generation tooling, a staleness gate of its own, per Issue #212's own
cost table) is not justified for a single-user setup at this time. Revisiting C remains
possible if canonical-vs-adapter fidelity becomes a demonstrated problem.

**AC-05: relocate `docs/workflow/role-definitions.md`'s "Terminal Dispatch and Boss
Visibility" section (lines 36-44, measured 674 tokens) into the existing
`docs/workflow/task-execution-mode.md`, leaving a short pointer.** SA's sentence-level
similarity scan found the Issue's originally proposed lever — auditing `role-definitions.md`
against `AGENTS.md` for duplication — does not deliver: measured overlap is ~20-30 tokens, not
meaningful. The lever that does work is relocation under the pattern Issue #166 already
proved with `task-execution-mode.md`: `task-execution-mode.md` already states part of the
Terminal Dispatch content (the acknowledgement-pending rule, the Issue #35 cross-turn
resumption deferral, the `host_completion_unavailable` stop condition), so merging the rest
there and leaving a ~70-token pointer is a real relocation, not a token-shaving rewrite.
Measured resulting budget: **≈29,385/30,000 (≈615 tokens headroom)**, verifiable by running
`npm run validate:context-budget` after the edit.

SA also proposed a second, optional relocation — QA Agent's "Cross-Platform Acceptance
Criteria Gate" (`role-definitions.md:217-230`, 575 tokens) — which would recover a further
~505 tokens. **Declined for now.** It is a live gate QA reads on every handoff; the usability
cost of putting it behind a link was judged not worth it when the Terminal Dispatch move alone
already produces sufficient headroom for AC-06/AC-07 (SA's cost estimate: ≈150-300 tokens
combined, against ≈615 recovered). May be revisited later if more headroom is needed.

#### Alternatives Considered

- **Option A (byte parity, reuse the skill mechanism unchanged)** — rejected. Would force
  Claude-specific frontmatter (`tools:`, `description:`) to be mirrored byte-for-byte into
  every other host's tree, which is wrong in substance even though it makes a hash check pass.
- **Option C (generated adapters)** — rejected for now, not permanently. Strongest guarantee
  (closes the canonical-vs-adapter fidelity gap B leaves open) but the largest change: needs
  generation tooling and its own staleness gate across three trees. See Decision above.
- **Auditing `role-definitions.md` against `AGENTS.md` for duplication (the Issue's original
  AC-05 lever)** — rejected; SA's measurement found negligible overlap (~20-30 tokens), so
  this does not recover meaningful headroom.
- **Relocating QA's Cross-Platform Acceptance Criteria Gate alongside Terminal Dispatch** —
  deferred, not rejected outright. Recovers a further ~505 tokens but at a live-gate usability
  cost; unnecessary given the Terminal Dispatch move alone is sufficient for AC-06/AC-07.

#### Consequences

- AC-01 is closed: implementation may proceed under Option B once dispatched to Developer
  Agent, with tests for tree-parity-on-match, drift, missing-file, and `name:` mismatch
  (mirroring `test/validate-skill-parity.test.mjs`'s existing shape).
- AC-05's Terminal Dispatch relocation is approved and becomes a required implementation step
  before AC-06/AC-07 can land. It touches `docs/workflow/role-definitions.md`, which is pinned
  by sha256 11 times in `test/fixtures/context-pack-v1/required-source-matrix.json` — the
  implementing agent must run `npm run repin:source-matrix` as part of the same change, per
  the pattern Issue #215 built for exactly this class of edit.
- The QA Cross-Platform Acceptance Criteria Gate relocation is not authorized by this decision.
  A future ADR is needed if it is revisited.
- `.agents/agents/` and `.agent/agents/` do not exist yet and must be seeded as part of AC-02
  implementation; a parity check naively mirroring `validate-skill-parity.mjs`'s directory
  listing would throw `ENOENT` before seeding.
- Owner: Human Maintainer / SA Agent / Developer Agent (implementation not yet dispatched by
  this ADR).

### ADR-0020: Keep `validate-ci-parity.mjs`'s zero-command guard as-is; defer the `normaliseCommand` multi-line gap

- Date: 2026-09-07
- Work Items: [Issue #210](https://github.com/chakrits/AI-Agent-Workflow/issues/210), [Issue #212](https://github.com/chakrits/AI-Agent-Workflow/issues/212)
- Status: Accepted

#### Context

Issue #210's round-3 QA left open a design Question: `scripts/validate-ci-parity.mjs`'s
`githubJobCommands` throws when the named job's extracted command set is empty, and each of
the three QA rounds had found one more shape (missing job, empty steps, composite-action-only)
that reached this outcome. The QA framed this as "enumerating shapes that yield zero commands"
and asked whether the pattern is inherently unbounded — always one more shape away from a gap —
versus whether a positive-assertion approach would close the whole class at once. SA Agent was
dispatched to evaluate, analysis-only, no code change.

#### Decision

Keep the current `githubJobCommands` zero-command guard as-is. SA Agent's rereading of the
function found it is not a per-shape enumeration: it computes the command set with one loop,
then asserts a single shape-independent postcondition (`commands.size === 0` → throw). Round
3's own adversarial probe tried four further shapes specifically looking for a gap and found
none — under a genuinely per-shape enumeration a new shape should have slipped through, and it
did not. The Human Maintainer accepted this recommendation on 2026-09-07 without further review.

#### Alternatives Considered

- **Positive-assertion allowlist** (require the extracted set to contain at least one
  known-required command, e.g. `npm run validate:contracts`) — rejected. Strictly less
  detection power than the current guard for the case that matters (total silent failure,
  already caught), no power against partial silent failure (most commands dropped, one
  sentinel survives), and adds a new staleness/maintenance burden: the allowlist itself needs
  updating on every legitimate script rename, turning a routine rename into a confusing parity
  failure.
- **Snapshot/fixture pattern** (compare the extracted command set against a checked-in
  known-good snapshot) — rejected for this specific gap. This repo already has direct cost
  evidence against this shape: `test/fixtures/context-pack-v1/required-source-matrix.json`
  required a dedicated maintenance tool (`scripts/repin-source-matrix.mjs`, Issue #215) to stay
  usable, and a snapshot is defeatable by regenerating it in the same PR that introduces the
  regression it should catch.
- **Merge-base/branch-walk count comparison** (the pattern `adr-audit.mjs` and
  `validate-risk-register.mjs` already use for "did coverage silently shrink") — named as the
  architecturally consistent choice if a future decision determines the partial-drop class
  below needs closing, but not adopted here since `githubJobCommands` itself was found to have
  no residual gap.

#### Separate, Deferred Finding

While verifying the option above, SA Agent found a different, structurally unrelated risk one
level down, in `normaliseCommand`/`IGNORED_COMMAND_RE` (not `githubJobCommands`): a `run: |`
multi-line step's non-global `.match()` only extracts the first recognized command, and a block
whose first line matches `IGNORED_COMMAND_RE` (e.g. `npm ci`) is discarded whole, silently
dropping any real commands on later lines. Confirmed **not currently live** — every `run:` step
in `.github/workflows/validate-contracts.yml` is single-line. The Human Maintainer decided on
2026-09-07 to defer this rather than fix it now, since it is latent, not active.

#### Consequences

- No code change to `scripts/validate-ci-parity.mjs` from this decision.
- The Issue #210 round-3 design Question is closed; no further QA round is owed on it.
- The `normaliseCommand` multi-line gap remains latent and undecided-as-a-priority. It should
  be revisited if a `run: |` multi-line block is ever introduced into
  `.github/workflows/validate-contracts.yml`, or sooner at the Human Maintainer's discretion.
- Owner: Human Maintainer.

### ADR-0019: No-Go and freeze for IMP-003 T2-B

- Date: 2026-08-22
- Work Items: [Issue #133](https://github.com/chakrits/AI-Agent-Workflow/issues/133), [Issue #203](https://github.com/chakrits/AI-Agent-Workflow/issues/203)
- Status: Accepted — deferred

#### Context

T2-B expanded the framework into a controlled writer and publication system involving
protected refs, CAS enforcement, credentials, approval authority, retention, rollback, and
predecessor recovery. The Human Maintainer determined that the operational value is not yet
demonstrated for the current personal, single-user workflow and that the design/verification
overhead exceeds the current benefit.

#### Decision

Do not proceed with T2-B at this time. Freeze the code baseline at `a739286` and keep
Issues #133 and #203 as deferred initiatives. The SA design at `eb15450` is reference-only
and is not approved for implementation.

No Developer dispatch, `status:spec-ready`, Security Review, writer/publication activation,
authority migration, release, or Go/No-Go execution is authorized by this decision.

Reopening requires a new Human-approved scope, a demonstrated user-value hypothesis, and
explicit measurable exit criteria. This is a process/code freeze, not a destructive history
rewrite; all prior commits remain recoverable through Git history.

#### Consequences

- T2-A evidence and scope-cleanup work remain available as the frozen baseline.
- T2-B design artifacts remain deferred and create no runtime obligations.
- Future work should prioritize practical orchestration, dispatch, terminal-result consumption,
  and context efficiency over status publication infrastructure.

### ADR-0017: Use One Authoritative Path During Progressive Context and Status Migration

- Date: 2026-07-31
- Status: Accepted — Human Maintainer approved the independently-reviewed compatibility design and plan on 2026-07-31; CP-1 baseline/measurement evidence remains required before `status:spec-ready` and Developer dispatch
- Context: Issue #132 originally proposed reducing context and compiling a shared root status projection, but code-backed counter-review showed the token target was unsatisfiable as written, host activation was unproven, and committing a generated root projection could retain conflicts or silently lose updates. The accepted split created #132 for progressive context and #133 for worktree-scoped status. Both affect workflow routing, dispatch/handoff continuity, and project-state consumers.
- Decision: Use a bounded shadow compatibility migration with exactly one authoritative path per phase. Legacy behavior remains authoritative while the new path is read-only. Each slice runs its own 36-case deterministic corpus plus 20 historical replays; Slice B also runs 10 real-Git permutations. Context measurement protocol v1 requires host-native paired input-token observations, at least 36 per observable supported host, per-host median reduction of at least 50%, 5th-percentile reduction of at least 40%, and operational fallback at most 5%. After bounded live shadow, independent review/QA, and Human approval, authority may switch once; the legacy representation is then generated from the new source rather than independently written. Critical structured behavior requires 100% parity. Independent dual-write is prohibited. An incomplete live sample on day 30 remains blocked pending Human extension or termination.
- Alternatives Considered: Immediate cutover (rejected because host behavior and consumer completeness are not yet proven); permanent dual-write (rejected because it creates split-brain and attribution ambiguity); long-lived manual A/B worktrees (rejected because behavior can be paired using disposable worktrees without housekeeping debt); accepting an 85% context-reduction claim from corpus size alone (rejected because corpus size does not prove host boot loading).
- Consequences: #132 and #133 have separate implementation/Go decisions; new code must include normalized compatibility evidence and fail-closed fallback; feature branches do not independently commit a changing root status projection; compatibility removal requires a later Human approval. Existing dirty, detached, or host-managed worktrees remain preserved until owner disposition.
- Owner: Human Maintainer / Orchestrator / SA Agent
