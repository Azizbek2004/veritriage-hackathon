# Opening — 90 Seconds

## Primary Opening (two-regime framing)

> "Under PSR Article 83 and the Czech AML Act, a European PSP has a bounded window
> to produce a defensible dossier — or eat the loss. VeriTriage ingests the Czech
> National Bank's 400,000-transaction dataset, auto-clears 82% deterministically at
> zero Bedrock tokens, and produces an FAÚ/ČNB-ready proof receipt for the 4% that
> escalate."

## Fallback Opening (PSR-only, 21 FTE)

> "Under PSR Article 83, a PSP handles thousands of alerts per day. VeriTriage clears
> 82% deterministically and saves 21.1 full-time analysts per 5,000 daily alerts —
> while producing ČNB-ready dossiers for the 4% that escalate."

Use the primary opening if the ČNB CSV and Tapaya forms are ready by H+18. Use the fallback if they are not. Do not resurrect the old write-off hook in either version.

## Timing

| Time | Action | Narration |
|---|---|---|
| 0:00 | Cockpit loads; top bar shows `100 alerts · 14ms · 82 auto-cleared · 0 LLM tokens · 21.1 FTEs saved (€1.16M/yr)`. | The primary or fallback line above. |
| 0:10 | Click "Run 100-Alert Batch." Counters climb to 82/14/4. | "82% never touch an LLM. The verifier clears them in 14 milliseconds. Let me show you the 4% that escalate." |
| 0:25 | Open the hero case. Bedrock two-hop runs. | "The agent reads the invoice, spots the contradiction — IT micro-entity billing for steel, director appointed 48 hours ago, Lithuanian IBAN." |
| 0:45 | All five gates green. Toggle OCR to 94.2%. Gate 3 red; decision flips to ESCALATE. | "The AI recommended auto-clear. The verifier caught it. Gate 3 failed, fail-closed." |
| 1:05 | Phone buzzes. Evidence, override reason, PSR Art. 59. | "The analyst sees what the agent found, what the verifier proved, and why it escalated." |
| 1:15 | FaceID → P-256 signature → green check. | "ECDSA P-256, bound to the receipt hash. If the receipt changes, the signature fails." |
| 1:25 | Audit tab `valid: true`; tamper flips red. | "Every step is hash-chained. This is what you show the Czech National Bank." |
| 1:30 | Close. | "AI speed for evidence. Deterministic proof for compliance. A human signs the decision." |

## The 21 FTE Math in One Breath

"5,000 alerts a day. 82% auto-clear. 4% direct escalation plus 14% step-up spillover is 305 escalated cases. At 180 seconds of real review each, that's 2.35 analysts. The manual baseline is 23.46. We save 21.1 FTE, about €1.16 million a year."

Do not read the whole equation on stage. Say the first and last number. Keep the file for Q&A.

## What Was Removed

- The old write-off hook. It is gone from the opening, the UI, and the deck.
- The signature-time claim as a performance metric. The production claim is the 180-second cognitive review.
- The fast-signature framing. The signature is fast; the review is not.

## What Must Stay

- The verifier override moment at 0:45.
- The three clocks answer for the Article 56(1) trap.
- The deployment sentence if asked "where does it sit?"
- The honest mock labels.

## Delivery Notes

- Pause after the one line. Let the judge read the metric card.
- Do not say the old write-off number or the fast-signature number. See `.agents/QA_WAR_ROOM.md`.
- If the live call exceeds 3.5s, the cassette label appears. Say "Degraded — cached, still auditable." No dead air.
- If the demo fails entirely, switch to the backup video and keep the pitch.
