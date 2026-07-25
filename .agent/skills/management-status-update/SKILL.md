---
name: management-status-update
description: Draft Thai-first, evidence-backed Boss, Leadership, team, and defect status updates for GitHub, Slack, standup, email, or meetings. Use for communication drafts only; do not use to replace formal engineering artifacts or post externally.
---

# Management Status Update

Turn evidence-backed engineering state into a concise update for the named
audience and channel. Write Thai by default. Use another language only when
Boss explicitly requests it or the named target audience requires it.

## When to use

- Boss asks for a status summary.
- A team update is needed.
- A bug or defect report needs a stakeholder-facing draft.
- An executive, GitHub Issue/PR, Slack, standup, email, or meeting update is
  requested.

Do not use this skill to make a recommendation memo, perform RCA, certify QA,
change lifecycle status, or post a message.

## Inputs and evidence

Use an Issue, PR, work item, structured handoff, QA/test/RCA evidence, pasted
engineering notes, or current conversation context. Resolve sources in this
order:

1. Explicit Boss instruction.
2. Approved requirement/design/ADR.
3. QA evidence for verification claims.
4. PR/Issue metadata.
5. Conversation notes.

State the conflict when sources disagree; do not silently reconcile it.

Separate confirmed facts, unknowns, and next actions. Never invent or infer an
owner, root cause, impact, mitigation, risk, ETA, customer effect, or
verification result. If an input is absent, say that it is unknown or ask one
short question when the audience or channel is material.

## Output shapes

### Boss Update

Use this as the default named shape in this workspace:

```text
สถานะ: <เสร็จแล้ว / กำลังดำเนินการ / ติดขัด>
ผลกระทบหรือสิ่งที่ทำเสร็จ: <ข้อเท็จจริงที่ยืนยันแล้ว>
หลักฐาน: <Issue / PR / QA / CI อ้างอิง>
ถัดไป: <เจ้าของที่ยืนยันแล้ว + การดำเนินการ>
ต้องการการตัดสินใจ: <ไม่มี / การตัดสินใจที่ระบุชัด>
```

### Leadership Update

Use this neutral fallback when the audience is leadership but not explicitly
Boss. Keep the same evidence and unknowns as the Boss Update; change only the
channel's length and form.

### Defect Update

```text
สถานะ: <กำลังตรวจสอบ / แก้ไขกำลังรีวิว / ยืนยันผลแล้ว / ติดขัด>
สิ่งที่ยืนยันแล้ว: <อาการและผลกระทบที่สังเกตได้>
สาเหตุ: <สาเหตุที่ยืนยันแล้ว / ยังอยู่ระหว่างการตรวจสอบ>
การบรรเทา: <วิธีที่ยืนยันแล้ว / ยังไม่มีวิธีที่ยืนยันแล้ว>
หลักฐาน: <Issue / PR / ผลทดสอบ>
ถัดไป: <เจ้าของที่ยืนยันแล้ว + การดำเนินการ>
```

For a GitHub Issue/PR comment, use structured Markdown with material
references. For Slack, use a TL;DR and a few short actionable bullets. For a
standup, use one to three short lines. For email, add a subject and concise
paragraphs. For a meeting, use speaking-order bullets. These are output forms,
not workflow stages.

## Publishing and artifact boundaries

Produce a print-only draft by default. Never post to Slack, email, or a
meeting. A host-platform comment needs a separate explicit approval and must
follow that platform's policy.

A Management Status Update is a communication draft, not a structured handoff,
QA evidence, test report, RCA/postmortem, lifecycle signal, dispatch record, or
approval. Keep the formal artifact as the source of truth and link to it when
useful.

## Source note

This is an independent adaptation informed by
[management-talk](https://github.com/thananon/9arm-skills/blob/main/skills/productivity/management-talk/SKILL.md).
It uses project-specific wording and synthetic examples. No substantial
unverified-license source text is copied.
