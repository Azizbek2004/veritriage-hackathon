# Forensic UI Report

## Completed

- [x] **Task 1 — aesthetic fixes + debug labels removed + audit persisted**
  - `DEMO_STATIC` removed from the API/UI.
  - Audit is now a real file-backed ledger: `data/audit_ledger.json` via `FileAuditLedger`; `ledger_mode: "FILE_CHAIN"`.
  - Approving ALERT-045 appends an `APPROVED` event; dossier seeding adds 3 legal-dossier events; the chain survives refresh.
  - Two header badges: `ENGINE: C# DETERMINISTIC · <loadMs>ms` and `BEDROCK: LIVE/SNAPSHOT`.
  - No `DEMO_STATIC`, `LIVE_BEDROCK_CACHED`, or uppercase `CACHED` string remains in `apps/web/`.
  - Light Scandinavian system retained; typography is mono/tabular for numerics, tighter cards.
- [x] **Task 2 — priority breakdown pills**
  - JSON `priority_breakdown` on each row.
  - Table pill e.g. `B40 · V11 · P25 · S20`; tooltip with full formula.
  - Sum of components equals priority for all 45 rows (verified).
- [x] **Task 3 — client transaction cluster**
  - `CnbTransactionIndex` prebuilt at startup over 397,853 transactions / 5,493 clients.
  - `/api/v1/clients/{id}/cluster` returns declared vs actual, sibling ledger, structuring pattern, shared counterparty.
  - Drawer shows baseline bars, highlighted `THIS ALERT`, red pattern banner, shared-counterparty pill.
  - **Actual hero K005397 is 1.71x volume / 1.71x count, not 8.20x.** The brief's 8.20x/4.5M values are not in the official data; we did not fabricate them. Pattern: 13 sub-threshold transfers in 72h, total 95,511.91 CZK. Shared counterparty across 3 clients.
  - Warm lookup: ~7ms; first request ~21ms.
- [x] **Task 4 — verifier diff table**
  - `/api/v1/cases/{id}/diff` returns 5 rows.
  - Header: `LLM proposal (representative) vs. C# verifier (executed)`.
  - `Priority 74 → 96 · OVERRIDDEN (+22)` highlighted; `4-Eyes` FAIL_CLOSED; `Statutory` PROVEN.
  - Toggle to show/hide interventions.
- [x] **Task 5 — on-demand live deep-trace**
  - `POST /api/v1/cases/{id}/investigate-live` with a 2.5s timeout.
  - Drawer button `Run live deep-trace`; success → LIVE badge; fallback → `SNAPSHOT` toast.
  - Current environment returns snapshot in ~1.8s; earlier live Sonnet returned in 12.7s. No debug string rendered.

## Verified

- `dotnet test`: **26/26 passed**
- `npm run build`: green
- CSV header: intact (11 columns)
- 4-eyes bypass: **blocked** (400)
- Audit persistence: **works** — 5 → 6 events after approval; `FILE_CHAIN`
- Debug strings in `apps/web/`: **NONE** (case-sensitive `DEMO_STATIC`, `LIVE_BEDROCK_CACHED`, `CACHED`); lowercase CSS class names remain, no rendered text.
- Cluster/diff drawer: [screenshots/forensic_drawer.png](screenshots/forensic_drawer.png)
- Audit view: [screenshots/audit_chain.png](screenshots/audit_chain.png)

## What the human must verify before the pitch

1. Open `http://localhost:3100`.
2. Click **ALERT-045**.
3. Confirm cluster: 1.71x, sibling ledger, `THIS ALERT`, pattern banner, shared counterparty.
4. Confirm diff: 5 rows, OVERRIDDEN highlighted, FAIL_CLOSED row.
5. Confirm header badges: ENGINE + BEDROCK (no debug strings).
6. Click **Run live deep-trace**; confirm LIVE or SNAPSHOT toast.
7. Trigger 4-eyes violation; confirm red banner.
8. Sign with independent approver; confirm green toast + audit hash.
9. Refresh; confirm audit is 6/6 and still `FILE_CHAIN`.

## Not done / honest limits

- The brief's 8.20x/4.5M sample does not exist for K005397; actual is 1.71x. Do not say 8.20x.
- Live Bedrock is intermittent; the latest probe is snapshot. The 2.5s on-demand path will usually snapshot on Sonnet's 12.7s latency.
- The audit ledger is a local file (`data/audit_ledger.json`), not PostgreSQL; the label says `FILE_CHAIN`, not production DB.
- No real mobile signing; no dark slate repaint (light design retained).
- Human rehearsal and backup video still required.

## Honest win probability estimate

- Before this sprint: **55–60%**
- After this sprint, if the human rehearses the actual 1.71x cluster and diff path: **60–65%**
- Ceiling if live Bedrock is stable on stage: **65–70%**
