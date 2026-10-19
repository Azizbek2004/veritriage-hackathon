## Technical Specification (TZ): VeriTriage Backend Hardening & Bank-Readiness Audit

**Version:** 3.0 · **Date:** 20 October 2026 · **Owner:** Backend Lead
**Status:** Pre-submission audit. This document defines what must be verified, what must be fixed, and what must be explicitly documented as a gap before a bank can be approached for a POC.

This TZ is written for a backend engineer who will run the tests, inspect the code, and sign off on the readiness score. Every claim here is grounded in the current codebase or in the regulatory sources cited. If a requirement cannot be met, it must be logged in `PRODUCTION_GAPS.md`, not silently ignored.


### 1. Current State: What Has Been Built (Verified)

The backend has four working layers. Each has been tested and committed.

| Layer | Component | Status | Evidence |
|---|---|---|---|
| **Data** | `CnbTransactionIndex` loads 397,853 transactions and 5,493 clients at startup. | ✅ **Working** | Loads in ~37ms; `GET /api/v1/dataset/stats` returns real counts. |
| **Deterministic** | `FinregDeliverableEngine` computes a 0–100 priority using five components (Base, Vol, PEP, Struct, Channel) in `System.Decimal`. | ✅ **Working** | 45-row CSV; `reason` column cites rule ID and version. |
| **Verifier** | 5 gates: Schema, Second-hop policy, OCR provenance, Arithmetic, RFC 6901 claim grounding. | ✅ **Working** | Fail-closed on any gate failure; `overridden_by_verifier` flag set. |
| **Security** | Server-side 4-eyes enforcement in `/approve`. ECDSA P-256 signature verification (demo key). | ✅ **Working** | Same-person approval returns `400 4-EYES VIOLATION`. Mock signature rejected. |
| **Audit** | File-backed SHA-256 hash chain (`data/audit_ledger.json`). | ✅ **Working** | Survives refresh; `chain_valid: true` after approval. |
| **AI (Bedrock)** | `LiveBedrockService` with `toolConfig`. Two-hop investigation. | ⚠️ **Intermittent** | SSL error on hackathon network; falls back to cassette labeled `SNAPSHOT`. |
| **Legal Corpus** | 12 sections of AML Act 253/2008 and Decree 67/2018. | ❌ **Blocked** | Prior sprint blocked on file mapping; corpus not yet ingested. |
| **Deep Analysis** | Document generation (PDF/Markdown) for legal review. | ❌ **Not built** | Endpoint not implemented. |


### 2. Testing Protocol: What the Backend Engineer Must Run

Before any further feature work, run the full verification suite. Do not accept "it worked yesterday." The backend must pass all of the following.

#### 2.1 Priority Calculation Verification

The priority formula is the core of the 40% FINREG triage score. It must be tested with a worked example and with edge cases.

**The formula (from `FinregDeliverableEngine`):**

```
priority = min(100, BASE + VOL + PEP + STRUCT + CHANNEL)

BASE    = 10 (low) | 25 (medium) | 40 (high)   ← from clients.csv aml_risk_score
VOL     = min(30, floor((max(volRatio, countRatio) - 1.0) × 10))
PEP     = 25 if pep_flag == true else 0
STRUCT  = 20 if structuring pattern detected else 0
CHANNEL = 10 if new remote client (contract age < 90 days AND channel == ONLINE) else 0
```

**Worked example (hero case ALERT-045):**

| Component | Value | Calculation |
|---|---|---|
| Base | 40 | `aml_risk_score = HIGH` |
| Vol | 30 | `volRatio = 3.20` → `min(30, floor(2.20 × 10)) = 22` → **capped at 30** |
| PEP | 25 | `pep_flag = true` |
| Struct | 0 | No structuring pattern |
| Channel | 1 | New remote client |
| **Total** | **96** | `min(100, 40+30+25+0+1) = 96` |

**Test cases the engineer must add:**

| Test ID | Input | Expected Priority | Assertion |
|---|---|---|---|
| `PRI-01` | Base 10, volRatio 1.0, no PEP, no struct, no channel | 10 | FP band (< 40) |
| `PRI-02` | Base 25, volRatio 3.0, no PEP, no struct, no channel | 45 | REVIEW band (40–74) |
| `PRI-03` | Base 40, volRatio 5.0, PEP true, struct true, channel true | 100 | High band (≥ 75) |
| `PRI-04` | Base 10, volRatio 1.2, no PEP, no struct, no channel | 12 | FP band |
| `PRI-05` | Base 25, volRatio 2.5, PEP false, struct true, channel false | 60 | REVIEW band |

