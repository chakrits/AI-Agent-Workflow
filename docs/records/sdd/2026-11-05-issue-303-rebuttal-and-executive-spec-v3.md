# Forensic Re-Review Analysis, Engineering Lessons & Executive Specification v3 — Issue #303 (End-to-End AI-Native SDLC Integration)

## Metadata

- **Work Item ID**: [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303)
- **Reviewed Feedback Trail**:
  - Round 1 Feedback: [Issue #303 Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869)
  - Round 1 Response (v2): [Issue #303 Comment `#6651407822`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651407822) (`565207790b25cc1d5a388605ff84a82b153157ea`)
  - Round 2 Re-Review Feedback: [Issue #303 Comment `#6651546438`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651546438) (`RR-01`–`RR-05`, Section 4, Section 10)
- **Baseline Commits Audited**: `863306a9e3268f32d416ad76f5a783746b49ea4f` (`origin/main`) and `565207790b25cc1d5a388605ff84a82b153157ea` (v2 branch snapshot)
- **Target Branch**: `feat/issue-303-ai-native-sdlc-playbook`
- **Supersedes**: [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md`](./2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md) (retained intact for immutable link auditability)
- **External Primary Source**: [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (August 21, 2026)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook)
- **Change Classification**: `Framework / Meta Change` + `Code Behavior Enhancement` (Slice 1 in `scripts/validate-contracts.mjs`; Slice 3 in `scripts/validate-metrics.mjs`)
- **Risk Level**: `Medium` (modifies contract validator logic, workflow transition eligibility, multi-surface review policy, and metrics CLI; preserves all security and human approval gates)
- **Lifecycle Phase**: `phase:requirements` / `phase:design` (awaiting Human Maintainer policy approval before `status:spec-ready` and implementation)
- **Document Status**: `Proposed v3 — Contract-Complete Specification Ready for Maintainer Sign-Off`

---

## 1. บทสรุปสำหรับผู้บริหารและภาพรวม AI-Native SDLC เต็มกระบวนการ (Executive Summary)

### 1.1 เป้าหมายเชิงกลยุทธ์ที่คงไว้ครบ 100% (End-to-End AI-Native SDLC Vision)

เอกสารรุ่น **v3** ฉบับนี้นำผลการตรวจซ้ำรอบที่ 2 ([`#issuecomment-6651546438`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651546438)) มาถอดเป็นบทเรียนเชิงวิศวกรรมและตรวจสอบซอร์สโค้ดซ้ำแบบ End-to-End เพื่อยกระดับ `AI-Agent-Workflow` ให้เป็น **AI-Native SDLC เต็มกระบวนการครบทั้ง 6 ช่วง (01 Plan → 02 Design → 03 Build → 04 Test → 05 Deploy → 06 Maintain → วนกลับสู่ 01 Plan)** ตามแนวคิดของ Anthropic Playbook โดยที่ **ทุกสัญญาระดับโค้ด (Machine Contract), ขอบเขตข้อมูล (Schema & Cohort Authority), และลำดับการพึ่งพา (Dependency & Rollback Order) พิสูจน์ความถูกต้องด้วยชุดคำสั่งจริงบน Repository ปัจจุบันได้ 100%**

```text
[01 Plan]        [02 Design]           [03 Build]              [04 Test]           [05 Deploy]            [06 Maintain]
INTENT.md  ───►  SPEC.md (Low-Risk) ─► IMPLEMENTATION_PLAN.md ─► TDD + Scoped ────► 3-Pass Review + ─────► Structured Cohort
(Human or        or SDD.md (Med/High)  + Parallel Worktrees      CI Validators       5-Nit Cap +            Evaluator (Ledger
 Draft CLI)      + Hardened Contract     vs Scoped Subagents     (M3/M4 Live Evals)  PreToolUse JSON Deny   Expiry & Verified
                 Parity Validator                                                    + Hosted CI + Human    Rework) ──► Draft
                                                                                                            INTENT.md (Human
                                                                                                            Triage Loop)
```

### 1.2 สรุปสถานะหลัง Re-Review รอบที่ 2

1. **ประเด็นที่พิสูจน์ร่วมกันและปิดได้แล้วในระดับแผน (6 หมวด)**:
   - ยืนยันความไม่สอดคล้องจริงระหว่าง `dynamic-routing.md:92` กับ `new-feature-workflow.yaml:5` (`R-01`), ขอบเขต Phase-1 Draft Generator ที่ต้องให้มนุษย์คัดกรอง (`F-04`), นโยบายรีวิวครบ 4 จุดพร้อมเพดาน 5 Nits (`F-05`), ตารางแยก Parallel Worktrees กับ Scoped Subagents (`G-04 / 9.2`), และการผูกตัวเลขสถิติกับ Commit Snapshot คู่กับการวัดผลจริงใน Pilot (`9.3–9.4`)
2. **ช่องว่างเชิงสัญญาระดับลึกจาก `#6651546438` (`RR-01`–`RR-05`) + ช่องว่างต่อเนื่องที่เราตรวจพบเพิ่มเองจากการไล่โค้ดครบวงจร**:
   - นอกเหนือจากการปิด `RR-01`–`RR-05` ครบทุกข้อแล้ว การตรวจสอบเชิงรุกของเรายังพบ **จุดติดขัดต่อเนื่องใน `scripts/validate-contracts.mjs` และ `docs/contracts/new-feature-workflow.yaml` อีก 2 จุด** ที่หากไม่แก้พร้อมกันจะทำให้ทางด่วนใช้งานจริงไม่ได้ (กล่าวคือ `planning -> implementing` บังคับ `sa_dev_gate_result` ตายตัว และ `validate-contracts.mjs:145` ใช้ `new Map` ผูกคีย์ `from -> to` ทำให้กติกาซ้ำคู่สถานะเขียนทับกันเงียบๆ) รวมถึงพบพฤติกรรม `Ajv2020` พ่นคำเตือน `date-time` ลง `stderr` ใน `validateEnvelopeSchema()` ซึ่งได้ออกแบบวิธีป้องกันไว้ครบในรุ่น v3 นี้แล้ว

---

## 2. การตรวจสอบข้อเท็จจริง คำชี้แจงเชิงเทคนิค และบทเรียนที่ถอดได้จากรอบที่ 2

### 2.1 ตารางตรวจสอบข้อค้นพบจาก Re-Review `#6651546438` เทียบกับซอร์สโค้ดจริง

| หัวข้อใน `#6651546438` | ผลการตรวจสอบซ้ำกับซอร์สโค้ด ณ `5652077` / `863306a` | ข้อชี้แจงเชิงหลักฐานและแนวทางแก้ไขใน Spec v3 |
|---|---|---|
| **หัวข้อ 3 (`R-01` Accepted + Scope Note)** | **ตรงกัน 100%**: Probe ยืนยัน `illegal transition: discovery -> planning` จริง และข้อพิสูจน์นี้ยืนยันความขัดแย้งเชิงโครงสร้างของ Contract ไม่ใช่ตัวเลขเวลารอที่ประหยัดได้จริง | คงหลักฐาน Contract Inconsistency ไว้ตามข้อเท็จจริง และวัดเวลาที่ลดได้จริง (`Spec Lead Time`) ในช่วง Pilot M3 เท่านั้น ไม่เคลมตัวเลขเวลาล่วงหน้า |
| **หัวข้อ 4 (`R-02` JSON Deny Protocol)** | **ผู้รีวิวชี้แจงกลไกได้แม่นยำกว่าคำอธิบายใน v2**: `scripts/validate-pr-readiness.mjs:827–853` ปฏิเสธคำสั่งผ่าน JSON `hookSpecificOutput.permissionDecision: "deny"` ทาง `stdout` โดย `exit 0` และบรรทัด `803–810` (`ADR-0024 D1`) / `848–850` จงใจปล่อยผ่าน (`allowWith` / `{}`) เมื่อไฟล์ `--body-file` ยังไม่ถูกสร้างขณะ Hook รัน หรือเกิด Exception ที่ไม่คาดคิด | ปรับคำอธิบายในตาราง 5-Layer Enforcement Boundary ให้ตรงตามกลไก JSON Protocol และขอบเขต Fail-Open ของ `ADR-0024 D1` ทุกประการ โดยไม่สรุปแบบเหมารวมจากแค่การไม่มี `\|\| true` |
| **`RR-01` [สำคัญสูง]** Cross-field `risk_level` mismatch & `E-3` API ambiguity | **เป็นความจริง 100% และเราตรวจพบเพิ่มว่าเป็นช่องว่างเดิมของ `scripts/validate-contracts.mjs:113–141` ทั้งระบบ** (ทดสอบแล้วพบว่า `config-change` ที่มี top-level `risk_tier: medium` แต่ `evidence.risk_tier: low` ก็หลุดผ่าน `validateContracts()` ในโค้ดปัจจุบันเช่นกัน) และเราพบเพิ่มอีกว่า `planning -> implementing` บังคับ `sa_dev_gate_result` + `new Map` ทับซ้อนเมื่อมีหลาย Branch | 1) ยกระดับ Slice 1 ให้แก้ `scripts/validate-contracts.mjs` แบบ TDD เพื่อบังคับ **Top-Level vs. Evidence Classification Parity** และรองรับ **Multi-Branch `(from, to)` Selection**<br>2) เพิ่มทั้ง `discovery -> planning` และ `planning -> implementing` สำหรับ `low`-risk พร้อมตรวจ `security_boundary_impact: "none"`, `api_contract_impact: "none"`, `data_migration_impact: "none"`<br>3) แก้ `E-3` ให้ **ไม่อนุญาต API ใหม่แม้เป็นแบบ Additive** เข้าทางด่วน เพื่อให้สอดคล้องกับ `dynamic-routing.md:93` และ `new-feature.md:10`<br>4) แยกตาราง **Machine-Enforced vs. Independent-Reviewer/Human-Enforced** อย่างโปร่งใส |
| **`RR-02` [สำคัญสูง]** Conflating Ledger `expired` with Runtime `timed_out` & frozen `workflow-evidence/v1` | **เป็นความจริง 100%**: `task-execution-mode.md:60–68` ห้ามปน 2 Namespace; `dispatch-receipt` `expired` คืออายุเกิน TTL 14 วัน (`validate-dispatch-receipts.mjs:460`); และ `workflow-evidence.schema.json:29–38` ล็อกไว้เพียง 6 Event Types (`test/workflow-evidence.test.mjs:119`) ไม่มีตัวใดรับ `timed_out` ได้ | เลือก **Option A (Measurement Contract ที่ทำได้จริงบน Schema ที่มีอยู่โดยไม่ปน Namespace)**:<br>1) คง `workflow-evidence/v1` ไว้ตามเดิม (ไม่แก้ Schema ที่ถูก Freeze)<br>2) วัด **`dispatch_ledger_expiry_rate`** (`expired / closed_receipts`) จาก `dispatch-receipts/*.yaml` โดยตั้งชื่อและนิยามแยกจาก Runtime Timeout อย่างชัดเจน และขออนุมัติเกณฑ์ `>= 10%` สำหรับ Ledger Expiry จาก Maintainer โดยตรง<br>3) สถานะ Runtime `timed_out` แสดงค่า `UNAVAILABLE (deferred to M4 / Issue #35 runtime producer)` อย่างซื่อสัตย์ ไม่ปลอมข้อมูล |
| **`RR-03` [สำคัญกลาง]** Rework intake dilution, schema/version registry & active/archive identity | **เป็นความจริง 100%**: การหารด้วยไฟล์สถานะ `intake` (`rework_count: 0`) ทำให้ Backlog ที่เพิ่งเปิดใหม่ไปกดอัตรา Rework ให้ดูต่ำเกินจริง และ `durable-task-envelope.schema.json` (v2 `bug-fix` JSON พร้อม `state_digest`) เป็นคนละ Schema กับ v1 YAML contracts | 1) นิยาม **`verified_rework_rate`** เฉพาะ **Evaluated Cohort** (รายการที่ `history` เคยเดินเข้าหรือออกจากสถานะตรวจรับ `reworkSourceStates` เช่น `verifying`, `monitoring`, `validating` เท่านั้น; งานใน `intake`/`implementing` แยกเป็น `pre_verification_count`)<br>2) กำหนด **Closed Schema/Version Registry** (v2 JSON Envelope ตรวจ SHA-256 `state_digest` + v1 Policy State ตรวจ `validateHistory`)<br>3) บังคับกฎ `ARCHIVE_LOCATION_AMBIGUOUS` (ตรงกับ `scripts/archive-work-item.mjs:97`): หาก `task_id` ซ้ำทั้งใน `active` และ `archive` ให้ Fail-Closed (`exit 2`) ทันที |
| **`RR-04` [สำคัญกลาง]** Missing Slice-1 review record & behavioral security-review trigger | **เป็นความจริง 100%**: `scripts/validate-review-gate.mjs:6,13–20` บังคับตรวจทุกไฟล์ `.mjs`/`.js` ไม่ยกเว้นไฟล์ `test/*.test.mjs` และ `hasReviewRecord()` ตรวจเพียงการมีไฟล์ชื่อ `*-code-review.md` ไม่ได้พิสูจน์ตัวตนผู้ตรวจ | 1) กำหนดกลยุทธ์ส่งมอบเป็น **Stacked PRs (1 Slice = 1 PR)** และเพิ่มไฟล์ `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` พร้อมรัน `npm run validate:review-gate` ใน Slice 1<br>2) กำหนดให้ `security-reviewer` ตรวจทานเงื่อนไข Gate ของ Slice 1 ตาม **Behavioral Impact** (ป้องกันช่องโหว่ข้าม Security Gate) แม้ไม่ได้แก้ `.claude/settings.json`<br>3) ระบุขอบเขตสิ่งที่ `validate-review-gate.mjs` ตรวจจริงเทียบกับหลักฐานกระบวนการ |
| **`RR-05` [สำคัญกลาง]** Fingerprint vs. Human-edited body conflict & `Source Commit` provenance | **เป็นความจริง 100%**: หากมนุษย์แก้ข้อความในไฟล์ร่างแต่คงบรรทัด `Intent-Fingerprint` เดิมไว้ กติกาใน v2 จะเข้าเงื่อนไขทั้ง `no-op` และ `exit 2` พร้อมกัน และยังไม่ระบุ Preimage ของ Hash | ออกแบบสัญญา **Dual-Digest Integrity (`Intent-Fingerprint` + `Draft-Content-SHA256`)** และตารางตัดสินใจแบบ **Mutually Exclusive 100%**:<br>- `Intent-Fingerprint` คำนวณผ่าน RFC 8785 JCS (`canonicalizeJcs`) เฉพาะข้อมูลสัญญาณ (ไม่รวม `HEAD` SHA)<br>- `Draft-Content-SHA256` ตรวจความสมบูรณ์ของเนื้อหาไฟล์ทั้งหมด หากมนุษย์แก้ไขแม้ตัวอักษรเดียว ระบบจะปฏิเสธการเขียนทับด้วย `REJECT_HUMAN_MODIFIED` (`exit 2`) เสมอหากไม่ระบุ `--force`<br>- ใช้ `fs.openSync(path, 'wx')` สำหรับการสร้างใหม่ และ `atomicWriteFileSync` สำหรับ `--force` |
| **หัวข้อ 10 (Non-blocking Refinements)** | **ถูกต้องทั้ง 3 ประเด็น**: (1) `5 nits` เป็นค่าตัวอย่างใน `REVIEW.md` ของบทความต้นฉบับ (2) Slice 3 พึ่งพารูปแบบ `INTENT.md` จาก Slice 1 เชิงความหมาย (3) `npm test` รันเทสต์ของ `validate-metrics` อยู่เสมอ | ปรับถ้อยคำที่มาของ `Nit Cap = 5`, เพิ่มแผนผัง **Semantic Dependency & Reverse Rollback Order (`Slice 3 → Slice 1`)**, และระบุขอบเขตผลกระทบต่อ CI (`npm test` vs merge-gate callers) ตามความจริง |

