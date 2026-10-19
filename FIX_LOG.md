# FIX LOG — Integrity Repair Pass

## Contradictions Found First

- `FINAL_REPORT.md` and `WAITING_FOR_CREDENTIALS.md` claimed **CONNECTED & VERIFIED** live Bedrock.
- `README.md` and `AGENTS.md` said Bedrock was blocked.
- The actual API returned `LIVE_BEDROCK_CACHED` with an SSL error.
- `FINAL_REPORT.md` said 20 tests; the suite had 22, then 24 after the new approval tests.
- Port 3000 is occupied by a non-VeriTriage app; the cockpit had only been verified on 3100 with `--disable-web-security`.

## FIX 1 — LIVE Badge: FIXED

- Added `IBedrockService` and a real `ProbeAsync` that calls `Converse` with `maxTokens: 1`.
- `GET /api/v1/bedrock/status` now returns `mode`, `latency_ms`, and `error`.
- UI reads `mode`, not `status`; badge shows `CACHED · Bedrock offline`.
- `FINAL_REPORT.md` and `WAITING_FOR_CREDENTIALS.md` now match `README.md` and `AGENTS.md`.

**Verified:** `/api/v1/bedrock/status` → `mode: "LIVE_BEDROCK"`, 1207ms; `/investigation` → `LIVE_BEDROCK`, 12706ms. UI screenshot shows the LIVE badge.

## FIX 2 — 4-Eyes in `/approve`: FIXED

- Added `ApprovalPolicy.Validate`; the approve handler looks up the actual row and compares the executive with the approver before accepting.
- Returns 400 with the exact `4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]` body.
- Removed the `mock_sig_` prefix gate; any non-empty mock signature is accepted only for an independent approver.

**Tests:** `ApproveEndpoint_RejectsSamePerson`, `ApproveEndpoint_AcceptsIndependentApprover`.

**Verified:**
- Same person → 400 with exact body.
- Marie Svobodová → 200 with `APPROVED` + `audit_hash`.

## FIX 3 — Audit Chain Honesty: FIXED (Option A)

- `/api/v1/cases/{id}/audit` now returns `{ events, chain_valid, mode: "DEMO_STATIC" }`.
- `/audit/verify` also returns `mode: "DEMO_STATIC"`.
- UI shows the yellow label: **Demo chain · Production appends events at write time**.

**Verified:** `curl /audit` → `mode: "DEMO_STATIC"`, `chain_valid: true`, 5 events.

## FIX 4 — Port/CORS: FIXED

- CORS now allows `localhost` and `127.0.0.1` on 3000 and 3100.
- Port 3000 is occupied by another app (a non-VeriTriage page titled with “hero-performer”); it was **not killed**.
- Demo uses port 3100.
- Normal Chrome (no `--disable-web-security`) on `http://127.0.0.1:3100` loads the table and shows the CACHED badge.

**Proof:** [screenshots/cockpit_light.png](screenshots/cockpit_light.png)

## FIX 5 — Live Bedrock: INTERMITTENT

- Earlier probe: `LIVE_BEDROCK`, 1207ms; investigation 12706ms, 4 claims.
- Latest probe: `LIVE_BEDROCK_CACHED` with an SSL error.
- The UI is probe-driven; the cassette remains labeled.
- Evidence: [AWS_BEDROCK_STATUS.md](AWS_BEDROCK_STATUS.md).

**Say live only when the current badge/panel says LIVE_BEDROCK.**

## FIX 6 — Docs/Tests Alignment: FIXED

- Test count: **24 passed, 0 failed**.
- `FINAL_REPORT.md` probability table: 45% current; 55–60% after fixes + rehearsal; 60–65% only if live Bedrock is verified.
- `FINAL_REPORT.md`, `WAITING_FOR_CREDENTIALS.md`, `README.md`, and `AGENTS.md` agree on the cached/blocked state.
- Rehearsal updated to use `ALERT-045` and the fixed endpoints; total 0.0356s for the backend path.

## Verification Commands

```bash
curl -s http://localhost:5000/api/v1/bedrock/status
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/v1/cases/ALERT-045/approve \
  -H "Content-Type: application/json" -d '{"approver_id":"Ing. Jan Novák","signature_b64":"x"}'
curl -s http://localhost:5000/api/v1/cases/ALERT-045/audit
curl -s -H "Origin: http://localhost:3100" http://localhost:5000/api/v1/deliverable/csv -o /dev/null -w "%{http_code}\n"
```

## Remaining Human Actions

1. Fix TLS/network or IAM for live Bedrock; then re-check the probe.
2. Rehearse [DEMO_SCRIPT.md](DEMO_SCRIPT.md) three times in a normal browser on port 3100.
3. Record `backup_video.mp4`.
