# Forensic Round-3 Review Analysis, SDLC Lifecycle Logic & Executive Specification v4 — Issue #303 (End-to-End AI-Native SDLC Integration)

## Metadata

- **Work Item ID**: [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303) · [`docs/records/work-items/2026-11-05-issue-303.md`](../work-items/2026-11-05-issue-303.md)
- **Reviewed Feedback Trail**:
  - Round 1 Feedback: [Issue #303 Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869)
  - Round 1 Response (v2): [Issue #303 Comment `#6651407822`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651407822) (`565207790b25cc1d5a388605ff84a82b153157ea`)
  - Round 2 Re-Review Feedback: [Issue #303 Comment `#6651546438`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651546438) (`RR-01`–`RR-05`, Section 4, Section 10)
  - Round 2 Response (v3): [Issue #303 Comment `#6652115811`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6652115811) (`53b14b4a9fc66588aff93f161cd8a9ba7efe9108`)
  - Round 3 Re-Review Feedback: [Issue #303 Comment `#6653541297`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6653541297) (`R3-01`–`R3-04`, `DW-01`, Section 8)
- **Baseline Commits Audited**: `863306a9e3268f32d416ad76f5a783746b49ea4f` (`origin/main`) and `53b14b4a9fc66588aff93f161cd8a9ba7efe9108` (v3 branch snapshot)
- **Target Branch**: `feat/issue-303-ai-native-sdlc-playbook`
- **Supersedes**:
  - [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md`](./2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md) (retained intact for immutable link auditability)
  - [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md`](./2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md) (retained intact for immutable link auditability)
- **External Primary Source**: [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (August 21, 2026)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook)
- **Change Classification**: `Framework / Meta Change` + `Code Behavior Enhancement` (Slice 1 in `scripts/validate-contracts.mjs`; Slice 3 in `scripts/validate-metrics.mjs`)
- **Risk Level**: `Medium` (modifies contract validator logic, state schema, workflow transition eligibility, multi-surface review policy, and metrics CLI; preserves all security and human approval gates)
- **Lifecycle Phase**: `phase:planning` (awaiting Human Maintainer policy approval before `status:spec-ready` and implementation)
- **Document Status**: `Proposed v4 — Design Addresses Prior Findings (R-01..R-02, RR-01..RR-05, R3-01..R3-04, DW-01..DW-05); Pending Maintainer Approval, Implementation & QA Verification`

---

## 1. บทสรุปสำหรับผู้บริหารและภาพรวมเชิงตรรกะ SDLC ในการปฏิบัติงานจริง (Executive Summary)

### 1.1 สถานะความก้าวหน้าและขอบเขตหลักฐานอย่างซื่อสัตย์ (Calibrated Engineering Posture)

จากการตรวจทานรอบที่ 3 ([`#issuecomment-6653541297`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6653541297)) ผู้รีวิวยืนยันว่าข้อทักท้วงหลักจากรอบที่ 1 และรอบที่ 2 (`RR-01` เรื่อง Top-Level vs. Evidence Parity และการตัด Additive API ออกจากทางด่วน, `RR-02` การแยก `dispatch_ledger_expiry_rate` ออกจาก Runtime Timeout, `RR-03` การนิยาม `evaluatedItems` Cohort และ Schema/Digest Registry, `RR-04` การแยก Review Record และ Security Review ของ Slice 1, `RR-05` กลไก Dual-Digest ป้องกันการเขียนทับไฟล์ร่างที่มนุษย์แก้ไขในเส้นทางปกติ, และ `R-02` กลไก JSON `permissionDecision: "deny"`) **ได้รับการออกแบบที่ตอบโจทย์ตรงจุดแล้วในระดับแผน และไม่ควรนำกลับมาบล็อกซ้ำ**

อย่างไรก็ดี เพื่อให้กระบวนการทำงานจริง (Real-World SDLC Operations) มีตรรกะที่สมบูรณ์ตลอดช่วงชีวิตของงาน (Lifecycle Temporal Logic), การย้อนกลับเมื่อมีข้อมูลบันทึกแล้ว (Persisted-State Rollback), และการรับมือความล้มเหลวระดับ I/O (Failure Semantics) เอกสารรุ่น **v4** ฉบับนี้จึงวิเคราะห์และกำหนดสัญญาเพิ่มเติมเพื่อปิดประเด็นใหม่ทั้ง 5 หมวดจาก `#6653541297` (`R3-01`–`R3-04`, `DW-01`, และหัวข้อ 8):

1. **ความซื่อสัตย์ของสถานะหลักฐาน (Section 8 Discipline)**: เอกสารฉบับนี้คือ **ข้อกำหนดการออกแบบและแผนปฏิบัติการ (Pre-Implementation Specification & Plan)** พร้อมชุดจำลองการตรวจสอบที่รันซ้ำได้จริง (Addressable Reproducible Verification Harness ในหัวข้อที่ 7) โดยระบุสถานะตามจริงว่า **"Design addresses prior findings; production runtime implementation and independent QA verification remain pending `status:spec-ready`"** (ไม่เคลมคำว่า "ไร้ช่องโหว่ 100%" หรือเคลมสถานะ QA PASS ล่วงหน้าก่อนเขียนโค้ดจริง)
2. **มุมมองเชิงตรรกะ SDLC ในโลกจริง (Real-World SDLC Lifecycle Perspective)**:
   - ในการทำงานพัฒนาซอฟต์แวร์จริง งานที่เริ่มต้นด้วยความเสี่ยงต่ำ (`low`-risk fast-track `SPEC.md`) อาจตรวจพบผลกระทบต่อ API, ข้อมูล, หรือขอบเขตความปลอดภัยในภายหลังระหว่างวางแผน (`planning`) หรือระหว่างตรวจรับ (`verifying -> rework`)
   - หากระบบตรวจสอบสัญญา (`validate-contracts.mjs`) นำค่าความเสี่ยงปัจจุบัน (`high`) ไปตรวจย้อนหลังทับเหตุการณ์ทางด่วนในอดีตแบบแข็งตัว ระบบจะบังคับทางอ้อมให้ทีมงาน "ปกปิดความเสี่ยงใหม่" หรือ "ลบประวัติเก่า" เพื่อให้ CI ผ่าน
   - รุ่น v4 จึงออกแบบ **Episode-Scoped Historical Authorization (`classification_snapshot`) คู่กับ Mandatory Design Remediation Invariant** ที่อนุญาตให้ยกระดับความเสี่ยง (`low -> medium/high`) ตามความจริงได้โดยไม่ต้องลบประวัติเดิม แต่ **บังคับให้ต้องเดินผ่านด่านออกแบบของ SA (`designing -> planning` พร้อม `SDD.md` และ `sa_dev_gate_result`) เสมอจึงจะกลับเข้าสู่ `implementing`/`verifying`/`release` ได้**

```text
[01 Plan]        [02 Design]                     [03 Build]              [04 Test]           [05 Deploy]            [06 Maintain]
INTENT.md  ───►  Low-Risk Fast-Track (SPEC.md) ─► IMPLEMENTATION_PLAN.md ─► TDD + Scoped ────► 3-Pass Review + ─────► Structured Cohort
(Human or        │ (If scope/risk escalates       + Parallel Worktrees      CI Validators       5-Nit Cap +            Evaluator (Ledger
 Draft CLI)      ▼  mid-flight: preserve          vs Scoped Subagents     (M3/M4 Live Evals)  PreToolUse JSON Deny   Expiry & Verified
                 classification_snapshot &                                                    + Hosted CI + Human    Rework) ──► Draft
                 MANDATE route to SA SDD.md)                                                                         INTENT.md (3-Phase
                                                                                                                     I/O Safe CLI)
```

---

## 2. การตรวจสอบข้อเท็จจริง การวิเคราะห์เชิงตรรกะ SDLC และบทเรียนจากรอบที่ 3

### 2.1 ตารางตรวจสอบข้อค้นพบจาก Re-Review รอบที่ 3 (`#6653541297`) เทียบกับซอร์สโค้ดจริง

| รหัสประเด็นใน `#6653541297` | ผลการตรวจสอบซ้ำกับซอร์สโค้ด ณ `53b14b4` | การวิเคราะห์เชิงตรรกะ SDLC & ข้อกำหนดสัญญาใน Spec v4 |
|---|---|---|
| **`R3-01` [สำคัญสูง / Contract Gap]**<br>Risk escalation, rework history & causal prefix semantics | **เป็นความจริงตามโค้ดปัจจุบัน**: `scripts/validate-contracts.mjs:132,160` วนตรวจ `state.history` ทุกเหตุการณ์เทียบกับ `state.evidence` ปัจจุบันชุดเดียว และ `new-feature-state.schema.json:38–54` ยังไม่มีฟิลด์เก็บ Snapshot ของการจำแนกความเสี่ยง ณ เวลาที่ตัดสินใจอนุมัติ นอกจากนี้การเช็กว่า "เคยผ่าน `designing`" หากไม่จำกัดเฉพาะ Prefix ก่อนหน้า (`history.slice(0, index)`) และเฉพาะรอบ Requirements ปัจจุบัน (หลัง `to === "discovery"` ล่าสุด) จะทำให้เหตุการณ์ในอนาคตหรือการอนุมัติของรอบก่อนหน้ารั่วข้ามรอบได้ | **กำหนดสัญญา Episode-Scoped Historical Authorization & Mandatory Design Remediation**:<br>1) **Strict Causal Prefix & Episode Boundary**: การเลือกกิ่ง `planning -> implementing` ที่ดัชนี `index` จะพิจารณาเฉพาะเหตุการณ์ก่อนหน้า `history.slice(0, index)` ที่เกิดขึ้น **หลังการเข้าสู่ `discovery` ครั้งล่าสุด (`to === "discovery"`)** เท่านั้น (`rework -> discovery` รีเซ็ตรอบการออกแบบเดิม; ส่วน `rework -> planning` หรือ `rework -> implementing` ที่ไม่เปลี่ยน Requirements ยังคงใช้ `SDD.md` ในรอบเดียวกันได้)<br>2) **Optional `classification_snapshot` ใน `new-feature-state.schema.json`**: เมื่อมีการยกระดับความเสี่ยง (`low -> medium/high` หรือพบผลกระทบ Security/API/Data ภายหลัง) เหตุการณ์ทางด่วนในอดีตสามารถเก็บ `classification_snapshot` ณ เวลาที่อนุมัติได้<br>3) **Mandatory Design Remediation Invariant**: หาก Classification ปัจจุบันไม่ผ่านเกณฑ์ทางด่วนอีกต่อไป งานนั้นจะเข้าสู่สถานะ `planning`, `implementing`, `verifying`, `human-review`, หรือ `release` ได้ **ก็ต่อเมื่อมีเหตุการณ์ `designing -> planning` (พร้อม `SDD.md` และ `ba_sa_gate_result`) ตามด้วย `planning -> implementing` กิ่งมาตรฐาน (`sa_dev_gate_result`) เกิดขึ้นหลังเหตุการณ์ทางด่วนนั้นแล้วเท่านั้น** (ระหว่างกำลังแก้ไขอนุญาตให้พักอยู่ใน `discovery`, `designing`, `rework`, หรือ `blocked`) |
| **`R3-02` [สำคัญกลาง / Recovery Gap]**<br>Rollback compatibility เมื่อมี `task-state` ที่ใช้ทางด่วนบันทึกไว้แล้ว | **เป็นความจริงเชิงปฏิบัติการ**: หาก Slice 1 ถูกใช้งานจริงจนมีไฟล์สถานะ (`task-state.yaml`) บันทึก `discovery -> planning` ลงใน `history` แล้ว การทำ `git revert` โค้ด Slice 1 กลับเป็น Policy เดิมจะทำให้ `validateContracts()` และ `validate-metrics.mjs` ปฏิเสธไฟล์ประวัติเหล่านั้นด้วย `illegal transition: discovery -> planning` และการแก้ประวัติย้อนหลังให้ดูเหมือนผ่าน `designing` เป็นสิ่งที่ห้ามทำเพราะทำลาย Audit Trail | **แยกแผน Rollback ของ Slice 1 เป็น 2 กรณี (Two-Regime Rollback Runbook)**:<br>- **Regime 1 (Pre-Adoption — ยังไม่มี State ที่ใช้ทางด่วน)**: ตรวจด้วยคำสั่งสแกนว่าไม่มี `discovery -> planning` ใน `docs/records/work-items/**` แล้วใช้ `git revert` (`Slice 3 -> Slice 1`) + `repin-source-matrix.mjs` ได้ทันที<br>- **Regime 2 (Post-Adoption Sunset — มี State ที่ใช้ทางด่วนแล้ว)**: **ห้ามแก้ `history` ย้อนหลังและห้าม Revert โค้ดตัวอ่านใน `validate-contracts.mjs`** แต่ให้ตั้งค่า `historical_only: true` บนกิ่งทางด่วนใน `new-feature-workflow.yaml` ซึ่งจะ: (ก) อนุญาตให้ระเบียนที่จบงานแล้ว (`state === "release"`) หรือระเบียนที่ผ่านการซ่อม `designing -> planning` แล้วตรวจผ่านปกติ และ (ข) บล็อกงานใหม่หรืองานที่กำลังค้างอยู่ในทางด่วน (`planning`/`implementing`/`verifying`/`rework`) โดยกำหนดให้ **SA Agent + Human Maintainer** ต้องสั่ง Route เข้า `designing -> planning` เพื่อแนบ `SDD.md` ก่อนเดินหน้าต่อ |
| **`R3-03` [สำคัญกลาง / Failure Contract Gap]**<br>ความต่างระหว่าง No-clobber (`wx`), Atomic Replacement, และ Post-Rename Directory `fsync` | **ผลการทดลองของผู้รีวิวถูกต้อง 100%**:<br>1) ใน `scripts/lib/fenced-commit.mjs:79–84` คำสั่ง `ops.renameSync(tmpPath, resolved)` เกิดขึ้น **ก่อน** `syncDirectorySync(dir, io)` ดังนั้นหาก `syncDirectorySync` โยน `EIO` ไฟล์ปลายทางถูกเปลี่ยนเนื้อหาเป็นของใหม่ไปแล้ว<br>2) การเปิดไฟล์ใหม่ด้วย `fs.openSync(dest, 'wx')` หากเขียนค้างกลางคัน (`ENOSPC`) แล้วไม่ `unlinkSync` เฉพาะไฟล์ที่โปรเซสตัวเองเพิ่งสร้าง จะทิ้งไฟล์พัง (`"partial"`) ค้างไว้บนดิสก์ | **แยกสัญญาความล้มเหลวของ `--emit-intent` เป็น 3 ระยะ (3-Phase I/O Failure Contract)**:<br>- **Phase 1 (Preflight, Input, Data & Guard Checks)**: ทำงานก่อนเปิด File Descriptor ใดๆ รับประกัน **`NO_WRITE_PERFORMED` (`targetModified: false`, `exit 2`)** 100%<br>- **Phase 2 (Write Staging & Exclusive Create)**:<br>  - โหมดสร้างใหม่ (`wx`): ติดตามตัวแปร `createdByUs` หาก `openSync` ล้มเหลวด้วย `EEXIST` (`createdByUs === false`) **ห้าม `unlink` ไฟล์ของโปรเซสอื่นเด็ดขาด** (`EEXIST_RACE_DETECTED`, `exit 2`); แต่หาก `openSync` สำเร็จ (`createdByUs === true`) แล้วเกิด `ENOSPC` / Short Write / `fsync` ล้มเหลวก่อนปิดไฟล์ ระบบจะปิด `fd` และ **`unlinkSync` ไฟล์ที่ตัวเองเพิ่งสร้างทันที** (`WRITE_ABORTED_CLEANED_UP`, `targetModified: false`, `exit 2`)<br>  - โหมด `--force`: เขียนลงไฟล์ชั่วคราว `.tmp-*` + `fsync` ก่อน `renameSync` หากล้มเหลวก่อน `renameSync` จะลบ `.tmp-*` และไฟล์ปลายทางไม่เปลี่ยน (`TARGET_UNCHANGED_BEFORE_COMMIT`, `exit 2`)<br>- **Phase 3 (Post-Commit Directory Sync)**: จุด Commit คือหลัง `fsyncSync(fd) + closeSync(fd)` (สำหรับ `wx`) หรือหลัง `renameSync` (สำหรับ `--force`) หาก `syncDirectorySync(dir)` ล้มเหลวหลังจากจุดนี้ ระบบจะรายงานรหัสแยกเฉพาะ **`POST_COMMIT_DIR_SYNC_FAILED` (`targetModified: true`, `exit 2`)** โดยแจ้งตรงไปตรงมาว่าไฟล์ร่างถูกเขียน/แทนที่สำเร็จแล้วแต่การ Sync ไดเรกทอรีล้มเหลว |
| **`R3-04` [สำคัญกลาง / CLI Compatibility]**<br>ความเข้ากันได้ของ `--source legacy-task-log` กับ Flags ชุดใหม่ | **เป็นคำถามความชัดเจนของสัญญาอินเทอร์เฟซที่มีหลักฐานชัดเจนใน `docs/operating-model/METRICS.md:45`**: บรรทัดที่ 45 ของ `METRICS.md` ระบุไว้แล้วว่า *"The snapshot is historical compatibility evidence. It must not be used as authoritative telemetry or a pass/fail decision until structured event evidence is available."* ดังนั้นการนำค่า Keyword Count จาก `TASK_LOG.md` มาตัดสิน Pass/Fail หรือสร้างใบงานอัตโนมัติจึงขัดกับนโยบายหลัก | **เลือกทางเลือกที่ 1 ตาม `METRICS.md:45` อย่างเด็ดขาด (Strict Legacy Dashboard Isolation)**:<br>1) การรันโดยไม่ใส่ Flag (`node scripts/validate-metrics.mjs`) หรือใส่ `--source legacy-task-log` เพียงอย่างเดียว จะแสดง Dashboard เดิมเพื่อดูแนวโน้มเท่านั้น (`exit 0`) และใช้ชื่อแถวเดิม (`Subagent timeouts`, `Rework cycles`) ไม่ปนกับชื่อตัวชี้วัดใหม่<br>2) หากส่ง `--check-thresholds`, `--emit-intent <path>`, `--min-samples <n>`, หรือ `--force` ร่วมกับ `--source legacy-task-log` (หรือส่ง Flags เหล่านี้โดยไม่ระบุ `--source structured`) ระบบจะปฏิเสธตั้งแต่ Phase-1 Preflight ด้วยรหัส **`INCOMPATIBLE_SOURCE_FLAGS` (`exit 2`, ไม่เขียนไฟล์ใดๆ)** |
| **`DW-01` [Policy & Audit Scope Accuracy]**<br>ขอบเขตของ Core Policy ต่อ Optional Skill Library และสิ่งที่ `validate-skill-parity.mjs` ตรวจจริง | **ข้อทักท้วงของผู้รีวิวถูกต้องตามซอร์สโค้ด 100%**:<br>1) `AGENTS.md:67` และ `docs/workflows/stabilize-core.md:18` ระบุชัดเจนว่า Skill Trees เป็น Optional Libraries ที่แก้ไขแยกกันได้โดยไม่บังคับ Cross-Platform Mirror ทั้งคลังเป็นนโยบายหลัก<br>2) `scripts/validate-skill-parity.mjs:43–56` คำนวณ MD5 เฉพาะไฟล์ `SKILL.md` เท่านั้น ไม่ได้ตรวจไฟล์ย่อย `templates/CODE_REVIEW_FINDINGS.md` (`NESTED_TEMPLATE_DRIFT {"passed":1,"failed":0}`) | **ปรับคำอธิบายและขอบเขตหลักฐานใน `DW-01` และ `TC-013` ให้ตรงตามความจริง**:<br>1) ระบุว่าการปรับครบทั้ง 9 ไฟล์ใน Slice 2 เป็น **Deliberate Delivery Choice เฉพาะของ Issue #303** เพื่อไม่ให้สำเนาสกิล `code-review-gate` บนแพลตฟอร์มใดค้างกติกาเก่า โดยไม่สร้างข้อบังคับใหม่ให้ต้อง Mirror หรือรัน Audit ทั้งคลังเป็น Merge Gate ถาวร<br>2) แยกหลักฐานการตรวจใน `TC-013` อย่างซื่อสัตย์: ใช้ `validate-skill-parity.mjs` เป็นเพียงตัวเช็กความตรงกันของ `SKILL.md` ทั้ง 3 ต้นไม้ และใช้ **การเปรียบเทียบแฮช/เนื้อหาไฟล์ตรงตามพาธ (`sha256` / `diff`) คู่กับการตรวจของ Independent Reviewer** สำหรับไฟล์แม่แบบย่อย `templates/CODE_REVIEW_FINDINGS.md` และความสอดคล้องเชิงความหมายของทั้ง 9 ไฟล์ |
| **หัวข้อ 8 [Prototype & Calibrated Claims]**<br>ขอบเขตของ Prototype และถ้อยคำ "100%" | **เห็นพ้องทุกประการ**: สคริปต์จำลองช่วยพิสูจน์ตรรกะของอัลกอริทึมได้ดี แต่ยังไม่ใช่การรัน Production Validator ที่ Merge แล้ว และการใช้คำว่า "ปิดช่องโหว่ 100%" อาจทำให้เข้าใจผิดว่าผ่านการตรวจรับระดับ Runtime แล้ว | 1) ปรับถ้อยคำในเอกสารทั้งหมดให้ใช้ **"Design addresses prior findings; pending implementation & QA verification"**<br>2) แนบชุดคำสั่ง **Reproducible Verification & Fault-Injection Harness ฉบับสมบูรณ์** ไว้ในหัวข้อที่ 7 ของสเปกฉบับนี้ เพื่อให้ผู้ตรวจสามารถคัดลอกไปรันซ้ำและตรวจผลลัพธ์ของ `R3-01`–`R3-04` ได้ทันที |

