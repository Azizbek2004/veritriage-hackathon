# VeriTriage — Full Project Explanation

> **Remediation note (pre-H+0):** This is the pre-remediation narrative. The current positioning, Gate 2 scope invariant, three regulatory clocks, 180-second review, and Q&A live in `AGENTS.md`, `REMEDIATION.md`, and `.agents/QA_WAR_ROOM.md`. Where this document conflicts, the environment docs win.

**An agentic fraud triage system with a deterministic proof layer**

*Enterprise category · $ hackathon_ · Prague, 19–20 October 2026*

---

## 1. The One-Paragraph Version

VeriTriage is a decision-support system for European payment service providers (PSPs) and banks. When a suspicious payment is suspended or a customer disputes a transfer, an AI agent gathers the evidence needed to make a decision — entity registration data, statutory history, transaction history, device telemetry, and document contents. A deterministic verifier then independently recomputes every number the agent claims and checks every policy constraint before a human signs the final decision on a mobile device. The agent proposes. The verifier proves. The human signs. Every step is recorded in a hash-chained audit trail that can be produced for a regulator.

---

## 2. The Problem

### 2.1 The Regulatory Reality

Under the **EU Payment Services Regulation (PSR)** — the conduct regulation that sits alongside PSD3 — PSPs face a set of obligations that converge on a single operational question: *when a payment is suspicious, who decides, on what evidence, and within what deadline?*

Three provisions matter:

- **PSR Article 83** requires transaction monitoring on both the payer and payee side, covering transaction, payer, account, payee, session, and device signals. Failure to operate compliant monitoring is linked directly to reimbursement liability.
- **PSR Article 55(2) and Article 56** reverse the burden of proof. A log showing that Strong Customer Authentication (SCA) was completed is no longer sufficient to prove that the customer authorised the payment, or that they acted with gross negligence. If the PSP wants to refuse a refund, it must produce evidence.
- **PSR Article 59** grants a refund right for impersonation fraud, but only for consumer payments. It does not cover business-to-business fraud, and it does not cover supplier invoice fraud.

The combined effect: **when a PSP suspends a payment or refuses a refund, it has a bounded window — 15 business days in most cases — to either pay the money back or produce a defensible dossier.** If it cannot, it absorbs the loss.

### 2.2 The Operational Reality

A tier-2 European PSP handles thousands of fraud alerts per day. Each alert requires an analyst to:

1. Pull the entity's registration data.
2. Check whether the account is on any sanctions or mule lists.
3. Review the transaction history for velocity anomalies.
4. Compare the document that triggered the alert against the registry.
5. Decide whether to release, hold, or escalate.
6. Document the decision in a form that will survive a regulatory review.

This takes **20 to 40 minutes per case**. At thousands of cases per day, the PSP faces a trilemma: hire more analysts (expensive), auto-clear more (risky), or accept slower decisions (liability).

### 2.3 The Gap

Agentic fraud triage tools are emerging. INETCO's BullzAI Investigate, launched in 2026, accelerates fraud investigations from 10–30 minutes to about 20 seconds with ~95% recommendation precision. WorkFusion's Isaac cuts manual research time by more than 70%. These tools work.

**But they do not solve the trust problem.** An AI agent that gathers evidence and recommends a decision still leaves the PSP with two unresolved questions:

1. **Can I trust the numbers the agent produced?** If the LLM extracted the invoice total as €1,000 instead of €10,000, the recommendation is wrong regardless of how well-formatted it is.
2. **Can I defend the decision to a regulator?** A recommendation with a paragraph of LLM-generated rationale is not a defensible record. The regulator wants to see what evidence was considered, what arithmetic was applied, and what the human actually saw before signing.

**This is the gap VeriTriage fills.** It is not a better triage agent. It is the **verification and proof layer** that makes an agentic triage system deployable inside a regulated bank.

---

## 3. The Core Insight: Three Layers of Trust

The fundamental design insight is that an AI-driven decision system needs three distinct layers, each with its own guarantee and its own failure mode:

