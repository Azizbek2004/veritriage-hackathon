# VeriTriage — FINREG Methodology (2 Pages)

**Track 5 — AML / FINREG Partners Challenge** · Dataset: 397,853 ČNB transactions, 5,493 clients · Measured load **75.9 ms** · Deep analysis **4.9 ms** · Zero LLM tokens for deterministic arithmetic.

## Table 1 — Deterministic 0–100 Priority Formula

| Component | Points | Deterministic rule | ALERT-045 |
|---|---:|---|---:|
| Base risk | 10 / 25 / 40 | Low / medium / high client risk | **40** |
| Velocity | 0–30 | `clamp(round((ActualVol / ExpectedVol − 1) × 15), 0, 30)` | **11** (1.71x) |
| PEP | 0 / 25 | PEP flag under § 21(5) | **25** |
| Structuring / typology | 0–20 | 72h sub-threshold cluster + HHI + round-amount | **20** (13 tx) |
| Channel onboarding | 0 / 10 | Remote onboarding + rapid velocity under Decree 67/2018 § 8(2) | **0** |
| **Total** | **0–100** | `Math.Clamp(sum, 0, 100)`; FP `< 40`, REVIEW `>= 40` | **96** |

**ALERT-045:** `B40 + V11 + P25 + S20 + C0 = 96/100` — PEP REVIEW.

## Table 2 — Five Quantitative Typology Vectors

| Vector | Definition | ALERT-045 |
|---|---|---|
| Velocity & count | `ActualVol2Q26 / ExpectedVol2Q26`, `ActualCount / ExpectedCount` (decimal, MidpointRounding.ToEven) | **1.71x / 1.71x** (68,262.30 / 39,819.67 CZK; 12 / 7) |
| 72h structuring | Maximum rolling 72-hour cluster of sub-threshold transfers `< 25,000 CZK` | **13 transfers / 95,511.91 CZK** (2026-07-11..07-14) |
| Counterparty HHI | `Σ(volume_share²) × 10,000` over outgoing volume + shared client links | **HHI 916**; primary **ACZ00005**; **3** linked clients |
| Round-amount | Share of amounts with `mod 1000 == 0` or `mod 500 == 0` | **0.00%** |
| In/out pass-through | `incoming / outgoing` in the client window | **0.6495** |

All values are `System.Decimal`; the C# gates recompute them before any document is issued.

## Table 3 — Statutory Escalation & 4-Eyes Matrix

| Originator | Required approver | Statutory basis | Server behavior |
|---|---|---|---|
| L1 Analyst | L2 Senior AML Specialist | § 6(1)(a) Act 253/2008; Decree 67/2018 § 7 | 4-eyes check |
| L2 Senior Specialist | MLRO / designated contact | § 21(5), § 22(1) | PEP/high-risk → MLRO |
| MLRO | Statutory board member | § 21(5), § 18 | Senior management approval |
| Any originator | Same person | Decree 67/2018 § 12 | **HTTP 400 4-EYES VIOLATION** |
| Any | Independent approver | § 12 separation of duties | Approved; audit event |

The invariant is server-side: `POST /cases/{id}/approve` compares `executive_person` and `approver`; self-approval fails closed. The UI trap cannot bypass it.

## Table 4 — Dual-Mode Architecture

| Mode | Engine | Tokens | Latency | Output |
|---|---|---:|---:|---|
| **Deep Analysis** | 100% C# deterministic: vectors, 5 gates, priority | **0** | **4.9 ms** | Markdown brief + `QUANTITATIVE_FORENSIC_BRIEF` dossier |
| **Statutory Investigation** | Bedrock `eu-central-1` + legal corpus + C# diff | 1 call | ~2.7 s (snapshot fallback currently) | `STATUTORY_FAU_OPO_LEGAL_MEMO` dossier |

The investigation receives the deterministic vectors as immutable constraints; the C# verifier overrides priority/volume and enforces 4-eyes. Legal dossiers are persisted in `data/legal_dossiers.json`, hash-bound to the file audit ledger, and signed with **NIST P-256 ECDSA** (`ExportSubjectPublicKeyInfo` in JSON). HTML export is print-ready; Markdown-only is the approved PDF substitute.

**Honest boundaries:** 72h cluster is 13/95,511.91 CZK (not the earlier 5/23,778 subset); the current Bedrock call falls back to snapshot due a host .NET/AppleCrypto `bad certificate format`; the 37 ms figure was a prior run; measured load today is 75.9 ms. The 45-row CSV is unchanged.