---

### 2.2 บทเรียนเชิงวิศวกรรมเพิ่มเติมจากการตรวจทานรอบที่ 3 (`L-08` – `L-11`)

นอกเหนือจากบทเรียน `L-01`–`L-07` ในรอบก่อนหน้า การวิเคราะห์รอบที่ 3 นี้ให้บทเรียนสำคัญในมุมมอง SDLC และวิศวกรรมระบบอีก 4 ข้อ (บันทึกใน [`docs/records/lessons-learned/2026-11-05-issue-303-review-lessons.md`](../lessons-learned/2026-11-05-issue-303-review-lessons.md)):

- **Lesson L-08 (Temporal Lifecycle & Causal History Prefix — `R3-01`)**: กฎ State Machine ของ SDLC ต้องรองรับการค้นพบความเสี่ยงเพิ่มระหว่างทาง (Mid-Flight Risk Escalation) และการย้อนกลับ (Rework Episodes) เสมอ การประเมินเงื่อนไขของเหตุการณ์ที่ดัชนี `i` ต้องอ้างอิงเฉพาะ **Causal Prefix (`history[0..i-1]`) ภายในรอบ Requirements ปัจจุบัน** และเมื่อความเสี่ยงถูกยกระดับ ต้องอนุญาตให้เก็บ Snapshot ของการอนุมัติเดิมคู่กับการบังคับให้เดินผ่านด่านออกแบบ (`designing -> planning`) ใหม่ก่อนปล่อยงาน
- **Lesson L-09 (Persisted-State Rollback Compatibility — `R3-02`)**: แผนการ Rollback สำหรับการเปลี่ยนแปลง Schema หรือ State Transition ไม่สามารถดูแค่การ `git revert` โค้ดได้ แต่ต้องแยกกรณี "ก่อนมีข้อมูลสถานะใหม่" ออกจาก "หลังมีข้อมูลสถานะที่เดินผ่านกิ่งใหม่บันทึกอยู่ในระบบแล้ว" โดยใช้กลไกปิดรับงานใหม่ (`historical_only: true`) ที่ยังอ่านประวัติเก่าที่จบแล้วได้โดยไม่ต้องแก้ไขประวัติย้อนหลัง
- **Lesson L-10 (Commit-Point & 3-Phase I/O Failure Semantics — `R3-03`)**: คำว่า "ไม่เขียนทับไฟล์เดิม (`wx`)", "แทนที่ไฟล์แบบอะตอมมิก (`renameSync`)", และ "เกิด Error แล้วไฟล์ไม่เปลี่ยน" เป็นคนละคำรับประกันกัน ผู้พัฒนาต้องไล่โค้ด Helper จนถึงจุด Commit จริง (`renameSync` เกิดก่อน `syncDirectorySync`) แยกการจัดการ Error ก่อนเขียน, ระหว่างเขียน (ลบไฟล์ที่ตัวเองเพิ่งสร้างด้วย `wx` เมื่อเกิด `ENOSPC` โดยห้ามแตะไฟล์ของคนอื่นเมื่อเกิด `EEXIST`), และหลัง Commit อย่างชัดเจน
- **Lesson L-11 (Distinguishing Project Policy from Optional Tooling & Calibrated Claims — `R3-04`, `DW-01`, Sec 8)**: การมีสคริปต์ตรวจ (`validate-skill-parity.mjs`) ไม่ได้แปลว่านโยบายหลัก (`AGENTS.md:67`) บังคับใช้เป็น Gate ทั้งคลัง และต้องตรวจให้ชัดว่าสคริปต์นั้นตรวจลึกถึงระดับใด (ตรวจเฉพาะ `SKILL.md` ไม่รวมไฟล์ย่อยใน `templates/`) พร้อมทั้งใช้ถ้อยคำที่สะท้อนสถานะหลักฐานตามจริง

---

## 3. การเชื่อมโยง AI-Native SDLC ครบทั้ง 6 Stages (End-to-End Primary-Source Mapping v4)