| Layer | Role | Guarantee | Technology |
|---|---|---|---|
| **LLM Agent** | Gathers evidence, interprets unstructured context, drafts a narrative | **None** — probabilistic, can hallucinate, cannot do arithmetic reliably | Amazon Bedrock Converse with `toolConfig` |
| **Deterministic Verifier** | Recomputes every number, checks every constraint, validates every claim against evidence | **Mathematical certainty** within the defined rule set | C# `System.Decimal`, constraint engine, JSON pointer resolution, Textract provenance |
| **Human Signer** | Reviews the verified evidence, overrides if needed, signs the decision | **Legal accountability** — the signature is the auditable record | ECDSA P-256 on a mobile device, hash-bound to the proof receipt |

The system's invariant is: **no decision reaches `AUTO_CLEAR` or `APPROVED` unless the verifier has produced a proof receipt showing that every number was independently recomputed and every policy constraint was satisfied.** If verification fails, the case is fail-closed to `ESCALATE`. The agent's recommendation is stored for audit but never followed.

This is the difference between "we have an AI that makes decisions" and "we have an AI that assembles evidence, a deterministic engine that proves the numbers, and a human who signs the final decision with cryptographic proof." The second is deployable in a bank. The first is not.

---

## 4. The Architecture

### 4.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  1 · INGEST                                                         │
│  Fraud alert (VoP NO_MATCH / velocity / behavioural)                │
│  + supporting documents (invoice PDF / ISDOC / statement)           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2 · AGENT  (Amazon Bedrock Converse + toolConfig)                  │
│                                                                     │
│  The agent is given the alert and decides which evidence to gather. │
│                                                                     │
│  Tools available:                                                   │
│    • get_ares_basic_profile(ico)          — identity, NACE, age     │
│    • get_ares_statutory_history(ico)      — directors, appointment  │
│    • get_transaction_history(account)     — 90-day ledger           │
│    • extract_document(file_ref, schema)   — Textract + schema       │
│                                                                     │
│  Hop 1: gather baseline evidence.                                   │
│  Hop 2: if Hop 1 reveals a contradiction (signatory mismatch,       │
│         cross-border IBAN, NACE mismatch), autonomously gather      │
│         additional evidence from a closed set of tools.             │
│                                                                     │
│  Output: EvidenceEnvelope (structured JSON) + ClaimAssertion[]      │
│          The agent never outputs a decision.                        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3 · DETERMINISTIC VERIFIER  (pure C#, no I/O, no LLM)              │
│                                                                     │
│  Gate 1 — Strict schema check (UnmappedMemberHandling.Disallow)     │
│  Gate 2 — Second-hop policy consistency (was the second hop         │
│           justified by Hop 1 evidence?)                             │
│  Gate 3 — OCR provenance (Textract confidence ≥ 99%, bounding box)  │
│  Gate 4 — Arithmetic recomputation (System.Decimal, 128-bit)        │
│  Gate 5 — Claim grounding (RFC 6901 JSON pointer resolution)        │
│                                                                     │
│  Output: VerificationResult (valid / invalid + proof steps + hash)  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4 · DECISION  (rule engine, versioned, deterministic)              │
│                                                                     │
│  Aggregate rule hits → AUTO_CLEAR / ESCALATE / BLOCK                │
│  If verifier invalid → force ESCALATE (fail-closed)                 │
│  Every rule hit carries a legal reference (PSR Art. 83, etc.)       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
        ┌────────────────────┐   ┌──────────────────────────────┐
        │ AUTO_CLEAR         │   │ ESCALATE                     │
        │ (82%)              │   │ (4%)                         │
        │                    │   │                              │
        │ Server signs       │   │ SignalR hub →                │
        │ receipt, executes  │   │ React Native app →           │
        │ automatically      │   │ FaceID → ECDSA P-256 sign    │
        └────────┬───────────┘   └──────────────┬───────────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5 · AUDIT  (SHA-256 hash-chained, append-only)                     │
│                                                                     │
│  Every event: AlertIngested, EvidenceGathered, VerificationPassed,  │
│  DecisionMade, ApprovalSigned, CaseClosed. Each event's hash        │
│  includes the previous event's hash.                                │
│                                                                     │
│  GET /audit/{caseId} recomputes the chain and returns valid: true   │
│  or false. The UI shows this badge. It is never faked.              │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Responsibilities

The system is split into five projects, each with a single responsibility:

- **`PayShield.Api`** — HTTP endpoints, SignalR hub, authentication, orchestration. Never contains business rules.
- **`PayShield.Domain`** — rules, decisions, money math, § 109a field mapping (in the original PayShield version), proof-receipt schema. Pure C#, no I/O.
- **`PayShield.Verifier`** — the five gates. A pure library with no dependency on the LLM, the database, or the network. This is what makes it testable and auditable.
- **`PayShield.Infrastructure`** — EF Core / PostgreSQL, ARES client, Bedrock client, audit persistence. Never makes decisions.
- **`apps/web`** (Next.js) — analyst cockpit, proof panel, audit view, demo controls.
- **`apps/mobile`** (Expo) — approval UX, key custody, ECDSA signing.

The separation is not stylistic. It is what allows the verifier to be unit-tested, run in isolation, and audited by a third party without exposing the rest of the system.

---

## 5. The Verifier: Five Gates in Detail

The verifier is the heart of the system. It is a pure C# library that takes an `EvidenceEnvelope` and a `ClaimAssertion[]` and returns a `VerificationResult` with a list of proof steps. Each gate addresses a specific failure mode.

### Gate 1 — Strict Schema Check

The agent's output is deserialized with `UnmappedMemberHandling.Disallow` and `JsonNumberHandling.Strict`. Any missing required field, any hallucinated field, or any number that doesn't match the expected type triggers a fail-closed `ESCALATE`.

**What this prevents**: The agent inventing a field (`"confidence": 0.95`) that downstream code does not expect, or returning `100` when `100.00` is required.

### Gate 2 — Second-Hop Policy Consistency

When the agent decides to make a second evidence hop, the verifier checks that the hop was justified by evidence from the first hop. For example: `get_ares_statutory_history` is only valid if Hop 1 found a signatory name mismatch or a cross-border IBAN. If the agent called it without justification, the verifier fails closed.

**What this prevents**: The agent making spurious tool calls, or the demo appearing to work because the agent hard-coded the second hop.

### Gate 3 — OCR Provenance

For every number sourced from a document (via Textract), the verifier checks that:

- The Textract `Confidence` score is ≥ 99.0%.
- The `BoundingBox` coordinates point to the number's location in the original document.
- The value Textract extracted matches the value the agent used.

If any of these fails, the verifier fails closed.

**What this prevents**: The "verified hallucination" — where the verifier proves arithmetic on a number the LLM misread from a PDF.

### Gate 4 — Arithmetic Recomputation

Every number the agent claims is independently recomputed in `System.Decimal`:

- `net + vat = gross` (±0.01)
- `vat = net × vat_rate` (±0.01)
- `amount_czk = amount_eur × cnb_rate` (±0.01)
- Velocity ratios, aggregations, tenure calculations

No `double`, no LLM involvement.

**What this prevents**: Arithmetic errors in the agent's narrative, and — more importantly — arithmetic errors in the bank's own ledger if the agent's numbers were trusted without recomputation.

### Gate 5 — Claim Grounding

The agent outputs a structured `ClaimAssertion[]` array. Each assertion contains:

- `ClaimId` — a unique identifier
- `ClaimType` — a typed enum (`DIRECTOR_TENURE_HOURS`, `INVOICE_TOTAL_CZK`, etc.)
- `NarrativeTemplate` — the human-readable sentence (`"Director {0} appointed on {1} ({2}h before invoice)."`)
- `JsonPointers` — RFC 6901 pointers into the canonical `EvidenceEnvelope`
- `ExpectedValues` — the values the agent claims those pointers will resolve to

The verifier resolves each pointer and checks that the resolved value matches the expected value. If any pointer fails to resolve, or any value mismatches, the case fails closed.

**What this prevents**: The agent making claims that are not backed by the evidence it gathered.

### The Proof Receipt

Every verification produces a proof receipt — the artifact that makes the decision defensible.

```json
{
  "receiptId": "pr-2026-10-19-0004",
  "caseId": "...",
  "decision": "ESCALATE",
  "riskScore": 90,
  "rulesVersion": "1.0.0",
  "verification": {
    "valid": true,
    "engines": {
      "arithmetic": {"passed": 6, "failed": 0},
      "constraints": {"passed": 4, "failed": 0},
      "schema": {"passed": 12, "failed": 0},
      "grounding": {"passed": 3, "failed": 0, "ungrounded": []}
    },
    "proofSteps": [
      {"claim": "velocity_3x", "computed": 12, "baseline": 4, "ratio": 3.0, "valid": true},
      {"constraint": "R-FRAUD-01", "condition": "VoP=NO_MATCH AND age<30",
       "satisfied": true, "valid": true, "legalRef": "PSR Art. 59"}
    ]
  },
  "agentRecommendation": "AUTO_CLEAR",
  "overriddenByVerifier": true,
  "receiptHash": "sha256:bbf6a8e2...",
  "prevHash": "sha256:...",
  "serverAttestation": {
    "algorithm": "ECDSA_P256_SHA256",
    "publicKeyThumbprint": "...",
    "keyCustodyMode": "LOCAL_HSM_SIMULATOR (Prod Target: AWS KMS FIPS 140-3)",
    "signatureBase64": "..."
  },
  "createdAt": "2026-10-19T21:15:00Z"
}
```

This receipt is the product. The judge sees the decision, the proof, and the audit chain in one artifact.

---

## 6. Tiered Autonomy: The Economics

The original design required a human signature on every decision. This was architecturally correct but economically incoherent — a tier-2 PSP handles thousands of alerts per day, and if every one requires a phone signature, the system either collapses or the signature becomes a rubber stamp.

The tiered autonomy model fixes this.

| Tier | Share of Alert Volume | Condition | Execution Path | Human Effort | Latency |
|---|---|---|---|---|---|
| **Tier 1 — Auto-Clear** | ~82% | All 5 verifier gates pass; velocity < 2×; entity age > 180 days; VoP `MATCH` | Deterministic verifier signs receipt, releases payment automatically | **0 seconds** | 1.8s |
| **Tier 2 — Step-Up Hold** | ~14% | Minor anomaly (VoP `CLOSE_MATCH`, off-hours velocity); no mule-graph collision | State machine moves to `HELD_PENDING_STEP_UP`, emits webhook to core banking | **0 seconds** | 2.4s |
| **Tier 3 — Statutory Escalation** | ~4% | PSR Art. 83 mule indicators; Art. 56/59 refund refusal > €5,000; verifier gate failure | Agent two-hop investigation → verifier locks dossier → risk officer signs via QR ECDSA | **~25 seconds** (down from 40 minutes) | 6.2s + signing |

The 82/14/4 split is the model the demo uses. It is calibrated to production benchmarks (WorkFusion reported ~60% auto-closure; INETCO reported ~95% recommendation precision). The demo seeder produces the split deterministically and the verifier evaluates all 100 envelopes live in roughly 14ms, so the number is a **measurement**, not a claim.

---

## 7. The Regulatory and Legal Grounding

VeriTriage is anchored in the current PSR, not PSD3, and not the repealed Czech VAT provisions that the original PayShield 109 project was built on. This matters because a Deloitte or FINREG judge will test the legal accuracy before anything else.

| Provision | What it requires | How VeriTriage addresses it |
|---|---|---|
| **PSR Art. 83** | Real-time transaction monitoring on payer and payee sides, using transaction, payer, account, payee, session, and device signals. Failure to monitor is linked to reimbursement liability. | The agent gathers exactly these signals; the verifier proves that the evidence was complete and the arithmetic was correct. |
| **PSR Art. 55(2) and 56** | A log showing SCA is not sufficient to prove authorisation or gross negligence. PSPs have a bounded window (typically 15 business days) to refund or justify refusal. | The proof receipt is the justification. It shows what evidence was considered, what arithmetic was applied, and what the human signed. |
| **PSR Art. 59** | Consumer-only refund right for impersonation fraud. | VeriTriage does not claim Art. 59 coverage for B2B transactions. The positioning is Art. 83 and Art. 55/56 — the monitoring and evidentiary obligations. |
| **EU AI Act Art. 14** | Human oversight: a person must be able to understand the system's limitations, monitor its operation, intervene or override, and disregard or reverse the output. | The human signature is the oversight. The proof receipt records what the human saw, and the override path is documented. |

The positioning is precise: VeriTriage is the **Evidentiary Defense & Suspension-Resolution Engine**. It is not the real-time payment authorization system. When a transaction is suspended by the bank's own upstream rule engine (under Art. 83), or when a customer files a dispute (under Art. 56/59), VeriTriage assembles the dossier that lets the bank either refund or justify its refusal within the statutory window.

---

## 8. The Demo

The demo is 90 seconds. It is designed to be preloaded and offline-safe. The demo is not "run the pipeline and see what happens" — it is "show the judge that the AI was wrong and the verifier caught it."

| Time | Action | What the judge sees and hears |
|---|---|---|
| **0:00** | Cockpit loads. Tier matrix at top: `82 / 14 / 4`. Queue of 3 visible cases. | *"Under PSR Articles 56 and 83, a PSP has 15 business days to refund or justify a refused payment. This is what that deadline looks like on a Monday morning."* |
| **0:10** | Click "Run 100-Alert Batch Triage." Counters climb to 82 / 14 / 4 over about 1 second. Elapsed time shows ~14ms. | *"82% of these alerts never touch an LLM. The deterministic verifier clears them in 14 milliseconds. Let me show you the 4% that escalate."* |
| **0:25** | Click the hero Tier-3 case (€48,000, Lithuanian IBAN, IT micro-entity registered 12 days ago). Live Bedrock two-hop investigation runs. | *"The agent reads the invoice, spots the contradiction, and autonomously decides to query the Czech Commercial Register. It discovers the director was appointed 48 hours ago."* |
| **0:45** | The verifier panel shows all 5 gates green. Then the presenter clicks the OCR confidence drop toggle. | *"Now watch what happens when the verifier detects a degraded scan."* Gate 3 flips red. The decision flips from AUTO_CLEAR to ESCALATE. *"The AI recommended auto-clear. The verifier overrode it."* |
| **1:05** | Phone buzzes. Analyst opens the Expo app. Sees the verified evidence, the override reason, the legal reference. | *"The analyst sees exactly what the agent found, exactly what the verifier proved, and exactly why the decision was escalated."* |
| **1:15** | FaceID → ECDSA P-256 signature. Server verifies. Green checkmark. | *"The signature is bound to the proof receipt hash. If the receipt changes, the signature fails."* |
| **1:25** | Switch to Audit tab. Hash chain shows `valid: true`. Click "Simulate Tamper." Chain flashes red. | *"Every step is in a hash-chained audit trail. This is what you show the Czech National Bank."* |
| **1:30** | Close. | *"AI speed for evidence gathering. Deterministic proof for compliance. A human signs the final decision."* |

### What Is Live vs. What Is Mocked

The team is honest about this on stage. Being honest about the mocks is a credibility signal, not a weakness.

| Component | Status | Why |
|---|---|---|
| ARES basic profile endpoint | **Live** | Real HTTP call, real JSON response, cached for latency. |
| ARES VR statutory history endpoint | **Live** | Real HTTP call, filtered for `datumVymazu == null` (active directors only). |
| Bedrock Converse two-hop agent | **Live** | Real model invocation with `toolConfig`, pre-warmed. |
| Textract invoice extraction | **Pre-computed** | Real Textract output, cached as JSON to keep the demo offline-safe. |
| VoP results | **Fixtures** | The EPC VoP API is PSP-only (requires QWAC mTLS); labeled as fixtures. |
| Transaction history | **Synthetic** | Generated for the demo; labeled. |
| Device telemetry | **Embedded in fixture** | Realistic data, but not pulled from a live device graph. |
| Mastercard / card issuance | **Not used** | The project does not rely on a card rail. |
| AWS KMS signing | **Local P-256 with honest labeling** | `keyCustodyMode: "LOCAL_HSM_SIMULATOR (Prod Target: AWS KMS FIPS 140-3)"` on every receipt. |

The judge's question "what's actually running?" has a clean answer: the agent and ARES are live; the rest is pre-computed but real, and it's labeled.

---

## 9. The Competitive Landscape

| Player | What they ship | Where they fall short |
|---|---|---|
| **Pohoda (Stormware)** | VAT register check, unreliable payer flag | Detection only. Does not execute the cure. |
| **SAP S/4HANA** | Unreliable payer validation in payment run | Enterprise-only. Does not produce a proof receipt. |
| **UniCredit CZ / ČS / ČSOB** | VoP free since October 2025, including bulk XML | Verification only. Does not decide. |
| **INETCO BullzAI** | Fraud investigation in ~20 seconds, ~95% precision | Recommendation only. No deterministic verifier, no proof receipt. |
| **WorkFusion Isaac** | Manual research cut 70%, 60% auto-closure | Agentic triage. No cryptographic proof layer. |
| **QWED-Finance** | Deterministic verification middleware with ES256 proof receipts | Middleware for calculations. No triage workflow, no human signing ceremony. |
| **Socratix AI** | AI fraud analyst that gathers alerts and escalates | Agentic triage. Same trust gap as INETCO. |
| **VeriTriage** | Agentic triage + deterministic verifier + proof receipt + human signature + hash-chained audit | — |

**The wedge is not "agentic fraud triage."** That category is real and getting crowded. The wedge is **the verification and proof layer that makes agentic triage deployable in a regulated bank.** No incumbent has this combination.

---

## 10. The Business Case

### 10.1 Who Buys

The buyer is the **Head of Financial Crime or the Chief Risk Officer at a mid-sized European PSP or a tier-2 bank**. They are measured on three things:

1. Reimbursement losses under PSR Article 56/59.
2. Regulatory findings from the national competent authority.
3. Cost per alert handled by the L2/L3 analyst team.

VeriTriage reduces all three: auto-clearing 82% of alerts, producing a proof receipt that survives audit, and cutting Tier-3 investigation time from 40 minutes to 25 seconds.

### 10.2 Pricing

Per-alert pricing, not per-seat. Indicative: **€0.30–0.50 per processed alert**, or **€2,000–8,000/month** depending on volume. The proof-receipt export is included; the audit-pack export (regulator-ready dossier) is a premium tier.

### 10.3 Expansion

The initial beachhead is the Czech market, where the team is based and where Deloitte's tax practice has strong local reach. The expansion path is:

1. **Czech and Slovak PSPs** — regulatory familiarity, existing relationships.
2. **CEE banks** — same PSR obligations, larger alert volumes.
3. **EU-wide** — the PSR applies across all member states; the agent's tool set generalizes (each country's company registry has a REST API; ARES is one instance).

