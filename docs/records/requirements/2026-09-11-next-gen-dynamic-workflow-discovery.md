# Requirement Discovery: Next-Gen Autonomous Dynamic Workflow

## 1. Request Summary

| Item | Detail |
|---|---|
| Change Type | Framework / Meta Change |
| Business Goal | ยกระดับ AI Agent Dynamic Workflow ให้ลดปัญหา Context Window บวม, ขจัดปัญหา Git Conflict จากการรันขนาน, รองรับการหยุดพักและทำต่อข้ามเซสชัน (Asynchronous Resumption), และเพิ่มความแม่นยำของ Safety Gates โดยอ้างอิงบทเรียนจริงใน Repo และ Best Practices สากล |
| Target Users / Actors | Software Engineers, AI Agents (Orchestrator, Dev, QA, SA ฯลฯ), และ Human Maintainer / Boss |
| Business Criticality | High |
| Code Change Required | Yes |
| Security/Data Sensitivity | Yes |

---

## 2. Confirmed Facts

| # | Fact | Source / Reference |
|---|---|---|
| 1 | **Context Ceiling Pressure:** เอกสารอ่านบังคับ 8 ไฟล์ ปัจจุบันใช้ไป **26,196 / 30,000 Tokens (87.3%)** เหลือพื้นที่ว่างเพียง ~3,800 tokens สำหรับรับคำสั่งงานและอ่านโค้ด | `scripts/validate-context-budget.mjs` (หลัง Issue #237) |
| 2 | **Root Status Merge Conflict:** การแก้ไข `PROJECT_STATUS.md` ที่หน้า Root ใน Parallel Worktrees ทำให้เกิด Git Merge Conflict 100% เมื่อรวมสาขา | Lessons Learned ใน Issue #106/#108, PR #107/#109 |
| 3 | **Fragile Text Regex Gates:** การใช้ Regular Expression ตรวจจับข้อความ Prose ใน PR Template/Body เกิด False Negative/False Positive ซ้ำซากเมื่อเจอ Quoted Strings, Backticks หรือ Argument Flags | Issue #111, #246, #249 (`scripts/validate-pr-readiness.mjs`) |
| 4 | **In-Turn Wait Limitation:** Parent Orchestrator ถูกบังคับให้รอ Terminal Receipt ของ Subagent ภายใน "Chat Turn เดียวกันแบบ Synchronous" หากงานยาวหรือ Timeout จะหลุดเป็นสถานะ Blocked ทันที ไม่สามารถ Resume ข้ามเซสชันได้ | `docs/workflow/dynamic-routing.md` L48-L53, Issue #35, #178 |
| 5 | **Task-State Prototype Exists:** มีการเริ่มทดลองใช้ Sharded Structured State `task-state.json` แล้วในบาง Work Item | `docs/records/work-items/issue-249/task-state.json` |

---

## 3. Assumptions

| # | Assumption | Impact if Wrong | Validation Needed |
|---|---|---|---|
| 1 | การใช้ Deterministic YAML/JSON Parser ใน Local Hooks และ CI จะขจัดปัญหา Regex Escaped Characters ได้ 100% | หากไม่จริง ตัว Gate จะยังคงเปราะบาง | ทดสอบกับ Node.js built-in / YAML library ใน `scripts/work-item-readiness.mjs` |
| 2 | การย่อส่วนเอกสารอ่านเริ่มต้นให้เหลือ $\le$ 3,500 tokens ยังคงรักษากฎความปลอดภัยและ Stop Conditions สำคัญครบถ้วน | หากตัดทอนผิด กฎความปลอดภัยอาจถูกละเลย | Behavioral Equivalence Testing ระหว่าง Full Context vs Progressive Context |
| 3 | การรัน Subagent แยกแต่ละ Git Worktree บนเครื่อง Local สามารถควบคุมพื้นที่ได้ด้วยสคริปต์ Housekeeping ที่มีอยู่ | พื้นที่ Hard Disk อาจบวม | ตรวจสอบด้วย `scripts/housekeeping-worktrees.mjs` |

---

## 4. Open Questions

| # | Question | Owner | Blocks Progress? |
|---|---|---|---|
| 1 | การ Compile สถานะภาพรวมควรเกิดขึ้นใน CI เมื่อรวมร่างเข้า `main` หรือสร้างอัตโนมัติผ่าน Local Post-commit Hook? | SA / Boss | No (สามารถออกแบบใน SDD เป็นสองระดับได้) |
| 2 | กลไกการกระตุ้น (Resume Trigger) สำหรับงานที่ติดสถานะ `blocked` หรือรอคนอนุมัติ ควรกำหนดผ่านคำสั่ง CLI ใดเป็นมาตรฐาน? | SA / Dev | No (กำหนดใน SDD & Implementation Plan) |
| 3 | ช่วงเวลา Transition ระหว่าง PR Body แบบเดิมและแบบ Frontmatter ใหม่ ควรมี Grace Period ให้ Fallback หรือไม่? | SA / QA | No (กำหนดใน Migration Strategy ของ SDD) |

---

## 5. Scope

### In Scope
- **Pillar 1 (Worktree Sharded Status):** แยกไฟล์สถานะงานของแต่ละ Issue ให้เป็นอิสระต่อกัน เพื่อให้การทำงานแบบ Parallel Branches มี Git Merge Conflict เป็น 0% พร้อมระบบรวบรวมสถานะภาพรวมอัตโนมัติ
- **Pillar 2 (Progressive Context Loading):** กำหนดข้อกำหนดให้การบูตเริ่มต้นอ่านเฉพาะกฎความปลอดภัยพื้นฐาน ($\le 3,500$ tokens) และดึงข้อมูลบทบาทและสกิลเฉพาะเมื่อถูกเรียกใช้งานจริง (On-Demand)
- **Pillar 3 (Checkpointed Asynchronous State Machine):** บันทึกสถานะงานแบบ Checkpoint ลง Disk ในทุก State Transition เพื่อรองรับการพักรอบ (Pause) และทำต่อข้ามเซสชัน (Resume) โดยไม่ต้องผูกติดกับ Synchronous Chat Turn เดียว
- **Pillar 4 (Frontmatter-First Safety Gates):** กำหนดให้การตรวจสอบสถานะและ Lifecycle ของ PR ดึงข้อมูลผ่าน Structured YAML Frontmatter ที่หัวไฟล์แทนการสแกน Regex จากเนื้อความ Prose

### Out of Scope
- การแก้ไขกฎ Lifecycle Retry Budget ของ Bug Fix (คงเดิมที่ 2 ครั้ง)
- การลดหย่อนหรือยกเลิก Human Approval Gates (ข้อกำหนดความปลอดภัยยังคงเข้มงวด 100%)
- การสร้าง Cloud Infrastructure หรือ External Database (ยังคงยึดหลัก Local-first, File-based, และ Git-native)

---

## 6. User Stories

| Story ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| US-001 | Software Engineer / Agent | บูตเซสชันด้วย Context ก้อนเล็ก ($\le 3,500$ tokens) | ตัว Agent มีพื้นที่ Context Window ว่างสูงสุดสำหรับวิเคราะห์โค้ด โดยไม่เกิดอาการลืมคำสั่งในงานระยะยาว | High |
| US-002 | Team Maintainer | แยกไฟล์สถานะงานของแต่ละ Issue ออกจากกันเป็นอิสระ | สามารถรัน Agent ทำงานขนานกันหลาย Worktrees ได้โดยไม่มีปัญหา Git Merge Conflict เมื่อรวมโค้ด | High |
| US-003 | Workflow Orchestrator | บันทึก Checkpoint สถานะงานลง Disk ในทุกการเปลี่ยนสถานะ | งานสามารถหยุดรอการตัดสินใจของมนุษย์ หรือส่งต่องานข้ามเซสชันได้อย่างปลอดภัยโดยไม่ต้องแช่แชทค้างไว้จน Timeout | High |
| US-004 | Quality / Security Reviewer | ตรวจสอบข้อมูล Lifecycle และ Evidence ผ่าน Structured Frontmatter | ตัว Gate ใน CI และ Local Hook ทำงานได้อย่างแม่นยำ 100% ไม่ถูกหลอกด้วยการจัดหน้า Markdown หรือ Quoted Strings | High |

---

## 7. Acceptance Criteria

| AC ID | Related Story | Given | When | Then | Testable? |
|---|---|---|---|---|---|
| AC-001 | US-001 | มีชุดเอกสาร Core Bootloader พื้นฐาน | ตรวจสอบขนาด Token ของไฟล์อ่านบังคับเริ่มต้น | ปริมาตร Token รวมต้องมีขนาด $\le 3,500$ tokens | Yes |
| AC-002 | US-001 | มีคำสั่งดึงบริบทบทบาทเฉพาะงาน | รันคำสั่งดึงบริบทของบทบาทใดบทบาทหนึ่ง (เช่น `sa-agent` หรือ `developer-agent`) | ได้รับเฉพาะข้อกำหนดของบทบาทนั้น โดยมีขนาด $\le 1,500$ tokens | Yes |
| AC-003 | US-001 | มีคำสั่งดึงบริบทบทบาทเฉพาะงาน | รันคำสั่งดึงบริบทด้วยชื่อบทบาทที่ไม่มีอยู่จริง (Invalid Role) | คำสั่งต้อง Fail-Closed (Exit Code $\ne 0$) พร้อมแสดง Error แจ้งเตือนชัดเจน | Yes |
| AC-004 | US-002 | Worktree A ทำงาน Issue #301 และ Worktree B ทำงาน Issue #302 | ทั้งคู่บันทึกสถานะงานของตนเองและ Merge สู่กิ่ง `main` ตามลำดับ | ไม่มี Git Merge Conflict ในไฟล์สถานะ และสถานะของทั้งสอง Issue ถูกรวบรวมเข้ามุมมองภาพรวมอย่างถูกต้อง | Yes |
| AC-005 | US-003 | มีไฟล์ State Machine ประจำ Work Item | Agent ทำการบันทึกการเปลี่ยนสถานะที่ถูกต้องตามกฎ (เช่น `implementing` $\to$ `verifying`) | ข้อมูลถูกบันทึกลงไฟล์พร้อม Timestamp, Actor, และ Evidence References ครบถ้วน | Yes |
| AC-006 | US-003 | มีไฟล์ State Machine ประจำ Work Item | มีการพยายามบันทึกสถานะที่ผิดกฎ (เช่น ข้ามจาก `intake` ไป `verifying` โดยตรง) หรือขาด Evidence ที่จำเป็น | ระบบต้องปฏิเสธการ Transition (Reject) และแจ้งข้อผิดพลาดตาม Schema | Yes |
| AC-007 | US-004 | PR Body มี YAML Frontmatter ระบุ `work_item` และ `governing_workflow` ถูกต้อง | รันตัวตรวจสอบความพร้อมของ PR (PR Readiness Gate) | ตัวตรวจสอบอ่านค่าจาก Frontmatter ได้ถูกต้อง 100% แม้เนื้อหาด้านล่างจะมี Markdown Code Block หรือข้อความซับซ้อน | Yes |
| AC-008 | US-004 | PR Body มี YAML Frontmatter ที่ไวยากรณ์ผิด (Malformed Syntax) หรือขาดฟิลด์บังคับ | รันตัวตรวจสอบความพร้อมของ PR (PR Readiness Gate) | ตัวตรวจสอบต้องปฏิเสธ PR นั้นทันที (Fail-Closed) พร้อมแสดงรายงานข้อผิดพลาดเชิงโครงสร้าง | Yes |

---

## 8. Business Rules

| Rule ID | Rule | Source | Impacted Area |
|---|---|---|---|
| BR-001 | **No Root Status Mutation on Feature Branch:** Feature Branch มีสิทธิ์แก้ไขเฉพาะไฟล์สถานะ Shard ประจำ Issue ของตนเองเท่านั้น ห้ามแก้ไขไฟล์สถานะภาพรวมที่ Root โดยตรง | Concurrency Policy | Git Workflow, Hooks |
| BR-002 | **Preserve All Human Gates:** การเปลี่ยนผ่านสถานะแบบ Asynchronous เมื่อถึงจุดอนุมัติของมนุษย์ ต้องตั้งสถานะเป็น `blocked` พร้อมระบุ `stop_reason: human_review_required` เสมอ ห้ามข้ามขั้นตอน | `AGENT_OPERATING_MODEL.md` | State Machine Schema |
| BR-003 | **Zero-Boot Skill Content:** เนื้อหาคู่มือสกิล 31 สกิลหลักในระบบ จะต้องไม่ถูกโหลดเข้า Context ตั้งแต่เริ่มบูต แต่จะถูกเรียกอ่านผ่านเครื่องมือเฉพาะเมื่อเกิด Trigger เท่านั้น | Context Budget Policy | Tooling / Skills Layer |
| BR-004 | **Deterministic Schema Validation:** ทุกไฟล์สถานะและ Frontmatter ต้องถูกตรวจสอบความถูกต้องผ่าน JSON Schema หรือ Type Contract ก่อนจะถือว่ามีผลสมบูรณ์ | Engineering Discipline | CI Validators, Local Hooks |

---

## 9. Risk / Edge Case Notes

| Risk ID | Risk / Edge Case | Impact | Suggested Coverage |
|---|---|---|---|
| R-001 | **Context Degradation ใน Core Boot:** หากย่อเอกสารเริ่มต้นมากเกินไป AI อาจลืมกฎข้อห้ามสำคัญ | High | สร้าง Behavioral Equivalence Test เทียบการตัดสินใจของ Agent ระหว่าง Full vs Tier 1 |
| R-002 | **Mid-Write File Corruption:** กระบวนการเขียนไฟล์สถานะขัดข้องกลางคัน ทำให้ไฟล์ JSON/YAML เสียหาย | Medium | ออกแบบ Atomic File Write หรือใช้ CAS (Check-and-Set) ในระดับสถาปัตยกรรม |
| R-003 | **Orphan Status Shards:** กิ่งงานถูกยกเลิกหรือลบทิ้ง แต่ไฟล์สถานะยังค้างอยู่ | Medium | สร้างสคริปต์ Reconciliation ตรวจสอบกิ่งที่ Merge/Closed แล้ว และย้ายเข้าสู่หมวด Archive |
| R-004 | **Legacy PR Compatibility:** PR เก่าที่ยังไม่ได้ใส่ YAML Frontmatter อาจถูกบล็อกกะทันหัน | Low | ออกแบบ Graceful Error Message และ Migration Script ใน SDD |

---

## 10. Recommended Next Step

| Next Agent / Skill | Reason | Required Input |
|---|---|---|
| **SA Agent (`sa-architecture-design`)** | ดำเนินการออกแบบสถาปัตยกรรมทางเทคนิค (Software Design Document - SDD) โดยใช้เทมเพลต [`docs/templates/SDD.md`](file:///Users/maclab/WorkSpace/GitHub%20Code/AI-Agent-Workflow/docs/templates/SDD.md) เพื่อแปลงโจทย์และ AC ทั้งหมดให้เป็น Component Design, JSON Schema, API Contract และ Data Model | Requirement Discovery นี้ที่ได้รับการยอมรับ |
| **Developer Agent (`implementation-planning`)** | เมื่อ SDD ได้รับการอนุมัติ ให้จัดทำ Implementation Plan โดยใช้เทมเพลต [`docs/templates/IMPLEMENTATION_PLAN.md`](file:///Users/maclab/WorkSpace/GitHub%20Code/AI-Agent-Workflow/docs/templates/IMPLEMENTATION_PLAN.md) | Approved SDD |
| **QA Agent (`functional-test-design`)** | สร้าง Test Plan และ Acceptance Traceability Matrix โดยใช้เทมเพลต [`docs/templates/TEST_PLAN.md`](file:///Users/maclab/WorkSpace/GitHub%20Code/AI-Agent-Workflow/docs/templates/TEST_PLAN.md) และ [`docs/templates/AC_TRACEABILITY.md`](file:///Users/maclab/WorkSpace/GitHub%20Code/AI-Agent-Workflow/docs/templates/AC_TRACEABILITY.md) | AC-001 ถึง AC-008 จาก Requirement Discovery |

---

## 11. Illustrative UX / Interaction Sketch

> Illustrative — not a UI spec. Stops at what appears and in what order; no layout, component, or visual detail.

### Asynchronous Checkpointed SDLC Flow

```text
[Human / GitHub Issue]
        │
        ▼ (Trigger: Dispatch Work Item)
[Orchestrator Agent]
   ├─ Loads Tier 1 Core Boot (<= 3,500 tokens)
   ├─ Evaluates Issue & Selects Route
   └─ Dispatches to SA Agent with Checkpoint State: "designing"
        │
        ▼ (Session Ends cleanly; Task Checkpointed on Disk)
[SA Agent Session]
   ├─ Loads SA Role Context on Demand (<= 1,500 tokens)
   ├─ Authors SDD.md
   └─ Checkpoints State: "human-approval-pending" (State: blocked)
        │
        ▼ (Human Maintainer Reviews & Approves)
[Developer Agent Session]
   ├─ Triggered by Approval
   ├─ Loads Dev Role Context on Demand (<= 1,500 tokens)
   ├─ Implements Code via Worktree Isolation
   └─ Checkpoints State: "verifying"
        │
        ▼ (QA Agent Session)
   ├─ Executes Acceptance Test Suite (AC-001 to AC-008)
   └─ Emits Terminal QA Pass Evidence
```
