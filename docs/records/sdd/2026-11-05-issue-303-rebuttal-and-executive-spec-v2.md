# Forensic Review Rebuttal & Executive Specification v2 — Issue #303 (AI-Native SDLC Playbook Integration)

## Metadata

- **Work Item ID**: [Issue #303](https://github.com/chakrits/AI-Agent-Workflow/issues/303)
- **Reviewed Feedback Reference**: [Issue #303 Comment `#6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869)
- **Baseline Commit Audited**: `863306a9e3268f32d416ad76f5a783746b49ea4f` (`origin/main`)
- **Target Branch**: `feat/issue-303-ai-native-sdlc-playbook`
- **External Primary Source**: [*The AI-native SDLC playbook* — Louis Claxton, Anthropic (August 21, 2026)](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) (verified directly against primary article text)
- **Change Classification**: `Framework / Meta Change` (Slices 1, 2, 4) + `Code Behavior Enhancement` (Slice 3 in `scripts/validate-metrics.mjs`)
- **Risk Level**: `Medium` (modifies routing/contract eligibility, multi-surface review policy, and CLI behavior; zero reduction of security or human approval gates)
- **Lifecycle Phase**: `phase:requirements` / `phase:design` (awaiting Human Maintainer policy sign-off before `status:spec-ready` and implementation)
- **Document Status**: `Proposed v2 — Ready for Executive & Maintainer Decision`

---

## 1. บทสรุปสำหรับผู้บริหาร (Executive Summary & Business Case)

### 1.1 โจทย์ทางธุรกิจและคอขวดที่พิสูจน์ได้จริง (Verified Problem Statement)

จากการตรวจสอบร่วมกันระหว่างบทความต้นฉบับของ Anthropic ([*The AI-native SDLC playbook*](https://claude.com/resources/articles/the-ai-native-sdlc-playbook)) และซอร์สโค้ดจริงของ `AI-Agent-Workflow` ณ commit `863306a` พบข้อเท็จจริงเชิงประจักษ์ 3 ประการที่ผู้บริหารใช้ตัดสินใจได้ทันที:

1. **ความไม่สอดคล้องระหว่างนโยบายเอกสาร (Prose Policy) กับสัญญาระดับเครื่องตรวจ (Machine Contract) ในงานฟีเจอร์ความเสี่ยงต่ำ**:
   - แม้ `docs/workflow/dynamic-routing.md:92` จะอนุญาตให้เส้นทางความเสี่ยงต่ำ (`Low-risk`) ใช้ Lightweight Specification ใน Work Item ได้ แต่สัญญาสถานะหลัก `docs/contracts/new-feature-workflow.yaml:6–13` ที่ตรวจด้วย `scripts/validate-contracts.mjs` กลับ **ไม่มีทางลัด `when: { risk_level: low }`** (ต่างจาก `docs/contracts/config-change-workflow.yaml:10` ที่มีทางลัด `when: { risk_tier: low }` แล้ว) ส่งผลให้งาน `new-feature` ทุกระดับความเสี่ยงที่เดินตาม state machine ถูกบังคับให้ต้องผ่านสถานะ `designing` และแนบ `sdd_reference` เสมอ
2. **ขาดเพดานควบคุมสัญญาณรบกวน (Nitpick Cap) ที่เชื่อมโยงครบทุกจุดตรวจรับงาน**:
   - ปัจจุบันระบบมีระดับความรุนแรง (`Critical / Major / Minor / Question`) และช่อง `Blocks Progress?` อยู่แล้วใน `docs/templates/CODE_REVIEW_FINDINGS.md:3` รวมถึงมีระบบ Scoped Re-review สูงสุด 2 รอบใน `docs/workflow/task-execution-mode.md:48–58` แต่ยังขาดกติกา **3-Pass Focus (`Bugs`, `Security`, `Spec/Plan Compliance`)** และ **Nitpick Cap (สูงสุด 5 ข้อต่อรอบรีวิว พร้อมสรุปยอดส่วนเกิน)** ที่บังคับสอดคล้องกันทั้งใน Workflow, Skill และ Templates เพื่อคุ้มครองเวลาของผู้ตรวจรับงานที่เป็นมนุษย์
3. **ช่องว่างในการเชื่อมข้อมูลหลักฐานเชิงโครงสร้าง (Structured Evidence) สู่การตั้งต้นงานปรับปรุงรอบถัดไป (Maintain → Plan Assist)**:
   - ปัจจุบัน `scripts/validate-metrics.mjs` อ่านตาราง `TASK_LOG.md` ด้วยการจับคำ (`regex`) ซึ่งเป็นเพียงข้อมูลย้อนหลังเพื่อความเข้ากันได้ (`historical compatibility projection` ตาม `docs/operating-model/METRICS.md:3,45`) ขณะที่โปรเจกต์ได้ลงทุนสร้างโครงสร้างหลักฐานมาตรฐานไว้แล้วใน `docs/contracts/schemas/workflow-evidence.schema.json`, `docs/contracts/schemas/dispatch-receipt.schema.json`, และ `task-state.json` แต่ยังไม่มีเครื่องมืออ่านหลักฐานเชิงโครงสร้างเหล่านั้นมาช่วยร่างใบตั้งต้นงาน (`INTENT.md` ฉบับร่างให้มนุษย์คัดกรอง) เมื่อเกิดแนวโน้ม Timeout หรือ Rework เกินเป้าหมาย

### 1.2 คุณค่าและผลตอบแทนเชิงวิศวกรรม (Value Proposition & Governance Guarantee)

| มิติสำหรับผู้บริหาร | สิ่งที่ได้จากแผนรุ่น v2 | การรับประกันความปลอดภัย (Zero Governance Regression) |
|---|---|---|
| **ความเร็วในการตั้งต้นและออกแบบงาน (Lead Time to `spec-ready`)** | เปิดทางด่วนที่มีเงื่อนไขชัดเจน (`INTENT.md` → `SPEC.md` + `when: { risk_level: low }` ใน `new-feature-workflow.yaml`) สำหรับงานความเสี่ยงต่ำโดยไม่ทำลาย 34 แม่แบบเดิม | งานที่กระทบ Auth/Security, Public API, Schema/Data Migration หรือความเสี่ยงสูง **ถูกบังคับให้ออกจากทางด่วนเข้าสู่ `SDD.md` เต็มรูปแบบทันที** |
| **คุณภาพและเวลาตรวจ PR ของมนุษย์ (Human Review Efficiency)** | จัดระเบียบ AI Review เป็น 3 Passes และจำกัด Nit ไม่เกิน 5 ข้อต่อรอบรีวิว เพื่อให้ผู้บริหาร/Tech Lead โฟกัสเฉพาะความเสี่ยงธุรกิจและสถาปัตยกรรม | ห้ามลดระดับบั๊ก/ช่องโหว่ความปลอดภัยเป็น Nit เด็ดขาด และประเด็น `Human Judgment Required` จะบล็อกจนกว่ามนุษย์จะอนุมัติตาม Gate |
| **ความแม่นยำของข้อมูลวัดผล (Trustworthy Telemetry Assist)** | แยกการประมวลผลจาก **Structured Evidence** ออกจาก `TASK_LOG` regex เดิม พร้อมสถานะ `INSUFFICIENT_DATA` ป้องกันการตีความ `0/0 = 0%` ผิดพลาด | ร่าง `INTENT.md` ที่สร้างขึ้นมีสถานะ `draft (advisory)` ต้องผ่านการคัดกรองโดยมนุษย์ ไม่มีการเปลี่ยน Route หรือปิด/เปิด Gate อัตโนมัติข้าม Turn |
| **ขนาดงานที่ตรวจสอบและย้อนกลับได้ง่าย (Controlled Delivery)** | แบ่งงานเป็น **4 Slices อิสระ** ขนาด ~90–220 บรรทัดต่อชิ้น แยกตามผู้ตรวจรับ (Policy vs Code TDD) | ทุก Slice สามารถ `git revert` แยกชิ้นได้ทันทีโดยไม่กระทบส่วนอื่น |

---

## 2. การตรวจสอบข้อเท็จจริงและข้อโต้แย้งพร้อมหลักฐานพิสูจน์ซ้ำ (Forensic Fact-Check & Rebuttal Matrix)

จากการตรวจสอบบันทึก Feedback [`#issuecomment-6650818869`](https://github.com/chakrits/AI-Agent-Workflow/issues/303#issuecomment-6650818869) เทียบกับซอร์สโค้ด ณ commit `863306a` และบทความต้นฉบับแบบบรรทัดต่อบรรทัด สามารถจำแนกผลพิสูจน์ออกเป็น **2 หมวด** อย่างตรงไปตรงมาดังนี้:

### หมวด A — ประเด็นที่ผู้รีวิวสรุปคลาดเคลื่อนหรือมองข้ามกลไกระดับ Code/Contract (โต้แย้งพร้อมหลักฐานหักล้าง)

#### Rebuttal R-01: โต้แย้งบางส่วนต่อ `F-01` — พิสูจน์ว่า Machine Contract (`new-feature-workflow.yaml`) บังคับแยกขั้น `designing` และ `sdd_reference` ตายตัวจริง แม้เป็นงาน `risk_level: low`

- **ข้อกล่าวหาใน Feedback (`F-01`)**: ผู้รีวิวอ้างกฎเชิงข้อความใน `docs/workflow/dynamic-routing.md:22,35,88` และ `AGENTS.md:32` แล้วสรุปว่าแผนขาดหลักฐานว่า Framework บังคับแยกขั้นตอนเกินความจำเป็น
- **หลักฐานหักล้างจากซอร์สโค้ดจริง (Counter-Evidence)**:
  1. ผู้รีวิวตรวจสอบเฉพาะเอกสารข้อความ (`dynamic-routing.md`) แต่มองข้าม **Canonical Machine-Enforced Contract** ใน [`docs/workflows/new-feature.md:16–20`](../../workflows/new-feature.md) และ [`docs/contracts/new-feature-workflow.yaml:6–13`](../../contracts/new-feature-workflow.yaml):
     - `docs/workflows/new-feature.md:18–20` กำหนดชัดเจนว่า: *"Use `docs/contracts/new-feature-workflow.yaml` as the canonical New Feature policy. Before each handoff, validate the work item's `task-state`; the contract defines the allowed states, transitions, evidence requirements..."* และบรรทัด `48` กำหนด Gate ว่า *"SDD is approved before implementation starts."*
     - ใน `docs/contracts/new-feature-workflow.yaml:6–13` กำหนดการเปลี่ยนสถานะไว้ตายตัวเพียงเส้นทางเดียวคือ `intake -> discovery -> designing (บังคับ sdd_reference, api_contract, data_impact, ba_sa_gate_result) -> planning -> implementing` **โดยไม่มีเงื่อนไขทางลัด `when: { risk_level: low }`** ต่างจาก [`docs/contracts/config-change-workflow.yaml:10`](../../contracts/config-change-workflow.yaml) ที่มี `{ from: owner-review, to: rollout, requires: [owner_approval], when: { risk_tier: low } }` ให้ข้าม `sa-review` ได้อย่างถูกต้อง
  2. **วิธีพิสูจน์ซ้ำด้วยคำสั่งจริง (Reproducible Proof on `863306a`)**:
     เมื่อรัน `validateContracts()` จาก `scripts/validate-contracts.mjs` โดยส่งสถานะงาน `new-feature` ที่ระบุ `risk_level: low` และพยายามเดินจาก `discovery -> planning` ตามแนวทาง Lightweight Spec ใน `dynamic-routing.md:92`:
     ```bash
     node --input-type=module -e "
     import YAML from 'yaml'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
     import { validateContracts } from './scripts/validate-contracts.mjs';
     const tmp = path.join(os.tmpdir(), 'f01-low-risk-fasttrack.yaml');
     fs.writeFileSync(tmp, YAML.stringify({
       task_id: 'NF-LOW-001', workflow_id: 'new-feature', contract_version: 1,
       change_type: 'new-feature', risk_level: 'low', state: 'planning',
       rework_count: 0, max_rework_attempts: 1, next_route: 'developer-agent', stop_reason: null,
       evidence: {
         change_type: 'new-feature', risk_level: 'low', initial_scope: 'Minor helper',
         user_stories: 'US-1', acceptance_criteria: 'AC-1', business_rules: 'BR-1', pm_ba_gate_result: 'PASS'
       },
       history: [
         { from: 'intake', to: 'discovery', at: '2026-11-05T00:00:00Z', actor: 'orchestrator-agent', evidence_refs: ['change_type', 'risk_level', 'initial_scope'] },
         { from: 'discovery', to: 'planning', at: '2026-11-05T00:05:00Z', actor: 'ba-agent', evidence_refs: ['user_stories', 'acceptance_criteria', 'business_rules', 'pm_ba_gate_result'] }
       ]
     }));
     console.log(JSON.stringify(await validateContracts(process.cwd(), [path.relative(process.cwd(), tmp)])));
     " -- check
     ```
     **ผลลัพธ์ที่ได้จริง**:
     ```json
     [".../f01-low-risk-fasttrack.yaml: illegal transition: discovery -> planning"]
     ```
     ข้อพิสูจน์นี้ยืนยันว่า **ความขัดแย้งระหว่าง Prose Shortcut (`dynamic-routing.md:92`) กับ Machine Contract (`new-feature-workflow.yaml:6–13`) มีอยู่จริงในระดับโค้ด** ไม่ใช่การกล่าวอ้างลอยๆ
- **ส่วนของ `F-01` ที่ผู้รีวิวท้วงติงถูกต้องและเรายอมรับเพื่อปรับแผน**:
  - การอ้างจำนวนไฟล์แม่แบบ `36 ไฟล์` ในแผนรุ่น v1 เป็นความคลาดเคลื่อน (ตรวจนับจริงที่ `863306a` มี `34` ไฟล์ แบ่งเป็นแม่แบบใช้งานจริง `33` ไฟล์ และไฟล์เปลี่ยนเส้นทางที่เลิกใช้แล้ว `docs/templates/REQUIREMENTS.md` `1` ไฟล์) และจำนวนไฟล์ในโฟลเดอร์ `docs/templates/` ไม่ได้แปลว่าหนึ่งงานต้องสร้างทุกไฟล์ นอกจากนี้ `phase:` labels ไม่ได้บังคับให้ต้องเปิดแยก Chat Session จึงถอนข้ออ้างเรื่องจำนวนไฟล์ออกทั้งหมด และมุ่งแก้จุดติดขัดจริงที่ระดับ Contract Eligibility แทน

---

#### Rebuttal R-02: โต้แย้งบางส่วนต่อหัวข้อ `9.1` — พิสูจน์การมีอยู่ของ Hard `PreToolUse` Gate ใน `.claude/settings.json:3–15` และเหตุผลทางสถาปัตยกรรมของ `.githooks/pre-push`

- **ข้อกล่าวหาใน Feedback (`9.1`)**: ผู้รีวิวอ้างเฉพาะ `.githooks/pre-push:8,16,23` และ `.claude/settings.json:16,39` (`PostToolUse` และ `SubagentStop` ที่เป็น advisory / `|| true`) เพื่อชี้ว่า Hooks ไม่ได้บล็อกก่อนการกระทำ
- **หลักฐานหักล้างและชี้แจงความแม่นยำทางเทคนิค**:
  1. **มี Hard Pre-Execution Blocking Hook อยู่จริงใน [`.claude/settings.json:3–15`](../../../.claude/settings.json)**:
     บรรทัดที่ `3–15` กำหนด `PreToolUse` ดักจับ `matcher: "Bash"` เงื่อนไข `"if": "Bash(gh pr create:*)"` เพื่อรัน `npm run --silent validate:pr-readiness -- --hook` **โดยไม่มี `|| true`** ซึ่งเป็นการบล็อกก่อนรันคำสั่ง (`pre-block`) ตามรูปแบบ Play 10 ของบทความต้นฉบับทุกประการ
  2. **เหตุผลที่ `.githooks/pre-push:8–10, 23–27` คืนค่า `exit 0` เมื่อไม่มี `PR_BODY_FILE` เป็นการออกแบบโดยเจตนา (Intentional Safeguard)**:
     คอมเมนต์ใน `.githooks/pre-push:8–10` ระบุชัดเจนว่าคำสั่ง `git push` ทั่วไปไม่มีเนื้อหา PR body การบล็อกทุก push จะทำให้เกิดโหมดพังซ้ำรอย AC-10 ที่ถูกถอนออกไปแล้ว แต่เมื่อผู้พัฒนาตั้งค่า `PR_BODY_FILE` บรรทัดที่ `30–32` จะตรวจสอบและบล็อกด้วย `exit 1` ทันที ขณะที่การบังคับขั้นเด็ดขาดฝั่ง Server ทำงานอยู่ใน Hosted CI (`.github/workflows/` ผ่าน `scripts/run-scoped-validations.mjs` และ `scripts/validate-review-gate.mjs`) โดยไม่มี `|| true`
- **ส่วนของ `9.1` ที่ผู้รีวิวท้วงติงถูกต้องและเรายอมรับเพื่อปรับแผน**:
  - ถอนคำว่า "ความสมบูรณ์ของ Play 8 & Play 10" ออก เพราะ:
    1. `PostToolUse` (`scripts/validate-edit-guards.mjs:89–92` คืน `advisory: true`) และ `SubagentStop` (`|| true`) เป็นเพียงสัญญาณเตือนหลังเขียนไฟล์ และโปรเจกต์ยังไม่มี Managed Enterprise Settings ระดับองค์กรตามบทความต้นฉบับ (หัวข้อ *Managed settings for a regulated enterprise*)
    2. ชุดทดสอบ `801 tests` (ใน `52` ไฟล์ทดสอบ ณ `863306a`) เป็น **Deterministic Script/Contract Unit Tests** ไม่ใช่ **Live Non-Interactive Agent Behavioral Evals (`claude -p` รันโจทย์จริง 20–50 ข้อใน CI)** ตามนิยาม Play 8 ของบทความต้นฉบับ

---

### หมวด B — ประเด็นท้วงติงที่ตรวจสอบแล้วเป็นความจริง 100% (ไม่สามารถหักล้างได้) และการผ่าตัดปรับแผนใหม่

| รหัส | ข้อค้นพบที่พิสูจน์แล้วว่าเป็นจริงตามหลักฐาน | ผลตรวจซ้ำบน `863306a` / บทความต้นฉบับ | การปรับแก้ในแผน Executive Proposal v2 (ปิดช่องโหว่ 100%) |
|---|---|---|---|
| **F-02** | `scripts/validate-metrics.mjs` นับคำจาก `TASK_LOG.md` ซึ่งไม่ใช่ Authoritative Telemetry และขัดกับ `METRICS.md:3,45` | 1) ข้อความ `"No timeout; no rework required."` คืน `timeouts:1, reworks:1` จริง<br>2) บน `HEAD` (`863306a`) หลัง `reset:template` ไฟล์ `TASK_LOG.md` มี `0` แถว ทำให้คืน `0%` ทั้งที่ไม่มีข้อมูล | 1) แยกโหมด `--source structured` (ค่าเริ่มต้นสำหรับการตรวจเกณฑ์ โดยอ่านจาก `workflow-evidence/v1`, `dispatch-receipts/*.yaml`, และ `task-state.json`) ออกจาก `--source legacy-task-log` (ต้องระบุชัดเจนและประทับตรา `non-authoritative compatibility`)<br>2) เพิ่มสถานะ `INSUFFICIENT_DATA` เมื่อ `sample_size < min_samples` (ค่าเริ่มต้น `5`) ไม่ให้ตีความ `0/0` เป็น `0% สุขภาพดี`<br>3) ร่าง `INTENT.md` ที่สร้างมีสถานะ `draft (advisory)` ต้องให้มนุษย์คัดกรองเท่านั้น |
| **F-03** | เกณฑ์คำว่า "งานเล็ก–กลาง" คลุมเครือและเสี่ยงเปิดช่องข้าม Security/Architecture Gate | การแก้โค้ด Authz เพียง 3 บรรทัดถือเป็นงานเล็กในแง่บรรทัด แต่เป็น `High Risk` ตาม `dynamic-routing.md:148` และติด Human Gate ตาม `core-bootloader.md:28` | ยกเลิกเกณฑ์ตามขนาดบรรทัด เปลี่ยนเป็น **6-Gate Risk & Impact Eligibility Matrix** + **Artifact Equivalence Mapping** + **Mandatory Exit Triggers** และผูกเงื่อนไข `when: { risk_level: low }` ใน `new-feature-workflow.yaml` ให้เครื่องตรวจอัตโนมัติ |
| **F-04** | คำว่า "Closed-Loop Autonomous Maintain" กว้างกว่า CLI flag ที่ส่งมอบ และชนขอบเขต Issue #35 | `dynamic-routing.md:65–69` และ `task-execution-mode.md:82–84` ห้าม Cross-turn autonomous routing (ชะลอไว้ที่ Issue #35) และบทความต้นฉบับใช้ `bands.yaml` (`1σ/2σ/3σ`) คู่กับ Triage Queue ของมนุษย์ | เปลี่ยนชื่อและขอบเขต Phase 1 อย่างซื่อสัตย์เป็น **Threshold-Assisted Intent Draft Generator (Human-Triaged)** กำหนด Triage Owner, กฎป้องกันไฟล์ซ้ำด้วย `Intent-Fingerprint`, และแยก Scheduled Statistical Control Bands (`1σ/2σ/3σ`) ไว้ในระยะ M4 เมื่อมี Telemetry Store และ Control Plane พร้อม |
| **F-05** | การแก้แค่ `CODE_REVIEW_FINDINGS.md` ไม่เปลี่ยนพฤติกรรม Agent จริง และโปรเจกต์มีการแยก Severity อยู่แล้ว | `CODE_REVIEW_FINDINGS.md:3`, `TASK_REVIEW.md:8–20`, และ `code-review-gate/SKILL.md:51–55` มี Severity อยู่แล้ว ส่วนบทความต้นฉบับใช้ `REVIEW.md` แบ่ง 3 Passes และกำหนดเพดาน **5 Nits** | ปรับปรุงสอดคล้องกันครบทั้ง **4 จุด** (`docs/workflows/code-review-gate.md`, `CODE_REVIEW_FINDINGS.md`, `TASK_REVIEW.md`, `.agents/skills/code-review-gate/SKILL.md`): ใช้ 3 Passes (`Bugs`, `Security`, `Compliance`), เพดาน **Nit Cap = 5 ข้อต่อรอบรีวิว** (พร้อมสรุปยอดส่วนเกิน `+N suppressed nits`), ห้ามลดระดับ Defect เป็น Nit, และผูก `Human Judgment Required` กับ Human Gate |
| **F-06** | เกณฑ์คณิตศาสตร์ `>` ขัดกับ `<` ใน `METRICS.md` และยังขาด CLI / Boundary Contract | `METRICS.md:18–19` กำหนดเป้า `<10%` และ `<15%` ดังนั้นค่า `10.0%` และ `15.0%` ถือว่าไม่ผ่านเป้าแล้ว (ต้องใช้ `>=` บนค่าจริงก่อนปัดเศษ) | กำหนด **Exact Mathematical & CLI Specification** ครบทุกกรณี: สมการ `ratio >= 0.10` และ `ratio >= 0.15` ก่อนปัดเศษ, Exit Codes (`0 / 1 / 2`), พฤติกรรมเมื่อไม่มี Breach, Missing Path / Unknown Flag, การป้องกันเขียนทับไฟล์เดิม (`EEXIST` เว้นแต่ใส่ `--force`), และชุดทดสอบ `TC-001`–`TC-012` |
| **9.2** | `G-04` (Parallel Worktrees) ลอยอยู่โดยไม่มี AC รองรับ และบทความต้นฉบับแยก Parallel Sessions ออกจาก Subagents | บทความต้นฉบับหัวข้อ *Parallel sessions and subagents* แยกชัดเจนระหว่าง **Parallel Sessions** (คนละ Git Worktree คุมโดยวิศวกร) กับ **Scoped Subagents** (ตัวช่วยใน Session เดียวกัน) | ปิดช่องว่าง Orphan Gap โดยบรรจุ **Parallel Worktree Sessions vs. In-Session Subagents Decision Matrix** เข้าใน `AC-002` (`dynamic-routing.md`) เชื่อมกับกฎ Disjoint Write-set ใน `task-execution-mode.md:24–27` และ `AGENTS.md` Worktree Lifecycle |
| **9.3 & 9.4** | ตัวเลขสถิติต้องผูกกับ Commit Snapshot และ Context Budget เป็นค่าประมาณ `chars / 4` ไม่ใช่ Session Token จริง | ณ `863306a`: `docs/templates/` = `34` ไฟล์ (`33` active + `1` redirect), `.agents/skills/` = `39` `SKILL.md`, `npm test` = `801` tests (`52` test files), Tier 1 = `1,767/2,500`, Tier 3 = `25,842/30,000` approx tokens | แก้ไขตัวเลขฐานทั้งหมดให้ตรงกับ commit `863306a` พร้อมคำสั่งตรวจซ้ำ และแยกเกณฑ์ตรวจ Static Context Budget (`validate:context-budget`) ออกจากตัวชี้วัดประสิทธิภาพการทำงานจริง (Git Timestamp Leading/Lagging Metrics ตามบทความต้นฉบับ) |

