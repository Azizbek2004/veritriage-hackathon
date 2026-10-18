# Evaluation Inputs

The remediation brief expects two inputs:

- `evaluation/EVAL_REPORT.md` — the adversarial evaluation with the 3 Q&A traps and the 5 changes.
- `evaluation/HONEST_AMENDMENTS.md` — the amendments that override the evaluation's optimistic estimates.

Neither file was supplied in this workspace. Do not fabricate them. An invented evaluation would launder guesses into the plan.

## What We Use Instead

`REMEDIATION.md` is the reconciled delta plan built from the human-provided Remediation Architect brief. It contains the seven bounded changes, their file targets, acceptance criteria, and build times. It is the authoritative source for this environment.

`.agents/QA_WAR_ROOM.md` contains the three trap answers and the NEVER SAY list. `pitch/` contains the post-remediation opening, deployment line, and throughput math.

## If the Originals Arrive Later

1. Read both files.
2. Compare every finding to `REMEDIATION.md`.
3. A finding that is already covered: mark it `COVERED` and do not change scope.
4. A finding that conflicts with `REMEDIATION.md`: write `PROPOSAL.md` and stop. Do not silently apply the more optimistic estimate.
5. A new finding outside the seven changes: add it to `EXTENDED_FINDINGS.md` as a proposal. Do not implement it.

The honest post-remediation estimate is 68–72%, not 81%. Do not chase the optimistic number with unplanned scope.
