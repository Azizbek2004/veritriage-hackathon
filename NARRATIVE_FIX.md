# Narrative Fix — One Active Line

**Verdict:** the narrative is almost coherent. One active pitch line contradicts the legal positioning.

## Finding

[pitch/opening.md](pitch/opening.md) at `1:05` says the phone shows `PSR Art. 59`. The hero case is a B2B supplier-invoice fraud, and [AGENTS.md](AGENTS.md) says we never claim PSR Article 59 coverage for B2B transactions. Article 59 is the consumer impersonation right. The hero's regulatory clock is `PRE_EXECUTION_FREEZE` under Article 83, with AI Act Article 14 human oversight.

This is a 1-minute copy fix, not an architecture change. Do not apply it without human approval.

## Proposed Edit

Replace this line in [pitch/opening.md](pitch/opening.md):

```text
| 1:05 | Phone buzzes. Evidence, override reason, PSR Art. 59. | "The analyst sees what the agent found, what the verifier proved, and why it escalated." |
```

with:

```text
| 1:05 | Phone buzzes. Evidence, override reason, PSR Art. 83 pre-settlement freeze; AI Act Art. 14 human oversight. | "The analyst sees what the agent found, what the verifier proved, and why it escalated." |
```

Also set the hero case's `regulatory_clock` to `PRE_EXECUTION_FREEZE` in the hero fixture. That is the default already, so this is a confirmation, not a new state.

## What Stays

- The three-clock Q&A answer stays exactly as written. Article 59 is correct for an impersonation dispute; it is wrong for the B2B hero.
- The `IMPERSONATION_DISPUTE` badge state stays. It is a state, not the hero's default.
- Workshop the `UNAUTHORIZED_REFUND` state only if the demo case is changed to an unauthorized consumer payment. Do not change the hero.

## Historical Note

`blueprint.md` and `project.md` still contain the old `PSR Article 59` demo line under their superseded banners. Do not quote those files on stage. The active pitch and Q&A are the source of truth.

## Approval

- [ ] Human approves the line change.
- [ ] Apply to `pitch/opening.md` only.
- [ ] Rehearse the corrected 1:05 line three times.
- [ ] Do not add a new legal claim or a new badge state.