---

### 2.2 บทเรียนเชิงวิศวกรรม 5 ข้อที่นำมายึดถือในการออกแบบรุ่น v3 (Lessons Learned)

1. **Lesson L-01 — อย่าเขียนกฎ YAML โดยไม่ไล่โค้ดของ Validator Engine จนสุดสาย**: การเพิ่ม `when: { risk_level: low }` ใน YAML เพียงอย่างเดียวไม่เพียงพอเมื่อ `validate-contracts.mjs` อ่านเฉพาะ `state.evidence[key]`, ใช้ `new Map` ที่เขียนทับคู่ `from -> to` ซ้ำ, และด่านถัดไป (`planning -> implementing`) ยังล็อก `sa_dev_gate_result` ไว้ ในรุ่น v3 เราจึงเขียนสคริปต์จำลองทดสอบครบทุกกิ่งก่อนสรุปสเปก
2. **Lesson L-02 — แยก "ทะเบียนคุมเอกสาร (Ledger)" ออกจาก "สัญญาณรันไทม์ (Runtime Telemetry)" เสมอ**: การมีคำว่า `timed_out` ใน `enum` ระดับบนของ JSON Schema ไม่ได้แปลว่ามี `event_type` ที่อนุญาตให้เขียนค่านั้นได้จริง การวัดผลระยะแรกต้องสร้างบน Schema ที่มีผู้ผลิตข้อมูลอยู่จริงและตั้งชื่อตัวชี้วัดตามความหมายที่แท้จริงเท่านั้น
3. **Lesson L-03 — ตัวหารของคุณภาพงานต้องนับเฉพาะประชากรที่ผ่านจุดตรวจรับแล้ว (Evaluated Cohort)**: การนำงานที่เพิ่งรับเข้า (`intake`) มาเป็นตัวหารของอัตรา Rework ทำให้ตัวเลขผิดเพี้ยนเมื่อ Backlog โตขึ้น ทุกสูตรวัดผลต้องระบุประชากรที่มีสิทธิ์ถูกนับ กฎความไม่ซ้ำของ Identity และวิธีตรวจความสมบูรณ์ของข้อมูล (`state_digest`)
4. **Lesson L-04 — Quality Gate และ Security Review ต้องประเมินจากทั้ง "นามสกุลไฟล์จริง" และ "ผลกระทบเชิงพฤติกรรม"**: ไฟล์ทดสอบ `.test.mjs` นับเป็นโค้ดตาม `validate-review-gate.mjs` และการเปิดทางด่วนข้ามขั้นตอนออกแบบมีความเสี่ยงเชิงพฤติกรรมต่อการคัดกรองงานด้านความปลอดภัย จึงต้องให้ `security-reviewer` ร่วมตรวจเงื่อนไขของ Gate เสมอ
5. **Lesson L-05 — เครื่องมือสร้างไฟล์ร่างที่มนุษย์แก้ไขต่อได้ ต้องแยก Hash ของ "ต้นเหตุ" ออกจาก Hash ของ "เนื้อไฟล์"**: การมีเพียง `Intent-Fingerprint` เดียวไม่สามารถแยกแยะระหว่าง "ไฟล์เดิมที่ยังไม่ถูกแตะ" กับ "ไฟล์ที่มนุษย์เข้ามาเกลาเนื้อหาแล้ว" ได้ จึงต้องใช้ระบบ Dual-Digest เสมอ

---

## 3. การเชื่อมโยง AI-Native SDLC ครบทั้ง 6 Stages (End-to-End Primary-Source Mapping v3)

