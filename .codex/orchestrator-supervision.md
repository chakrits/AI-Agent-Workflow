# Codex Host Adapter: Temporary Orchestrator Supervision

This adapter implements the canonical P0.5 contract in a Codex host. `collaboration.wait_agent` can observe a target while Root stays active; a Root that will yield must use a receipt-scoped Codex heartbeat created through `codex_app__automation_update`. It is not a repository automation mechanism.

## Registration before Root yields

After a non-human target invocation succeeds, Root creates a receipt-scoped `Handoff Event ID` and `Monitor ID`, records `Monitor State: registered`, then registers a bounded `heartbeat` through `codex_app__automation_update` targeted at the current Root thread **before Root yields**. The heartbeat prompt must name the target agent/task, handoff event, expected terminal evidence, next permitted route, one Boss event requirement, and cancellation rule. Record the automation/monitor ID, target-thread ID, bounded expiry, and registration receipt as `Monitor Registration Evidence`.

`collaboration.wait_agent` is allowed only as an in-turn optimization; it is not a substitute for the heartbeat when Root may yield. A repeated wait is permitted only while the same bounded monitor remains `waiting`.

If the host cannot provide `collaboration.wait_agent` and a continuation capable of consuming the terminal result, do not claim supervision: record `Dispatch State: blocked`, `Stop Reason: monitor_unavailable`, and a Boss event in the current turn.

## Wake-up, consumption, and cancellation

When the heartbeat observes the named target terminal result, it wakes/continues the Root thread, validates the target and evidence, and uses `(Handoff Event ID, Terminal Result ID)` as the exactly-once key. The first valid result records terminal-consumption evidence, emits the Boss-visible event without a new Boss message, performs the permitted next dispatch or stop, then disables or deletes the heartbeat through `codex_app__automation_update` and records `Monitor Cancellation Evidence`.

Duplicate or late terminal results return the recorded result without another dispatch or Boss event. A bounded timeout must be recorded as `monitor_expired` or `monitor_failed`, with an explicit Boss-visible block. The monitor only observes completion and requests Root continuation: it cannot approve, judge QA, merge, change GitHub/GitLab, or bypass a human gate.

## Live-host proof

QA must retain one Codex-host transcript showing: target invocation, heartbeat registration before Root yield, target terminal result, Root continuation, one Boss event, next dispatch/stop, duplicate no-op, and monitor cancellation. This repository does not create a webhook, queue, persistent worker, or auto-merge capability.
