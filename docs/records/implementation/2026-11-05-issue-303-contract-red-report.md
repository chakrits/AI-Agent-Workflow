# Implementer Report — Issue #303 Contract RED

| Field | Value |
|---|---|
| Work Item / Task ID | Issue #303 / IMP-303-02 |
| Base SHA | `d28ac8cc44170dab0bfa95ddc85751c7c3cce09c` |
| Head SHA | No RED-only commit created; uncommitted patch over the pinned base, SHA-256 `32c3524e8974cda04f3ad2e2ffb4bf1823970e3ec7b06d8ebd78d5df87917850` (`git diff -- test/validate-contracts.test.mjs`) |
| Status | DONE — RED artifact only; requires independent review and IMP-303-03 GREEN |
| Terminal Result ID | `issue303-contract-red-d28ac8c-20261105-01` |
| Implementation owner | `/root/issue303_orchestrator/contracts_red` (Developer Agent) |

## Changed Paths
- `test/validate-contracts.test.mjs`: 44 new production-seam cases; temporary fixture roots copy real contracts/schema, only sunset metadata is altered. No copied validator/prototype logic.
- This report; other concurrent records/templates belong to their respective owners.

## Verification
| Command | Result |
|---|---|
| Before edits: `node --test --test-reporter=dot test/validate-contracts.test.mjs` | exit 0; original 73 tests passed |
| `node --test --test-reporter=tap --test-name-pattern='^issue-303:' test/validate-contracts.test.mjs` | exit 1; 44 tests, 2 pass, 42 requirement-assertion failures, 0 cancelled/skipped |
| Requested `node --test --test-reporter=dot --test-name-pattern='^(?!issue-303:)' test/validate-contracts.test.mjs` | exit 1; this Node runner included new cases despite the negative-lookahead selector; not evidence of a baseline regression |
| Corrected `node --test --test-reporter=tap --test-skip-pattern='^issue-303:' test/validate-contracts.test.mjs` | exit 0; 73 original tests passed, 0 failures |
| `git diff --check` | exit 0 |

RED TAP was captured before any production edit at `/private/tmp/issue303-contract-red.tap`; SHA-256 `2b5e29db863e90c44486108caea512c7b6f89b2a908d44432c4c455c2c89c48f`. The file is temporary; durable scenario outcomes and failure reasons are retained below. Concurrent doc-only commits may advance HEAD without changing this production baseline.

## Scenario-to-Test Mapping and Expected RED Reasons
- TC-001: fast-track discovery/planning and fast implementation absent; current output includes `illegal transition: discovery -> planning` and missing `sa_dev_gate_result`.
- TC-002: risk high/low and low/high, config risk_tier, data contains_pii and data_change_kind disagreement currently accepted; expected parity diagnostics absent. Missing risk evidence already rejects on baseline and is retained as a passing negative test.
- TC-003.1: security/authz, additive API and schema migration require field-specific eligibility rejection; current missing-fast-track diagnostics do not satisfy that requirement.
- TC-003A/B: historical low snapshots plus current high classification and subsequent SA route must pass; current validator cannot replay fast history. TC-003C standard same-episode replan already passes and is preserved.
- TC-003D: five advanced states and rework bypass require escalation diagnostic; future design and previous-episode design must not authorize earlier standard implementation; missing meaningful reason must reject. Current missing branch/selection logic produces different diagnostics.
- TC-003E1: all four hold states, then stepwise designing/planning/standard implementing recovery must pass; current fast history is illegal.
- TC-003E2: four active advanced states require explicit historical_only remediation diagnostics; absent currently.
- TC-003E3: completed pre-cutoff history remains readable and input remains byte/structure-equivalent.
- TC-003E4: before/equal/offset-equal accepted; fractional-after/second-after/offset-after rejected for cutoff, invalid event and invalid policy timestamps rejected explicitly. Missing fast routes currently prevent these intended outcomes.
- Optional classification_snapshot: missing risk, invalid risk enum, empty impact and unknown property must reject via schema; all four currently pass, proving strict snapshot schema is missing.
- All new fixtures are schema-valid under current schema except the four deliberate future snapshot-schema negatives; no syntax/import/setup failure was accepted as RED. Data contains_pii uses the real schema enum string `yes` rather than boolean.