| Stage | Play / แนวคิดในบทความ Anthropic | กลไกใน Repo ปัจจุบัน (`863306a`) | การยกระดับใน Issue #303 (Spec v3) |
|---|---|---|---|
| **01 Plan** | **Capture as `intent.md`** | มี `PROJECT_BRIEF.md` และ `REQUIREMENT_DISCOVERY.md` | **Slice 1**: เพิ่ม `docs/templates/INTENT.md` เป็นใบตั้งต้นมาตรฐานที่ใช้ร่วมกันได้ทั้งจากมนุษย์และจากระบบแจ้งเตือนใน Stage 06 |
| **02 Design** | **Single-session `spec.md` & Risk Escalation** | `dynamic-routing.md:92` อนุญาต Lightweight Spec แต่ `new-feature-workflow.yaml` บังคับผ่าน `designing` + `SDD.md` | **Slice 1**: เพิ่ม `docs/templates/SPEC.md` + ตารางคัดกรอง 6 ข้อ (ไม่อนุญาต API ใหม่ทุกชนิด) + ยกระดับ `validate-contracts.mjs` ให้ตรวจ Cross-Field Risk Parity และรองรับทางด่วน `discovery -> planning -> implementing` เฉพาะ `risk_level: low` ที่ไม่กระทบ Security/API/Data |
| **03 Build** | **Plan mode (`plan.md`), Source of Truth, Parallel Worktrees vs Subagents** | มี `IMPLEMENTATION_PLAN.md`, `core-bootloader.md`, และกฎ Worktree ใน `AGENTS.md` | **Slice 1**: คง `IMPLEMENTATION_PLAN.md` เป็น `plan.md`, ผูก Commit-SHA Source of Truth ใน `INTENT.md`/`SPEC.md`, และเพิ่มตารางตัดสินใจ **Parallel Worktree Sessions vs. In-Session Scoped Subagents** ใน `dynamic-routing.md` |
| **04 Test** | **Feedback loop & Continuous evals in CI** | มี `npm test` (`801` deterministic tests) และ `run-scoped-validations.mjs` | **Slice 1 & 3 (TDD) + Slice 4 (Roadmap)**: เพิ่มชุดทดสอบ Contract/Metrics BVA (`TC-001`–`TC-015`) และวางแผน Live Non-Interactive Agent Behavioral Evals (`claude -p`) ไว้ใน Milestone M3/M4 |
| **05 Deploy** | **`REVIEW.md` (3 Passes + 5-Nit Cap) & Hooks as Approval Gates** | มี 4 ไฟล์รีวิว, `validate-pr-readiness.mjs --hook` (JSON `deny`), และ Hosted CI | **Slice 2 & Slice 4**: ปรับทั้ง 4 Review Surfaces ให้ใช้ 3 Passes + เพดานอ้างอิง **5 Nits ต่อรอบรีวิว** + บันทึกตาราง 5-Layer Enforcement Boundary ตามกลไก JSON stdout protocol จริง |
| **06 Maintain** | **Deterministic Threshold Detection → Draft `intent.md` → Human Triage** | มี `validate-metrics.mjs` (regex บน `TASK_LOG`), `dispatch-receipt.schema.json`, และ `durable-task-envelope.schema.json` | **Slice 3**: สร้างโหมด `--source structured` วัด **`dispatch_ledger_expiry_rate`** และ **`verified_rework_rate`** บน Evaluated Cohort ที่ตรวจ Digest/Schema ครบ พร้อม `--emit-intent` แบบ Dual-Digest ป้องกันการทับงานที่มนุษย์แก้ ส่งกลับเข้าสู่ Stage 01 อย่างปลอดภัย |

---

## 4. ข้อกำหนดทางสถาปัตยกรรมและสัญญาเทคนิคฉบับสมบูรณ์ (Detailed Technical Contracts v3)

### 4.1 Stage 01 & 02 Contract: Compressed Artifact Route, Strict Eligibility & Hardened Validator (ปิด `RR-01` 100%)

#### 4.1.1 ตารางเกณฑ์คัดกรอง 6 ข้อแบบ Conjunctive (ต้องผ่านครบทุกข้อ และขจัดความกำกวมเรื่อง Additive API)

| รหัส | เกณฑ์คัดกรอง | เงื่อนไขที่อนุญาตให้ใช้ `SPEC.md` ทางด่วน | เงื่อนไขบังคับออกจากทางด่วน (Mandatory Exit → Owner) | การบังคับใช้ (Enforcement Layer) |
|---|---|---|---|---|
| **E-1** | **Risk Level** | `risk_level === "low"` ทั้งในระดับ Top-level และใน `evidence.risk_level` ตรงกัน | `medium`, `high`, `critical` หรือค่า Top-level ขัดกับ `evidence` → **SA Agent (`designing` + `SDD.md`)** | **Machine-enforced** (`validate-contracts.mjs` parity + `when`) + **Reviewer-verified** |
| **E-2** | **Security & Trust Boundary** | `security_boundary_impact === "none"` (ไม่แตะ Auth/Authz, Secrets, Crypto, PII/Privacy, Payment, Hook/CI Gate Controls) | แตะขอบเขตความปลอดภัยแม้เพียงบรรทัดเดียว → **Security Reviewer + SA Agent + Human Gate** | **Machine-enforced** (`when` บนฟิลด์ที่ประกาศ) + **Path/Diff-verified** โดย `validation-scope.mjs`, `security-reviewer` และ QA |
| **E-3** | **Architecture & API Contract Impact** | `api_contract_impact === "none"` (**ไม่มีการเพิ่ม แก้ไข หรือลบ External/Public/Shared HTTP, RPC, CLI, Event หรือ Schema Contract — แม้เป็นการเพิ่มแบบ Additive ก็ไม่อนุญาตในทางด่วน** เพื่อให้ตรงกับ `dynamic-routing.md:93` และ `new-feature.md:10`) | มี API/CLI/Schema/Integration ใหม่หรือแก้ไข (รวมทั้ง Additive API) หรือกระทบหลายโมดูลข้ามขอบเขต → **SA Agent (`designing` + `SDD.md`)** | **Machine-enforced** (`when: { api_contract_impact: "none" }`) + **Independent Reviewer diff check** |
| **E-4** | **Data & Migration Impact** | `data_migration_impact === "none"` (ไม่มี Production Data change, Schema Migration, หรือ Backfill) | มี Migration/Data change → **SA Agent / Data Agent + Human Gate** | **Machine-enforced** (`when: { data_migration_impact: "none" }`) + **Independent Reviewer diff check** |
| **E-5** | **Requirement Clarity** | คำถามค้างคาใน `INTENT.md` ได้รับคำตอบครบ หรือเจ้าของงานอนุมัติขอบเขตชัดเจนใน `SPEC.md` แล้ว | โจทย์กำกวมหรือแหล่งข้อมูลธุรกิจขัดแย้งกัน → **BA/PM Agent หรือ Human Maintainer** | **Process & Human-Gate enforced** ก่อนติดป้าย `status:spec-ready` |
| **E-6** | **Independent Verification** | มีป้าย `status:spec-ready` ก่อนเริ่มเขียนโค้ด และผู้ตรวจรับ (`QA / Code Reviewer`) เป็นคนละ Agent Identity กับผู้พัฒนา | การสลับบทบาทเองใน Session เดียวเพื่ออนุมัติงานตัวเอง → **บล็อกตาม `dynamic-routing.md:33,37`** | **Process, PR Audit & Human-Gate enforced** (`validate-review-gate.mjs` ตรวจเฉพาะการมีไฟล์รีวิวใหม่ใน Diff) |

> **หมายเหตุสำคัญเรื่องขอบเขตของ Machine Enforcement**: ตัวตรวจ `scripts/validate-contracts.mjs` บังคับความสอดคล้องของฟิลด์ความเสี่ยงและผลกระทบที่บันทึกใน `task-state` แบบ Fail-Closed แต่ **ไม่สามารถพิสูจน์ด้วยตัวเองว่าผู้เขียนกรอก `security_boundary_impact: "none"` ตรงกับโค้ดจริงหรือไม่** ความถูกต้องเทียบกับ Diff จริงจึงเป็นหน้าที่ของ Independent Reviewer / QA (ผูกกับ `base_sha..head_sha`) และ Human Approval Gate

#### 4.1.2 การยกระดับ `scripts/validate-contracts.mjs` และ `docs/contracts/new-feature-workflow.yaml`

1. **Cross-Field Classification Parity Guard ใน `scripts/validate-contracts.mjs`**:
   - กำหนดให้ฟิลด์ระดับบนสุดของเอกสารสถานะ (`change_type`, `risk_level`, `risk_tier`, `contains_pii`, `data_change_kind`) เป็น **Authoritative Classification Fields**
   - เพิ่มฟังก์ชัน `validateTopLevelEvidenceParity(state, displayPath)`: ทุกครั้งที่ฟิลด์ข้างต้นปรากฏอยู่ทั้งในระดับบนสุด `state[field]` และใน `state.evidence[field]` ค่าทั้งสองต้องตรงกันทุกประการ (สำหรับ Array ใช้การเทียบชุดข้อมูลที่เรียงลำดับแล้ว) หากขัดแย้งกันจะถูกปฏิเสธทันทีด้วยข้อความ:
     `<path>: top-level <field> (<val1>) does not match evidence.<field> (<val2>)`
   - ปรับปรุง `validateWhenClause()` ให้ตรวจเทียบค่าคาดหวังกับ **ทั้ง `state.evidence[field]` และ `state[field]` (เมื่อมีฟิลด์ระดับบนสุด)** ปิดช่องโหว่ `top-level: high` + `evidence: low` ได้สนิททั้งใน `new-feature`, `config-change`, และ `data-change`
