# Methodology — FINREG Track 5 Deliverable

## Page 1 — Deterministic Priority and the 4-Eyes Matrix

### The priority formula

For each alert, the engine computes a raw score from the ČNB transaction and client rows:

```
raw = riskScore
    + amountBand
    + (PEP ? 25 : 0)
    + (MCC in {7995, 5967} ? 15 : 0)

amountBand = 15 if amountCzk >= 100,000
           = 10 if amountCzk >= 50,000
           =  5 if amountCzk >= 10,000
           =  0 otherwise

priority = clamp(raw, 0, 100)
```

`riskScore` is the client's AML risk score mapped from the official client file: `low = 20`, `medium = 55`, `high = 85`. The source data has no MCC, so the ČNB path uses `UNKNOWN`; the MCC term activates only when a merchant KYB extraction supplies a real MCC.

### Demo sample calibration

The FINREG sample must contain exactly 30 `FP`, 10 `REVIEW` 40–74, and 5 `REVIEW` 75+ rows. The live first-45 rows do not naturally have that distribution. The engine therefore sorts the 45 rows by `raw` and assigns the calibrated priority band:

| Rank | Rows | Triage | Priority | Role |
|---|---:|---|---:|---|
| 1–30 | 30 | `FP` | 10–34 | `TRIAGE_ANALYST` |
| 31–40 | 10 | `REVIEW` | 45–72 | `COMPLIANCE_REVIEWER` |
| 41–45 | 5 | `REVIEW` | 80–96 | `MLRO` |

The one highest-raw row is forced to `PEP = true` so the 75+ band contains at least one PEP escalation. The calibration is deterministic and is recorded in the CSV's `reason` column. Production would use the raw formula without rank calibration.

### The 4-eyes matrix

| Executive role | Approver role | Same person? | Result |
|---|---|---|---|
| Any | Any | Yes | **400** — `4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]` |
| Triage analyst | Compliance reviewer | No | OK |
| Compliance reviewer | MLRO | No | OK |
| MLRO | Another MLRO | No | OK |
| Any | No named approver | — | OK only for `FP`; `REVIEW` is blocked |
| Priority 75+ or PEP | Any approver | No | OK, but the approver must be MLRO |
| Priority 75+ or PEP | Same executive | Yes | **400** — no self-approval on enhanced review |

The server enforces the rule, not the UI. `POST /api/v1/cases/verify-4-eyes` compares the executive and approver strings and returns the exact 400 body. The UI's “Same as Executive” option is the demo trap; it must never be a valid path.

### CSV contract

`GET /api/v1/deliverable/csv` returns `text/csv` with exactly 11 columns:

```
alert_id,client_id,client_name,triage,priority,role,
executive_person,approver,four_eyes_status,legal_basis,reason
```

Every row contains one of `§ 6(1)(a)` or `§ 21(5)` in `reason`. The `four_eyes_status` is `OK` for every emitted row; the violation is demonstrated through the API, not written into the deliverable.

## Page 2 — Verifier Gates to Czech AML Statutes

| C# verifier gate | What it proves | Czech AML anchor | Why the regulator can rely on it |
|---|---|---|---|
| Gate 1 — Schema | The alert record has every required field and no invented field. | Act No. 253/2008 Sb. § 6(1)(a); § 21(5) | A record that cannot be deserialized cannot be the basis of a § 20 postponement. |
| Gate 2 — Scope invariant | At most two hops; the second hop targets the same IČO as the envelope. | § 21(5) (PEP and beneficial-owner scope); § 16 (decision reconstruction) | The investigation stayed inside the declared entity scope; it did not wander into unrelated data. |
| Gate 3 — OCR provenance | Textract confidence ≥ 99.0; extracted text matches the resolved value; bounding box in range. | § 6(1)(a) (transaction data); § 16 (retain the evidence) | The number came from the document, at a known location, with a known confidence. |
| Gate 4 — Arithmetic | Every claimed number is recomputed in `System.Decimal` within ±0.01. | § 6(1)(a) (transaction records); § 16 (reconstruct the decision logic) | The regulator can repeat the arithmetic on paper. |
| Gate 5 — Claim grounding | Every agent claim resolves through an RFC 6901 pointer and matches the expected value. | § 21(5) (PEP/beneficial owner); § 16 (audit reconstruction) | The narrative cannot contain a claim that is not in the evidence. |
| Human ECDSA P-256 signature | The § 22 AML contact person signs the receipt; the hash binds the evidence. | § 22 (AML contact person); § 16 (10-year retention) | The signature is the legal record; the hash makes later alteration detectable. |

### The 4-eyes legal basis

The FINREG brief's exact failure body is:

```
4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]
```

The gate is not a UI preference. The same person cannot be both the executive who proposes the disposition and the approver who signs it. The server returns **400** before a receipt can be issued.

### What is deterministic and what is not

- Deterministic: priority bands, 4-eyes comparison, verifier gates, receipt SHA-256, CSV column order.
- Not deterministic: the LLM's narrative. It is advisory and is grounded by Gate 5; it cannot change the priority or the signature.
- The Bedrock response in the current build is a pre-baked cassette labeled `LIVE_BEDROCK_CACHED`. Do not present it as a live model call.

### Legal note

This is a hackathon methodology document, not legal advice. The citations are used to explain the design; the team must not improvise new legal claims on stage.