The long-term thesis is not "Czech fraud triage." It is **"the verification and proof layer for agentic decisions in regulated finance."** Fraud triage is the first application; onboarding, trade finance, and compliance are subsequent applications of the same pattern.

### 10.4 Moat

The moat is not the model. Anyone can call Bedrock. The moat is:

- **The identifier corpus** — the mapping between registry codes, tax office matrices, and entity graphs.
- **The proof-receipt format** — if the format becomes the standard that regulators expect, switching costs are high.
- **The distribution through accountants and compliance practices** — the same firms that audit the PSPs are the sales channel.

---

## 11. Known Limitations and Honest Weaknesses

The project has real limits. A judge who asks the right question will find them; the team should be ready to acknowledge them rather than deflect.

### 11.1 The Agent's Role Is Narrower Than "Autonomous Agent"

The Bedrock agent does not decide. It gathers evidence and drafts a narrative. A skeptical AWS judge may ask: *"Why not Step Functions?"* The answer — that the agent resolves unindexed semantic links (the contract PDF signatory triggers the ARES statutory history hop) — is real, but it is a narrow reason. In a V1 product, the agent's autonomy would be expanded to multi-step reasoning over customer communication history and cross-institution data. In the 30-hour build, the two-hop is the demonstration, not the full capability.

