# VeriTriage — Agent Context

## Agent Runtime
- Orchestrator: `.agents/orchestrator.md`
- State machine: `.agents/state-machine.md`
- Sub-agents: `.agents/analyzer.md`, `.agents/implementer.md`, `.agents/evaluator.md`, `.agents/reviewer.md`
- Remediation agent: `.agents/remediation.md`
- Q&A war room: `.agents/QA_WAR_ROOM.md`
- Skills: `.skills/ponytail/`, `.skills/test-first/`, `.skills/no-slop-verifier/`, `.skills/scope-guard/`, `.skills/signalr-checklist/`
- Human handoff: `.agents/human-handoff.md`
- Backlog: `BACKLOG.md`
- Remediation plan: `REMEDIATION.md`
- Product bootstrap: `BOOTSTRAP.md`
- Do not modify `contracts/` or `fixtures/` without approval.
- Do not add packages without approval.
- Every task ends with a green test.
- No new features after H+20.

## Status

This repository started as the **agent environment**. B-000, the backend verifier/rules slice, the FINREG CSV/4-eyes endpoints, and the Next.js cockpit are implemented and green. The mobile app, real ECDSA signing, persistent audit storage, and live Bedrock call are not built. A visible 5-event demo audit chain is built; Bedrock is cached because real probes fail with an SSL error. See `BUILD_LOG.md` and `FINAL_REPORT.md` for the exact state.

FROZEN for the 30-hour build. If it is not in this file or in `contracts/`, it does not go on stage.

`blueprint.md` is the full technical blueprint. `project.md` is the product narrative. When this file and a narrative disagree, this file and `contracts/` win.

## Product

VeriTriage is the proof layer that makes agentic fraud triage deployable in a regulated bank.

**The agent proposes. The verifier proves. The human signs.**

A PSP facing PSR Article 83 monitoring duties and Article 55/56 burden-of-proof deadlines receives a fraud alert. An Amazon Bedrock agent gathers entity, statutory, transaction, and document evidence. A deterministic C# verifier recomputes every number and checks every claim. A human signs the resulting proof receipt with ECDSA P-256 on a phone. Every step is hash-chained.

**What we are not:** a PSP, a payment initiator, a card issuer, a VoP provider, or a real-time authorization system. We never claim PSR Article 59 coverage for B2B transactions.

## Post-Remediation Positioning

The pre-remediation €48,000 hook is deleted. It is not in any UI, pitch, or Q&A answer.

**Opening line (memorized):**
> "Under PSR Article 83, a PSP handles thousands of alerts per day. VeriTriage clears 82% deterministically and saves 21.1 full-time analysts per 5,000 daily alerts — while producing ČNB-ready dossiers for the 4% that escalate."

**The economics:**
- 5,000 alerts/day; 82% auto-cleared; 14% step-up; 4% direct escalation.
- 200 direct escalations + 105 step-up spillover = 305 escalated cases/day.
- 180-second cognitive review per escalated case; 15.25 hours/day; 2.35 FTE.
- Manual baseline: 23.46 FTE. Savings: 21.1 FTE × €55k = €1.16M/year.
- The 25-second signature is a demo artifact. Never use it as the review-time claim.

**The three clocks:**
- `PRE_EXECUTION_FREEZE` — PSR Art. 83 pre-settlement freeze (funds held); no refund owed.
- `UNAUTHORIZED_REFUND` — PSR Art. 56(1) D+1 refund clock.
- `IMPERSONATION_DISPUTE` — PSR Art. 59 / 101 15-day evidence burden.

**Deployment:**
> "VeriTriage deploys as a containerized service alongside the bank's existing case management system. It consumes alerts via webhook or batch export from Actimize, NICE, or Fiserv, and writes the proof receipt back to the case management audit log. No changes to the core ledger. No PISP licence. No funds held."

**Honest ceiling:** 68–72% post-remediation; with the Track 5 AML partial pivot, 72–78%, ceiling 78%. The difference is rehearsal discipline, not more code.

## Regulatory Regimes (Two, Not One)

