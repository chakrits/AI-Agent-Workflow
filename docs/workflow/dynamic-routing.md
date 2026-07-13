# Dynamic Routing Policy

## Purpose

Route work by change type, risk, and required artifacts instead of forcing a linear PM -> BA -> SA -> Dev -> QA sequence.

## Routing Algorithm

```text
1. Read request and PROJECT_STATUS.md
2. Classify change type
3. Classify risk level
4. Decide whether code, architecture, data, config, QA, or security work is required
5. Select the minimum safe workflow
6. List skipped stages and reasons
7. Execute one stage at a time
8. Validate quality gate
9. Handoff to next agent or route backward
10. Update PROJECT_STATUS.md and TASK_LOG.md
```

## Change Types

| Change Type | Default Workflow | Can Skip |
|---|---|---|
| New Feature | PM/BA -> SA -> Dev -> QA -> Release | PM if already approved |
| Bug Fix | QA/BA -> Dev -> QA -> Review | SA if no design impact |
| Config Change | BA -> Config -> QA -> Release | Dev, SA |
| DB / Reference Data Change | BA -> Data -> QA -> Release | Dev, SA |
| API Contract Change | BA -> SA -> Dev -> QA | PM if scope approved |
| Test-only Change | QA -> Reviewer | PM, BA, SA, Dev |
| Documentation-only Change | Documentation -> Reviewer | PM, BA, SA, Dev, QA |
| Security-sensitive Change | Relevant Agent -> Security -> QA -> Human Approval | Never skip Security |

## Risk Levels

### Low

- Localized change
- No production data impact
- No auth/security impact
- Easy rollback

### Medium

- User-visible behavior
- Business rule/config change
- Data mapping/reference data
- Multiple screens/APIs affected

### High

- Auth/authz
- Payment/financial logic
- Sensitive data
- Production DB change
- Integration contract change
- Hard rollback

### Critical

- Production incident
- Data loss risk
- Security incident
- Regulatory/compliance impact

## Stop Conditions

Stop and request human decision when:

- Scope is unclear
- Architecture decision affects multiple systems
- Security risk is high or critical
- Production data is destructive or irreversible
- Repeated fix loop exceeds 3 attempts
- Test failures cannot be explained
- Required approval is missing
