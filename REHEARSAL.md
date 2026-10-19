# 5-Minute Rehearsal — Automated Backend Simulation

**Date:** 2026-10-19
**Scope:** the backend steps the release brief requires. This is not a human presentation; it is a timed curl rehearsal against the running API on `http://127.0.0.1:5000`. The full 5-minute human run has not been performed.

## Commands and timings

| Step | Command | HTTP | Wall clock |
|---|---|---:|---:|
| 1. Download CSV | `curl -sS http://127.0.0.1:5000/api/v1/deliverable/csv -o rehearsal_output.csv` | 200 | 0.0087s |
| 2. 4-eyes denial | `curl -X POST .../verify-4-eyes -d '{"executive":"Jan","approver":"Jan"}'` | 400 | 0.0077s |
| 3. Independent approver | `curl -X POST .../verify-4-eyes -d '{"executive":"Jan","approver":"Marie"}'` | 200 | 0.0068s |
| 4. Mock approve | `curl -X POST .../cases/ALERT-045/approve -d '{"signature_b64":"x","approver_id":"Marie Svobodová"}'` | 200 | 0.0057s |
| 5. Audit verify | `curl -sS .../cases/ALERT-045/audit/verify` | 200 | 0.0067s |
| **Total** | | | **0.0356s** |

`rehearsal_output.csv` has 46 lines (exact header + 45 rows).

## Assertions observed

Step 2 body:

```json
{"error":"4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]"}
```

Step 3 body:

```json
{"status":"ok"}
```

Step 4 body (shape):

```json
{"status":"APPROVED","audit_hash":"sha256:..."}
```

Step 5 body (shape):

```json
{"chain_valid":true,"verified_events":5,"total_events":5,"mode":"DEMO_STATIC"}
```

## What This Proves

- The CSV endpoint returns the exact 11-column FINREG header and 45 rows.
- The same-person approval is rejected by the server with the exact 400 body.
- An independent approver is accepted.
- The mock signature approval returns `APPROVED` and an audit hash.
- The audit chain verifies 5/5 and is labeled `DEMO_STATIC`.
- The backend path is far under 5 minutes.

## What This Does Not Prove

- The 5-minute human pitch, slide order, or stage timing.
- A click-through of the cockpit on port 3100 in a normal browser.
- Live Bedrock, real ECDSA signing, or a persistent audit chain.

## Rehearsal Instruction for the Human

```bash
dotnet run --project src/PayShield.Api --configuration Release
cd apps/web && npm run dev -- -p 3100
```

Open `http://localhost:3100`, download the CSV, open ALERT-045, trigger the same-person 4-eyes violation, choose Marie Svobodová, click **Sign & Approve**, open **Audit Chain**, and click **Verify Chain**.

Port 3000 is occupied by another app; do not kill it. Use 3100; CORS allows both.
