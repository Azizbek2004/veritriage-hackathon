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

## AML / Track 5 Answers

| Question | Answer |
|---|---|
| "Which regime is primary — PSR or AML?" | "PSR Article 83 is the primary hook for the payment-suspension workflow. The Czech AML Act is the primary hook for merchant-level risk assessment. The same verifier serves both because the pattern is identical — evidence gathering, deterministic proof, human signature. We demonstrate both regimes in one workflow to show the architecture generalizes across regulatory domains." |
| "What makes an AML proof receipt legally non-repudiable?" | "Under Czech AML Act § 20, when an obliged entity postpones a suspicious transaction, the exact timestamp and the specific statutory grounds must be logged immutably, so the institution cannot be sued under § 20(7) if the transaction later turns out legitimate. Under § 16, the institution must retain reconstruction of the decision logic for 10 years. Our proof receipt binds the ČNB transaction row, the Tapaya KYB form, and the ARES snapshot into a SHA-256 hash signed by the § 22 AML contact person's ECDSA P-256 key — satisfying both § 20(7) safe-harbor and § 16/§ 25 audit reconstruction." |
| "Why won't a bank's Model Risk Management team block this?" | "Because the LLM never produces a number or a decision. It gathers evidence. The deterministic C# verifier recomputes every number in `System.Decimal` and independently grounds every claim via RFC 6901 pointer resolution. The human signs the final decision. This is the architecture MRM teams approve, because the model's failure modes are bounded and auditable." |
| "Aren't you just a feature that Feedzai or Hawk AI will absorb?" | "For bank-facing fraud triage, we compete with that risk directly — incumbents will add JSON pointer grounding in 12–18 months. Our defense is the pre-settlement CFO market: PSR Article 59 excludes corporate buyers from mandatory reimbursement, and Czech VAT Act § 109 makes the buyer a guarantor. That is a 4–5× faster sales cycle, a different buyer, and a distribution channel the incumbents do not own." |

## NEVER SAY

- `€48,000`
- `540,000 CZK`
- `PSD3 makes you liable`
- `25-second sign`
- `100% of liability`
- `VCN cures VAT`
- "95% of the code is identical" (the partial pivot is 2-3 hours of rework, not zero)
- "We processed 400,000 transactions" (say: "we ran a 5,000-row slice in X ms; the dataset has 400,000 rows")
- "8.5 out of 10 hackathon project" (the honest number is 7.2-7.5, with upside from rehearsal)

If the presenter is about to say one of these, stop. Use the answer above or say nothing.

## VC Judge Answer (Memorize Verbatim)

When the VC judge asks "Banks take 18 months to buy software — how do you go to market?",
say this verbatim:

> "We designed the engine to meet the strictest regulatory bar first — PSR Articles 56 and 83
> for PSPs and EMIs. Because PSR Article 59 explicitly excludes corporate accounts from mandatory
> bank fraud reimbursement, our Day-1 commercial wedge is selling this exact same deterministic
> verifier directly to mid-market CFOs and B2B spend platforms as a pre-settlement gate on SEPA
> pain.001 payment batches — stopping supplier IBAN spoofing and Czech § 109 unreliable-VAT-payer
> liability before the wire leaves the ERP."

Do not paraphrase. Do not add a sentence before or after. Deliver it, then stop.

The § 109 / CFO angle is Q&A ONLY. It must not appear in the demo, the slides, or the opening line. The demo is on PSR + AML. The § 109 answer is for one specific judge question, delivered in 25 seconds, then dropped.

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

## Legal Grounding Q&A

**"Did the LLM invent the legal citation?"**
> "No. The agent pipeline calls `lookup_statutory_provision`, retrieves the verbatim Czech text from our 12-section corpus, and injects it into the prompt. The finding carries the quoted clause, not a template. If the clause is missing, the pipeline says `(section text unavailable)` and the model must not cite it. The retrieval is deterministic C# in the pipeline, not the model autonomously choosing a tool."

**"How do you know the retrieved text is current?"**
> "Every corpus entry records its URL, `retrieved_at`, and `source: human_approved`. The corpus lives in `fixtures/legal_corpus_cnb_aml.json`; a production deployment would re-ingest and diff on a schedule."

**"Why not a vector database?"**
> "The corpus is 12 sections. Keyword search over 12 documents is deterministic and sub-millisecond. A vector database adds no value; the tool interface lets us swap in a full RAG backend later without changing the agent contract."

**"Did the model call the tool?"**
> "The deterministic agent pipeline calls the tool before the model invocation and logs `lookup_statutory_provision`; the retrieved text is injected into the prompt. We do not claim the LLM autonomously selected the tool."

**"Why not Kùzu for the graph roadmap?"**
> "Kùzu is archived — GitHub reports `archived: true`. Phase 1 is our in-memory C# adjacency graph; Phase 2 is embedded DuckDB.NET with the DuckPGQ extension; Phase 3 is Memgraph or Neo4j with Kafka ingestion. We keep deterministic scoring in C# in every phase."

**"How many legal sections are in the corpus?"**
> "Thirteen verified/reference entries: Act § 6(1)(a), § 6(1)(b), § 6(1)(c), § 9(2)(b), § 9a(2)(c), § 18(1), § 21(2), § 21a, § 22(1); Decree § 7, § 8(2)/§ 9(1)(a), § 12; FAU Guideline No. 4."

**"How do you distinguish a mule from a taken client?"**
> "The topology engine separates them: a mule aggregator has at least three shared counterparties or a high-centrality hub with under-six-hour pass-through; a compromised victim is a low/medium-tier client with a sudden 2.5x drain into that hub. That distinction prevents filing a hostile SAR against a phished retail victim while still freezing the outbound transfer."

**"What is the radar distance?"**
> "R = 1.0 minus the weighted centrality score. R 0.00 is the mule core; R 1.00 is isolated periphery. The radar is additive forensic evidence; it never changes priority or the 5-component parity."