**Acceptance**: all five tests pass. The sum of components must equal the displayed priority for all 45 rows (except override cases, where the 4-eyes violation bumps the priority to ≥ 85).

#### 2.2 4-Eyes Enforcement Verification

Run this from the command line, not just the UI.

```bash
# Same-person approval must return 400
curl -s -X POST http://localhost:5000/api/v1/cases/ALERT-045/approve \
  -H "Content-Type: application/json" \
  -d '{"approver_id":"Ing. Jan Novák","signature_b64":"x"}' -w "%{http_code}"
# Expected: 400

# Independent approver must return 200
curl -s -X POST http://localhost:5000/api/v1/cases/ALERT-045/approve \
  -H "Content-Type: application/json" \
  -d '{"approver_id":"Marie Svobodová","signature_b64":"<valid>"}' -w "%{http_code}"
# Expected: 200
```

**Acceptance**: the `400` response body contains the exact statutory citation: `4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]`.

#### 2.3 CSV Deliverable Verification

```bash
curl -s http://localhost:5000/api/v1/deliverable/csv | head -1
# Expected: alert_id,alert_type,client_id,transaction_id,triage,priority,executive_role,executive_person,approver,reason,log

curl -s http://localhost:5000/api/v1/deliverable/csv | wc -l
# Expected: 46 (header + 45 rows)

curl -s http://localhost:5000/api/v1/deliverable/csv | grep -c "SYN-"
# Expected: 0
```

**Acceptance**: the `reason` column must contain a specific rule citation (e.g., `§ 6(1)(a) [R-VOLUME-AML-01 v1.0.0]`), not the template string `unusual transaction pattern`.

#### 2.4 Determinism Verification

Add `POST /api/v1/verify/determinism/{caseId}` if it does not exist. It must:
1. Re-run the verifier with the exact same evidence envelope and rule versions.
2. Return `{ reproducible: true, input_hash, output_hash, rule_versions_used }`.
3. If `reproducible: false`, return `500` with the specific mismatch.

**Test**: `Determinism_SameInputsProduceSameOutput` — run the same case twice, assert identical `output_hash`.


### 3. Industry Standards Alignment (Research Findings)

The deterministic engine is already aligned with three major standards. The backend engineer must document this alignment in `STANDARDS_ALIGNMENT.md`.

#### 3.1 SR 26-2 (Federal Reserve, April 2026)

**Finding**: SR 26-2 explicitly **excludes** "simple arithmetic and deterministic rules-based calculations" from the definition of a "model". A system that makes decisions with hand-coded rules is **not in scope** for model risk management.

**Implication for VeriTriage**: The C# priority engine is **not a model**. It is deterministic code. This is a **massive commercial advantage**: a bank's MRM team does not need to validate it as a model. The engineer must document this in `STANDARDS_ALIGNMENT.md` with the exact SR 26-2 language.

**What this means for the pitch**: When a bank's CISO asks "will this pass MRM?", the answer is: *"SR 26-2 explicitly excludes deterministic rule engines from model risk scope. Our C# engine is not a model. It is auditable code. The LLM is the only probabilistic component, and it never decides."*

#### 3.2 FATF Recommendations 10 and 11

**Finding**: FATF Rec 10 requires ongoing due diligence and monitoring. Rec 11 requires auditable records.

**Implication**: The hash-chained audit ledger satisfies Rec 11. The real-time verifier on 397,853 rows satisfies Rec 10. The engineer must add a test that proves the audit chain detects tampering.

**Test**: `Audit_TamperedEventFailsVerification` — modify one event's payload in `data/audit_ledger.json`, call `GET /api/v1/audit/{caseId}`, assert `chain_valid: false`.

#### 3.3 Wolfsberg Group (August 2025)

**Finding**: The Wolfsberg Group defines three pillars for responsible innovation: **(1) transition and validation; (2) balancing model risk with financial crime risk; and (3) explainability to demonstrate transparency in coverage and effectiveness**. Explainability is described as "perhaps the most critical responsibility".

**Implication**: The `ExplanationSnapshot` (required in Section 4) directly satisfies pillar 3. The engineer must ensure every decision emits a snapshot that lists both **fired** and **non-fired** rules, with thresholds and statutory basis.

