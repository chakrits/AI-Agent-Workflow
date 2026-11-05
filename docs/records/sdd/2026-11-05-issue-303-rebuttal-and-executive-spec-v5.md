# Forensic Round-3 Review Analysis, SDLC Lifecycle Logic & Executive Specification v5 — Issue #303 (End-to-End AI-Native SDLC Integration)

## Metadata

- **Work Item ID**: [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303) · [`docs/records/work-items/2026-11-05-issue-303.md`](../work-items/2026-11-05-issue-303.md)
- **Reviewed Feedback Trail**:
  - Round 1 Feedback: [Issue #303 Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869)
  - Round 1 Response (v2): [Issue #303 Comment `#6651407822`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651407822) (`565207790b25cc1d5a388605ff84a82b153157ea`)
  - Round 2 Re-Review Feedback: [Issue #303 Comment `#6651546438`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6651546438) (`RR-01`–`RR-05`, Section 4, Section 10)
  - Round 2 Response (v3): [Issue #303 Comment `#6652115811`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6652115811) (`53b14b4a9fc66588aff93f161cd8a9ba7efe9108`)
  - Round 3 Initial Re-Review Feedback: [Issue #303 Comment `#6653541297`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6653541297) (`R3-01`–`R3-04`, `DW-01`, Section 8)
  - Round 3 Response (v4): [Issue #303 Comment `#6654391468`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6654391468) (`643f887ffded6349b4c2643854f8a0be01f56d84`)
  - Round 3 Review Quality Update & Concrete Remedies: [Issue #303 Comment `#6654686480`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6654686480) (`V4-01a`, `V4-01b`, `V4-02a`, `V4-02b`, `V4-02c`)
- **Baseline Commits Audited**: `863306a9e3268f32d416ad76f5a783746b49ea4f` (`origin/main`) and `643f887ffded6349b4c2643854f8a0be01f56d84` (v4 branch snapshot)
- **Target Branch**: `feat/issue-303-ai-native-sdlc-playbook`
- **Supersedes**:
  - [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v4.md`](./2026-11-05-issue-303-rebuttal-and-executive-spec-v4.md) (retained intact for immutable link auditability)
  - [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md`](./2026-11-05-issue-303-rebuttal-and-executive-spec-v3.md) (retained intact for immutable link auditability)
  - [`docs/records/sdd/2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md`](./2026-11-05-issue-303-rebuttal-and-executive-spec-v2.md) (retained intact for immutable link auditability)
- **External Primary Source**: [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (August 21, 2026)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook)
- **Change Classification**: `Framework / Meta Change` + `Code Behavior Enhancement` (Slice 1 in `scripts/validate-contracts.mjs`; Slice 3 in `scripts/validate-metrics.mjs`)
- **Risk Level**: `Medium` (modifies contract validator logic, state schema, workflow transition eligibility, multi-surface review policy, and metrics CLI; preserves all security and human approval gates)
- **Lifecycle Phase**: `phase:planning` (awaiting Human Maintainer policy approval before `status:spec-ready` and implementation)
- **Document Status**: `Proposed v5 — Plan Readiness & Prototype Verification Complete for V4-01a/b & V4-02a/b/c; Pending Maintainer Approval, Implementation & QA Acceptance`

---

## 1. บทสรุปสำหรับผู้บริหารและขอบเขตการแก้ไขในรุ่น v5 (Executive Summary)

### 1.1 สถานะความก้าวหน้าและการจำแนกขอบเขตการตรวจรับ (Three-Tier Readiness Framework)

จากผลการทบทวนคุณภาพ Feedback ร่วมกับผู้รีวิวใน [`#issuecomment-6654686480`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6654686480) ผู้รีวิวได้สรุปการประเมินใหม่อย่างชัดเจนว่า:
1. **ไม่จำเป็นต้องรื้อแผนทั้งหมด**: ประเด็นหลักที่ปิดแล้วในระดับแผนตั้งแต่รอบก่อนหน้า (การแยก Namespace ของตัวชี้วัด, Evaluated Cohort, นโยบายรีวิว 9 ไฟล์ที่ไม่บังคับ All-Library Mirror ทั้งคลัง, การแยกขาด Flag ของโหมด Legacy ตาม `METRICS.md:45`, และ Dual-Digest สำหรับ Normal Path) **ปิดได้แล้วในระดับแผนและไม่ต้องทำใหม่**
2. **ขอบเขตงานแก้จำกัดอยู่เพียง 2 กลุ่มย่อย (5 ข้อ)** ตามตาราง Disposition C & D ของ `#6654686480`:
   - **กลุ่ม V4-01 (Sunset / Forward Remediation Contract)**:
     - `V4-01a`: กฎ `historical_only` ต้องอนุญาตให้ระเบียน In-flight เดิมที่ได้รับผลกระทบจาก Sunset สามารถพักค้างในสถานะตรวจรับ/แก้ไข (`REMEDIATION_HOLD_STATES = {"discovery", "designing", "rework", "blocked"}`) ได้ เพื่อให้ผ่านกฎ `validate-before-handoff` ส่งงานให้ SA จัดทำ `SDD.md` ได้อย่างถูกต้องตาม Runbook
     - `V4-01b`: นิยามขอบเขต Enforcement Boundary ของการปิดรับงานใหม่ (New Fast-Track Entry) ด้วย `policy.sunset_effective_at` (Cutoff Timestamp) ใน Contract Policy โดยหากเหตุการณ์เกิดขึ้นหลัง Cutoff จะถูกปฏิเสธทันที และระเบียนประวัติที่จบงานก่อนหน้า (`state === "release"` และ `event.at <= policy.sunset_effective_at`) จะได้รับการยอมรับว่าถูกต้องโดยไม่ต้องดัดแปลงประวัติย้อนหลัง
   - **กลุ่ม V4-02 (Writer Correctness & Honest Failure Semantics)**:
     - `V4-02a`: แก้ไข Prototype Writer ให้ใช้ `write-all loop` ตามแบบแผนของ `scripts/lib/fenced-commit.mjs:64–69` เพื่อรองรับกรณีที่ `writeSync` คืน Positive Short Byte Count โดยไม่โยน Error
     - `V4-02b`: เมื่อเกิดความผิดพลาดในการเขียนและ `unlinkSync` ไฟล์ที่ตัวเองสร้างล้มเหลวด้วย ต้องรายงานรหัสเฉพาะ `WRITE_ABORTED_CLEANUP_FAILED` พร้อมระบุ `targetModified: true` และคงข้อมูล Error ทั้งสองตัวไว้ ไม่รายงานเท็จว่า `CLEANED_UP` หรือ `targetModified: false`
     - `V4-02c`: ในโหมด `--force` หาก `renameSync` ล้มเหลว ต้องทำความสะอาดไฟล์ชั่วคราว `.tmp-*` ให้หมด และหากการลบ Temp ล้มเหลว ต้องรายงาน `RENAME_FAILED_TEMP_RESIDUAL` พร้อมบอกพาธไฟล์ค้างอย่างโปร่งใส
3. **การแยกผลการประเมิน 3 ระดับอย่างเคร่งครัด**:
   - **Plan readiness**: ข้อกำหนดทางสถาปัตยกรรมและการตัดสินใจเชิงสัญญาครบถ้วนสำหรับ Implementer
   - **Prototype verification**: ชุดคำสั่งจำลองและ Fault-Injection Harness ผ่านครบทุกกรณีใน Table D1 และ Table D2 (ยืนยันผลจริงในหัวข้อที่ 7)
   - **Implementation/QA acceptance**: โค้ดจริงจะดำเนินการแบบ TDD, Independent Review และ QA Verification หลังได้รับอนุมัติ `status:spec-ready`

---

## 2. การตรวจสอบข้อเท็จจริงและข้อกำหนดเชิงสัญญาที่ปรับปรุงใน v5 (`V4-01a/b` & `V4-02a/b/c`)

### 2.1 ตารางตรวจสอบและข้อกำหนดเชิงสัญญาในรุ่น v5

| รหัสประเด็น | ผลการตรวจซ้ำกับซอร์สโค้ดและ Prototype | ข้อกำหนดเชิงสัญญาและแนวทางแก้ไขใน Spec v5 |
|---|---|---|
| **`V4-01a` [สำคัญสูง / Design Contradiction]**<br>`historical_only` ปฏิเสธ `designing` ระหว่าง Recovery | **เป็นความจริงใน Prototype v4**: โค้ดเดิมเขียน `if (t.historical_only === true && state.state !== 'release' && !remediated)` ส่งผลให้เมื่องาน In-flight เดิมถูก Sunset แล้วกำลังส่งต่อให้ SA ในสถานะ `state: designing` จะถูกปฏิเสธทันที ทำให้ขัดกับกฎ `validate-before-handoff` ใน `new-feature.md:18` | **ปรับปรุงเงื่อนไข `historical_only` ให้รองรับ `REMEDIATION_HOLD_STATES` (`Spec v5 §4.1.4`)**:<br>กำหนดให้ระเบียน In-flight เดิมที่เดินผ่านกิ่งทางด่วนที่ถูก Sunset ได้รับการอนุญาตให้อยู่ในสถานะ **`REMEDIATION_HOLD_STATES = {"discovery", "designing", "rework", "blocked"}`** ได้อย่างถูกต้อง เพื่อให้ส่งงานต่อไปยัง SA จัดทำ `SDD.md` ได้ตาม Runbook โดยระบบจะ **บล็อกเฉพาะเมื่อระเบียนนั้นพยายามค้างอยู่ใน `planning` หรือเดินหน้าเข้าสู่ `implementing`, `verifying`, `human-review`, หรือ `release` โดยยังไม่ผ่าน `designing -> planning` เท่านั้น** |
| **`V4-01b` [สำคัญสูง / Enforcement Boundary]**<br>การปิดรับงานใหม่และขอบเขตประชากรที่ Adopt ก่อน Sunset | **เป็นความจริงใน Prototype v4**: การละเว้นการตรวจเฉพาะ `state.state === 'release'` โดยไม่มี Cutoff Timestamp ทำให้งานใหม่ที่สร้างขึ้นหลัง Sunset แล้วเคลมว่าเป็น `release` ไม่ถูกตรวจจับที่ด่าน Validator นี้ | **กำหนด `sunset_effective_at` และ Adoption Boundary ใน Contract Policy (`Spec v5 §4.1.4`)**:<br>1. ใน `new-feature-workflow.yaml` กำหนดฟิลด์ `sunset_effective_at: "<ISO-8601-Timestamp>"` ควบคู่กับ `historical_only: true`<br>2. ที่ด่าน `validate-contracts.mjs`: หากพบเหตุการณ์ทางด่วนที่มี `event.at > policy.sunset_effective_at` จะถูกปฏิเสธทันทีในฐานะ New Entry หลัง Sunset โดยไม่มีข้อยกเว้น (`sunset-post-cutoff`)<br>3. ระเบียนประวัติที่จบงานก่อนหน้า (`state === 'release'` และ `event.at <= policy.sunset_effective_at`) จะได้รับการรับรองความถูกต้องโดยไม่ต้องแก้ไขประวัติย้อนหลัง |
| **`V4-02a` [สำคัญสำหรับ Correctness]**<br>Positive short write แล้ว Prototype รายงาน Success | **เป็นความจริงใน Prototype v4**: Prototype เดิมเรียก `ops.writeSync(fd, buf, 0, buf.length)` ครั้งเดียวโดยไม่มี Loop เมื่อ `writeSync` เขียนได้ไม่ครบไบต์และไม่ Throw ตัว Prototype จึงข้ามไป `fsync` และรายงาน `CREATED` ทั้งที่ได้ไฟล์ไม่สมบูรณ์ | **ใช้ Write-All Loop มาตรฐานตาม `fenced-commit.mjs:64–69` (`Spec v5 §4.4.3`)**:<br>วนลูป `while (offset < buffer.length)` ตรวจสอบไบต์ที่เขียนจริง หากได้ `<= 0` หรือไม่เป็นจำนวนเต็มให้ Throw `ATOMIC_WRITE_NO_PROGRESS` เพื่อเข้าสู่กระบวนการ Abort & Cleanup ทันที |
| **`V4-02b` [สำคัญสำหรับ Correctness]**<br>Cleanup ล้มเหลวแต่รายงาน Cleaned Up และ `targetModified: false` | **เป็นความจริงใน Prototype v4**: บล็อก `catch` ของการ Cleanup ครอบด้วย `try { ops.unlinkSync(...) } catch {}` ทำให้เมื่อ `unlinkSync` โยน `EACCES` ตัวฟังก์ชันยังคงโยน Error ด้วยรหัส `WRITE_ABORTED_CLEANED_UP` และ `targetModified: false` ทั้งที่มีไฟล์ตกค้างอยู่บนดิสก์จริง | **รายงานข้อผิดพลาดและสถานะไฟล์ตกค้างตามความจริง (`Spec v5 §4.4.3`)**:<br>หากการเรียก `unlinkSync` ในบล็อก Cleanup ล้มเหลว ระบบจะ Throw **`WRITE_ABORTED_CLEANUP_FAILED`** พร้อมระบุ **`targetModified: true`** และแนบทั้ง `primaryError` (เช่น `ENOSPC`) และ `cleanupError` (เช่น `EACCES`) ให้ผู้ปฏิบัติการทราบความจริงทันที |
| **`V4-02c` [สำคัญสำหรับ Correctness]**<br>Rename failure ทิ้ง Temporary File | **เป็นความจริงใน Prototype v4**: ในโหมด `--force` คำสั่ง `ops.renameSync(tmpPath, resolved)` อยู่นอกบล็อก Try/Catch ของการจัดการไฟล์ชั่วคราว เมื่อเกิด `EACCES` ไฟล์ `.tmp-*` จึงตกค้างอยู่บนดิสก์ | **ครอบ Try/Catch ล้าง Temp File เมื่อ Rename ล้มเหลว (`Spec v5 §4.4.3`)**:<br>เมื่อ `renameSync` ล้มเหลว ระบบจะพยายาม `unlinkSync(tmpPath)` ทันที หากลบสำเร็จจะรายงาน `TARGET_UNCHANGED_BEFORE_COMMIT` (`targetModified: false`, ไม่มีไฟล์ Temp ตกค้าง); หากการลบ Temp ล้มเหลวซ้ำจะรายงาน `RENAME_FAILED_TEMP_RESIDUAL` (`targetModified: false`, ระบุพาธไฟล์ Temp ที่ตกค้าง) |

---

## 3. การเชื่อมโยง AI-Native SDLC ครบทั้ง 6 Stages (End-to-End Primary-Source Mapping v5)

| Stage | Play / แนวคิดในบทความ Anthropic | กลไกใน Repo ปัจจุบัน (`863306a`) | การยกระดับใน Issue #303 (Spec v5) |
|---|---|---|---|
| **01 Plan** | **Capture as `intent.md`** | มี `PROJECT_BRIEF.md` และ `REQUIREMENT_DISCOVERY.md` | **Slice 1**: เพิ่ม `docs/templates/INTENT.md` เป็นใบตั้งต้นมาตรฐานที่ใช้ร่วมกันได้ทั้งจากมนุษย์และจากระบบแจ้งเตือนใน Stage 06 |
| **02 Design** | **Single-session `spec.md` & Mid-Flight Risk Escalation** | `dynamic-routing.md:92` อนุญาต Lightweight Spec แต่ `new-feature-workflow.yaml` บังคับผ่าน `designing` + `SDD.md` | **Slice 1**: เพิ่ม `docs/templates/SPEC.md` + ตารางคัดกรอง 6 ข้อ (ไม่รวม API ใหม่ทุกชนิด) + ยกระดับ `validate-contracts.mjs` และ `new-feature-state.schema.json` ให้รองรับทางด่วน `low`-risk, การยกระดับความเสี่ยงระหว่างทาง (`classification_snapshot` + Mandatory SA Remediation), และโหมด Sunset ที่สมบูรณ์ (`historical_only: true`, `REMEDIATION_HOLD_STATES`, `sunset_effective_at` `V4-01a/b`) |
| **03 Build** | **Plan mode (`plan.md`), Source of Truth, Parallel Worktrees vs Subagents** | มี `IMPLEMENTATION_PLAN.md`, `core-bootloader.md`, และกฎ Worktree ใน `AGENTS.md` | **Slice 1**: คง `IMPLEMENTATION_PLAN.md` เป็น `plan.md`, ผูก Commit-SHA Source of Truth ใน `INTENT.md`/`SPEC.md`, และเพิ่มตารางตัดสินใจ **Parallel Worktree Sessions vs. In-Session Scoped Subagents** ใน `dynamic-routing.md` |
| **04 Test** | **Feedback loop & Continuous evals in CI** | มี `npm test` (`801` deterministic tests) และ `run-scoped-validations.mjs` | **Slice 1 & 3 (TDD) + Slice 4 (Roadmap)**: เพิ่มชุดทดสอบ Contract/Lifecycle/Sunset/Metrics/I/O Fault-Injection (`TC-001`–`TC-015`) และวางแผน Live Non-Interactive Agent Behavioral Evals (`claude -p`) ไว้ใน Milestone M3/M4 |
| **05 Deploy** | **`REVIEW.md` (3 Passes + 5-Nit Cap) & Hooks as Approval Gates** | มีไฟล์รีวิวหลักและสำเนาสกิล `code-review-gate`, `validate-pr-readiness.mjs --hook` (JSON `deny`), และ Hosted CI | **Slice 2 & Slice 4**: ปรับปรุงไฟล์รีวิวและสำเนาสกิล `code-review-gate` ทั้ง 9 ไฟล์ของ Issue นี้ให้สอดคล้องกัน (3 Passes + เพดานอ้างอิง **5 Nits ต่อรอบรีวิว**) พร้อมบันทึกตาราง 5-Layer Enforcement Boundary ตามกลไก JSON stdout protocol จริง |
| **06 Maintain** | **Deterministic Threshold Detection → Draft `intent.md` → Human Triage** | มี `validate-metrics.mjs` (regex บน `TASK_LOG`), `dispatch-receipt.schema.json`, และ `durable-task-envelope.schema.json` | **Slice 3**: สร้างโหมด `--source structured` วัด **`dispatch_ledger_expiry_rate`** และ **`verified_rework_rate`** บน Evaluated Cohort (แยกขาดจาก `--source legacy-task-log` ตาม `METRICS.md:45`), ป้องกันไฟล์ร่างที่มนุษย์แก้ด้วย Dual-Digest, และใช้สัญญาจัดการความล้มเหลวระดับ I/O 3 ระยะที่สมบูรณ์ครบถ้วน (`V4-02a/b/c`) |

---

## 4. ข้อกำหนดทางสถาปัตยกรรมและสัญญาเทคนิคฉบับสมบูรณ์ (Detailed Technical Contracts v5)

### 4.1 Stage 01 & 02 Contract: Compressed Artifact Route, Parity, Temporal Escalation & Sunset Recovery (ตอบโจทย์ `RR-01`, `R3-01`, `R3-02`, `V4-01a`, `V4-01b`)

#### 4.1.1 ตารางเกณฑ์คัดกรอง 6 ข้อแบบ Conjunctive (ไม่อนุญาต Additive API ในทางด่วน)

คงตารางเกณฑ์คัดกรอง 6 ข้อจากรุ่น v4 (`E-1` Risk Level, `E-2` Security Boundary, `E-3` API Contract [ไม่อนุญาต API ใหม่ทุกชนิดแม้เป็นแบบ Additive], `E-4` Data Migration, `E-5` Requirement Clarity, `E-6` Independent Verification)

#### 4.1.2 Cross-Field Classification Parity & Causal Episode-Scoped Branch Selection

คงฟังก์ชัน `validateTopLevelEvidenceParity()` และการคัดเลือกกิ่ง `selectTransitionBranch()` จาก Causal History Prefix `history.slice(0, index)` นับจากหลังเหตุการณ์ `to === "discovery"` ครั้งล่าสุดเท่านั้น

#### 4.1.3 สัญญาการยกระดับความเสี่ยงระหว่างทาง (`classification_snapshot` + Mandatory Design Remediation)

คงข้อกำหนด Optional `classification_snapshot` ใน `docs/contracts/schemas/new-feature-state.schema.json` และกฎ Mandatory Design Remediation Invariant ที่บังคับให้ต้องมี `designing -> planning` (พร้อม `SDD.md` และ `ba_sa_gate_result`) ตามด้วย `planning -> implementing` กิ่งมาตรฐาน (`sa_dev_gate_result`) เกิดขึ้นตามหลังเหตุการณ์ทางด่วนที่มีการยกระดับความเสี่ยงเสมอ

#### 4.1.4 สัญญาความเข้ากันได้ของการปิดทางด่วนและการฟื้นฟูข้อมูลสถานะ (`V4-01a` & `V4-01b` Sunset & Recovery Contract)

เพื่อแก้ไขข้อขัดแย้งเชิงออกแบบและกำหนด Enforcement Boundary ของการปิดทางด่วนอย่างแม่นยำ:
1. **การกำหนด `sunset_effective_at` ใน Policy Contract (`V4-01b`)**:
   - เมื่อต้องการปิดทางด่วน ให้เพิ่มฟิลด์ `sunset_effective_at: "<ISO-8601-Timestamp>"` ใน `docs/contracts/new-feature-workflow.yaml` ควบคู่กับการตั้งค่า `historical_only: true` บนกิ่งทางด่วนทั้งสอง
   - **New Entry Boundary Enforcement**: หากเหตุการณ์ทางด่วนใดมี `event.at > policy.sunset_effective_at` ด่าน `validate-contracts.mjs` จะปฏิเสธทันทีด้วยรหัสข้อผิดพลาด:
     `<path>: <from> -> <to> at history[<i>] occurred at <at>, after sunset_effective_at (<cutoff>); fast-track is disabled for new entries`
2. **การรองรับ In-Flight Recovery Hold States (`V4-01a`)**:
   - สำหรับระเบียนที่มีอยู่เดิม (`event.at <= policy.sunset_effective_at` หรือยังไม่ได้ระบุ Cutoff):
     - **กรณีที่ 1: งานที่จบสมบูรณ์แล้ว (`state.state === "release"`)**: ตรวจผ่าน `validateContracts()` และ `validate-metrics.mjs --source structured` ได้อย่างสมบูรณ์โดยไม่ต้องแก้ไขประวัติย้อนหลัง
     - **กรณีที่ 2: งาน In-Flight เดิมที่กำลังเข้าสู่กระบวนการแก้ไข (Under Remediation)**: หากสถานะปัจจุบันของงานอยู่ใน **`REMEDIATION_HOLD_STATES = {"discovery", "designing", "rework", "blocked"}`** ระบบจะอนุญาตให้ตรวจผ่าน เพื่อให้เป็นไปตามกฎ `validate-before-handoff` ใน `new-feature.md:18` และส่งมอบงานให้ SA ดำเนินการออกแบบ `SDD.md` ต่อได้อย่างราบรื่น
     - **กรณีที่ 3: งาน In-Flight ที่พยายามข้ามขั้นตอน**: หากงานนั้นพยายามค้างอยู่ใน `planning` หรือเดินหน้าเข้าสู่ `implementing`, `verifying`, `human-review`, หรือ `release` โดยยังไม่ผ่าน `designing -> planning` จะถูกปฏิเสธทันทีด้วยข้อความ:
       `<path>: <from> -> <to> at history[<i>] is marked historical_only (fast-track disabled for active/new work items; route through designing -> planning before state "<state>")`

---

### 4.2 Stage 03 Contract: Parallel Worktree Sessions vs. In-Session Scoped Subagents (คงเดิม)

คงตารางตัดสินใจใน `docs/workflow/dynamic-routing.md` แยกชัดเจนระหว่าง Parallel Git Worktrees กับ In-Session Scoped Subagents

---

### 4.3 Stage 05 Contract: Deliberate 9-File Review Policy & Reference 5-Nit Cap (`DW-01` — คงเดิม)

คงข้อกำหนดการปรับปรุง 9 ไฟล์ของ Issue #303 โดยใช้ `validate-skill-parity.mjs` ตรวจ `SKILL.md` คู่กับการเทียบไบต์ตรงของไฟล์แม่แบบย่อย `templates/CODE_REVIEW_FINDINGS.md` ทั้ง 3 แพลตฟอร์ม

---

### 4.4 Stage 06 → Stage 01 Contract: Structured Cohort Metrics, Legacy Isolation & 3-Phase Safe Intent CLI (ตอบโจทย์ `RR-02`, `RR-03`, `RR-05`, `R3-04`, `V4-02a/b/c`)

#### 4.4.1 การแยก Namespace และนิยามตัวชี้วัดบน Schema ที่มีอยู่จริง (คงเดิม)
- `dispatch_ledger_expiry_rate` บน `closedReceipts`
- `verified_rework_rate` บน `evaluatedItems`
- ลำดับความสำคัญ: `DATA_ERROR (exit 2) > BREACH_DETECTED > INSUFFICIENT_DATA > WITHIN_TARGET`

#### 4.4.2 การแยกขาดโหมด Legacy จาก Flags ชุดใหม่ตาม `METRICS.md:45` (คงเดิม)
- ห้ามใช้ `--check-thresholds`, `--emit-intent`, `--min-samples`, หรือ `--force` ร่วมกับ `--source legacy-task-log` (ปฏิเสธด้วย `INCOMPATIBLE_SOURCE_FLAGS`, `exit 2`)

#### 4.4.3 สัญญาจัดการความล้มเหลวระดับ I/O 3 ระยะฉบับสมบูรณ์ (`V4-02a/b/c` Robust 3-Phase I/O Failure Contract)

เพื่อปิดช่องโหว่ทางเทคนิคของตัวเขียนไฟล์และรายงานสถานะอย่างตรงไปตรงมา:

| ระยะ (I/O Phase) | พฤติกรรมการทำงานและการรับประกันทางเทคนิค | การจัดการความผิดพลาดและสถานะของไฟล์ปลายทาง | รหัส Error และ Exit Code |
|---|---|---|---|
| **Phase 1: Preflight, Input, Data & Guard Checks** | ตรวจสอบ Flag, Schema, Cohort, Breach และสถานะไฟล์เดิมก่อนเปิด File Descriptor | ยุติการทำงานทันทีโดยไม่มีการเปิดเขียนไฟล์ใดๆ (**รับประกัน `targetModified: false` 100%**) | `INCOMPATIBLE_SOURCE_FLAGS` / `REJECT_HUMAN_MODIFIED` / `REJECT_FINGERPRINT_CHANGED` / `DATA_ERROR`<br>**Exit `2`** *(หรือ `0`/`1` สำหรับ `M-02`/`M-04`)* |
| **Phase 2A: Exclusive Create (`M-03`, ไม่มี `--force`)** | 1. เปิดไฟล์ด้วย `fs.openSync(resolved, 'wx', 0o600)` พร้อมตัวแปร `createdByUs = true`<br>2. **Write-All Loop (`V4-02a`)**: วนลูป `while (offset < buffer.length)` ตาม `fenced-commit.mjs:64–69` เพื่อรองรับ Positive Short Write และ Throw `ATOMIC_WRITE_NO_PROGRESS` เมื่อได้ `<= 0`<br>3. เรียก `fsyncSync(fd)` และ `closeSync(fd)` | - **กรณีชน `EEXIST` (`createdByUs === false`)**: **ห้ามเรียก `unlinkSync` เด็ดขาด** เพื่อปกป้องไฟล์ของผู้อื่น (`targetModified: false`)<br>- **กรณีเขียนล้มเหลวหลังจากสร้างไฟล์แล้ว (`createdByUs === true`)**: ปิด `fd` และเรียก `unlinkSync(resolved)` ทันที:<br>  - หากลบสำเร็จ: คืน `WRITE_ABORTED_CLEANED_UP` (**`targetModified: false`**, ไม่เหลือไฟล์ค้าง)<br>  - หากลบล้มเหลว (`V4-02b`): คืน **`WRITE_ABORTED_CLEANUP_FAILED`** (**`targetModified: true`**, รายงานว่ามีไฟล์ตกค้างและแนบทั้งสอง Error) | - ชนคนอื่น: `EEXIST_RACE_DETECTED`<br>- ลบสำเร็จ: `WRITE_ABORTED_CLEANED_UP`<br>- ลบล้มเหลว: `WRITE_ABORTED_CLEANUP_FAILED`<br>**Exit `2`** |
| **Phase 2B: Atomic Replace Staging (`M-07`, มี `--force`)** | 1. สร้างไฟล์ชั่วคราว `.tmp-<base>-<pid>-<stamp>-<rand>` ด้วย `wx`<br>2. เขียน Buffer ด้วย Write-All Loop และ `fsyncSync(fd)`<br>3. ปิด `fd` และเรียก `ops.renameSync(tmpPath, resolved)` | - **กรณีล้มเหลวก่อน `renameSync`**: ปิด `fd` และลบ Temp File (`TARGET_UNCHANGED_BEFORE_COMMIT`, **`targetModified: false`**)<br>- **กรณี `renameSync` ล้มเหลว (`V4-02c`)**: ครอบบล็อก Catch พยายามลบ Temp File ทันที:<br>  - หากลบ Temp สำเร็จ: คืน `TARGET_UNCHANGED_BEFORE_COMMIT` (**`targetModified: false`**, `tempLeft: 0`)<br>  - หากลบ Temp ล้มเหลว: คืน **`RENAME_FAILED_TEMP_RESIDUAL`** (**`targetModified: false`**, ระบุพาธ Temp ตกค้าง) | - ลบ Temp สำเร็จ: `TARGET_UNCHANGED_BEFORE_COMMIT`<br>- ลบ Temp ล้มเหลว: `RENAME_FAILED_TEMP_RESIDUAL`<br>**Exit `2`** |
| **Phase 3: Post-Commit Directory Durability Sync** | เรียก `syncDirectorySync(dir, io)` หลังจุด Commit (`renameSync` หรือปิดไฟล์ `wx` ที่ `fsync` สำเร็จ) | ไฟล์ปลายทางถูกสร้างหรือแทนที่เรียบร้อยแล้ว หาก Directory `fsync` ล้มเหลวจะรายงานความจริงว่าไฟล์ถูกแก้ไขแล้วแต่การ Sync ไดเรกทอรีล้มเหลว | **`POST_COMMIT_DIR_SYNC_FAILED`**<br>(ระบุชัดเจนว่า **`targetModified: true`**)<br>**Exit `2`** |

---

## 5. ลำดับการพึ่งพา การส่งมอบแบบ Stacked PRs และแผนการย้อนกลับ 2 กรณี (คงเดิมตาม v4)

- **Semantic Dependency Order**: `Slice 1` (`INTENT.md`, `SPEC.md`, `validate-contracts.mjs`, `new-feature-state.schema.json`) → `Slice 3` (`validate-metrics.mjs`) → `Slice 4` (`ROADMAP-SDLC-FRAMEWORK.md`), โดย `Slice 2` (9 Review/Skill Files) ดำเนินการแยกอิสระ
- **Two-Regime Rollback Runbook**:
  - **Regime 1 (Pre-Adoption Rollback)**: `git revert` ย้อนลำดับ (`Slice 3 → Slice 1`) เมื่อยังไม่มีระเบียนประวัติใช้ทางด่วน
  - **Regime 2 (Post-Adoption Fast-Track Sunset)**: ตั้งค่า `historical_only: true` และระบุ `sunset_effective_at` ใน `new-feature-workflow.yaml` โดยห้ามแก้ไขประวัติย้อนหลัง อนุญาตให้งานที่จบแล้ว (`release`) หรือระเบียนที่อยู่ใน `REMEDIATION_HOLD_STATES` ตรวจผ่านตามปกติ และบล็อกงานใหม่หรืองาน In-Flight ที่พยายามข้ามขั้นตอน

---

## 6. Revised Acceptance Criteria (v5) & Complete Verification Traceability Matrix (`TC-001` – `TC-015`)

### 6.1 Acceptance Criteria (v5)

- **AC-001 (Compressed Templates & Canonical Equivalence)**: เพิ่ม `docs/templates/INTENT.md` และ `docs/templates/SPEC.md` โดยคงแม่แบบเดิมทั้ง 34 ไฟล์ไว้ครบถ้วน พร้อมตารางเทียบความสมมูลกับ `REQUIREMENT_DISCOVERY.md` / `SDD.md`
- **AC-002 (Hardened Contract Parity, Temporal Escalation & Sunset Recovery — `RR-01`, `R3-01`, `R3-02`, `V4-01a`, `V4-01b`)**:
  1. อัปเดต `scripts/validate-contracts.mjs` และ `docs/contracts/schemas/new-feature-state.schema.json` ให้รองรับ: Top-Level Parity, Causal Prefix Branch Selection, Optional `classification_snapshot` + Mandatory SA Remediation, และ `historical_only: true` Sunset Mode ที่รองรับทั้ง In-Flight Recovery Hold States (`V4-01a`) และ `sunset_effective_at` New-Entry Enforcement Boundary (`V4-01b`)
  2. อัปเดต `docs/contracts/new-feature-workflow.yaml` และ `docs/workflows/new-feature.md` เพิ่มกิ่งทางด่วน `discovery -> planning` และ `planning -> implementing` เฉพาะ `risk_level: low` ที่ไม่แตะ Security/API/Data (ไม่รวม Additive API)
  3. อัปเดต `docs/workflow/dynamic-routing.md`, `DECISIONS.md`, `CHANGELOG.md`, `repin:source-matrix`, ผ่านการตรวจจาก `security-reviewer` และ `code-reviewer` อิสระ พร้อมแนบ `docs/records/qa/*-slice-1-contracts-code-review.md`
- **AC-003 (Deliberate 9-File Review Policy Alignment & Reference 5-Nit Cap — `DW-01`)**: อัปเดตไฟล์หลัก 3 ไฟล์และสำเนาสกิล `code-review-gate` ทั้ง 3 ต้นไม้ (รวม 9 ไฟล์) ให้สอดคล้องกันบน 3 Passes, 3 Tiers, เพดานอ้างอิง 5 Nits และคงกฎ Scoped Re-review
- **AC-004 (Structured Cohort Metrics, Legacy Flag Isolation & Robust 3-Phase Safe Intent CLI — `RR-02`, `RR-03`, `RR-05`, `R3-04`, `V4-02a/b/c`)**: พัฒนาโหมด `--source structured` ใน `scripts/validate-metrics.mjs` วัด `dispatch_ledger_expiry_rate` และ `verified_rework_rate`, ปฏิเสธ Flags ชุดใหม่เมื่อใช้กับ `--source legacy-task-log` (`INCOMPATIBLE_SOURCE_FLAGS` `exit 2`), ใช้ระบบ Dual-Digest, และบังคับใช้สัญญา I/O 3 ระยะฉบับสมบูรณ์ (Write-All Loop `V4-02a`, `WRITE_ABORTED_CLEANUP_FAILED` เมื่อ Cleanup พัง `V4-02b`, และ Temp Cleanup / `RENAME_FAILED_TEMP_RESIDUAL` เมื่อ Rename พัง `V4-02c`) พร้อมแนบ `docs/records/qa/*-slice-3-metrics-code-review.md`
- **AC-005 (Roadmap Alignment & Honest 5-Layer Enforcement Matrix)**: อัปเดต `ROADMAP-SDLC-FRAMEWORK.md` เชื่อมโยง 6 Stages เข้ากับ Milestones `M1–M4` และระบุตาราง 5-Layer Enforcement Boundary
- **AC-006 (Zero Regression, Stacked PR Readiness & Full Gate Verification)**: ผ่านชุดทดสอบ `TC-001`–`TC-015` และชุดตรวจมาตรฐานทั้งหมดของโปรเจกต์

---

### 6.2 Complete Verification Traceability Matrix (`TC-001` – `TC-015`)

| Test ID | AC | ประเภท | สถานการณ์ทดสอบ (ครอบคลุมครบทุกประเด็นจาก `RR-01`–`RR-05`, `R3-01`–`R3-04`, `DW-01`–`DW-05`, และ `V4-01a/b` & `V4-02a/b/c`) | ผลลัพธ์ที่ต้องสังเกตได้จริง (Deterministic Expected Outcome) |
|---|---|---|---|---|
| **TC-001** | AC-002 | Contract Happy Path | `new-feature` เดินครบสายทางด่วน `intake -> discovery -> planning -> implementing -> verifying -> human-review -> release` (`risk_level: low`, impacts `"none"`) และตรวจตัวอย่างมาตรฐานเดิมทั้ง 10 ไฟล์ | `validateContracts()` คืน `[]` ทั้งสายทางด่วนและตัวอย่างเดิมทั้ง 10 ไฟล์ |
| **TC-002** | AC-002 | Cross-Field Parity Guard (`RR-01`) | ทดสอบ `top-level: high` + `evidence: low`, `top-level: low` + `evidence: high`, ลบ `evidence.risk_level`, และ `config-change` `risk_tier` mismatch | ทุกกรณีถูกปฏิเสธแบบ Fail-Closed พร้อมข้อความ `top-level <field> ... does not match evidence.<field>` |
| **TC-003** | AC-002 | Impact Exit, Temporal Escalation & Sunset Recovery (`RR-01`, `R3-01`, `R3-02`, `V4-01a`, `V4-01b`) | - **TC-003.1**: `low`-risk แต่แตะ `authz`, `additive-endpoint`, หรือ `schema-migration`<br>- **TC-003A (`R3-01` Plan Escalation)**: `discovery -> planning` (`low` snapshot) → พบ `high` risk → `planning -> designing -> planning -> implementing` (`sa_dev_gate_result`) → `release`<br>- **TC-003B (`R3-01` Rework Escalation)**: ทางด่วนถึง `verifying` → พบผลกระทบ API/Authz (`high`) → `verifying -> rework -> designing -> planning -> implementing` (`sa_dev_gate_result`) → `release`<br>- **TC-003C (`R3-01` Standard Replan)**: สาย `designing` มาตรฐาน → `verifying -> rework -> planning -> implementing`<br>- **TC-003D (`R3-01` Negative Escalation / Prefix / Episode Reset)**: ยกระดับเป็น `high` แล้วข้าม `designing`, อ้าง `designing` ในอนาคตย้อนหลัง, หรืออ้าง `designing` ข้ามรอบ `rework -> discovery`<br>- **TC-003E.1 (`V4-01a` Sunset Recovery Hold)**: งาน In-Flight เดิมที่ถูก Sunset พักรอในสถานะ `designing`, `rework`, หรือ `blocked` เพื่อจัดทำ `SDD.md`<br>- **TC-003E.2 (`V4-01a` Sunset Unremediated Implementing)**: งาน In-Flight เดิมที่ถูก Sunset พยายามข้ามไป `implementing` โดยไม่ผ่าน `designing -> planning`<br>- **TC-003E.3 (`V4-01b` Pre-Sunset Completed)**: ระเบียนทางด่วนที่จบงานแล้ว (`release` และ `event.at <= sunset_effective_at`)<br>- **TC-003E.4 (`V4-01b` Post-Sunset New Entry)**: สร้างรายการทางด่วนใหม่หลัง `sunset_effective_at` | - **TC-003A, TC-003B, TC-003C**: `validateContracts()` คืน `[]`<br>- **TC-003.1 & TC-003D**: ถูกปฏิเสธทั้งหมด (`unremediated fast-track escalation`, Prefix/Episode mismatch)<br>- **TC-003E.1 (`V4-01a`)**: **`validateContracts()` คืน `[]` (ผ่านการตรวจรับรองขณะพักรอใน `designing` เพื่อให้ผ่านกฎ Handoff)**<br>- **TC-003E.2**: ถูกบล็อกด้วย `is marked historical_only ... route through designing -> planning before state "implementing"`<br>- **TC-003E.3 (`V4-01b`)**: **`validateContracts()` คืน `[]` (ระเบียนประวัติเดิมที่จบแล้วตรวจผ่าน 100%)**<br>- **TC-003E.4 (`V4-01b`)**: **ถูกบล็อกด้วย `occurred at ..., after sunset_effective_at; fast-track is disabled for new entries`** |
| **TC-004** | AC-004 | Default & Legacy CLI Isolation (`R3-04`) | รัน: (ก) ไม่มี flag, (ข) `--source legacy-task-log` เดี่ยวๆ, (ค) `--source legacy-task-log --check-thresholds`, (ง) `--source legacy-task-log --emit-intent <path>`, (จ) `--check-thresholds` โดยไม่ใส่ `--source structured` | (ก)–(ข) แสดงตารางเดิม `exit 0`; **(ค)–(จ) ถูกปฏิเสธด้วย `INCOMPATIBLE_SOURCE_FLAGS` (`exit 2`, ไม่เขียนไฟล์ใดๆ)** |
| **TC-005** | AC-004 | Ledger Expiry Semantics (`RR-02`) | ทดสอบ `dispatch-receipts`: (ก) `1` `expired` + `19` `consumed` + `10` `registered`, (ข) `2` `expired` + `18` `consumed` | ตัวหารนับเฉพาะ `closedReceipts` (`20`); (ก) ได้ `5.0%` (`WITHIN_TARGET`); (ข) ได้ `10.0%` (`BREACH_DETECTED`) |
| **TC-006** | AC-004 | Rework Cohort & Intake Dilution Immunity (`RR-03`) | ทดสอบ `task-state.json`: (ก) `1` งาน `verifying -> rework` + `9` งาน `intake`, (ข) `1` งาน `verifying -> rework` + `4` งาน `verifying -> handoff` + `50` งาน `intake` | (ก) `evaluatedItems = 1 (< 5)` คืน `INSUFFICIENT_DATA`; (ข) `evaluatedItems = 5` คืน `20.0%` (`BREACH_DETECTED`) |
| **TC-007** | AC-004 | Schema Registry, Digest & Archive Integrity (`RR-03`) | ทดสอบ `state_digest` ไม่ตรง, `task_id` ซ้ำทั้ง `active` และ `archive`, `contract_version: 99`, และ `handoff_event_id` ซ้ำ | ทุกกรณีหยุดแบบ Fail-Closed ด้วย `exit 2` |
| **TC-008** | AC-004 | Unrounded Threshold BVA & Mixed Status | ทดสอบ `9.5%` vs `10.0%`, `14.5%` vs `15.0%`, และ `BREACH_DETECTED` ผสม `INSUFFICIENT_DATA` | ตัดสินด้วยค่าจริงก่อนปัดเศษ และกรณีผสมคืน `BREACH_DETECTED` (`exit 1`) |
| **TC-009** | AC-004 | Dual-Digest Human-Edit Safety & Provenance (`RR-05`) | ทดสอบ `--emit-intent <path>` ซ้ำเมื่อ: (1) `HEAD` เปลี่ยนแต่คนไม่แก้ไฟล์, (2) สลับลำดับไฟล์, (3) คนแก้เนื้อหาแต่คง `Intent-Fingerprint` เดิมไว้, (4) ข้อมูล Breach เปลี่ยนบนไฟล์เดิม, (5) มี `--force` | (1)–(2) ได้ `NO_OP_UNCHANGED_ANOMALY` (`exit 0`); (3) `REJECT_HUMAN_MODIFIED` (`exit 2`); (4) `REJECT_FINGERPRINT_CHANGED` (`exit 2`); (5) แทนที่ไฟล์สำเร็จ |
| **TC-010** | AC-004 | Robust 3-Phase I/O Fault-Injection (`R3-03`, `V4-02a`, `V4-02b`, `V4-02c`) | ฉีดความล้มเหลวผ่าน `createStateIo({ fsOps })`:<br>- **TC-010.1 (Preflight)**: Flag ไม่ถูกต้อง, `EISDIR`<br>- **TC-010.2 (`V4-02a` Positive Short Write)**: `writeSync` คืน 1 ไบต์ต่อครั้งโดยไม่ Throw<br>- **TC-010.3 (Zero Progress)**: `writeSync` คืน 0 ไบต์<br>- **TC-010.4 (`wx` Cleaned Up)**: `writeSync` Throw `ENOSPC` และ `unlinkSync` สำเร็จ<br>- **TC-010.5 (`V4-02b` Cleanup Failed)**: `writeSync` Throw `ENOSPC` และ `unlinkSync` Throw `EACCES`<br>- **TC-010.6 (`wx` Race Protection)**: `openSync` โยน `EEXIST`<br>- **TC-010.7 (`V4-02c` Rename Fail Temp Cleaned)**: `renameSync` โยน `EACCES` และลบ Temp สำเร็จ<br>- **TC-010.8 (`V4-02c` Rename Fail Temp Residual)**: `renameSync` โยน `EACCES` และลบ Temp โยน `EACCES`<br>- **TC-010.9 (Post-Commit DirSync Fail)**: `syncDirectorySync` โยน `EIO` หลังจุด Commit | - **TC-010.1**: `exit 2` ไม่เปิดเขียนไฟล์<br>- **TC-010.2 (`V4-02a`)**: **เขียนจนครบทุกไบต์สำเร็จด้วย Write-All Loop (`status: CREATED`, เนื้อหาครบ)**<br>- **TC-010.3**: Throw `WRITE_ABORTED_CLEANED_UP` (`targetModified: false`)<br>- **TC-010.4**: Throw `WRITE_ABORTED_CLEANED_UP` (`targetModified: false`, ลบไฟล์ตกค้าง)<br>- **TC-010.5 (`V4-02b`)**: **Throw `WRITE_ABORTED_CLEANUP_FAILED` (`targetModified: true`, รายงานความจริงว่ามีไฟล์ตกค้าง)**<br>- **TC-010.6**: Throw `EEXIST_RACE_DETECTED` (`targetModified: false`, ไม่แตะไฟล์คนอื่น)<br>- **TC-010.7 (`V4-02c`)**: **Throw `TARGET_UNCHANGED_BEFORE_COMMIT` (`targetModified: false`, `tempLeft: 0`)**<br>- **TC-010.8 (`V4-02c`)**: **Throw `RENAME_FAILED_TEMP_RESIDUAL` (`targetModified: false`, รายงานพาธ Temp ตกค้าง)**<br>- **TC-010.9**: **Throw `POST_COMMIT_DIR_SYNC_FAILED` (`targetModified: true`, รายงานว่าไฟล์เปลี่ยนแล้วแต่ dir sync พัง)** |
| **TC-011** | AC-001, AC-002 | Templates, ADR & Context Budget | ตรวจ `INTENT.md`, `SPEC.md`, ตาราง Parallel Worktrees, `repin:source-matrix`, `adr:audit`, `validate:context-budget` | ทุกคำสั่งผ่าน `exit 0` อยู่ในเพดานงบประมาณ Context ทุก Tier |
| **TC-012** | AC-002 | Slice-1 Review Gate & Security Gate Check (`RR-04`) | รัน `validate:review-gate` บน Slice 1 และตรวจบันทึกรีวิวจาก `security-reviewer` + `code-reviewer` อิสระ | `validate:review-gate` คืน `PASS` พร้อม `docs/records/qa/*-slice-1-contracts-code-review.md` |
| **TC-013** | AC-003 | Deliberate 9-File Review Policy & Nested Template Check (`DW-01`) | รัน `validate-skill-parity.mjs` (`SKILL.md`) + `cmp -s` เทียบไบต์ของไฟล์ย่อย `templates/CODE_REVIEW_FINDINGS.md` ทั้ง 3 ต้นไม้ + Reviewer ตรวจครบทั้ง 9 ไฟล์ | `SKILL.md` ตรงกัน (`0 drifted`), ไฟล์แม่แบบย่อยทั้ง 3 ต้นไม้ตรงกันทุกไบต์, และทั้ง 9 ไฟล์มีกติกาตรงกันครบ |
| **TC-014** | AC-004 | Slice-3 Review Gate & QA Static Logic Review | รัน `validate:review-gate` บน Slice 3 พร้อมทำ QA `static-logic-review` บนกิ่งตัดสินใจของ `validate-metrics.mjs` | `validate:review-gate` คืน `PASS` พร้อม `docs/records/qa/*-slice-3-metrics-code-review.md` |
| **TC-015** | AC-005, AC-006 | Stacked PR Readiness, State Projection & Full Regression (`DW-02`–`DW-05`) | รัน `validate:pr-readiness` (`advances-only` บน `PR-1`–`PR-3`, `closes` บน `PR-4`), `validate:status-projection`, `validate:risk-register`, `validate:clearable-refs`, `validate:root-doc-links`, `validate:context-compatibility`, `validate:ci-parity`, `validate:project-state`, และ `npm test` | ทุกคำสั่ง `exit 0` ผ่านครบถ้วน |

---

## 7. ชุดคำสั่งตรวจสอบซ้ำที่พิสูจน์แล้วสำหรับ `V4-01a/b` และ `V4-02a/b/c` (Addressable Reproducible Verification Harness)

ชุดคำสั่ง Node.js ด้านล่างนี้คือตัวจำลองและชุดทดสอบของ Revision v5 ที่ผ่านการรันจริงบน Repository ปัจจุบัน (ยืนยันผลครบทั้ง Table D1 และ Table D2):

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

function validateHistoryV5(policy, state, displayPath) {
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
    
    // V4-01a & V4-01b Sunset Rule & Cutoff Boundary
    if (t.historical_only === true) {
      if (policy.sunset_effective_at && ev.at && ev.at > policy.sunset_effective_at) {
        errors.push(`${displayPath}: ${eventKey(ev)} at history[${idx}] occurred at ${ev.at}, after sunset_effective_at (${policy.sunset_effective_at}); fast-track is disabled for new entries`);
      } else {
        const isHoldState = HOLD_STATES.has(state.state);
        const isCompleted = state.state === 'release';
        if (!remediated && !isHoldState && !isCompleted) {
          errors.push(`${displayPath}: ${eventKey(ev)} at history[${idx}] is marked historical_only (fast-track disabled for active/new work items; route through designing -> planning before state "${state.state}")`);
        }
      }
    }
  }
  return errors;
}

function writeDraftSafeV5(targetPath, content, { force = false, io = createStateIo() } = {}) {
  const ops = io.fsOps;
  const resolved = path.resolve(targetPath);
  const dir = path.dirname(resolved);
  if (!ops.existsSync(dir)) ops.mkdirSync(dir, { recursive: true });
  const buf = Buffer.from(content, 'utf8');

  if (!force) {
    let fd; let createdByUs = false;
    try {
      fd = ops.openSync(resolved, 'wx', 0o600); createdByUs = true;
      // V4-02a: Write-All Loop
      let offset = 0;
      while (offset < buf.length) {
        const written = ops.writeSync(fd, buf, offset, buf.length - offset);
        if (!Number.isInteger(written) || written <= 0) throw Object.assign(new Error('no progress'), { code: 'ATOMIC_WRITE_NO_PROGRESS' });
        offset += written;
      }
      ops.fsyncSync(fd);
    } catch (err) {
      if (fd !== undefined) { try { ops.closeSync(fd); } catch {} fd = undefined; }
      if (createdByUs) {
        // V4-02b: Honest Cleanup Error Handling
        try { ops.unlinkSync(resolved); } catch (unlinkErr) {
          throw Object.assign(new Error('write fail, cleanup fail'), { code: 'WRITE_ABORTED_CLEANUP_FAILED', targetModified: true, primaryError: err, cleanupError: unlinkErr });
        }
        throw Object.assign(new Error('write fail, cleaned up'), { code: 'WRITE_ABORTED_CLEANED_UP', targetModified: false, cause: err });
      }
      throw Object.assign(new Error('race'), { code: err.code === 'EEXIST' ? 'EEXIST_RACE_DETECTED' : 'OPEN_FAILED', targetModified: false, cause: err });
    } finally { if (fd !== undefined) { try { ops.closeSync(fd); } catch {} } }
    try { syncDirectorySync(dir, io); } catch (dirErr) { throw Object.assign(new Error('dirsync fail'), { code: 'POST_COMMIT_DIR_SYNC_FAILED', targetModified: true, cause: dirErr }); }
    return { status: 'CREATED', targetModified: true };
  }

  // Force path: stage tmp, fsync, rename, dirsync
  const tmp = path.join(dir, `.tmp-${path.basename(resolved)}-${process.pid}-${Date.now()}`);
  let fd; let createdTmp = false;
  try {
    fd = ops.openSync(tmp, 'wx', 0o600); createdTmp = true;
    let offset = 0;
    while (offset < buf.length) {
      const written = ops.writeSync(fd, buf, offset, buf.length - offset);
      if (!Number.isInteger(written) || written <= 0) throw Object.assign(new Error('no progress'), { code: 'ATOMIC_WRITE_NO_PROGRESS' });
      offset += written;
    }
    ops.fsyncSync(fd);
  } catch (err) {
    if (fd !== undefined) { try { ops.closeSync(fd); } catch {} fd = undefined; }
    if (createdTmp) { try { ops.unlinkSync(tmp); } catch {} }
    throw Object.assign(new Error('stage fail'), { code: 'TARGET_UNCHANGED_BEFORE_COMMIT', targetModified: false, cause: err });
  } finally { if (fd !== undefined) { try { ops.closeSync(fd); } catch {} } }

  // V4-02c: Rename Catch with Temp Cleanup
  try {
    ops.renameSync(tmp, resolved);
  } catch (renameErr) {
    if (createdTmp) {
      try { ops.unlinkSync(tmp); } catch (unlinkErr) {
        throw Object.assign(new Error('rename fail, temp cleanup fail'), { code: 'RENAME_FAILED_TEMP_RESIDUAL', targetModified: false, tempLeft: [tmp], primaryError: renameErr, cleanupError: unlinkErr });
      }
    }
    throw Object.assign(new Error('rename fail, temp cleaned'), { code: 'TARGET_UNCHANGED_BEFORE_COMMIT', targetModified: false, cause: renameErr });
  }

  try { syncDirectorySync(dir, io); } catch (dirErr) { throw Object.assign(new Error('dirsync fail'), { code: 'POST_COMMIT_DIR_SYNC_FAILED', targetModified: true, cause: dirErr }); }
  return { status: 'REPLACED', targetModified: true };
}

const policy = YAML.parse(fs.readFileSync('docs/contracts/new-feature-workflow.yaml', 'utf8'));
policy.sunset_effective_at = '2026-11-05T12:00:00Z';
policy.transitions.push(
  { from: 'discovery', to: 'planning', requires: ['user_stories'], when: { risk_level: 'low' }, historical_only: true },
  { from: 'planning', to: 'implementing', requires: ['implementation_plan'], when: { risk_level: 'low' }, historical_only: true }
);

const stateHold = {
  state: 'designing',
  history: [
    { from: 'intake', to: 'discovery', at: '2026-11-05T00:00:00Z' },
    { from: 'discovery', to: 'planning', at: '2026-11-05T00:01:00Z' },
    { from: 'planning', to: 'implementing', at: '2026-11-05T00:02:00Z' },
    { from: 'implementing', to: 'verifying', at: '2026-11-05T00:03:00Z' },
    { from: 'verifying', to: 'rework', at: '2026-11-05T00:04:00Z' },
    { from: 'rework', to: 'designing', at: '2026-11-05T00:05:00Z' }
  ],
  evidence: { user_stories: 'u', implementation_plan: 'p' }
};
const errHold = validateHistoryV5(policy, stateHold, 'sunset-hold');
assert.deepEqual(errHold, []); // V4-01a PASSED: hold state in designing validates cleanly!

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-v5-'));
try {
  // V4-02a: Short write loop
  const shortTarget = path.join(tmp, 'short.md');
  const shortOps = new Proxy(fs, { get(o, k) { if (k === 'writeSync') return (fd, b, off) => fs.writeSync(fd, b, off, 1); const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; } });
  writeDraftSafeV5(shortTarget, 'COMPLETE', { io: createStateIo({ fsOps: shortOps }) });
  assert.equal(fs.readFileSync(shortTarget, 'utf8'), 'COMPLETE'); // V4-02a PASSED!

  // V4-02b: Cleanup failure honest reporting
  const uncleanTarget = path.join(tmp, 'unclean.md');
  const uncleanOps = new Proxy(fs, { get(o, k) { if (k === 'writeSync') return (fd, b) => { fs.writeSync(fd, b, 0, 1); throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); }; if (k === 'unlinkSync') return () => { throw Object.assign(new Error('EACCES'), { code: 'EACCES' }); }; const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; } });
  let uncleanErr; try { writeDraftSafeV5(uncleanTarget, 'CONTENT', { io: createStateIo({ fsOps: uncleanOps }) }); } catch (e) { uncleanErr = e; }
  assert.equal(uncleanErr.code, 'WRITE_ABORTED_CLEANUP_FAILED'); // V4-02b PASSED!
  assert.equal(uncleanErr.targetModified, true);

  // V4-02c: Rename failure temp cleaned
  const renameTarget = path.join(tmp, 'rename.md'); fs.writeFileSync(renameTarget, 'OLD');
  const renameFailOps = new Proxy(fs, { get(o, k) { if (k === 'renameSync') return () => { throw Object.assign(new Error('rename fail'), { code: 'EACCES' }); }; const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; } });
  let renameErr; try { writeDraftSafeV5(renameTarget, 'NEW', { force: true, io: createStateIo({ fsOps: renameFailOps }) }); } catch (e) { renameErr = e; }
  assert.equal(renameErr.code, 'TARGET_UNCHANGED_BEFORE_COMMIT'); // V4-02c PASSED!
  assert.equal(fs.readdirSync(tmp).filter(f => f.startsWith('.tmp-')).length, 0);

  console.log('REPRODUCIBLE HARNESS PASS: V4-01a, V4-02a, V4-02b, V4-02c verified exit 0');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
NODE
```

---

## 8. จุดขออนุมัติจากผู้บริหาร / Human Maintainer ก่อนเริ่มพัฒนา (Required Policy Approvals)

เอกสารรุ่น v5 ได้แก้ไขและตอบโจทย์ข้อสังเกตเชิงเทคนิคทั้งหมดของ `V4-01a/b` และ `V4-02a/b/c` ครบถ้วนแล้ว จึงขอรับการตัดสินใจจาก Human Maintainer ใน **4 ประเด็นนโยบาย** ก่อนติดป้าย `status:spec-ready`:

1. **Slice 1 (`PR-1`)**: อนุมัติการเปิดทางด่วน `INTENT.md` / `SPEC.md` (`discovery -> planning -> implementing` เฉพาะ `risk_level: low` ไม่รวม Security/API/Data ใดๆ แม้เป็น Additive API), การเพิ่ม Optional `classification_snapshot` ใน `new-feature-state.schema.json` คู่กับกฎ Mandatory Design Remediation, และการรองรับ `historical_only: true` Sunset Mode ที่รองรับทั้ง In-Flight Recovery Hold States (`V4-01a`) และ `sunset_effective_at` New-Entry Boundary (`V4-01b`) หรือไม่
2. **Slice 2 (`PR-2`)**: อนุมัติกติกา 3-Pass Review และค่าอ้างอิงเพดาน `5 Nits` ต่อรอบรีวิวใน 9 ไฟล์ของ Issue #303 (`docs/` + สำเนาสกิล `code-review-gate` ทั้ง 3 ต้นไม้ โดยไม่บังคับ All-Library Mirror ทั้งคลังตาม `DW-01`) หรือไม่
3. **Slice 3 (`PR-3`)**: อนุมัติสัญญาการวัดผล `--source structured` (`dispatch_ledger_expiry_rate >= 10%` บน `closedReceipts` และ `verified_rework_rate >= 15%` บน `evaluatedItems`, `min-samples = 5`), การแยกขาดจาก `--source legacy-task-log` (`INCOMPATIBLE_SOURCE_FLAGS` `exit 2` ตาม `METRICS.md:45`), และสัญญาจัดการความล้มเหลวระดับ I/O 3 ระยะฉบับสมบูรณ์ (`V4-02a/b/c`) หรือไม่
4. **Slice 4 (`PR-4`)**: อนุมัติการส่งมอบแบบ Incremental Stacked PRs (`PR-1` → `PR-2` → `PR-3` → `PR-4`) และการอัปเดต `ROADMAP-SDLC-FRAMEWORK.md` ปิดท้ายงานหรือไม่
