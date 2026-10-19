# STOPPED — Production Hardening Pre-Flight

**Status:** `BLOCKED_PACKAGE_APPROVAL` — stopped before Phase 1 to preserve the demo and honor the package rule.

## Pre-Flight Results (all green)

- `git status` clean at `51e7b9e`.
- `dotnet test`: **24/24 passed**.
- `npm run build`: green.
- CSV header: exact 11 columns.
- `/approve` same person: **400** with the exact 4-eyes body.
- `/bedrock/status`: `LIVE_BEDROCK`, 1354ms.
- Demo path: CSV → REVIEW → 4-eyes → approval → audit remains intact.

## Why Stopped

The 9.0 rubric requires packages and external systems not approved or present:

- EF Core + Npgsql + Serilog + Swashbuckle + JWT.
- Zustand + TanStack Query + SignalR + Vitest.
- A new Expo app and real device for signing.
- PostgreSQL.

The brief explicitly says: *“Do not add packages that are not already in .csproj or package.json without writing PROPOSAL.md and stopping.”* This is that stop.

## What Was Not Done

- Phase 1 refactor.
- Phase 2–5 features.
- Phase 6 9.0 score (baseline is 2.7/10).
- Iteration loops.

No code was changed during this production-hardening attempt. The demo is exactly as pushed at `51e7b9e`.

## Commands the Human Must Run

```bash
dotnet test src/PayShield.sln --configuration Release
cd apps/web && npm run build
curl -s http://localhost:5000/api/v1/deliverable/csv | head -1
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/v1/cases/ALERT-045/approve \
  -H "Content-Type: application/json" -d '{"approver_id":"Ing. Jan Novák","signature_b64":"x"}'
```

Then rehearse `DEMO_SCRIPT.md` three times on `http://localhost:3100` in a normal browser and record `backup_video.mp4`.

## Decision Needed

1. Approve the package set in `PROPOSAL.md` for a post-pitch hardening window, or
2. Skip hardening and rehearse now. The current demo is live and visually ready; the main risk is stage timing.