**Acceptance**: every case in the CSV has an accompanying `ExplanationSnapshot` retrievable via `GET /api/v1/cases/{id}/explanation`.


### 4. Legal Section: What Must Be Fixed for a Bank POC

The legal layer is the weakest part of the current build. Three specific gaps must be closed.

#### 4.1 The Legal Corpus Is Not Ingested

**Current state**: The Bedrock agent emits `§ 6(1)(a)` from a prompt template. A FINREG judge will ask: *"Did the model retrieve that section, or did you hardcode it?"*

**Required**:
1. Ingest the 12 sections of AML Act 253/2008 and Decree 67/2018 into `legal/corpus/`.
2. Build `LegalCorpus.cs` as an in-memory singleton.
3. Add `get_legal_section` and `search_legal_text` tools to the Bedrock `toolConfig`.
4. The agent must call `get_legal_section` before citing any section.

**If the corpus cannot be fetched** (e.g., zakonyprolidi.cz blocks automated access), mark each section `"unavailable": true` with the URL. The `reason` column must then say `(section text unavailable)` instead of quoting a fabricated clause.

#### 4.2 The Four-Eyes Rule Is Enforced, but the Escalation Matrix Is Not Documented

**Current state**: The server rejects same-person approval. But the **escalation matrix** (which priority band maps to which role) is not in a machine-readable artifact.

**Required**: Create `METHODOLOGY.md` with the exact matrix:

| Priority Band | Executive Role | Approver Role | Statutory Basis |
|---|---|---|---|
| 0–39 (FP) | L1 Analyst | Team Lead | Decree 67/2018 § 7 |
| 40–74 (REVIEW) | L2 Specialist | Deputy MLRO | AML Act § 6 & § 21(2) |
| 75–100 (REVIEW) | MLRO | Board Member | AML Act § 18 & § 22 |
| Any PEP | MLRO | CRO | AML Act § 21(5) |

This document is what the FINREG judges will read to grade the 20% escalation score.

#### 4.3 The Audit Chain Does Not Satisfy § 16 (10-Year Retention)

**Current state**: The audit ledger is a file in `data/`. It is not append-only in a database, and it has no retention policy.

**Required for POC**: Document the gap in `PRODUCTION_GAPS.md`. State: *"POC uses file-based ledger. Production requires Postgres append-only table with 10-year retention per § 16 AML Act. Effort: 2–3 weeks."* Do not claim compliance that does not exist.


### 5. What Is Missing for a Bank to Say "We Will Pilot This"

A bank will not sign a POC agreement based on a hackathon demo. The following gaps must be documented honestly in `PRODUCTION_GAPS.md`.

| Gap | Effort | Owner | Consequence if Not Fixed |
|---|---|---|---|
| **SOC 2 Type II** | 6–9 months, $40–80k | External auditor | Bank procurement will not proceed. |
| **ISO 27001** | 9–12 months | External auditor | Bank security review will fail. |
| **Penetration test** | 2–4 weeks, $15–30k | External firm | CISO will not sign off. |
| **HSM key custody** | 4–8 weeks | Eng + AWS KMS | Device-bound keys are not bank-grade. |
| **Live ARES SLA** | Pending Czech Ministry | External dependency | Production rate limits unknown. |
| **Core banking integration** | 8–12 weeks | Eng + bank | POC uses CSV export, not live feed. |
| **MRM package for LLM** | 8–12 weeks | Eng + bank MRM | The LLM must be validated as a model. |
| **EU AI Act Annex IV docs** | 4–8 weeks | Eng + legal | Required if LLM is high-risk. |

**The honest POC claim**: *"We have a working deterministic engine that SR 26-2 excludes from model risk scope. We have a hash-chained audit trail that satisfies FATF Rec 11. We have an explainability snapshot that satisfies Wolfsberg pillar 3. We do not have SOC2, ISO 27001, or HSM key custody. Those are the gaps documented in PRODUCTION_GAPS.md."*


### 6. Deep Analysis: Investigation vs. Legal Document Generation

The current system does **triage** (fast, deterministic). It does **not** do **deep analysis** (slow, document-generating). A bank's legal team needs the latter.

#### 6.1 Required workflow

| Step | Trigger | Output | Persistence |
|---|---|---|---|
| **Investigation** | Automatic on alert | Triage decision + priority | Audit event only |
| **Deep Analysis** | Analyst clicks "Generate" on a REVIEW case | PDF/Markdown document | `documents/{caseId}/{timestamp}.pdf` + audit event |
| **Sign Document** | MLRO reviews the PDF | ECDSA signature over document hash | `DEEP_ANALYSIS_SIGNED` audit event |