| Stage | Play / แนวคิดในบทความ Anthropic | กลไกใน Repo ปัจจุบัน (`863306a`) | การยกระดับใน Issue #303 (Spec v4) |
|---|---|---|---|
| **01 Plan** | **Capture as `intent.md`** | มี `PROJECT_BRIEF.md` และ `REQUIREMENT_DISCOVERY.md` | **Slice 1**: เพิ่ม `docs/templates/INTENT.md` เป็นใบตั้งต้นมาตรฐานที่ใช้ร่วมกันได้ทั้งจากมนุษย์และจากระบบแจ้งเตือนใน Stage 06 |
| **02 Design** | **Single-session `spec.md` & Mid-Flight Risk Escalation** | `dynamic-routing.md:92` อนุญาต Lightweight Spec แต่ `new-feature-workflow.yaml` บังคับผ่าน `designing` + `SDD.md` | **Slice 1**: เพิ่ม `docs/templates/SPEC.md` + ตารางคัดกรอง 6 ข้อ (ไม่รวม API ใหม่ทุกชนิด) + ยกระดับ `validate-contracts.mjs` และ `new-feature-state.schema.json` ให้รองรับทั้งทางด่วน `low`-risk, การยกระดับความเสี่ยงระหว่างทาง (`classification_snapshot` + Mandatory SA Remediation `R3-01`), และโหมดปิดทางด่วนโดยไม่ทำลายประวัติเก่า (`historical_only: true` `R3-02`) |
| **03 Build** | **Plan mode (`plan.md`), Source of Truth, Parallel Worktrees vs Subagents** | มี `IMPLEMENTATION_PLAN.md`, `core-bootloader.md`, และกฎ Worktree ใน `AGENTS.md` | **Slice 1**: คง `IMPLEMENTATION_PLAN.md` เป็น `plan.md`, ผูก Commit-SHA Source of Truth ใน `INTENT.md`/`SPEC.md`, และเพิ่มตารางตัดสินใจ **Parallel Worktree Sessions vs. In-Session Scoped Subagents** ใน `dynamic-routing.md` |
| **04 Test** | **Feedback loop & Continuous evals in CI** | มี `npm test` (`801` deterministic tests) และ `run-scoped-validations.mjs` | **Slice 1 & 3 (TDD) + Slice 4 (Roadmap)**: เพิ่มชุดทดสอบ Contract/Lifecycle/Rollback/Metrics/I/O Fault-Injection (`TC-001`–`TC-015`) และวางแผน Live Non-Interactive Agent Behavioral Evals (`claude -p`) ไว้ใน Milestone M3/M4 |
| **05 Deploy** | **`REVIEW.md` (3 Passes + 5-Nit Cap) & Hooks as Approval Gates** | มีไฟล์รีวิวหลักและสำเนาสกิล `code-review-gate`, `validate-pr-readiness.mjs --hook` (JSON `deny`), และ Hosted CI | **Slice 2 & Slice 4**: ปรับปรุงไฟล์รีวิวและสำเนาสกิล `code-review-gate` ทั้ง 9 ไฟล์ของ Issue นี้ให้สอดคล้องกัน (3 Passes + เพดานอ้างอิง **5 Nits ต่อรอบรีวิว**) พร้อมบันทึกตาราง 5-Layer Enforcement Boundary ตามกลไก JSON stdout protocol จริง |
| **06 Maintain** | **Deterministic Threshold Detection → Draft `intent.md` → Human Triage** | มี `validate-metrics.mjs` (regex บน `TASK_LOG`), `dispatch-receipt.schema.json`, และ `durable-task-envelope.schema.json` | **Slice 3**: สร้างโหมด `--source structured` วัด **`dispatch_ledger_expiry_rate`** และ **`verified_rework_rate`** บน Evaluated Cohort (แยกขาดจาก `--source legacy-task-log` ตาม `METRICS.md:45` `R3-04`) พร้อม `--emit-intent` แบบ Dual-Digest และสัญญาจัดการความล้มเหลวระดับ I/O ครบ 3 ระยะ (`R3-03`) |

---

## 4. ข้อกำหนดทางสถาปัตยกรรมและสัญญาเทคนิคฉบับสมบูรณ์ (Detailed Technical Contracts v4)

### 4.1 Stage 01 & 02 Contract: Compressed Artifact Route, Parity, Temporal Escalation & Rollback Compatibility (ตอบโจทย์ `RR-01`, `R3-01`, `R3-02`)

#### 4.1.1 ตารางเกณฑ์คัดกรอง 6 ข้อแบบ Conjunctive (ต้องผ่านครบทุกข้อ และไม่อนุญาต Additive API ในทางด่วน)

| รหัส | เกณฑ์คัดกรอง | เงื่อนไขที่อนุญาตให้ใช้ `SPEC.md` ทางด่วน | เงื่อนไขบังคับออกจากทางด่วน (Mandatory Exit → Owner) | การบังคับใช้ (Enforcement Layer) |
|---|---|---|---|---|
| **E-1** | **Risk Level** | `risk_level === "low"` ทั้งในระดับ Top-level และใน `evidence.risk_level` ตรงกัน | `medium`, `high`, `critical` หรือค่า Top-level ขัดกับ `evidence` → **SA Agent (`designing` + `SDD.md`)** | **Machine-enforced** (`validate-contracts.mjs` parity + `when`) + **Reviewer-verified** |
| **E-2** | **Security & Trust Boundary** | `security_boundary_impact === "none"` (ไม่แตะ Auth/Authz, Secrets, Crypto, PII/Privacy, Payment, Hook/CI Gate Controls) | แตะขอบเขตความปลอดภัยแม้เพียงบรรทัดเดียว → **Security Reviewer + SA Agent + Human Gate** | **Machine-enforced** (`when` บนฟิลด์ที่ประกาศ) + **Path/Diff-verified** โดย `validation-scope.mjs`, `security-reviewer` และ QA |
| **E-3** | **Architecture & API Contract Impact** | `api_contract_impact === "none"` (**ไม่มีการเพิ่ม แก้ไข หรือลบ External/Public/Shared HTTP, RPC, CLI, Event หรือ Schema Contract — แม้เป็นการเพิ่มแบบ Additive ก็ไม่อนุญาตในทางด่วน** เพื่อให้ตรงกับ `dynamic-routing.md:93` และ `new-feature.md:10`) | มี API/CLI/Schema/Integration ใหม่หรือแก้ไข (รวมทั้ง Additive API) หรือกระทบหลายโมดูลข้ามขอบเขต → **SA Agent (`designing` + `SDD.md`)** | **Machine-enforced** (`when: { api_contract_impact: "none" }`) + **Independent Reviewer diff check** |
| **E-4** | **Data & Migration Impact** | `data_migration_impact === "none"` (ไม่มี Production Data change, Schema Migration, หรือ Backfill) | มี Migration/Data change → **SA Agent / Data Agent + Human Gate** | **Machine-enforced** (`when: { data_migration_impact: "none" }`) + **Independent Reviewer diff check** |
| **E-5** | **Requirement Clarity** | คำถามค้างคาใน `INTENT.md` ได้รับคำตอบครบ หรือเจ้าของงานอนุมัติขอบเขตชัดเจนใน `SPEC.md` แล้ว | โจทย์กำกวมหรือแหล่งข้อมูลธุรกิจขัดแย้งกัน → **BA/PM Agent หรือ Human Maintainer** | **Process & Human-Gate enforced** ก่อนติดป้าย `status:spec-ready` |
| **E-6** | **Independent Verification** | มีป้าย `status:spec-ready` ก่อนเริ่มเขียนโค้ด และผู้ตรวจรับ (`QA / Code Reviewer`) เป็นคนละ Agent Identity กับผู้พัฒนา | การสลับบทบาทเองใน Session เดียวเพื่ออนุมัติงานตัวเอง → **บล็อกตาม `dynamic-routing.md:33,37`** | **Process, PR Audit & Human-Gate enforced** (`validate-review-gate.mjs` ตรวจเฉพาะการมีไฟล์รีวิวใหม่ใน Diff) |

#### 4.1.2 Cross-Field Classification Parity & Causal Episode-Scoped Branch Selection (`RR-01` & `R3-01`)

1. **Cross-Field Classification Parity Guard (`validateTopLevelEvidenceParity`)**:
   - ฟิลด์ระดับบนสุดของเอกสารสถานะ (`change_type`, `risk_level`, `risk_tier`, `contains_pii`, `data_change_kind`) เป็น **Authoritative Classification Fields**
   - ทุกครั้งที่ฟิลด์ข้างต้นปรากฏอยู่ในทั้ง `state[field]` และ `state.evidence[field]` ค่าทั้งสองต้องตรงกันทุกประการ (สำหรับ Array เทียบชุดข้อมูลที่เรียงลำดับแล้ว) หากขัดแย้งกันจะถูกปฏิเสธทันทีด้วยข้อความ:
     `<path>: top-level <field> (<val1>) does not match evidence.<field> (<val2>)`
2. **Causal History Prefix & Episode-Scoped Multi-Branch Selection (`selectTransitionBranch` — ปิดช่องโหว่ `R3-01`)**:
   - เปลี่ยนโครงสร้างเก็บ `policy.transitions` ใน `validateHistory()` จาก `Map<string, Transition>` เป็น `Map<string, Transition[]>`
   - เมื่อตรวจสอบเหตุการณ์ `event = state.history[index]`:
     - นิยาม **Causal History Prefix** คือ `prefix = state.history.slice(0, index)` (**ห้ามนำเหตุการณ์ที่ `> index` ในอนาคตมาใช้ตัดสินใจเลือกกิ่งของเหตุการณ์ที่ `index` เด็ดขาด**)
     - นิยาม **Current Requirements Episode** คือลำดับเหตุการณ์ใน `prefix` นับตั้งแต่หลังเหตุการณ์ล่าสุดที่เข้าสู่สถานะ `discovery` (`lastDiscoveryIdx = prefix.findLastIndex(e => e.to === "discovery")`, `episodeEvents = prefix.slice(lastDiscoveryIdx + 1)`)
     - นิยาม `hasEpisodeDesign = episodeEvents.some(e => e.from === "designing" && e.to === "planning")`
     - สำหรับ `planning -> implementing` ใน `new-feature-workflow.yaml`:
       - หาก `hasEpisodeDesign === true` (ในรอบ Requirements ปัจจุบัน งานได้เดินผ่าน `designing -> planning` มาแล้วก่อนถึง `index`): เลือกตรวจ **กิ่งมาตรฐานของ SA** (`requires: [spec_readiness_checklist, implementation_plan, sa_dev_gate_result]`, ไม่มีเงื่อนไขจำกัด `when: { risk_level: low }`)
       - หาก `hasEpisodeDesign === false` (ในรอบ Requirements ปัจจุบัน งานเดินข้าม `designing` มาจาก `discovery -> planning`): เลือกตรวจ **กิ่งทางด่วน `SPEC.md`** (`requires: [spec_readiness_checklist, implementation_plan, compressed_spec_reference, spec_readiness_gate_result]`, พร้อมตรวจ `when: { risk_level: low, security_boundary_impact: "none", api_contract_impact: "none", data_migration_impact: "none" }`)

#### 4.1.3 สัญญาการยกระดับความเสี่ยงระหว่างทางและอายุความของหลักฐานข้ามรอบ Rework (`R3-01` Temporal Escalation & Evidence Validity Contract)

เพื่อสะท้อนการทำงานจริงใน SDLC เมื่อทีมงานเริ่มงานด้วยทางด่วน `low`-risk แล้วตรวจพบความเสี่ยงระดับ `medium`/`high` หรือพบผลกระทบต่อ API/Security/Data ภายหลัง (เช่น ระหว่าง `planning` หรือระหว่าง `verifying -> rework`):

1. **การเพิ่ม Optional `classification_snapshot` ใน `docs/contracts/schemas/new-feature-state.schema.json`**:
   - ขยาย Schema ของแต่ละรายการใน `history` ให้รองรับฟิลด์ทางเลือก `classification_snapshot` แบบเข้มงวด (`additionalProperties: false`):
     ```json
     "classification_snapshot": {
       "type": "object",
       "additionalProperties": false,
       "required": [
         "risk_level",
         "security_boundary_impact",
         "api_contract_impact",
         "data_migration_impact"
       ],
       "properties": {
         "risk_level": { "enum": ["low", "medium", "high", "critical"] },
         "security_boundary_impact": { "type": "string", "minLength": 1 },
         "api_contract_impact": { "type": "string", "minLength": 1 },
         "data_migration_impact": { "type": "string", "minLength": 1 }
       }
     }
     ```
   - ฟิลด์นี้เป็น **Optional** ดังนั้น `contract_version: 1` และตัวอย่างมาตรฐานเดิมทั้ง 10 ไฟล์จึงทำงานได้เหมือนเดิมทุกประการโดยไม่เกิด Breaking Change