2. **การรองรับ Multi-Branch Transitions บนคู่ `(from, to)` เดียวกันใน `scripts/validate-contracts.mjs`**:
   - เปลี่ยนโครงสร้างเก็บ `policy.transitions` ใน `validateHistory()` จาก `Map<string, Transition>` (ซึ่งเขียนทับรายการซ้ำเงียบๆ) เป็น `Map<string, Transition[]>`
   - เมื่อมีมากกว่า 1 กิ่งสำหรับ `from -> to` เดียวกัน (เช่น `planning -> implementing` ระหว่างสาย `SDD.md` ปกติ กับสาย `SPEC.md` ทางด่วน):
     - หากประวัติก่อนหน้าเคยผ่านสถานะ `designing` ให้เลือกตรวจกิ่งมาตรฐาน (`requires: [spec_readiness_checklist, implementation_plan, sa_dev_gate_result]`)
     - หากไม่เคยผ่าน `designing` (เดินมาจาก `discovery -> planning`) ให้บังคับตรวจกิ่งทางด่วนซึ่งต้องผ่านทั้ง `when` และ `requires` ของทางด่วนครบถ้วน (ป้องกันการปลอม `sa_dev_gate_result` ข้ามสาย)
3. **กฎ Transition ที่เพิ่มใน `docs/contracts/new-feature-workflow.yaml`** (และอัปเดต `docs/workflows/new-feature.md:37,48` ให้ตรงกัน):
   ```yaml
   - from: discovery
     to: planning
     requires:
       - user_stories
       - acceptance_criteria
       - business_rules
       - compressed_spec_reference
       - security_boundary_impact
       - api_contract_impact
       - data_migration_impact
       - pm_ba_gate_result
     when:
       risk_level: low
       security_boundary_impact: "none"
       api_contract_impact: "none"
       data_migration_impact: "none"

   - from: planning
     to: implementing
     requires:
       - spec_readiness_checklist
       - implementation_plan
       - compressed_spec_reference
       - spec_readiness_gate_result
     when:
       risk_level: low
       security_boundary_impact: "none"
       api_contract_impact: "none"
       data_migration_impact: "none"
   ```
4. **ผลทดลองพิสูจน์ซ้ำด้วย Prototype จริงบน Repository (รันตรวจสอบแล้วก่อนเขียนสเปก v3)**:
   - `low / low` + impact `"none"` ครบตลอดสาย `intake -> discovery -> planning -> implementing -> verifying -> human-review -> release` → **`[]` (PASS)**
   - `high (top-level) / low (evidence)` → **ถูกปฏิเสธ 3 ชั้นพร้อมกัน** (`top-level risk_level ("high") does not match evidence.risk_level ("low")` + `when` mismatch ทั้ง 2 ด่าน)
   - `low (top-level) / high (evidence)` หรือ `missing evidence.risk_level` → **ถูกปฏิเสธ (FAIL-CLOSED)**
   - `low / low` แต่ `security_boundary_impact: "authz"` หรือ `api_contract_impact: "additive-endpoint"` → **ถูกปฏิเสธ (FAIL-CLOSED)**
   - ตัวอย่างมาตรฐานเดิมทั้ง 10 ไฟล์ใน `docs/contracts/examples/*.yaml` → **`[]` (PASS 100% ไม่มี Regression)**

---

### 4.2 Stage 03 Contract: Parallel Worktree Sessions vs. In-Session Scoped Subagents (คงจาก v2 ที่ผ่านการรีวิวแล้ว)

เพิ่มตารางตัดสินใจใน `docs/workflow/dynamic-routing.md` แยกชัดเจนระหว่าง:
- **Parallel Worktree Sessions**: อินสแตนซ์แยก Terminal คนละ Git Worktree (`.worktrees/<branch-slug>`) ภายใต้การกำกับของมนุษย์ ใช้เฉพาะเมื่องานมี **Disjoint Write-sets** และเก็บกวาดภายใน 24 ชม. ด้วย `npm run housekeeping:worktrees`
- **In-Session Scoped Subagents**: Subagent ภายใน Turn เดียวกัน ต้องปฏิบัติตามสัญญา In-Turn Supervision (`dynamic-routing.md:65–69`), `TASK_BRIEF.md`, และ `dispatch-receipt` โดยห้ามสลับ Persona ใน Agent ตัวเดิมแล้วอ้างว่าเป็น Independent Verifier

---

### 4.3 Stage 05 Contract: Multi-Surface Review Policy, Reference 5-Nit Cap & Accurate Hook Enforcement Matrix

1. **Multi-Surface Review Alignment (4 ไฟล์สอดคล้องกัน)**:
   - อัปเดต `docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`, และ `.agents/skills/code-review-gate/SKILL.md`
   - กำหนด **3 Mandatory Passes**: `[Pass 1: Bugs & Logic]`, `[Pass 2: Security & Trust]`, `[Pass 3: Spec & Plan Compliance]`
   - กำหนด **3 Decision Tiers**:
     - `Tier 1 — Blocking Findings (Critical / Major)` → `Blocks Progress? = Yes`
     - `Tier 2 — Human Architecture / Business Judgment Required` → `Blocks Progress? = Yes` (หยุดรอที่ Human Approval Gate พร้อมสรุปทางเลือกให้ตัดสินใจ)
     - `Tier 3 — Non-blocking Nits (Minor style/naming)` → `Blocks Progress? = No`, **จำกัดเพดานสูงสุดไม่เกิน 5 ข้อต่อรอบการรีวิว** *(เป็นค่าตัวอย่างอ้างอิงจาก `REVIEW.md` ในบทความต้นฉบับที่เสนอให้นำมาใช้เป็นพารามิเตอร์เริ่มต้นของโปรเจกต์)* พร้อมสรุปส่วนเกินเป็นบรรทัดเดียว (`Suppressed Nits Count: +N`)
   - **Strict Anti-Downgrade Rule** และคงกฎ **Scoped Re-review** (`task_review_rework_count <= 2`) ตาม `task-execution-mode.md:48–58`
2. **ตารางขอบเขตการบังคับใช้ 5 ชั้นตามกลไกโค้ดจริง (5-Layer Enforcement Boundary Matrix — ปรับตามหัวข้อ 4)**:

| ชั้นการควบคุม | ตำแหน่งไฟล์จริง | กลไกการทำงานจริงในซอร์สโค้ด | ขอบเขตการบล็อกและข้อจำกัดที่ต้องระบุตรงไปตรงมา |
|---|---|---|---|
| **1. Claude Host `PreToolUse` Hook** | `.claude/settings.json:3–15` → `scripts/validate-pr-readiness.mjs:827–853` | เมื่อเรียก `Bash(gh pr create:*)` สคริปต์จะประเมินเนื้อหา PR และส่ง JSON `hookSpecificOutput.permissionDecision = "deny"` ออกทาง `stdout` พร้อม `exit 0` | บล็อกก่อนเปิด PR บน Claude Code เมื่ออ่านเนื้อหา PR ได้และพบข้อผิดพลาด; **จงใจปล่อยผ่าน (`allowWith` / `{}`)** เมื่อไฟล์ `--body-file` ยังไม่ถูกสร้างขณะ Hook รัน (`ADR-0024 D1`) หรือเกิด Exception ที่ไม่คาดคิด และขึ้นกับการเปิดใช้งานของแต่ละ Host |
| **2. Local Git `pre-push` Hook** | `.githooks/pre-push:8–32` | ตรวจความพร้อม PR เฉพาะเมื่อผู้พัฒนาตั้งตัวแปร `PR_BODY_FILE` (คืน `exit 1` เมื่อไม่ผ่าน; ข้ามด้วย `exit 0` สำหรับ `git push` ปกติที่ยังไม่มีร่าง PR) | เป็นด่านตรวจเสริมฝั่งเครื่องผู้พัฒนาหลังเปิด `core.hooksPath` ไม่ใช่ด่านบังคับฝั่งเซิร์ฟเวอร์ |
| **3. Host `PostToolUse` & `SubagentStop` Hooks** | `.claude/settings.json:16–50` → `scripts/validate-edit-guards.mjs:89` | แจ้งเตือนหลังแก้ไขไฟล์ (`advisory: true`) และเตือนเรื่องสถานะงานเมื่อจบ Subagent (`\|\| true`) | **Advisory เท่านั้น** ไม่ได้บล็อกก่อนเขียนไฟล์ |
| **4. Hosted CI Pipelines** | `.github/workflows/*.yml`, `.gitlab-ci.yml` → `scripts/run-scoped-validations.mjs` | รันชุดทดสอบและ Validators ตามขอบเขตไฟล์ที่เปลี่ยน (`validate:contracts`, `validate:review-gate`, `validate:context-budget`, ฯลฯ) บนเซิร์ฟเวอร์ | **Authoritative Merge-Readiness Check** (ทั้งนี้ `validate-review-gate.mjs` ตรวจการมีอยู่ของไฟล์ `docs/records/qa/*-code-review.md` ใน Diff ไม่ได้พิสูจน์ตัวตนผู้ตรวจในระดับ Runtime) |
| **5. Human Approval Gate & Branch Protection** | `AGENTS.md`, `core-bootloader.md:24–30`, GitHub/GitLab Server Settings | มนุษย์ผู้มีอำนาจตรวจรับการเปลี่ยนแปลงนโยบาย ความปลอดภัย สถาปัตยกรรม และการ Merge | **Authoritative Governance Gate ขั้นสุดท้าย** ที่ตัวแทน AI ข้ามไม่ได้ |

---

### 4.4 Stage 06 → Stage 01 Contract: Structured Cohort Metrics & Dual-Digest Safe Intent Draft CLI (ปิด `RR-02`, `RR-03`, `RR-05` 100%)

#### 4.4.1 การแยก Namespace และนิยามตัวชี้วัดบน Schema ที่มีอยู่จริง (Option A — ไม่ปน Namespace และไม่แตะ `workflow-evidence/v1`)

เพื่อให้สอดคล้องกับ `docs/workflow/task-execution-mode.md:60–68` (*"Two state namespaces exist and must never be conflated"*) และไม่แก้ไข `docs/contracts/schemas/workflow-evidence.schema.json` ที่ถูกล็อกไว้สำหรับ Context/Shadow Events (`test/workflow-evidence.test.mjs:119`):

