# Workflow: New Feature

```text
PM/BA -> SA -> Developer -> QA -> Security if relevant -> Release
```

## Use when

- A new user-facing capability is being added.
- A new API endpoint or integration is being introduced.
- The change adds behavior the system does not have today, rather than fixing
  or adjusting existing behavior.
- If the request is still a vague idea without user stories or acceptance
  criteria yet, start at [[feature-discovery-to-plan.md]] first.

## Canonical Contract

Use `docs/contracts/new-feature-workflow.yaml` ([[../contracts/new-feature-workflow.yaml|new-feature-workflow.yaml]]) as the canonical New Feature policy.
Before each handoff, validate the work item's `task-state`; the contract defines
the allowed states, transitions, evidence requirements, and rework budget (1 rework).

## Compressed Low-Risk Route

`discovery -> planning -> implementing` may use
[INTENT.md](../templates/INTENT.md) and [SPEC.md](../templates/SPEC.md) when all
six eligibility gates in SPEC pass: low risk, no security-boundary impact, no API
contract impact (including additive endpoints), no data migration, clear testable
requirements, and independent verification. SPEC carries the canonical discovery
and SDD-equivalent sections; filling it does not grant approval. The contract
requires `compressed_spec_reference` and `spec_readiness_gate_result` before
implementation. Existing standard SA routes remain available at every risk level.

Top-level classification and evidence must agree whenever both are recorded:
`change_type`, `risk_level`, `risk_tier`, `contains_pii`, and `data_change_kind`
(compared as a set). Transition eligibility also checks top-level fields when present.
Branch selection uses only the earlier history within the current discovery
episode. A previous `designing -> planning` selects standard SA implementation;
future design cannot authorize earlier implementation, and a new discovery
episode invalidates earlier design authority.

Historical fast-track decisions may carry an optional `classification_snapshot`
with the four risk/impact fields. If current classification no longer qualifies,
record a meaningful `risk_escalation_reason`, `redesign_scope`, `design_gap`, or
`requirement_gap`. Route through `designing -> planning`, retaining SDD and
BA/SA approval evidence, then the standard implementation gate with
`sa_dev_gate_result`. Until remediation, only `discovery`, `designing`, `rework`,
or `blocked` are valid hold states; snapshots never waive Security review.

### Fast-Track Sunset and Recovery

After adoption, preserve the history reader and schema; never rewrite audit events
or revert support for persisted fast-track histories. Disable both fast branches
with `historical_only: true` and record `sunset_effective_at` in the policy.
The validator compares parsed epoch instants: events after cutoff reject, even
for completed records; invalid event/cutoff timestamps reject. Equal instants,
fractional seconds and timezone offsets are handled chronologically.

Completed pre-cutoff records remain readable. Existing in-flight records may hold
in the four remediation states above. Planning, implementing, verifying and
human-review require subsequent `designing -> planning`; standard implementation
then requires SA approval. This permits stepwise recovery without falsifying history.

## Backward Routing

Use `docs/contracts/new-feature-workflow.yaml` as the source of truth for the
complete transition/evidence matrix. The playbook should summarize only these
common routes:

- Requirement gap → BA / discovery
- Architecture or API contract gap → SA / designing
- Plan gap → planning
- Verification failure → rework, with the contract's one-rework limit before blocked

## Required Outputs

- PROJECT_BRIEF.md ([[../templates/PROJECT_BRIEF.md|PROJECT_BRIEF.md]]) or user story
- REQUIREMENT_DISCOVERY.md ([[../templates/REQUIREMENT_DISCOVERY.md|REQUIREMENT_DISCOVERY.md]])
- SDD.md ([[../templates/SDD.md|SDD.md]]) or eligible SPEC.md ([SPEC.md](../templates/SPEC.md))
- TECHNICAL_DESIGN.md ([[../templates/TECHNICAL_DESIGN.md|TECHNICAL_DESIGN.md]]) if needed
- TEST_PLAN.md ([[../templates/TEST_PLAN.md|TEST_PLAN.md]])
- TEST_REPORT.md ([[../templates/TEST_REPORT.md|TEST_REPORT.md]])
- RELEASE_PLAN.md ([[../templates/RELEASE_PLAN.md|RELEASE_PLAN.md]])

## Gate Rules

Full state/evidence rules live in the New Feature contract (see Canonical
Contract above). Before completion, confirm evidence for:

- SDD is approved before standard implementation; eligible compressed SPEC has its specification-readiness approval before fast-track implementation.
- Acceptance criteria are testable, not aspirational.
- The implementation plan includes verification steps, not just build steps.
- Security review is complete when the feature touches auth, secrets, or PII.

## Handoff

Include:

- PR/commit/branch
- changed files
- test evidence (unit, functional, and/or E2E as applicable)
- regression focus / areas most likely to be affected by this change
- release plan reference
