---
name: debugging-discipline
description: Use this skill when debugging starts: bug reports, failing tests, CI failures, stack traces, flaky behavior, regressions, unexpected behavior, or requests to diagnose/investigate. Enforce reproduce → fail-path trace → hypothesis falsification → breadcrumb ledger before proposing fixes. Do not use for writing the final postmortem after a validated fix; use engineering-postmortem for that.
---

# Debugging Discipline

This skill is the engineering debugging discipline for AI agents. It prevents guess-and-patch behavior by requiring a reliable repro, fail-path analysis, falsifiable hypotheses, and an experiment ledger before proposing or applying fixes.

## Trigger

Use this skill when the user or another agent provides:

- a bug report
- a failing test
- CI failure output
- stack trace / error log
- flaky behavior
- regression
- unexpected runtime behavior
- request to debug, diagnose, investigate, or find root cause

## Do not use when

- The task is pure feature implementation with no failure to diagnose.
- The fix is already landed and validated and the user asks for RCA/postmortem. Use `engineering-postmortem`.
- The task is only test case design with no failing behavior. Use `functional-test-design`.

## Core discipline

Apply the four steps in order:

1. **Reproduce reliably**
2. **Know the fail path**
3. **Falsify the hypothesis**
4. **Every run is a breadcrumb**

In normal agent workflow mode, do not recite a mantra unless explicitly requested. Apply the discipline silently and record the reasoning in the debug artifacts.

If the user explicitly invokes `/debug-mantra`, print this block once:

> **Mantra:**
> 1. **First is reproducibility.** Can the issue be reproduced reliably?
> 2. **Know the fail path.** Debugger first; then source trace + knob enumeration; then in-code instrumentation.
> 3. **Question your hypothesis.** What would disprove it?
> 4. **Every run is a breadcrumb.** Cross-reference all of them.

## Required gates

### Gate 1 — Repro

Before proposing a fix, establish one of:

- deterministic repro
- high-rate flaky repro with repeatable trigger
- failing automated test
- captured artifact sufficient for offline diagnosis

If there is no repro, stop and request missing artifacts or permission to instrument. Do not invent a fix.

### Gate 2 — Fail path

Trace the failure path using the strongest available method:

1. debugger / breakpoint / stack trace
2. source trace + knob enumeration
3. targeted instrumentation with unique tags such as `[DBG-a4f2]`

Record relevant knobs:

- config flags
- env vars
- feature toggles
- branch conditions
- input shape
- timing/concurrency
- dependency version
- data state
- build/runtime options

### Gate 3 — Hypothesis matrix

Generate 3-5 ranked hypotheses. For each:

- why it explains the symptom
- what would prove it
- what would disprove it
- experiment to run
- result
- status: ruled in / ruled out / needs more evidence

Run the cleanest disproof first where possible.

### Gate 4 — Breadcrumb ledger

Maintain a ledger of every experiment:

- timestamp / run id
- change made
- command/test/data used
- observed result
- what it ruled in/out
- next action

A hypothesis is not accepted if it contradicts prior breadcrumbs.

## Output artifacts

Prefer updating or producing:

- `docs/templates/DEBUG_LEDGER.md` or task-specific debug ledger
- `docs/templates/REPRO_STEPS.md`
- `docs/templates/HYPOTHESIS_MATRIX.md`
- `TASK_LOG.md`
- `TEST_REPORT.md` when QA validation is involved

## Handoff rules

When handing off to Developer Agent:

- include repro steps
- include failing command/test
- include narrowed fail path
- include hypotheses and ruled-out causes
- include safest fix direction

When handing off to QA Agent:

- include original repro
- include fixed build/branch/commit
- include validation scope
- include regression areas

When root cause and fix are validated, offer to use `engineering-postmortem` if the bug has learning value.

## Completion checklist

Before declaring the debug work complete:

- [ ] Repro is documented or explicitly unavailable with reason.
- [ ] Fail path is traced to a concrete seam.
- [ ] At least two plausible hypotheses were considered unless the cause was directly proven by the repro.
- [ ] Disproof/proof experiment is recorded.
- [ ] Fix proposal addresses root cause, not only symptom.
- [ ] Validation plan includes original repro.
- [ ] Remaining uncertainty is stated honestly.
