# Workflow: Config Change

```text
BA -> Config Agent -> QA -> Release
```

Skip Developer when no code change exists.
Skip SA when no architecture/integration/security impact exists.

## Use when

- A feature flag, system parameter, or business config value needs to change.
- A CI/CD YAML, environment variable, or operational setting needs to change.
- The change is a value the running system already reads — not new code that
  reads a value for the first time.

## Gate Rules

Full rules live in the `data-config-change` skill. Before completion, confirm
evidence for:

- No code change was required to apply this config (if one was, stop and route
  to Orchestrator/SA Agent per the skill's Escalation Guard).
- A rollback path exists and was validated (old value recorded, revert command
  or process known).
- Hot-reloadable vs restart-required is stated, so the real effective date is
  known.
- Any feature flag has a recorded owner and removal condition.

## Handoff

Include:

- changed config file/key
- old value
- new value
- whether the change is hot-reloadable or requires a restart
- validation command/evidence that the new value took effect
- rollback command

## Backward Routing

- The change turns out to need code beyond setting a value → Orchestrator / SA Agent
- Business meaning of the setting is unclear → BA
- Security-sensitive setting (auth, secrets, access control) → Security Reviewer