---

## 3. การเชื่อมโยงบทความต้นฉบับครบทั้ง 6 Stages (Primary-Source Mapping & Gap Disposition)

ตารางด้านล่างอ้างอิงโครงสร้างจริงจากบทความต้นฉบับ [*The AI-native SDLC playbook*](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) (ครบทุก Stage และหัวข้อย่อย) เทียบกับสถานะจริงใน `863306a` และขอบเขตของ Issue #303 รุ่น v2:

| Stage | Play / หัวข้อในบทความต้นฉบับ | สถานะจริงใน Repo ณ `863306a` | การดำเนินการใน Issue #303 (v2) |
|---|---|---|---|
| **01 Plan** | **Capture as `intent.md`** | มี `PROJECT_BRIEF.md` และ `REQUIREMENT_DISCOVERY.md` แต่ยังไม่มีแม่แบบ Proto-spec สั้นกระชับระดับผู้ริเริ่มงาน/สัญญาณแจ้งเตือน | **In Scope (Slice 1)**: เพิ่ม `docs/templates/INTENT.md` พร้อมผูก Source Provenance และความสัมพันธ์กับ `REQUIREMENT_DISCOVERY.md` |
| **02 Design** | **Requirements and design (`spec.md` single-session)** | มี `Owner uses skills` (`dynamic-routing.md:30`) แต่ `new-feature-workflow.yaml` ยังบังคับผ่าน `designing` (`sdd_reference`) ทุกกรณี | **In Scope (Slice 1)**: เพิ่ม `docs/templates/SPEC.md` + ตาราง Eligibility 6 ข้อ + เพิ่มทางลัด `when: { risk_level: low }` ใน `new-feature-workflow.yaml` |
| **03 Build** | **Plan mode as default (`plan.md`) & Auto mode** | มี `IMPLEMENTATION_PLAN.md` และโหมด `plan_only` ใน `work-item-readiness.mjs:333` | **Retained Baseline**: ใช้ `IMPLEMENTATION_PLAN.md` เดิมเป็น `plan.md` มาตรฐาน (ไม่สร้างไฟล์ซ้ำ) |
| **03 Build** | **Legacy systems and the source of truth** | มีลำดับ Source of Truth ใน `core-bootloader.md:6–12` | **In Scope (Slice 1)**: ระบุกฎ Single Source of Truth / Commit-SHA Linkage ใน `INTENT.md` และ `SPEC.md` |
| **03 Build** | **The `CLAUDE.md` / `AGENTS.md`** | มี `AGENTS.md` + `core-bootloader.md` (`1,767 / 2,500` approx tokens) + SHA-256 pinning | **Retained Strength**: รักษาเพดานงบประมาณ Context Budget เดิม |
| **03 Build** | **Skills as institutional knowledge & Build-time hooks** | มี `39` Skills ใน `.agents/skills/`; มี `PostToolUse` edit-guards (advisory) | **Clarified Boundary**: บันทึกขอบเขต Advisory Skill vs Deterministic CI/Hook ตามจริง |
| **03 Build** | **Parallel sessions and subagents** | มีกฎ Worktree ใน `AGENTS.md` และ Write-set ใน `task-execution-mode.md:24` แต่ยังไม่แยก Parallel Sessions ออกจาก Subagents ชัดเจน | **In Scope (Slice 1 — ปิด G-04)**: เพิ่มตารางตัดสินใจ **Parallel Worktree Sessions vs. In-Session Scoped Subagents** ใน `dynamic-routing.md` |
| **04 Test** | **Give Claude a feedback loop** | มี `npm test` (`801` tests), `run-scoped-validations.mjs`, และกฎ TDD / ห้ามแก้เทสต์เพื่อให้ผ่าน | **Retained Strength**: ใช้เป็นกลไกหลักในการพิสูจน์ทุก Slice |
| **04 Test** | **Continuous evals in CI** | มี Deterministic Contract/Script Tests ใน CI แต่ **ยังไม่มี Live `claude -p` LLM Behavioral Evals** | **Deferred to M3/M4 (Slice 4 Roadmap)**: บันทึกแยกความต่างชัดเจนใน `ROADMAP-SDLC-FRAMEWORK.md` เนื่องจากต้องใช้ API Key budget และ Runner เฉพาะ |
| **05 Deploy** | **AI in the PR review loop (`REVIEW.md`)** | มี `CODE_REVIEW_FINDINGS.md`, `TASK_REVIEW.md`, `validate-review-gate.mjs` แต่ยังไม่มี 3-Pass Tagging และ Nit Cap | **In Scope (Slice 2)**: ปรับปรุงครบทั้ง 4 Review Surfaces ด้วย 3 Passes และเพดาน **Nit Cap = 5 ข้อต่อรอบรีวิว** |
| **05 Deploy** | **Hooks as approval gates & Managed settings** | มี `PreToolUse` บล็อก `gh pr create` เมื่อไม่พร้อม + Hosted CI Gates; ส่วน `PostToolUse`/`SubagentStop` เป็น advisory | **Clarified Boundary (Slice 4)**: ระบุตาราง 5-Layer Enforcement Boundary อย่างตรงไปตรงมา ไม่ขยายผลเกินจริง |
| **05 Deploy** | **CI/CD integration and deployment** | มี GitHub/GitLab CI pipelines และ Release Readiness/Triple Rollback checklists | **Deferred to M4**: การต่อ MCP Deployment ทำเมื่อมี Application Target จริงในระยะ M4 |
| **06 Maintain** | **Closing the loop (`bands.yaml` → `intent.md`), Recurring scans, Claude Tag** | มี `validate-metrics.mjs` และ Schema `workflow-evidence/v1` + `dispatch-receipts` แต่ยังไม่มีตัวสร้างร่าง `INTENT.md` จากหลักฐานโครงสร้าง | **In Scope Phase-1 (Slice 3)**: สร้าง **Deterministic Threshold-Assisted Intent Draft Generator** บน Structured Evidence (Human-Triaged); ชะลอ Autonomous Cross-Turn Triggering ไว้ตามขอบเขต Issue #35 / M4 |