2. **กฎการตรวจสอบ Historical Decision vs. Current Classification (`validateWhenClause` + Mandatory Design Remediation Invariant)**:
   - **กรณีปกติ (ไม่มีการยกระดับความเสี่ยง — ไม่มี `event.classification_snapshot`)**:
     - ตรวจเงื่อนไข `transition.when` เทียบกับทั้ง `state.evidence[field]` และ `state[field]` ปัจจุบันโดยตรง
   - **กรณีมีการยกระดับความเสี่ยงภายหลัง (`event.classification_snapshot` ถูกบันทึกไว้บนเหตุการณ์ทางด่วน `history[index]`)**:
     1. **ตรวจความถูกต้องของการอนุมัติในอดีต**: `event.classification_snapshot` ต้องผ่านเงื่อนไข `transition.when` ของกิ่งทางด่วนนั้นครบทุกข้อ (ยืนยันว่า ณ เวลา `event.at` งานมีคุณสมบัติครบตามเกณฑ์ทางด่วนจริง)
     2. **ตรวจว่าปัจจุบันเกิดการยกระดับความเสี่ยงออกนอกเกณฑ์ทางด่วนหรือไม่**: นำ Classification ปัจจุบัน (`state` + `state.evidence`) มาเทียบกับ `transition.when` หากค่าปัจจุบัน **ไม่ผ่านเกณฑ์ทางด่วนอีกต่อไป** (เช่น `risk_level` กลายเป็น `medium`/`high` หรือ `security_boundary_impact` กลายเป็น `"authz"`):
        - **เงื่อนไขที่ 1 (ต้องมีบันทึกเหตุผลการยกระดับ)**: ใน `state.evidence` ต้องมีฟิลด์อธิบายสาเหตุการยกระดับ/การออกแบบใหม่อย่างมีความหมาย (`risk_escalation_reason`, `redesign_scope`, `design_gap`, หรือ `requirement_gap`)
        - **เงื่อนไขที่ 2 (Mandatory Design Remediation Invariant)**: ตรวจลำดับเหตุการณ์หลังจากดัชนีนั้น (`suffix = state.history.slice(index + 1)`) ว่ามีเหตุการณ์ **`designing -> planning` (`later.from === "designing" && later.to === "planning"`)** เกิดขึ้นตามมาแล้วหรือไม่:
          - หาก **ยังไม่มี `designing -> planning` ตามมา**: สถานะปัจจุบันของงาน (`state.state`) จะได้รับอนุญาตให้อยู่ได้เฉพาะใน **สถานะพักรอการแก้ไขก่อนพัฒนา (`REMEDIATION_HOLD_STATES = {"discovery", "designing", "rework", "blocked"}`)** เท่านั้น! หากงานพยายามค้างอยู่ใน `planning` หรือเดินหน้าเข้าสู่ `implementing`, `verifying`, `human-review`, หรือ `release` โดยยังไม่ผ่าน `designing -> planning` ระบบจะปฏิเสธทันทีด้วยข้อความ:
            `<path>: unremediated fast-track escalation at history[<i>] (<from> -> <to>): current classification no longer satisfies fast-track when-clause and requires routing through designing -> planning before state "<state>"`
          - หาก **มี `designing -> planning` ตามมาแล้ว**: เหตุการณ์ `planning -> implementing` ที่เกิดขึ้นหลัง `designing -> planning` นั้นจะถูก `selectTransitionBranch()` บังคับให้เข้า **กิ่งมาตรฐานของ SA (`requires: [spec_readiness_checklist, implementation_plan, sa_dev_gate_result]`)** โดยอัตโนมัติ!
3. **ตารางอายุความของหลักฐานและการอนุมัติข้ามรอบ Rework (Evidence & Approval Validity Across Rework/Escalation)**:

| เส้นทางการย้อนกลับ / การเปลี่ยนขอบเขต | สถานะของรอบ Requirements (`discovery` Episode) | หลักฐานเดิมที่ยังใช้ต่อได้ (Retained Evidence) | หลักฐานที่หมดอายุสำหรับรอบใหม่และต้องมีหลักฐานชุดใหม่แทน (Superseded → Required Replacement) |
|---|---|---|---|
| **1. `planning -> designing`** (พบช่องว่างสถาปัตยกรรม/ยกระดับความเสี่ยงขณะวางแผน) | อยู่ภายใน Episode เดิม (`intake -> discovery` เดิม) | `user_stories`, `acceptance_criteria`, `business_rules`, `pm_ba_gate_result` (หากขอบเขตธุรกิจไม่เปลี่ยน) | `compressed_spec_reference` และ `spec_readiness_gate_result` ไม่พอสำหรับการเข้า `implementing` อีกต่อไป → ต้องมี `spec_gap`, `redesign_scope`, `sdd_reference`, `api_contract`, `data_impact`, `ba_sa_gate_result` และ `sa_dev_gate_result` |
| **2. `verifying -> rework -> designing`** (QA/Security พบผลกระทบ API/Authz/Design ระหว่างตรวจรับงานทางด่วน) | อยู่ภายใน Episode เดิม | `user_stories`, `acceptance_criteria`, `business_rules`, `pm_ba_gate_result` | การอนุมัติทางด่วนเดิมถูกเก็บรักษาใน `classification_snapshot` เพื่อการตรวจสอบย้อนหลังเท่านั้น แต่การเข้า `implementing` รอบที่ 2 บังคับใช้กิ่งมาตรฐานของ SA (`sdd_reference`, `ba_sa_gate_result`, `sa_dev_gate_result`) |
| **3. `verifying -> rework -> planning`** หรือ **`rework -> implementing`** บนงานที่ผ่าน `designing` มาแล้วและไม่ได้ยกระดับความเสี่ยงเกินที่ออกแบบไว้ | อยู่ภายใน Episode เดิม และ `hasEpisodeDesign === true` | `user_stories`, `acceptance_criteria`, `business_rules`, `pm_ba_gate_result`, `sdd_reference`, `api_contract`, `data_impact`, `ba_sa_gate_result`, `sa_dev_gate_result` | อัปเดต `rework_scope`, `plan_update` (กรณี `rework -> planning`) และผลการทดสอบรอบใหม่ (`changed_files`, `test_evidence`, `dev_qa_gate_result`) |
| **4. `verifying -> rework -> discovery`** (โจทย์ธุรกิจหรือ Acceptance Criteria เปลี่ยนแปลง) | **เริ่มต้น Requirements Episode ใหม่** (`to === "discovery"` รีเซ็ต `episodeEvents`) | `initial_scope`, `change_type` | **การผ่าน `designing -> planning` ใน Episode ก่อนหน้าถือว่าหมดอายุสำหรับ Episode ใหม่**: หาก Episode ใหม่มีความเสี่ยง `medium`/`high` ต้องเดินผ่าน `discovery -> designing -> planning -> implementing` ใหม่ทั้งหมด (ห้ามนำ `designing` ของ Episode เก่ามาอ้างข้ามรอบ) |

#### 4.1.4 สัญญาความเข้ากันได้ของข้อมูลสถานะเมื่อทำ Rollback หลังเปิดใช้งาน (`R3-02` `historical_only` Sunset Contract)

เพื่อป้องกันปัญหาที่การย้อนกลับ (Rollback) โค้ดไปทำลายความถูกต้องของไฟล์ `task-state.yaml` ที่เคยเดินผ่าน `discovery -> planning` ไปแล้ว:
- เพิ่มการรองรับฟิลด์ `historical_only: true` บนรายการ Transition ใน `scripts/validate-contracts.mjs`:
  - เมื่อกิ่งทางด่วนถูกตั้งค่า `historical_only: true` (ใช้ในกรณีต้องการปิดหรือ Rollback ฟีเจอร์ทางด่วนหลังจากมีข้อมูลสถานะบันทึกในคลังแล้ว):
    - **ระเบียนที่ปิดงานสมบูรณ์แล้ว (`state.state === "release"`) หรือระเบียนที่มี `designing -> planning` เกิดขึ้นตามหลังแล้ว**: ยังคงผ่าน `validateContracts()` และ `validate-metrics.mjs --source structured` ได้ตามปกติ 100% **โดยห้ามแก้ไขหรือบิดเบือน `history` ย้อนหลังเด็ดขาด**
    - **ระเบียนที่ยังค้างอยู่ในสายทางด่วน (`state.state !== "release"` และยังไม่มี `designing -> planning` ตามหลัง) หรือระเบียนใหม่**: จะถูกปฏิเสธด้วยข้อความ `<path>: <from> -> <to> at history[<i>] is marked historical_only (fast-track disabled for active/new work items; route through designing -> planning)` เพื่อให้ SA Agent และ Human Maintainer สั่ง Route เข้าสู่ `designing -> planning` อย่างโปร่งใส

---

### 4.2 Stage 03 Contract: Parallel Worktree Sessions vs. In-Session Scoped Subagents (คงจาก v3 ที่ผ่านการรีวิวแล้ว)

เพิ่มตารางตัดสินใจใน `docs/workflow/dynamic-routing.md` แยกชัดเจนระหว่าง:
- **Parallel Worktree Sessions**: อินสแตนซ์แยก Terminal คนละ Git Worktree (`.worktrees/<branch-slug>`) ภายใต้การกำกับของมนุษย์ ใช้เฉพาะเมื่องานมี **Disjoint Write-sets** และเก็บกวาดภายใน 24 ชม. ด้วย `npm run housekeeping:worktrees`
- **In-Session Scoped Subagents**: Subagent ภายใน Turn เดียวกัน ต้องปฏิบัติตามสัญญา In-Turn Supervision (`dynamic-routing.md:65–69`), `TASK_BRIEF.md`, และ `dispatch-receipt` โดยห้ามสลับ Persona ใน Agent ตัวเดิมแล้วอ้างว่าเป็น Independent Verifier

---

### 4.3 Stage 05 Contract: Multi-Surface Review Policy, Deliberate 9-File Scope & Accurate Hook Enforcement Matrix (ปรับคำอธิบายตาม `DW-01`)

