# Deterministic Logic & Legal Document Report — Advanced Pass

## Part 1 — Standards alignment and 5-vector engine

- **RuleRegistry:** 5 rules, `v1.0.0`, effective 2026-01-01, statutory basis and thresholds.
- **Determinism endpoint:** `POST /api/v1/verify/determinism/ALERT-045` → `reproducible: true`, 5 rule versions.
- **ExplanationSnapshot:** `GET /api/v1/cases/{id}/explanation`; fired/not-fired rules rendered in the drawer.
- **5-vector analyzer:** `GET /api/v1/cases/{id}/vectors`; `DeterministicForensicAnalyzer` computes:
  - velocity / count ratios;
  - 72-hour sub-threshold cluster;
  - in/out ratio;
  - HHI and shared-counterparty links;
  - round-amount ratio;
  - priority breakdown and 5 gate results.
- **Measured:** vectors **1.7ms**; deep analysis **4.9ms** (under the 15ms target).
- **Hero vector:** 1.71x volume, 1.71x count, 72h cluster **13 transfers / 95,511.91 CZK**, HHI **916**, round ratio **0.00%**, priority **96** (`B40+V30+P25+S1`).
- The 13-transfer figure is the maximum 72h sub-threshold window; the previous 5-transfer/23,778 figure was a curated subset. The UI/docs now use the max window.

## Part 2 — Investigation vs. deep analysis

- **Deterministic Deep Analysis:** `POST /api/v1/cases/{id}/deep-analysis`; 0 LLM tokens; generates Markdown + 6-section legal dossier; **4.9ms** measured; no LLM call.
- **Neuro-symbolic Investigation:** `POST /api/v1/cases/{id}/investigate`; deterministic vectors are injected into the Bedrock prompt, then C# diff and dossier creation; **2.7s** measured (Bedrock snapshot fallback).
- **LLM vs C# diff:** `GET /api/v1/cases/{id}/diff`; row-level override table; priority/volume/escalation.
- **Live deep-trace:** `POST /api/v1/cases/{id}/investigate-live`; returns a `trace` array with deterministic vectors, legal grounding, and `SNAPSHOT_FALLBACK`/`LIVE`; frontend timeout is 5s (backend 2.5s) so the fallback completes.
- **Bedrock status:** current `LIVE_BEDROCK_CACHED`; trace shows `SNAPSHOT_FALLBACK` at ~2.1s. Do not claim live model retrieval.

## Part 3 — Legal dossier archive

- **`LegalDossierService`** persists `data/legal_dossiers.json`; seeded 3 dossiers (ALERT-045, ALERT-031, ALERT-032) on first startup.
- **Types:** `QUANTITATIVE_FORENSIC_BRIEF` and `STATUTORY_FAU_OPO_LEGAL_MEMO`.
- **Endpoints:**
  - `GET /api/v1/dossiers`
  - `GET /api/v1/cases/{id}/dossiers`
  - `GET /api/v1/dossiers/{id}/export?format=html|md|json`
- **Six-section memo:** executive classification, quantitative forensics, cluster/typology, MRM/neuro-symbolic, statutory basis, 4-eyes + SHA-256 receipt.
- **HTML export:** print-ready `@media print` court typography; tested 12,825 bytes.
- **Audit events:** `LEGAL_DOSSIER_CREATED`; `DEEP_ANALYSIS_GENERATED`; `DEEP_ANALYSIS_SIGNED`; file ledger `FILE_CHAIN` (8/8 after seeding; grows with new docs).
- **Signature:** mock MLRO sign with SHA-256; not real ECDSA.

## Part 4 — Queue and UX

- **CSV:** 45 rows, 11 columns intact (FINREG core).
- **Browse queue:** 200 rows from the official dataset; `ALERT-045` remains the core hero; scroll loads +40; priority filter and reason/client/transaction search.
- **UI:** dual buttons (⚡ Deterministic Deep Analysis; 🧠 Statutory Investigation); 5 vector cards; Legal Dossiers tab; seeded counsel archive; printable HTML.

## Verification

- `dotnet test`: **26/26 passed** — no new unit test was added for the analyzer/dossier endpoints; they were verified by HTTP integration calls.
- `npm run build`: green.
- CSV header: intact; 45 rows.
- 4-eyes: **400** on same-person.
- Deep analysis: 200; 4.9ms; dossier created.
- Investigate: 200; diff + dossier.
- Dossiers: 6 present after test generations; seeded 3 at startup.
- HTML export: 200.
- Live trace: 200 with 3 steps and `SNAPSHOT_FALLBACK` (2.1s).
- Audit: `FILE_CHAIN`, 8/8.

## Honest assessment

- Advanced deterministic logic is **aligned** on the 5 vectors, versioned rules, determinism and audit binding.
- The **deep analysis is genuinely zero-LLM**; the investigation is neuro-symbolic with a deterministic C# diff.
- The **dossier is lawyer-ready Markdown/HTML**, not a PDF, and the signature is a mock.
- The **72h cluster is 13/95,511.91 CZK**, not the earlier 5/23,778 subset.
- FATF integration is curated references, not live MCP scraping.
- New analyzer/dossier endpoints lack dedicated unit tests; do not claim otherwise.
