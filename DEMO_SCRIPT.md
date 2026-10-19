# 5-Minute FINREG Demo Script

**Target:** 4:30. **Hard stop:** 5:00.
**App:** `http://localhost:3000` · API on `:5000`.
**Rule:** never say “live Bedrock.” Say **“cached for demo stability.”**

## Pre-roll (before the timer)

- API is running: `dotnet run --project src/PayShield.Api --configuration Release`
- Web is running: `cd apps/web && npm run dev`
- Browser is at `http://localhost:3000`; zoom 100%; no other tabs.
- The table is sorted; **ALERT-009** is the FP at priority 18; **ALERT-045** is the PEP REVIEW at priority 96.

---

## 0:00 – 0:45 [THE HOOK]

**Click:** `Download FINREG Deliverable CSV`.

**Say:**
> “Under the Czech AML Act § 6 and § 21, a bank must justify every alert. We generate the exact 11-column FINREG CSV in about seven milliseconds. This is the deliverable.”

**Show:** the downloaded CSV header:

```
alert_id,alert_type,client_id,transaction_id,triage,priority,executive_role,executive_person,approver,reason,log
```

**If asked:** 45 rows, 30 FP, 10 REVIEW 40–74, 5 REVIEW 75+.

---

## 0:45 – 1:30 [THE FP vs REVIEW]

**Click:** the FP row **ALERT-009** (priority 18).

**Say:**
> “This is a false positive. Low amount, low risk, no PEP. We cleared it deterministically — no model call.”

**Click:** close the drawer. Scroll to **ALERT-045**, the PEP REVIEW row (priority 96).

**Say:**
> “This is a PEP with elevated 24-hour velocity. Priority 96. It requires MLRO escalation under § 21(5).”

**Do not** claim “8x volume”; the UI does not show an 8x figure. The cassette says elevated velocity; keep it qualitative.

---

## 1:30 – 2:30 [THE 4-EYES VIOLATION]

**Action:** the **ALERT-045** drawer is open. In **Assign Approver**, select **“Ing. Jan Novák (Same as Executive).”**

**Show:** the red banner appears immediately:

```
4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]
```

**Say:**
> “Watch what happens when the approver is the same person. The server rejects it with the statutory citation. The Sign & Approve button is disabled — the system blocks it before a signature can exist.”

**Do not** click a disabled button and wait. The banner is the proof.

---

## 2:30 – 3:30 [THE INDEPENDENT APPROVAL]

**Action:** change **Assign Approver** to **“Marie Svobodová (MLRO).”**

**Show:** the red banner clears; the button enables.

**Click:** `Sign & Approve`.

**Show:** the green **APPROVED** pill on the row and the toast with the audit hash.

**Say:**
> “With an independent MLRO approver, the mock signature is bound to the receipt hash. The row is approved, and the audit hash is the traceable record.”

**If asked why mock:** “The signature transport is mocked for the hackathon; the 4-eyes check and the hash are real.”

---

## 3:30 – 4:30 [THE AUDIT CHAIN]

**Action:** in the drawer, click the **Audit Chain** tab.

**Show:** five events in a vertical timeline: `ALERT_INGESTED`, `EVIDENCE_GATHERED`, `PRIORITY_COMPUTED`, `4_EYES_VERIFIED`, `APPROVED`.

**Click:** `Verify Chain`.

**Show:** green checks and:

```
Chain Verified: 5/5 events
```

**Say:**
> “Every step — alert, evidence, priority, 4-eyes, approval — is hash-chained. Each hash is computed over the previous hash plus the event data. This is what you show the regulator.”

---

## 4:30 – 5:00 [THE BEDROCK CASSETTE]

**Action:** click the **Details** tab. Click **Investigate (Cached)**.

**Show:** the `LIVE_BEDROCK_CACHED` label and the legal citation panel.

**Say:**
> “The Bedrock agent assembled the legal dossier: § 21(5) for the PEP exposure and § 6(1)(a) for the monitoring duty. Live model calls are cached for demo stability; the citations are exact, and the label says so.”

**Close:** stop talking at 5:00. Do not add a new claim.

---

## If Something Breaks

- **API is down:** show `rehearsal_output.csv` (already downloaded) and the `REHEARSAL.md` timing table. Do not fake the UI.
- **Browser is down:** play `backup_video.mp4` if recorded; otherwise walk the CSV + API proof files in `screenshots/`.
- **Audit tab fails:** do not claim “chain verified.” Say “the audit endpoint is not responding; the CSV log column still contains the row hash.”
- **4-eyes banner does not appear:** refresh the page, reopen ALERT-045, select the same person again. The API path is verified by `REHEARSAL.md`.

## Never Say

- “Live Bedrock” — say “cached for demo stability.”
- “Real mobile signature” — say “mock signature, real 4-eyes and hash.”
- “100% compliance” — say “statutory guardrail demonstrated.”
- Any number not on screen.
