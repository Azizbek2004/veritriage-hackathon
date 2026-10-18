# Morning Brief — 2026-10-19

Read this in 5 minutes. Then start.

## The state of the world

The environment is ready. The product is not: contracts, source, apps, and fixtures are intentionally absent, and the bootstrap gate is working as designed. The first action is B-000, not the orchestrator.

Tonight's audit found **no code blockers**. There are four planned gates: B-000 contracts, HUMAN-001 fixtures, HUMAN-002 package approval, and one-orchestrator discipline. There is one 1-minute narrative fix at `pitch/opening.md:15`; see [NARRATIVE_FIX.md](NARRATIVE_FIX.md). Do not add a sixth framing.

## The first 90 minutes

**0:00–0:10 — both read this brief.** Approve the package set (HUMAN-002). Write `DECISION.md`. Do not install anything before it.

**0:10–0:35 — parallel.**
- Person A: B-000. Materialize the contracts from `blueprint.md` section 3 using [BOOTSTRAP.md](BOOTSTRAP.md) Step 0. Commit B-000.
- Person B: B-003. Create the `apps/web` shell from `BOOTSTRAP.md` Step 3. Do not run `npm install` until packages are approved.

**0:35–1:05 — parallel.**
- Person A: B-001 and B-002. Create the .NET solution, link the contracts, add the test harness, and add the VT-001 red test.
- Person B: B-004. Create the `apps/mobile` shell. Then run `npm install` in `apps/web` and `apps/mobile` and `npm run build` in `apps/web`.

**1:05–1:20 — fixtures.**
- Person A: run the ARES curls, filter active directors, generate the P-256 key, and start the Textract command if AWS is ready.
- Person B: render `fixtures/invoice_hero.png`. Leave `alert_hero.json` and `alerts_batch_100.json` as HUMAN-001 TODOs; do not invent them.

**1:20–1:30 — meet and verify.**
- `dotnet test src/PayShield.sln --configuration Release` shows **exactly one failure**, VT-001.
- `cd apps/web && npm run build` is green.
- Person A commits the combined bootstrap.
- Person A launches the orchestrator. Person B does not launch a second one.

**Two-laptop rule:** there is no git remote configured (`git remote -v` is empty). Use one laptop for the first 90 minutes, or add a remote before splitting. Do not run two orchestrators against one checkout.

Full commands: [MORNING_COMMANDS.md](MORNING_COMMANDS.md).

## The three things that must not slip

1. **★ VT-023 — the 21 FTE metric card.** It is the pitch hook: `100 alerts · 14ms · 82 auto-cleared · 0 LLM tokens · 21.1 FTEs saved (€1.16M/yr)`.
2. **★ VT-003 — Gate 2 scope invariant.** It is the AWS Q&A answer: `HopCount <= 2 AND Hop2TargetIco == Hop1EnvelopeIco`.
3. **★ VT-027 + VT-014 — QR signing + cassette fallback.** They are demo survivability. The brief called the cassette VT-028; in this repo the mobile task is VT-028 and the cassette is VT-014. Protect the cassette.

The cut list also protects ★ VT-030 (E2E) and ★ VT-031 (remediation verification). Those are the proof that the demo works.

## The H+14 cut list

★ = do not cut. This is the active list; it is reconciled to [BACKLOG.md](BACKLOG.md).

**2+ hours behind at H+14**
- Cut: VT-026 (PDF bounding-box overlay), VT-024 (regulatory clock badge — Q&A-only, not on the demo screen).
- Keep: ★ VT-003, ★ VT-013, ★ VT-014, ★ VT-023, ★ VT-027, ★ VT-030, ★ VT-031.
- Note: cutting VT-024 does not remove the three-clock Q&A answer.

**4+ hours behind at H+14**
- Cut: the mobile signing ceremony (VT-028); use server-side signing with the `SERVER-SIDE ENCLAVE (Simulated Mobile Pairing)` badge.
- Keep: ★ VT-003, ★ VT-013, ★ VT-014, ★ VT-023, ★ VT-030, ★ VT-031.
- Note: VT-027 becomes optional if the mobile ceremony is cut. Do not cut VT-014; the cassette is the demo survivability path.

**6+ hours behind at H+14**
- Cut: the full cockpit; pitch from the PDF proof receipt plus a 2-minute video walkthrough.
- Keep: ★ VT-023 (the 21 FTE metric must appear in the video and PDF), ★ VT-003, ★ VT-030, ★ VT-031.
- Note: the video must still show the verifier override; Gate 3 and the pipeline must be green even without the cockpit.

**No renegotiation.** Whichever threshold is hit at H+14 executes immediately.

## The five Q&A answers memorized

**1. Article 56(1) D+1 vs 15 days**
> "There are three clocks in the PSR. Pre-execution suspension under Article 83 means the money hasn't moved — no refund is owed. If it has moved and the transaction is unauthorized, Article 56(1) gives D+1. If it's an impersonation dispute, Article 59 gives 15 business days. VeriTriage displays which clock applies per case."

**2. Gate 2 / Step Functions**
> "Gate 2 is not a routing heuristic — it's a tool-scope invariant. Bedrock decides which tool to call; Gate 2 enforces that the call stayed within the envelope's declared scope and never exceeds two hops. Step Functions cannot make the semantic decision; it can only enforce the invariant, which is exactly what we do."

**3. The 25-second rubber stamp**
> "A 25-second signature is a demo artifact. In production, the officer spends 120–180 seconds reading the pointer-highlighted evidence before signing. At 305 escalated cases per day, that's 3 analysts — down from 23.5 manual reviewers, a 21-FTE reduction. The signature is the legal record; the review time is the cognitive gate."

**4. Mastercard**
> "We are not a card product. The Mastercard rail is V1 for the 18% of cases where the supplier refuses split settlement. What we built is the proof layer above any rail."

**5. Who verifies the verifier?**
> "The verifier is deterministic C# with a public test suite. It doesn't guess; it recomputes. A FINREG auditor can read the proof steps and re-run the arithmetic on paper."

Full drill: [.agents/QA_WAR_ROOM.md](.agents/QA_WAR_ROOM.md).

## The two fragile moments to rehearse

1. **OCR confidence drop — 10 times.** All five gates green, toggle to 94.2%, Gate 3 flips red, decision becomes ESCALATE.
2. **QR signing — 10 times.** Phone buzz, FaceID, P-256 signature, green check, audit `valid: true`.

Rehearse both until they are boring. Also rehearse the F9 failover 5 times.

## Narrative status

**One fix pending.** `pitch/opening.md:15` shows `PSR Art. 59` on the phone for the B2B hero. The hero's clock is `PRE_EXECUTION_FREEZE` under Article 83, with AI Act Article 14 human oversight. The exact one-line replacement is in [NARRATIVE_FIX.md](NARRATIVE_FIX.md). Do not apply it without human approval, and do not add a sixth framing.

## What "done" looks like at H+24

- `dotnet test` green, zero skipped.
- `npm test` and `npm run build` green.
- Demo runs 3× without failure.
- VT-031 remediation verification and `EXTENDED_FINDINGS.md` complete.
- 4 hours of sleep. Non-negotiable.

## Start now

Run [MORNING_COMMANDS.md](MORNING_COMMANDS.md), Person A section, **A0 (package approval), then A1 (`dotnet --version`)**. Person B starts B0 then B1. The first 90 minutes are mechanical; do not improvise.