1. **Multi-Surface Review Alignment (9 ไฟล์ของ Issue #303 — Deliberate Delivery Choice)**:
   - **ขอบเขตและเหตุผลตาม Core Policy (`DW-01`)**: ตาม `AGENTS.md:67` และ `docs/workflows/stabilize-core.md:18` โฟลเดอร์สกิลเป็น Optional Library ที่แก้ไขแยกกันได้โดยไม่มีข้อบังคับให้ต้อง Mirror ทั้งคลัง อย่างไรก็ดี เนื่องจาก Slice 2 ของ Issue #303 ปรับปรุงกติกาการรีวิวใน `code-review-gate` เราจึงเลือกปรับทั้ง **3 ไฟล์หลัก** (`docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`) **และสำเนาของสกิล `code-review-gate` อีก 6 ไฟล์** (`SKILL.md` และ `templates/CODE_REVIEW_FINDINGS.md` ภายใต้ `.agents/skills/code-review-gate/`, `.claude/skills/code-review-gate/`, และ `.agent/skills/code-review-gate/`) ไปพร้อมกันโดยความตั้งใจของงานนี้ เพื่อไม่ให้ Host ใดโหลดแม่แบบย่อยที่ล้าสมัย
   - **การแยกหลักฐานตรวจสอบอย่างแม่นยำ (`TC-013`)**:
     - `node scripts/validate-skill-parity.mjs` ใช้ตรวจเฉพาะความตรงกันของไฟล์ `SKILL.md` ทั้ง 3 ต้นไม้เท่านั้น (เนื่องจากบรรทัด `53` ของสคริปต์ดังกล่าวไม่ได้ตรวจไฟล์ย่อยใน `templates/`)
     - ความตรงกันของไฟล์แม่แบบย่อย `templates/CODE_REVIEW_FINDINGS.md` ทั้ง 3 ต้นไม้ และความสอดคล้องเชิงความหมายของทั้ง 9 ไฟล์ จะตรวจสอบด้วยการเทียบแฮช/Diff ตรงตามพาธไฟล์ทั้ง 9 รายการควบคู่กับการตรวจทานของ Independent Reviewer ใน `TC-013` (โดยไม่เพิ่มข้อบังคับ All-Library Audit ใหม่ให้เป็นภาระทั้งคลัง)
   - **กติกา 3 Passes & 3 Decision Tiers**:
     - **3 Mandatory Passes**: `[Pass 1: Bugs & Logic]`, `[Pass 2: Security & Trust]`, `[Pass 3: Spec & Plan Compliance]`
     - **3 Decision Tiers**:
       - `Tier 1 — Blocking Findings (Critical / Major)` → `Blocks Progress? = Yes`
       - `Tier 2 — Human Architecture / Business Judgment Required` → `Blocks Progress? = Yes` (หยุดรอที่ Human Approval Gate เสมอ)
       - `Tier 3 — Non-blocking Nits (Minor style/naming)` → `Blocks Progress? = No`, **จำกัดเพดานอ้างอิงสูงสุดไม่เกิน 5 ข้อต่อรอบการรีวิว** *(ค่าตัวอย่างอ้างอิงจาก `REVIEW.md` ในบทความต้นฉบับ)* พร้อมสรุปส่วนเกินเป็นบรรทัดเดียว (`Suppressed Nits Count: +N`)
     - คงกฎ **Strict Anti-Downgrade Rule** และ **Scoped Re-review** (`task_review_rework_count <= 2`) ตาม `task-execution-mode.md:48–58`
2. **ตารางขอบเขตการบังคับใช้ 5 ชั้นตามกลไกโค้ดจริง (5-Layer Enforcement Boundary Matrix)**:
   - คงตาราง 5 ชั้นจากรุ่น v3 ที่ผู้รีวิวยืนยันความถูกต้องแล้ว (ระบุกลไก JSON `hookSpecificOutput.permissionDecision: "deny"` พร้อม `exit 0` และข้อยกเว้น Fail-Open ตาม `ADR-0024 D1` ใน `scripts/validate-pr-readiness.mjs:803–810, 827–853` อย่างตรงไปตรงมา)

---

### 4.4 Stage 06 → Stage 01 Contract: Structured Cohort Metrics, Legacy Flag Isolation & 3-Phase Safe Intent CLI (ตอบโจทย์ `RR-02`, `RR-03`, `RR-05`, `R3-03`, `R3-04`)

#### 4.4.1 การแยก Namespace และนิยามตัวชี้วัดบน Schema ที่มีอยู่จริง (`RR-02` & `RR-03` — ปิดแล้วในระดับแผน)

1. **`dispatch_ledger_expiry_rate`**: วัด `expiredReceipts / closedReceipts` จาก `docs/records/dispatch-receipts/*.yaml` เฉพาะสถานะที่ปิดบัญชีแล้ว (`consumed`, `expired`, `cancelled`; ไม่นำ `registered` มาหารเจือจาง) โดยมีเกณฑ์เตือนขออนุมัติที่ `>= 0.10` (`min-samples = 5`) และแสดงสถานะ Runtime Timeout แยกชัดเจนว่า `UNAVAILABLE_IN_V1 — deferred to M4 / Issue #35 runtime outcome producer`
2. **`verified_rework_rate`**: วัด `reworkedItems / evaluatedItems` จาก Closed Schema Registry (v2 JSON Envelope ตรวจ `state_digest === digestTaskEnvelope(state)` และ v1 YAML ตรวจ `validateContracts()`) เฉพาะงานที่ `history` เคยเดินเข้าหรือออกจากสถานะตรวจรับ (`reworkSourceStates`: `verifying`, `monitoring`, `validating`) โดยมีเกณฑ์เตือน `>= 0.15` (`min-samples = 5`) และปฏิเสธทันที (`exit 2`) หากพบ `ARCHIVE_LOCATION_AMBIGUOUS` หรือ `DIGEST_INTEGRITY_MISMATCH`
3. **ลำดับความสำคัญของสถานะรวม**: `DATA_ERROR (exit 2) > BREACH_DETECTED > INSUFFICIENT_DATA > WITHIN_TARGET`

#### 4.4.2 สัญญาความเข้ากันได้ของ `--source legacy-task-log` และการแยกขาดจาก Flags ชุดใหม่ (`R3-04`)

เพื่อให้สอดคล้องกับ `docs/operating-model/METRICS.md:45` (*"The snapshot is historical compatibility evidence. It must not be used as authoritative telemetry or a pass/fail decision until structured event evidence is available"*):

| รูปแบบการเรียกคำสั่ง CLI (`node scripts/validate-metrics.mjs ...`) | โหมดแหล่งข้อมูล (`effectiveSource`) | พฤติกรรมและขอบเขตการแสดงผล | การเขียนไฟล์ | Exit Code |
|---|---|---|---|---|
| **1. ไม่ใส่ Flag ใดๆ** หรือใส่ **`--source legacy-task-log` เพียงอย่างเดียว** | `legacy-task-log` | แสดง Dashboard เดิมจาก `TASK_LOG.md` ทุกบรรทัด (ใช้ชื่อเดิม `Subagent timeouts`, `Rework cycles` ห้ามใช้ชื่อ `dispatch_ledger_expiry_rate` หรือ `verified_rework_rate`) พร้อมหมายเหตุเมื่อระบุ `--source legacy-task-log` ว่าใช้เพื่อดูแนวโน้มเท่านั้น | ไม่เขียนไฟล์ใดๆ | `0` |
| **2. `--source structured`** (ไม่มี Flag อื่น) | `structured` | สแกนและตรวจสอบ Schema/Digest ของข้อมูลจริง แสดงตาราง Structured Cohort Dashboard (`dispatch_ledger_expiry_rate`, `verified_rework_rate`, `pre_verification_count`, `open_registered_count`, และ `Runtime Subagent Timeout Telemetry: UNAVAILABLE_IN_V1`) | ไม่เขียนไฟล์ใดๆ | `0` *(หรือ `2` เมื่อพบ `DATA_ERROR`)* |
| **3. `--source structured`** ร่วมกับ **`--check-thresholds`** และ/หรือ **`--emit-intent <path>`** (`[--min-samples <n>] [--force]`) | `structured` | ประเมินเกณฑ์เตือนแบบไม่ปัดเศษ (`>= 0.10`, `>= 0.15`, `minSamples = 5`) และสร้าง/ตรวจสอบไฟล์ร่าง `INTENT.md` ตามตาราง `M-02`–`M-08` และสัญญา I/O 3 ระยะ | ตามตาราง `M-02`–`M-08` | `0`, `1` (เมื่อ Breach บน `--check-thresholds`), หรือ `2` (เมื่อ Error/Reject) |
| **4. ส่ง `--check-thresholds`, `--emit-intent`, `--min-samples`, หรือ `--force` ร่วมกับ `--source legacy-task-log` (หรือส่งโดยไม่ระบุ `--source structured`)** | ปฏิเสธตั้งแต่ Phase-1 Preflight | **Fail-Closed (`INCOMPATIBLE_SOURCE_FLAGS`)**: พิมพ์ข้อความทาง `stderr` ว่า `Flags --check-thresholds, --emit-intent, --min-samples, and --force require --source structured (legacy TASK_LOG keyword counts are non-authoritative per METRICS.md:45)` | **ไม่เขียนหรือแตะไฟล์ใดๆ (`targetModified: false`)** | **`2`** |
| **5. ส่ง `--force` โดยไม่ระบุ `--emit-intent <path>`** หรือส่ง Flag ไม่รู้จัก | ปฏิเสธตั้งแต่ Phase-1 Preflight | **Fail-Closed (`FORCE_REQUIRES_EMIT_INTENT` / `UNKNOWN_FLAG`)**: พิมพ์สาเหตุทาง `stderr` | **ไม่เขียนหรือแตะไฟล์ใดๆ (`targetModified: false`)** | **`2`** |

#### 4.4.3 สัญญา Dual-Digest Integrity & 3-Phase File Persistence Failure Contract (`RR-05` & `R3-03`)

1. **Dual-Digest Header (`Intent-Fingerprint` + `Draft-Content-SHA256`)**:
   - `Intent-Fingerprint: sha256:<64-hex>`: คำนวณผ่าน RFC 8785 JCS (`canonicalizeJcs`) บนอ็อบเจกต์สัญญาณความผิดปกติ (ไม่รวม `git HEAD`)
   - `Draft-Content-SHA256: sha256:<64-hex>`: คำนวณบนเนื้อหาไฟล์ทั้งหมดหลังแทนที่บรรทัด `Draft-Content-SHA256: ...` ด้วย `Draft-Content-SHA256: <self>` เพื่อตรวจจับการแก้ไขเนื้อหาโดยมนุษย์ทุกตัวอักษร
2. **สัญญาการจัดการความล้มเหลวระดับ I/O ทั้ง 3 ระยะ (`R3-03` — แยกคำรับประกันตามจุด Commit จริง)**:

| ระยะ (I/O Phase) | ขอบเขตการทำงาน | สิ่งที่เกิดขึ้นเมื่อเกิดความผิดพลาด (Failure Handling & Cleanup Protocol) | รหัส Error & สถานะของไฟล์ปลายทาง (`targetModified`) | Exit Code |
|---|---|---|---|---|
| **Phase 1: Preflight, Input, Data & Guard Checks** | ตรวจสอบ CLI Flags (`R3-04`), อ่านและตรวจ Schema/Digest ของแหล่งข้อมูล, คำนวณเกณฑ์เตือน, และอ่านตรวจไฟล์ปลายทางเดิม (`M-02`, `M-04` No-op, `M-05` `REJECT_HUMAN_MODIFIED`, `M-06` `REJECT_FINGERPRINT_CHANGED`, `<path>` เป็น Directory `EISDIR`) **ก่อนเปิด File Descriptor สำหรับเขียน** | ยุติการทำงานทันทีโดยไม่มีการเปิดเขียนไฟล์ใดๆ | `INCOMPATIBLE_SOURCE_FLAGS` / `DATA_ERROR` / `REJECT_HUMAN_MODIFIED` / `REJECT_FINGERPRINT_CHANGED` / `EISDIR`<br>**รับประกัน `targetModified: false` 100%** | **`2`** *(หรือ `0`/`1` สำหรับ `M-02`/`M-04`)* |
| **Phase 2A: Exclusive Create (`M-03`, ไม่มี `--force`) ก่อนถึงจุด Commit** | เปิดสร้างไฟล์ใหม่ด้วย `fs.openSync(resolved, 'wx', 0o600)` พร้อมตัวแปร `createdByUs = true` แล้วเขียน Buffer จนครบและเรียก `fsyncSync(fd)` + `closeSync(fd)` | - **กรณี `openSync` โยน `EEXIST` (`createdByUs === false`)**: มีไฟล์ของโปรเซสอื่นหรือมนุษย์ถูกสร้างขึ้นมาชนพอดี **ห้ามเรียก `unlinkSync` เด็ดขาด** เพื่อปกป้องไฟล์ของคนอื่น<br>- **กรณี `openSync` สำเร็จ (`createdByUs === true`) แต่เกิด Short Write / `ENOSPC` / `EIO` ระหว่าง `writeSync` หรือ `fsyncSync(fd)`**: ปิด `fd` แล้ว **เรียก `unlinkSync(resolved)` ทันทีในบล็อก `catch`** เพื่อกวาดล้างไฟล์ที่เขียนค้างไม่ให้เหลือไฟล์พังบนดิสก์ (หาก `unlinkSync` ล้มเหลวซ้ำให้รายงาน `WRITE_ABORTED_CLEANUP_FAILED`) | - `EEXIST_RACE_DETECTED` (`targetModified: false` — ไฟล์ของโปรเซสอื่นปลอดภัย)<br>- `WRITE_ABORTED_CLEANED_UP` (`targetModified: false` — ลบไฟล์ค้างของตัวเองเรียบร้อย)<br>- `WRITE_ABORTED_CLEANUP_FAILED` (`targetModified: true`) | **`2`** |
| **Phase 2B: Atomic Replace Staging (`M-07`, มี `--force`) ก่อนถึงจุด Commit** | สร้างไฟล์ชั่วคราว `.tmp-<base>-<pid>-<stamp>-<rand>` ด้วย `wx`, เขียน Buffer จนครบ, `fsyncSync(fd)`, `closeSync(fd)`, แล้วเรียก `renameSync(tmpPath, resolved)` | หากเกิดความผิดพลาดใดๆ **ก่อนที่ `renameSync(tmpPath, resolved)` จะสำเร็จ** ระบบจะปิด `fd` และ `unlinkSync(tmpPath)` ทันที ไฟล์ปลายทางเดิม (`resolved`) จึงยังคงเป็นเนื้อหาเดิมทุกประการ | `TARGET_UNCHANGED_BEFORE_COMMIT`<br>**รับประกัน `targetModified: false` (ไฟล์เดิมไม่เปลี่ยน)** | **`2`** |
| **Phase 3: Post-Commit Directory Durability Sync (`M-03` หลังปิดไฟล์ใหม่ หรือ `M-07` หลัง `renameSync` สำเร็จ)** | เรียก `syncDirectorySync(dir, io)` (`openSync(dir, 'r')` + `fsyncSync(dirFd)`) เพื่อยืนยันความคงทนของรายการไดเรกทอรีระดับ OS | ณ จุดนี้ **ไฟล์ปลายทาง `resolved` บนดิสก์ถูกสร้างหรือถูกแทนที่ด้วยเนื้อหาใหม่ครบถ้วนแล้ว (Commit Point ผ่านไปแล้ว)** หาก `syncDirectorySync` โยน Exception (เช่น `EIO`) ระบบจะไม่รายงานเท็จว่าไฟล์ไม่ถูกแก้ไข แต่จะพิมพ์รหัสเฉพาะทาง `stderr` เพื่อแจ้งความจริงแก่ผู้ปฏิบัติการ | **`POST_COMMIT_DIR_SYNC_FAILED`**<br>**ระบุชัดเจนว่า `targetModified: true` (ไฟล์ร่างใหม่ถูกเขียนลงดิสก์แล้ว แต่การ `fsync` ไดเรกทอรีล้มเหลว)** | **`2`** |

---

## 5. ลำดับการพึ่งพา การส่งมอบแบบ Stacked PRs และแผนการย้อนกลับ 2 กรณี (Dependency & Two-Regime Rollback Architecture — ปิด `R3-02` & `DW-01`..`DW-05`)

```text
Slice 1 (Templates INTENT/SPEC + Hardened validate-contracts.mjs [Parity, Prefix/Episode Escalation, historical_only]
         + new-feature-state.schema.json + new-feature-workflow.yaml + routing docs + ADR + Slice-1 Security/Code Review Record)
   │
   ├──► Slice 3 (Structured Cohort Metrics, Legacy Flag Isolation & 3-Phase Safe --emit-intent CLI + Slice-3 Review Record)
   │       │
   │       ▼
   └──► Slice 4 (ROADMAP-SDLC-FRAMEWORK.md 6-Stage Matrix & 5-Layer Hook Boundary referencing approved Slices 1–3)

Slice 2 (Deliberate 9-File Review Policy & Reference 5-Nit Cap for Issue #303) ──► [Merges in any order before Slice 4]
```

### 5.1 แผนปฏิบัติการย้อนกลับ 2 กรณีที่รองรับข้อมูลสถานะที่บันทึกแล้ว (Two-Regime Operational Rollback Runbook — `R3-02`)

| กรณีการย้อนกลับ (Rollback Scenario) | วิธีตรวจสอบเงื่อนไขตั้งต้น (Preflight Check) | ขั้นตอนปฏิบัติการย้อนกลับและการจัดการข้อมูลสถานะ (Action, State Disposition & Accountable Owner) |
|---|---|---|
| **Slice 4 (`ROADMAP-SDLC-FRAMEWORK.md`)** หรือ **Slice 2 (9 Review/Skill Files)** | ไม่มีสถานะรันไทม์พึ่งพา | `git revert <slice-commit>` ได้อย่างอิสระตลอดเวลา (สำหรับ Slice 2 รัน `node scripts/validate-skill-parity.mjs` ยืนยัน `SKILL.md` ตรงกัน) |
| **Slice 3 (`validate-metrics.mjs` + `METRICS.md`)** | ตรวจสอบว่าต้องการคง Slice 1 ไว้หรือไม่ | `git revert <slice-3-commit>` และรัน `npm test` (ไฟล์ร่าง `INTENT.md` ที่เคยถูกสร้างและมนุษย์นำไปเปิดงานแล้วเป็นไฟล์ Markdown มาตรฐานที่ใช้งานต่อได้ตามปกติ) |
| **Slice 1 — Regime 1: Pre-Adoption Rollback** *(ยังไม่มีระเบียน `task-state.yaml` ในคลังที่ใช้ `discovery -> planning`)* | สแกน `docs/records/work-items/**/task-state.yaml` (ทั้ง active และ `archive/`) แล้วไม่พบเหตุการณ์ `from: discovery, to: planning` (`count === 0`) | 1. หาก Merge Slice 3 ไปแล้ว ให้ `git revert` ตามลำดับย้อนกลับ **`Slice 3` → `Slice 1`** (หรือคง `docs/templates/INTENT.md` ไว้)<br>2. รัน `node scripts/repin-source-matrix.mjs && npm test` |
| **Slice 1 — Regime 2: Post-Adoption Fast-Track Sunset** *(มีระเบียน `task-state.yaml` อย่างน้อย 1 รายการใน `active` หรือ `archive` ที่บันทึก `discovery -> planning` ไปแล้ว)* | สแกนพบ `from: discovery, to: planning` ใน `docs/records/work-items/**/task-state.yaml` (`count >= 1`) | **ห้าม `git revert` โค้ดตัวอ่านใน `validate-contracts.mjs` หรือ `new-feature-state.schema.json` และห้ามแก้ไข/ลบ `history` ย้อนหลังเด็ดขาด**<br>1. **Disable New Fast-Track Entry**: ตั้งค่า `historical_only: true` บนกิ่งทางด่วน (`discovery -> planning` และกิ่งทางด่วน `planning -> implementing`) ใน `docs/contracts/new-feature-workflow.yaml`, ถอดคำแนะนำทางด่วนสำหรับงานใหม่ออกจาก `dynamic-routing.md` และ `new-feature.md`, แล้วรัน `node scripts/repin-source-matrix.mjs`<br>2. **Disposition ของระเบียนที่จบงานแล้ว (`state === "release"` หรือผ่าน `designing -> planning` แล้ว)**: ผ่าน `validateContracts()` และ `validate-metrics.mjs --source structured` ได้ทันทีโดยไม่ต้องแตะข้อมูลประวัติ<br>3. **Disposition ของระเบียนที่กำลังค้างอยู่ในสายทางด่วน (`state ∈ {"planning", "implementing", "verifying", "rework"}` ที่ยังไม่ผ่าน `designing`)**: `validateContracts()` จะแจ้งเตือน `is marked historical_only` โดยให้ **SA Agent + Human Maintainer** สั่ง Route งานที่ค้างอยู่เข้าสู่ `planning -> designing` หรือ `rework -> designing` เพื่อจัดทำ `SDD.md` และอนุมัติ `sa_dev_gate_result` แบบเดินหน้า (Forward Remediation) ก่อนปล่อยงาน |

---

## 6. Revised Acceptance Criteria (v4) & Complete Verification Traceability Matrix (`TC-001` – `TC-015`)

### 6.1 Acceptance Criteria (v4)

- **AC-001 (Compressed Templates & Canonical Equivalence)**: เพิ่ม `docs/templates/INTENT.md` และ `docs/templates/SPEC.md` โดยคงแม่แบบเดิมทั้ง 34 ไฟล์ไว้ครบถ้วน พร้อมระบุตารางเทียบความสมมูลกับ `REQUIREMENT_DISCOVERY.md` / `SDD.md`, กฎ Source-of-Truth Commit-SHA Linkage, และหัวข้อรองรับ Dual-Digest Advisory Header
- **AC-002 (Hardened Contract Parity, Temporal Escalation, Sunset Compatibility & Routing Alignment — `RR-01`, `R3-01`, `R3-02`)**:
  1. อัปเดต `scripts/validate-contracts.mjs` และ `docs/contracts/schemas/new-feature-state.schema.json` (ด้วย TDD) ให้รองรับ: (ก) **Top-Level vs. Evidence Classification Parity**, (ข) **Causal Prefix & Episode-Scoped Multi-Branch Selection** (`history.slice(0, index)` นับจาก `to === "discovery"` ล่าสุด), (ค) **Optional `classification_snapshot` คู่กับ Mandatory Design Remediation Invariant** เมื่อมีการยกระดับความเสี่ยงระหว่างทาง, และ (ง) **`historical_only: true` Sunset Mode** สำหรับการปิดทางด่วนโดยไม่ทำลายระเบียนประวัติที่จบงานแล้ว
  2. อัปเดต `docs/contracts/new-feature-workflow.yaml` และ `docs/workflows/new-feature.md` เพิ่มกิ่งทางด่วน `discovery -> planning` และ `planning -> implementing` เฉพาะ `risk_level: low` ที่ไม่แตะ Security/API/Data (ไม่รวม Additive API)
  3. อัปเดต `docs/workflow/dynamic-routing.md` เพิ่มตารางเกณฑ์คัดกรอง 6 ข้อ, กฎการยกระดับความเสี่ยง/การหมดอายุของหลักฐานข้ามรอบ Rework, และตาราง **Parallel Worktree Sessions vs. In-Session Scoped Subagents** (`G-04`)
  4. บันทึก ADR แบบสมบูรณ์ในตัวเองใน `DECISIONS.md`, อัปเดต `CHANGELOG.md`, รัน `npm run repin:source-matrix`, ผ่านการตรวจจาก `security-reviewer` และ `code-reviewer` อิสระ พร้อมแนบ `docs/records/qa/<date>-issue-303-slice-1-contracts-code-review.md`
- **AC-003 (Deliberate 9-File Review Policy Alignment & Reference 5-Nit Cap — `DW-01`)**: อัปเดตไฟล์หลัก 3 ไฟล์ (`docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`) และสำเนาสกิล `code-review-gate` อีก 6 ไฟล์ (`SKILL.md` และ `templates/CODE_REVIEW_FINDINGS.md` ใน `.agents/`, `.claude/`, `.agent/`) พร้อม `CHANGELOG.md` ให้ใช้ 3 Passes, 3 Decision Tiers, เพดานอ้างอิง **5 Nits ต่อรอบรีวิว** พร้อมช่องสรุปยอดส่วนเกิน, กฎ Anti-Downgrade, และคงกฎ Scoped Re-review โดยตรวจ `SKILL.md` ด้วย `validate-skill-parity.mjs` คู่กับการตรวจเทียบไฟล์แม่แบบย่อยทั้ง 3 ต้นไม้และการตรวจทานครบทั้ง 9 ไฟล์โดย Reviewer
- **AC-004 (Structured Cohort Metrics, Legacy Flag Isolation & 3-Phase Safe Intent CLI — `RR-02`, `RR-03`, `RR-05`, `R3-03`, `R3-04`)**: พัฒนาโหมด `--source structured` ใน `scripts/validate-metrics.mjs` และอัปเดต `docs/operating-model/METRICS.md` + `CHANGELOG.md` ตามสัญญาในหัวข้อ `4.4` ครบทุกข้อ (วัด `dispatch_ledger_expiry_rate` บน `closedReceipts` และ `verified_rework_rate` บน `evaluatedItems`; แยกขาดจาก `--source legacy-task-log` โดยปฏิเสธการใช้ `--check-thresholds`/`--emit-intent` ร่วมกับโหมด Legacy ด้วย `INCOMPATIBLE_SOURCE_FLAGS` `exit 2`; ใช้ระบบ Dual-Digest `Intent-Fingerprint` + `Draft-Content-SHA256`; และบังคับใช้สัญญา I/O 3 ระยะ ทั้งการลบไฟล์ค้างเมื่อ `wx` ล้มเหลวกลางคัน, การไม่แตะไฟล์คนอื่นเมื่อ `EEXIST`, และการรายงาน `POST_COMMIT_DIR_SYNC_FAILED` หลังจุด Commit) พร้อมแนบ `docs/records/qa/<date>-issue-303-slice-3-metrics-code-review.md`
- **AC-005 (Roadmap Alignment & Honest 5-Layer Enforcement Matrix)**: อัปเดต `ROADMAP-SDLC-FRAMEWORK.md` เชื่อมโยงทั้ง 6 Stages เข้ากับ Milestones `M1–M4` พร้อมระบุตาราง **5-Layer Enforcement Boundary** ตามกลไก JSON stdout deny จริง
- **AC-006 (Zero Regression, Stacked PR Readiness & Full Gate Verification)**: ผ่านชุดทดสอบ `TC-001`–`TC-015` และชุดตรวจมาตรฐานทั้งหมดของโปรเจกต์

---

### 6.2 Complete Verification & Test Traceability Matrix (`TC-001` – `TC-015`)

| Test ID | AC | ประเภท | สถานการณ์ทดสอบ (ครอบคลุมครบทุกประเด็นจาก `RR-01`–`RR-05`, `R3-01`–`R3-04`, และ `DW-01`–`DW-05`) | ผลลัพธ์ที่ต้องสังเกตได้จริง (Deterministic Expected Outcome) |
|---|---|---|---|---|
| **TC-001** | AC-002 | Contract Happy Path | `new-feature` เดินครบสายทางด่วน `intake -> discovery -> planning -> implementing -> verifying -> human-review -> release` (`risk_level: low`, impacts `"none"`) และตรวจตัวอย่างมาตรฐานเดิมทั้ง 10 ไฟล์ | `validateContracts()` คืน `[]` ทั้งสายทางด่วนและตัวอย่างเดิมทั้ง 10 ไฟล์ |
| **TC-002** | AC-002 | Cross-Field Parity Guard (`RR-01`) | ทดสอบ `top-level: high` + `evidence: low`, `top-level: low` + `evidence: high`, ลบ `evidence.risk_level`, และ `config-change` `risk_tier` mismatch | ทุกกรณีถูกปฏิเสธแบบ Fail-Closed พร้อมข้อความ `top-level <field> ... does not match evidence.<field>` |
| **TC-003** | AC-002 | Impact Exit, Temporal Escalation & Rollback Sunset (`RR-01`, `R3-01`, `R3-02`) | - **TC-003.1 (Static Impact Exit)**: `low`-risk แต่ `security_boundary_impact: "authz"`, `api_contract_impact: "additive-endpoint"`, หรือ `data_migration_impact: "schema-migration"`<br>- **TC-003A (`R3-01` Plan Escalation)**: เดิน `discovery -> planning` (`low` snapshot) → พบความเสี่ยง `high` → `planning -> designing -> planning -> implementing` (`sa_dev_gate_result`) → `release`<br>- **TC-003B (`R3-01` Rework Escalation)**: เดินทางด่วนถึง `verifying` → พบผลกระทบ API/Authz (`high`) → `verifying -> rework -> designing -> planning -> implementing` (`sa_dev_gate_result`) → `release`<br>- **TC-003C (`R3-01` Standard Replan)**: เดินสาย `designing` มาตรฐาน → `verifying -> rework -> planning -> implementing` (คงสิทธิ์ `SDD.md` ใน Episode เดียวกัน)<br>- **TC-003D (`R3-01` Negative Escalation / Prefix / Episode Reset)**: (1) ยกระดับเป็น `high` แล้วพยายามข้าม `designing` ไป `implementing`/`verifying`/`release` หรือผ่าน `rework -> implementing`, (2) อ้าง `designing` ในอนาคตย้อนหลัง (Prefix Leak), (3) อ้าง `designing` ของ Episode เก่าหลังเกิด `rework -> discovery`<br>- **TC-003E (`R3-02` Post-Adoption Sunset)**: เปิด `historical_only: true` บนกิ่งทางด่วน แล้วตรวจระเบียนทางด่วนที่ `state === "release"` เทียบกับระเบียนที่ค้างอยู่ใน `implementing` | - **TC-003A, TC-003B, TC-003C**: `validateContracts()` คืน `[]` (อนุญาตให้ยกระดับความเสี่ยงและซ่อมผ่าน `designing` ได้โดยไม่ต้องลบประวัติ)<br>- **TC-003.1 & TC-003D**: ถูกปฏิเสธทั้งหมด (`unremediated fast-track escalation`, `requires evidence compressed_spec_reference`, `requires evidence risk_level to equal "low"`)<br>- **TC-003E**: ระเบียนที่จบงานแล้ว (`release`) ผ่าน `[]` ทั้งใน `validateContracts()` และ `validate-metrics.mjs`; ส่วนระเบียนที่ค้างอยู่ใน `implementing` ถูกบล็อกด้วย `is marked historical_only` |
| **TC-004** | AC-004 | Default & Legacy CLI Isolation (`R3-04`) | รัน: (ก) `node scripts/validate-metrics.mjs` แบบไม่มี flag, (ข) `--source legacy-task-log` เดี่ยวๆ, (ค) `--source legacy-task-log --check-thresholds`, (ง) `--source legacy-task-log --emit-intent <path>`, (จ) `--check-thresholds` โดยไม่ใส่ `--source structured` | (ก) และ (ข) แสดงตารางเดิม `exit 0`, `stderr` ว่าง; **(ค), (ง), และ (จ) ถูกปฏิเสธด้วย `INCOMPATIBLE_SOURCE_FLAGS` (`exit 2`, ไม่แตะไฟล์ใดๆ)** |
| **TC-005** | AC-004 | Ledger Expiry Semantics (`RR-02`) | ทดสอบ `dispatch-receipts`: (ก) `1` `expired` + `19` `consumed` + `10` `registered`, (ข) `2` `expired` + `18` `consumed` | ตัวหารนับเฉพาะ `closedReceipts` (`20`); (ก) ได้ `5.0%` (`WITHIN_TARGET`); (ข) ได้ `10.0%` (`BREACH_DETECTED`) |
| **TC-006** | AC-004 | Rework Cohort & Intake Dilution Immunity (`RR-03`) | ทดสอบ `task-state.json`: (ก) `1` งาน `verifying -> rework` + `9` งาน `intake`, (ข) `1` งาน `verifying -> rework` + `4` งาน `verifying -> handoff` + `50` งาน `intake` | (ก) `evaluatedItems = 1 (< 5)` คืน `INSUFFICIENT_DATA`; (ข) `evaluatedItems = 5` คืน `1/5 = 20.0%` (`BREACH_DETECTED`) และ `stderr` ว่าง |
| **TC-007** | AC-004 | Schema Registry, Digest & Archive Integrity (`RR-03`) | ทดสอบ `state_digest` ไม่ตรง, `task_id` ซ้ำทั้งใน `active` และ `archive`, `contract_version: 99`, และ `handoff_event_id` ซ้ำ | ทุกกรณีหยุดแบบ Fail-Closed ด้วย `exit 2` (`DIGEST_INTEGRITY_MISMATCH`, `ARCHIVE_LOCATION_AMBIGUOUS`, `DATA_ERROR`) |
| **TC-008** | AC-004 | Unrounded Threshold BVA & Mixed Status | ทดสอบ `19/200 = 9.5%` vs `20/200 = 10.0%`, `29/200 = 14.5%` vs `30/200 = 15.0%`, และ `BREACH_DETECTED` คู่กับ `INSUFFICIENT_DATA` | ตัดสินด้วยค่าจริงก่อนปัดเศษถูกต้องแม่นยำ และกรณีผสมคืน `BREACH_DETECTED` (`exit 1` บน `--check-thresholds`) |
| **TC-009** | AC-004 | Dual-Digest Human-Edit Safety & Provenance (`RR-05`) | ทดสอบ `--emit-intent <path>` ซ้ำ: (1) ข้อมูลเดิม + `HEAD` เปลี่ยน, (2) สลับลำดับไฟล์บนดิสก์, (3) คนแก้เนื้อหาแต่คง `Intent-Fingerprint` เดิมไว้, (4) ข้อมูล Breach เปลี่ยนบนไฟล์เดิมที่คนไม่แก้, (5) รันพร้อม `--force` | (1)–(2) ได้ `NO_OP_UNCHANGED_ANOMALY` (`exit 0`); (3) ได้ `REJECT_HUMAN_MODIFIED` (`exit 2`); (4) ได้ `REJECT_FINGERPRINT_CHANGED` (`exit 2`); (5) แทนที่ไฟล์แบบอะตอมมิกสำเร็จ (`exit 0`) |
| **TC-010** | AC-004 | 3-Phase I/O Fault-Injection & No-Clobber (`R3-03`) | ฉีดความล้มเหลวผ่าน `createStateIo({ fsOps })`:<br>- **TC-010A**: Preflight/input error (`--min-samples 0`, `EISDIR`)<br>- **TC-010B**: `wx` สร้างไฟล์ใหม่สำเร็จแต่เกิด `ENOSPC` / zero-progress ระหว่าง `writeSync` หรือ `fsyncSync`<br>- **TC-010C**: `wx` ชนกับไฟล์ของโปรเซสอื่น (`EEXIST` race)<br>- **TC-010D**: `--force` ล้มเหลวก่อน `renameSync` เทียบกับล้มเหลวที่ `syncDirectorySync` (`EIO`) **หลัง** `renameSync` | - **TC-010A**: `exit 2`, ไม่เปิดเขียนไฟล์<br>- **TC-010B**: `WRITE_ABORTED_CLEANED_UP` (`exit 2`), **ลบไฟล์ที่เขียนค้างออกทันที (`existsSync === false`)**<br>- **TC-010C**: `EEXIST_RACE_DETECTED` (`exit 2`), **ไฟล์ของโปรเซสอื่นไม่ถูกลบและเนื้อหาเดิมอยู่ครบ**<br>- **TC-010D**: ก่อน `rename` ได้ `TARGET_UNCHANGED_BEFORE_COMMIT` (ไฟล์เดิมอยู่ครบ); หลัง `rename` ได้ **`POST_COMMIT_DIR_SYNC_FAILED` (`exit 2`, ระบุชัดว่าไฟล์ปลายทางเปลี่ยนเป็นเนื้อหาใหม่แล้วแต่ directory sync ล้มเหลว)** |
| **TC-011** | AC-001, AC-002 | Templates, ADR & Context Budget | ตรวจ `INTENT.md`, `SPEC.md`, ตาราง Parallel Worktrees vs Subagents, `repin:source-matrix`, `adr:audit`, และ `validate:context-budget` | ทุกคำสั่งผ่าน `exit 0` และงบประมาณ Context ทุก Tier ไม่เกินเพดาน |
| **TC-012** | AC-002 | Slice-1 Review Gate & Security Gate Check (`RR-04`) | รัน `validate:review-gate` บน Slice 1 และตรวจบันทึกรีวิวจาก `security-reviewer` + `code-reviewer` อิสระ | `validate:review-gate` คืน `PASS` พร้อมไฟล์ `docs/records/qa/*-slice-1-contracts-code-review.md` |
| **TC-013** | AC-003 | Deliberate 9-File Review Policy & Nested Template Verification (`DW-01`) | (1) รัน `validate-skill-parity.mjs` เพื่อตรวจ `SKILL.md` ทั้ง 3 ต้นไม้, (2) ตรวจ SHA-256 / byte-equality ของไฟล์ย่อย `templates/CODE_REVIEW_FINDINGS.md` ทั้ง 3 ต้นไม้, และ (3) ให้ Reviewer ตรวจความตรงกันของกติกาทั้ง 9 ไฟล์ | `SKILL.md` ทั้ง 3 ต้นไม้ตรงกัน (`0 drifted`), ไฟล์แม่แบบย่อย `templates/CODE_REVIEW_FINDINGS.md` ทั้ง 3 ต้นไม้มี SHA-256 ตรงกันทุกไบต์, และทั้ง 9 ไฟล์มีกติกา 3 Passes / 3 Tiers / 5-Nit Cap ตรงกันครบถ้วน |
| **TC-014** | AC-004 | Slice-3 Review Gate & QA Static Logic Review | รัน `validate:review-gate` บน Slice 3 พร้อมทำ QA `static-logic-review` บนกิ่งตัดสินใจของ `validate-metrics.mjs` | `validate:review-gate` คืน `PASS` พร้อมไฟล์ `docs/records/qa/*-slice-3-metrics-code-review.md` |
| **TC-015** | AC-005, AC-006 | Stacked PR Readiness, State Projection & Full Regression (`DW-02`–`DW-05`) | รัน `validate:pr-readiness`, `validate:status-projection`, `validate:risk-register`, `validate:clearable-refs`, `validate:root-doc-links`, `validate:context-compatibility`, `validate:ci-parity`, `validate:project-state`, และ `npm test` | ทุกคำสั่ง `exit 0` ผ่านครบถ้วน |

---

## 7. ชุดคำสั่งตรวจสอบซ้ำแบบ Self-Contained สำหรับ `R3-01` – `R3-04` (Addressable Reproducible Verification Harness)

ตามคำแนะนำในหัวข้อที่ 8 ของ `#6653541297` ด้านล่างนี้คือชุดคำสั่ง Node.js แบบ Self-Contained ที่สามารถคัดลอกไปรันจากรากของ Repository เพื่อพิสูจน์ตรรกะของสัญญาในรุ่น v4 (`R3-01` Temporal Escalation & Causal Prefix, `R3-02` Post-Adoption Sunset Compatibility, `R3-03` 3-Phase I/O Failure Semantics, และ `R3-04` Legacy Source Flag Isolation) ได้ทันทีโดยไม่แก้ไขไฟล์ใน Working Tree:

```bash
node --input-type=module - <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { createStateIo, syncDirectorySync } from './scripts/lib/fenced-commit.mjs';

const AUTHORITATIVE_FIELDS = ['change_type', 'risk_level', 'risk_tier', 'contains_pii', 'data_change_kind'];
const HOLD_STATES = new Set(['discovery', 'designing', 'rework', 'blocked']);
const eventKey = (e) => `${e.from} -> ${e.to}`;
const meaningful = (v) => v !== null && v !== false && v !== undefined && (typeof v !== 'string' || v.trim().length > 0);

function evaluateWhen(whenClause, src, topObj, label, event, displayPath) {
  const errs = [];
  for (const [k, exp] of Object.entries(whenClause)) {
    if ( src?.[k] !== exp ) errs.push(`${displayPath}: ${eventKey(event)} requires ${label} ${k} to equal "${exp}" (got ${JSON.stringify(src?.[k])})`);
    if ( topObj && Object.hasOwn(topObj, k) && topObj[k] !== exp ) {
      errs.push(`${displayPath}: ${eventKey(event)} requires top-level ${k} to equal "${exp}" (got ${JSON.stringify(topObj[k])})`);
    }
  }
  return errs;
}

function selectBranch(candidates, prefix, event) {
  if (!candidates || candidates.length <= 1) return candidates?.[0] ?? null;
  let lastDisc = -1;
  for (let i = prefix.length - 1; i >= 0; i--) if (prefix[i].to === 'discovery') { lastDisc = i; break; }
  const episode = lastDisc >= 0 ? prefix.slice(lastDisc + 1) : prefix;
  const hasDesign = episode.some((e) => e.from === 'designing' && e.to === 'planning');
  if (event.from === 'planning' && event.to === 'implementing') {
    return hasDesign ? candidates.find((c) => !c.when) : candidates.find((c) => Boolean(c.when));
  }
  return candidates[0];
}

function validateHistoryV4(policy, state, displayPath) {
  const errors = [];
  for (const f of AUTHORITATIVE_FIELDS) {
    if (Object.hasOwn(state, f) && Object.hasOwn(state.evidence ?? {}, f) && state[f] !== state.evidence[f]) {
      errors.push(`${displayPath}: top-level ${f} (${JSON.stringify(state[f])}) does not match evidence.${f} (${JSON.stringify(state.evidence[f])})`);
    }
  }
  const map = new Map();
  for (const t of policy.transitions) {
    const k = `${t.from} -> ${t.to}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  for (const [idx, ev] of state.history.entries()) {
    const prefix = state.history.slice(0, idx);
    const suffix = state.history.slice(idx + 1);
    const t = selectBranch(map.get(eventKey(ev)), prefix, ev);
    if (!t) { errors.push(`${displayPath}: illegal transition: ${eventKey(ev)}`); continue; }
    const remediated = suffix.some((l) => l.from === 'designing' && l.to === 'planning');
    if (t.historical_only === true && state.state !== 'release' && !remediated) {
      errors.push(`${displayPath}: ${eventKey(ev)} at history[${idx}] is marked historical_only (fast-track disabled for active/new work items; route through designing -> planning)`);
    }
    if (t.when) {
      const curErrs = evaluateWhen(t.when, state.evidence, state, 'evidence', ev, displayPath);
      if (ev.classification_snapshot) {
        errors.push(...evaluateWhen(t.when, ev.classification_snapshot, null, 'classification_snapshot', ev, displayPath));
        if (curErrs.length > 0 && !remediated && !HOLD_STATES.has(state.state)) {
          errors.push(`${displayPath}: unremediated fast-track escalation at history[${idx}] (${eventKey(ev)}): current classification no longer satisfies fast-track when-clause and requires routing through designing -> planning before state "${state.state}"`);
        }
      } else {
        errors.push(...curErrs);
      }
    }
    for (const r of t.requires) {
      if (!ev.evidence_refs.includes(r)) errors.push(`${displayPath}: ${eventKey(ev)} requires evidence ${r}`);
      if (!meaningful(state.evidence?.[r])) errors.push(`${displayPath}: evidence ${r} must have a meaningful value`);
    }
  }
  return errors;
}

