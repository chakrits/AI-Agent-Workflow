# Debugging Rules

## Non-negotiables

- No reliable repro, no confident fix.
- No fail-path trace, no root-cause claim.
- No hypothesis survives if any breadcrumb contradicts it.
- Never delete or weaken tests simply to make CI pass.
- Never call a flaky issue fixed unless the flake rate is measured before and after.
- Record instrumentation tags and cleanup them before final handoff.

## Debug classification

Classify the failure before fixing:

| Failure Type | Primary Owner | Required Action |
|---|---|---|
| Product bug | Developer Agent | Fix implementation, QA validates original repro |
| Test bug | QA Agent / Automation Skill | Fix test logic/data/waiting strategy |
| Requirement ambiguity | BA Agent | Clarify expected behavior before fix |
| Architecture/API contract gap | SA Agent | Update design/API contract before implementation |
| Data/config issue | Data/Config Agent | Validate data/config and rollback plan |
| Security-sensitive bug | Security Reviewer | Review trust boundary/control impact |
| Environment issue | DevOps/Release Agent | Capture env diff and remediation |

## Flaky failures

For flaky failures:

1. Capture current flake rate.
2. Increase signal: loop, parallelize, stress, isolate time/data/network.
3. Identify deterministic trigger or high-rate repro.
4. Validate fix with enough repeated runs to show meaningful reduction.

## Instrumentation

- Use unique grep-able prefixes: `[DBG-xxxx]`.
- Keep probes minimal and close to suspected seam.
- Remove probes before final patch unless they become intentional diagnostics.
