# Framework Metrics Dashboard

The dashboard is a compatibility projection captured by `scripts/validate-metrics.mjs` and surfaced in CI via `npm run validate:metrics`. Structured evidence defined by the IMP-001 measurement specification is the future authority; TASK_LOG parsing remains historical until that evidence exists.

## How to regenerate

```bash
npm run validate:metrics
```

The script reads `TASK_LOG.md`, `package.json`, `test/`, `DECISIONS.md`, `RISKS.md`, `docs/contracts/`, and `.agents/skills/` and prints a framework health dashboard. No side effects; safe to run locally and in CI.

## Historical baseline (2026-07-25)

| Metric | Baseline | Target | Notes |
| --- | --- | --- | --- |
| Total work items | 88 | track trend | Rows in `TASK_LOG.md` starting with a date. |
| Subagent timeout rate | 1.1% | <10% | Entries whose Notes column mentions `timeout` / `timed out`. |
| Rework rate | 2.3% | <15% | Entries whose Notes column mentions `rework`. |
| Test files | 15 | track trend | `test/*.test.mjs` files. |
| CI checks (npm scripts) | 12 | track trend | Entries in `package.json` `scripts`. |
| ADRs | 11 | track trend | `### ADR-` headings in `DECISIONS.md`. |
| Risks tracked | 7 (5 open, 2 closed) | track trend | Rows in `RISKS.md` starting with `| R-`. |
| Contracts | 2 | 8 (one per workflow type) | `*.yaml` workflow contracts in `docs/contracts/`. |
| Skills | 25 | track trend | Skill directories in `.agents/skills/`. |

## Bound observed snapshot

This snapshot is tied to commit `5d70f6e` and is not a floating current value.

| Observation | Value |
|---|---|
| Observed at | 2026-08-15T12:12:14Z |
| Command | `npm run validate:metrics` |
| Total work items | 27 |
| Keyword-derived timeout rate | 1 / 27 (3.7%) |
| Keyword-derived rework rate | 1 / 27 (3.7%) |
| Test files | 24 |
| CI checks | 16 |
| ADRs | 1 |
| Risks tracked | 2 (2 open, 0 closed) |
| Contracts | 4 |
| Skills | 38 |

The snapshot is historical compatibility evidence. It must not be used as authoritative telemetry or a pass/fail decision until structured event evidence is available.

## Targets rationale

- **Subagent timeout rate <10%**: the baseline sits well below this threshold; the target keeps a headroom buffer against the historical 13% peak observed before the 2026-07-22 sync work.
- **Rework rate <15%**: mirrors the two-rework budget encoded in the Bug Fix workflow contract; a sustained breach signals a requirements or handoff gap.
- **Contracts = 8**: one machine-checkable contract per workflow type (Bug Fix, New Feature, Config, Data, API Contract, Release, Hotfix, Documentation). Two exist today; the remaining six are prioritized by the project roadmap.
- **Track trend** items have no hard ceiling; the dashboard exists to surface drift, not to gate a pass/fail.

## CI integration

- **GitHub Actions**: `.github/workflows/validate-contracts.yml` runs `npm run validate:metrics` after the other validators.
- **GitLab CI**: `.gitlab-ci.yml` runs `validate_metrics` as a separate `validate`-stage job.

The script exits 0 unconditionally today (dashboard is informational); a future iteration may introduce thresholds that fail CI.