### 11.2 The OCR Provenance Gate Depends on Textract Being Correct

The verifier checks that Textract's confidence is ≥ 99% and that the bounding box points to the right number. But Textract can be confidently wrong (rare, but possible on poor scans). The fail-closed rule catches this when confidence drops, but not when Textract is confident and wrong. In production, the design would add a second extraction source (e.g., a small vision model) and fail closed on disagreement.

### 11.3 The 82% Auto-Clear Is a Model, Not a Measurement from This Demo

The seeder produces 82/14/4 because the distribution is calibrated to production benchmarks. The verifier evaluates all 100 alerts live, so the outcomes are real given the seed population. But the seed population was chosen to match the benchmark, not sampled from production. The honest framing is: *"We calibrated the seed to production distributions; a real pilot would measure the split on live data."*

### 11.4 The Regulatory Framing Is Correct but Narrow

The PSR Art. 83 / 56 framing is accurate but it is not the whole story. A PSP's real fraud program also involves VoP matching (Art. 50), SCA (PSD2), and APP fraud reimbursement (Art. 59 for consumers). VeriTriage addresses the evidentiary and monitoring layer; it does not address the full payment flow. This is fine for a decision-support product, but a judge may ask "where does this fit in the stack?" and the answer needs to be precise.

### 11.5 The Demo Is Compressed