VeriTriage serves two regulatory regimes with one architecture:

PRIMARY HOOK (payment suspension): PSR Article 83 requires transaction monitoring; Articles 55/56 reverse the burden of proof. When a PSP suspends a payment or refuses a refund, it has a bounded window to produce a defensible dossier.

SECOND HOOK (merchant risk): Czech AML Act No. 253/2008 Sb. § 20 requires the obliged entity to postpone suspicious transactions and log the statutory grounds. § 16 requires 10-year retention and reconstruction of decision logic. § 22 designates the AML contact person whose signature is the legal record.

The same verifier serves both: evidence gathering, deterministic proof, human signature. One architecture, two compliance regimes.

## Track Registration

Track: Track 5 — AML (FINREG Partners Challenge)
Bonus eligibility: CZK 40,000 in FINREG legal services (conditional on 1st place)
Datasets: ČNB 400k synthetic transactions, Tapaya KYB filled forms

## Win Condition

The judge remembers the 90-second demo: the agent recommends `AUTO_CLEAR`, the OCR confidence drops, the verifier flips Gate 3 red, and the decision becomes `ESCALATE`. The verifier overrides the AI in front of the judge.

Every scope decision serves that moment. If a task does not make that moment more reliable, it is cut.

## Source of Truth

| Path | Rule |
|---|---|
| `AGENTS.md` | Canonical agent operating contract. Only humans change the frozen sections. |
| `contracts/` | Frozen; materialized 2026-10-19 with `regulatory_clock` and `CnbAmlMetadata`. Only a human may change them, after `PROPOSAL.md` and `DECISION.md`. |
| `fixtures/` | Frozen when populated. Synthetic fixtures carry `"_synthetic": true`. Currently pending human bootstrap. |
| `BACKLOG.md` | Orchestrator-owned task order. Agents may read. |
| `TASK.md` | Analyzer-owned, one active task. Working file, not committed. |
| `EVALUATION.md` | Evaluator-owned. Working file, not committed. |
| `REVIEW.md` | Reviewer-owned. Working file, not committed. |
| `REMEDIATION.md` | Bounded post-baseline delta plan. Read before any remediation change. |
| `src/`, `apps/` | Implementer-owned after `BOOTSTRAP.md`, only within the active `TASK.md`. |

`PROPOSAL.md` is the only legal way to request a contract or fixture change. Write it, stop, wait for `DECISION.md`.

The older remediation brief refers to `.agents/AGENTS.md`. The canonical path is root `AGENTS.md`; the remediation agent definition normalizes it.

## Repo Map

```
AGENTS.md                  this file
CLAUDE.md                  read AGENTS.md
README.md                  environment quickstart
BACKLOG.md                 ordered task queue
BOOTSTRAP.md               product scaffold instructions, run once
REMEDIATION.md             bounded post-baseline delta plan
.agents/                   orchestrator, four sub-agents, remediation, handoff, war room
.skills/                   five mandatory skills
contracts/domain/          frozen C# records
contracts/types/           frozen TypeScript mirror
contracts/api/             frozen OpenAPI spec
fixtures/                  demo evidence (official data in datasets/)
tests/golden/              approved snapshots (policy only until bootstrap)
src/                       backend solution; Domain/Verifier green
apps/web/                  FINREG cockpit; built
apps/mobile/               absent; real signing not built
pitch/                     opening, slide 2, throughput math
evaluation/                evaluation-input status, no fabricated report
.github/workflows/ci.yml   test + ponytail gate
```

## Environment State

