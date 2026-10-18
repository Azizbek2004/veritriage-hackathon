# Q&A War Room

One voice per domain. Azizbek = business + law. Shohjahon = technical. Answer in ≤3 sentences. Silence is leverage.

This file is the drill. If an answer is not here, do not improvise law.

## Trap 1 — Article 56(1) D+1 vs 15 Days

**Question:** "Article 56 gives 15 days, but Article 56(1) says D+1. Which is it?"

**Answer:**
> "There are three clocks in the PSR. Pre-execution suspension under Article 83 means the money hasn't moved — no refund is owed. If it has moved and the transaction is unauthorized, Article 56(1) gives D+1. If it's an impersonation dispute, Article 59 gives 15 business days. VeriTriage displays which clock applies per case."

**Why it works:** It separates the three legal states instead of treating "the PSR" as one deadline. It also explains the product's `regulatory_clock` badge.

## Trap 2 — Gate 2 / Step Functions

**Question:** "Why not Step Functions? Gate 2 just looks like a routing rule."

**Answer:**
> "Gate 2 is not a routing heuristic — it's a tool-scope invariant. Bedrock decides which tool to call; Gate 2 enforces that the call stayed within the envelope's declared scope and never exceeds two hops. Step Functions cannot make the semantic decision; it can only enforce the invariant, which is exactly what we do."

**Why it works:** It concedes the orchestration layer is replaceable and claims the semantic decision plus the invariant as the differentiator.

## Trap 3 — 25-Second Rubber Stamp

**Question:** "A human signing in 25 seconds is a rubber stamp. Where is the oversight?"

**Answer:**
> "A 25-second signature is a demo artifact. In production, the officer spends 120–180 seconds reading the pointer-highlighted evidence before signing. At 305 escalated cases per day, that's 3 analysts — down from 23.5 manual reviewers, a 21-FTE reduction. The signature is the legal record; the review time is the cognitive gate."

**Why it works:** It admits the demo compression, restates the production review time, and ties it to the FTE math. It never defends 25 seconds as oversight.

## Mastercard

**Question:** "Where is the Mastercard rail / MCC / virtual card?"

**Answer:**
> "We are not a card product. The Mastercard rail is V1 for the 18% of cases where the supplier refuses split settlement. What we built is the proof layer above any rail."

Do not add a Mastercard UI, MCC label, or virtual card hook. The answer is a concession, not a product claim.

## NEVER SAY

- `€48,000`
- `540,000 CZK`
- `PSD3 makes you liable`
- `25-second sign`
- `100% of liability`
- `VCN cures VAT`

If the presenter is about to say one of these, stop. Use the answer above or say nothing.

## Additional Traps to Drill

### "Who verifies the verifier?"

> "The verifier is deterministic C# with a public test suite. It doesn't guess; it recomputes. A FINREG auditor can read the proof steps and re-run the arithmetic on paper."

### "What's mocked?"

> "ARES is live. Bedrock is live. Textract is pre-computed and labeled. VoP is fixture — it's PSP-only with QWAC mTLS. The card issuer is not used. Every mock is labeled on screen."

### "Why won't the bank build this?"

> "They might build the agent. They won't build the cross-system verifier plus proof receipt plus signed audit chain that sits between the agent and their case management system. That's our lane."

### "Isn't this just INETCO / Socratix?"

> "They recommend. We prove. The agentic triage pattern is becoming commoditized — the differentiator is the deterministic proof receipt bound to a human signature. No incumbent has that."

### "What kills you?"

> "Supplier refusal at scale for the CMR-Clear pivot, or the ARES VR endpoint breaking on stage. Both are pilot-testable in 30 days — that's what a €65k pre-seed buys."

## Delivery Rules

1. Answer in ≤3 sentences.
2. One voice per domain. Do not ping-pong.
3. Never improvise a legal citation. If unsure, say "I'll follow up with the exact article" and move on.
4. Concede the mock, then explain the proof. Honesty is the credibility signal.
5. Do not say "25 seconds" as a performance claim. Say "180-second cognitive review" and "25-second signature is a demo artifact."
6. Do not say "€48,000." Use the 21.1 FTE / €1.16M economics.
7. Do not add a Mastercard UI in response to a question.

## Three-Sentence Drill

Rehearse each answer with a timer. If it runs past 20 seconds, cut a sentence. The judge remembers the first sentence and the last.

## Source

The three traps, the Mastercard concession, and the NEVER SAY list come from the human-provided Remediation Architect brief. `AGENTS.md` repeats the three answers. If they diverge, `AGENTS.md` wins and this file is fixed.