function writeDraftSafe(targetPath, content, { force = false, io = createStateIo() } = {}) {
  const ops = io.fsOps;
  const resolved = path.resolve(targetPath);
  const dir = path.dirname(resolved);
  const buf = Buffer.from(content, 'utf8');
  if (!force) {
    let fd; let createdByUs = false;
    try {
      fd = ops.openSync(resolved, 'wx', 0o600); createdByUs = true;
      ops.writeSync(fd, buf, 0, buf.length);
      ops.fsyncSync(fd);
    } catch (err) {
      if (fd !== undefined) { try { ops.closeSync(fd); } catch {} fd = undefined; }
      if (createdByUs) { try { ops.unlinkSync(resolved); } catch {} throw Object.assign(new Error('aborted'), { code: 'WRITE_ABORTED_CLEANED_UP', targetModified: false }); }
      throw Object.assign(new Error('race'), { code: err.code === 'EEXIST' ? 'EEXIST_RACE_DETECTED' : 'OPEN_FAILED', targetModified: false });
    } finally { if (fd !== undefined) { try { ops.closeSync(fd); } catch {} } }
    try { syncDirectorySync(dir, io); } catch { throw Object.assign(new Error('dirsync'), { code: 'POST_COMMIT_DIR_SYNC_FAILED', targetModified: true }); }
    return { status: 'CREATED', targetModified: true };
  }
  const tmp = path.join(dir, `.tmp-${path.basename(resolved)}-${process.pid}`);
  let fd; let createdTmp = false;
  try {
    fd = ops.openSync(tmp, 'wx', 0o600); createdTmp = true;
    ops.writeSync(fd, buf, 0, buf.length); ops.fsyncSync(fd);
  } catch {
    if (fd !== undefined) { try { ops.closeSync(fd); } catch {} fd = undefined; }
    if (createdTmp) { try { ops.unlinkSync(tmp); } catch {} }
    throw Object.assign(new Error('stage'), { code: 'TARGET_UNCHANGED_BEFORE_COMMIT', targetModified: false });
  } finally { if (fd !== undefined) { try { ops.closeSync(fd); } catch {} } }
  ops.renameSync(tmp, resolved);
  try { syncDirectorySync(dir, io); } catch { throw Object.assign(new Error('dirsync'), { code: 'POST_COMMIT_DIR_SYNC_FAILED', targetModified: true }); }
  return { status: 'REPLACED', targetModified: true };
}

