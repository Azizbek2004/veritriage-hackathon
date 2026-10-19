# VeriTriage — FINREG Solution (2 Pages)

## Page 1 — Priority Formula and 4-Eyes Escalation Matrix

### The deterministic priority formula

```
priority = min(100, BASE + VOL + PEP + STRUCT + CHANNEL)

BASE    = 10 low / 25 medium / 40 high AML risk
VOL     = min(30, floor((max(volumeRatio, countRatio) - 1.0) * 10))
PEP     = 25 when PEP flag is true
STRUCT  = 20 when a sub-threshold structuring pattern is detected
CHANNEL = 10 for remote onboarding plus a rapid post-contract velocity spike
```

Every component is returned in the CSV API as `priority_breakdown`; the table shows `B/V/P/S/C` pills and the sum equals the displayed priority (verified on all 45 rows).

### Worked example — ALERT-045 / K005397

- Declared 2Q2026: **39,819.67 CZK / 7 transactions**
- Actual 2Q2026: **68,262.30 CZK / 12 transactions**
- Volume ratio: **1.71x**; count ratio: **1.71x**
- Structuring: **13 sub-threshold transfers in 72h, 95,511.91 CZK**
- PEP: **true**; risk: **high**
- Priority: **96/100 = B40 + V11 + P25 + S20**
- Legal quotes: `AML-253-2008-S6-1A` (volume), `AML-253-2008-S6-1B` (structuring), `AML-253-2008-S9A-2C` (PEP)

The brief’s 8.20x / 4.51M illustration is **not** this client. We do not fabricate it.

### 4-eyes escalation matrix

| Originator | Required approver | Statutory basis | Server behavior |
|---|---|---|---|
| L1 Analyst | L2 Senior AML Specialist | § 6(1)(a), Decree 67/2018 § 7 | 4-eyes check on approval |
| L2 Senior AML Specialist | MLRO | § 9a(2)(c), § 22 | PEP/high-risk requires MLRO |
| MLRO | Board/statutory body member | § 9a(2)(c), § 22(1) | Senior management approval |
| Any originator | Same person | § 9a(2)(c), Decree 67/2018 § 12 | **400 4-EYES VIOLATION** |
| Any | Independent approver | § 12 separation of duties | Approved |

The server-side invariant is absolute: `POST /cases/{id}/approve` looks up the case executive and returns 400 when `approver_id` equals the executive. The UI's same-person option is a trap; it cannot bypass the API.

### Audit

Every approval appends an `APPROVED` event to `data/audit_ledger.json`; `ledger_mode: FILE_CHAIN`; the UI verifies the SHA-256 chain. The ledger supports § 16 reconstruction.

---

## Page 2 — Legal Grounding Architecture

### The grounding path

1. `fixtures/legal_corpus_cnb_aml.json` contains **12** human-approved Czech AML/ČNB/FAU provisions with verbatim `text_cs`, citation, title, URL, and retrieval timestamp.
2. `LegalCorpus` loads the corpus; `lookup_statutory_provision(clause_id)` is a deterministic tool in the agent pipeline.
3. Before `Converse`, the pipeline injects the retrieved statutory excerpts into the prompt and records `tool_calls` in the response.
4. Every returned `statutes[]` object includes the **quoted Czech clause**, not a section number template.
5. If a clause is missing, the pipeline returns `(section text unavailable)` and the model is instructed not to cite it.

### What the model sees vs. what C# proves

| Layer | Responsibility |
|---|---|
| Bedrock model | Narrative and candidate findings; must use the injected excerpts |
| `lookup_statutory_provision` | Retrieves the exact Czech text from the corpus |
| C# verifier | Recomputes numbers, checks JSON pointers, fails closed |
| Human signer | Signs the receipt with the statutory role |

### Rule-to-statute mapping

| Rule | Statute | Quoted clause ID |
|---|---|---|
| Volume deviation | § 6(1)(a) AML Act | `AML-253-2008-S6-1A` |
| Structuring | § 6(1)(b) AML Act | `AML-253-2008-S6-1B` |
| PEP approval | § 9a(2)(c) AML Act | `AML-253-2008-S9A-2C` |
| Internal controls / FP triage | § 21(2) AML Act | `AML-253-2008-S21-2` |
| Conflict of interest | Decree 67/2018 § 12 | `CNB-67-2018-S12` |
| Retention / reconstruction | § 16 AML Act; § 25 | audit ledger |

### Honest boundary

The retrieval is executed by a **deterministic C# tool in the agent pipeline**, not by the LLM autonomously selecting a tool through Bedrock `toolConfig`. The model is given the retrieved excerpts; the output preserves the tool calls. This is retrieval-grounded and auditable, but the pitch must not say “the model decided to call the tool.”

### Integrity

- Exact 11-column CSV header preserved.
- 4-eyes server enforcement preserved.
- No vector database; 12 sections are keyword-searchable.
- No fabricated statutory text; all 12 sections are human-approved and URL-cited.