The 90-second demo shows the two-hop agent, the verifier override, the mobile signing, and the tamper test. It does not show the audit export, the CAMT.053 reconciliation, the SignalR fallback, or the degraded mode. These are all built but not demonstrated. If a judge asks "can you show me the audit export?" the team needs to have it ready on a second screen.

### 11.6 The Project Has No Live Payment Rail

The project is a decision-support system. It does not initiate payments. A bank team in the Enterprise category that demonstrates a working integration with their own ledger has an operational story that VeriTriage cannot match. The defense is positioning — *"moving a test payment is a 20-line SDK call; proving why you refused a payment within 15 business days is the unsolved problem"* — but it is a defensive position, not an offensive one.

---

## 12. The Team

**Azizbek Khursanov** — Frontend, mobile, product. Built and shipped React Native apps on Google Play, Next.js web apps, and enterprise invoicing frontends at Factura.uz (B2B, thousands of daily transactions). Ran a multi-session AI-assisted technical audit of a multi-platform codebase and produced agent-ready fix instructions. Has shipped under deadline with the same partner.

**Shohjahon Alijonov** — Backend, AI, infrastructure. 2+ years building .NET APIs, EF Core, PostgreSQL, SignalR. Integrated AI services (Tuzuk AI document classification, interior design AI) and payment systems (Payme, Apple IAP) into production platforms at Domplan.uz and Faktura.uz. Comfortable with clean architecture, SOLID, and the .NET 9 stack VeriTriage requires.