- The backend is built: contracts, Domain, Verifier, Infrastructure, Api shell, and tests. `dotnet build` is green and `dotnet test` is 24/24. `npm run build` is green.
- `apps/web` is built (FINREG cockpit); `apps/mobile` is absent. Real mobile signing is not built.
- `contracts/` is materialized and frozen. The approved deltas are included.
- `fixtures/` has no committed data; official datasets are in `datasets/` (gitignored). See `DATASET_INVENTORY.md`.
- `tests/golden/` contains policy only; no golden files yet.
- `npm run build` is green; `npm test` exits 0 (zero Node tests). The Bedrock probe is real and returns `LIVE_BEDROCK_CACHED` with an SSL error.
- The post-remediation narrative and QA are pre-staged in `AGENTS.md`, `pitch/`, and `.agents/QA_WAR_ROOM.md`.
- The seven remediation changes remain partially pre-staged; the verifier/rules slice landed first.
- The Track 5 AML additions are queued as VT-033 through VT-036. The `CnbAmlMetadata` delta is materialized.

## Startup Order

1. **Human**: read `REMEDIATION.md`, `evaluation/README.md`, and `contracts/README.md`; populate `fixtures/`; approve the package set.
2. **AI agent**: read `BOOTSTRAP.md`; materialize the contracts (B-000), then create the .NET 9 solution, web shell, mobile shell, test harness, and the first red test; commit.
3. **AI agent**: prove the baseline (`dotnet test` one intended failure; `npm test` green) and launch the orchestrator.
4. **AI agent**: fold the seven remediation deltas into their owning tasks as those tasks land (mapping in `BACKLOG.md`). Start VT-033 through VT-036 at H+2. After VT-027/VT-028/VT-014/VT-023/VT-024/VT-003 are green, run VT-031, the bounded verification pass in `.agents/remediation.md`, and write `EXTENDED_FINDINGS.md`.
5. **Humans**: rehearse the two fragile moments; no new scope after H+20.

The orchestrator must not start Phase 1 against an empty product repo. If `src/PayShield.sln` is missing, run `BOOTSTRAP.md` first.

## Commands

These commands apply after `BOOTSTRAP.md` creates the product scaffold.

```bash
# Backend
dotnet test src/PayShield.sln --configuration Release

# One test
dotnet test src/PayShield.sln --filter "FullyQualifiedName~JsonPointerResolver"

# Web
cd apps/web && npm ci && npm test
cd apps/web && npm run dev

# Mobile
cd apps/mobile && npm install && npx expo start
```

Do not install packages during environment setup. The human runs package installs and records approvals in `DECISION.md`.

## Domain Contracts

The contracts are materialized in `contracts/domain/` under namespace `VeriTriage.Domain`. Required properties use `[JsonRequired]`. They include two approved additive deltas: the optional snake_case `regulatory_clock` field with a default of `PRE_EXECUTION_FREEZE`, and the optional `CnbAmlMetadata? CnbAml` field on `CaseDetail` and `AlertQueueRow`.

| Type | Purpose |
|---|---|
| `EvidenceEnvelope` | Case id, canonical evidence root, gather time. |
| `ClaimAssertion` | One agent claim, its JSON pointers, expected values, document provenance. |
| `TextractProvenance` | OCR confidence and bounding box for a document-sourced claim. |
| `BoundingBox` | Normalized 0–100 box coordinates. |
| `VerificationResult` | Valid flag, per-engine counts, proof steps, receipt hash. |
| `ProofStep` | One recomputation or constraint check. |
| `BatchTriageSummary` | 82/14/4 batch counters and showcase rows. |
| `AlertQueueRow` | One row in the analyst queue; optional `CnbAml` metadata. |
| `ServerAttestation` | Server key thumbprint and receipt signature. |
| `CaseDetail` | Full case view; includes alert, supplier, decision, approval, regulatory clock, and optional `CnbAml`. |
| `CnbAmlMetadata` | Optional ČNB/AML metadata: transaction id, client id, MCC, PEP flag, risk rating, regulatory path. |
| `PaymentSlip` | Human-readable payment instruction. |

Money is `decimal` in C#, `numeric(18,2)` in Postgres, and never `double`. Rounding is `MidpointRounding.AwayFromZero` at order level. Assert `Σ orders == gross` within 0.01.

## Verifier

A pure C# library. No I/O, no LLM, no clock, no network. Deterministic in, deterministic out.