---

## 4. รายละเอียดข้อกำหนดทางสถาปัตยกรรมและสัญญาเทคนิค (Detailed Architecture & Contracts v2)

### 4.1 Eligibility & Exit Matrix สำหรับ Compressed Artifact Route (แก้ `F-01` และ `F-03`)

เส้นทางเอกสารแบบกระชับ (`INTENT.md` → `SPEC.md` → `IMPLEMENTATION_PLAN.md`) อนุญาตให้ใช้แทนการแยกเขียน `REQUIREMENT_DISCOVERY.md` + `SDD.md` คนละฉบับ **เฉพาะเมื่อผ่านเกณฑ์ครบทั้ง 6 ข้อ (Conjunctive Eligibility — ต้องเป็นจริงทุกข้อ)** ดังนี้:

| ข้อ | เกณฑ์คัดกรอง (Eligibility Criterion) | เงื่อนไขที่อนุญาตเข้า Compressed Route | เงื่อนไขที่ห้ามใช้ และต้องออกจากทางด่วนทันที (Mandatory Exit Trigger → Owner) |
|---|---|---|---|
| **E-1** | **ระดับความเสี่ยง (Risk Level)** | `Low` (หรือ `Medium` เฉพาะงานปรับปรุงภายในขอบเขตโมดูลเดียวที่ไม่แตะเกณฑ์ต้องห้าม E-2 ถึง E-6; ทั้งนี้การข้ามสถานะ `designing` ใน `new-feature-workflow.yaml` จำกัดเฉพาะ `risk_level: low` เท่านั้น) | `High` หรือ `Critical` ทุกกรณี → ส่งต่อ **SA Agent + Human Maintainer** |
| **E-2** | **ความปลอดภัยและสิทธิ (Security & Trust Boundary)** | ไม่แตะ Auth/Authz, Permissions, Secrets, Cryptography, PII/Privacy, Payment/Financial logic หรือ Security Controls | แตะหัวข้อข้างต้นแม้เพียงบรรทัดเดียว → ส่งต่อ **Security Reviewer + Human Approval Gate** (`core-bootloader.md:28`) |
| **E-3** | **ขอบเขตสถาปัตยกรรมและ API (Architecture & Contract Impact)** | ไม่เปลี่ยนโครงสร้างข้ามระบบ และไม่สร้าง Breaking Change ต่อ Public/Shared API หรือ Schema มาตรฐาน | กระทบหลายระบบหรือเปลี่ยน API/Schema สาธารณะ → ต้องสร้าง `SDD.md` เต็มรูปแบบโดย **SA Agent** (`dynamic-routing.md:93`) |
| **E-4** | **ผลกระทบต่อข้อมูล (Data & Migration Impact)** | ไม่มีการเปลี่ยนแปลง Production Data, ไม่มี Schema Migration เชิงทำลาย (`DROP`/แปลงคอลัมน์เสี่ยงข้อมูลหาย) | มี Migration หรือกระทบข้อมูลจริง → ส่งต่อ **SA Agent / Data Agent + Human Gate** |
| **E-5** | **ความชัดเจนของโจทย์ (Requirement Clarity)** | Open Questions จาก `INTENT.md` ได้รับคำตอบครบหรือผู้มีอำนาจยอมรับขอบเขตชัดเจนแล้ว | มีความกำกวมทางธุรกิจหรือแหล่งข้อมูลขัดแย้งกัน → หยุดและส่งต่อ **BA/PM Agent หรือ Human Maintainer** |
| **E-6** | **การคงไว้ซึ่งการตรวจรับอิสระ (Independent Verification & Readiness)** | ยังคงต้องได้รับป้าย `status:spec-ready` ก่อน Developer เริ่มเขียนโค้ด และผู้ตรวจรับ (`QA / Reviewer`) ต้องเป็น Identity แยกจากผู้เขียนโค้ด | ความพยายามใช้ Session เดียวเพื่ออนุมัติงานตัวเองโดยไม่มี Independent Verifier → **บล็อกทันที** ตาม `dynamic-routing.md:33,37` |

