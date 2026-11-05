# รายงานสำรวจ: ฐานสำหรับ AI Agent SDLC Framework

วันที่ตรวจ: 15 ตุลาคม 2026 (Asia/Bangkok)  
ผลส่งมอบหลัก: [Roadmap ฉบับเสนอ](../../../ROADMAP-SDLC-FRAMEWORK.md)

## 1. ขอบเขตและวิธีตรวจ

สำรวจ AI-Agent-Workflow ใน workspace ปัจจุบัน พร้อม Agent SDLC ตามตำแหน่งไฟล์แนบ อ่าน ROADMAP และ REPOSITORY-ANALYSIS เดิมครบ จากนั้นเทียบกับโครงสร้าง เอกสารปัจจุบัน implementation ของ core/knowledge/evidence/plugin และตัวอย่าง tests ที่เกี่ยวข้อง

นี่เป็นการสำรวจเพื่อวางแผนเชิง architecture และ adoption ไม่ใช่ exhaustive code/security audit ไม่ได้อ่านทุกบรรทัดทุกไฟล์หรือทดสอบ production ระบบขององค์กร ผู้ใช้ไม่ได้เลือก domain หรือ business workflow ในคำขอครั้งนี้

เนื้อหาไฟล์แนบ รวมทั้งคำยืนยันจาก session เก่าที่บันทึกไว้ เป็นข้อมูลอ้างอิง ไม่ใช่คำสั่งให้ session นี้ติดตั้ง runtime, dispatch agents หรือถือว่า business scope/approval ถูกยืนยันใหม่

| แหล่ง | Baseline ที่ตรวจ | ข้อจำกัด |
|---|---|---|
| AI-Agent-Workflow | HEAD `7ffc76e861f9d78c5d6862db23210b6a4da0f66c`; working tree สะอาดก่อนงานนี้ | ไม่เท่ากับ snapshot `2dca980…` ในรายงานแนบเดิม |
| Agent SDLC | HEAD `090e7ee637af6d55cbeecc31fac33433d769f11f` + working tree ที่ตรวจ | implementation/README/ADRs จำนวนมากเป็น untracked และ design/plan มีการแก้ใน working tree; HEAD ไม่ครอบคลุมสิ่งที่อ่านทั้งหมด |
| Paperclip upstream | เปิด upstream README ผ่านเว็บใน session นี้ | ใช้ยืนยัน positioning โดยรวม; ไม่ได้ install host หรือทำ SDK/plugin compatibility test |

ไม่แก้ไฟล์ของ Agent SDLC และไม่คัดลอก implementation เข้ามาใน repo นี้

## 2. ข้อค้นพบใน AI-Agent-Workflow

### A1 — มี operating model ที่ใช้ต่อได้มาก

พบ role files 11 บทบาท, canonical routing, quality gates, templates, structured handoff และ records จริง ระบบจึงมีมากกว่า prompt persona จุดแข็งคือเลือก minimum safe workflow และย้อนงานกลับตามประเภทปัญหาได้

หลักฐาน: [core bootloader](../../workflow/core-bootloader.md), [roles](../../workflow/role-definitions.md), [routing](../../workflow/dynamic-routing.md), [quality gates](../../workflow/quality-gates.md)

ผลต่อ roadmap: ใช้ role/workflow semantics เป็นฐาน แล้วเติม domain packs และ executable evaluation ไม่เขียนชุดกติกาใหม่ทับทั้งหมด

### A2 — Contract coverage กับ runtime coverage เป็นคนละเรื่อง

ตรวจพบ `bug-fix`, `new-feature`, `config-change`, `data-change` รวมสี่ workflow YAML ขณะที่ README บางส่วนยังสรุปสองชุด ใน `task-state-machine.mjs` มีเงื่อนไขปฏิเสธ durable mutation ของ workflow ที่ไม่ใช่ bug-fix ด้วย `UNKNOWN_WORKFLOW`

หลักฐาน: [contracts](../../contracts), [task state machine](../../../scripts/lib/task-state-machine.mjs), [contract validator](../../../scripts/validate-contracts.mjs)