| Gate | Check | Fail mode |
|---|---|---|
| 1 — Schema | Strict deserialize; no unknown or missing fields. | `schema` |
| 2 — Scope invariant | `HopCount <= 2` AND `Hop2TargetIco == Hop1EnvelopeIco`. | `second_hop` |
| 3 — OCR provenance | Confidence ≥ 99.0; text matches; box in `[0,100]`. | `ocr` |
| 4 — Arithmetic | Recompute every claimed number in `System.Decimal` within ±0.01. | `arithmetic` |
| 5 — Claim grounding | Every RFC 6901 pointer resolves and matches its expected value. | `grounding` |

Gate 2 is not the old signatory/IBAN heuristic. It is a tool-scope invariant. The proof step reads:
```
scope_invariant: hop_count <= 2 AND hop2.ico == hop1.ico
```

Any gate failure returns `Valid == false`, forces the decision to `ESCALATE`, and sets `OverriddenByVerifier == true`. The agent recommendation is stored but never executed.

The receipt hash is SHA-256 over the canonical `{ caseId, engines, proofSteps }` JSON. No whitespace. Lowercase hex with `sha256:` prefix.

## Rule Engine

Deterministic, versioned, pure functions. Every rule carries a `LegalRef`.

| ID | Condition | Outcome | Severity |
|---|---|---|---|
| `R-ICO-01` | IČO checksum invalid | BLOCK | 100 |
| `R-IBAN-01` | IBAN mod-97 invalid | BLOCK | 100 |
| `R-MATH-01` | `net + vat ≠ gross` | BLOCK | 100 |
| `R-SANCTIONS-01` | Sanctions hit | BLOCK | 100 |
| `R-VOP-01` | VoP `NO_MATCH` | ESCALATE | 90 |
| `R-BEC-01` | IBAN differs from last paid IBAN | ESCALATE | 90 |
| `R-VELOCITY-01` | 24h count ≥ 3× baseline | ESCALATE | 80 |
| `R-AGE-01` | Entity age < 30 days and amount > 50,000 CZK | ESCALATE | 75 |
| `R-VOP-02` | VoP `CLOSE_MATCH` and IBAN in published accounts | AUTO_CLEAR | 0 |
| `R-VERIFY-01` | Any verifier engine fails | ESCALATE | 95 |

Aggregation: any BLOCK → BLOCK; else any ESCALATE → ESCALATE; else AUTO_CLEAR. Risk score is `min(100, Σ severity)`.

## API

Base path `/api/v1`. Errors use `application/problem+json`. Auth is a hard-coded demo JWT.

`GET /health`, `GET /cases`, `GET /cases/{id}`, `POST /cases/{id}/triage`, `POST /cases/{id}/approve`, `POST /cases/{id}/reject`, `GET /cases/{id}/receipt`, `GET /cases/{id}/audit`, `GET /exposure`, `POST /devices/register`, `POST /verifier/recheck`, `POST /demo/reset`, `POST /cases/batch`.

SignalR hub: `/hubs/approvals`. Server → client: `ApprovalRequested`, `InvoiceUpdated`, `PipelineProgress`. Client → server: `JoinCompany`, `Ack`.

## Frontend and Mobile

One route, one viewport, one narrative. The cockpit shows the batch counters, queue, agent evidence, verifier gates, override banner, proof receipt, audit chain, regulatory clock badge, and demo controls.

`NEXT_PUBLIC_USE_MOCK=1` must render the full demo from fixtures. It is the offline safety net. Do not break it.

Mobile is QR scan → FaceID/P-256 sign → response QR. No network at the signing moment. The canonical payload is built manually with lexicographically sorted keys and no whitespace. The server verifies signature, nonce freshness, timestamp window, and receipt hash.

Post-remediation requirements, to be implemented only after baseline green:

- QR is a compact URI `vt://v1/{caseId}/{base64url(sha256-digest)}/{amountCzk}`, target ≤ 68 bytes, version ≤ 6.
- `F9` in the QR modal injects a pre-computed valid signature from `fixtures/pre_signed_mobile_signature.json` for demo failover.
- Bedrock `Converse` uses a 2,600ms `CancellationTokenSource`; on timeout, the cassette responds after a 400ms simulated frame delay.
- The top bar shows `100 alerts · 14ms · 82 auto-cleared · 0 LLM tokens · 21.1 FTEs saved (€1.16M/yr)`.
- The case header shows the three-state regulatory clock badge.

