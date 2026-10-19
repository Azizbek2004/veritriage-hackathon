# Deterministic Logic & Legal Document Report

## Part 1 — Standards alignment

- **RuleRegistry:** implemented — 5 rules, v1.0.0, effective 2026-01-01, statutory basis and threshold.
- **Determinism endpoint:** working — `POST /api/v1/verify/determinism/ALERT-045` returns `reproducible: true`, input/output hashes and 5 rule versions.
- **ExplanationSnapshot:** present — `GET /api/v1/cases/{id}/explanation`; fired and not-fired rules; rendered in the drawer's Details tab.
- **Reason column:** includes rule IDs/versions and quoted Czech clauses.

## Part 2 — Investigation vs. deep analysis

- **Deep analysis endpoint:** working — `POST /api/v1/cases/{id}/deep-analysis`; REVIEW-only.
- **Document generated:** yes — Markdown, 9 sections (header, executive summary, evidence, priority, rules, verifier status, 4-eyes, audit excerpt, FATF references, disclaimer).
- **Persistence:** yes — `documents/{caseId}/{documentId}.md` + `data/documents.json`.
- **Audit events:** `DEEP_ANALYSIS_GENERATED` and `DEEP_ANALYSIS_SIGNED` written to the file ledger.
- **PDF:** not generated. The human approved Markdown-only for this sprint; no PDF package was added.
- **Signature:** mock MLRO sign; SHA-256 signature hash; not a real ECDSA device signature.
- **Frontend:** Deep Analysis tab with Generate, list, Download, Bundle, Sign.

## Part 3 — Lawyer-ready bundle

- **Bundle endpoint:** working — `GET /api/v1/documents/{id}/bundle`; ZIP with 6 files:
  - `analysis.md`
  - `evidence.json`
  - `audit_chain.json`
  - `rule_registry.json`
  - `fatf_references.json`
  - `signatures.json`
- **Document hash verification:** working — `GET /api/v1/documents/{id}/verify`.
- **FATF:** curated references + endpoint + bundle section; not a live MCP fetch.

## Verification

- CSV header: intact.
- 4-eyes: blocked (400).
- Tests: **26/26** (25 prior + determinism test).
- Build: green.
- Deep analysis: 200; document/sign/bundle/verify tested.
- Audit: `FILE_CHAIN`, 6/6.

## Honest assessment

- Deterministic logic is **aligned** for rule versioning, determinism, and explainability.
- Deep analysis produces a **partially lawyer-ready** Markdown artifact + bundle; it is not a PDF and does not re-run all five verifier gates in the document. The document says `NOT_RE_RUN` for the gates. Do not call it a complete legal opinion.
- The FATF integration is a curated reference corpus, not live scraping/MCP routing. Do not claim live FATF retrieval.
- The flow separates fast triage from slow document generation and requires a human sign step (mock signature in this build).
