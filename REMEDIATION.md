# Remediation Plan — Bounded Post-Baseline Delta

Status: **environment pre-staged; product code changes folded into owning tasks; verification pending**.

This file is the reconciled delta plan for the seven changes in the human-provided Remediation Architect brief. It is not a license to add scope. It is a checklist with acceptance tests.

The environment bootstrap applied the documentation, Q&A, math, and the contract delta plan. It did not materialize the contract files, build the product, run tests, or apply UI/infra code changes. B-000 materializes the contracts and applies the approved delta; the UI/infra changes are folded into the owning tasks in `BACKLOG.md` and verified by VT-031 after the product baseline is green.

## Preconditions

- `BOOTSTRAP.md` is complete.
- The product scaffold exists: `src/PayShield.sln`, `apps/web`, `apps/mobile`, `tests/PayShield.Tests`.
- **Contracts are materialized and frozen**: B-000 is complete and `contracts/README.md` says `Frozen`.
- **Remediation baseline is green**: `dotnet test` passes, `npm test` passes, `npm run build` passes, `git status --porcelain` is empty. This is not the bootstrap state (which intentionally has one failing test). It is the state after the seven owning tasks are green, targeted at H+17.
- `REMEDIATION_PLAN.md` has been written, listing every file the remediation agent will touch.
- `fixtures/` is populated. `tests/golden/` contains the approved hero snapshot.
- `evaluation/EVAL_REPORT.md` and `evaluation/HONEST_AMENDMENTS.md` are optional. If absent, this file is authoritative. If present, reconcile them; conflicts require `PROPOSAL.md` and `DECISION.md`.

If baseline is red, write `BLOCKED.md` and stop. Do not "fix it while remediating."

## Status

| # | Change | Owning task | Status | Product files still pending |
|---|---|---|---|---|
| 1 | Replace write-off hook with 21 FTE narrative | VT-023 | `PRE-STAGED` (docs) / `PENDING` (UI) | `apps/web/components/BatchTriageBar.tsx` |
| 2 | Reframe Gate 2 as scope invariant | VT-003 | `PRE-STAGED` (spec/Q&A) / `PENDING` (code/tests) | `src/PayShield.Verifier/Gates/Gate2_SecondHopPolicy.cs`, `tests/PayShield.Tests/Gate2_SecondHopPolicyTests.cs` |
| 3 | Three-state regulatory clock badge | VT-024 | `DOCUMENTED` (contract delta; B-000 applies) / `PENDING` (UI) | `apps/web/components/RegulatoryClockBadge.tsx`, `apps/web/components/CaseDetailPane.tsx` |
| 4 | Q&A war room with three traps | docs | `PRE-STAGED` | none |
| 5 | Deployment story | docs | `PRE-STAGED` | none |
| 6 | 180-second throughput math | VT-023 | `PRE-STAGED` (math) / `PENDING` (UI) | `apps/web/components/BatchTriageBar.tsx` |
| 7 | Compact QR + F9 + 2.6s cassette | VT-014, VT-027, VT-028 | `PENDING` | `apps/mobile/lib/qr.ts`, `apps/web/components/QrSigningModal.tsx`, `src/PayShield.Infrastructure/Bedrock/CassetteInterceptor.cs` |
| — | Verification pass | VT-031 | `PENDING` | `REMEDIATION_PLAN.md`, `EXTENDED_FINDINGS.md` |

## Change 1 — Replace the €48,000 Hook with the 21 FTE Narrative

**Files**

- `apps/web/components/BatchTriageBar.tsx`
- `AGENTS.md` (narrative pre-staged)
- `pitch/opening.md` (pre-staged)

**Change**

- Remove the string `"€48,000 write-off"` from all UI and pitch materials.
- Add a top-bar metric card:
  `100 alerts · 14ms · 82 auto-cleared · 0 LLM tokens · 21.1 FTEs saved (€1.16M/yr)`
- Opening line:
  > "Under PSR Article 83, a PSP handles thousands of alerts per day. VeriTriage clears 82% deterministically and saves 21.1 full-time analysts per 5,000 daily alerts — while producing ČNB-ready dossiers for the 4% that escalate."

**Acceptance**

