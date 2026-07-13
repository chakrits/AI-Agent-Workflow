# Postmortem Writing Rules

## Use postmortem when

- Bug is fixed and validated.
- The cause has learning value.
- Future engineers need a searchable engineering record.
- Regression/preventive follow-up is needed.

## Use incident report instead when

- Customer-visible outage.
- Production impact with timeline/blast radius/comms.
- Paging/escalation history matters.
- Multiple teams or operational response are involved.

## Use task log instead when

- Trivial typo or one-line obvious fix.
- No durable learning value.
- PR description already captures everything.

## Good root cause wording

Bad:

> The system had a synchronization issue.

Good:

> `tadaLaunchPrepare` skipped the cross-stream event when `scheduler->numStreams == 1 && !plan->persistent`, allowing `launchStream` to enqueue the kernel before `deviceStream` published `scratchBuf`.

## Action item rules

Every action item must include:

- what changes
- owner
- tracking artifact
- expected closure condition

Do not create performative action items.