ผลต่อ roadmap: ทำ conformance matrix ตามชนิดงานและแยก declarative contracts, pure validation, disk mutation และ live execution ไม่ประกาศว่าพร้อมเท่ากันจากจำนวนไฟล์ YAML

### A3 — Context infrastructure มีแล้ว แต่ยังต้องเพิ่ม business knowledge governance

มี context pack schema/source matrix, compatibility checks, role injection และ work-item/lessons/vault records เป็นฐาน provenance/context budgeting ที่ดี ส่วนที่ต้องเพิ่มเพื่อโจทย์นี้คือ source ingestion, business owner approval, validity/conflicts และ retrieval/access services

หลักฐาน: [context schema](../../contracts/schemas/context-pack-v1.schema.json), [context compatibility](../../../scripts/lib/context-compatibility-v1.mjs), [role injector](../../../scripts/inject-role-context.mjs), [records](..), [vault](../../vault/00-Index.md)

ผลต่อ roadmap: แยก approved semantic knowledge ออกจากประวัติงานและ agent notes ไม่โหลด TASK_LOG ทั้งหมดเป็น business context

### A4 — Dispatch policy เดิมยังมีขอบเขต in-turn

Handoff contract และ routing ระบุ invoke/await/consume terminal receipt ใน parent turn เดียว และแยก cross-turn/event-driven control plane เป็นงานออกแบบต่างหาก การต่อ runtime ใหม่จึงต้องมี versioned mapping ไม่อ้างว่าการสร้าง task/wakeup ใช้แทน native wait เดิมได้ทันที

หลักฐาน: [handoff contract](../../workflow/handoff-contract.md), [dynamic routing](../../workflow/dynamic-routing.md)

ผลต่อ roadmap: qualification ของ durable adapter, cancellation/stale outputs และ reconciliation เป็นงานต้นทางก่อนเปิด controlled execution

### A5 — Template และ historical pass ไม่เท่ากับ application test readiness

มี guidance ด้าน functional/API/testing และหลักฐาน QA ใน records แต่ไม่ได้พิสูจน์ว่า framework ทำ SIT/UAT กับ application ใดขององค์กรแล้ว PROJECT_STATUS มีทั้งสถานะล่าสุดและบันทึกประวัติหลายช่วง ต้องอ่านตาม work-item/candidate ไม่สรุปจากคำว่า passed ในย่อหน้าเก่า