- `grep -r "48,000" apps/web/ pitch/` returns zero results.
- The only allowed occurrences in the repo are the NEVER SAY list and the deletion note.
- The metric card renders at 1920×1080 without overflow.
- A UI test asserts the metric card text and the absence of the old hook.

**Build time:** 20 minutes.

**Reconciliation:** The original acceptance said `grep -r "48,000" .` must be zero, but Change 4 requires the NEVER SAY list to contain the phrase. The acceptance above preserves the intent without making the QA list illegal.

## Change 2 — Reframe Gate 2 as a Scope Invariant

**Files**

- `src/PayShield.Verifier/Gates/Gate2_SecondHopPolicy.cs`
- `tests/PayShield.Tests/Gate2_SecondHopPolicyTests.cs`
  (The brief says `tests/Gate2_SecondHopPolicyTests.cs`; the project path is normalized.)

**Change**

- Replace the boolean check (`signatory_name != null || iban_country != "CZ"`) with:
  ```
  HopCount <= 2 AND Hop2TargetIco == Hop1EnvelopeIco
  ```
- Tests: `Gate2_RejectsThreeHop`, `Gate2_RejectsDifferentIcoOnHop2`.
- Proof step:
  ```
  scope_invariant: hop_count <= 2 AND hop2.ico == hop1.ico
  ```
- Q&A answer committed to `AGENTS.md` (pre-staged):
  > "Gate 2 is not a routing heuristic — it's a tool-scope invariant. Bedrock decides which tool to call; Gate 2 enforces that the call stayed within the envelope's declared scope and never exceeds two hops. Step Functions cannot make the semantic decision; it can only enforce the invariant, which is exactly what we do."

**Acceptance**

- `dotnet test --filter "FullyQualifiedName~Gate2"` is green.
- Both new tests exist and the old `Gate2_RejectsUnjustifiedSecondHop` is removed or renamed.
- The proof step string appears verbatim.
- `AGENTS.md` contains the Q&A answer.

**Build time:** 30 minutes.

## Change 3 — Split the Regulatory Clock Badge into Three States

**Files**

- `apps/web/components/RegulatoryClockBadge.tsx` (new)
- `apps/web/components/CaseDetailPane.tsx`
- `contracts/domain/CaseDetail.cs` (created in B-000; approved delta applied there)
- `contracts/types/api.d.ts` (created in B-000; approved delta applied there)
- `contracts/api/openapi.yaml` (created in B-000; approved delta applied there)
- `AGENTS.md` (Q&A pre-staged)

**Change**

Three states:

| State | Badge | Color |
|---|---|---|
| `PRE_EXECUTION_FREEZE` | `PSR Art. 83 — Pre-settlement freeze (funds held)` | `--warn` |
| `UNAUTHORIZED_REFUND` | `PSR Art. 56(1) — D+1 refund clock` | `--danger` |
| `IMPERSONATION_DISPUTE` | `PSR Art. 59 / 101 — 15-day evidence burden` | `--accent-2` |

- Render in the case detail header.
- Bind to `case.regulatory_clock` (snake_case), optional, default `PRE_EXECUTION_FREEZE`.
- Q&A answer pre-staged in `AGENTS.md`:
  > "There are three clocks in the PSR. Pre-execution suspension under Article 83 means the money hasn't moved — no refund is owed. If it has moved and the transaction is unauthorized, Article 56(1) gives D+1. If it's an impersonation dispute, Article 59 gives 15 business days. VeriTriage displays which clock applies per case."

**Acceptance**

- All three states render with the correct badge text and color token.
- Missing `regulatory_clock` defaults to `PRE_EXECUTION_FREEZE` without a runtime error.
- A component test covers all three states and the default.
- The contract field is optional on both C# and TS sides and uses snake_case on the wire.
- `npm run build` passes.

**Build time:** 25 minutes.

**Contract note:** This is the only approved `contracts/domain` change. The environment bootstrap documented it; B-000 applies it when materializing the files. Do not add another field.

## Change 4 — Q&A War Room with the Three Traps

**Files**

- `.agents/QA_WAR_ROOM.md` (pre-staged)

**Change**

- Add the three traps and answers.
- Add the NEVER SAY list: `€48,000`, `540,000 CZK`, `PSD3 makes you liable`, `25-second sign`, `100% of liability`, `VCN cures VAT`.
- Add the Mastercard answer under "Mastercard" without adding UI.
- Add the ≤3-sentence rule and one-voice-per-domain rule.