#### ตารางเทียบความสมมูลของเอกสาร (Canonical Artifact Equivalence Mapping)

เพื่อป้องกันไม่ให้ `INTENT.md` และ `SPEC.md` กลายเป็นเอกสารซ้ำซ้อนกับแม่แบบเดิม จึงกำหนดความสัมพันธ์แบบ 1 ต่อ 1 ดังนี้:

- **`INTENT.md`** = ใบตั้งต้นระดับต้นน้ำ (Upstream Proto-Spec) สำหรับบันทึกปัญหา เป้าหมาย ข้อจำกัด และที่มา (`human`, `metric-advisory`, `security-scan`) ก่อนเข้าสู่การวิเคราะห์; หากงานถูกยกระดับเป็น High Risk ข้อมูลใน `INTENT.md` จะเป็น Input โดยตรงให้ `REQUIREMENT_DISCOVERY.md` โดยไม่ต้องเขียนซ้ำ
- **`SPEC.md`** (เมื่อผ่านเกณฑ์ E-1 ถึง E-6) = เอกสารรวมศูนย์ที่เทียบเท่า `REQUIREMENT_DISCOVERY.md` (หมวด Scope, User Stories, Testable AC, Business Rules) + ส่วนสรุปผลกระทบเทคนิคของ `SDD.md` (`Affected Components`, `API Impact: None / Internal Additive`, `Data Impact: None`, `NFR & Rollback`, `Flagged Policy/Security Concerns`)
  - **ผู้รับผิดชอบ (Accountability)**: เนื้อหาฝั่ง Business/AC อยู่ภายใต้ความรับผิดชอบของ `BA Agent` (หรือ Task Owner ที่ได้รับมอบหมายในโหมด `Owner uses skills`) และเนื้อหาฝั่ง Technical Impact ต้องได้รับการทบทวนโดย `SA Agent` เมื่อมีความเสี่ยงระดับ `Medium` ก่อนติดป้าย `status:spec-ready`
