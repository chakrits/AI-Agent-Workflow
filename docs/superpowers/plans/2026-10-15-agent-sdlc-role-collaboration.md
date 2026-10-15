# Role-owned Agent SDLC Collaboration — Track B Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for the assigned owner role; choose `superpowers:subagent-driven-development` only when scoped specialist work and execution method call for it. Checkboxes track steps; no automatic per-task spawning is required by this plan.

**Goal:** ให้ Agent SDLC ใช้ role ownership, skills, targeted specialists และ shared business baseline โดยคง independent QA และ human decisions

**Architecture:** ปรับ canonical guidance และทดลองผ่าน artifacts/records/context tools เดิม ไม่สร้าง universal executor, role registry ใหม่ หรือ runtime/KMS server ใน repo นี้

**Tech Stack:** Existing Markdown role/workflow packs, context-pack/v1, Git records, native agent hosts และ application test tools ใน pilot ที่เลือกภายหลัง

**Spec:** [Design v2](../specs/2026-10-15-agent-sdlc-role-collaboration-design.md) · [Roadmap](../../../ROADMAP-SDLC-FRAMEWORK.md) · [Issue #298](https://github.com/chakrits/AI-Agent-Workflow/issues/298)

Revision 2 — 15 ตุลาคม 2026. ผู้ใช้อนุมัติทิศทาง; written-plan details และ execution ยังรอ review

## Global Constraints

- Canonical roles 11 บทบาทและ role boundaries เดิม
- Integration/UAT/Knowledge specialties อยู่ใต้ role เดิม; ไม่เพิ่ม canonical role/process ใหม่
- สี่ modes: owner uses skills, specialist consultation, specialist delivery, independent verification
- Skill fallback ไม่ข้าม permissions/approval หรือทำให้งานที่ต้อง specialist judgment ผ่านเอง
- Independent review ต้องแยกจากผู้ทำ; persona switching ไม่นับ
- `context-pack/v1` และ authority semantics เดิมไม่เปลี่ยน
- Actual spawn ใช้ packet/receipt/in-turn await ตาม host contract; ไม่อ้าง automatic cross-turn resume

## Review Focus

1. Owner สวมหลาย persona แล้วอ้าง independent QA — oracle ใน B1/B3
2. Specialist unavailable แต่ task เดินต่อข้าม gate — fallback oracle ใน B1/B3
3. BA/SA/QA ใช้ rule คนละ revision หรือไม่ทราบ source — context cases ใน B2/B3
4. Draft/lesson ถูกเลื่อนเป็น approved fact หรือ restricted context หลุด — source-policy cases ใน B2/B3
5. ลด handoff จนไม่มี accountable owner/output acceptance — delivery oracle ใน B1/B3

## 1. File responsibilities และ contract boundaries

| Area | Exact paths / responsibility |
|---|---|
| Role selection | `docs/workflow/dynamic-routing.md`, `docs/workflow/role-definitions.md`: four modes + owner/trigger rules |
| Operating boundaries | `docs/operating-model/AGENT_OPERATING_MODEL.md`, `AGENTS.md`: role ownership และอนุญาต skill use ภายในอำนาจ ไม่มี single-agent-first rule |
| Real handoff | `docs/workflow/task-execution-mode.md`, `docs/workflow/handoff-contract.md`, `docs/workflow/dispatch-packet-contract.md`: clarify applicability; ไม่ลด actual-dispatch evidence |
| Context | `docs/contracts/schemas/context-pack-v1.schema.json`, `scripts/inject-role-context.mjs`: reuse unchanged; ไม่มี schema field mutation ใน scope นี้ |
| Knowledge pilot | Create `docs/records/misc/issue-298-knowledge-baseline.md`: scoped source register; ไม่เป็น global mandatory artifact |
| Scenario oracle | Create `docs/records/qa/issue-298-collaboration-evaluation.md`: cases/rubric/observed results; ใช้ not-run ก่อน execution |
| Native adapters | `.claude/agents/`, `.agent/` และ `.codex/orchestrator-supervision.md`: แตะเฉพาะ core-role adapters ที่ต้องตาม canonical change ตาม parity rules; optional skill libraries ไม่ต้อง mirror |

หาก edits แตะ SHA-pinned core source ให้ repin/update budget ตามกติกาปัจจุบันอย่างจำกัด ห้ามใช้แผนนี้ waive existing integrity checks การเปลี่ยน source hash ไม่ใช่การเพิ่ม skill inventory gate

## Task B1: ระบุ role ownership และ collaboration modes

**Files:** canonical role/routing/operating/handoff sources ด้านบน; modify เฉพาะ owner of each rule แล้วใช้ pointers ไม่คัดข้อความซ้ำทุกไฟล์

**Consumes:** approved design v2. **Produces:** decision table และ existing packet fields ที่ระบุ role/scope/output ได้โดยไม่เพิ่ม mandatory dispatch schema

- [ ] บันทึก golden oracle ก่อนแก้ guidance: simple BA refinement → BA+skills; SA integration question → SA consultation; bounded DB deliverable → Data delivery; state/auth change → independent verifier
- [ ] Dry-run canonical guidance ปัจจุบันกับ cases และบันทึก ambiguous/conflicting rules ที่ต้องแก้; ไม่สร้าง automated tests ที่แค่ตรวจคำใหม่อยู่ใน Markdown
- [ ] ปรับ rule owner ให้ระบุ accountable task role, skill use ภายในขอบเขต และ specialist trigger; คง Orchestrator coordination responsibility
- [ ] Clarify ว่า explicit role transition ใน session เดิมทำได้เฉพาะเมื่อไม่ชน authority/independence; actual child dispatch ใช้ existing contract; no child → ไม่มี fabricated receipt
- [ ] ให้ reviewer ตรวจ cases unavailable/conflicting owners/self-approval และตรวจ core adapter/context compatibility ตาม files ที่เปลี่ยน
- [ ] Commit `docs: clarify role-owned specialist collaboration`

**Expected outcome:** ทั้งสี่ modes ใช้ได้จริงตาม boundaries; ไม่มี role ถูกลบหรือ universal executor default งานเอกสารนี้ไม่มี product-code behavior change จึง TDD N/A ใช้ scenario/review evidence; ถ้าพบว่าต้องเปลี่ยน executable routing ให้แตก task behavior-change พร้อม RED/GREEN ก่อนลงมือ

## Task B2: เตรียม shared business baseline แบบเล็ก

**Files:** create `docs/records/misc/issue-298-knowledge-baseline.md`; link จาก work item/pilot artifacts เดิม ไม่เพิ่มฐานข้อมูลหรือ mandatory form ทุก task

**Consumes:** business/process owner + pilot topic หรือ technical synthetic fixture ที่ติดป้ายชัด. **Produces:** source register ที่ BA/SA/Dev/QA ใช้อ้าง baseline เดียวกัน

- [ ] เลือก scope/owners ของ knowledge pilot; หากยังไม่มี domain owner ใช้ technical fixture เพื่อพิสูจน์ workflow composition และระบุว่า business fit ยัง blocked
- [ ] ระบุแต่ละ source: ID/type, owner, URI/path, revision/hash, status, scope/classification/access reference, effective interval, approval reference และ supersedes ถ้ามี
- [ ] แยก rule/glossary/catalog, episodic notes และ proposals; approved synthetic labels ไม่ถูกอ้างว่าเป็น approved business rules ขององค์กร
- [ ] ทำ role-specific selection record ที่ชี้ baseline เดียวกัน ใช้ context-pack/v1 เดิมสำหรับ core policy refs; business source register เป็น attachment แยก ไม่ปลอม authority field
- [ ] ตรวจ missing/conflict/stale/revoked sources: owner ต้อง route/stop dependent work; file metadata ไม่เท่ากับ live ACL enforcement
- [ ] Commit `docs: add scoped knowledge baseline for collaboration pilot`

**Expected outcome:** source-backed artifacts ใช้ revisions ตรงกันและไม่เลื่อน draft เป็น truth ข้อมูลที่ยังไม่อนุญาตส่ง model ไม่ถูกใส่ prompt; ถ้าต้องการ runtime retrieval/ACL/versioned context schema ใหม่ เปิด follow-up design แยก

## Task B3: ทดลองสี่ scenarios และ specialist evaluation

**Files:** `docs/records/qa/issue-298-collaboration-evaluation.md`; reuse actual issue/PR/evidence ของ pilot ไม่สร้าง code/test results จำลอง

**Consumes:** B1 rules + B2 baseline. **Produces:** observed role outputs/verdicts พร้อม scope/limits และ independent review evidence ตาม risk

- [ ] เขียน oracle ก่อน execution ตามตารางด้านล่าง; mark ทุก observed-result เป็น not-run
- [ ] เลือก execution method สำหรับ pilot กับเจ้าของโครงการ; spawn เฉพาะ specialist ที่กรณีนั้นต้องใช้จริง ไม่รันทุก role เพื่อให้ครบจำนวน
- [ ] Execute cases ใน authorized environment; บันทึก role/skill/source versions, artifacts, actual dispatch receipts ถ้ามี และเวลารอ/ทำงาน
- [ ] Reviewer ที่แยกจากผู้ทำใช้ rubric เดียวกันตรวจ source correctness, completeness, boundary/negative coverage และ scope discipline
- [ ] บันทึก fail/blocked/not-run และ route เจ้าของปัญหา; ไม่แก้ expected business outcome เพื่อทำให้ demo ผ่าน
- [ ] Commit `docs: record role-collaboration pilot evidence` เมื่อมีผลจริง; incomplete cases คง not-run/blocked

| Case | Mode / input | Measurable expected outcome |
|---|---|---|
| C1 | BA ใช้ skills; source glossary/rules ครบ | AC ทุกข้อมี expected outcome/source revision; ไม่ spawn เพราะเปลี่ยนหมวก; owner=BA |
| C2 | SA ขอ Integration consult เรื่อง duplicate request | specialist ชี้ contract/risk/test recommendation พร้อม source; ไม่มี code/scope change จาก consultation; SA รับผิดชอบ design |
| C3 | มอบ Data migration plan ให้ specialist; missing data rule variant | deliverable มี validation/recovery และ owner; missing rule → blocked พร้อม Data/business owner ไม่เดาความหมาย |
| C4 | QA/Security ตรวจ state/evidence change; seeded stale evidence/self-approval | seeded defect ถูกพบ; independent identity ตรวจได้; persona switch ไม่ผ่าน และ human gate ไม่ถูก bypass |

เพิ่ม context variants ใน C1–C4: conflicting revision, draft source, denied/revoked source และ specialist unavailable ทุก variant ระบุ expected stop/next owner; synthetic demonstration ไม่ถูกนับเป็น executed application SIT/UAT

## Task B4: สรุปผลและเตรียม connected-SDLC pilot

**Files:** existing work item/issue, evaluation record, roadmap; runtime follow-up brief ใช้ record เดียวถ้ามีผู้รับผิดชอบแล้ว

**Consumes:** B3 observed outputs; Track A CI measurements เป็นข้อมูลประกอบ ไม่ใช่ dependency ที่บังคับให้ delay B3

- [ ] สรุป accepted output quality, useful specialist findings, missed/false findings, human effort, handoff/wait/rework และ cost เมื่อมี usage telemetry
- [ ] เทียบ matched cases เมื่อมีข้อมูล ไม่บังคับทุกงานทำซ้ำ single/multi; ไม่มีข้อมูลให้แสดง unavailable ไม่สรุปว่าแบบใดชนะ
- [ ] เสนอ M4 pilot brief: application/repos/interfaces, business/system owners, runtime candidate, model/data policy, sandbox/test data และ unit/functional/contract/SIT/UAT/regression evidence ที่ต้องใช้
- [ ] ให้ project owner ตัดสินว่า pattern ใดใช้ต่อ/ต้องปรับ และอนุมัติ connected-runtime scope แยก; commit `docs: report collaboration outcomes and connected-pilot prerequisites`

## 2. Verification commands / evidence

Traceability: B1 พิสูจน์ AC-B1/B2 (ownership และ specialist modes), B2 พิสูจน์ AC-B4 (shared baseline), B3 พิสูจน์ AC-B3/B5 (independence และ quality evaluation), B4 ส่งต่อ full-SDLC/runtime prerequisites ตาม AC-B5 ทุกข้อยัง not implemented/not verified ในรอบปรับแผนนี้

```sh
# Run only when the corresponding canonical sources/adapters changed.
npm run validate:adapter-parity
npm run validate:context-budget
npm run validate:context-compatibility
npm run validate:contracts
git diff --check
```

ใช้ manual scenario rubric สำหรับ prose/role outcomes ไม่เพิ่ม wording/inventory tests เพียงเพื่อให้ CI รับรู้ทุกเอกสาร ถ้า core pins เปลี่ยนให้ใช้ existing repin procedure หลัง review และตรวจไม่มี unrelated fields เปลี่ยน คำสั่งนี้เป็นแผน ยังไม่ได้รันเป็นหลักฐาน implementation

## 3. Risks / rollback / handoff

Rollback B1 guidance แยกจาก records; ไม่ลบ approval/decision/evaluation history หาก source ถูก revoke ให้หยุดใช้และ invalidate dependent artifacts ไม่ restore restricted content เข้า prompt

Knowledge metadata/file-backed pilot ไม่ใช่ production KMS; live ACL/retrieval, crash-safe orchestration และ authenticated CI evidence integration ต้องผ่าน qualification ใน work item ของ runtime แยก

Next action: Human review ของ written plan แล้วเลือก execution method; owner: Project owner. Recommend owner-led execution สำหรับ edits ที่เป็นลำดับ เรียก specialist สำหรับ expertise/independent review ตามแต่ละ slice ไม่แนะนำ spawn fresh worker ทุก checkbox