1. **ตัวชี้วัดที่ 1: `dispatch_ledger_expiry_rate` (Durable Dispatch Receipt Ledger Expiry Rate)**
   - **แหล่งข้อมูลและ Schema**: ไฟล์ `docs/records/dispatch-receipts/*.yaml` ทุกไฟล์ (ยกเว้นไฟล์ตัวอย่างใน `docs/contracts/examples/`) ตรวจสอบผ่าน `docs/contracts/schemas/dispatch-receipt.schema.json` + กฎชื่อไฟล์ตรงกับ `handoff_event_id` + กฎ `isCanonicalIdentity` จาก `scripts/validate-dispatch-receipts.mjs`
   - **Primary Key & Conflict Handling**: ใช้ `handoff_event_id` เป็นคีย์เอกลักษณ์ หากพบ `handoff_event_id` ซ้ำกัน หรือไฟล์เสียรูป/ไม่ผ่าน Schema ให้หยุดทำงานแบบ Fail-Closed (`DATA_ERROR`, `exit 2`)
   - **ประชากรที่มีสิทธิ์ถูกนับ (Eligible Cohort — `closedReceipts`)**: เฉพาะใบรับงานที่อยู่ในสถานะปิดบัญชีแล้ว ได้แก่ `state ∈ {"consumed", "expired", "cancelled"}`
     - ใบรับงานที่ยังเป็น `state === "registered"` จะ **ไม่ถูกนำมาเป็นตัวหาร** เพื่อป้องกันการเจือจางตัวเลข แต่จะรายงานแยกเป็นข้อมูลประกอบ (`open_registered_count` และ `stale_registered_over_14d_count` ตามตรรกะ TTL 14 วันของ `checkExpiryWarnings`)
   - **ตัวตั้ง (`expiredReceipts`)**: จำนวนใบรับงานใน `closedReceipts` ที่มี `state === "expired"`
   - **สมการเกณฑ์เตือน (Proposed Policy Threshold สำหรับขออนุมัติ Maintainer)**:
     `ledgerExpiryBreach = (closedReceipts >= minSamples) && ((expiredReceipts / closedReceipts) >= 0.10)`
   - **ความหมายที่ระบุในรายงานอย่างซื่อสัตย์**: ตัวชี้วัดนี้วัด **สัดส่วนใบรับงานที่หมดอายุตามทะเบียนคุม (Ledger Bookkeeping TTL Expiry)** ไม่ใช่อัตรา Deadline Timeout ของ Subagent ในระดับ Runtime (ซึ่งจะแสดงสถานะแยกเป็น `Runtime Subagent Timeout Telemetry: UNAVAILABLE_IN_V1 — deferred to M4 / Issue #35 runtime outcome producer`)

2. **ตัวชี้วัดที่ 2: `verified_rework_rate` (Post-Verification Lifecycle Rework Rate)**
   - **Closed Schema & Version Registry (ไม่เดาจากชื่อไฟล์)**:
     สแกนเฉพาะไดเรกทอรี `docs/records/work-items/<task_id>/` และ `docs/records/work-items/archive/<task_id>/` (ข้ามไดเรกทอรีระบบที่ขึ้นต้นด้วย `.` เช่น `.archive-transactions` และไม่สแกน `docs/contracts/examples/`) โดยยอมรับเฉพาะ 2 ตระกูล Schema ที่ลงทะเบียนไว้เท่านั้น:
     - **Registry Entry 1 — Durable Task Envelope v2 (`contract_version === 2`)**: ไฟล์ `task-state.json` ของ `workflow_id: "bug-fix"` ตรวจสอบด้วย Schema `durable-task-envelope.schema.json` (คอมไพล์ `Ajv2020` ครั้งเดียวโดยตั้ง `validateFormats: false` เพื่อไม่ให้พ่นคำเตือน `date-time` กวน `stderr`) **ควบคู่กับการตรวจ SHA-256 `state_digest === digestTaskEnvelope(state)`**, `sequence_number === history.length + 1`, และความตรงกันของ `rework_count` กับจำนวน `verifying -> rework` ใน `history`
     - **Registry Entry 2 — Policy Contract State v1 (`contract_version === 1`)**: ไฟล์ `task-state.yaml` สำหรับ `workflow_id ∈ {"bug-fix", "new-feature", "config-change", "data-change"}` ตรวจสอบผ่าน `validateContracts()` เทียบกับ `*-state.schema.json` และ `*-workflow.yaml`
   - **One-Item Identity & `ARCHIVE_LOCATION_AMBIGUOUS` Guard**:
     - คีย์เอกลักษณ์คือ `task_id` และต้องตรงกับชื่อโฟลเดอร์ `<task_id>` ทุกประการ (`TASK_IDENTITY_MISMATCH` → `exit 2`)
     - หาก `task_id` เดียวกันปรากฏอยู่ **ทั้งใน `active` และ `archive` พร้อมกัน** (หรือมีทั้ง `.json` และ `.yaml` ของ `task_id` เดียวกัน) ระบบจะปฏิเสธทันทีด้วย `ARCHIVE_LOCATION_AMBIGUOUS` (`exit 2`) สอดคล้องกับกฎเหล็กใน `scripts/archive-work-item.mjs:97`
     - หากพบไฟล์ JSON/YAML พัง, `contract_version` ไม่รู้จัก, ไม่ผ่าน Schema, หรือ `state_digest` ไม่ตรง → หยุดทำงานทันที (`DATA_ERROR`, `exit 2`)
   - **ประชากรที่มีสิทธิ์ถูกนับ (Eligible Cohort — `evaluatedItems`, แก้ปัญหา Intake Dilution 100%)**:
     - คำนวณชุดสถานะตรวจรับต้นทาง (`reworkSources`) จาก `policy.transitions` ของแต่ละ Workflow ตามฟังก์ชัน `reworkSourceStates(policy)` (`verifying` สำหรับ `bug-fix`/`new-feature`, `monitoring` สำหรับ `config-change`, `validating` สำหรับ `data-change`)
     - รายการจะเข้าสู่ `evaluatedItems` **ก็ต่อเมื่อ `history` มีอย่างน้อย 1 เหตุการณ์ที่เดินเข้าหรือออกจากสถานะใน `reworkSources`** (`history.some(e => reworkSources.has(e.to) || reworkSources.has(e.from))`)
     - งานที่เพิ่งอยู่ใน `intake`, `investigating`, `discovery`, `designing`, `planning`, หรือ `implementing` และยังไม่เคยถึงด่านตรวจรับ จะถูกแยกออกเป็น `pre_verification_count` **ไม่นำมาหารใน `evaluatedItems` เด็ดขาด**
   - **ตัวตั้ง (`reworkedItems`) และสมการเกณฑ์เตือน**:
     - `reworkedItems` = จำนวนรายการใน `evaluatedItems` ที่มี `rework_count > 0`
     - `verifiedReworkBreach = (evaluatedItems >= minSamples) && ((reworkedItems / evaluatedItems) >= 0.15)` (เทียบค่าทศนิยมจริงก่อนปัดเศษ สอดคล้องกับเป้าหมาย `<15%` ใน `METRICS.md:19`)

3. **ลำดับความสำคัญของสถานะรวม (Multi-Metric Precedence Lattice)**:
   - เมื่อประเมินทั้งสองตัวชี้วัดพร้อมกัน สถานะรวมของระบบเรียงลำดับความสำคัญแบบไม่มีช่องว่างดังนี้:
     `DATA_ERROR (exit 2)  >  BREACH_DETECTED (อย่างน้อย 1 ตัวชี้วัดเกิด Breach)  >  INSUFFICIENT_DATA (ไม่มีตัวใด Breach แต่มีอย่างน้อย 1 ตัวที่มี n < minSamples)  >  WITHIN_TARGET (ทุกตัวมี n >= minSamples และต่ำกว่าเกณฑ์)`
   - หากตัวชี้วัดหนึ่งเกิด `BREACH_DETECTED` ขณะที่อีกตัวเป็น `INSUFFICIENT_DATA` สถานะรวมคือ **`BREACH_DETECTED`** โดยในไฟล์ร่าง `INTENT.md` จะแสดงรายการที่เกิด Breach ในหัวข้อหลัก และระบุตัวที่เป็น `INSUFFICIENT_DATA` ไว้ในส่วนข้อมูลประกอบอย่างชัดเจน

---

#### 4.4.2 สัญญา Dual-Digest Integrity และการป้องกันการเขียนทับงานที่มนุษย์แก้ไข (ปิด `RR-05` 100%)

เพื่อขจัดความกำกวมทุกกรณีเมื่อรัน `--emit-intent <path>` ซ้ำ ระบบจะฝังค่าแฮช 2 ตัวที่ทำหน้าที่แยกจากกันอย่างเด็ดขาดในส่วนหัวของไฟล์ร่าง:

1. **`Intent-Fingerprint: sha256:<64-hex>` (แฮชประจำตัวของสัญญาณผิดปกติ — ไม่รวม `git HEAD`)**:
   - คำนวณ SHA-256 บนไบต์ UTF-8 ที่จัดรูปมาตรฐานด้วย **RFC 8785 JSON Canonicalization Scheme (`canonicalizeJcs` จาก `scripts/lib/status-jcs.mjs`)** ของอ็อบเจกต์ต่อไปนี้:
     ```json
     {
       "fingerprint_version": 1,
       "source_mode": "structured",
       "min_samples": 5,
       "thresholds": {
         "dispatch_ledger_expiry_gte": "0.10",
         "verified_rework_gte": "0.15"
       },
       "metrics": {
         "dispatch_ledger_expiry": {
           "status": "BREACH_DETECTED",
           "numerator": 2,
           "denominator": 20,
           "breached_ids": ["evt-002", "evt-009"]
         },
         "verified_rework": {
           "status": "INSUFFICIENT_DATA",
           "numerator": 1,
           "denominator": 1,
           "breached_ids": []
         }
       }
     }
     ```
   - `breached_ids` ถูกเรียงลำดับตัวอักษร UTF-8 เสมอ (ลำดับการอ่านไฟล์บนดิสก์ไม่มีผลต่อค่า Hash)
   - **นโยบาย `Generated-At-Commit` Provenance**: บันทึก `Generated-At-Commit: <git HEAD 40-char SHA หรือ "uncommitted-worktree">` ลงในเนื้อไฟล์เพื่อบอกจุดกำเนิดของร่างฉบับนั้น แต่ **ไม่นำ `Generated-At-Commit` เข้าไปอยู่ใน `Intent-Fingerprint`** ดังนั้นหากมี Commit อื่นเพิ่มเข้ามาโดยที่ข้อมูลความผิดปกติยังเป็นชุดเดิมทุกประการ ระบบจะรู้ทันทีว่าเป็นปัญหาเดิม (ไม่สร้างร่างซ้ำ และคงค่า `Generated-At-Commit` ต้นฉบับของไฟล์เดิมไว้จนกว่าจะสั่ง `--force`)