**Acceptance**

- `.agents/QA_WAR_ROOM.md` exists and contains all three traps plus the NEVER SAY list.
- The answers match `AGENTS.md` verbatim.
- The Mastercard answer is present and no UI change is made.

**Build time:** 15 minutes.

## Change 5 — Add the Deployment Story to the Pitch

**Files**

- `AGENTS.md` (pre-staged)
- `pitch/slide_2.md` (pre-staged)

**Change**

Paragraph:
> "VeriTriage deploys as a containerized service alongside the bank's existing case management system. It consumes alerts via webhook or batch export from Actimize, NICE, or Fiserv, and writes the proof receipt back to the case management audit log. No changes to the core ledger. No PISP licence. No funds held."

Slide line:
> "Deployment: sidecar to case management. Consumes alerts via webhook. Writes receipts to audit log. Zero ledger changes."

**Acceptance**

- Both texts are present and committed.
- No deck rewrite beyond this slide line.

**Build time:** 15 minutes.

## Change 6 — Update Throughput Math to 180-Second Cognitive Review

**Files**

- `pitch/throughput_math.md` (pre-staged)
- `apps/web/components/BatchTriageBar.tsx`
- `AGENTS.md` (pre-staged)

**Change**

Replace any `25-second` or `25s` metric-card reference with `180-second cognitive review` and the following math:

```
5,000 alerts/day
× 82% auto-cleared      = 4,100 alerts, 0 human seconds
× 14% step-up           =   700 alerts, 85% self-service, 105 spillover
× 4%  direct escalation =   200 alerts
+ spillover             =   305 escalated cases
× 180s cognitive review = 15.25 hours/day
÷ 6.5 productive hours  = 2.35 FTEs
Manual baseline         = 23.46 FTEs (305 × 30 min ÷ 6.5h)
Savings                 = 21.1 FTEs × €55k = €1.16M/year
```

Display `21.1 FTEs saved · €1.16M/yr` in the metric card.

**Acceptance**

- The math is committed and adds up to 21.1 FTE / €1.16M.
- `grep -rE "25-second|25s" apps/web/ pitch/` returns zero results in the metric card and pitch. The phrase `25-second signature is a demo artifact` is allowed only in the Q&A/NEVER SAY context.
- The metric card renders the new values.

**Build time:** 15 minutes.

**Reconciliation:** The original acceptance was zero `25s` everywhere, but the Q&A must explain that the 25-second signature is a demo artifact. The acceptance above allows the explanatory sentence but forbids it as a performance claim.

## Change 7 — Compact QR URI + F9 Failover + Cassette Timeout

**Files**

- `apps/mobile/lib/qr.ts`
- `apps/web/components/QrSigningModal.tsx`
- `src/PayShield.Infrastructure/Bedrock/CassetteInterceptor.cs`
- `fixtures/pre_signed_mobile_signature.json` (human/rehearsal)

**Change**

- QR URI: `vt://v1/{caseId}/{base64url(sha256-digest)}/{amountCzk}`. Target ≤ 68 bytes, QR version ≤ 6 (low density).
- Global `F9` handler in the QR modal injects a pre-computed valid signature from the rehearsal fixture. The signature must pass server verification.
- Bedrock `Converse` calls use `CancellationTokenSource(TimeSpan.FromMilliseconds(2600))`. On timeout, the cassette returns after a 400ms simulated frame delay.
- Tests: `Qr_CompactUriUnder68Bytes`, `F9_InjectsPreSignedSignature`, `Cassette_TriggersAt2600ms`.

**Acceptance**

- QR version is ≤ 6 and the URI is ≤ 68 bytes for the hero payload.
- F9 injects a signature that passes server verification.
- Cassette triggers within 2.6s under a simulated network delay.
- Mobile build passes and five rehearsal passes complete.
- The pre-signed fixture is produced during rehearsal; it is not fabricated.

**Build time:** 1 hour 15 minutes.

## Out of Scope

Do **not** do any of these:

1. No Mastercard MCC label or virtual card UI. The answer is in `.agents/QA_WAR_ROOM.md`; no product change.
2. No `contracts/domain/*.cs` change except the optional `regulatory_clock` applied during B-000.
3. No change to `fixtures/textract_invoice.json` or `fixtures/invoice_hero.png`. If the Czech prose change is needed, write `PROPOSAL.md` and stop.
4. No new NuGet or npm package.
5. No verifier pipeline refactor. Only Gate 2 and the regulatory clock touch existing behavior.
6. No sixth verifier gate, no new evidence tool, no new endpoint.
7. No pitch-deck rewrite. Only the specific lines and slides named in Changes 1, 3, 5, and 6.
8. No new test beyond the acceptance tests. The suite is not an exploration space.
9. No golden-file change. Write `PROPOSAL.md` and stop.
10. No feature work after H+20.

## Execution Order

At VT-031 this is the verification order. The owning tasks implement the deltas; VT-031 proves the acceptances. If a delta is missing, return it to the owning task or apply a bounded fix only with a human `DECISION.md`.

1. Read `AGENTS.md`, `.agents/state-machine.md`, `REMEDIATION.md`, `BACKLOG.md`, `contracts/`, and `tests/golden/`.
2. Write `REMEDIATION_PLAN.md` listing every file and why. Do not proceed without it.
3. Baseline: `dotnet test`, `npm test`, `npm run build` must be green. If red, `BLOCKED.md` and stop.
4. Change 4 (QA war room). No code risk.
5. Change 5 (deployment story). No code risk.
6. Change 1 (21 FTE hook). Run `npm run build`.
7. Change 6 (throughput math). Verify the numbers.
8. Change 2 (Gate 2). Run `dotnet test`.
9. Change 3 (regulatory clock). Run `npm run build`.
10. Change 7 (QR/F9/cassette). Run the mobile build and five rehearsal passes.
11. Final verification: full suite, `npm run build`, three 90-second rehearsals under 88 seconds.
12. Write `EXTENDED_FINDINGS.md` and stop.

After each change: run the relevant test, commit with the change number, update `REMEDIATION_PLAN.md`, and verify `git status` is clean.

## Hard Rules

- Do not proceed to the next change if the current acceptance is not met.
- Do not touch a file not listed for that change. If required, `PROPOSAL.md` and stop.
- No comments longer than one line. No XML doc comments. No docstrings.
- No `npm install` and no `dotnet add package`. Only the human installs packages.
- Do not run the demo more than five times in a row.
- Do not touch `tests/golden/`.
- Every commit ends with a green test.
- If a change takes more than 1.5× its estimate, stop and write `BLOCKED.md`.
- The post-remediation estimate is 68–72%, not 81%. Do not add scope to chase the difference.

## Extended Findings Phase

After all seven changes are green and the demo rehearses cleanly, write `EXTENDED_FINDINGS.md` answering:

1. What does the demo not show that the pitch claims? For each claim, add a UI-only moment or soften the claim.
2. What are the top three stage fragilities, each with a 15-minute mitigation not already in the QA war room?
3. What is the one Q&A question the team is most likely to fumble? Question + answer; add to QA war room.
4. What would a Mastercard judge say? If negative, add the concession line; no UI.
5. What would a Deloitte tax partner ask about the proof receipt format? If a format change is needed, `PROPOSAL.md`.
6. Is the narrative coherent across opening, deployment, Q&A, and runbook? If not, propose the one-sentence rewrite.

Do not apply `EXTENDED_FINDINGS.md` changes without human approval. It is a proposal, not a directive.

## Output

When the seven changes are applied and green:

```
REMEDIATION COMPLETE.
- Changes applied: 1, 2, 3, 4, 5, 6, 7
- Tests green: dotnet test = PASS, npm test = PASS
- Demo rehearsed: 3/3 under 88 seconds
- Baseline win probability: 55–60%
- Post-remediation estimate: 68–72% (NOT 81%)
- Extended findings: see EXTENDED_FINDINGS.md
- Recommendation: rehearse the OCR drop and QR sign 10 more times each. Do not add scope.
```

Environment-only status: Changes 4 and 5, the Change 1 narrative, the Change 2 spec, the Change 3 contract-delta plan/Q&A, and the Change 6 math are pre-staged. B-000 materializes the contract files and applies the Change 3 delta. The code/UI changes are folded into VT-003, VT-014, VT-023, VT-024, VT-027, and VT-028. VT-031 is the bounded verification pass. Nothing in this file authorizes a new subsystem, a new package, or a new gate.
