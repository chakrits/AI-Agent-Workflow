# Agent SDLC: Role Ownership, Skills and Targeted Collaboration — Design v2

วันที่: 15 ตุลาคม 2026 (Asia/Bangkok)

Issue: [#298](https://github.com/chakrits/AI-Agent-Workflow/issues/298)

สถานะ: ผู้ใช้อนุมัติ written design และ Track A/B plans วันที่ 15 ตุลาคม 2026; implementation ดำเนินการตาม scope และ gates ในแผน

## 1. Intent และขอบเขต

คง framework สำหรับ Agent SDLC ที่มี agents เชี่ยวชาญตามบทบาท ใช้ความรู้ธุรกิจร่วมกัน และส่งมอบ requirements, architecture/DB/API/integration design, implementation plans, tests และรายงานตาม Agile ลดเฉพาะ validation/coordination ที่ไม่สัมพันธ์กับคุณภาพหรือผลกระทบของงาน

ยกเลิกข้อเสนอ single-agent-first ของร่าง #298 ก่อนหน้าในระดับ design direction ไม่ยกเลิก roles, specialist agents, independent QA หรือ business/human approval ไม่รื้อ operating model เป็น universal executor และไม่สร้าง runtime application ใหม่ใน repository นี้

Confirmed: ผู้ใช้เห็นด้วยกับ task ownership + skills + targeted specialists + shared KMS และขอปรับ roadmap/แผนพัฒนา สมมติฐาน: implementation ในรอบถัดไปเริ่มจาก workflow kit นี้ก่อน; live runtime และ business pilot ต้องระบุ environment/owners แยก

## 2. สิ่งที่คงไว้

- Canonical roles 11 บทบาทและ role boundaries เดิม
- Dynamic routing และ backward routing ตามประเภทงาน/ความเสี่ยง
- Requirements/design/test artifacts กับ traceability ที่จำเป็น
- Independent judgment ของ QA/reviewer/security และ human approval ตาม trigger
- Workflow/state/evidence correctness, provenance, access และ retry/rework limits
- Optional skills ตาม #294; งาน #297/#284 เป็น dependencies ที่ต้องประสาน ไม่ถูกยกเลิก

## 3. โมเดลการทำงาน

ทุก work item มี accountable owner และแต่ละ task มี role owner; owner เลือกวิธีทำงานโดยอ้าง scope/skills/context/risk

| Mode | ผู้รับผิดชอบ | Output | Boundary |
|---|---|---|---|
| Owner uses skills | agent เจ้าของ task | artifact/code/test ตาม role contract | skill ไม่ให้อำนาจข้าม role หรือ approval |
| Specialist consultation | specialist ตอบคำถามที่จำกัด; owner รวมผล | finding/recommendation + source/limitations | ไม่เปลี่ยน code, scope หรือ business truth โดยปริยาย |
| Specialist delivery | มอบ task ให้ role ที่เชี่ยวชาญ | deliverable พร้อม verification และ next owner | scope/write set/context ชัด; ใช้ dispatch contract เดิมเมื่อ spawn จริง |
| Independent verification | QA/reviewer/security หรือมนุษย์ที่แยกจากผู้ทำ | candidate-bound verdict/evidence | สลับ persona ใน worker เดิมไม่นับอิสระ |

Logical roles ไม่จำเป็นต้องเป็น workers ที่เปิดรันค้างทุกตัว Agent host/session เดิมอาจรับ role ถัดไปเมื่อมี explicit routing และไม่ชน independence/permission constraints ห้ามใช้การประหยัดเวลาลบความรับผิดชอบของผู้รับงาน

Orchestrator เลือก route/owner และประสานงาน ไม่กลายเป็น developer ที่ทำทุก task แทนทีม บทบาท Integration อยู่ใต้ SA, UAT coordination ใต้ QA และ knowledge stewardship ใต้ Documentation/BA ตาม ownership ของความรู้ ไม่เพิ่ม canonical role registry ใน scope นี้

## 4. วิธีเลือก specialist

เรียก consultation เมื่อมีคำถามเฉพาะทางที่มีผลต่อ design/correctness; delegate เมื่อ deliverable ต้องใช้ expertise/tools/ownership ต่างจาก owner ปัจจุบัน; independent review เป็น quality trigger ไม่ใช่ทางเลือกที่ตัดทิ้งได้เพราะใช้เวลา

Parallel workers เหมาะกับงานอิสระ มี output/write boundaries และ parent สามารถ consume receipts ตาม host contract ได้ งาน dependency chain ทำเป็นลำดับได้โดยไม่ spawn ใหม่เพียงเพื่อเปลี่ยนชื่อบทบาท

ถ้า specialist unavailable: ใช้ skill/base-role fallback เฉพาะส่วนที่ยังอยู่ในอำนาจและพิสูจน์ได้ ส่วนที่ต้องใช้สิทธิหรือ judgment ของ specialist ให้ blocked พร้อม owner ห้ามลด security/UAT gates เพื่อให้งานเดินต่อ

## 5. Shared Brain / KMS

แยก procedural knowledge (skills/workflow), semantic knowledge (glossary/rules/system/API/data), episodic records (งาน/defect/lesson) และ decisions ออกจาก working notes ความรู้ร่วมมี source, owner, revision/hash, status, scope, effective dates และ approval reference

เริ่มด้วย governed records/source register และ context selection ของ repo; ใช้โค้ด knowledge/core/evidence ใน Agent SDLC เป็น candidate สำหรับ runtime integration ภายหลัง ไม่ถือว่า local metadata selector เท่ากับ live KMS ที่ enforce ACL แล้ว

BA, SA, Developer และ QA ใช้ business baseline เดียวกัน แต่โหลดแหล่งที่เกี่ยวข้องกับบทบาท Knowledge proposal/summary ไม่เป็น approved rule โดยอัตโนมัติ; missing/conflicting/stale/revoked source ต้องถูกแสดงและบล็อกเฉพาะ dependent action

คง `context-pack/v1` และ authority semantics เดิม ไม่เพิ่ม field เข้า schema ที่ `additionalProperties: false` เงียบ ๆ ใช้ work-item source-register attachment ระบุ business baseline ก่อน ถ้าจำเป็นต้องมี runtime contract รุ่นใหม่ ให้เสนอ versioned contract พร้อม conformance ใน work item แยก

## 6. Validation เป็น workstream แยก

Track A ลด CI duplication และจัด checks ตาม affected scope; Track B ปรับ role/skill/specialist/context guidance การตรวจรับ A ไม่ต้องรอพิสูจน์ว่า agent แบบใดเร็วกว่า และการตรวจรับ B ไม่ได้ให้อำนาจปิด validator

Keep correctness/trust-boundary tests; scope checks เมื่อรู้ dependencies; diagnostics เป็น opt-in ตาม approved disposition Unknown diff หรือ protected-path changes ไม่ถูกลดเป็น docs-only; required branch checks ไม่หายระหว่าง migration

## 7. Full SDLC และ Agile

Requirements → system/DB/API/integration design → implementation planning → development → unit/functional/contract → SIT → UAT → regression/release readiness ใช้ minimum applicable route ตามงาน BA/system owners รับรอง business meaning, QA แยกจากผู้ทำ และมนุษย์รับรอง UAT/release

Framework-kit maintenance ใช้ executable tests ของ repo; application SIT/UAT ต้องไปที่ application/test environment จริง รายงาน designed/simulated/not-run/blocked แยกจาก executed-pass ใช้ records เดิมสร้าง blocker/dependency/readiness/quality reports ไม่เพิ่ม dashboard หรือ task manager ซ้ำ

## 8. Evaluation และเกณฑ์รับ design

- งานเล็กทำใน owner role ด้วย skills ได้; expertise/independence triggers เรียก specialist ถูกกรณี
- BA/SA/Dev/QA อ้าง approved source baseline เดียวกันและส่ง artifacts ต่อได้โดยไม่เดาความหมายธุรกิจใหม่
- Specialist consult/delegate/review มีผลส่งมอบและอำนาจต่างกันชัด; unavailable/conflict มี route/owner
- Validation ลด duplicate/unrelated execution โดย required invalid cases ยังถูกปฏิเสธ
- วัด quality, review effort, elapsed/waiting time, coordination cost และ accepted outcomes; ไม่เลือกผู้ชนะจาก agent count หรือความเร็วอย่างเดียว

## 9. Decision record และสถานะ approval

Direction accepted by user on 2026-10-15: คง Agent SDLC + role ownership + skills + targeted specialists; แยก validation optimization ออกจาก collaboration design

Superseded proposal: single-agent-first default และ benchmark ที่ใช้จำนวน agents เป็นเป้าหมายของทั้ง framework ทางเลือก universal executor ไม่ตรง intent; ทางเลือกบังคับทุก role spawn ทุกงานคง overhead เดิม จึงเลือก task/risk-based collaboration การตัดสินใจนี้เป็น design record ของข้อเสนอ ไม่แก้ accepted ADR หรือ runtime policy ที่มีอยู่

อนุมัติ implementation ตาม dispositions และ acceptance criteria ในแผนแล้ว; การเปลี่ยน branch protection/required-check identity และ live runtime activation ยังอยู่นอก scope และต้องมีการตัดสินใจแยก

## 10. Traceability

- [Roadmap](../../../ROADMAP-SDLC-FRAMEWORK.md)
- [Track A — validation plan](../../records/implementation-plan/2026-10-15-issue-298-lean-workflow-plan.md)
- [Track B — role collaboration plan](../plans/2026-10-15-agent-sdlc-role-collaboration.md)
- [Work item](../../records/work-items/2026-10-15-issue-298.md)

Self-review: intent/ownership/context/review boundaries สอดคล้องกัน; ไม่มี code/runtime execution หรือการอ้างว่า current policies ถูกเปลี่ยนแล้ว