2. **`Draft-Content-SHA256: sha256:<64-hex>` (แฮชตรวจจับการแก้ไขเนื้อหาโดยมนุษย์)**:
   - คำนวณ SHA-256 บนเนื้อหาไฟล์ร่างทั้งหมดหลังจากแทนที่บรรทัด `Draft-Content-SHA256: ...` เพียงบรรทัดเดียวด้วยข้อความคงที่ `Draft-Content-SHA256: <self>`
   - หากมนุษย์แก้ไขเนื้อหาส่วนใดก็ตาม (เช่น แก้ `Problem`, `Constraints`, หรือลบ/เพิ่มตัวอักษรแม้แต่ตัวเดียว โดยคง `Intent-Fingerprint` เดิมไว้) ค่า `actualContentSha` จะไม่ตรงกับ `Draft-Content-SHA256` ที่ฝังอยู่ทันที

3. **ตารางตัดสินใจของ `--emit-intent <path>` แบบ Mutually Exclusive ครบทุกสถานะ (ไม่มีเงื่อนไขชนกัน)**:

| กรณี | สถานะของ `<path>` และ Flags | เงื่อนไขตรวจสอบแบบ Deterministic | การกระทำต่อไฟล์ (File I/O) | Exit Code |
|---|---|---|---|---|
| **M-01** | ไม่มี Flag พิเศษ (`node scripts/validate-metrics.mjs`) | โหมดปกติเพื่อความเข้ากันได้ย้อนหลัง | ไม่อ่าน/เขียนไฟล์ร่างใดๆ แสดงตารางเดิมทุกบรรทัด | `0` |
| **M-02** | `--emit-intent <path>` เมื่อสถานะรวมคือ `WITHIN_TARGET` หรือ `INSUFFICIENT_DATA` | ไม่มีตัวชี้วัดใดถึงเกณฑ์ Breach | **ไม่สร้างหรือแก้ไขไฟล์** แจ้งเหตุผลทาง `stdout` | `0` |
| **M-03** | `--emit-intent <path>` เมื่อพบ Breach และ `<path>` **ยังไม่มีอยู่บนดิสก์** | ตรวจผ่านก่อนเขียน และเปิดเขียนแบบอะตอมมิกด้วย `fs.openSync(path, 'wx')` (`O_CREAT \| O_EXCL` ป้องกัน Race / No-clobber จริงที่ระดับ OS) | สร้างไฟล์ร่างใหม่ 1 ไฟล์รวมทุก Breach พร้อมทั้ง 2 Digests | `0` *(หรือ `1` เมื่อใช้คู่กับ `--check-thresholds`)* |
| **M-04** | `--emit-intent <path>` เมื่อพบ Breach, `<path>` **มีอยู่แล้ว**, **ไม่ได้ใส่ `--force`**, เนื้อไฟล์ไม่ถูกคนแก้ (`storedContentSha === actualContentSha`), **และ** `storedFingerprint === currentFingerprint` | เป็นสัญญาณปัญหาเดิมทุกประการและร่างเดิมยังไม่ถูกมนุษย์แก้ไข (แม้ `git HEAD` ปัจจุบันจะขยับไปแล้วก็ตาม) | **Idempotent No-op** (ไม่เขียนซ้ำ คง `Generated-At-Commit` เดิมไว้) แจ้ง `NO_OP_UNCHANGED_ANOMALY` ทาง `stdout` | `0` *(หรือ `1` เมื่อใช้คู่กับ `--check-thresholds`)* |
| **M-05** | `--emit-intent <path>` เมื่อพบ Breach, `<path>` **มีอยู่แล้ว**, **ไม่ได้ใส่ `--force`**, และ **เนื้อไฟล์ถูกแก้ไขหรือไม่มี Header มาตรฐาน** (`!storedContentSha \|\| storedContentSha !== actualContentSha` หรือมี Header ซ้ำ) | มนุษย์ได้แก้ไขไฟล์ร่างไปแล้ว (รวมถึงกรณีคง `Intent-Fingerprint` เดิมไว้แต่แก้เนื้อหาตามตัวอย่าง `RR-05`) หรือเป็นไฟล์อื่นที่มีอยู่ก่อน | **Fail-Closed ปกป้องงานที่มนุษย์แก้ (`REJECT_HUMAN_MODIFIED`)**: ห้ามแตะไฟล์เดิม พิมพ์ Error ชัดเจนทาง `stderr` | **`2`** |
| **M-06** | `--emit-intent <path>` เมื่อพบ Breach, `<path>` **มีอยู่แล้ว**, **ไม่ได้ใส่ `--force`**, เนื้อไฟล์เดิมไม่ถูกคนแก้ (`storedContentSha === actualContentSha`), **แต่** `storedFingerprint !== currentFingerprint` | มีร่างเก่าที่เครื่องสร้างค้างไว้ แต่ชุดข้อมูลที่ Breach หรือพารามิเตอร์เกณฑ์เปลี่ยนไปแล้ว | **Fail-Closed แจ้งเตือนร่างเก่าไม่ตรงสัญญาณใหม่ (`REJECT_FINGERPRINT_CHANGED`)**: ห้ามเขียนทับโดยพลการ แนะนำให้ระบุพาธใหม่หรือใช้ `--force` ทาง `stderr` | **`2`** |
| **M-07** | `--emit-intent <path> --force` เมื่อพบ Breach และ `<path>` เป็นไฟล์ปกติที่มีอยู่แล้ว | ผู้ปฏิบัติการสั่งเขียนทับอย่างจงใจ (หากไบต์ใหม่ตรงกับไฟล์เดิมทุกประการให้ข้ามการเขียนซ้ำ; หากต่างให้เขียนผ่าน `atomicWriteFileSync` temp + `fsync` + `rename`) | อัปเดตไฟล์ร่างอย่างปลอดภัยด้วย `Generated-At-Commit` ปัจจุบันและ Digests ใหม่ | `0` *(หรือ `1` เมื่อใช้คู่กับ `--check-thresholds`)* |
| **M-08** | Flag ไม่ถูกต้อง, `--min-samples < 1`, `<path>` เป็น Directory (`EISDIR`), เขียนไม่ได้ (`EACCES`), หรือพบข้อมูลพัง/ซ้ำ (`DATA_ERROR` / `ARCHIVE_LOCATION_AMBIGUOUS` / `DIGEST_INTEGRITY_MISMATCH`) | ความผิดพลาดของอินพุตหรือความสมบูรณ์ของข้อมูล | **ไม่สร้างหรือแก้ไขไฟล์ร่างใดๆ** พิมพ์รหัสและสาเหตุทาง `stderr` | **`2`** |

---

## 5. ลำดับการพึ่งพา การส่งมอบแบบ Stacked PRs และการย้อนกลับ (Dependency & Rollback Architecture — ปิด `RR-04` และหัวข้อ `10.2–10.3`)

แทนที่จะเคลมว่าทุก Slice ไม่มีความเกี่ยวข้องกันเลย รุ่น v3 ระบุ **ความสัมพันธ์เชิงความหมาย (Semantic Dependency DAG)** และลำดับการย้อนกลับตามความเป็นจริงดังนี้:

```text
Slice 1 (Templates INTENT/SPEC + Hardened validate-contracts.mjs + new-feature contract/docs + ADR + Slice-1 Review Record)
   │
   ├──► Slice 3 (Structured Cohort Metrics & Dual-Digest --emit-intent CLI using Slice 1 INTENT.md format + Slice-3 Review Record)
   │       │
   │       ▼
   └──► Slice 4 (ROADMAP-SDLC-FRAMEWORK.md 6-Stage Matrix & 5-Layer Hook Boundary referencing approved Slices 1–3)

Slice 2 (4-Surface 3-Pass Review Policy & Reference 5-Nit Cap)  ──► [Independent of Slices 1 & 3; merges in any order before Slice 4]
```

- **กลยุทธ์การส่งมอบ (Delivery Strategy)**: ส่งมอบแบบ **Stacked / Sequential PRs (1 Slice = 1 PR)** เพื่อให้ผู้ตรวจรับแต่ละด้านตรวจสอบได้ง่าย (~90–250 บรรทัดต่อ PR)
- **การปฏิบัติตาม `validate-review-gate.mjs` และ `security-reviewer`**:
  - เนื่องจาก **ทั้ง Slice 1** (`scripts/validate-contracts.mjs`, `test/validate-contracts.test.mjs`) **และ Slice 3** (`scripts/validate-metrics.mjs`, `test/validate-metrics.test.mjs`) แก้ไขไฟล์ `.mjs` ทั้งสอง Slice จึงต้องมีบันทึกการรีวิวจากผู้ตรวจอิสระของตนเองใน `docs/records/qa/*-code-review.md` และผ่าน `npm run validate:review-gate` ทุก PR
  - นอกจากนี้ Slice 1 ปรับเงื่อนไขทางด่วนของ Workflow จึงกำหนดให้ผ่านการตรวจทานแบบจำกัดขอบเขตโดย **`security-reviewer`** เพื่อยืนยันว่าเงื่อนไข `security_boundary_impact: "none"` และการเช็ก Cross-Field Risk Parity ไม่เปิดช่องให้ข้าม Security Gate
