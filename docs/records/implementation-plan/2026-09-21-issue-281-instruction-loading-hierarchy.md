# Implementation Plan — Issue #281 Instruction-Loading Hierarchy

## Objective

Align the exact SHA-validated source matrix with the repository's active Tier 1 Core Bootloader without weakening human approval, role routing, or on-demand skill validation.

## Approved Design Authority

- SDD: `docs/records/sdd/2026-09-21-issue-280-gpt6-astra-modernization-sdd.md`
- ADR-0034: Core Bootloader is the SHA-pinned Tier 1 contract
- Human Maintainer approval: 2026-09-21

## Tasks and Verification

1. Change the matrix contract from v1 to v2 and define Tier 1 as `AGENTS.md` plus `core-bootloader.md`.
   - Verify exact boot paths for all 11 roles and reject the old schema.
2. Adjust context-pack validation so a two-source boot pack is valid while on-demand packs retain their existing minimum.
   - Verify focused compatibility tests in red/green sequence.
3. Pin the bootloader in every source-matrix row and extend the edit guard to run both re-pin and context-budget validation.
   - Verify the guard reports both commands for an edited bootloader.
4. Make `AGENTS.md` point to the bootloader and add a compact task-trigger map there.
   - Verify `validate:context-budget`, `validate:contracts`, and source compatibility.

## Risks and Rollback

The matrix is byte and path sensitive. Do not hand-edit hashes; run `npm run repin:source-matrix` after a legitimate content change. Revert the single implementation commit to restore v1 behavior. Issues #282–#284 are intentionally out of scope.

## Review Handoff

Independent reviewer should confirm that the old boot sources no longer appear in boot rows, every on-demand row retains its matching route and skill source, the bootloader remains within 3,500 tokens, and edit guards fire both required validators.
