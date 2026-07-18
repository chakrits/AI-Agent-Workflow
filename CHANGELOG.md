# CHANGELOG.md

## Unreleased

### Added
- Portable readiness traceability contract: canonical Acceptance Traceability Matrix and Platform Activation Record templates, portable GitHub/GitLab Work Item and Change Request fields, plus validation that requires evidence or a reasoned `N/A` before QA-pass evidence is accepted.
- GitHub Issue #19 lifecycle contract: phase/status label taxonomy, specification gate, explicit Developer-to-QA handoff, GitHub/GitLab Work Item and Change Request templates, and regression coverage. GitHub `work-item-readiness-freshness` is an App-owned, source-pinned required check that re-evaluates lifecycle label changes; GitLab retains its documented CI/template/manual boundary.
- Work Item readiness has a tested pure decision module and platform-readiness operations for the App-owned GitHub lifecycle evaluator plus GitLab's manual/no-credential API boundary. The former read-only GitHub adapter/manual-rerun approach is superseded by PRs #23 and #24.
- Canonical collaboration personas for all 11 roles, with concise Claude references and portable/Antigravity dynamic-workflow discovery. Persona guidance adds professional warmth and emotional calibration while explicitly remaining subordinate to policy, evidence, and human gates.
- Post-merge closeout contract: progress labels for implementation and verification, a normal-merge documentation handoff signal, and loop-safe closeout completion while retaining exception-only `documentation-sync` Issues.
- Cross-platform QA acceptance-criteria gate: independent QA verification, common Work Item/Change Request/evidence handoff fields, matching GitHub PR and GitLab MR templates, and regression coverage. GitLab default-branch exception-Issue creation remains manual until separately approved API automation exists.
- `frontend-ui-engineering` portable skill with Claude and Antigravity adapters: design-system-aware, accessible, responsive UI guidance and a `qa-playwright-testing` handoff, with regression coverage.
- Pre-merge Documentation Impact templates and GitHub validation gate; a project-state stale-marker validator and GitHub/GitLab default-branch audit that opens `documentation-sync` issues only on failure.
- Phase 1 Bug Fix workflow contract validation completion record and independent reviewer / QA handoff.
- Mandatory post-merge Documentation Agent review rule, template, and regression coverage.
- Canonical PM Agent business-framing rule, expanded `PROJECT_BRIEF.md` template, and regression coverage.
- Orchestrator Agent unclassified-request rule, escalation tiers, decision routing checklist, and regression coverage.
- SA Agent architecture pattern selection, dependency boundary rule, API contract governance, and Django/Postgres migration-safety rule, with an expanded `SDD.md` template and regression coverage.
- BA Agent illustrative UX sketch rule with an explicit boundary against SA Agent's design work and a production-UI escalation path, with an expanded `REQUIREMENT_DISCOVERY.md` template and regression coverage.
- QA Agent canonical/adapter fix with evidence-based reporting, API contract validation, and NFR validation rules, plus an expanded `TEST_PLAN.md` and `qa-playwright-testing` automation discipline, with regression coverage.
- Developer Agent architecture compliance, definition-of-done restatement, incremental verification, escalation, and scope discipline rules, with regression coverage.
- Orchestrator Agent contradiction detection/resolution rule and a routing circuit breaker generalizing the Bug Fix contract's retry budget to every flow, with regression coverage.
- Assumptions Surfacing technique in `requirement-brainstorming` (synced across all adapter copies) and an `AGENTS.md` Boundaries (Always/Ask First/Never) index, with regression coverage.
- New `git-workflow-and-versioning` skill (atomic commits, commit message convention, pre-commit hygiene, change-summary format), an `AGENTS.md` Change Sizing subsection, and enrichments to `tdd-implementation`, `code-review-gate`, and `implementation-planning`, with regression coverage.
- Security Reviewer scan checklist, security-specific severity scale, fix-before-merge/hardening-opportunity rule, and chained-findings discipline, adapted to the Django/DRF/PostgreSQL stack, plus an expanded `SECURITY_REVIEW.md`, with regression coverage.
- Release Agent versioning/changelog contract, release evidence checklist, triple rollback confirmation, and deployment strategy statement, plus an expanded `RELEASE_PLAN.md`, with regression coverage.
- Config Agent and Data Agent rules (config/data boundary, reload behavior, feature-flag lifecycle, non-destructive data mechanics, the boundary against SA Agent's migration rule, PII routing, and an escalation guard on both against disguised code changes), plus expanded `CONFIG_CHANGE_PLAN.md`/`DATA_CHANGE_PLAN.md` and the shared `data-config-change` skill, with regression coverage. This completes role enrichment for all 11 roles.
- `.gitlab-ci.yml`, mirroring the existing GitHub Actions validation job, so hosted CI works when this repo is cloned/hosted on GitLab.

- `qa-playwright-testing` skill enrichment: a Technical Reference (selector priority, Page Object Model, assertions/network-mocking/auth-state examples), a Debugging Workflow built on `debugging-discipline`, and a Browser Content Security Boundary (browser output is untrusted data), with regression coverage.
- `qa-playwright-testing` BDD Scenario Workflow, recommending `playwright-bdd` for Gherkin-based E2E tests when explicitly requested (necessity check, scenario approval gate, scenario writing rules, scoped steps), with regression coverage.

### Changed
- Project state was reconciled after PR #17: canonical agent personas are merged, QA evidence is complete, and the successful default-branch audit created no documentation-sync exception.
- Documentation review now happens in the source PR/MR before merge; post-merge review records and issues are exception-driven rather than created for every merge.
- The post-merge `documentation-sync` trigger was verified live: PR #2 created GitHub issue #3 with the source PR and merge evidence required by Documentation Agent.
- `README.md` updated for team onboarding: explicit clone/install steps, a Prerequisites note (Node.js 22+, git — and that the Django/Python/PostgreSQL references elsewhere describe the target application stack, not a dependency of this repo), and links to both CI configs.
- Phase 1 contract-first Bug Fix workflow foundation was merged into `main` through Pull Request #1.
- Documentation Agent now assesses project index, status, history, changelog, decisions, risks, and canonical/adapter parity after every merge into `main`.
- PM Agent instruction branch merged into `main` after final whole-branch review approval.

### Fixed
- Post-merge closeout handoff: corrected the GitHub Script's nested-template syntax and granted the closeout job the required pull-request write permission; added compile and job-scoped permission regression coverage. The live PR #14 audit and a rerun both passed without duplicate handoff output.
- R-001 (Phase 1 hosted-CI confirmation) closed: Human Reviewer confirmed hosted CI is merged and running on `main`. See `RISKS.md`.
- `docs/operating-model/SKILL_CATALOG.md` reconciled with the real `.agents/skills/` directory: corrected a stale path, added three missing skill entries, and removed four Planned Skills rows already superseded by implemented skills. Added a regression test guarding against this drift recurring.

### Security
- 