- **การปรับปรุง `docs/contracts/new-feature-workflow.yaml`**:
  เพิ่มทางเลือกการเปลี่ยนสถานะแบบมีเงื่อนไขที่ตรวจด้วย `scripts/validate-contracts.mjs` (`validateWhenClause`) ได้ทันที:
  ```yaml
  - from: discovery
    to: planning
    requires: [user_stories, acceptance_criteria, business_rules, compressed_spec_reference, pm_ba_gate_result]
    when: { risk_level: low }
  ```
  *(หาก `risk_level` เป็น `medium`, `high`, หรือ `critical` ตัวตรวจ `validate-contracts.mjs` จะปฏิเสธการข้าม `designing` โดยอัตโนมัติ)*

---

### 4.2 Parallel Worktree Sessions vs. In-Session Scoped Subagents (ปิดช่องว่าง `G-04` / หัวข้อ `9.2`)

กำหนดตารางแยกแยะรูปแบบการทำงานขนานใน `docs/workflow/dynamic-routing.md` ให้ตรงกับบทความต้นฉบับและสัญญา In-Turn Supervision ของโปรเจกต์:

| มิติ | รูปแบบที่ 1: Parallel Worktree Sessions | รูปแบบที่ 2: In-Session Scoped Subagents |
|---|---|---|
| **นิยามตาม Playbook** | อินสแตนซ์ของ Agent แยกจากกันโดยสิ้นเชิง รันคนละ Terminal บน Git Worktree และ Branch ของตัวเอง โดยมีมนุษย์เป็นผู้กำกับดูแล | Subagent เฉพาะกิจที่ถูกเรียกภายใน Session แม่เดียวกัน มี Context Window และสิทธิ์เครื่องมือจำกัดเพื่องานเฉพาะจุด |
| **เมื่อใดควรใช้** | เมื่อมีงานตั้งแต่ 2 ชิ้นขึ้นไปที่ **Write-set ไม่ทับซ้อนกันเลย (Disjoint Write-sets)** และไม่มี Dependency ต่อกันในระดับไฟล์ | เมื่อต้องการความเชี่ยวชาญเฉพาะจุด (`Specialist consultation/delivery`) หรือต้องการ **Independent Verification** ในบริบทสะอาด (`fresh context`) |
| **การบังคับและการแยกพื้นที่** | ใช้ `git worktree add .worktrees/<branch-slug> <branch>` และเก็บกวาดภายใน 24 ชม. หลัง Merge ด้วย `npm run housekeeping:worktrees` (`AGENTS.md`) | ต้องปฏิบัติตามสัญญา **In-Turn Dispatch Supervision** (`dynamic-routing.md:65–69`), `TASK_BRIEF.md` (`base_sha`, allowed write-set), และบันทึก `dispatch-receipt` |
| **ข้อห้ามสำคัญ** | ห้ามรัน 2 Worktree แก้ไขไฟล์ชุดเดียวกันพร้อมกันโดยไม่จัดลำดับ Dependency ใน `IMPLEMENTATION_PLAN.md` | ห้ามสลับ Persona ใน Agent ตัวเดิมแล้วอ้างว่าเป็น Independent Verifier และห้ามทิ้ง Child ข้าม Turn โดยไม่มีการรอรับผลใน Turn เดียวกัน |

---

### 4.3 Multi-Surface Tiered Review Policy & Nitpick Cap (แก้ `F-05`)

ปรับปรุงให้สอดคล้องกันทั้ง 4 ไฟล์ (`docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`, และ `.agents/skills/code-review-gate/SKILL.md`):

1. **Three Mandatory Review Passes (อิง `REVIEW.md` จากบทความต้นฉบับ)**:
   - `[Pass 1: Bugs & Logic]` — ข้อผิดพลาดทางตรรกะ, Edge cases พัง, Regression จากการแก้ไข
   - `[Pass 2: Security & Trust]` — Auth/Authz gaps, Injection, Secrets/PII รั่วไหล, การลดทอน Guardrails
   - `[Pass 3: Spec & Plan Compliance]` — ความตรงกันกับ AC, `SPEC.md` / `SDD.md`, และ `IMPLEMENTATION_PLAN.md`
2. **การจัดลำดับผลลัพธ์และอำนาจการบล็อก (Decision Tiers)**:
   - **Tier 1 — Blocking Findings (`Critical` / `Major`)**: กระทบพฤติกรรม ความปลอดภัย ความถูกต้องของข้อมูล หรือขัดกับ AC → `Blocks Progress? = Yes` ต้องแก้ไขก่อนผ่าน Gate
   - **Tier 2 — Human Architecture / Business Judgment Required**: ประเด็น Trade-off เชิงสถาปัตยกรรมหรือความหมายทางธุรกิจที่เกินอำนาจ AI → **`Blocks Progress? = Yes` (หยุดที่ Human Approval Gate)** พร้อมสรุปทางเลือกให้มนุษย์ตัดสินใจโดยไม่ต้องไล่อ่านโค้ดทีละบรรทัด
   - **Tier 3 — Non-blocking Nits (`Minor` ด้านสไตล์ การตั้งชื่อ หรือการจัดรูปแบบที่ไม่กระทบพฤติกรรม/ความปลอดภัย/AC)**:
     - `Blocks Progress? = No` เสมอ
     - **Nitpick Cap = สูงสุดไม่เกิน 5 ข้อต่อหนึ่งรอบการรีวิว (per review round)** อิงค่ามาตรฐานจากบทความต้นฉบับหัวข้อ *AI in the PR review loop*
     - หากพบเกิน 5 ข้อ ให้แสดงเฉพาะ 5 ข้อที่มีประโยชน์สูงสุด และสรุปส่วนที่เหลือเป็นตัวเลขบรรทัดเดียว: `Suppressed Nits Count: +N additional style/naming observations omitted per 5-nit cap.`
