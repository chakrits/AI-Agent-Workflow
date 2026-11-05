# Compressed Specification

## Identity and Source of Truth
- Work Item / Title / Owner / Status: Draft
- Intent reference:
- Source repository / full commit SHA / artifact paths:
- Human scope decision and approval evidence:

Pin the exact source commit for requirements and code evidence. Record source changes and revalidate affected scope/AC. Filling this template does not grant approval; `status:spec-ready` must precede implementation.

## Eligibility — All Six Checks Must Pass
| Gate | Required evidence / result | Mandatory exit if failed or unknown |
|---|---|---|
| E-1 Risk | `risk_level: low`; top-level and evidence classification agree | SA: `designing` + [SDD.md](SDD.md) |
| E-2 Security | `security_boundary_impact: none`; no auth/authz, secrets, crypto, PII/privacy, payment or Hook/CI control impact; inspect actual paths/diff | Security Reviewer + SA + Human gate |
| E-3 Architecture/API | `api_contract_impact: none`; no new/changed/deleted external/public/shared HTTP, RPC, CLI, event or schema contract, including additive changes; no cross-boundary multi-module impact | SA: `designing` + SDD |
| E-4 Data | `data_migration_impact: none`; no production-data change, migration or backfill | SA / Data Agent + Human gate |
| E-5 Clarity | INTENT questions resolved or owner explicitly approves clear scope; evidence linked | BA/PM or Human Maintainer |
| E-6 Verification | `status:spec-ready` before implementation; named QA/Code Reviewer has a distinct identity from implementer | Block self-approval; Orchestrator assigns independent verification |

- Eligibility assessor / evidence / decision:
- Independent implementer and reviewer identities:

Declared values require evidence and independent diff review. If risk or impact changes mid-flight, leave fast-track, record the reason, obtain SA design and applicable Human/Security review, then replan; historical fast-track evidence does not approve new scope. Use [dynamic-routing.md](../workflow/dynamic-routing.md) and [new-feature.md](../workflows/new-feature.md) for the governing lifecycle.

## Scope, Stories and Business Rules
- Problem / measurable outcome / target users:
- In scope / out of scope / assumptions:
- Resolved questions / unresolved blockers and owners:

| Story ID | Actor / need / value | Priority |
|---|---|---|
| US-001 | | |

| Rule ID | Rule | Authoritative source / owner |
|---|---|---|
| BR-001 | | |

## Acceptance and Verification
| AC ID / Story / Rule | Given / When | Exact expected result | Verification / evidence |
|---|---|---|---|
| AC-001 / US-001 / BR-001 | | | |

Cover applicable happy, negative, boundary, empty/null and failover cases; mark inapplicable cases with reasons. Name independent verification owner and required gates.

## Technical Impact and Plan
- Affected components / paths / interfaces:
- Error handling / NFRs / observability / test seams:
- Security, API and data evidence supporting `none` above:
- Alternatives / decision / ADR where required:
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) reference / dependencies / rollback:

## Canonical Equivalence
| Compressed content | Canonical artifact coverage |
|---|---|
| INTENT + Scope, Stories, Rules, AC | [REQUIREMENT_DISCOVERY.md](REQUIREMENT_DISCOVERY.md): summary, facts, assumptions, questions, scope, stories, AC, rules, risks and next step |
| Identity, scope, technical impact, verification | [SDD.md](SDD.md): metadata/context/goals, architecture/components, error handling, NFRs, alternatives/decision, testability and related links |
| Eligibility E-2–E-4 with evidence | SDD security, API and data sections are explicitly `none` only while all eligibility checks pass; any impact requires full SDD |

This mapping preserves required meaning. It does not waive discovery, design, independent review or Human gates. Reuse the existing implementation-plan template; do not create a competing plan artifact.
