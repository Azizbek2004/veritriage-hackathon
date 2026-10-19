# FINAL REPORT — FINREG Release Candidate

**Date:** 2026-10-19
**Status:** Release candidate. Not submitted. No live Bedrock, no real mobile signature, no audit tab, no rehearsal.

## Required Output

```text
FINALIZATION COMPLETE (PARTIAL).
Deliverable CSV: CONDITIONAL PASS — 45 rows, 11 columns, 30/10/5 distribution, priority 0-100, exec != approver, legal reason present. Exact FINREG header order is UNVERIFIED because the promised FinregDeliverableEngine.cs code was not present in the brief.
4-Eyes Gate: PASS — POST /api/v1/cases/verify-4-eyes returns 400 with the exact body for the same person.
Bedrock: CACHED — LIVE_BEDROCK_CACHED cassette; no live call.
GitHub: NOT PUSHED — deploy key not added; HTTPS has no credentials.
Demo Rehearsed: NO — cockpit builds and endpoints verified, but the 5-minute run was not performed.
Honest Win Probability: 30% (range 25–35%).
```

## What Works

- `dotnet build` — green, 0 warnings, 0 errors.
- `dotnet test` — **18 passed, 0 failed, 0 skipped**.
- `GET /api/v1/deliverable/csv` — 46 lines (header + 45), exactly 11 columns.
- Distribution: 30 FP <40; 10 REVIEW 40–74; 5 REVIEW 75+; one PEP high.
- `POST /api/v1/cases/verify-4-eyes` — exact 400 body:
  `{"error":"4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]"}`
- Next.js cockpit — `npm run build` green; 45-row table, priority colors, download button, drawer, 4-eyes dropdown, red banner, QR placeholder, F9 signature injection, cached investigation panel.
- `METHODOLOGY.md` — formula, 4-eyes matrix, gate-to-statute mapping.
- Official datasets acquired: 397,853 ČNB transactions, 5,493 clients, 8 KYB PDFs, 10,542 licence rows.
- GitHub remote configured; commit history intact.

## What Is Mocked

- **Bedrock** is a pre-baked cassette labeled `LIVE_BEDROCK_CACHED`. No live model call.
- **QR signing** is a UI placeholder with F9 injection; no real device signature or server verification.
- **Priority sample** is rank-calibrated to force the 30/10/5 FINREG distribution. The raw formula is documented in `METHODOLOGY.md`; the CSV priority is the calibrated band.
- **Client name** is the client ID; the official transaction/client files do not provide a display name.
- **MCC** is `UNKNOWN`; the official data has no MCC.

## What Is Broken or Unverified

1. **Exact FINREG CSV contract is unverified.** The brief said the exact `FinregDeliverableEngine.cs` code was provided below, but no code block was present. The 11 headers are an interpretation of the stated table and legal requirements. If FINREG requires a different header order or names, the 85% score is at risk.
2. **GitHub is not pushed.** The deploy key is not added; HTTPS has no credentials.
3. **No live Bedrock.** The TeamAdmin token is invalid; ReadOnly cannot `InvokeModel`.
4. **No real mobile signing.** The QR modal is a demo placeholder.
5. **No audit chain UI.** The 5-minute script’s 4:00–5:00 step is not implemented.
6. **No 5-minute rehearsal.** The cockpit was built and the API was curl-tested, not presented in a browser with a timer.

## What Is Not Built

- Real ECDSA mobile signing and server verification.
- SignalR approval flow.
- Audit hash-chain endpoint/view.
- Live Bedrock two-hop agent and tool use.
- E2E test.
- GitHub push/submission.
- Backup video.

## The Three Things to Rehearse

1. CSV download and the 11-column explanation.
2. 4-eyes violation red banner and exact error text.
3. QR signing / F9 failover.

## The Three Things to Verify Before Stage

1. Refresh `ai-hackathon-TeamAdmin` SSO and decide live vs. cassette. If live, run the Sonnet 4.5 ping and record latency.
2. Confirm the FINREG header order against the organizer’s exact template. If it differs, fix `FinregDeliverableEngine.ToCsv` before the pitch.
3. Add the GitHub deploy key or push from an authenticated machine; confirm the repo is public or judges are collaborators.

## Honest Win Probability

- **Current release candidate: 30%** (25–35%). The FINREG CSV and 4-eyes gate are strong; the exact header risk, missing live Bedrock, missing audit/mobile, and no rehearsal cap it.
- **If the header order is confirmed and the 5-minute demo is rehearsed: 45–50%.**
- **Only with live Bedrock and real signing: 55–60%.** The 72–78% pivot ceiling is not reachable tonight.

## Next Actions

1. Confirm the exact FINREG CSV template and adjust headers if needed.
2. Rehearse the 5-minute demo in a browser.
3. Add the GitHub deploy key and push.
4. Refresh AWS invoke credentials; if unavailable, keep the cassette label honest.
5. Add the audit chain and real mobile signing only if time remains.