const policy = YAML.parse(fs.readFileSync('docs/contracts/new-feature-workflow.yaml', 'utf8'));
policy.transitions.push(
  { from: 'discovery', to: 'planning', requires: ['user_stories', 'acceptance_criteria', 'business_rules', 'compressed_spec_reference', 'security_boundary_impact', 'api_contract_impact', 'data_migration_impact', 'pm_ba_gate_result'], when: { risk_level: 'low', security_boundary_impact: 'none', api_contract_impact: 'none', data_migration_impact: 'none' } },
  { from: 'planning', to: 'implementing', requires: ['spec_readiness_checklist', 'implementation_plan', 'compressed_spec_reference', 'spec_readiness_gate_result'], when: { risk_level: 'low', security_boundary_impact: 'none', api_contract_impact: 'none', data_migration_impact: 'none' } }
);

const snap = { risk_level: 'low', security_boundary_impact: 'none', api_contract_impact: 'none', data_migration_impact: 'none' };
const escalatedState = {
  risk_level: 'high', state: 'release',
  history: [
    { from: 'intake', to: 'discovery', evidence_refs: ['change_type', 'risk_level', 'initial_scope'] },
    { from: 'discovery', to: 'planning', evidence_refs: ['user_stories', 'acceptance_criteria', 'business_rules', 'compressed_spec_reference', 'security_boundary_impact', 'api_contract_impact', 'data_migration_impact', 'pm_ba_gate_result'], classification_snapshot: snap },
    { from: 'planning', to: 'implementing', evidence_refs: ['spec_readiness_checklist', 'implementation_plan', 'compressed_spec_reference', 'spec_readiness_gate_result'], classification_snapshot: snap },
    { from: 'implementing', to: 'verifying', evidence_refs: ['changed_files', 'test_evidence', 'dev_qa_gate_result'] },
    { from: 'verifying', to: 'rework', evidence_refs: ['verification_failed', 'rework_route'] },
    { from: 'rework', to: 'designing', evidence_refs: ['rework_scope', 'design_gap'] },
    { from: 'designing', to: 'planning', evidence_refs: ['sdd_reference', 'api_contract', 'data_impact', 'ba_sa_gate_result'] },
    { from: 'planning', to: 'implementing', evidence_refs: ['spec_readiness_checklist', 'implementation_plan', 'sa_dev_gate_result'] },
    { from: 'implementing', to: 'verifying', evidence_refs: ['changed_files', 'test_evidence', 'dev_qa_gate_result'] },
    { from: 'verifying', to: 'human-review', evidence_refs: ['verification_result', 'acceptance_traceability', 'qa_release_gate_result'] },
    { from: 'human-review', to: 'release', evidence_refs: ['approval_evidence', 'release_plan'] }
  ],
  evidence: { change_type: 'new-feature', risk_level: 'high', initial_scope: 's', user_stories: 'u', acceptance_criteria: 'a', business_rules: 'b', compressed_spec_reference: 'c', security_boundary_impact: 'authz', api_contract_impact: 'none', data_migration_impact: 'none', pm_ba_gate_result: 'ok', spec_readiness_checklist: 'ok', implementation_plan: 'p', spec_readiness_gate_result: 'ok', changed_files: 'f', test_evidence: 't', dev_qa_gate_result: 'ok', verification_failed: 'vf', rework_route: 'sa', rework_scope: 'rs', design_gap: 'dg', sdd_reference: 'sdd', api_contract: 'api', data_impact: 'di', ba_sa_gate_result: 'ok', sa_dev_gate_result: 'ok', verification_result: 'vr', acceptance_traceability: 'at', qa_release_gate_result: 'ok', approval_evidence: 'ae', release_plan: 'rp' }
};
const r301Remediated = validateHistoryV4(policy, escalatedState, 'TC-003B');
const unremediated = { ...structuredClone(escalatedState), state: 'verifying', history: escalatedState.history.slice(0, 4) };
const r301Unremediated = validateHistoryV4(policy, unremediated, 'TC-003D');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'issue303-v4-'));
try {
  const wxFile = path.join(tmp, 'partial.md');
  const enospcOps = new Proxy(fs, { get(o, k) { if (k === 'writeSync') return (fd, b) => { fs.writeSync(fd, b, 0, 3); throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); }; const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; } });
  let wxRes; try { writeDraftSafe(wxFile, 'full', { io: createStateIo({ fsOps: enospcOps }) }); } catch (e) { wxRes = { code: e.code, exists: fs.existsSync(wxFile) }; }

  const forceFile = path.join(tmp, 'replace.md'); fs.writeFileSync(forceFile, 'old');
  let syncs = 0;
  const eioOps = new Proxy(fs, { get(o, k) { if (k === 'fsyncSync') return (fd) => { if (++syncs === 2) throw Object.assign(new Error('EIO'), { code: 'EIO' }); return fs.fsyncSync(fd); }; const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; } });
  let forceRes; try { writeDraftSafe(forceFile, 'new', { force: true, io: createStateIo({ fsOps: eioOps }) }); } catch (e) { forceRes = { code: e.code, targetModified: e.targetModified, content: fs.readFileSync(forceFile, 'utf8') }; }

  console.log(JSON.stringify({ r301RemediatedErrors: r301Remediated, r301UnremediatedError: r301Unremediated[0], wxPartialCleanedUp: wxRes, postRenameDirSyncHonest: forceRes }, null, 2));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
