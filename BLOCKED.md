# BLOCKED — Release Candidate 2026-10-19

The FINREG CSV and 4-eyes gate are implemented and verified. These are the remaining blockers.

## 1. Exact FINREG CSV Template Is Unverified

The brief said the exact `FinregDeliverableEngine.cs` was provided; no code was present. The implemented headers are an interpretation:

```
alert_id,client_id,client_name,triage,priority,role,
executive_person,approver,four_eyes_status,legal_basis,reason
```

If FINREG's exact template differs, the 85% score is at risk. Compare before submission. See `PROPOSAL.md` P3.

## 2. GitHub Push

The deploy key is not added; HTTPS has no credentials. The repo is committed locally but not pushed. Add `secrets/github_deploy_key.pub` as a write deploy key, or run `git push` from an authenticated machine.

## 3. Live Bedrock

The TeamAdmin token is invalid; ReadOnly cannot `InvokeModel`. The build uses the cassette and labels it `LIVE_BEDROCK_CACHED`. If a live model is required, refresh the SSO session. See `WAITING_FOR_CREDENTIALS.md`.

## 4. Missing Demo Pieces

- Real mobile ECDSA signing and server verification.
- SignalR approval flow.
- Audit hash-chain endpoint and view.
- E2E test.
- 5-minute rehearsal.

## What Is Not Blocked

- `dotnet test` 18/18.
- `npm run build` green.
- 45-row / 11-column CSV with 30/10/5.
- 4-eyes 400 with exact text.
- Cached Bedrock investigation.
