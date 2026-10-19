# FINAL REPORT — Data Cockpit + Safe Audit Chain

**Date:** 2026-10-19
**Status:** UI/UX advanced. Audit chain crash fixed. Data volume + reprocess added. Bedrock is **probe-driven**; the latest probe is cached.

## New UX

- **Data strip:** 397,853 ČNB transactions, 5,493 clients, 45 FINREG alerts, 35.3 MB read, last run 37 ms.
- **Reprocess button:** calls `POST /api/v1/deliverable/reprocess`, re-scans the official files, updates the rows and stats, and toasts the new runtime.
- **KPIs:** alerts, FP/review split, high-priority/PEP count, approvals in this session, 21.1 FTE.
- **Filters + search:** All / FP / Review / High and client/alert/transaction search.
- **Decision drawer:** statutory basis, 4-eyes state, live/cached Bedrock mode, claim cards, and legal citation.
- **Audit chain:** safe fetch/verify, explicit error with retry, 5-event timeline, copy hash, Verify Chain, Download audit JSON.
- **Deep links:** `?case=ALERT-045&tab=audit` opens the audit drawer directly; this was used to verify the crash fix.
- **Error boundary:** `app/error.tsx` prevents a single render error from blanking the cockpit.
- External Google Fonts import removed so the table renders without network access.
- All 11 FINREG columns fit the 1440px shell; footer duplicate removed.

## Audit Chain Crash — Fixed

The previous audit tab assumed the endpoint always returned `{events: [...]}`. If the endpoint returned an array, an error, or a malformed payload, `audit.map` crashed the page.

Now:

- `/audit` and `/audit/verify` responses are normalized.
- `events` is always an array.
- Fetch/parse/verify failures set a visible error with a Retry button.
- A Next.js error boundary catches any remaining render error.
- Deep-link screenshot: [screenshots/audit_chain.png](screenshots/audit_chain.png).

## Data Processing

`GET /api/v1/deliverable/stats`:

```json
{
  "deliverableRows": 45,
  "transactionRows": 397853,
  "clientRows": 5493,
  "bytesScanned": 36972049,
  "loadMs": 48.9,
  "source": "ČNB official dataset"
}
```

`POST /api/v1/deliverable/reprocess` re-runs the scan and returns `{summary, rows}`. The button is wired to it.

## Bedrock Status — Probe-Driven

The badge is not hardcoded. The latest probe returned:

```json
{
  "mode": "LIVE_BEDROCK_CACHED",
  "latency_ms": 1229,
  "error": "The SSL connection could not be established, see inner exception."
}
```

Earlier probes returned `LIVE_BEDROCK` (1207ms probe, 12706ms investigation). The live path is intermittent. The UI correctly shows **CACHED** when the probe fails, and the cassette is labeled. Do not claim live unless the badge and panel say `LIVE_BEDROCK`.

## Verified

- `dotnet test` — **24 passed, 0 failed**.
- `npm run build` — green.
- CSV header — exact 11 columns.
- 4-eyes — same person 400; independent 200.
- Stats — 397,853 transactions / 5,493 clients / 45 alerts.
- Reprocess — 200, 45 rows, ~37ms.
- Audit — `DEMO_STATIC`, 5/5, no crash; deep link verified.
- Normal Chrome on `http://localhost:3100`; no security flags.
- GitHub — public, `main` pushed.

## Honest Win Probability

| State | Probability |
|---|---:|
| Current: polished cockpit, cached Bedrock, no human rehearsal | **50%** |
| After three rehearsals of the 5-minute script | **55–60%** |
| If the Bedrock probe is stably live | **60–65%** |

## Human Actions

1. Pre-warm the investigation before the timer; confirm the badge/panel mode and use the matching script path.
2. Rehearse [DEMO_SCRIPT.md](DEMO_SCRIPT.md) three times on `http://localhost:3100`.
3. Record `backup_video.mp4`.
4. If Bedrock is cached, say “cached for demo stability” — never “live.”

## Links

- [screenshots/cockpit_light.png](screenshots/cockpit_light.png)
- [screenshots/audit_chain.png](screenshots/audit_chain.png)
- [AWS_BEDROCK_STATUS.md](AWS_BEDROCK_STATUS.md)
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
