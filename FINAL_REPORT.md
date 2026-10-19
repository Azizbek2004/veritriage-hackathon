# FINAL REPORT — Forensic AML Workstation

**Date:** 2026-10-19
**Status:** Forensic UI sprint complete; file-backed audit; live Bedrock is snapshot/intermittent; human rehearsal remains.

## Forensic upgrades

- **Client transaction cluster:** 397,853-row index, 5,493 clients; baseline vs actual bars; sibling ledger; structuring pattern; shared counterparty.
- **Verifier diff:** 5-row `LLM proposal (representative)` vs `C# verifier (executed)`; `OVERRIDDEN (+22)` highlighted; `FAIL_CLOSED` 4-eyes row.
- **Priority breakdown:** `priority_breakdown` per row; sum equals displayed priority for all 45 CSV rows.
- **Persistent audit:** `FileAuditLedger` → `data/audit_ledger.json`; approve appends `APPROVED`; audit goes 5 → 6; refresh stable. API `ledger_mode: FILE_CHAIN`.
- **Debug labels removed:** no `DEMO_STATIC`, `LIVE_BEDROCK_CACHED`, or uppercase `CACHED` in `apps/web/`.
- **Dual operational badges:** `ENGINE: C# DETERMINISTIC · <ms>` and `BEDROCK: LIVE/SNAPSHOT`.
- **On-demand deep-trace:** button + 2.5s timeout; snapshot fallback; no raw mode string.
- **UX:** data strip, reprocess, filters, PEP badges, compact 11-column table, deep links, error boundary, no external font import.

## Honest data note

The hero client K005397 is **1.71x volume / 1.71x count** (39,819.67 CZK declared vs 68,262.30 actual; 7 vs 12 transactions). The brief's 8.20x/4.51M values are not in the official data. The cluster shows the real numbers; the maximum 72h sub-threshold window is 13 transfers totaling 95,511.91 CZK. Do not say 8.20x on stage.

## Verified

- `dotnet test`: **26/26**
- `npm run build`: green
- CSV: exact 11 columns
- 4-eyes: same person 400; independent 200
- Audit: `FILE_CHAIN`, 6/6 after approval, refresh-persistent
- Priority breakdown: 45/45 sums match
- Cluster: ~7ms warm, ~21ms first; actual values
- Diff: 5 rows, OVERRIDDEN + FAIL_CLOSED
- Debug strings: none in `apps/web/`
- GitHub: public `main`

## Honest win probability

| State | Probability |
|---|---:|
| Current, no human rehearsal | **55–60%** |
| After three rehearsals of the actual 1.71x path | **60–65%** |
| If live Bedrock is stable and <2.5s | **65–70%** |

## Human actions

1. Verify the 9 steps in [FORENSIC_UI_REPORT.md](FORENSIC_UI_REPORT.md).
2. Rehearse [DEMO_SCRIPT.md](DEMO_SCRIPT.md) three times on 3100; use the actual 1.71x numbers.
3. Record `backup_video.mp4`.
4. Confirm the audit persists after refresh; `data/audit_ledger.json` is gitignored runtime state.


## Legal grounding

- 12/12 human-approved Czech AML/ČNB/FAU provisions in `fixtures/legal_corpus_cnb_aml.json`.
- `lookup_statutory_provision` is a deterministic agent-pipeline tool; it logs 4 calls for the PEP hero case and returns quoted `text_cs`.
- CSV `reason` now contains the exact quoted Czech clause and the actual 1.71x ratios.
- `SOLUTION_2PAGE.md` and the QA war room are updated.
- Honest boundary: the LLM does not autonomously select the tool; the deterministic pipeline retrieves and injects the excerpts. Do not claim autonomous model tool use.


## Deep analysis & legal documents

- 5 versioned rules (v1.0.0) and `ExplanationSnapshot` in the drawer.
- `POST /cases/{id}/deep-analysis` generates a 9-section Markdown document, persisted under `documents/{caseId}/`.
- `DEEP_ANALYSIS_GENERATED`/`DEEP_ANALYSIS_SIGNED` audit events.
- ZIP bundle with analysis.md, evidence.json, audit_chain.json, rule_registry.json, fatf_references.json, signatures.json.
- Markdown-only approved; no PDF package. Document hash verify endpoint works.


## Deep Analysis

- Drawer tab **Deep Analysis**; Generate for REVIEW/ESCALATE; Markdown document persisted under `documents/{caseId}/`.
- Document includes evidence, priority breakdown, rules, verifier status, 4-eyes, audit excerpt, FATF references, disclaimer.
- Sign endpoint + `DEEP_ANALYSIS_SIGNED`; bundle ZIP with 6 files; hash verify.
- Markdown-only approved; no PDF package. PDF is a declared gap.


## Advanced deterministic pass

- 5-vector analyzer: velocity, 72h cluster, HHI/shared links, round amount, priority.
- Deep analysis measured 4.9ms; zero LLM tokens.
- Statutory investigation 2.7s with snapshot fallback and C# diff.
- Legal dossiers persisted in `data/legal_dossiers.json`; 3 seeded; HTML export.
- Browse queue 200 rows; CSV remains 45; scroll loads +40.
- Tests 26/26; new endpoints manually verified.
