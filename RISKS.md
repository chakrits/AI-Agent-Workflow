# RISKS.md

| ID | Risk | Area | Severity | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | The first hosted GitHub Actions run for Phase 1 on `main` has not been recorded. | CI validation | Medium | Medium | Review and record the first GitHub Actions run on `main`; route a failure through the applicable QA/debugging workflow. | Reviewer / QA Agent | Closed — 2026-07-15: Human Reviewer confirmed Phase 1 hosted CI is merged and running on `main`. |
| R-002 | `.gitlab-ci.yml` has not been validated on a live GitLab runner. | CI validation | Low | Medium | Review the first GitLab pipeline and record its result; route a failure through QA/debugging. | Reviewer / QA Agent | Open |
