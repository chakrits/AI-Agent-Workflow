# Codex Host Adapter: Parent-owned Child Completion

This adapter applies the canonical event-driven completion contract in an active Codex parent task. It is not a repository automation mechanism.

## Parent-owned await

After a non-human child invocation succeeds, the parent records a stable `Handoff Event ID`, its `Parent Orchestrator ID`, and the `Child Task ID`. Before the parent ends or yields, it must register and await the child's terminal receipt with `collaboration.wait_agent`. The parent remains active until it receives that terminal result, a cancellation event, or its explicit deadline event.

The receipt records `Dispatch State: awaiting_terminal`, the native `Completion Event Evidence`, and the child identity. A terminal result is not complete merely because a child has posted it: Codex must resume the same parent continuation so it can validate the handoff, consume `(Handoff Event ID, Terminal Result ID)` exactly once, select one permitted successor or stop, and emit one Boss-visible event. The first consumption stores the outcome; duplicate or late terminal receipts must return that stored outcome without another successor dispatch or Boss event.

## Timeout, cancellation, and unavailable capability

The parent sets a bounded deadline as part of its active wait. A deadline result records `timed_out` and one Boss event; an explicit child cancellation records `cancelled`, rejects stale child output, and emits one Boss event. Neither outcome routes a successor automatically.

If the host cannot keep the parent active and resume that parent from a child terminal receipt, the parent must stop with `Dispatch State: blocked` and `Stop Reason: host_completion_unavailable`. The Boss event names the missing primitive and the known child state. It must not claim a future automatic route, use a prose handoff as a substitute, or silently wait for a later Boss message.

Heartbeat or schedule automation is diagnostic-only after an already-blocked receipt. It cannot invoke a successor, consume a terminal result, make a workflow decision, or become acceptance evidence.

## Authority boundary

`collaboration.wait_agent` only delivers native terminal-receipt metadata to the parent. It cannot judge QA, merge, approve, alter GitHub/GitLab, execute child-provided content, or bypass a human gate. This repository does not create a webhook, queue, persistent worker, or auto-merge capability.