## Tests

Minimum gate coverage is non-negotiable:

- `Gate1_RejectsExtraField`, `Gate1_RejectsMissingField`
- `Gate2_RejectsThreeHop`, `Gate2_RejectsDifferentIcoOnHop2`
- `Gate3_RejectsLowOcrConfidence`, `Gate3_RejectsBoundingBoxOutOfRange`
- `Gate4_RejectsArithmeticMismatch`
- `Gate5_RejectsUngroundedClaim`, `Gate5_RejectsValueMismatch`
- `HeroCase_PassesAllFiveGates`
- `Seeder_Produces82_14_4`
- `Receipt_MatchesGoldenSnapshot`
- `Signature_VerifiesForValidPayload`, `Signature_FailsForTamperedPayload`
- `Audit_TamperedEventBreaksChain`
- `E2E_HeroCase_EndToEnd`

Remediation acceptance tests:

- `Qr_CompactUriUnder68Bytes`
- `F9_InjectsPreSignedSignature`
- `Cassette_TriggersAt2600ms`

A test that does not fail for the intended reason is not a red test. A skipped test is not proof. A golden file is never updated to match buggy output.

## Agent Rules

1. The orchestrator does not write code. The analyzer does not write code. The implementer writes only the active task. The evaluator does not edit. The reviewer does not fix.
2. Every task starts with a failing test committed before implementation. The orchestrator transcribes the test from `TASK.md`; the implementer never authors or edits the test.
3. The analyzer proposes at most three files. If a task needs more, it is split.
4. The implementer touches only files listed in `TASK.md`, writes no comments longer than one line, adds no packages, and writes no abstraction with fewer than three call sites.
5. The evaluator re-runs the suite in a clean worktree. It never trusts the implementer's transcript. "It compiles" is not "it passes."
6. The reviewer starts from the diff, not the narrative. Any frozen-file change, package addition, comment over one line, scope creep, or test weakening is an automatic `REJECT`.
7. The circuit breaker is absolute: 3 evaluation failures or 2 review failures on one task → `BLOCKED.md` and stop.
8. No new features after H+20. Bug fixes only.
9. No package additions without a human `DECISION.md`.
10. No contract or fixture edits without a human `DECISION.md`, except the one-time B-000 materialization from `blueprint.md`.
11. Every commit message includes the task ID and the test name. The worktree is clean after every commit.
12. If a file's content is uncertain, write `PROPOSAL.md` and stop. Do not guess.
13. Do not start Phase 1 before `BOOTSTRAP.md` is complete. Do not apply `REMEDIATION.md` before the baseline is green and the plan is written.
14. The remediation agent is bounded to the seven changes. It does not add a sixth gate, a new tool, a Mastercard UI, or a package.
15. All demo data must be synthetic or from the official hackathon datasets (ČNB, Tapaya). No real personal data, no real payment information. See `COMPLIANCE.md`.

## Definition of Done

A task is done only when all of the following are true:

- The red test is committed before implementation.
- The full `dotnet test` suite is green in a clean worktree.
- `npm test` is green for web tasks.
- `EVALUATION.md` says `PASS` with exact command output.
- `REVIEW.md` says `APPROVE` with no open findings.
- No `contracts/`, `fixtures/`, package, or `.agents/` drift.
- `BACKLOG.md` is updated and the task is committed.
- `git status --porcelain` is empty.

## Time Gates

The original H+2 "environment ready" checkpoint is superseded: the environment is pre-H+0, the product scaffold is H+0–H+2, and the first red test is H+2.

