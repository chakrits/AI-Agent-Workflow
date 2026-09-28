# Software Design Document: Issue #283 Skill Metadata and Catalog Rationalization

## Metadata

- Work Item ID: Issue #283
- Parent: Issue #280 / ADR-0034
- Status: ACCEPTED — Human Maintainer approved the revised design on 2026-09-28
- Date: 2026-09-28
- Governing design: `docs/records/sdd/2026-09-21-issue-280-gpt6-astra-modernization-sdd.md`

## Intent and Constraints

Reduce model-visible skill-trigger context while keeping routing accurate, detailed procedures available on demand, and all three portable skill trees identical. This child design implements the skill-metadata component approved in the parent SDD; it does not change the parent scope or safety gates.

The approved limits remain: every canonical description is at most 160 characters, all canonical descriptions total at most 5,500 characters, and all mirrored `SKILL.md` files remain byte-identical. Existing adapter parity, context compatibility, and source-matrix pinning remain in force.

## Ownership and Source of Truth

- `.agents/skills/<skill>/SKILL.md` is the canonical skill source.
- `.claude/skills/<skill>/SKILL.md` and `.agent/skills/<skill>/SKILL.md` are portable byte-for-byte mirrors; no platform-specific description variants are introduced.
- Frontmatter `description` states only the task and precise activation trigger. Detailed exclusions, overlap distinctions, and procedures remain in the canonical skill body and/or the on-demand `SKILL_CATALOG.md`.
- `docs/operating-model/SKILL_CATALOG.md` owns curated routing/navigation guidance, not a second copy of frontmatter descriptions. Its existing selection rules and five-column row contract remain; the available-skill directory is grouped under workflow, engineering, QA, API, frontend, and security/data headings.
- Inventory is derived from canonical skill directories. No manually maintained skill count is authoritative. The catalog and `docs/vault/00-Index.md` must each link every canonical skill exactly once in their respective detailed inventories, and mirrors must contain exactly the canonical inventory.

## Proposed Component Changes

1. Shorten all canonical descriptions, retaining enough task and trigger language to distinguish selection. Keep all approved limits machine-checked.
2. Reorganize the detailed catalog directory into the six approved domains while preserving row fields and existing special-purpose policy sections. Each skill has one detailed-directory category.
3. Add an executable skill-catalog/inventory validator. It derives canonical inventory, verifies one catalog entry per skill and no stale entries, validates description limits and total budget, and checks mirror inventory. Existing byte-parity validation remains authoritative for file content.
4. Add routing-contract tests for the overlap set `functional-test-design`, `qa-playwright-testing`, `api-test-design`, `api-contract-testing`, and `api-testing-tooling`. These tests pin the catalog's explicit distinctions; they do not claim to replace Issue #284's model-behavior evaluation.
5. Wire the new validator into the existing required validation paths on GitHub and GitLab, preserving CI command parity.
6. Remove the stale literal skill count from the Vault index and validate its linked skill inventory against the canonical directory set.

## Interfaces and Compatibility

- Preserve the canonical skill paths, frontmatter fields (`name`, `description`), three-tree exact-file parity, and current `SKILL_CATALOG.md` five-column row schema.
- Preserve on-demand selection and role routing. Do not duplicate or relocate detailed skill procedures as part of this work unless a description currently contains the only copy of a required rule; in that case retain the rule in the skill body or catalog and add a contract test.
- Keep `AGENTS.md` and Core Bootloader free of a manually maintained inventory count. Inventory checks must derive their expected set from `.agents/skills`.
- No application runtime behavior, security policy, approval boundary, role contract, or skill procedure is intentionally changed.

## Verification Design

Required checks include:

- Focused validator and overlap-routing tests, including missing/orphan mirror entries, missing/stale/duplicate catalog and Vault index entries, 160/161-character boundaries, and 5,500/5,501-character total boundaries.
- `npm run validate:skill-parity`, `npm run validate:adapter-parity`, `npm run validate:context-budget`, `npm run validate:context-compatibility`, `npm run validate:contracts`, and `npm run validate:ci-parity`.
- Full `npm test` and the repository's required project-state / source-matrix checks.
- Independent review of every changed description for trigger clarity and preservation of any previously unique routing constraint.

Issue #284 remains the separate behavior-evaluation gate; static catalog tests alone cannot establish model-routing quality.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| A short description becomes too generic and selects the wrong skill | Review each trigger and add explicit overlap-contract tests for the named five-skill set; defer behavioral claims to #284. |
| Detailed boundary guidance is lost during shortening | Search old descriptions against skill bodies/catalog before removal; test that unique distinctions remain available on demand. |
| A mirror-only skill or catalog row silently escapes count-based validation | Compare exact directory sets and catalog membership, not only counts. |
| A secondary index retains a stale count or omits new skills | Remove the literal Vault count and compare its linked inventory against the canonical directory set. |
| Catalog reshaping breaks consumers or historical contracts | Preserve the five-column table shape and selection rules; inspect and update every identified consumer/test. |
| Pinned-source hashes become stale | Run the repository source-matrix repin tool, then verify the exact staged diff and all context validators. |

## Rollback

Revert the Issue #283 implementation commit/PR. This change is isolated to skill metadata, catalog navigation, validation, tests, and their CI registration; rollback must restore the catalog, descriptions, validator wiring, and pinned hashes together.

## Out of Scope

- Changes to skill procedures beyond moving duplicated/unique trigger detail out of metadata while preserving it on demand.
- Changes to model runtime or host-specific skill-loading behavior.
- Issue #284 evaluation corpus and rollout decision.
- Raising the approved context/description budgets or weakening parity and CI gates.

## Open Review Point

The exact six-domain assignment for each current skill will be reviewed against the catalog during implementation planning. Every skill must appear in exactly one detailed-directory domain; any genuinely cross-domain skill receives a primary category and retains cross-links in its row rather than duplicate entries.