- **ลำดับการย้อนกลับที่ปลอดภัย (Safe Reverse Rollback Order)**:
  - `Slice 4` และ `Slice 2` สามารถ `git revert` แยกอิสระได้ทันทีตลอดเวลา
  - หากต้องการย้อนกลับ `Slice 1` หลังจากที่ `Slice 3` ถูก Merge ไปแล้ว ให้ย้อนตามลำดับย้อนกลับ **`Slice 3` → `Slice 1`** (หรือคงไฟล์แม่แบบ `docs/templates/INTENT.md` ไว้) เนื่องจาก `--emit-intent` ใน Slice 3 อ้างอิงโครงสร้างหัวข้อของ `INTENT.md`
  - **ขอบเขตผลกระทบต่อ CI ของ Slice 3**: คำสั่งเริ่มต้น `npm run validate:metrics` ไม่ได้ถูกผูกเป็น Automatic Merge-Gate Caller ใน CI แต่อยู่ในขอบเขตของ `npm test` (`test/validate-metrics.test.mjs`) และเรียกใช้โมดูลตรวจ Schema มาตรฐานของโปรเจกต์ (`task-state-machine.mjs`, `validate-dispatch-receipts.mjs`, `status-jcs.mjs`, `fenced-commit.mjs`)

---

## 6. Revised Acceptance Criteria (v3) & Complete Traceability Matrix (`TC-001` – `TC-015`)

### 6.1 Acceptance Criteria (v3)

- **AC-001 (Compressed Templates & Canonical Equivalence)**: เพิ่ม `docs/templates/INTENT.md` และ `docs/templates/SPEC.md` โดยคงแม่แบบเดิมทั้ง 34 ไฟล์ไว้ครบถ้วน พร้อมระบุตารางเทียบความสมมูลกับ `REQUIREMENT_DISCOVERY.md` / `SDD.md`, กฎ Source-of-Truth Commit-SHA Linkage, และหัวข้อรองรับ Dual-Digest Advisory Header สำหรับร่างที่สร้างจากระบบวัดผล
- **AC-002 (Hardened Contract Parity, Multi-Branch Fast-Track & Routing Alignment)**:
  1. อัปเดต `scripts/validate-contracts.mjs` (ด้วย TDD) ให้ตรวจ **Top-Level vs. Evidence Classification Parity** (`change_type`, `risk_level`, `risk_tier`, `contains_pii`, `data_change_kind`), ตรวจ `when` เทียบทั้งสองระดับ, และรองรับ **Multi-Branch `(from, to)` Transitions** โดยไม่ทำลายผลลัพธ์ของตัวอย่างเดิมทั้ง 10 ไฟล์
  2. อัปเดต `docs/contracts/new-feature-workflow.yaml` และ `docs/workflows/new-feature.md` เพิ่มกิ่ง `discovery -> planning` และ `planning -> implementing` เฉพาะเมื่อ `risk_level: low` และ `security_boundary_impact: "none"`, `api_contract_impact: "none"`, `data_migration_impact: "none"` (ไม่อนุญาต API ใหม่แม้เป็นแบบ Additive)
  3. อัปเดต `docs/workflow/dynamic-routing.md` เพิ่มตารางเกณฑ์คัดกรอง 6 ข้อ (แยกชัดเจนระหว่าง Machine-Enforced กับ Reviewer/Human-Enforced) และตาราง **Parallel Worktree Sessions vs. In-Session Scoped Subagents** (`G-04`)
  4. บันทึก ADR ใน `DECISIONS.md`, รัน `npm run repin:source-matrix`, ผ่านการตรวจจาก `security-reviewer` และ `code-reviewer` อิสระ พร้อมแนบ `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md` ให้ผ่าน `npm run validate:review-gate`
- **AC-003 (Multi-Surface Review Policy & Reference 5-Nit Cap)**: อัปเดตสอดคล้องกันทั้ง 4 ไฟล์รีวิว (`code-review-gate.md`, `CODE_REVIEW_FINDINGS.md`, `TASK_REVIEW.md`, `code-review-gate/SKILL.md`) ให้ใช้ 3 Passes (`Bugs`, `Security`, `Compliance`), แยก 3 Tiers (`Blocking`, `Human Judgment [Blocks until Human Gate]`, `Non-blocking Nit`), กำหนดเพดานอ้างอิง **5 Nits ต่อรอบรีวิว** พร้อมช่องสรุปยอดส่วนเกิน, กฎ Anti-Downgrade, และคงกฎ Scoped Re-review เดิม
- **AC-004 (Structured Cohort Metrics & Dual-Digest Safe Intent Draft CLI)**: พัฒนาโหมด `--source structured` (และคง `--source legacy-task-log` พร้อมคำเตือน) ใน `scripts/validate-metrics.mjs` และอัปเดต `docs/operating-model/METRICS.md` ตามสัญญาในหัวข้อ `4.4` ครบทุกข้อ (วัด `dispatch_ledger_expiry_rate` บน `closedReceipts` แยกจาก Runtime Timeout; วัด `verified_rework_rate` เฉพาะ `evaluatedItems` ที่เคยถึงด่านตรวจรับพร้อมเช็ก `state_digest` และ `ARCHIVE_LOCATION_AMBIGUOUS`; ใช้เกณฑ์จริงไม่ปัดเศษ `>= 0.10` / `>= 0.15`; แยก `INSUFFICIENT_DATA` เมื่อ `n < minSamples`; และใช้ระบบ `Intent-Fingerprint` + `Draft-Content-SHA256` คู่กับ `wx` / `atomicWriteFileSync` ตามตาราง `M-01`–`M-08`) พร้อมแนบ `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md`
- **AC-005 (Roadmap Alignment & Honest 5-Layer Enforcement Matrix)**: อัปเดต `ROADMAP-SDLC-FRAMEWORK.md` เชื่อมโยงทั้ง 6 Stages เข้ากับ Milestones `M1–M4` พร้อมระบุตาราง **5-Layer Enforcement Boundary** ตามกลไก JSON stdout deny จริง และวางแผน Live Behavioral Evals (`claude -p`) กับ Runtime Dispatch Outcome Producer / Control-Band Automation ไว้ในระยะ M3/M4
- **AC-006 (Zero Regression & Full Gate Verification)**: ผ่านชุดทดสอบ `TC-001`–`TC-015` และชุดตรวจมาตรฐานทั้งหมดของโปรเจกต์ (`npm test`, `validate:contracts`, `validate:context-budget`, `validate:context-compatibility`, `validate:review-gate`, `validate:clearable-refs`, `validate:root-doc-links`, `validate:ci-parity`, `validate:project-state`)

---

### 6.2 Complete Verification & Test Traceability Matrix (`TC-001` – `TC-015`)