| Time | Gate |
|---|---|
| Pre-H+0 | Environment installed; contract plan frozen; seven-change and Track 5 plans pre-staged. |
| H+0–H+2 | Product scaffold from `BOOTSTRAP.md`; baseline commands; VT-001 red test. |
| H+2–H+4 | `HeroCase_PassesAllFiveGates` green. |
| H+2–H+17 | Build features; fold the seven remediation deltas into VT-003, VT-014, VT-023, VT-024, VT-027, VT-028, and start VT-033 through VT-036. |
| H+14 | Execute the protected cut list below. No renegotiation. |
| H+17–H+19 | VT-031 remediation verification pass and `EXTENDED_FINDINGS.md`; pitch/Q&A locked. |
| H+18 | Pitch deck frozen. |
| H+19–H+20 | Final bug fixes and rehearsal. No new scope. |
| H+20 | Feature freeze. Bug fixes only. |
| H+24–H+28 | Sleep 4 hours. Non-negotiable. |
| H+28–H+30 | Rehearse: opening 30s ×15, OCR drop ×10, QR sign ×10, F9 failover ×5. |

## H+14 Cut List (Protected)

★ = do not cut. These IDs are reconciled to `BACKLOG.md`; the Night Ops and Pivot briefs' IDs were stale.

**2+ hours behind at H+14**
- Cut: VT-026 (PDF bounding-box overlay), VT-024 (regulatory clock badge — Q&A-only, not on the demo screen).
- Keep: ★ VT-003 (Gate 2 scope invariant), ★ VT-013 (Bedrock two-hop), ★ VT-014 (cassette fallback), ★ VT-023 (21 FTE metric card), ★ VT-027 (QR signing), ★ VT-030 (E2E), ★ VT-031 (remediation verification), ★ VT-033 (ČNB parser), ★ VT-034 (Tapaya extraction), ★ VT-035 (Apify offline fixture).
- Note: cutting VT-024 does not remove the three-clock Q&A answer.

**4+ hours behind at H+14**
- Cut: the mobile signing ceremony per the original plan (VT-028); use server-side signing with the `SERVER-SIDE ENCLAVE (Simulated Mobile Pairing)` badge.
- Keep: ★ VT-003, ★ VT-013, ★ VT-014, ★ VT-023, ★ VT-030, ★ VT-031, ★ VT-033, ★ VT-034.
- Note: VT-027 becomes optional if the mobile ceremony is cut. Do not cut VT-014; the cassette is the demo survivability path. VT-035 may be folded into VT-034 if the Apify fixture is not on screen.

**6+ hours behind at H+14**
- Cut: the full cockpit; pitch from the PDF proof receipt plus a 2-minute video walkthrough.
- Keep: ★ VT-023 (the 21 FTE metric card must appear in the video and the PDF), ★ VT-003, ★ VT-030, ★ VT-031, ★ VT-033 (the ČNB parser must work for the video).
- Note: the video must still show the verifier override; Gate 3 and the pipeline must be green even without the cockpit. Track 5 registration is already done, so the CZK 40,000 bonus remains claimable even if the demo becomes a video.

**No renegotiation.** Whichever threshold is hit at H+14 executes immediately.

**Reconciliation:** The Night Ops and Pivot briefs listed stale task IDs. In this repo, VT-013 is Bedrock, VT-014 is cassette, VT-025 is the verifier gates/override panel, VT-026 is the PDF overlay, VT-028 is mobile, VT-030 is E2E, and VT-031 is the remediation verification pass. VT-025 is protected because cutting it would remove the override moment. This list protects the intent: the 21 FTE hook, Gate 2, QR signing, cassette, the E2E proof, and the new AML tasks VT-033/VT-034/VT-035.

## Honesty Rules

- Synthetic fixtures carry `"_synthetic": true` and are labeled in the UI.
- Textract output is pre-computed and labeled.
- VoP is fixture-only and labeled.
- Server custody is labeled `LOCAL_HSM_SIMULATOR (Prod Target: AWS KMS FIPS 140-3)`.
- Cassette fallback is labeled `LIVE_BEDROCK_CACHED`.
- The audit chain is recomputed, never faked.
- The agent never authorizes a payment. The human signs.
- The 180-second cognitive review is the production claim; the 25-second signature is a demo artifact.

