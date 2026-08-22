# Implementation Plan: Issue #196 — T2-A Evidence Harness Hardening

## Source and decision

- Issue: https://github.com/chakrits/AI-Agent-Workflow/issues/196
- Parent: https://github.com/chakrits/AI-Agent-Workflow/issues/133
- Decision: Treat the two Major findings from the final review of #133 as a new auditable follow-up task. Do not increase #133's rework budget implicitly.
- Candidate base: `ef3aea52b7652de957d986d09e55893a9b1eb445` — final T2-A implementation plus handoff. The earlier `b974e39345f29a96ee723cbd4d568550874aa7c2` base predates the T2-A files.

## Objective

Make the T2-A evidence harness prove input-driven manifest execution and exact applicable schema/runtime parity without changing T2-A production behavior.

## Scope

- Primary file: `test/status-cas-decision.test.mjs`
- Supporting manifest, corpus, and fixture data only when needed to make cases input-driven.
- Test-only evidence and handoff/state updates required to describe the result.
- Out: `scripts/lib/status-cas-decision.mjs), T2-B, writer/publication, authority, orchestration, dispatch/relay, lifecycle, credentials, and dependency behavior.

## Implementation

- Removed scenario-keyed operation selection and hidden base-fixture substitution.
- Added complete resolved inputs for cases that previously depended on base overlays.
- Added an adversarial resolved-fixture mutation regression.
- Replaced the arithmetic parity counter with manifest-ID-derived exact/N/A evidence, including documented schema N/A reasons for approval, manifest, recordDigest, and record-digest semantic cases.

## Verification

- Focused CAS/manifest tests: 21/21.
- Manifest: 52/52 IDs executed once; no omissions or duplicates.
- Full suite baseline: 500/508 with eight inherited failures; after: 501/509 with the same eight failures and no new unrelated failure.
- Required repository validators and `git diff --check` are recorded in the handoff.

## Handoff

Developer Agent → independent Code Review → QA only after review pass → Human Approval.