NODE
```

---

## 8. จุดขออนุมัติจากผู้บริหาร / Human Maintainer ก่อนเริ่มพัฒนา (Required Policy Approvals)

เอกสารรุ่น v4 ได้ตอบข้อซักถามและปิดช่องว่างทางสัญญาจากรอบที่ 1–3 (`R-01`–`R-02`, `RR-01`–`RR-05`, `R3-01`–`R3-04`, และ `DW-01`–`DW-05`) ครบทุกประเด็นแล้ว จึงขอรับการตัดสินใจจาก Human Maintainer ใน **4 ประเด็นนโยบาย** ก่อนติดป้าย `status:spec-ready`:

1. **อนุมัติทางด่วน Low-Risk `SPEC.md`, Cross-Field Parity, และสัญญาการยกระดับความเสี่ยงระหว่างทาง (`R3-01` & `R3-02` ใน Slice 1)**:
   - เห็นชอบให้เปิดทางด่วน `discovery -> planning -> implementing` เฉพาะงาน `risk_level: low` ที่ไม่แตะ Security, Data Migration, หรือ API Contract ใดๆ (ไม่รวม Additive API) พร้อมทั้งใช้กลไก **Optional `classification_snapshot` คู่กับ Mandatory Design Remediation Invariant** (เมื่อยกระดับความเสี่ยงภายหลัง ต้องเดินผ่าน `designing -> planning` ของ SA ก่อนเข้าสู่ `implementing`/`verifying`/`release`) และรองรับโหมด `historical_only: true` สำหรับการ Rollback หลังมีข้อมูลบันทึกแล้วหรือไม่
2. **อนุมัติกติกา 3-Pass Review & เพดานอ้างอิง 5 Nits ต่อรอบรีวิวใน 9 ไฟล์ของ Issue #303 (Slice 2 — `DW-01`)**:
   - เห็นชอบให้นำค่าตัวอย่างเพดาน `5 Nits` ต่อรอบรีวิวจาก `REVIEW.md` ในบทความต้นฉบับมาใช้เป็นค่าเริ่มต้นของโปรเจกต์ และปรับทั้ง 3 ไฟล์หลักคู่กับสำเนาสกิล `code-review-gate` ทั้ง 3 แพลตฟอร์ม (รวม 9 ไฟล์) ให้สอดคล้องกันโดยไม่บังคับ All-Library Mirror ทั้งคลังหรือไม่
3. **อนุมัติสัญญาการวัดผล `--source structured`, การแยกขาดจากโหมด Legacy (`R3-04`), และสัญญาจัดการความล้มเหลว 3 ระยะของ `--emit-intent` (`R3-03` ใน Slice 3)**:
   - เห็นชอบให้วัด **`dispatch_ledger_expiry_rate` (เกณฑ์เตือน `>= 10%` บน `closedReceipts`)** คู่กับ **`verified_rework_rate` (เกณฑ์เตือน `>= 15%` เฉพาะ `evaluatedItems`, `min-samples = 5`)**, ปฏิเสธการใช้ `--check-thresholds`/`--emit-intent` ร่วมกับ `--source legacy-task-log` (`INCOMPATIBLE_SOURCE_FLAGS` `exit 2` ตาม `METRICS.md:45`), และใช้สัญญา Dual-Digest คู่กับการจัดการความล้มเหลวระดับ I/O ทั้ง 3 ระยะหรือไม่
4. **อนุมัติรูปแบบการส่งมอบแบบ Incremental / Stacked PRs (`PR-1` → `PR-2` → `PR-3` → `PR-4`)**:
   - เห็นชอบให้ส่งมอบทีละ Slice (`closing_action: advances-only` ใน `PR-1`–`PR-3` และ `closing_action: closes` ใน `PR-4`) เพื่อให้ผู้ตรวจรับและ Maintainer ตรวจสอบแยกตามขอบเขตได้อย่างปลอดภัยหรือไม่