**Why this team can build it**: the architecture is a direct reuse of the patterns both engineers have shipped before — SignalR real-time hubs, .NET rule engines, React Native approval flows, ECDSA signing, hash-chained audit trails. The remaining work is integration, not invention.

---

## 13. The Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| **Backend** | .NET 9 minimal API | Team fluency, SignalR, EF Core, typed money math |
| **Database** | PostgreSQL 16 | Dockerized, single container, no Redis needed |
| **ORM** | EF Core 9 | Migrations at startup for demo |
| **AI** | Amazon Bedrock Converse + `toolConfig` | Native tool use, structured output via `json_schema`, EU region |
| **OCR** | Amazon Textract | Bounding-box provenance, per-element confidence |
| **Frontend** | Next.js 15, React 19, Tailwind 4, TanStack Query 5 | Team fluency, projector-readable |
| **Mobile** | Expo SDK 53, `expo-router`, `expo-local-authentication`, `expo-secure-store`, `expo-camera` | Team fluency, ECDSA key custody in SecureStore |
| **Crypto** | ECDSA P-256 (device), SHA-256 (audit chain) | FIPS 140-3 compatible algorithm, native support everywhere |
| **Real-time** | SignalR (JSON) with 2s polling fallback | Demo transport; production uses APNs/FCM with SignalR as fallback |

