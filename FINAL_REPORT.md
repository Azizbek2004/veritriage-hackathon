# FINAL REPORT — Forensic AML Workstation

**Date:** 2026-10-19
**Status:** Forensic UI sprint complete; file-backed audit; live Bedrock is snapshot/intermittent; human rehearsal remains.

## Forensic upgrades

- **Client transaction cluster:** 397,853-row index, 5,493 clients; baseline vs actual bars; sibling ledger; structuring pattern; shared counterparty.
- **Verifier diff:** 5-row `LLM proposal (representative)` vs `C# verifier (executed)`; `OVERRIDDEN (+22)` highlighted; `FAIL_CLOSED` 4-eyes row.
- **Priority breakdown:** `priority_breakdown` per row; sum equals displayed priority for all 45 rows.
- **Persistent audit:** `FileAuditLedger` → `data/audit_ledger.json`; approve appends `APPROVED`; audit goes 5 → 6; refresh stable. API `ledger_mode: FILE_CHAIN`.
- **Debug labels removed:** no `DEMO_STATIC`, `LIVE_BEDROCK_CACHED`, or uppercase `CACHED` in `apps/web/`.
- **Dual operational badges:** `ENGINE: C# DETERMINISTIC · <ms>` and `BEDROCK: LIVE/SNAPSHOT`.
- **On-demand deep-trace:** button + 2.5s timeout; snapshot fallback; no raw mode string.
- **UX:** data strip, reprocess, filters, PEP badges, compact 11-column table, deep links, error boundary, no external font import.

## Honest data note

The hero client K005397 is **1.71x volume / 1.71x count** (39,819.67 CZK declared vs 68,262.30 actual; 7 vs 12 transactions). The brief's 8.20x/4.51M values are not in the official data. The cluster shows the real numbers; the pattern is 5 sub-threshold transfers in 48h totaling 23,778.04 CZK. Do not say 8.20x on stage.

## Verified

- `dotnet test`: **24/24**
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
