# Issue #298 — Scoped Shared Knowledge Baseline

## Scope and authority

This is a **synthetic workflow fixture**, not an organization's business baseline, product requirement, or production KMS. No business/process owner or business approval exists for this fixture. Its only purpose is to test whether roles cite the same source revision and stop when context is conflicting, draft, stale, denied, or revoked. It contains no real personal, customer, payment, or production data.

Baseline revision: `issue-298-synthetic-v1`

Baseline steward: Framework/Documentation Agent (repository artifact stewardship only)

Business owner: None — business fit is **BLOCKED / NOT EVALUATED**

Approval: User authorized Issue #298 implementation; that authorization is not approval of these synthetic rules for a real business domain.

## Source register

Hashes are SHA-256 over the exact UTF-8 JSON block shown for each source, including its final newline. The fenced block is the source payload; edits require a new revision/hash and review of dependent artifacts.

| Source ID | Type | Owner | URI | Revision | SHA-256 | Status | Scope / classification | Access reference | Effective interval | Approval reference | Supersedes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KMS-SYN-001 | glossary | Workflow fixture steward; no business owner | `docs/records/misc/issue-298-knowledge-baseline.md#kms-syn-001` | `issue-298-synthetic-v1` | `3c2e01e659aba1f2d396dabad937d672fc59277d6e4ff13e3cdc7a9007300174` | `approved-synthetic-for-workflow-test` | synthetic fixture only; public synthetic | `public-fixture-no-sensitive-data` | Not applicable | Not a business approval | None |
| KMS-SYN-002 | interface-rule | Workflow fixture steward; no business owner | `docs/records/misc/issue-298-knowledge-baseline.md#kms-syn-002` | `issue-298-synthetic-v1` | `07f1480980b0d08e6d45d499acaa188edecf33e593283a1da7fe0f684d8f8019` | `approved-synthetic-for-workflow-test` | synthetic fixture only; public synthetic | `public-fixture-no-sensitive-data` | Not applicable | Not a business approval | None |
| KMS-SYN-003 | system-catalog | Workflow fixture steward; no business owner | `docs/records/misc/issue-298-knowledge-baseline.md#kms-syn-003` | `issue-298-synthetic-v1` | `cbe01609d443d36798bea1d02d7df0146432bcf05f464adbb2c5b5ed56938d63` | `approved-synthetic-for-workflow-test` | synthetic fixture only; public synthetic | `public-fixture-no-sensitive-data` | Not applicable | Not a business approval | None |

## Source payloads

### KMS-SYN-001

```json
{
  "terms": {
    "duplicate delivery": "A second submission for a previously accepted fixture event.",
    "idempotency key": "A fixture-only identifier used to recognize the same submission attempt."
  }
}
```

### KMS-SYN-002

```json
{
  "rules": [
    "For the fixture only, the same idempotency key and same normalized payload identify the same event.",
    "For the fixture only, reusing an idempotency key with a different normalized payload is a conflict that requires owner review."
  ]
}
```

### KMS-SYN-003

```json
{
  "data_classification": "public synthetic; contains no real customer or production data",
  "interface": "POST /synthetic/v1/events",
  "system": "Example Event Gateway (synthetic)"
}
```

## Shared role selection record

For C1–C4, every role is expected to cite the same source IDs, baseline revision, and source hashes. Role-specific selection is a planned exercise, not evidence that an agent retrieved or executed against these sources. The role prompt can differ, but the business facts and authority do not.

| Role | Selected source IDs | Baseline revision | Source revision check | Role-specific use |
|---|---|---|---|---|
| BA Agent | KMS-SYN-001, KMS-SYN-002, KMS-SYN-003 | `issue-298-synthetic-v1` | Same three SHA-256 values in source register | extract explicit fixture rules and identify missing acceptance facts |
| SA Agent | KMS-SYN-001, KMS-SYN-002, KMS-SYN-003 | `issue-298-synthetic-v1` | Same three SHA-256 values in source register | identify interface semantics and contract questions |
| Developer Agent | KMS-SYN-001, KMS-SYN-002, KMS-SYN-003 | `issue-298-synthetic-v1` | Same three SHA-256 values in source register | implement only an approved fixture contract; do not infer missing behavior |
| QA Agent | KMS-SYN-001, KMS-SYN-002, KMS-SYN-003 | `issue-298-synthetic-v1` | Same three SHA-256 values in source register | derive expected outcomes and boundary cases from the same fixture sources |

This register is an attachment to role artifacts. It does not change `context-pack/v1`, whose `authority` remains `legacy`; it does not claim that context-pack loading is an authorization decision.

## Knowledge kinds

- **Reference knowledge:** the three synthetic source payloads above, with explicit status and scope.
- **Episodic knowledge:** scenario observations belong in `docs/records/qa/issue-298-collaboration-evaluation.md` only after a scenario actually runs. No execution result is asserted here.
- **Proposals:** a suggested behavior change is a proposal until its named business owner approves it. Agent summaries, inferred rules, and this synthetic fixture do not promote themselves to business truth.

## Fail-closed context variants

| Variant | Expected action | Owner / next route |
|---|---|---|
| Two active revisions conflict | Stop the dependent requirement/design/test decision; cite both source IDs and the conflict | Business/process owner for business meaning; SA for technical contract meaning |
| Only a draft/proposed source exists | Use it only to formulate a question; do not accept it as a requirement or implementation authority | Source owner; BA/SA records the open question |
| Source revision is stale or superseded | Do not silently use cached facts; retrieve the current authorized source and mark dependent artifacts for review | Baseline steward; task owner tracks impacted outputs |
| Access is denied or source is revoked | Do not quote or place its content in model context; local file presence is not permission | Access/source owner; stop dependent work if required facts are unavailable |
| Required specialist is unavailable | Continue only work inside the task owner's authority; do not invent missing specialist judgment or pass a required gate | Required specialist owner or Human gate owner |

Metadata records provenance; it does not enforce live ACLs, retrieval-time revocation, retention, or deletion. Those need a separately approved runtime KMS design and environment.

## B2 acceptance

- BA, SA, Developer, and QA point to the same three source revisions and hashes.
- No row claims business approval; business fit remains blocked until a named business owner and real approved source set exist.
- Conflicting, draft, stale, denied, revoked, and specialist-unavailable variants have explicit stop behavior and next owner.
- No actual product implementation, SIT, UAT, or business-rule validation is claimed.
