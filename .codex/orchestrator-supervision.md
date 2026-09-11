# Codex Host Adapter: In-Turn Parent-owned Child Completion

This adapter applies the canonical in-turn dispatch-completion contract in an active Codex parent task. It is not a repository automation mechanism.

## In-turn parent-owned await

`collaboration.wait_agent` only works while the parent's turn is still active; once Root yields, nothing in this host resumes it. Supervision is therefore in-turn only: after a non-human child invocation succeeds, the parent records a stable `Handoff Event ID`, its `Parent Orchestrator ID`, and the `Child Task ID`, then immediately registers and awaits the child's terminal receipt with `collaboration.wait_agent` within that same active turn — for the whole dispatch chain (for example Root -> Security -> consume receipt -> dispatch QA -> consume receipt -> one Boss event -> stop at the human-review gate). The parent must not end or yield before it receives that terminal result, a cancellation event, or its explicit deadline event.

The receipt records `Dispatch State: awaiting_terminal`, the native `Completion Event Evidence`, and the child identity. A terminal result is not complete merely because a child has posted it: within the same active turn, Codex must validate the handoff, consume `(Handoff Event ID, Terminal Result ID)` exactly once, select one permitted successor or stop, and emit one Boss-visible event before ending its turn. The first consumption stores the outcome; a duplicate delivery within the turn must return that stored outcome without another successor dispatch or Boss event.

## Timeout, cancellation, and unavailable capability

The parent sets a bounded deadline as part of its active in-turn wait. A deadline result records `timed_out` and one Boss event; an explicit child cancellation records `cancelled`, rejects stale child output, and emits one Boss event. Neither outcome routes a successor automatically.

Root cannot be kept active and resumed after it yields — there is no native same-parent resume primitive on this host. If a required dispatch cannot complete its invoke-and-await within the current active turn, the parent must stop with `Dispatch State: blocked` and `Stop Reason: host_completion_unavailable` in that same turn. The Boss event names the missing primitive and the known child state. It must not claim a future automatic route, use a prose handoff as a substitute, reinstate polling as a workaround, or silently wait for a later Boss message. Cross-turn or event-driven orchestration that would resume Root after it yields is out of scope for this adapter and is deferred to a separately approved durable control-plane design (GitHub Issue #35).

Heartbeat/schedule polling is demoted to diagnostic-only status: an operator-invoked emergency diagnostic for an already-blocked receipt, never the happy path. It cannot invoke a successor, consume a terminal result, make a workflow decision, or become acceptance evidence.

## Authority boundary

`collaboration.wait_agent` only delivers native terminal-receipt metadata to the parent, and only within the parent's active turn. It cannot judge QA, merge, approve, alter GitHub/GitLab, execute child-provided content, or bypass a human gate. This repository does not create a webhook, queue, persistent worker, or auto-merge capability.