The repo structure follows a clean-architecture split: `PayShield.Api`, `PayShield.Domain`, `PayShield.Verifier`, `PayShield.Infrastructure`, `apps/web`, `apps/mobile`, with frozen contracts in `contracts/domain/` and `contracts/types/api.d.ts`. Every worker task ends with `dotnet test` or `npm test`; every agent invocation loads only what it needs from `AGENTS.md` plus the frozen contracts.

---

## 14. What Makes This Winning

The winning story is not "we built an AI for fraud triage." That category is crowded and the judges will see several teams pitch variants of it. The winning story is:

> **"We built the proof layer that makes an AI deployable in a regulated bank. The agent proposes. The verifier proves. The human signs. And we can show you the moment the agent was wrong and the verifier caught it."**

This story wins because:

1. **It is legally precise.** The PSR Art. 83/56 framing is correct and current. A Deloitte or FINREG judge will recognize that the team did the homework.
2. **It is technically sound.** The five-gate verifier, the proof receipt, and the hash-chained audit are production-grade engineering, not prompt wrapping.
3. **It is honest about its limits.** The team acknowledges what is mocked, what is modeled, and what the agent does not do. This is rare and disarming.
4. **It solves a real problem.** PSR Article 56 creates a statutory deadline. The bank must produce a defensible record within 15 business days. VeriTriage produces that record.
5. **It demonstrates the right moment.** The verifier override — the AI being wrong and the system catching it — is the single most memorable moment a judge will see all day. It is the moment that proves the product is not another AI wrapper.