| Test ID | AC | ประเภท | สถานการณ์ทดสอบ (ครอบคลุมทุก Edge Case จาก `RR-01`–`RR-05`) | ผลลัพธ์ที่ต้องสังเกตได้จริง (Deterministic Expected Outcome) |
|---|---|---|---|---|
| **TC-001** | AC-002 | Contract Happy Path | `new-feature` เดินครบสาย `intake -> discovery -> planning -> implementing -> verifying -> human-review -> release` โดย `risk_level: low` (ทั้งสองจุด) และ `security/api/data_impact: "none"` รวมถึงตรวจตัวอย่างมาตรฐานเดิมทั้ง 10 ไฟล์ (รวมกรณี `low`-risk ที่เลือกเดินผ่าน `designing` ปกติ) | `validateContracts()` คืน `[]` ทั้งสายทางด่วนและสายมาตรฐานเดิมครบทั้ง 10 ไฟล์ |
| **TC-002** | AC-002 | Contract Cross-Field & Risk Guard (`RR-01`) | ทดสอบ `discovery -> planning` และ `planning -> implementing` เมื่อ: (ก) `top-level: high` + `evidence: low`, (ข) `top-level: low` + `evidence: high`, (ค) `top-level: low` แต่ลบ `evidence.risk_level`, (ง) `medium` และ `critical` | ทุกกรณีถูกปฏิเสธแบบ Fail-Closed พร้อมข้อความระบุ `top-level risk_level ... does not match evidence.risk_level` และ/หรือ `when` mismatch (รวมทั้งตรวจ `config-change` cross-field `risk_tier` mismatch ด้วย) |
| **TC-003** | AC-002 | Contract Impact Exit Guard (`RR-01` E-2..E-4) | ทดสอบ `risk_level: low` ทั้งสองจุด แต่ (ก) `security_boundary_impact: "authz"`, (ข) `api_contract_impact: "additive-endpoint"`, (ค) `data_migration_impact: "schema-migration"`, และ (ง) พยายามข้าม `designing` แล้วแอบใช้ `sa_dev_gate_result` ของสายมาตรฐานใน `planning -> implementing` | ทุกกรณีถูก `validateContracts()` ปฏิเสธทั้งหมด ยืนยันว่าแม้เป็น Additive API หรือ Authz บรรทัดเดียวก็เข้าทางด่วนไม่ได้ |
| **TC-004** | AC-004 | Default CLI Compatibility | รัน `node scripts/validate-metrics.mjs` แบบไม่มี flag | แสดงตารางเดิมทุกบรรทัด, `stderr` ว่างเปล่า, ไม่เขียนไฟล์ใดๆ, `exit 0` |
| **TC-005** | AC-004 | Ledger Expiry Semantics (`RR-02`) | สร้าง Fixture `dispatch-receipts`: (ก) `1` `expired` + `19` `consumed` + `10` `registered` (รวม `registered` ที่อายุ > 14 วัน), (ข) `2` `expired` + `18` `consumed` | ตัวหารนับเฉพาะ `closedReceipts` (`20` ไม่รวม `10` `registered`); กรณี (ก) ได้ `1/20 = 5.0%` (`WITHIN_TARGET`) พร้อมรายงาน `open_registered: 10` แยกต่างหาก; กรณี (ข) ได้ `2/20 = 10.0%` (`BREACH_DETECTED`); ไม่ยุ่งกับ `workflow-evidence/v1` |
| **TC-006** | AC-004 | Rework Cohort & Intake Dilution Immunity (`RR-03`) | สร้าง Fixture `task-state.json` (v2 Envelope): (ก) `1` งานผ่าน `verifying -> rework` + `9` งานอยู่ใน `intake` (`rework_count: 0`), (ข) `1` งาน `verifying -> rework` + `4` งาน `verifying -> handoff` + `50` งาน `intake` | กรณี (ก) `evaluatedItems = 1 (< 5)` คืน `INSUFFICIENT_DATA` (ไม่ถูกเจือจางเป็น `1/10 = 10%`); กรณี (ข) `evaluatedItems = 5` คืน `1/5 = 20.0% >= 15%` (`BREACH_DETECTED`) และ `stderr` ไม่มีคำเตือน Ajv `date-time` |
| **TC-007** | AC-004 | Schema Registry, Digest & Archive Integrity (`RR-03`) | ทดสอบ: (ก) แก้ไข `rework_count` ใน `task-state.json` โดยไม่คำนวณ `state_digest` ใหม่, (ข) มี `task_id` เดียวกันอยู่ทั้งใน `work-items/<id>/` และ `work-items/archive/<id>/`, (ค) `contract_version: 99` ไม่รู้จัก, (ง) `handoff_event_id` ซ้ำหรือไม่ตรงชื่อไฟล์ | ทุกกรณีหยุดแบบ Fail-Closed ด้วย `exit 2` (`DIGEST_INTEGRITY_MISMATCH`, `ARCHIVE_LOCATION_AMBIGUOUS`, `UNSUPPORTED_CONTRACT_VERSION`, `DATA_ERROR`) และไม่ปล่อยไฟล์ร่าง |
| **TC-008** | AC-004 | Unrounded Threshold BVA & Mixed Status | ทดสอบค่าขอบเขต: `19/200 = 9.5%` vs `20/200 = 10.0%` (Ledger Expiry); `29/200 = 14.5%` vs `30/200 = 15.0%` (Verified Rework); และกรณีตัวหนึ่ง `BREACH_DETECTED` ร่วมกับอีกตัวเป็น `INSUFFICIENT_DATA` | `9.5%` และ `14.5%` เป็น `WITHIN_TARGET`; `10.0%` และ `15.0%` เป็น `BREACH_DETECTED`; กรณีผสมคืนสถานะรวม `BREACH_DETECTED` (`exit 1` บน `--check-thresholds`) และบันทึกสถานะทั้งคู่ในร่างอย่างถูกต้อง |
| **TC-009** | AC-004 | Dual-Digest Human-Edit Safety & Provenance (`RR-05`) | ทดสอบ `--emit-intent <path>` ซ้ำใน 5 สถานการณ์: (1) ข้อมูลเดิม + `HEAD` เปลี่ยนโดยคนยังไม่แก้ไฟล์, (2) สลับลำดับไฟล์หลักฐานบนดิสก์, (3) **คนแก้ข้อความ `Problem` แต่คง `Intent-Fingerprint` เดิมไว้** (ไม่มี `--force`), (4) ข้อมูล Breach เปลี่ยนหรือเปลี่ยน `--min-samples` บนไฟล์เดิมที่คนไม่แก้ (ไม่มี `--force`), (5) รันพร้อม `--force` | (1) และ (2) ได้ `NO_OP_UNCHANGED_ANOMALY` (`exit 0`, คง `Generated-At-Commit` เดิม); **(3) ถูกปฏิเสธด้วย `REJECT_HUMAN_MODIFIED` (`exit 2`, เนื้อหาที่คนแก้ปลอดภัย 100%)**; (4) ถูกปฏิเสธด้วย `REJECT_FINGERPRINT_CHANGED` (`exit 2`); (5) เขียนทับแบบอะตอมมิกสำเร็จ (`exit 0`) |
| **TC-010** | AC-004 | CLI Negative & Atomic No-Clobber (`RR-05`) | ส่ง Flag ไม่รู้จัก, `--emit-intent` ไม่ระบุพาธ, `--min-samples 0`, พาธเป็น Directory, และทดสอบการสร้างไฟล์ครั้งแรกด้วยโหมด `wx` (`O_EXCL`) | ทุกกรณี Error คืน `exit 2` ทาง `stderr` โดยไม่สร้างไฟล์ขยะหรือทับไฟล์เดิม |
| **TC-011** | AC-001, AC-002 | Templates, ADR & Context Budget | ตรวจความครบถ้วนของ `INTENT.md`, `SPEC.md` (พร้อมคงแม่แบบเดิม 34 ไฟล์), ตาราง Parallel Worktrees vs Subagents, `npm run repin:source-matrix`, `npm run adr:audit`, และ `npm run validate:context-budget` | ทุกคำสั่งผ่าน `exit 0` และงบประมาณ Context ทุก Tier ไม่เกินเพดาน |
| **TC-012** | AC-002 | Slice-1 Review Gate & Security Gate Check (`RR-04`) | รัน `npm run validate:review-gate` บน Branch ของ Slice 1 (ซึ่งแก้ `.mjs`) และตรวจบันทึกรีวิวจาก `security-reviewer` + `code-reviewer` อิสระ | `validate:review-gate` คืน `PASS` พร้อมไฟล์ `docs/records/qa/*-slice-1-contracts-code-review.md` ที่ระบุช่วง `base_sha..head_sha` ครบถ้วน |
| **TC-013** | AC-003 | 4-Surface Review Consistency | ตรวจความตรงกันของทั้ง 4 ไฟล์รีวิว (`code-review-gate.md`, `CODE_REVIEW_FINDINGS.md`, `TASK_REVIEW.md`, `code-review-gate/SKILL.md`) | ทั้ง 4 จุดระบุ 3 Passes, 3 Decision Tiers, เพดานอ้างอิง 5 Nits + ยอดส่วนเกิน, Anti-Downgrade Rule, และ Scoped Re-review ตรงกันทั้งหมด |
| **TC-014** | AC-004 | Slice-3 Review Gate & QA Static Logic Review | รัน `npm run validate:review-gate` บน Branch ของ Slice 3 พร้อมทำ QA `static-logic-review` บนกิ่งตัดสินใจของ `validate-metrics.mjs` | `validate:review-gate` คืน `PASS` พร้อมไฟล์ `docs/records/qa/*-slice-3-metrics-code-review.md` และผล Trace ไม่พบช่องโหว่ตรรกะ |
| **TC-015** | AC-005, AC-006 | Roadmap, Clearable Refs & Full Regression Suite | รัน `npm run validate:clearable-refs`, `npm run validate:root-doc-links`, `npm run validate:context-compatibility`, `npm run validate:ci-parity`, `npm run validate:project-state`, และ `npm test` | ทุกคำสั่ง `exit 0` ผ่านครบ 100% บนชุดทดสอบทั้งหมดของโปรเจกต์ |

---

## 7. จุดขออนุมัติจากผู้บริหาร / Human Maintainer ก่อนเริ่มพัฒนา (Required Policy Approvals)

เอกสารรุ่น v3 ได้ปิดช่องว่างทางสัญญาและการวัดผลจาก `#6651546438` (`RR-01`–`RR-05`) ครบทุกจุดแล้ว จึงขอรับการตัดสินใจจาก Human Maintainer ใน **3 ประเด็นนโยบายที่ชัดเจนและพร้อมนำไปปฏิบัติจริง** ก่อนติดป้าย `status:spec-ready`:

1. **อนุมัติทางด่วน Low-Risk `SPEC.md` คู่กับการยกระดับ `validate-contracts.mjs` (Slice 1)**:
   - เห็นชอบให้เพิ่ม `INTENT.md` / `SPEC.md` และเปิดทางด่วน `discovery -> planning -> implementing` เฉพาะงาน `risk_level: low` ที่ไม่แตะ Security, Data Migration, หรือ API Contract ใดๆ (**รวมถึงไม่อนุญาต Additive API ในทางด่วน**) พร้อมยกระดับ `validate-contracts.mjs` ให้ตรวจ Cross-Field Risk Parity บังคับใช้ในระดับโค้ดหรือไม่
2. **อนุมัติกติกา 3-Pass Review & เพดานอ้างอิง 5 Nits ต่อรอบรีวิวครบทั้ง 4 จุด (Slice 2)**:
   - เห็นชอบให้นำค่าตัวอย่างเพดาน `5 Nits` ต่อรอบรีวิวจาก `REVIEW.md` ในบทความต้นฉบับมาใช้เป็นค่าเริ่มต้นของโปรเจกต์ โดยห้ามลดระดับ Defect เป็น Nit และให้ประเด็น `Human Judgment Required` หยุดรอที่ Human Gate เสมอหรือไม่
3. **อนุมัติสัญญาการวัดผล `--source structured` แบบแยก Namespace และ Dual-Digest `--emit-intent` CLI (Slice 3)**:
   - เห็นชอบให้วัด **`dispatch_ledger_expiry_rate` (เกณฑ์เตือน `>= 10%` บน `closedReceipts`)** คู่กับ **`verified_rework_rate` (เกณฑ์เตือน `>= 15%` เฉพาะ `evaluatedItems` ที่เคยถึงด่านตรวจรับ, `min-samples = 5`)** โดยแยกจาก Runtime Timeout (ซึ่งชะลอไว้ในระยะ M4 / Issue #35) และใช้กลไก Dual-Digest ปกป้องไฟล์ร่างที่มนุษย์แก้ไขหรือไม่