## Durable RED Test Outcomes
```text
not ok 1 - issue-303: TC-001 fast-track completes and all 10 canonical examples stay valid
not ok 2 - issue-303: TC-002 risk parity high/low
not ok 3 - issue-303: TC-002 risk parity low/high
ok 4 - issue-303: TC-002 risk parity low/undefined
not ok 5 - issue-303: TC-002 config-change authoritative risk_tier cannot contradict evidence
not ok 6 - issue-303: TC-003.1 rejects fast-track security_boundary_impact
not ok 7 - issue-303: TC-003.1 rejects fast-track api_contract_impact
not ok 8 - issue-303: TC-003.1 rejects fast-track data_migration_impact
not ok 9 - issue-303: TC-003A accepts completed SA remediation and standard replanning
not ok 10 - issue-303: TC-003B accepts completed SA remediation and standard replanning
ok 11 - issue-303: TC-003C accepts completed SA remediation and standard replanning
not ok 12 - issue-303: TC-003D unremediated escalation cannot advance to planning
not ok 13 - issue-303: TC-003D unremediated escalation cannot advance to implementing
not ok 14 - issue-303: TC-003D unremediated escalation cannot advance to verifying
not ok 15 - issue-303: TC-003D unremediated escalation cannot advance to human-review
not ok 16 - issue-303: TC-003D unremediated escalation cannot advance to release
not ok 17 - issue-303: TC-003D rework cannot skip design after escalation
not ok 18 - issue-303: TC-003D future design does not authorize an earlier standard implementation
not ok 19 - issue-303: TC-003D discovery resets design authority from an earlier episode
not ok 20 - issue-303: snapshot escalation requires a meaningful reason
not ok 21 - issue-303: TC-003E1 sunset allows existing remediation hold in designing
not ok 22 - issue-303: TC-003E1 sunset allows existing remediation hold in rework
not ok 23 - issue-303: TC-003E1 sunset allows existing remediation hold in blocked
not ok 24 - issue-303: TC-003E1 sunset allows existing remediation hold in discovery
not ok 25 - issue-303: TC-003E1 sunset recovery validates each handoff through standard implementation
not ok 26 - issue-303: TC-003E2 sunset blocks unremediated planning
not ok 27 - issue-303: TC-003E2 sunset blocks unremediated implementing
not ok 28 - issue-303: TC-003E2 sunset blocks unremediated verifying
not ok 29 - issue-303: TC-003E2 sunset blocks unremediated human-review
not ok 30 - issue-303: TC-003E3 completed pre-sunset history remains readable without mutation
not ok 31 - issue-303: TC-003E4 cutoff before uses chronological instants
not ok 32 - issue-303: TC-003E4 cutoff equal uses chronological instants
not ok 33 - issue-303: TC-003E4 cutoff fractional-after uses chronological instants
not ok 34 - issue-303: TC-003E4 cutoff second-after uses chronological instants
not ok 35 - issue-303: TC-003E4 cutoff offset-equal uses chronological instants
not ok 36 - issue-303: TC-003E4 cutoff offset-after uses chronological instants
not ok 37 - issue-303: TC-003E4 cutoff invalid uses chronological instants
not ok 38 - issue-303: invalid sunset policy timestamp fails closed
not ok 39 - issue-303: classification_snapshot schema rejects (snapshot) => { delete snapshot.risk_level; }
not ok 40 - issue-303: classification_snapshot schema rejects (snapshot) => { snapshot.risk_level = 'unclassified'; }
not ok 41 - issue-303: classification_snapshot schema rejects (snapshot) => { snapshot.api_contract_impact = ''; }
not ok 42 - issue-303: classification_snapshot schema rejects (snapshot) => { snapshot.unapproved_override = true; }
not ok 43 - issue-303: TC-002 data-change contains_pii parity is authoritative
not ok 44 - issue-303: TC-002 data-change data_change_kind parity is authoritative
```

## Known Limitations / Blocker
- This is expected RED, not implementation acceptance; no Green, independent QA, security approval, commit, push or labels performed by this child.
- The missing fast-track transition masks deeper temporal cases on baseline. Their expected diagnostics and acceptance assertions remain fixed for GREEN and independent review.
- Task Brief's baseline-only negative-lookahead selector is unreliable here; explicit skip-pattern produced definitive original-suite evidence.
- Parent must obtain distinct test-artifact review before dispatching IMP-303-03. No known-failing RED-only commit should be made.
