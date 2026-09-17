# Issue #277 Package 1 — Rework Code Review

| Field | Value |
|---|---|
| Candidate | `feat/control-plane-state-integrity` after rework cycle 1 from independent review `2d718e4` |
| Decision | READY_FOR_INDEPENDENT_VERIFICATION |
| Rework | Cycle 1 of maximum 2 |
| Skills Used | `debugging-discipline`, `tdd-implementation`, `js-unit-testing`, `mutation-testing`, `implementation-planning`, `verification-before-completion`, `code-review-gate`, `git-workflow-and-versioning` |

## CR mapping

- **CR-001:** Projection publication stores the pre-guard generation and compares it again inside
  the projection commit guard before the atomic rename. A barrier test bumps the generation at guard
  acquisition and proves `FENCING_TOKEN_STALE` with no publication.
- **CR-002:** Compensation validates phase, attempt generation, immutable intent digest, exact
  archive-only location and current generation both before and immediately before `archive → active`.
  A barrier test advances generation at compensation guard acquisition and proves zero reverse rename.
- **CR-003:** CLI transition/resume rejects paths outside the canonical work-item shard and every
  pure transition candidate requires an explicit expected digest. Policy validation remains in the
  guarded disk API.
- **CR-004:** Actor declarations normalize to lowercase kebab-case and are checked against
  `ROLE_REGISTRY` before exact matrix authorization; history records the canonical actor.
- **CR-005:** Malformed-lock recovery re-reads immediately before generation bump/unlink and returns
  `LOCK_BECAME_VALID` while preserving replacement bytes.
- **CR-006:** Existing active shards `issue-249` and `issue-275` were migrated to v2 with generation
  records and byte-preserving rollback sidecars. Migration is idempotent and strict active validation
  now executes on the migrated real tree.
- **CR-007:** Added production-seam runtime tests for projection fencing, stale compensation,
  canonical actors, malformed-lock recovery and migration. The tests cross actual fs/lock/guard/
  generation/rename seams and assert both error codes and zero-mutation outcomes.
- **CR-008:** Atomic temp cleanup tracks ownership and only unlinks a temp file opened by the current
  writer; a deterministic `EEXIST` collision test preserves the other writer's artifact.

## Verification

- `node --test test/control-plane-state-integrity.test.mjs` — PASS (6/6).
- `node --test test/task-state-machine.test.mjs` — PASS (10/10).
- `node --test test/compile-status-projection.test.mjs` — PASS (8/8).
- `node --test test/status-loader.test.mjs` — PASS (27/27).
- `npm test` — PASS (764/764).
- `npm run validate:contracts`, `validate:project-state`, `validate:review-gate`,
  `validate:ci-parity`, `validate:status-projection`, `validate:workflow-evidence`,
  `validate:risk-register`, `validate:skill-usage`, and `adr:audit` — PASS.
- `git diff --check` — PASS; worktree clean at handoff.

Mutation operators for CR-001, CR-002, CR-005 and CR-008 are represented by the deterministic
barrier/collision tests and must be independently executed and reported by QA. This record does not
claim mutation completeness, SEC-004 runtime closure, Security approval or merge approval.

**Next owner:** Independent Code Review Gate, then QA Full Mode and Security runtime review.
