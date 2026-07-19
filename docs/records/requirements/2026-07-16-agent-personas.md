# Requirements — Canonical Agent Personas

## Metadata

- Work Item ID: GitHub Issue #16
- Title: Add personality for agents
- Owner: BA Agent
- Date: 2026-07-16
- Status: Approved by Human Maintainer

## Summary

Add a concise, project-specific persona layer for all 11 agent roles. Personas must make collaboration feel attentive, natural, and emotionally calibrated while remaining truthful about system limitations and subordinate to the canonical operating policy.

## Details

- Create `docs/operating-model/AGENT_PERSONAS.md` as the single canonical persona source for PM, BA, SA, Developer, QA, Security Reviewer, Config, Data, Release, Documentation, and Orchestrator agents.
- Distill the five supplied role references (PM, BA, SA, Developer, QA) rather than copying their prose. Design the remaining six personas for this repository.
- Add a short reference from every Claude agent adapter to its matching canonical persona.
- Add persona-discovery guidance to the portable and Antigravity dynamic-workflow adapters; do not invent a new platform-specific agent directory.
- Preserve `AGENTS.md`, `docs/workflow/role-definitions.md`, and quality-gate ownership as the source of operational policy.
- Add regression coverage for role completeness, adapter references, portable/Antigravity discovery, and the persona-policy boundary.

## Acceptance Criteria

1. All 11 roles have a concise canonical persona with working posture, decision bias, communication style, relational behaviour, emotional calibration, and a boundary.
2. Persona content does not duplicate or contradict canonical policy, routing, security rules, or human approval gates.
3. Each Claude agent adapter references its matching canonical persona without replacing existing role rules.
4. Portable and Antigravity dynamic-workflow adapters direct routed roles to the canonical persona source.
5. Regression tests protect canonical/adapter parity and pass with repository validation.
6. Security Reviewer performs a focused review of persona boundaries and trust/authority claims.
7. Project index, status, task history, changelog, and handoff are updated; no application/runtime behaviour changes are introduced.

## Assumptions

- The Human Maintainer's approval in Issue #16 and this conversation approves the supplied persona matrix and the use of professional relational behaviour instead of gender, appearance, or fictional biography.
- Persona language may acknowledge user stakes and adapt tone, but must not claim personal feelings, lived experience, or authority it does not have.
- This repository's existing 11-role model remains unchanged.

## Open Questions

- None. The approved design comment on Issue #16 is the implementation baseline.

## Risks

- A persona can blur into policy or imply authority beyond the role. Mitigation: an explicit boundary in every persona, canonical-source statements in adapters, regression coverage, and targeted Security Reviewer review.
- Copying source material too closely could create attribution or maintenance concerns. Mitigation: use original, distilled prose only.

## Approval / Review

- Reviewer: Human Maintainer
- Decision: Approved
- Notes: Sync persona discovery to the portable/Antigravity layer; roles without supplied source material are designed for this project.