หลักฐาน: [functional test design](../../workflows/functional-test-design.md), [project status](../../../PROJECT_STATUS.md), [proportional verification](../../workflow/quality-gates.md#proportional-verification)

ผลต่อ roadmap: ใช้ source-level capability กับ fresh test evidence แยกกัน และไม่ยก deferred/security items ในประวัติเป็น closed จากการสำรวจครั้งนี้

## 3. ข้อค้นพบใน Agent SDLC

เส้นทางในหัวข้อนี้อ้าง working tree ภายนอก workspace ปัจจุบัน

### B1 — Core กับ contracts มี implementation ที่เป็นรูปธรรม

มี schema contracts เจ็ดชนิด; lifecycle แยก `state` เก้าค่าจาก workflow-defined `stageId`; transition evaluator ตรวจ version, expected revision, allowed edge/actor type และ required gate results ส่วน gate evaluator ตรวจ approved artifacts, evidence candidate/environment/suite และ approval revision binding

หลักฐาน: [types](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/contracts/src/types.ts>), [state machine](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/core/src/workflow/state-machine.ts>), [gate evaluator](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/core/src/workflow/gate-evaluator.ts>), [ADR-0003](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/docs/decisions/ADR-0003-state-authority.md>)

ข้อจำกัด: pure evaluator รับ objects/actor/gate results จาก caller จึงต้องมี trusted composition boundary กับ authenticated identity, current data และ durable persistence ก่อนอ้าง enforcement end-to-end นี่เป็น qualification need ไม่ใช่ข้อสรุปช่องโหว่ที่ยืนยันจาก exploitation

### B2 — Knowledge selector เป็น policy filter ที่ดี แต่ยังไม่ใช่ KMS ครบวงจร

ตรวจ `approved`, access decision/reference, scope และ effective interval แบบ end-exclusive; topic ที่มีหลาย applicable sources ถูกประกาศ conflict Manifest เก็บ refs/revisions/access metadata

หลักฐาน: [selector](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/knowledge/src/context-selector.ts>), [source policy](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/knowledge/src/source-policy.ts>), [manifest builder](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/knowledge/src/context-manifest.ts>)

ข้อจำกัด: selector ใช้ metadata/access decision ที่ caller ส่งมา ไม่ได้ query identity provider, ดึง content หรือค้น text/semantic ให้เอง ยังต้องเพิ่ม required-source completeness, actual authorization, content hashing และ revocation/invalidation ใน service ที่เชื่อมจริง

### B3 — Dispatch มี idempotency/receipt design แต่ crash window ต้องพิสูจน์กับ runtime

Coordinator สร้าง key จาก company/work item/workflow/handoff sequence, ตรวจ current revision, ใช้ in-flight map และ receipt store ส่วน SQL store ใช้ unique insert ตาม company/key เมื่อ adapter throw คืน unknown outcome

หลักฐาน: [coordinator](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/core/src/runtime/dispatch-coordinator.ts>), [runtime port](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/core/src/runtime/runtime-adapter.ts>), [receipt store](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/paperclip-extension/src/persistence/dispatch-receipt-store.ts>)

ข้อจำกัด: การเก็บ receipt หลัง runtime รับงานมี failure window ความปลอดภัยเมื่อ retry ขึ้นกับ runtime idempotency/reconciliation การมี SQL class และ restart simulation ไม่พิสูจน์ multi-process/host crash correctness

### B4 — Evidence verification ตรวจ metadata ไม่ได้ดึงผลรันจริงมาตรวจ

Normalizer ตรวจ schema และ verifier เทียบ work item/artifact/revision/commit/environment/suite/outcome/simulation Fixture adapter ตั้ง `simulated: true` แต่ verifier ที่อ่านไม่ได้ fetch raw result, คำนวณ hash หรือ authenticate CI producer

หลักฐาน: [normalizer](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/evidence/src/evidence-normalizer.ts>), [verifier](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/evidence/src/evidence-verifier.ts>), [fixture adapter](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/evidence/src/adapters/fixture-adapter.ts>)

ผลต่อ roadmap: trusted CI ingestion/integrity validation เป็น prerequisite ของ gate ที่จะใช้ evidence จริง ไม่ถือ rawResultHash field เป็นหลักฐานว่าตรวจ bytes แล้ว ชื่อ reason codes ของ verifier กับ core บางส่วนต่างกัน ต้องทำ explicit mapping

### B5 — Plugin เป็นฐาน persistence/reporting ยังไม่ใช่ host qualification

Worker มี system-writer check, context snapshots, approval sync จาก native record และ SQL persistence; panels ระบุว่าเป็น snapshots และ core ต้อง reevaluate gate ส่วน manifest ประกาศ DB/UI/approval-read/event capabilities ยังไม่ใช่หลักฐานของ task dispatch end-to-end

หลักฐาน: [worker](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/paperclip-extension/src/worker.ts>), [manifest](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/paperclip-extension/src/manifest.ts>), [gate panel](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/paperclip-extension/src/ui/gate-evidence-panel.tsx>)

ผลต่อ roadmap: ตรวจ installed-host permissions, UI/data authorization, namespace isolation, migrations, event recovery และ trusted dispatch path ใน restrictive sandbox ก่อนเปิด connected execution

### B6 — Trace impact และ vertical slice ยังจำกัดที่ composition

Impact analyzer เดิน downstream graph แบบ breadth-first และคืน impacted IDs ยังไม่ใช่ graph population/invalidation service ส่วน vertical-slice test ใช้ synthetic config-change, in-memory receipt store และ fixture evidence

หลักฐาน: [impact analyzer](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/core/src/workflow/impact-analyzer.ts>), [vertical slice](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/packages/reference-fixtures/test/vertical-slice.test.ts>)

ผลต่อ roadmap: ใช้เป็น starting seam สำหรับ tests; business-fit, real CI, SIT และ human UAT ต้องพิสูจน์แยก

### B7 — Readiness document ระบุข้อจำกัดตรงกับ source ที่อ่าน

Readiness วันที่ 14 ตุลาคมบันทึก local verification 153 tests และ no-go สำหรับ live execution เพราะ host enforcement/compatibility ยังไม่ verified รวมทั้งยังไม่มี providers/business workflow จริง นี่คือหลักฐานจากเอกสารก่อนหน้า ไม่ใช่ผลทดสอบ 153 ข้อที่รันใหม่ใน session นี้

หลักฐาน: [release readiness](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/docs/RELEASE-READINESS.md>), [README](</Users/maclab/WorkSpace/GitHub Code/Agent SDLC/README.md>)

## 4. ประยุกต์ไฟล์แนบอย่างไร

| แนวคิดในไฟล์แนบ | สิ่งที่คงไว้ | สิ่งที่ปรับในข้อเสนอใหม่ |
|---|---|---|
| Core กลาง + Paperclip-first | แยก policy ออกจาก runtime และใช้ native surfaces ที่ผ่าน qualification | วางแผนจาก code ที่มีแล้วและ accepted state-authority record ไม่เริ่มออกแบบแกนใหม่ทั้งหมด |
| Memory ห้าชนิด / approved knowledge | source/owner/revision/access/validity และ proposal lifecycle | เพิ่ม service boundaries และ required-source completeness/content integrity |
| Full SDLC/evidence | unit → functional/contract → SIT → UAT → regression | วาง trusted evidence ingestion ก่อนใช้ runtime gates จริง |
| 16 สัปดาห์ | ใช้ incremental milestones และ exit criteria | เสนอช่วง 12–18 สัปดาห์แบบมี staffing/access assumptions; re-estimate หลัง baseline review |
| Healthcare/integration examples | ใช้เป็นตัวอย่างปัญหาได้ | ไม่ถือเป็น pilot/domain ที่ยืนยันใน session ปัจจุบัน |
| Role specialization | แยก role/domain/runtime | เพิ่ม promotion ด้วย evaluation และ independent review แทนเพิ่ม persona อย่างเดียว |

## 5. Verification และขอบเขตคำกล่าวอ้าง

### คำสั่งที่รันจริงใน session นี้

```sh
npm run validate:contracts
node --test test/task-state-machine.test.mjs test/context-compatibility.test.mjs test/validate-contracts.test.mjs
```

ผล: contract validation exit 0; focused tests **114 pass, 0 fail, 0 skipped**, exit 0 ชุดนี้ครอบคลุมเฉพาะไฟล์ที่ระบุ ไม่ใช่ full repository regression หรือ independent QA ใน session นี้

Test output มีคำเตือน Ajv ว่า format `date-time` ถูก ignore ใน schema บางเส้นทาง จึงไม่ใช้ผล pass เพื่อยืนยัน timestamp format enforcement ทุกจุด ไม่แก้ปัญหานี้ในงาน roadmap

ไม่ได้รัน Agent SDLC typecheck/tests/build, ไม่ติดตั้ง Paperclip, ไม่ dispatch agent, ไม่เชื่อม real CI/object storage และไม่รัน SIT/UAT ขององค์กร การอ่าน tests ระบุ intended coverage เท่านั้น

การตรวจเอกสาร: ตรวจ local Markdown targets, required roadmap sections, snapshot hashes และ diff whitespace พร้อมบันทึกผลใน Completion Check ด้านล่าง ไม่ใช้การตรวจเอกสารแทน runtime acceptance

### Working-tree source fingerprints

SHA-256 ของไฟล์ที่มีผลต่อข้อสรุป เพื่อแยก source ที่อ่านออกจาก HEAD ซึ่งไม่ครอบคลุม untracked implementation:

| Repository / file | SHA-256 |
|---|---|
| AI-Agent-Workflow / `scripts/lib/task-state-machine.mjs` | `43c49af7bd7d7081fcbc8eee6e322bfdb94c8a554d6a11831bc292e4f4874e09` |
| AI-Agent-Workflow / `docs/workflow/handoff-contract.md` | `d28e61397f1a0a0ebda5f7fc8ec45c6d1b505aa10ce4f26b4c591c0af9a58eaf` |
| Agent SDLC / `ROADMAP.md` | `a01a5382c033683670d393cbe6278a2e6128e6ffc1915fcf5b03fbb19763235e` |
| Agent SDLC / `docs/REPOSITORY-ANALYSIS.md` | `bc452aee2b578ca77e592b282975fc25fd72068f094d8798ff8f2e8e30a330f9` |
| Agent SDLC / `packages/core/src/runtime/dispatch-coordinator.ts` | `623e0aa237199684318e11dea7c85ef1a6942360e11a1ef7e839125ffc2c5c92` |
| Agent SDLC / `packages/knowledge/src/context-selector.ts` | `0c8c91e84c216091db812eb315188dd4c6c57697f43380b2f6a5d67ff68419a7` |
| Agent SDLC / `packages/evidence/src/evidence-verifier.ts` | `6c2a9479ca4c9684b07594b310b86448db9fc9fe70958f8f8e465f809dbcedd7` |
| Agent SDLC / `packages/paperclip-extension/src/worker.ts` | `765b0ae1440a48729b4f75913914c85d68c59b1d14b7096f9eec283dce59baf6` |

### แหล่งเว็บที่เปิดตรวจเพิ่มเติม

[Paperclip upstream README](https://github.com/paperclipai/paperclip), [OpenAPI specification](https://spec.openapis.org/oas/latest.html), [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/v3.1.0) ใช้ประกอบคำแนะนำเรื่อง runtime candidate และรูปแบบ interface contracts; ไม่ได้ตรวจทุก capability ที่เอกสารแนบเดิมอ้างถึงใหม่ผ่านเว็บ

## 6. Completion Check

| Item | Status | Notes |
|---|---|---|
| Claimed status | Draft artifacts produced | งานสำรวจ/roadmap เท่านั้น; ไม่ใช่ implementation approval |
| Workflow / risk | Advisory + documentation / Low mutation risk | ข้อเสนอ architecture มีผลต่อการตัดสินใจในอนาคต ต้อง review ก่อนนำไปใช้ |
| Skills | Applied | requirement-brainstorming, brainstorming, sa-architecture-design, verification-before-completion |
| Source grounding | Checked | แยก workspace source, historical claims, assumptions และ proposed acceptance |
| Automated checks | 114 focused tests + contract validator passed | ไม่ใช่ full suites; มี date-time warning ตามข้างต้น |
| Document checks | Passed | local links 39 targets, required sections/topics และ code fences ผ่าน; fingerprints ตรวจซ้ำครบแปดไฟล์; `git diff --check` และ `npm run validate:project-state` exit 0 |
| Independent review | Not performed | ไม่มี independent approval หรือ QA verdict ของข้อเสนอนี้ |
| PROJECT_STATUS / TASK_LOG | Advisory transition recorded | แยก proposal จาก lifecycle/ประวัติ implementation เดิม |
| DECISIONS / CHANGELOG | N/A | ไม่รับ architecture decision หรือเผยแพร่ release ในงานนี้ |
| Risks / questions | Documented | Roadmap sections 2, 14–16 |
| Next action / owner | Human review / เจ้าของโครงการ | ทบทวนแนวทาง เลือก pilot/owners และอนุมัติ discovery scope ขั้นถัดไป |

Done when: roadmap และรายงานสำรวจมีแหล่งอ้างอิง ข้อจำกัด milestones และ measurable acceptance ครบ  
May proceed through: การอ่าน ตรวจเอกสาร และสร้างข้อเสนอใน workspace นี้  
Must stop for: adoption ของ architecture/business scope, connected execution, merge/release และ production changes  
Assumptions: สำรวจทั้งสอง repo เป็นฐานร่วมตามคำขอ; เปลี่ยน focus ของร่างได้โดยไม่แก้ runtime/policy เดิม
