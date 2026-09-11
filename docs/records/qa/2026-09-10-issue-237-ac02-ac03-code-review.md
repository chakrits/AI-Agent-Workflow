# Code Review Record — Issue #237 AC-02/AC-03

Scope: first implementation slice for Issue #237 (IMP-008), limited to AC-02 and AC-03. The
change replaces duplicated policy text in `AGENTS.md` with pointers to the approved canonical
documents. AC-05 onward, AC-04/AC-06 withdrawn work, AC-13, AC-14, Issue #236, and Issue #237
labels remain out of scope.

## Acceptance criteria verification

- **AC-02 — PASS.** `AGENTS.md` now says: `Load docs/workflow/handoff-contract.md before
  emitting any handoff.` The canonical contract retains all 46 required fields in the same order;
  `docs/templates/HANDOFF.md` remains unchanged and retains the same field set. The pointer is
  imperative because this is the approved boot-to-on-demand crossing.
- **AC-03 — PASS.** `AGENTS.md` now points to
  `docs/workflow/dynamic-routing.md#lifecycle-labels-for-feature-and-enhancement-work` and
  names the `Specification Readiness` and `Standard and Backward Paths` subsections. The target
  retains the lifecycle label table, readiness rule, standard path, backward path, and the rule
  to remove the superseded phase label.
- **Policy preservation — PASS.** No policy text was removed from either canonical destination;
  only the duplicated copies in `AGENTS.md` were replaced by pointers. The source matrix was
  re-pinned with `npm run repin:source-matrix` for the changed `AGENTS.md` hash entries.

## TDD and mutation evidence

The focused pointer tests were written first and failed on the baseline because `AGENTS.md`
still contained the duplicated blocks. After the pointer edit they passed. Two targeted mutation
probes were then run against the shipped test seam:

| Mutation | Expected result | Observed result |
|---|---|---|
| Remove the imperative handoff pointer | focused AC-02 test fails | Killed |
| Retarget `Standard and Backward Paths` in the canonical routing document | focused AC-03 test fails | Killed |

No assertion was removed. The former parity assertion that read the 46 fields from `AGENTS.md`
was replaced with a pointer assertion; the canonical contract and template remain independently
checked against the same 46-field list.

## Verification

- `npm test` — **716/716 pass**.
- `npm run validate:context-budget` — **PASS**, 29,080/30,000 tokens.
- `npm run validate:contracts` — **PASS**.
- `npm run validate:skill-parity` — **PASS**, 39/39.
- `npm run validate:adapter-parity` — **PASS**, 11/11.
- `npm run validate:ci-parity` — **PASS**.
- `npm run validate:project-state` — **PASS**.
- `npm run validate:review-gate` — **PASS** after the QA record is included; no production script
  changed.
- `git diff --check` — **PASS**.

## Change summary

CHANGES MADE:

- `AGENTS.md`: replaced the Required Handoff field list with an imperative canonical pointer and
  replaced the duplicated Lifecycle Label Contract with the approved dynamic-routing pointer.
- `test/validate-contracts.test.mjs`: verifies pointer presence, absence of the stale handoff
  list, preservation of the canonical 46-field vocabulary, and lifecycle target subsections.
- `test/fixtures/context-pack-v1/required-source-matrix.json`: re-pinned `AGENTS.md` hashes.
- `PROJECT_STATUS.md`, `TASK_LOG.md`: recorded the slice and next QA/human-review handoff.

NOTICED BUT NOT TOUCHING:

- `docs/workflow/handoff-contract.md` and `docs/workflow/dynamic-routing.md` are the canonical
  destinations and were verified in place; their policy text is unchanged.
- AC-05, AC-07, AC-08, AC-09, AC-11, AC-12, AC-13, and AC-14 remain separate work items or
  later slices as required by ADR-0023.

CONCERNS:

- The measured budget is 29,080/30,000 on this baseline. AC-11's ≤26,300 target depends on the
  later approved relocations, so this slice makes no claim that AC-11 is complete.

## Review decision

Developer result: **DONE** for AC-02/AC-03, rework count **0/2**. Independent QA should
re-derive the destination content and repeat the pointer mutation probes before Human Maintainer
merge approval. No merge or Issue label change is authorized by this record.
