# Codex Host Adapter: Temporary Orchestrator Supervision

This adapter implements the canonical P0.5 contract in a Codex host that exposes the `collaboration.wait_agent` completion monitor. It is not a repository automation mechanism.

## Registration before Root yields

After a non-human target invocation succeeds, Root creates a receipt-scoped `Handoff Event ID` and `Monitor ID`, records `Monitor State: registered`, then calls `collaboration.wait_agent` for the dispatched target before Root yields. Record the target identity, bounded timeout, and wait receipt. A repeated wait is permitted only while the same bounded monitor remains `waiting`.

If the host cannot provide `collaboration.wait_agent` and a continuation capable of consuming the terminal result, do not claim supervision: record `Dispatch State: blocked`, `Stop Reason: monitor_unavailable`, and a Boss event in the current turn.

## Wake-up, consumption, and cancellation

When `collaboration.wait_agent` reports a terminal result, Root starts/continues the orchestration turn, validates the target and evidence, and uses `(Handoff Event ID, Terminal Result ID)` as the exactly-once key. The first valid result records terminal-consumption evidence, emits the Boss-visible event without a new Boss message, then marks the monitor `consumed` and `cancelled` with its cancellation reason.

Duplicate or late terminal results return the recorded result without another dispatch or Boss event. A bounded timeout must be recorded as `monitor_expired` or `monitor_failed`, with an explicit Boss-visible block. The monitor only observes completion and requests Root continuation: it cannot approve, judge QA, merge, change GitHub/GitLab, or bypass a human gate.

## Live-host proof

QA must retain one Codex-host transcript showing: dispatch receipt, `wait_agent` registration before Root yield, target terminal result, Root continuation, one Boss event, and monitor cancellation. This repository does not create a webhook, queue, persistent worker, or auto-merge capability.