## Q&A War Room

The full drill is `.agents/QA_WAR_ROOM.md`. Memorize these three answers.

**Trap 1 — Article 56(1) D+1 vs 15 days:**
> "There are three clocks in the PSR. Pre-execution suspension under Article 83 means the money hasn't moved — no refund is owed. If it has moved and the transaction is unauthorized, Article 56(1) gives D+1. If it's an impersonation dispute, Article 59 gives 15 business days. VeriTriage displays which clock applies per case."

**Trap 2 — Gate 2 / Step Functions:**
> "Gate 2 is not a routing heuristic — it's a tool-scope invariant. Bedrock decides which tool to call; Gate 2 enforces that the call stayed within the envelope's declared scope and never exceeds two hops. Step Functions cannot make the semantic decision; it can only enforce the invariant, which is exactly what we do."

**Trap 3 — 25-second rubber stamp:**
> "A 25-second signature is a demo artifact. In production, the officer spends 120–180 seconds reading the pointer-highlighted evidence before signing. At 305 escalated cases per day, that's 3 analysts — down from 23.5 manual reviewers, a 21-FTE reduction. The signature is the legal record; the review time is the cognitive gate."

**Mastercard, no UI:**
> "We are not a card product. The Mastercard rail is V1 for the 18% of cases where the supplier refuses split settlement. What we built is the proof layer above any rail."

**Track 5 AML:** four AML answers and the VC judge answer are in `.agents/QA_WAR_ROOM.md`. The § 109 / CFO answer is Q&A-only; it must not appear in the demo, slides, or opening.

**NEVER SAY:** `€48,000`, `540,000 CZK`, `PSD3 makes you liable`, `25-second sign`, `100% of liability`, `VCN cures VAT`.

## Post-Remediation Product Deltas

The seven changes are specified in `REMEDIATION.md`. The documentation, Q&A, math, and contract delta plan are pre-staged here. The contract files themselves are created in B-000, and the code/UI deltas remain for the AI agent after baseline green.

| # | Change | Owning task | Environment status |
|---|---|---|---|
| 1 | Replace write-off hook with 21 FTE narrative | VT-023 | Narrative pre-staged; metric UI pending. |
| 2 | Reframe Gate 2 as scope invariant | VT-003 | Spec/Q&A pre-staged; code/tests pending. |
| 3 | Three-state regulatory clock badge | VT-024 | Contract delta documented; applied in B-000; component pending. |
| 4 | Q&A war room with three traps | docs | Pre-staged in `.agents/QA_WAR_ROOM.md`. |
| 5 | Deployment story | docs | Pre-staged here and in `pitch/slide_2.md`. |
| 6 | 180-second throughput math | VT-023 | Pre-staged in `pitch/throughput_math.md`; UI metric pending. |
| 7 | Compact QR + F9 + 2.6s cassette | VT-014, VT-027, VT-028 | Requirements documented; code pending. |
| — | Verification pass | VT-031 | `REMEDIATION.md` acceptance checklist. |

## Current Environment State

- Contracts, Domain, Verifier, Infrastructure, Api shell, and tests are built.
- `dotnet build` is green; `dotnet test` is 24 passed, 0 failed, 0 skipped.
- `apps/web` is built; `apps/mobile` is absent. The FINREG CSV and 4-eyes endpoints are live.
- Bedrock invoke is blocked by a TLS/credential failure; the status probe returns `LIVE_BEDROCK_CACHED`. See `AWS_BLOCKED.md`.
- Official datasets are in `datasets/` (gitignored); see `DATASET_INVENTORY.md`. No fixture data is committed.
- The next action is not `BOOTSTRAP.md`; B-000/B-001/B-002 are complete. See `BUILD_LOG.md` and `FINAL_REPORT.md`.

## Launch

After the human confirms the product scaffold and baseline:

```
Read .agents/orchestrator.md and begin Phase 1.
```

Before that, run `BOOTSTRAP.md`.
