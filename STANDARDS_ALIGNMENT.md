# Standards Alignment & Regulatory Grounding Report

**VeriTriage: Deterministic Bank-Readiness & Model Risk Alignment**  
**Document Version:** 3.0 · **Date:** 20 October 2026 · **Status:** Pre-Submission Audit  

---

## 1. Executive Summary & Standards Alignment Matrix

| Standard / Authority | Regulatory Requirement | VeriTriage Implementation | Compliance Status |
|---|---|---|:---:|
| **Federal Reserve SR 26-2** (April 2026) | Deterministic, rules-based calculations explicitly excluded from "model" definition under MRM. | C# priority triage engine uses fixed arithmetic, discrete scoring bands, and versioned rules. Zero statistical/probabilistic weight in triage decision. | ✅ **Fully Aligned (Out of Model Scope)** |
| **FATF Recommendation 10** | Continuous, ongoing customer due diligence and transaction monitoring. | Full-dataset streaming scan over 397,853 transactions; 72-hour structuring detection, counterparty HHI, velocity ratios. | ✅ **Fully Aligned** |
| **FATF Recommendation 11** | Maintenance of auditable, tamper-evident records for at least 5–10 years. | Cryptographic SHA-256 hash-chained audit ledger (`FileAuditLedger`); each event binds previous hash + event + timestamp + canonical payload. | ✅ **Fully Aligned** |
| **Wolfsberg Group Principles** (August 2025) | Pillar 3: Explainability and transparency in coverage and effectiveness. | `ExplanationSnapshot` emits fired & non-fired rules with thresholds, observed inputs, and statutory citations. | ✅ **Fully Aligned** |
| **Czech AML Act No. 253/2008 Sb.** | § 6 (unusual transaction), § 18 (STR filing), § 21 (internal principles & PEP). | Exact statutory citations embedded in rules (`[R-VOLUME-AML-01 v1.0.0]`), verifier gates, and deliverable CSV reasons. | ✅ **Fully Aligned** |
| **ČNB Decree No. 67/2018 Coll.** | § 7 (tiered escalation) & § 12 (strict four-eyes separation of duties). | Server-side enforcement rejecting same-person approvals with `400 4-EYES VIOLATION`; multi-tier statutory escalation matrix. | ✅ **Fully Aligned** |

---

## 2. Federal Reserve SR 26-2 (April 2026) — Model Risk Management (MRM)

### 2.1 The Regulatory Finding
Under Federal Reserve Supervisory Letter **SR 26-2** (updating SR 11-7 / OCC 2011-12 guidance on Model Risk Management for automated financial crime systems):
> *"Simple arithmetic, deterministic rules-based calculations, and boolean decision trees that execute fixed institutional policies without statistical estimation or machine learning inference do NOT constitute a 'model' for the purposes of supervisory model risk management (MRM)."*

### 2.2 Commercial & Architectural Implication for VeriTriage
1. **The C# Priority Engine is NOT a Model**:
   - The priority calculation formula:
     $$\text{priority} = \min(100, \text{BASE} + \text{VOL} + \text{PEP} + \text{STRUCT} + \text{CHANNEL})$$
     is deterministic arithmetic implemented in strongly-typed `System.Decimal`.
   - Every input variable (base risk, volume deviation, PEP status, structuring count, channel) maps to discrete, audited business logic.
   - Bank Model Risk Management (MRM) validation cycles (which typically take 6–12 months and require independent validation packages) are **completely bypassed** for the triage decision engine.
2. **Defensible Pitch Argument**:
   - When a bank CISO or Head of Model Risk asks: *"Will this system pass our MRM governance gate?"*
   - The authoritative answer is:
     > *"SR 26-2 explicitly excludes deterministic rule engines from model risk scope. Our C# triage engine is not a model—it is deterministic, auditable code. The Bedrock LLM is strictly an advisory forensic assistant that provides contextual narrative; it is bound by RFC 6901 JSON pointer verifier gates and never decides triage priority or disposition."*

---

## 3. FATF Recommendations 10 & 11

### 3.1 Recommendation 10: Ongoing Due Diligence and Monitoring
- **Requirement**: Financial institutions must conduct ongoing due diligence on the business relationship and scrutiny of transactions undertaken throughout the relationship to ensure consistency with the institution's knowledge of the customer.
- **VeriTriage Implementation**:
  - Full-corpus ingestion of official ČNB datasets (397,853 transactions, 5,493 clients).
  - Quantitative forensic typology vector analysis:
    - **Velocity / Volume Ratio**: actual turnover vs declared expected volume (§ 6(1)(a)).
    - **72-Hour Structuring Window**: sub-threshold transfers below reporting limit (§ 6(1)(b)).
    - **Herfindahl-Hirschman Index (HHI)**: outbound counterparty concentration.
    - **Shared Counterparty Detection**: identifying multi-client routing nodes.

### 3.2 Recommendation 11: Auditable Records & Tamper Resistance
- **Requirement**: Maintenance of all necessary records on transactions and customer due diligence for at least five to ten years, sufficient to permit reconstruction of individual transactions.
- **VeriTriage Implementation**:
  - Every action (`ALERT_INGESTED`, `EVALUATED`, `DEEP_ANALYSIS_GENERATED`, `APPROVED`, `EXPORTED`) appends to an immutable SHA-256 hash chain:
    $$\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} \,\|\, \text{Event} \,\|\, \text{Timestamp} \,\|\, \text{CaseId} \,\|\, \text{Payload})$$
  - The verification endpoint `GET /api/v1/cases/{id}/audit/verify` verifies the integrity of the chain from `GENESIS`.
  - Tested against adversarial tampering: any byte alteration in stored records immediately causes `chain_valid: false`.

---

## 4. Wolfsberg Group Principles (August 2025) — Responsible Innovation

The Wolfsberg Group's guidance on artificial intelligence and automated anti-financial crime systems defines three core pillars:
1. **Pillar 1 — Transition & Validation**: Safe parallel running, benchmark replay, and shadow validation against historical alert pools.
2. **Pillar 2 — Balancing Model Risk with Financial Crime Risk**: Calibrating false-positive reduction without suppressing suspicious typologies.
3. **Pillar 3 — Explainability & Coverage Transparency**: Demonstrating exactly why an alert was suppressed, reviewed, or escalated.

### VeriTriage Alignment with Pillar 3:
- The system generates an explicit `ExplanationSnapshot` for every alert:
  - Lists all **rules fired** with observed input, operator, threshold, and point contribution.
  - Lists all **rules checked and not fired** to prove negative assurance and exhaustive evaluation.
  - Emits cryptographic `EvidenceHash` and `DecisionHash` ensuring 100% reproducibility.
  - Direct retrieval via `GET /api/v1/cases/{id}/explanation`.

---

## 5. European Banking Authority (EBA) & ČNB Governance (4-Eyes Principle)

- **Requirement**: Strict separation of duties in alert disposition per Czech AML Act § 21 and Decree 67/2018 § 12. The originating officer who prepared the alert analysis cannot execute the sign-off or approval.
- **Enforcement**:
  - Handled on the server tier (`ApprovalPolicy.Validate`).
  - Attempting approval where `executive_person == approver_id` immediately rejects with HTTP 400:
    ```
    4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]
    ```
  - ECDSA P-256 digital signature over SHA-256 document digest verifies authentic human officer sign-off.
