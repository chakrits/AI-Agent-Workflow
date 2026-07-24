# Data Change Plan

## Metadata

- Work Item ID:
- Title:
- Owner:
- Environment:
- Status:

## Business Reason


## Scope

- Tables:
- Config keys:
- Screens/APIs affected:
- Touches PII: Yes / No — if Yes, routed to Security Reviewer before execution

## Escalation Check

- [ ] Confirmed this change needs no code beyond the data itself (no new validation logic, business rules, or schema change). If not confirmed, stop and route to Orchestrator or SA Agent instead of proceeding.

## Data to Add / Update

| Table | Key | Current Value | New Value | Effective Date | Owner |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## Validation Query

Expected row-count delta:

```sql
-- Add validation SQL here — transaction-wrapped, idempotent upsert (ON CONFLICT DO UPDATE), safe to run twice
```

## Rollback Query

```sql
-- Add rollback SQL here — safe to run twice
```

## QA Focus

- UI visibility
- API response
- Search/dropdown/report behavior
- Role/permission visibility
- Regression scope

## Risk

- Duplicate key:
- Constraint impact:
- Production data impact:
- Rollback risk:

## Completion Evidence

Record actual execution commands, outcomes, and evidence once in [COMPLETION_CHECK.md](./COMPLETION_CHECK.md).

| Completion Check URL / Repository Path | Status |
|---|---|
|  | Pending / Passed / Failed / N/A |

## Related Artifacts / Links

| Artifact | Purpose | URL / Repository Path |
|---|---|---|
|  |  |  |
