# Core Operating Model Reference

When using the dynamic workflow skill, consult these files first:

1. `docs/operating-model/AGENT_OPERATING_MODEL.md`
2. `docs/operating-model/SKILL_CATALOG.md`
3. `docs/operating-model/AGENT_EVALUATION_CHECKLIST.md`
4. `docs/workflow/dynamic-routing.md` or `docs/operating-model/dynamic-routing.md` depending on project structure
5. `docs/workflow/quality-gates.md` or `docs/operating-model/quality-gates.md` depending on project structure

Minimum required behavior:

- Classify change type.
- Classify risk level.
- Select minimum safe workflow.
- Select agent and skill from the catalog.
- Stop at human approval gates.
- Complete an evaluation checklist before marking work complete.
