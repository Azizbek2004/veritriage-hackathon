# FINAL REPORT — Integrity Repair

**Date:** 2026-10-19
**Status:** Four P0 integrity issues fixed. Bedrock is **cached**, not live. The repo is pushed and public. Human rehearsal is the remaining gate.

## What Changed

| Fix | Result |
|---|---|
| FIX 1 — Live badge | **FIXED** — `/api/v1/bedrock/status` now performs a real `Converse` probe and returns `mode`, `latency_ms`, `error`. UI shows a yellow **CACHED · Bedrock offline** badge. |
| FIX 2 — 4-eyes in `/approve` | **FIXED** — the endpoint looks up the case executive and rejects the same person with 400. |
| FIX 3 — Audit honesty | **FIXED (Option A)** — `/audit` returns `mode: "DEMO_STATIC"`; UI labels it **Demo chain · Production appends events at write time**. |
| FIX 4 — Port/CORS | **FIXED** — CORS allows 3000/3100 on localhost and 127.0.0.1; normal Chrome on 3100 loads the table. Port 3000 is another app and was not killed. |
| FIX 5 — Live Bedrock | **CASSETTE / BLOCKED** — real probes return SSL error; no live response. See [AWS_BLOCKED.md](AWS_BLOCKED.md). |
| FIX 6 — Docs/tests | **FIXED** — 24 tests; docs aligned to the cached state. |

## Verified

- `dotnet test` — **24 passed, 0 failed, 0 skipped**.
- `npm run build` — green.
- Bedrock probe — `mode: "LIVE_BEDROCK_CACHED"`, `latency_ms: 1550`, `error: "The SSL connection could not be established, see inner exception."`
- 4-eyes approve — same person returns 400 with the exact `4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]` body; Marie Svobodová returns 200.
- Audit — `mode: "DEMO_STATIC"`, `chain_valid: true`, 5/5.
- CORS — `Access-Control-Allow-Origin: http://localhost:3100`.
- Normal Chrome on 3100 loads the table; no `--disable-web-security`.
- Backend rehearsal — 0.0356s for CSV + 4-eyes + approve + audit.
- GitHub — public, `main` pushed.

## Screenshots

- [screenshots/cockpit_fixed.png](screenshots/cockpit_fixed.png) — normal Chrome, port 3100, CACHED badge.
- `screenshots/4_eyes_violation_headers.txt` — HTTP 400.
- `screenshots/4_eyes_violation_body.txt` — exact body.
- `screenshots/audit_chain_verify.json` — 5/5, DEMO_STATIC.
- `screenshots/csv_header.txt` — exact header.

## Bedrock — CASSETTE

The status endpoint is honest now:

```json
{
  "mode": "LIVE_BEDROCK_CACHED",
  "model": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "region": "eu-central-1",
  "latency_ms": 1550,
  "error": "The SSL connection could not be established, see inner exception."
}
```

No AWS CLI is installed. The API was also tested with `AWS_PROFILE=129898826668_ai-hackathon-TeamAdmin`; the same SSL error occurred. **Do not say live.**

## Audit Chain — DEMO_STATIC

`GET /api/v1/cases/{id}/audit` returns:

```json
{
  "events": ["ALERT_INGESTED", "EVIDENCE_GATHERED", "PRIORITY_COMPUTED", "4_EYES_VERIFIED", "APPROVED"],
  "chain_valid": true,
  "mode": "DEMO_STATIC"
}
```

The events are deterministic and the hashes link correctly. The UI labels the chain as a demo; it is not a persistent production log.

## Port / CORS

- Port 3000 is occupied by a non-VeriTriage app; it was not killed.
- The cockpit runs on `http://localhost:3100`.
- CORS allows `http://localhost:3000`, `http://localhost:3100`, `http://127.0.0.1:3000`, `http://127.0.0.1:3100`.
- The normal-browser screenshot proves the table loads.

## Honest Win Probability

| State | Probability |
|---|---:|
| Current, after fixes but before human rehearsal | **45%** |
| After human rehearsal of the 5-minute script | **55–60%** |
| Only after a verified live Bedrock call | **60–65%** |

The 60–65% number is **not** the current state. The current state is 45%.

## Human Actions Required

1. Fix TLS/proxy access or IAM for Bedrock; re-run `/api/v1/bedrock/status` and require `mode: "LIVE_BEDROCK"` before changing the badge.
2. Rehearse [DEMO_SCRIPT.md](DEMO_SCRIPT.md) three times on port 3100 in a normal browser.
3. Record `backup_video.mp4`.
4. Push the final commit (if not already pushed).