3. **กฎเหล็กป้องกันการลดระดับ (Strict Anti-Downgrade Rule) และขอบเขต Re-review**:
   - **ห้าม** จัดประเภทข้อผิดพลาดทางตรรกะ ช่องโหว่ความปลอดภัย การขาดชุดทดสอบที่บังคับ หรือการไม่ตรงตาม AC เป็น `Nit` เพื่อหลบเลี่ยงการบล็อกหรือเพื่อให้ไม่เกินเพดาน 5 ข้อโดยเด็ดขาด
   - ข้ามการรายงานไฟล์ที่สร้างอัตโนมัติ (Generated files) และสิ่งที่ CI ตรวจสอบแบบ Deterministic อยู่แล้ว
   - คงกฎ **Scoped Re-review** ของ `docs/workflow/task-execution-mode.md:48–58` ทุกประการ (รอบตรวจซ้ำรับเฉพาะข้อค้นพบเดิมและ Regression ที่เกิดจากการแก้รอบล่าสุดเท่านั้น โดยจำกัด `task_review_rework_count <= 2`)

---

### 4.4 Mathematical, Data-Authority & CLI Specification สำหรับ `scripts/validate-metrics.mjs` (แก้ `F-02`, `F-04`, `F-06`)

#### 4.4.1 แหล่งข้อมูลและสูตรคำนวณ (Data Sources & Exact Formulas)

1. **โหมด `--source structured` (ค่าเริ่มต้นเมื่อใช้ `--check-thresholds` หรือ `--emit-intent`)**:
   - **Timeout / Uncompleted Dispatch Rate**:
     - ตัวตั้ง (`timeouts`): จำนวนใบรับงานใน `docs/records/dispatch-receipts/*.yaml` ที่มี `state === 'expired'` บวกกับระเบียนใน `docs/records/workflow-evidence/**/*.jsonl` ที่มี `outcome_status === 'timed_out'` (ตัดรายการซ้ำด้วย `event_id` / `handoff_event_id`)
     - ตัวหาร (`dispatchTotal`): จำนวนใบรับงานทั้งหมดใน `docs/records/dispatch-receipts/*.yaml` ที่อยู่ในสถานะปลายทาง (`consumed`, `expired`, `cancelled`) หรือระเบียน `workflow-evidence` ที่สมมูลกัน
     - อัตราส่วนดิบ (`timeoutRatio`): `timeouts / dispatchTotal` (คำนวณเมื่อ `dispatchTotal >= minSamples`)
   - **Lifecycle Rework Rate**:
     - ตัวตั้ง (`reworkedItems`): จำนวน Work Item Shards ใน `docs/records/work-items/**/task-state.json` (รวม `archive/**`) ที่มี `rework_count > 0`
     - ตัวหาร (`evaluatedItems`): จำนวน `task-state.json` ที่ถูกต้องตาม Schema ทั้งหมดที่ตรวจพบ
     - อัตราส่วนดิบ (`reworkRatio`): `reworkedItems / evaluatedItems` (คำนวณเมื่อ `evaluatedItems >= minSamples`)
   - **ข้อดี**: อ่านจากฟิลด์โครงสร้างที่ผ่าน JSON Schema / YAML Validator แล้ว 100% จึง **ไม่เกิด False Positive จากประโยคปฏิเสธ เช่น `"No timeout; no rework required."`** และไม่เพี้ยนตามจำนวนแถวการเขียนบันทึกใน `TASK_LOG.md`
2. **โหมด `--source legacy-task-log` (Historical Compatibility Mode)**:
   - ใช้ตัวนับ `TASK_LOG.md` เดิมเพื่อความเข้ากันได้ย้อนหลังเท่านั้น หากนำไปใช้คู่กับ `--emit-intent` ระบบจะประทับคำเตือนบังคับในไฟล์ร่างว่า:
     `Data Authority: HISTORICAL_COMPATIBILITY_ONLY (keyword projection over TASK_LOG.md; non-authoritative per docs/operating-model/METRICS.md)`

#### 4.4.2 นิยามทางคณิตศาสตร์ของเกณฑ์ Breach และจำนวนตัวอย่างขั้นต่ำ (Threshold Semantics)

เพื่อให้สอดคล้องกับเป้าหมาย `<10%` และ `<15%` ใน `docs/operating-model/METRICS.md:18–19` แบบไม่มีช่องว่างทางคณิตศาสตร์:

- **Minimum Sample Floor (`--min-samples <int>`, ค่าเริ่มต้น `5`)**:
  - หาก `denominator < minSamples` (เช่น `0` รายการบน Branch ที่เพิ่ง `reset:template`) สถานะของตัวชี้วัดนั้นคือ **`INSUFFICIENT_DATA`** (ไม่ถือเป็น `WITHIN_TARGET` และไม่ถือเป็น `BREACH_DETECTED`)
- **Exact Unrounded Comparison (`>=`)**:
  - เปรียบเทียบด้วยค่าทศนิยมจริงก่อนการปัดเศษแสดงผล (`pct`):
    - `timeoutBreach = (dispatchTotal >= minSamples) && ((timeouts / dispatchTotal) >= 0.10)` *(เช่น `1 / 10 = 0.10` ถือเป็น **Breach** เพราะไม่น้อยกว่า 10%)*
    - `reworkBreach = (evaluatedItems >= minSamples) && ((reworkedItems / evaluatedItems) >= 0.15)` *(เช่น `3 / 20 = 0.15` ถือเป็น **Breach** เพราะไม่น้อยกว่า 15%)*

#### 4.4.3 ตารางสัญญา CLI ครบทุกกรณีขอบเขต (Complete CLI Behavior Matrix)

| การเรียกคำสั่ง / สถานการณ์ | พฤติกรรมของไฟล์ (Side Effects) | Stdout / Stderr | Exit Code |
|---|---|---|---|
| `node scripts/validate-metrics.mjs` (ไม่มี flag พิเศษ) | **ไม่เขียนไฟล์ใดๆ** | แสดงตาราง `Framework Metrics Dashboard` รูปแบบเดิมทุกประการ | `0` |
| `--check-thresholds` เมื่อทุกตัวชี้วัดมี `n >= minSamples` และต่ำกว่าเกณฑ์ | ไม่เขียนไฟล์ | แสดงตาราง + `Threshold check: WITHIN_TARGET` | `0` |
| `--check-thresholds` เมื่อไม่มีตัวใด Breach แต่มีบางตัว `n < minSamples` | ไม่เขียนไฟล์ | แสดงตาราง + `Threshold check: INSUFFICIENT_DATA (n=<actual>, min=<minSamples>)` | `0` |
| `--check-thresholds` เมื่อพบ Breach อย่างน้อย 1 ตัวชี้วัด | ไม่เขียนไฟล์ (หากไม่ระบุ `--emit-intent`) | แสดงตาราง + รายละเอียดตัวชี้วัดที่ Breach ทาง `stderr` | `1` |
| `--emit-intent <path>` เมื่อ **ไม่พบ Breach** (`WITHIN_TARGET` หรือ `INSUFFICIENT_DATA`) | **ไม่สร้างไฟล์** | พิมพ์แจ้งเหตุผลชัดเจน: `No intent draft emitted: status is <STATUS>.` | `0` |
| `--emit-intent <path>` เมื่อ **พบ Breach 1 หรือหลายตัวชี้วัด** และไฟล์ปลายทางยังไม่มีอยู่ | สร้างโฟลเดอร์แม่ (ถ้ายังไม่มี) และเขียน **ไฟล์ร่างใบเดียวที่รวมทุก Breach ไว้ด้วยกัน** | พิมพ์พาธไฟล์ที่สร้างและค่า `Intent-Fingerprint` | `0` (หรือ `1` ถ้าระบุ `--check-thresholds` ร่วมด้วย) |
| `--emit-intent <path>` รันซ้ำบนข้อมูลชุดเดิม (ไฟล์ปลายทางมี `Intent-Fingerprint` ตรงกัน) | **Idempotent No-op** (ไม่เขียนซ้ำหรือสร้างไฟล์ขยะเพิ่ม) | `Intent draft unchanged (fingerprint match: sha256:...).` | `0` (หรือ `1` ถ้าระบุ `--check-thresholds` ร่วมด้วย) |
| `--emit-intent <path>` เมื่อไฟล์ปลายทางมีอยู่แล้วแต่เนื้อหา/Fingerprint ต่างจากเดิม และ **ไม่ได้ระบุ `--force`** | **ห้ามเขียนทับเด็ดขาด (Fail-closed)** | `Error: Refusing to overwrite existing file <path> without --force.` ทาง `stderr` | `2` |
| `--emit-intent <path> --force` เมื่อไฟล์ปลายทางมีอยู่แล้ว | เขียนทับไฟล์ปลายทางด้วยร่างใหม่ | พิมพ์ยืนยันการอัปเดตไฟล์และ Fingerprint ใหม่ | `0` (หรือ `1` ถ้าระบุ `--check-thresholds` ร่วมด้วย) |
| Flag ไม่รู้จัก, `--emit-intent` ไม่ระบุ `<path>`, `--min-samples` ไม่ใช่จำนวนเต็มบวก, พาธเป็นโฟลเดอร์ หรือเขียนไฟล์ไม่ได้ (`EACCES`) | **ไม่เขียนหรือแก้ไขไฟล์ใดๆ** | พิมพ์ข้อความ Error ที่ระบุสาเหตุชัดเจนทาง `stderr` | `2` |
| ไฟล์ข้อมูล Structured JSON/YAML เสียรูป (Malformed Data) ในโหมด `--source structured` | **ไม่เขียนไฟล์ร่างจากข้อมูลที่พัง** | พิมพ์พาธไฟล์ที่เสียรูปทาง `stderr` (`DATA_ERROR`) | `2` |

