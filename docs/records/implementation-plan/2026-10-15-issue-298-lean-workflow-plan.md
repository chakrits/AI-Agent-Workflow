# แผนปรับปรุง #298: ลด validation และใช้ single-agent เป็นค่าเริ่มต้น

วันที่: 15 ตุลาคม 2026 (Asia/Bangkok)

Issue: [#298](https://github.com/chakrits/AI-Agent-Workflow/issues/298)

Branch: `codex/lean-validation-single-agent`

สถานะ: **Draft for human review — ยังไม่อนุมัติให้เปลี่ยน enforcement**

Classification: Framework/meta; planning-only ครั้งนี้, implementation มีความเสี่ยง Medium และต้อง Security review ของ retained boundaries

## 1. ความเห็นและข้อเสนอหลัก

ผมเห็นด้วยกับทิศทางลดภาระ ผู้ใช้ควรจ่ายต้นทุนให้คุณภาพของผลลัพธ์ มากกว่าการพิสูจน์ว่าทำตามพิธีการครบทุกบทบาท Repo นี้เป็น workflow/tooling kit จึงควรใช้ verification ที่สอดคล้องกับ scripts/contracts ที่มีจริง ไม่บังคับงานทดสอบ web/DB/SIT/UAT ที่ไม่มีอยู่ใน repository

อย่างไรก็ตาม มี executable logic จริง เช่น state machine, CAS/fencing, evidence และ readiness parsing การไม่มี web application ไม่ใช่เหตุผลให้ลบ correctness/security tests ของ logic เหล่านี้

ข้อเสนอคือ **agent เดียวทำงานหลัก → ตรวจเฉพาะส่วนที่เกี่ยวข้อง → independent review เมื่อความเสี่ยงกำหนด → คนตัดสินก่อน merge** การแบ่ง role เป็นวิธีคิดและความรับผิดชอบ ส่วนการ spawn เป็น execution optimization ที่ต้องพิสูจน์ว่าคุ้ม ไม่ควรเกิดเพียงเพราะเปลี่ยนจากหมวก BA เป็น SA

ไม่แนะนำทั้งการปิด validation ทั้งหมดและการเก็บทุก check ไว้เพราะเคยมี ข้อเสนอนี้ยังไม่เปลี่ยน ADR หรือกติกาที่บังคับใช้อยู่

## 2. Baseline และหลักฐานที่ตรวจแล้ว

| หลักฐาน | สิ่งที่สังเกตได้ | ข้อจำกัดของข้อสรุป |
|---|---|---|
| Default branch `2dca980c40e75741500869d32d32a02958b092fe` | workflow หลักมี `npm test` + 13 validator steps; มี runtime-matrix full suite อีก workflow | จำนวน steps ไม่ใช่มูลค่าหรือต้นทุนที่เท่ากัน |
| Source branch #297 ที่ `7ffc76e861f9d78c5d6862db23210b6a4da0f66c` | มี advisory validators เพิ่ม 2 ตัวและ pre-push advisory caller | ยังไม่อยู่บน default branch; ไม่ถือว่าแผนนี้สืบทอด implementation #297 |
| [#294](https://github.com/chakrits/AI-Agent-Workflow/issues/294) | skill/catalog/parity/usage audits ถูกแยกเป็น optional แล้ว | ปัญหาที่เหลือต้องตรวจ indirect dependencies และ ceremony; ไม่ทำ #294 ซ้ำ |
| SHA `29848953fc3714e243d757a538c05cf9baa9f8c0` | [push run](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38135093273) และ [PR run](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38135124172) ของ workflow หลักเกิดทั้งคู่; [matrix](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38135124223) ของ PR เดียวกันมี full-suite step ตาม source | ยืนยัน event duplication; ไม่บวกเวลาของ jobs ที่รันขนานเป็นเวลาที่คนรอ |
| [Successful run 38156266089](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38156266089) | job 26 วินาที, `npm test` 11 วินาที จาก GitHub job/step timestamps | เป็นหนึ่งตัวอย่าง ไม่ใช่ median หรือ p95 |
| [Failed run 38188080999](https://github.com/chakrits/AI-Agent-Workflow/actions/runs/38188080999) | `npm test` ผ่าน ใช้ 12 วินาที; review gate พบ script files 9 ไฟล์และ added review records 0 จึง fail | ยืนยันเหตุผลว่า missing record ไม่ได้พิสูจน์ว่า false positive หรือไม่จำเป็นต้อง review |
| Hook source + local git config | pre-push readiness บล็อกเฉพาะมี `PR_BODY_FILE`; checkout เดิมไม่ตั้ง `core.hooksPath` | ไม่อ้างว่า pre-push hook กำลังทำงานในทุก host; Claude hook ยังเป็นอีก caller |
| Active GitHub ruleset `Protect main` ID `18992836` | required context คือ `work-item-readiness-freshness`; approving review count 0 | CI job fail กับ required branch check เป็นคนละระดับ ต้อง map ก่อนย้าย gate |
| `scripts/validate-metrics.mjs` | ใช้ counts/regex จาก TASK_LOG บางส่วน ไม่เก็บ paired task duration/token cost | ใช้พิสูจน์ว่า multi-agent เร็ว/ถูกกว่า single-agent ไม่ได้ |

ตัวเลขจาก GitHub เป็นข้อมูลที่อ่านใน session วันที่ข้างต้น ไม่ใช่การ rerun CI หรือการสรุปผลทุก run ประสบการณ์ของผู้ใช้เป็น pain signal ที่สำคัญ แต่ยังไม่มี elapsed-time baseline พอระบุว่าประหยัดกี่เปอร์เซ็นต์

## 3. เป้าหมายและขอบเขต

1. ลดเวลาและต้นทุนต่อ accepted change พร้อมรักษาความถูกต้องของ executable contracts
2. ทำงาน docs/skills/mechanical ได้โดยไม่มี mandatory child dispatch หรือ application test ceremony
3. เลิก duplicate execution และ filename/marker bookkeeping ที่ไม่พิสูจน์ผลลัพธ์ เมื่อมีวิธีรับรองที่เหมาะสมแทน
4. ทำให้รู้ว่าแต่ละ check จับอะไร ใครใช้ผล และควรรันเมื่อใด

ไม่อยู่ใน scope: เพิ่ม SDLC runtime/web/DB/Docker, สร้าง orchestration engine/dashboard ใหม่, rewrite ทุก validator, เปลี่ยน business contracts, ปิด branch protection, auto-merge หรือให้ agent รับรองความเสี่ยงเอง

## 4. โมเดลการทำงานที่เสนอ

| งาน | Executor | Verification | ต้อง spawn หรือไม่ |
|---|---|---|---|
| Advisory, docs ทั่วไป, optional skill | agent เดียว | path/content checks ที่เกี่ยวข้อง; human review ของ change | ไม่ต้อง |
| Mechanical/test-only ขนาดเล็ก | agent เดียว | affected tests และผลต่าง; reviewer ตาม risk | ไม่ต้องเพียงเพราะเปลี่ยน role |
| Script behavior/shared contract | agent เดียวทำ implementation | failing test → fix → focused suite; independent review ก่อน merge | ผู้ตรวจเป็นคนหรือ agent แยกได้; ไม่ต้องส่งต่อทุก phase |
| State/concurrency/evidence/permissions/CI trust | agent เดียวหรือแบ่งงานตามพื้นที่แยกจริง | runtime/negative/recovery tests และ independent specialist review | ใช้เมื่อช่วย verification/critical path; ห้าม self-approve |
| สองงานที่เป็นอิสระและมีขนาดคุ้ม | parent + workers ที่จำเป็น | ระบุ output/write set และ merge/review owner | ทดลองเมื่อ expected parallel benefit มากกว่า coordination cost |

ก่อน spawn ระบุสั้น ๆ ว่าช่วยอะไร, input/output คืออะไร, เป็น critical path หรือไม่ และใช้ผู้ตรวจมนุษย์แทนได้หรือไม่ ถ้าเป็นงาน serial ขนาดเล็กให้ agent เดียวทำต่อ เมื่อเลือกไม่ spawn ก็ไม่ต้องผลิต dispatch receipts จำลอง

เก็บ independent judgment และ human gates ตามความเสี่ยง; ไม่ใช้การสลับ persona ของ agent เดิมอ้างว่าเป็น independent review แผนนี้ไม่สั่งผู้ใช้ benchmark ด้วย multi-agent ทุกงานหรือบังคับ instrument ทุก tool call

## 5. แผน disposition ของ validations

ค่าทั้งหมดเป็น **proposed** ต้องตรวจ dependencies/หลักฐานและอนุมัติก่อนแก้ caller ไม่มี check ใดถูกปิดในงานเขียนแผนนี้

| Check / กลุ่ม | ข้อเสนอ | Trigger / หลักฐานคุณค่า |
|---|---|---|
| Executable regression `npm test` | Keep, deduplicate | code/shared contract/CI classifier changes; critical invariants มี negative tests |
| `validate:contracts` | Keep, scope | contract/schema/parser/consumer เปลี่ยน; invalid transition/evidence ต้อง reject |
| `validate:dispatch-receipts` | Scope | dispatch policy/schema/consumer หรือ receipt records ที่เปลี่ยน; ordinary docs ไม่ต้อง live GitHub receipt lookup |
| `validate:workflow-evidence` | Scope | executable evidence semantics หรือ governed evidence record ที่เปลี่ยน |
| `validate:status-projection` + project-state validation | Scope | authoritative shards/projection/status tools หรือ state records เปลี่ยน; preserve concurrency/integrity |
| `validate:clearable-refs` | Scope | reset/migration/ref consumers หรือ affected governed references |
| `validate:review-gate` | Replace paperwork after equivalent review exists | แยก test-only/docs จาก production scripts; ใช้ actual review ที่ผูก candidate ตามความเสี่ยง แทนถือว่ามีชื่อไฟล์แล้วตรวจครบ |
| PR readiness / `work-item-readiness-freshness` | Preserve current check until approved simplification | ลด fields/duplicates สำหรับ low-risk งานได้เมื่อ identity/scope/human gates ยังตรวจได้ ไม่ยกเลิก required check ลอย ๆ |
| Documentation Impact marker gate | Candidate for informational/consolidation | marker เป็น declaration ไม่ใช่ proof; รวม impact ใน PR review เมื่อ replacement ผ่าน approval |
| `housekeeping:worktrees` | Manual/local diagnostic | hosted checkout ไม่แทน worktree inventory เครื่องผู้ใช้; ไม่ให้ hygiene ของ clone ขวาง unrelated merge |
| `validate:metrics` | Non-blocking/on demand | report ไม่ควรบล็อก change เพราะตัวเลข; ใช้ baseline ใหม่วัด elapsed/effort/cost |
| `adr:audit` | Scope integrity; ratio informational | ป้องกัน record loss เมื่อแก้ decisions/reset; ไม่ใช้จำนวน ADR เป็น proxy ของคุณภาพทุก PR |
| `validate:risk-register` | Scope integrity | เมื่อแก้ risks/reset/consumers; freshness ของทะเบียนไม่บล็อก unrelated skill edit |
| `validate:adapter-parity` | Scope core adapters | รักษา policy boundary เมื่อแก้ canonical role/adapters; ไม่เพิ่ม optional skill mirror requirement กลับมา |
| `validate:context-budget` / source pins | Scope integrity; token metric advisory เว้นมี hard limit | core loading/hash/authority changes เท่านั้น; แยก integrity จาก threshold ที่ยังไม่สัมพันธ์ host limit |
| `validate:ci-parity` | Scope to CI/dispatch config | ตรวจ semantic applicability และ failure propagation เมื่อแก้ CI; ตัวเดิมเทียบชื่อ commands ไม่เทียบ triggers |
| `audit:skills`, `audit:skill-usage` | Remain opt-in | #294 ทำแล้ว; ทดสอบไม่ให้ caller/indirect test เรียก live audits กลับมา |
| #297 lessons/execution advisory checks | Integrate only if/when #297 lands | ไม่ทำซ้ำ; warning รวมในผลสรุปเดียวตาม scope ไม่สร้าง serial gates เพิ่ม |

**Not applicable** ต้องมีเหตุผลและ affected paths ชัด; `unreadable/unknown diff` ไม่ใช่ docs-only fallback แยก expected denial จาก infrastructure error ห้ามใช้ blanket `continue-on-error` หรือ `|| true` ครอบ failing correctness checks

Unit tests ของ diagnostic tools ที่ใช้ isolated fixtures ยังมีคุณค่า ย้าย invocation ของ live audit ออกจาก merge ไม่ได้แปลว่าต้องลบ tests ของ parser/tool ทั้งชุด ข้อความ/fixture assertions ที่ mirror implementation ต้องประเมินใหม่ด้วย contract value

## 6. CI และ hooks ที่ควรเหลือ

- เลือก event policy: feature branches ใช้ PR validation เป็น heavy lane; default branch ใช้ post-merge audit; ไม่มี PR ใช้ manual/local focused checks หรือ explicit branch lane ที่ไม่ซ้ำ PR
- ให้ candidate หนึ่งชุดมี full suite owner เดียว Runtime matrix รันเฉพาะ focused status/JCS suites เมื่อ affected; changes ต่อ matrix/classifier เองต้องเข้าชุด regression ที่ครอบคลุม
- ใช้ concurrency cancellation กับ obsolete runs ของ PR เดียวกัน และรักษาผลของ current candidate ไม่ใช้ cache/pass จาก SHA เก่าข้าม revision
- ถ้า required job ต้องรันทุก PR ให้ stable wrapper ประเมิน diff แล้วรัน applicable checks; อย่าใส่ top-level paths filter แล้วปล่อย required context เป็น Pending ตลอด
- Sensitive PR workflows ต้องไม่ execute untrusted PR code ด้วย write token; diff classifier อ่านข้อมูล untrusted อย่างจำกัดและใช้ read-only token ใน testing jobs
- ให้ local hooks เป็น convenience ไม่สร้าง business/approval policy เอง ไม่รัน full suite ก่อนทุก push โดยอัตโนมัติ; การลด blocking hook ต้องทำพร้อม required server-side equivalent ที่อนุมัติแล้ว
- GitLab ต้องรักษา semantics เดียวกันตาม change class ไม่จำเป็นต้อง copy จำนวน jobs ข้าม host ให้เท่ากัน

Active required context ปัจจุบันมีเพียง `work-item-readiness-freshness` ไม่สรุปว่า workflow อื่นเป็น required branch checks ทั้งหมด ก่อน rollout ต้องตกลงกับ maintainer ว่า aggregate correctness result ใดควร required จากนั้นเปลี่ยนอย่างรักษาการคุ้มครองต่อเนื่อง ไม่ทำระหว่างเขียนแผนนี้

## 7. Implementation tasks และ checkpoints

แผนนี้เป็นงานถัดไปหลัง approved scope/design; ประมาณ 3–5 focused engineering sessions แล้วเก็บ pilot ต่อ ไม่ใช่วันส่งมอบรับรอง แต่ละ slice ตั้งเป้า ~100–300 changed lines แยก refactor ออกจาก behavior change

| Task | Files/components | งาน / output | Verification | Owner |
|---|---|---|---|---|
| L1 Baseline + decision | plan นี้, package/hooks/workflows, test dependency graph, role policy | inventory trigger/consumer/owner/enforcement + proposed ADR; baseline command counts/times; ปิด overlap #297/#284 | ตรวจ 3 samples: docs-only, optional skill, executable; ระบุ actual failure/false alarm/unknown แยกกัน | Maintainer + executor |
| L2 Diagnostic cleanup | workflows, `.gitlab-ci.yml`, hooks, `package.json`, related tests | ย้าย metrics/worktree hygiene และ approved ratio/metadata bookkeeping ออกจาก merge lane; ใช้ commands เดิมแบบ opt-in | failing caller test ก่อนแก้; diagnostics ยังให้ผลจริงเมื่อเรียกเอง; indirect invocation ไม่กลับมา | Executor; independent review ของ gate changes |
| L3 Scoped CI + dedupe | `.github/workflows/validate-contracts.yml`, `status-runtime-matrix.yml`, CI parity, diff helper, tests | path/risk mapping, full-suite owner เดียว, cancellation, stable check result | rename/delete/unknown diff, contract/core/security changes ไม่ถูก skip; same candidate ไม่มี duplicate full suites | Executor + QA/Security reviewer |
| L4 Single-executor policy | `AGENTS.md`, operating model, routing/handoff/task-execution, core adapters/templates | role ≠ mandatory process; low-risk ไม่มี dispatch chain; ลด artifacts ซ้ำและปรับ review-record policy ตาม approved design | scenario/rubric tests สำหรับ low/medium/high risk; ไม่มี false independent-review claim; current human gates ยังทำงาน | Executor + maintainer/reviewer |
| L5 Pilot + outcome | work-item sample results; reuse issue/PR evidence | ทดลอง 10 matched pairs; รายงาน elapsed/quality/effort/cost และตัดสินขยายหรือปรับ scope | AC matrix ใน issue; no invented timings; unresolved safety regression เป็น no-go | Maintainer + independent verifier |

Dependencies: L1 → L2 → L3 → L4 → L5; เตรียม measurement corpus ระหว่าง L2/L3 ได้ ไม่ต้องเพิ่ม worker พร้อมกันเพียงเพื่อทำแผนนี้ Checkpoint หลัง L2 และ L4: รัน applicable tests ตรวจ diff/retained invariants ก่อนเดินต่อ

ถ้า #297 merge ก่อน L3 ให้ reuse `scripts/lib/diff-scope.mjs` และ tests ที่ผ่านแล้วหลังตรวจ suitability; ถ้ายังไม่ merge ให้เลือก explicit dependency หรือ smallest existing helper ก่อน หลีกเลี่ยง copy implementation จาก branch ที่ยังไม่อนุมัติโดยไม่ทบทวน

### Tests / commands สำหรับ implementation

```sh
# Caller/CI/classification changes: focused first, full suite once for candidate.
node --test test/validate-ci-parity.test.mjs test/hook-containment.test.mjs
node --test test/skill-decoupling-contract.test.mjs test/validate-review-gate.test.mjs
npm run validate:contracts
npm run validate:ci-parity
npm test
git diff --check
```

เพิ่ม focused test ของ diff classifier เมื่อมีการเปลี่ยนใหม่ และรัน state/evidence/recovery suites เมื่อกระทบส่วนนั้น ข้างต้นเป็นคำสั่งในแผน **ไม่ได้อ้างว่ารันแล้วในงานเอกสารนี้** Web/API/DB/SIT/UAT execution: N/A สำหรับ scope repo นี้ เว้น pilot เป็น application จริงที่แยกออกไป

## 8. Acceptance matrix และวิธีวัดมูลค่า

Issue #298 เป็นแหล่ง AC-01–AC-09; ตอนนี้ทุก AC ของ implementation เป็น **Not implemented / not verified** การสร้างแผนไม่ใช่ผลผ่าน AC ของระบบ

| AC | Verification seam |
|---|---|
| 01 inventory | ทุก automatic caller และ indirect dependency มี disposition/rationale; unique blocker ที่ถูกจับแยกจากจำนวน failures |
| 02 low-risk path | docs/skill fixtures ไม่เรียก unrelated full suite หรือ child spawn; core policy docs เข้า risk review |
| 03 scope safety | script/contract + rename/delete/missing diff + protected-path fixtures เลือก required lane ถูกต้อง |
| 04 retained correctness | seeded illegal/stale/unauthorized/evidence errors ยัง fail authoritative check |
| 05 duplicate removal | trace workflow graph และ hosted run sample: full-suite ownership/event policy ไม่ซ้ำ |
| 06 agent policy | งาน serial เล็กเลือก single executor; independent-verifier identity แยกในงานเสี่ยง |
| 07 diagnostics isolation | hook/default test/reset paths ไม่ execute live diagnostics โดยไม่ตั้งใจ; fixture unit tests ยังผ่าน |
| 08 measured value | paired pilot report พร้อม raw timings/results, quality rubric และ unavailable fields |
| 09 rollout | approvals, required contexts, GitHub/GitLab applicability และ rollback rehearsal |

ใช้ task outcome เป็นหน่วยวัด ไม่ใช้จำนวน subtask/ข้อความเป็น throughput สำหรับ 10 matched pairs ให้เทียบ scope/risk/difficulty ใกล้กัน, สลับลำดับ single/multi เพื่อลด learning effect และใช้ isolated workspaces/base fixtures กันผลข้างเคียง ห้ามแอบลด test/review criteria ให้ฝั่งที่เร็วกว่า

เก็บ task class, plan/baseline ref, start/end, human waiting time, active execution, handoff count/wait, retries/rework, CI queue/run time, reviewer effort, accepted result/defects และ model/runner cost เมื่อมี provider usage ถ้าไม่มี cost telemetry ให้รายงาน unavailable ไม่แทนด้วยศูนย์

รายงาน median และช่วงการกระจาย/p95 แบบ exploratory โดยระบุ sample เล็ก เป้าหมายทดลอง: ลด median orchestration/validation overhead ≥30% และไม่เพิ่ม critical missed defects ใน corpus กำหนดคุณภาพผ่านจาก rubric เดียวกัน ตัวเลขนี้ยังไม่ใช่ผลพิสูจน์ และไม่สร้าง merge gate จาก KPI นี้

ถ้า single-agent ชนะให้ใช้เป็น default ต่อ ถ้า multi-agent ชนะเฉพาะงานอิสระขนาดใหญ่ให้จำกัดการใช้ที่กรณีนั้น ถ้าค่าใช้จ่ายวัดไม่ได้หรือ sample ไม่พอห้ามสรุป ROI ทั้งองค์กร

## 9. Risks และ rollback

| ความเสี่ยง | ป้องกัน / recovery |
|---|---|
| Scoped checks skip executable change | treat unknown diff conservatively; rename/delete/mixed-change negative tests |
| ย้าย diagnostic แล้วสูญ integrity checks | แยก record-loss protection จาก ratio/reporting; approval และ seeded negatives ก่อน remove caller |
| Required check ค้าง/หลุด | stable context, staged migration, verify branch ruleset ก่อน/หลัง; ไม่ลบ required context ระหว่างทาง |
| ลบ record ceremony แล้วไม่มี review จริง | คง old gate จนมี approved candidate-bound equivalent; human review ยังคงเป็นคนตัดสิน |
| Single executor รับรองตัวเอง | ระบุ verifier identity/evidence ตาม risk; persona switch ไม่นับ independent |
| Scope ชน #297 / #284 | freeze baseline; resolve implementation dependency กับเจ้าของก่อนแก้ shared files |
| เพิ่ม framework ใหม่เพื่อแก้ความซับซ้อน | ใช้ helpers/scripts เดิมและ measurements ใน issue; ไม่เพิ่ม scheduler/dashboard/telemetry platform |

Rollback ทีละ slice ย้อนลำดับ dependencies, คืน CI callers/required-context mapping ก่อนถอด replacement, ทดสอบ known invalid contract ให้ fail อีกครั้ง ไม่ revert งานอื่นของ #297 และไม่ใช้ reset ล้าง artifacts/history ของผู้ใช้

## 10. Proposed ADR และ approval boundary

Decision record: **Proposed, not accepted** — single-executor default + risk-scoped validation + optional diagnostics

Context: serial handoffs และ blanket validation มีต้นทุน; repo มี executable integrity logic ที่ยังต้องป้องกัน Alternatives: ปิดทุก gate (เสี่ยง correctness/approval), เก็บทุก gate (friction เดิม), หรือแยกตาม applicability/value (แนะนำ) สิ่งที่เลื่อนคือ custom runtime/dashboard/auto-telemetry จนมี demand และ measurement รองรับ

ก่อนรับ decision ให้ maintainer review scope, retained boundaries, review mechanism และ benchmark rubric; Security reviewer ตรวจ CI/token/evidence boundary โดยไม่ต้องส่งทุก task ผ่าน security ต่อเนื่อง การยกเลิก requirement/ADR เดิมต้องบันทึก supersession อย่างชัดเจน ไม่เปลี่ยน accepted decisions โดยเงียบ ๆ

## 11. Handoff / completion ของงานวางแผนครั้งนี้

- From: Orchestrator / documentation-planning role; To: Human Maintainer / เจ้าของโครงการ
- Next action: Human review; next owner: เจ้าของโครงการ
- Work item: #298; change type/risk: Framework/meta, Medium implementation risk
- Task state: Plan drafted; specification readiness: Draft; implementation/evaluation AC: not verified
- Done when: issue + isolated branch + source-grounded plan + work-item record ตรวจ path/scope ได้
- May proceed through: อ่านหลักฐาน สร้าง issue/branch เขียนและเผยแพร่เอกสารแผนตามคำขอ
- Must stop for: ปิด/ลด enforcement, เปลี่ยน approval/security/branch rules และ implementation ก่อนอนุมัติแผน
- Assumptions: baseline ของ branch ใหม่มาจาก default branch; #297 ยังแยกอยู่; role owners/งบ pilot จะระบุเมื่อเลือก implementation
- Dispatch: no child invoked; receipt/completion IDs: N/A; ไม่มีการอ้าง independent QA ของแผนนี้
- Verification ของ session: ตรวจ local links, AC/task references, docs-only diff, source baseline และ `git diff --check`; ไม่มี code change จึงไม่รัน full tests หรือ application suites

CHANGES MADE: plan, work-item record และ lifecycle notes ของ #298 เท่านั้น

NOTICED BUT NOT TOUCHING: source branch #297, roadmap เดิมที่ยังไม่ commit, validators/hooks/workflows/tests และ branch protection

CONCERNS: ยังไม่มี matched agent timings; การลดเวลาจริงต้องพิสูจน์ใน pilot ก่อนกล่าวอ้าง