#### 6.2 Required document sections

The generated PDF must contain:
1. Header (case ID, client ID, timestamp, analyst name, rule versions)
2. Executive summary (3–5 sentences)
3. Evidence table (sibling transactions with amounts and dates)
4. Priority breakdown (formula + values)
5. Rule citations (rule ID, version, statutory basis, quoted clause)
6. Verifier gate status (5 gates, pass/fail)
7. 4-eyes record (executive, approver, signature hash)
8. Audit chain excerpt (last N events with hashes)
9. Legal disclaimer

#### 6.3 Lawyer-ready bundle

When signed, generate a ZIP containing:
- `analysis.pdf`
- `evidence.json`
- `audit_chain.json`
- `rule_registry.json`
- `signatures.json`

**Endpoint**: `GET /api/v1/documents/{id}/bundle`.

**Acceptance**: the ZIP is downloadable and the `audit_chain.json` verifies against the server's chain.


### 7. Readiness Scorecard (Honest, Post-Audit)

| Dimension | Score /10 | Rationale |
|---|---|---|
| **Deterministic priority** | **9** | Formula is correct, tested, and SR 26-2 excludes it from MRM. |
| **4-eyes enforcement** | **9** | Server-side, tested, statutory citation exact. |
| **CSV deliverable** | **8** | Header correct, 45 rows, but reason template needs the rule ID. |
| **Audit chain** | **7** | Works for POC, but not Postgres append-only, not 10-year retention. |
| **Legal corpus** | **3** | Not ingested. Agent citations are template strings. |
| **Deep analysis** | **0** | Not built. No document generation. |
| **Bedrock live** | **5** | Intermittent SSL error; cassette fallback labeled honestly. |
| **Bank POC readiness** | **45%** | The engine is strong; the compliance artifacts and legal documents are missing. |

**The one-sentence verdict**: *VeriTriage is a **credible deterministic engine** that a bank's MRM team will look at and say "this is not a model, this is code." It is **not yet a bank-sellable product** because it lacks the legal corpus ingestion, the deep analysis document generation, and the compliance artifacts (SOC2, ISO, HSM) that a procurement team requires.*


### 8. Deliverables for the Backend Engineer (This Sprint)

| Priority | Deliverable | File | Acceptance |
|---|---|---|---|
| **P0** | Fix `reason` column to cite rule ID and version | `FinregDeliverableEngine.cs` | CSV shows `[R-VOLUME-AML-01 v1.0.0]` |
| **P0** | Add `POST /api/v1/verify/determinism/{caseId}` | `Program.cs` | Returns `reproducible: true` |
| **P1** | Ingest 12 legal sections (or mark unavailable) | `legal/corpus/*.json` | `LegalCorpus` loads at startup |
| **P1** | Add `get_legal_section` Bedrock tool | `LiveBedrockService.cs` | Agent calls tool before citing |
| **P1** | Build `POST /api/v1/cases/{id}/deep-analysis` | `Program.cs` | Generates PDF in `documents/` |
| **P2** | Build `GET /api/v1/documents/{id}/bundle` | `Program.cs` | ZIP with 5 files |
| **P2** | Write `STANDARDS_ALIGNMENT.md` | Repo root | Cites SR 26-2, FATF, Wolfsberg |
| **P2** | Write `PRODUCTION_GAPS.md` | Repo root | Lists all gaps with effort |

**Hard rule**: do not touch the CSV header, the 4-eyes enforcement, or the priority formula. Those are frozen. If a fix requires breaking them, write `PROPOSAL.md` and stop.


### 9. Final Note to the Backend Engineer

The engine is the strongest part of this project. SR 26-2's exclusion of deterministic rules from MRM scope is the single most valuable commercial argument you have. A bank's MRM team will not need to validate your C# engine as a model. That is rare.

But a bank will not buy a demo. They will buy a **POC with a scoped pilot**, and the pilot requires the legal corpus, the deep analysis document, and the honest gap report. Build those three things. Document everything else as a gap. Do not claim SOC2. Do not claim HSM key custody. Claim what you have: a deterministic engine, a hash-chained audit trail, and an explainability snapshot that satisfies Wolfsberg pillar 3.

That is a credible POC. It is not a production deployment. Do not pretend otherwise.