---
name: functional-test-design
description: Claude Code adapter for the shared functional test design skill. Use for functional test analysis, IPO matrix, happy/negative test cases, BVA/EP, risk-based testing, exploratory charters, and traceability. Source of truth is .agents/skills/functional-test-design/SKILL.md.
---

# Functional Test Design Skill — Claude Adapter

Use the shared skill definition at:

```text
.agents/skills/functional-test-design/SKILL.md
```

When invoked, follow the shared skill exactly. Use templates from:

```text
.agents/skills/functional-test-design/templates/
```

Do not implement automation scripts unless the user explicitly asks for automation implementation. If automation is requested, hand off to the appropriate automation skill after producing functional test design.
