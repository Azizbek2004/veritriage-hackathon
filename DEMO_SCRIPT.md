# 5-Minute FINREG Demo Script

**Target:** 4:30. **Hard stop:** 5:00. Pre-warm the investigation before the timer.
**App:** `http://localhost:3100` · API on `:5000`.
**Rule:** say “live Bedrock” only when the header badge is LIVE and the panel says LIVE_BEDROCK. Otherwise say “cached for demo stability.”

## Pre-roll (before the timer)

- API is running: `dotnet run --project src/PayShield.Api --configuration Release`
- Web is running: `cd apps/web && npm run dev -- -p 3100`
- Browser is at `http://localhost:3100`; zoom 100%; no other tabs.
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

**Scroll:** in the drawer, show **Client transaction cluster**.
> “This is the real index: 39,819 CZK declared vs 68,262 actual — 1.71x volume, 1.71x count. Five sub-threshold transfers in 48 hours, 23,778 CZK total. The brief’s 8.20x is not this client; we show the actual number.”

**Scroll:** show **Neuro-symbolic check**.
> “The representative LLM proposed priority 74. The C# verifier recomputed 96 and marked it OVERRIDDEN. It also fail-closed the same-person approval.”

**Do not** claim “8x volume” or the brief’s 8.20x; the actual K005397 ratio is 1.71x.

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

## 4:30 – 5:00 [THE BEDROCK INVESTIGATION]

**Action:** click the **Details** tab. Click **Investigate**. If the badge says LIVE, the call takes about 12 seconds; if it says CACHED, the cassette returns immediately. Read the badge and panel before speaking.

**Show:** the actual mode label (`LIVE` or `SNAPSHOT`), the tool calls, and the quoted statutory panel.

**Point at the legal card and say:**
> “The agent didn’t guess the section. The pipeline called `lookup_statutory_provision`, retrieved the Czech statutory text, and quoted it. Here is the actual clause: ‘Podezřelým obchodem se rozumí…’. If the corpus has no text, we say ‘section text unavailable’ and do not cite it.”

**Say:**
> “The Bedrock agent assembled the legal dossier live: § 21(5) for the PEP exposure and § 6(1)(a) for the monitoring duty. If the network falls back, the panel says LIVE_BEDROCK_CACHED — we never relabel the cassette.”

**Close:** stop talking at 5:00. Do not add a new claim.

---

## If Something Breaks

- **API is down:** show `rehearsal_output.csv` (already downloaded) and the `REHEARSAL.md` timing table. Do not fake the UI.
- **Browser is down:** play `backup_video.mp4` if recorded; otherwise walk the CSV + API proof files in `screenshots/`.
- **Audit tab fails:** do not claim “chain verified.” Say “the audit endpoint is not responding; the CSV log column still contains the row hash.”
- **4-eyes banner does not appear:** refresh the page, reopen ALERT-045, select the same person again. The API path is verified by `REHEARSAL.md`.

## Never Say

- “Live Bedrock” only if the badge is LIVE and the panel says LIVE_BEDROCK; otherwise say “cached for demo stability.”
- “Real mobile signature” — say “mock signature, real 4-eyes and hash.”
- “100% compliance” — say “statutory guardrail demonstrated.”
- Any number not on screen.