#### 4.4.4 ขอบเขตการกำกับดูแลของร่าง `INTENT.md` ที่สร้างขึ้น (Governance & Triage Contract)

ไฟล์ร่างที่สร้างจาก `--emit-intent` จะมีหัวกระดาษบังคับดังนี้:
- `Status: draft (advisory — requires Human Maintainer triage; never auto-dispatches)`
- `Triage Owner: Human Maintainer / Orchestrator Intake` (`Fix now` | `Schedule as Issue` | `Dismiss with reason`)
- `Source Commit: <git HEAD sha>` · `Intent-Fingerprint: sha256:<deterministic-digest>`
- การทำงานนี้เป็น **CLI แบบเรียกใช้ตามคำสั่ง (Operator / Scheduled-CI Advisory Job)** เท่านั้น ไม่มีการปลุก Agent ข้าม Turn อัตโนมัติ เพื่อให้สอดคล้องกับขอบเขต In-Turn Supervision (`docs/workflow/dynamic-routing.md:65–69` และ GitHub Issue #35)

---

## 5. User Stories, Acceptance Criteria (v2) & Complete Verification Traceability Matrix

### 5.1 Revised Acceptance Criteria (v2)

- **AC-001 (Compressed Templates & Canonical Equivalence)**: สร้าง `docs/templates/INTENT.md` และ `docs/templates/SPEC.md` โดยคงแม่แบบเดิมทั้ง 34 ไฟล์ไว้ทั้งหมด พร้อมระบุตารางความสมมูล (Equivalence Mapping) กับ `REQUIREMENT_DISCOVERY.md` และ `SDD.md` รวมถึงกฎ Source-of-Truth Linkage
- **AC-002 (Risk-Based Eligibility, Contract Fast-Track & Parallel Worktree Boundary)**:
  1. อัปเดต `docs/workflow/dynamic-routing.md` เพิ่ม **6-Gate Compressed Route Eligibility & Exit Matrix** และตารางตัดสินใจ **Parallel Worktree Sessions vs. In-Session Scoped Subagents** (ปิดช่องว่าง `G-04`)
  2. อัปเดต `docs/contracts/new-feature-workflow.yaml` เพิ่มทางเลือก `discovery -> planning` เฉพาะเมื่อ `when: { risk_level: low }` พร้อมหลักฐาน `compressed_spec_reference`
  3. บันทึก ADR ใน `DECISIONS.md` อธิบายเหตุผลการจำกัด Contract Fast-track เฉพาะ `risk_level: low` และการคง Human/Security Gates
  4. รัน `npm run repin:source-matrix` (หากแตะไฟล์ใน source matrix) และ `npm run validate:context-budget` ผ่านภายใต้เพดานทุก Tier
- **AC-003 (Multi-Surface Tiered Review & 5-Nit Cap)**: อัปเดตสอดคล้องกันทั้ง 4 จุด (`docs/workflows/code-review-gate.md`, `docs/templates/CODE_REVIEW_FINDINGS.md`, `docs/templates/TASK_REVIEW.md`, และ `.agents/skills/code-review-gate/SKILL.md`) ให้รองรับ 3 Review Passes (`Bugs`, `Security`, `Compliance`), แยก `Blocking` / `Human Judgment Required (Blocks until Human Gate)` / `Non-blocking Nit`, กำหนดเพดาน **Nit สูงสุด 5 ข้อต่อรอบรีวิว** พร้อมช่องสรุปยอดส่วนเกิน, ห้ามลดระดับ Defect เป็น Nit, และรักษากฎ Scoped Re-review เดิม
- **AC-004 (Structured Metrics Threshold Check & Safe Intent Draft CLI)**: ปรับปรุง `scripts/validate-metrics.mjs` และ `docs/operating-model/METRICS.md` ตามสัญญาในหัวข้อ `4.4` ครบถ้วน (รองรับ `--source structured|legacy-task-log`, `--check-thresholds`, `--min-samples`, `--emit-intent <path>`, `--force`; ใช้เกณฑ์จริงไม่ปัดเศษ `>= 0.10` / `>= 0.15`; แยก `INSUFFICIENT_DATA` ออกจาก `0%`; ป้องกันการเขียนทับและป้องกันสร้างซ้ำด้วย `Intent-Fingerprint`; และการรันปกติไม่มี flag ยังคงแสดงผลเดิมและ `exit 0`) พร้อมบันทึก Code Review Record ใน `docs/records/qa/*-code-review.md` ตามกฎ `validate:review-gate`
- **AC-005 (Roadmap Integration & Honest Enforcement Boundaries)**: อัปเดต `ROADMAP-SDLC-FRAMEWORK.md` เชื่อมโยง 6 Stages ของ Anthropic Playbook เข้ากับ Milestones `M1–M4` ของ Issue #298 พร้อมระบุตาราง **5-Layer Hook Enforcement Boundary** และแยก Live LLM Behavioral Evals / Cross-turn Control-Band Automation ไว้ในระยะ M3/M4 อย่างชัดเจน
- **AC-006 (Full Regression & Gate Verification)**: ผ่านชุดทดสอบใหม่ทั้งหมด (`TC-001`–`TC-012`) และชุดตรวจมาตรฐานของโปรเจกต์ครบถ้วน (`npm test`, `npm run validate:contracts`, `npm run validate:context-budget`, `npm run validate:context-compatibility`, `npm run validate:review-gate`, `npm run validate:root-doc-links`, `npm run validate:ci-parity`, `npm run validate:project-state`)

---

### 5.2 Complete Test & Evidence Traceability Matrix (`TC-001` – `TC-012`)

| Test ID | AC ที่รองรับ | ประเภทการตรวจ | สถานการณ์ทดสอบ (Scenario & Boundary Condition) | ผลลัพธ์ที่ต้องสังเกตได้ (Measurable Expected Result) |
|---|---|---|---|---|
| **TC-001** | AC-004 | Unit + CLI | รัน `node scripts/validate-metrics.mjs` แบบปกติไม่มี flag | Stdout แสดงตารางเดิมครบทุกบรรทัด, `exit 0`, ไม่มีไฟล์ถูกสร้างหรือแก้ไข |
| **TC-002** | AC-004 | Unit (BVA) | ทดสอบค่าขอบเขตพอดีเกณฑ์บน Structured Evidence (`n = 20`: timeout `2/20 = 10.0%` vs `1/20 = 5.0%`; rework `3/20 = 15.0%` vs `2/20 = 10.0%`) และกรณีปัดเศษลวง (`19/200 = 9.5%` vs `29/200 = 14.5%`) | `10.0%` timeout และ `15.0%` rework ถูกตัดสินเป็น `BREACH_DETECTED` (`>= 0.10`, `>= 0.15`); ส่วน `9.5%` และ `14.5%` เป็น `WITHIN_TARGET` (ไม่ปัดเศษขึ้นก่อนเทียบ) |
| **TC-003** | AC-004 | Unit (Negation & Empty) | ทดสอบ `INSUFFICIENT_DATA` เมื่อ `n = 0` หรือ `n = 4 (< 5)` และทดสอบข้อความปฏิเสธ `"No timeout; no rework required."` ในโหมด `structured` | คืนสถานะ `INSUFFICIENT_DATA` (ไม่รายงานว่า `WITHIN_TARGET` และไม่ปล่อยร่าง `intent.md`); โหมด `structured` ไม่เกิด False Positive จากข้อความใน Notes |
| **TC-004** | AC-004 | CLI Integration | รัน `--check-thresholds` ใน 3 สถานะ (`WITHIN_TARGET`, `INSUFFICIENT_DATA`, `BREACH_DETECTED`) | `exit 0` สำหรับ 2 กรณีแรกพร้อมพิมพ์สถานะชัดเจน; `exit 1` สำหรับ `BREACH_DETECTED` พร้อมรายละเอียดทาง `stderr` |
| **TC-005** | AC-004 | CLI Integration | รัน `--emit-intent <path>` เมื่อ (ก) ไม่พบ Breach และ (ข) พบ Breach พร้อมกันทั้ง Timeout และ Rework | (ก) ไม่สร้างไฟล์และ `exit 0`; (ข) สร้างไฟล์ร่าง **1 ไฟล์รวมทุก Breach** ที่มีหัวข้อ `Problem`, `Proposed outcome`, `Constraints`, `Status: draft (advisory)`, `Source Commit`, และ `Intent-Fingerprint` ครบ |
| **TC-006** | AC-004 | CLI Safety & Idempotency | รัน `--emit-intent <path>` ซ้ำบนข้อมูลเดิม, รันทับไฟล์ที่เนื้อหาต่างโดยไม่มี `--force`, และรันพร้อม `--force` | รันซ้ำข้อมูลเดิมได้ `NO_OP_DUPLICATE` (`exit 0`); รันทับไฟล์เนื้อหาต่างโดยไม่มี `--force` ถูกปฏิเสธด้วย `exit 2` และไฟล์เดิมไม่เปลี่ยน; รันพร้อม `--force` อัปเดตสำเร็จ |
| **TC-007** | AC-004 | CLI Negative / Error | ส่ง Flag ไม่รู้จัก (`--bogus`), `--emit-intent` ไม่ใส่พาธ, `--min-samples 0`, พาธชี้ไปที่ Directory, หรือไฟล์ Structured JSON เสียรูป | ทุกกรณีคืนค่า `exit 2` พร้อมข้อความ Error เฉพาะเจาะจงทาง `stderr` และไม่ทิ้งไฟล์ขยะ |
| **TC-008** | AC-002 | Contract Test | ทดสอบ `validateContracts()` กับ `new-feature` ที่ข้าม `discovery -> planning`: (ก) `risk_level: low` พร้อม `compressed_spec_reference` และ (ข) `risk_level: medium` หรือ `high` | (ก) **ผ่าน** (`errors = []`); (ข) **ถูกบล็อก** ด้วยข้อความ `requires evidence risk_level to equal "low"` (พิสูจน์ว่างานความเสี่ยงกลาง-สูงข้าม `SDD.md` ไม่ได้) |
| **TC-009** | AC-001, AC-002 | Policy / Schema Check | ตรวจความครบถ้วนของ `INTENT.md`, `SPEC.md`, 6-Gate Eligibility Matrix, Parallel Worktree vs Subagent Table, และตรวจ `adr:audit` + `validate:context-budget` | แม่แบบเดิม 34 ไฟล์อยู่ครบ, ADR ผ่าน `npm run adr:audit`, และทุก Tier ผ่าน `npm run validate:context-budget` |
| **TC-010** | AC-003 | Review Policy Check | ตรวจความสอดคล้องของทั้ง 4 ไฟล์รีวิว (`code-review-gate.md`, `CODE_REVIEW_FINDINGS.md`, `TASK_REVIEW.md`, `code-review-gate/SKILL.md`) พร้อมตัวอย่างจัดประเภท Blocker / Human Decision / 6 Nits (แสดง 5 + ซ่อน 1) | ทั้ง 4 ไฟล์ใช้กติกา 3 Passes, Nit Cap = 5, กฎ Anti-Downgrade, และ Scoped Re-review ตรงกันทั้งหมด |
| **TC-011** | AC-004 | Review Gate CI | รัน `npm run validate:review-gate` เมื่อมีโค้ด `.mjs` เปลี่ยนแปลงใน Slice 3 | `PASS` โดยมีไฟล์ `docs/records/qa/*-code-review.md` จากผู้ตรวจอิสระแนบใน Diff เดียวกัน |
| **TC-012** | AC-005, AC-006 | Full Suite & Links | รัน `npm run validate:root-doc-links`, `npm run validate:context-compatibility`, `npm run validate:ci-parity`, `npm run validate:project-state`, และ `npm test` | ทุกคำสั่ง `exit 0` ผ่าน 100% โดยไม่มี Regression ต่อชุดทดสอบเดิม 801 ข้อ |

---

## 6. การวัดผลความสำเร็จระดับผู้บริหาร (Executive Measurement Framework)

แทนที่จะใช้ค่าประมาณขนาดไฟล์ `validate:context-budget` (`chars / 4`) มาอ้างเป็นตัวชี้วัดประสิทธิภาพ แผนรุ่น v2 กำหนดวิธีวัดผลหลังเริ่มทดลองใช้งาน (Pilot) จากข้อมูลจริงใน Git และ PR History ตามแนวทางของบทความต้นฉบับดังนี้:

1. **Spec Lead Time (Leading Indicator — Stage 1 & 2)**:
   - วัดระยะเวลาระหว่าง Commit แรกของ `INTENT.md` (หรือวันที่เปิด Issue) จนถึงเวลาที่ได้ป้าย `status:spec-ready` พร้อม `SPEC.md` / `IMPLEMENTATION_PLAN.md`
2. **Post-Plan Spec Stability (Lagging Indicator — Stage 2 & 3)**:
   - นับจำนวนครั้งที่ `SPEC.md` หรือ `SDD.md` ต้องถูกแก้ไข **หลังจาก** เริ่มเขียนโค้ดแล้ว (`git log` ของไฟล์ Spec หลัง Commit แรกของโค้ดใน PR เดียวกัน เป้าหมายคือลดลงเข้าใกล้ 0)
3. **Human Review Noise Ratio & Turnaround (Stage 5)**:
   - สัดส่วนข้อค้นพบที่เป็น `Blocking / Important` เทียบกับ `Nit` ต่อรอบรีวิว (รับประกัน Nit ไม่เกิน 5 ข้อต่อรอบ) และระยะเวลารอตรวจรับใน `phase:human-review`
4. **Structured Rework & Timeout Trend (Stage 6)**:
   - ติดตามจาก `node scripts/validate-metrics.mjs --source structured` เมื่อจำนวนงานสะสมใน Pilot ถึงเกณฑ์ขั้นต่ำ (`n >= 5`)

---

## 7. จุดขออนุมัติจากผู้บริหาร / Human Maintainer ก่อนเริ่มพัฒนา (Required Approvals)

ตามกฎ [`docs/workflow/core-bootloader.md#2-human-approval-gates`](../../workflow/core-bootloader.md) และ [`docs/workflows/stabilize-core.md`](../../workflows/stabilize-core.md) เอกสารฉบับนี้หยุดรอการตัดสินใจจาก Human Maintainer ใน 3 ประเด็นนโยบายที่ได้ขจัดความกำกวมครบหมดแล้วดังนี้:

1. **อนุมัติเกณฑ์ Compressed Route & Contract Fast-Track (Slice 1)**: เห็นชอบให้ใช้ตารางคัดกรอง 6 ข้อ (หัวข้อ `4.1`) และอนุญาตทางลัด `discovery -> planning` ใน `new-feature-workflow.yaml` เฉพาะ `when: { risk_level: low }` พร้อมบันทึก ADR หรือไม่
2. **อนุมัติกติกา Multi-Surface Review Policy & Nit Cap = 5 (Slice 2)**: เห็นชอบให้ใช้โครงสร้าง 3 Passes และเพดาน Nit สูงสุด 5 ข้อต่อรอบรีวิว (ตามค่าอ้างอิงจากบทความต้นฉบับ) ครอบคลุมทั้ง 4 ไฟล์รีวิวหรือไม่
3. **อนุมัติสัญญา CLI และสมการเกณฑ์ `>= 10%` / `>= 15%` บน Structured Evidence (Slice 3)**: เห็นชอบให้พัฒนาฟีเจอร์ช่วยสร้างร่าง `INTENT.md` แบบ Advisory (`Status: draft`, `min-samples = 5`, ไม่เปลี่ยน Route อัตโนมัติ) ผ่านกระบวนการ Developer TDD → Independent Review/QA หรือไม่

เมื่อได้รับการยืนยันจาก Human Maintainer แล้ว จึงจะติดป้าย `status:spec-ready` และดำเนินการพัฒนาทีละ Slice ตามแผนปฏิบัติการใน [`docs/records/implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v2.md`](../implementation-plan/2026-11-05-issue-303-ai-native-sdlc-plan-v2.md) ต่อไป