The remaining risk is execution: the OCR drop and the two-hop agent must rehearse cleanly; the proof receipt must render clearly; the mobile signing must work with zero network dependency. None of these are design problems. They are rehearsal problems. The team has the plan. The team has the architecture. The team has the honest probability estimate. What remains is execution discipline.

---

## 15. Summary

VeriTriage is a decision-support system for European PSPs facing PSR Article 83 monitoring obligations and Article 56 burden-of-proof deadlines. An Amazon Bedrock agent gathers evidence; a deterministic C# verifier independently proves every number and every claim; a human signs the final decision with ECDSA P-256 on a mobile device. The proof receipt, the hash-chained audit trail, and the tiered autonomy model (82% auto-clear / 14% step-up / 4% escalate) make it deployable in a regulated bank without requiring a human on every alert.

The project is designed for the Enterprise category of the Prague fintech hackathon, is built on the .NET + React Native + Bedrock stack that the team has shipped before, and is anchored in the current PSR rather than the repealed Czech VAT provisions that the earlier version of the project relied on. The demo is preloaded and offline-safe. The competitive wedge is the verification and proof layer, not the agent itself. The team is honest about what is live, what is mocked, and what the product does not do.

The win condition is not "the demo runs without crashing." It is "the judge remembers the moment the verifier overrode the AI, and repeats the sentence to the next judge."