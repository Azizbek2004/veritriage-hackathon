# 5-Minute Rehearsal — Automated Backend Simulation

**Date:** 2026-10-19
**Scope:** the four backend steps the release brief requires. This is not a human presentation; it is a timed curl rehearsal against the running API on `http://127.0.0.1:5000`. The full 5-minute human run has not been performed.

## Commands and timings

| Step | Command | HTTP | Wall clock |
|---|---|---:|---:|
| 1. Download CSV | `curl -sS http://127.0.0.1:5000/api/v1/deliverable/csv -o rehearsal_output.csv` | 200 | 0.0077s |
| 2. 4-eyes denial | `curl -X POST .../verify-4-eyes -d '{"executive":"Jan","approver":"Jan"}'` | 400 | 0.0072s |
| 3. Independent approver | `curl -X POST .../verify-4-eyes -d '{"executive":"Jan","approver":"Marie"}'` | 200 | 0.0068s |
| 4. Mock approve | `curl -X POST .../cases/1/approve -d '{"signature_b64":"mock_sig_123","approver_id":"Marie"}'` | 200 | 0.0062s |
| **Total** | | | **0.0279s** |

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

Step 4 body:

```json
{"status":"APPROVED","audit_hash":"sha256:a3da12684382c730e81b38f01403b265cdcaf7dd7ce5bf9ffcb9c74da9397f5a"}
```

## What This Proves

- The CSV endpoint returns the exact 11-column FINREG header and 45 rows.
- The same-person approval is rejected by the server with the exact 400 body.
- An independent approver is accepted.
- The mock signature approval returns an `APPROVED` status and an audit hash.
- The backend path is far under 5 minutes.

## What This Does Not Prove

- The 5-minute human pitch, slide order, or stage timing.
- The frontend visual rehearsal (the page builds, but it was not walked through in a browser).
- Live Bedrock, real ECDSA signing, or the audit chain.

## Rehearsal Instruction for the Human

Run the API and web app, then follow the 5-minute script:

```bash
dotnet run --project src/PayShield.Api --configuration Release
cd apps/web && npm run dev
```

Open `http://localhost:3000`, download the CSV, open a REVIEW row, trigger the same-person 4-eyes violation, choose the independent approver, and click **Sign & Approve (Mock)**. The row turns green APPROVED and the toast shows the audit hash.
