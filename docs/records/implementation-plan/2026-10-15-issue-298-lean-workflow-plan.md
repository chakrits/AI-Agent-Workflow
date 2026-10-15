# Proportional Validation — Track A Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for assigned slices; use `superpowers:subagent-driven-development` only when that execution method is selected. Steps use checkboxes. Role ownership and independent review follow the design; this header does not dispatch agents.

**Goal:** ลด duplicate/unrelated validation โดยไม่เปลี่ยนโครงสร้าง Agent SDLC หรือทำให้ correctness/security gates หลุด

**Architecture:** จัด automatic callers ตาม affected scope ใช้ validators เดิมและ full-suite owner เดียว เก็บ diagnostics แบบ opt-in แยกงาน CI ออกจาก role collaboration ใน Track B

**Tech Stack:** Node.js >=22, node:test, existing Ajv/YAML tooling, GitHub Actions, GitLab CI; ไม่เพิ่ม dependency/runtime application

**Spec:** [Design v2](../../superpowers/specs/2026-10-15-agent-sdlc-role-collaboration-design.md) · [Roadmap](../../../ROADMAP-SDLC-FRAMEWORK.md) · [Issue #298](https://github.com/chakrits/AI-Agent-Workflow/issues/298)

Revision 2 — 15 ตุลาคม 2026. Written plan approved by user on 2026-10-15; implementation authorized within listed scope/gates. Branch name `codex/lean-validation-single-agent` เป็นชื่อเดิม ไม่ใช่ single-agent-first policy

## Global Constraints

- Canonical roles 11 บทบาทและ independent verification ยังคงอยู่
- การเปลี่ยน approval/security/required checks ต้องผ่าน approval ของ slice ก่อน mutation
- `context-pack/v1` และ workflow/state/evidence contracts เดิมไม่เปลี่ยนใน Track A
- Correctness failures ที่เกี่ยวข้องต้อง fail จริง; ห้ามใช้ `continue-on-error` กลบ
- ไม่ copy งาน #297 ที่ยังไม่ merge; optional skill audits ตาม #294 คง opt-in
- ทุก task เป็นงานอนาคต ยังไม่ได้ implement หรือรันทดสอบ acceptance

## Review Focus

1. Unknown/unreadable diff ต้องเลือก conservative checks — test ใน A4
2. Rename/delete/mixed protected path ต้องไม่ถูกจัดเป็น ordinary docs — test ใน A4
3. Diagnostic ถูกเรียกผ่าน default tests/reset/hooks ทางอ้อม — test ใน A2
4. Removing duplicate jobs ทำให้ required context ค้างหรือหาย — config tests/host observation ใน A3/A4
5. PR code ทำงานด้วย write-token หรือ evidence ผิด candidate — trust/candidate checks ใน A3/A4

## 1. Baseline ที่ใช้

Default branch snapshot `2dca980c40e75741500869d32d32a02958b092fe` มี full suite + validator steps 13 รายการใน main workflow; #297 เพิ่ม advisory checks สองรายการแต่ยังแยกอยู่ ณ baseline ที่ตรวจ

[Push](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38135093273) และ [PR](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38135124172) ของ SHA `29848953fc3714e243d757a538c05cf9baa9f8c0` รัน workflow หลักทั้งคู่ และ [runtime workflow](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38135124223) มี full-suite step อีกแห่ง

[Successful job](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38156266089) ใช้ 26 วินาที โดย tests 11 วินาที เป็นเพียง sample ไม่ใช่ median [Failed job](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38188080999) tests ผ่าน แต่ review gate พบ 9 script files/0 added review records; ยังไม่สรุปว่าเป็น false positive

Ruleset observation วันที่ 15 ตุลาคม: `Protect main` ID `18992836` require `work-item-readiness-freshness` ต้องตรวจใหม่ก่อน rollout ไม่อ้างว่า CI jobs อื่นทั้งหมดเป็น required branch checks

## 2. Disposition ที่ต้องอนุมัติก่อนแก้ callers

| Check | Proposed treatment | เงื่อนไข |
|---|---|---|
| `npm test` | Keep, deduplicate | executable/shared-contract/core-policy/CI changes; full suite owner เดียวต่อ candidate/event policy |
| `validate:contracts` | Keep, scope | contracts/schemas/parsers/consumers เปลี่ยน; invalid cases ยัง reject |
| dispatch receipts / workflow evidence | Scope | changed dispatch/evidence code/policy/records; ordinary docs ไม่ต้อง live receipt lookup |
| status projection / project state / clearable refs | Scope | authoritative records หรือ consumers/reset เปลี่ยน |
| adapter parity | Scope core adapters | ไม่เพิ่ม optional skill mirror enforcement กลับมา |
| context hashes/authority | Keep integrity, scope | source loader/core context policy เปลี่ยน; hard token threshold คงเดิมจนมี approved decision แยก |
| metrics / worktree housekeeping | Opt-in diagnostic candidate | ย้าย live caller หลังตรวจ indirect dependencies; fixture unit tests ของ tools ยังรัน |
| ADR/risk checks | Scope integrity | retained record-loss checks; ratio/freshness policy เปลี่ยนได้หลังอนุมัติเท่านั้น |
| CI parity | CI-change scoped | ตรวจ applicability/failure semantics เพิ่มจากชื่อ commands |
| review-record gate / documentation marker | Preserve initially | ไม่รวมการแทนที่กลไก review ใน A2–A4; เสนอ follow-up เมื่อมี equivalent candidate-bound review ที่อนุมัติ |
| PR readiness required context | Preserve | ไม่เปลี่ยน required identity หรือ branch rules ใน Track A รอบแรก |
| optional skills/catalog/usage audits | Remain opt-in | #294 ทำแล้ว ตรวจ caller regression ไม่ทำซ้ำ |
| #297 advisory checks | Coordinate separately | ถ้า merge ระหว่างงาน ให้ reconcile callers ไม่เพิ่ม serial gates |

การมี cost/benefit ยังไม่ทราบให้ระบุ unknown ไม่ตัด check ด้วยเหตุว่าไม่มี web/DB

### A1 inventory and approved disposition — 15 ตุลาคม 2026

ผู้ใช้อนุมัติ roadmap และ implementation plan ทั้งสอง track ในบทสนทนา 15 ตุลาคม 2026 และสั่งให้ดำเนินงานต่อ รายการนี้เป็น disposition สำหรับ Track A ตามแผน; ไม่เปลี่ยน branch protection หรือสิทธิ token

| Caller / trigger | สิ่งที่ทำและชั้น enforcement | เจ้าของ / defect class | Disposition |
|---|---|---|---|
| `.github/workflows/validate-contracts.yml` — `push` + `pull_request` | `npm test` กับ 13 validators; run เดียวกันอาจเกิดทั้ง push และ PR สำหรับ SHA เดียว | Framework/Orchestrator; behavior, contract, evidence, policy integrity | Keep applicable checks; A3 จำกัด push เป็น default branch ส่วน PR candidate ใช้ PR event; A4 เลือกตาม paths |
| `.github/workflows/status-runtime-matrix.yml` — `pull_request` | Node status test + `npm test` + independent Python JCS tests | QA; status/JCS correctness | Keep Node focused status test และ Python JCS tests; เอา `npm test` ซ้ำออกเมื่อ main workflow เป็น full-suite owner |
| `.gitlab-ci.yml` — push + merge request | Full `npm test`/contracts job และ validators แยก job; push กับ MR อาจสร้าง candidate ซ้ำ | Framework/Orchestrator; correctness และ policy | Keep applicable evidence; A3 ให้ MR pipeline ชนะและเปิด branch pipeline เมื่อไม่มี MR; A4 เลือก checks จาก diff |
| GitHub/GitLab live `validate:metrics` | อ่าน TASK_LOG เพื่อสร้าง trend projection; ไม่พิสูจน์ behavior ของ candidate | Documentation/PM; descriptive trend only | Approved diagnostic: เอาออกจาก automatic CI และ reset verification; เก็บ command, docs และ fixture unit tests ให้เรียกตามต้องการ |
| GitHub/GitLab `housekeeping:worktrees` | ตรวจ worktree ปัจจุบันของ runner; มีผลต่างตาม ephemeral checkout/credentials | Developer/Release; local workspace hygiene | Approved diagnostic: เอาออกจาก automatic CI; เก็บ manual audit และ unit tests; `.githooks/post-merge` เป็น informational `|| true` จึงคงไว้ |
| `scripts/verify-reset-template.mjs` | reset integration ใช้ชุดตรวจ candidate ชั่วคราว รวม metrics; test suite ปัจจุบันใช้ simulated reset และ `skipVerification` | Developer; reset integrity | เอา metrics diagnostic ออกจากชุด verification; คง behavior/state/contract checks ที่เกี่ยวข้องและ `git diff --check` |
| `.githooks/pre-push`, `.claude/settings.json` | PR readiness ทำงานเมื่อมี body/ก่อน `gh pr create`; edit guard เลือกเฉพาะ path; receipt hook เป็น advisory `|| true` | Orchestrator/Documentation; PR completeness, scoped integrity, receipt evidence | Keep as scoped/advisory behavior; ไม่เพิ่ม push-wide gate |
| `test/validate-metrics.test.mjs`, `test/housekeeping-worktrees.test.mjs` | ตรวจ parser/classifier/prune logic ด้วย fixture/temp repo | Developer/QA; tool correctness | Keep in `npm test`; ไม่ใช่ live audits และไม่ตัดออก |
| `scripts/verify-skill-decoupling.mjs` | harness สำหรับ manual candidate experiment; ไม่มี package/CI/hook caller; `npm test` ทดสอบ harness functions | Developer/QA; experiment integrity | Keep manual; ไม่เพิ่มเป็น default gate |
| `validate:project-state`, `validate:status-projection`, `validate:contracts`, dispatch/workflow evidence, adapter parity, ADR/risk/review/clearable refs, context budget, CI parity | ตรวจ state, contract, provenance, policy หรือ cross-host consistency | Role owner ตาม artifact; correctness/trust/policy integrity | Keep; A4 จำกัดตาม dependency เมื่อ diff complete; unknown/core changes ใช้ conservative checks |
| `validate:context-compatibility` | เรียกใน manual skill-decoupling harness; ไม่เป็น direct CI command | Developer; context contract integrity | Keep integrity suite เมื่อ context source/contract เปลี่ยน; ไม่เรียกสำหรับทุก docs-only candidate |

หลักฐาน inventory มาจาก caller search ใน package/workflows/hooks/settings/tests/scripts และการอ่านแต่ละ entry point ที่ HEAD `c2a14fe`; ไม่ได้วัด CI population, median latency, token cost หรือ queue time จึงยังไม่มีข้อสรุปเชิงสถิติ

## 3. File responsibilities / interfaces

Existing callers: `.github/workflows/validate-contracts.yml`, `.github/workflows/status-runtime-matrix.yml`, `.gitlab-ci.yml`, `.githooks/pre-push`, `.claude/settings.json`, `package.json` ปรับเฉพาะ caller ที่ disposition อนุมัติ

Existing verification: `test/validate-ci-parity.test.mjs`, `test/hook-containment.test.mjs`, `test/skill-decoupling-contract.test.mjs`, `scripts/validate-ci-parity.mjs` ปรับตาม actual behavior ไม่ mirror ข้อความใหม่ทั้งชุด

A4 อาจเพิ่ม pure helper `scripts/lib/validation-scope.mjs` กับ `test/validation-scope.test.mjs` เพื่อให้ path decisions ทดสอบได้ แยกจาก validator CLI ไม่เพิ่ม npm gate ใหม่ ฟังก์ชันที่แผนกำหนด:

`selectValidationChecks({ changedPaths: string[], comparisonComplete: boolean }): { fullSuite: boolean, commands: string[], reasonCodes: string[] }`

Paths ต้องรวมทั้ง old/new names ของ rename และ deleted paths; caller ตรวจ explicit base/head และเก็บ candidate identity ถ้าอ่าน diff ไม่ครบส่ง `comparisonComplete: false` คง validator commands เป็นข้อมูลที่เลือกจาก allowlist ห้าม execute command ที่มาจาก PR text

## Task A1: ตรวจรับ inventory และ scope mapping

**Files:** แผนนี้, automatic callers ที่ระบุด้านบน; output อยู่ใน issue/plan เดิม ไม่สร้าง audit platform

**Consumes:** baseline source/run samples. **Produces:** approved disposition และ mapping ของ light/governed/executable/unknown changes ให้ A2–A4

- [ ] List every direct/indirect automatic caller, enforced/diagnostic status, owner, defect class และ relevant changed paths
- [ ] ตรวจ samples: ordinary doc, optional skill, state/parser change, CI policy change; แยก genuine defect, paperwork-only blocker และ unknown
- [ ] ให้ maintainer ยืนยันรายการย้ายเป็น diagnostic กับ protected paths; หากยังไม่อนุมัติให้คง caller เดิม
- [ ] Commit เฉพาะ inventory/decision notes: `docs: record validation applicability for issue 298`

**Verification:** inventory มีทั้ง hooks/GitHub/GitLab/default tests/reset; ไม่มี pending disposition ถูกนับเป็น approved removal ไม่มี TDD เพราะยังไม่แก้ behavior

## Task A2: ย้าย diagnostics ที่อนุมัติแล้ว

**Files:** relevant existing workflows/hooks/package scripts และ tests ของ callers; ห้ามเปลี่ยน validators ให้คืน success เสมอ

**Consumes:** A1 approved diagnostic list. **Produces:** commands เดิมที่เรียกเองได้ โดย live audit ไม่เป็น automatic merge blocker

- [ ] เพิ่ม failing caller test ใน `test/skill-decoupling-contract.test.mjs` สำหรับ metric/worktree live audit ตาม approved list; fixture unit tests ต้องยังอยู่
- [ ] Run `node --test test/skill-decoupling-contract.test.mjs test/hook-containment.test.mjs`; expected FAIL เพราะยังมี automatic caller ที่กำหนด
- [ ] แก้เฉพาะ callers/config/docs ให้ diagnostic opt-in และรักษา isolated unit tests ของ tool
- [ ] Run focused tests เดิม; expected exit 0 ตรวจ manual diagnostic ทั้ง valid/invalid fixture และผลจริงไม่ถูกกลบ
- [ ] Commit: `chore: separate approved diagnostics from automatic validation`

Checkpoint: ทดสอบ known invalid contract/evidence ด้วย retained suites แล้วต้องถูกปฏิเสธ; ห้ามใช้ green diagnostics แทน correctness evidence

## Task A3: ให้ full suite มี owner เดียว

**Files:** main/runtime workflows, GitLab event rules, `test/validate-ci-parity.test.mjs`, `scripts/validate-ci-parity.mjs` เฉพาะ semantics ที่เปลี่ยน

**Consumes:** A1 event policy + A2 callers. **Produces:** PR heavy run หนึ่งเจ้าของ; default-branch audit เป็นอีก candidate ที่บันทึกแยก

- [ ] เพิ่ม workflow-fixture tests ใน `test/validate-ci-parity.test.mjs`: PR main owns full suite; runtime job มีเพียง focused status/JCS suites; default-branch push ไม่ซ้ำ feature-branch heavy lane
- [ ] Run `node --test test/validate-ci-parity.test.mjs`; expected FAIL ที่ duplicate ownership/event policy
- [ ] ปรับ triggers/jobs/concurrency ให้ตรง fixtures; keep required `work-item-readiness-freshness`; testing jobs ใช้ read-only permissions และไม่รัน PR code ผ่าน write-token workflow
- [ ] Run focused tests + `npm run validate:ci-parity`; expected exit 0 ตรวจ hosted sample candidate/event/commands โดยไม่บวก parallel job time เป็น user latency
- [ ] Commit: `ci: remove duplicate full-suite execution`

## Task A4: เลือก checks ตาม affected scope

**Files:** pure helper/test ที่ระบุใน section 3, existing main/GitLab callers และ parity tests

**Consumes:** A1 mapping, A3 single full-suite owner. **Produces:** deterministic selection ที่ testing jobs ใช้ร่วมกัน ไม่มี new required-check identity

- [ ] เขียน failing tests ของ `selectValidationChecks` พร้อม assertions ขั้นต่ำ:

```js
assert.equal(selectValidationChecks({ changedPaths: ['docs/guide.md'], comparisonComplete: true }).fullSuite, false);
assert.equal(selectValidationChecks({ changedPaths: ['.agents/skills/example/SKILL.md'], comparisonComplete: true }).fullSuite, false);
assert.equal(selectValidationChecks({ changedPaths: ['scripts/lib/task-state-machine.mjs'], comparisonComplete: true }).fullSuite, true);
assert.equal(selectValidationChecks({ changedPaths: ['AGENTS.md'], comparisonComplete: true }).fullSuite, true);
assert.equal(selectValidationChecks({ changedPaths: [], comparisonComplete: false }).fullSuite, true);
```

- [ ] เพิ่ม cases: mixed docs+code, old/new protected rename, deleted schema, optional-prefix lookalike, malformed paths; check `commands` กับ A1 mapping และ unknown reasonCode `DIFF_UNAVAILABLE`
- [ ] Run `node --test test/validation-scope.test.mjs`; expected FAIL เพราะ helper/behavior ยังไม่มี
- [ ] Implement pure helper ตาม mapping และต่อเข้าทั้งสอง host จาก trusted changed-path data; empty complete diff คืน no applicable work แต่ incomplete diff เลือก conservative core checks
- [ ] Run new test + parity/caller suites; expected exit 0 รัน `npm test` หนึ่งครั้งที่ candidate สุดท้ายของ slice และ `git diff --check`
- [ ] ตรวจ hosted docs/skill/core/unknown scenarios ว่า applicable failures fail จริงและ required context ไม่ค้าง; commit `ci: select validation by affected framework scope`

## 4. Acceptance / measurement

Track A ครอบคลุม Issue AC-A1–AC-A4 ใน revision ใหม่: inventory, diagnostics isolation, dedupe, safe applicability การทดสอบ implementation ทั้งหมดตอนนี้ **not run**

วัด heavy execution count/candidate, queue/run/active-human time, unrelated blockers และ seeded invalid-case rejection เทียบ baseline ไม่บังคับ double agent execution หรือเพิ่ม KPI merge gate การลด overhead ≥30% เป็นเพียง candidate target ที่ต้องยืนยันหลัง A1 ไม่เป็นผลรับรองล่วงหน้า

## 5. Rollback / handoff

Revert slice ย้อน A4 → A3 → A2 คืน callers ก่อนถอด replacement; รัน invalid contract/state/evidence cases ให้ reject อีกครั้ง ไม่ disable branch protection หรือคืนไฟล์เก่าทับงาน #297

Next action: Human review ของ written plan/dispositions; owner: Project owner/Maintainer. Runtime/application tests: N/A ใน Track A; independent review ของ CI trust/correctness changes ต้องเสร็จก่อน merge เอกสารนี้ไม่อนุญาต execution โดยลำพัง
