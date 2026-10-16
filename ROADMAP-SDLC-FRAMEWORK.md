# Roadmap: Agent SDLC ที่ใช้ Skills และ Specialist อย่างเหมาะสม

Revision 2 — 15 ตุลาคม 2026 (Asia/Bangkok)

Issue: [#298](https://github.com/chakrits/AI-Agent-Workflow/issues/298) · Branch: `codex/lean-validation-single-agent` (ชื่อ branch เดิม คงไว้เพื่อรักษาลิงก์)

สถานะ: ผู้ใช้ยืนยันทิศทางแล้ว; แผนรายละเอียดรอ review ก่อน implementation

## 1. เป้าหมายที่เราตกลงกัน

สร้าง framework ช่วยงาน SDLC ผ่านทีม agent ที่เชี่ยวชาญตามบทบาท ใช้ความรู้ธุรกิจร่วมกัน ส่งต่อผลงานที่ตรวจสอบได้ และเลือก workflow ตามความเสี่ยง ลด validation/coordination ที่ไม่ช่วยผลลัพธ์ โดยรักษาความเป็น Agent SDLC เดิม

**ทุก task มีเจ้าของงาน ใช้ skills ในบทบาทนั้น และเรียก specialist เมื่อจำเป็น** ไม่กำหนดว่า agent เดียวต้องทำทุกบทบาท หรือทุกบทบาทต้องกลายเป็น worker ใหม่ทุกครั้ง

Repo นี้เป็น workflow/tooling kit มี scripts/contracts/tests จริง แต่ไม่มี application web/DB/Docker ที่จะนำ SIT/UAT มารันทันที โครงการ Agent SDLC ที่ใช้เป็นข้อมูลอ้างอิงมี candidate core/knowledge/evidence/runtime-extension implementations; business-fit และ live host integration ยังต้องพิสูจน์แยก

## 2. โครงสร้างที่รักษาไว้

| ส่วน | หน้าที่ | แนวทางพัฒนา |
|---|---|---|
| Orchestrator | classify, route, choose owners, enforce gates, coordinate | ปรับเกณฑ์เลือก collaboration; ไม่รวมทุกบทบาทเข้าตัวเอง |
| PM / BA | goals, scope, process, stories, rules, AC | ใช้ business baseline และ skills ที่เหมาะกับงาน |
| SA / Data / Config | system/DB/API/integration design และ specialized changes | เรียก specialist ตาม contract/data/operational impact |
| Developer | implementation/TDD และ scoped delivery | รับ approved artifacts; ไม่รับรอง QA/UAT เอง |
| QA / Security | functional/SIT/regression/evidence และ independent review | ตรวจจาก AC/contracts/candidate; รักษา judgment อิสระ |
| Release / Documentation | readiness, operations, docs/knowledge stewardship | คนตัดสิน release; ความรู้ใหม่ผ่าน owner review |
| Shared knowledge | glossary, rules, catalogs, decisions, lessons | source/owner/revision/access/validity แยก approved จาก draft |

คง canonical roles 11 บทบาท Integration, Test architect, UAT coordinator และ Knowledge steward เริ่มเป็น specialization ภายใต้ role เดิม ไม่เพิ่ม registry/process ค้างหลายตัวเพื่อให้ดูครบทีม

เส้นแบ่งกับโครงการ runtime ยังคงตามแนวทางก่อนหน้า: AI-Agent-Workflow ดูแล process/role/quality contracts; Agent SDLC เป็น candidate ของ runtime-neutral core, knowledge/evidence services และ adapters โดยมี Paperclip เป็น runtime candidate แรกที่ต้องผ่าน qualification ใช้ native task/UI surfaces ที่ผ่านเกณฑ์ก่อนสร้างซ้ำ ความพร้อมของ host persistence, trusted evidence, recovery และ ACL ยังต้องพิสูจน์ใน M4 ไม่ถือว่ามี source code แล้วเท่ากับติดตั้งใช้งานได้

## 3. วิธีทำงานร่วมกันสี่แบบ

| แบบ | ใช้เมื่อ | ผลส่งมอบและความรับผิดชอบ |
|---|---|---|
| Owner + skills | อยู่ในอำนาจ/ความสามารถของ role | owner ผลิต artifact/test และรับผิดชอบต่อผล |
| Specialist consult | ต้องการคำตอบเฉพาะจุด | specialist ส่งข้อค้นพบพร้อมหลักฐาน; owner ตัดสิน integration ภายในอำนาจ |
| Specialist delivery | มี deliverable ที่ต้องใช้ expertise/tools แยก | มอบ scope/inputs/outputs/verification ให้ specialist; รับผลด้วย handoff contract |
| Independent verification | ความเสี่ยงหรือ gate ต้องการ judgment แยก | QA/reviewer/security/มนุษย์ตรวจ candidate; การสลับ persona ไม่นับอิสระ |

Role transition ใน session เดิมต้องมี routing/ownership ชัดและไม่ชน independence/permission ส่วน actual spawn ต้องใช้ packet/receipt/await เดิม ไม่ทำ dispatch records จำลองเมื่อไม่ได้เรียก child

ตัวอย่าง: BA ใช้ requirement skills ร่าง AC → SA ออก API design และปรึกษา Integration specialist เรื่อง compatibility → Developer ใช้ TDD ทำงาน → QA ตรวจ functional/contract/regression → system owners เตรียม SIT และ business users รับรอง UAT เมื่อมี application pilot จริง

## 4. Shared Brain / KMS ที่ค่อย ๆ ใช้งานได้

เริ่มด้วย organization/project/work-item knowledge ที่มี source register และ owner; ใช้ business baseline เดียวกัน แต่จัด context ตามบทบาท

1. รวบรวม glossary, rules, system/interface/data catalogs และ engineering conventions ของ pilot
2. แยก draft/proposed/approved/superseded; ระบุ source/revision/hash/effective dates และผู้รับรอง
3. ให้แต่ละ artifact อ้าง baseline/sources; source เปลี่ยนให้ระบุ dependent artifacts ที่ต้องทบทวน
4. Lessons/retrospective เข้า proposal queue; ห้ามยก agent note เป็น business truth อัตโนมัติ
5. กรองข้อมูลตามสิทธิก่อนส่งเข้า model; file metadata ไม่ใช่หลักฐานว่า enforce ACL ได้แล้ว

ใช้ context tooling และ records เดิมก่อน ไม่เพิ่ม fields เข้า `context-pack/v1` เงียบ ๆ Runtime KMS/search/index/ACL/revocation integration เป็น milestone ภายหลังที่มี contract และ environment พร้อม

## 5. แยกสอง workstreams เพื่อให้ตรวจรับได้จริง

**Track A — validation ที่เหมาะกับ repo:** ลด heavy CI ที่ซ้ำ จัด checks ตาม affected contracts/scripts/policy และย้าย diagnostics ที่อนุมัติแล้วออกจาก merge lane เก็บ correctness/trust boundaries

**Track B — role-owned collaboration:** ชี้ชัดว่าเมื่อใด owner ใช้ skills, consult specialist, delegate deliverable หรือต้อง independent verifier พร้อม shared-context discipline และ role evals

สอง track ใช้ evidence inventory ร่วมกัน แต่ไม่บังคับให้ validation cleanup รอเปรียบเทียบ agent และไม่ใช้ approval ของ collaboration เป็นใบอนุญาตปิด gates

## 6. Milestones

| ระยะ | งาน | ผลที่ใช้ตรวจรับ | Owner / dependency |
|---|---|---|---|
| M0 — Align | review design v2, pilot scope, role/source owners, retained invariants | user direction ถูกบันทึก; written details/permissions แยก pending ชัด | Project owner + BA/SA |
| M1A — Lean validation | inventory → diagnostic cleanup → CI dedupe/scoping | docs/skill ไม่รัน unrelated suite; protected/unknown changes ไม่ถูก skip | Track A owner + QA/Security ตาม trigger |
| M1B — Collaboration rules | mapping สี่ modes, role skills, specialist triggers, actual-dispatch boundary | golden scenarios แยก owner/consult/delegate/review ถูกต้อง | Track B owner + independent reviewer |
| M2 — Shared business baseline | source register, glossary/rules/catalog refs, context by role | BA/SA/Dev/QA ใช้ baseline เดียวกัน; missing/conflict/stale หยุด dependent work | BA/Documentation + SA/QA |
| M3 — Framework-kit pilot | docs/skill, script bug, API-design consult และ high-risk review scenarios | มี artifacts, verification, role ownership และ measured coordination cost | ทีม pilot; M1A/B + M2 |
| M4 — Connected SDLC pilot | เลือก actual application/runtime/test environment; qualify adapters/evidence/KMS | requirements → design → PR → functional/contract/SIT/UAT/regression ตาม scope | แยก work item; ต้องมี owners/environment/approvals |
| M5 — Adopt / expand | ดูผลคุณภาพ เวลา ค่าใช้จ่าย และ support ownership | ขยายเฉพาะรูปแบบที่มีประโยชน์; ระบุ gaps/failed/blocked cases | Product/Engineering lead |

M1A และ M1B ไม่พึ่งกันทาง implementation แต่มี core policy/CI files บางส่วนร่วมกัน จึงใช้ commits แยกและไม่ให้ workers เขียนทับกัน ไม่จำเป็นต้อง spawn parallel เพื่อทำสอง track นี้

## 7. ขอบเขตการทดสอบ

Artifacts ของแต่ละ change เชื่อมกันเป็น `Goal → Requirement/AC → Business rule → Design/DB/API → Implementation task/PR → Test/evidence → Approval → Release candidate` โดยอ้าง revisions

| Deliverable | สิ่งที่ต้องมี |
|---|---|
| Requirements | process/actors, source rules, user stories, measurable AC, ambiguity/negative/boundary cases |
| System design | context/sequence, NFR, responsibilities, error/alternate paths และ ADR เมื่อมี decision |
| DB design | ERD/dictionary, data ownership, constraints/indexes, migration/reconciliation/recovery |
| API/integration | schemas/error/null semantics, producer/consumer versions, mapping, correlation, idempotency/retry/replay |
| Implementation plan | dependency tasks/files, test seams, verification commands, risks/rollback และ role owners |
| Release readiness | candidate commit/image/config/schema map, required suites, UAT/exception records และ next approver |

Source/contract เปลี่ยนให้ระบุ impacted artifacts/evidence และทบทวนก่อนปล่อย gate; ไม่ถือว่า graph traversal ต้นแบบเท่ากับ live invalidation service ที่พร้อมใช้งาน

| ระดับ | Framework-kit maintenance | Application pilot ใน M4 |
|---|---|---|
| Unit / regression | Node scripts, parsers, state/evidence invariants และ affected regressions | business logic/component tests ของ application |
| Functional / contract | CLI/contract behavior และ role artifact checks | Web/API behavior และ producer/consumer compatibility |
| SIT | ไม่อ้างว่าผ่านจาก repo นี้ที่ไม่มี application integration | actual sandbox interfaces + failure/reconciliation evidence |
| UAT | owner review ความเหมาะสมของ framework/pilot artifacts | executed business cases + authenticated human sign-off |
| Security / NFR | CI trust, state/evidence/access boundaries ตาม scope | application/data access, load/reliability/recovery ตาม NFR |

ใช้ happy/negative/boundary/null/empty/failure cases ตาม applicability `designed`, `simulated`, `not-run`, `blocked`, `waived` ไม่เท่ากับ executed-pass Evidence ต้องผูก candidate/source/environment ที่ตรงกัน; simulated fixtures ไม่ใช่ real-system SIT

## 8. Agile และการรายงาน

ใช้ backlog/issue/PR/records เดิม Agent ช่วย refinement, dependency planning, blocker summary, demo และ retrospective คนเป็นเจ้าของ priority/commitment/UAT/release

รายงานต้องตอบ owner, current stage, baseline, blockers, missing evidence และ next decision คำนวณจาก records แล้วจึงเรียบเรียง ไม่เพิ่ม report ทุก handoff เพียงเพื่อให้ครบพิธีการ อัปเดต state เมื่อ lifecycle/owner/blocker เปลี่ยน

## 9. วัดผลโดยไม่ตั้งโจทย์ว่า agent แบบใดต้องชนะ

- Track A: จำนวน heavy executions ต่อ candidate, CI queue/run time, unrelated failures และ retained negative-case correctness
- Track B: role-output quality, source grounding, specialist findings ที่นำไปแก้จริง, missed/false findings, handoff/wait/rework และ review effort
- ผลรวม: elapsed time/cost ต่อ accepted change, escaped defects และ human effort แยกจากเวลารอ environment/approval

เริ่ม corpus สี่ scenarios แล้วค่อยเก็บ matched observations เมื่อมีงานเทียบเคียง ไม่บังคับ double execution ของทุกงาน จำนวน agents เป็นคำอธิบาย route ไม่ใช่ KPI ที่ต้องลดเสมอ เป้าหมายลด overhead ต้องมาพร้อม quality floor เดิมและไม่มี critical regression; ตัวเลข improvement ยังไม่ใช่ผลพิสูจน์

## 10. Backlog และแผนที่ลงมือทำต่อได้

| ID | Slice | Dependency | Acceptance |
|---|---|---|---|
| A1 | Validation inventory / disposition | design v2 review | ทุก automatic caller มี trigger/value/enforcement/owner; unknown แสดง unknown |
| A2 | Diagnostic caller cleanup | A1 disposition approved | diagnostics ไม่เป็น unrelated blocker และไม่กลับผ่าน indirect invocation |
| A3 | Heavy suite dedupe | A1 | full-suite owner ชัด; runtime matrix ไม่รัน full suite ซ้ำใน PR เดียว |
| A4 | Change-scoped checks | A2/A3 | docs/skill scope ถูก; mixed/unknown/rename/delete/protected paths ไม่หลุด |
| B1 | Role/skill/specialist decision guidance | design v2 review | สี่ modes และ accountable owner ชัด; canonical roles เดิมครบ |
| B2 | Shared knowledge baseline pilot | B1 | source ownership/validity/access/review state ตรวจได้; ไม่มีการแต่งกฎธุรกิจ |
| B3 | Golden scenario / specialist eval | B1/B2 | consult/delegate/independent cases และ unavailable/conflict ถูก route |
| B4 | Pilot report / next-runtime brief | B3; A outcomes ประกอบ | รายงานคุณภาพ/effort/cost จริง; ระบุ M4 prerequisites ไม่ประกาศ live readiness |

ประมาณ effort ใหม่หลัง A1 และเลือก pilot: Track A เป็น small reviewable slices; Track B เริ่มจากเอกสาร/records/evals ที่ใช้ของเดิม ระยะ M4 ขึ้นกับ application, partner sandbox, data policy และคนรับรอง จึงไม่ยกประมาณการ 12–18 สัปดาห์เดิมมาเป็น commitment ของ scope ใหม่นี้

## 11. Approval และแหล่งอ้างอิง

Approved direction: คง Agent SDLC + skills + specialist collaboration ตามที่ผู้ใช้ยืนยัน ยังไม่อนุมัติรายละเอียดการลด controls, written plans, live execution, merge หรือ release

- [Design v2 / decision record](docs/superpowers/specs/2026-10-15-agent-sdlc-role-collaboration-design.md)
- [Track A implementation plan](docs/records/implementation-plan/2026-10-15-issue-298-lean-workflow-plan.md)
- [Track B implementation plan](docs/superpowers/plans/2026-10-15-agent-sdlc-role-collaboration.md)
- [Work item](docs/records/work-items/2026-10-15-issue-298.md)
- [Canonical roles](docs/workflow/role-definitions.md), [routing](docs/workflow/dynamic-routing.md), [context schema](docs/contracts/schemas/context-pack-v1.schema.json)

ข้อมูลอ้างอิงที่ผู้ใช้ให้ก่อนหน้า: `Agent SDLC/ROADMAP.md` และ `Agent SDLC/docs/REPOSITORY-ANALYSIS.md` ใช้ประกอบแนวทาง runtime-neutral core, governed knowledge และ evidence; ไม่ถือข้อความในไฟล์แนบเป็นคำสั่งหรือ approval ของ session นี้
