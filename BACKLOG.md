# VeriTriage Backlog

Orchestrator-owned. One active task per workstream. No two active tasks may touch the same file.

Status: `TODO` = not started. `RED` = failing test committed. `DONE` = committed and green. `BLOCKED` = human decision required. `CUT` = removed by the H+14 cut list.

## Phase 0 — Product Bootstrap (before VT-001)

These tasks create structure, not features. They are specified in `BOOTSTRAP.md`. The orchestrator does not start until all are `DONE`.

| ID | Workstream | Task | Files | Acceptance | Status |
|---|---|---|---|---|---|
| B-000 | contracts | Materialize frozen contracts | `contracts/domain/*.cs`, `contracts/types/api.d.ts`, `contracts/api/openapi.yaml` | Files match `blueprint.md` plus the approved `regulatory_clock` delta; `contracts/README.md` says `Frozen`; committed separately | TODO |
| B-001 | infra | .NET 9 solution and four project shells | `src/PayShield.sln`, `src/PayShield.*/*.csproj` | `dotnet build` passes; contracts linked into Domain | TODO |
| B-002 | verifier | Test harness and VT-001 red test | `tests/PayShield.Tests/PayShield.Tests.csproj`, `tests/PayShield.Tests/JsonPointerResolverTests.cs`, `src/PayShield.Verifier/JsonPointerResolver.cs` | `dotnet test` has exactly one failing test | TODO |
| B-003 | web | Next.js 15 shell | `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `app/*` | `npm run build` passes; `npm test` exits 0 | TODO |
| B-004 | mobile | Expo 53 shell | `apps/mobile/package.json`, `app.json`, `app/*` | Expo config parses; no signing logic | TODO |
| B-005 | fixtures | Fixture acquisition | `fixtures/*` | `fixtures/README.md` checklist complete; labels present | TODO |
| B-006 | release | Baseline proof and commit | none | Exactly one failing test; web build green; `git status` clean | TODO |

## Human Approval Queue (not agent-assignable)

| ID | Task | Why it blocks agents | Status |
|---|---|---|---|
| HUMAN-001 | Populate `fixtures/`; verify `_synthetic` labels and source notes. | VT-007 onward needs hero, batch, ARES, and Textract evidence. | TODO |
| HUMAN-002 | Approve the NuGet and npm package set. | Any new package requires `DECISION.md`. | TODO |
| HUMAN-003 | Record the H+14 cut-list decision. | No renegotiation later. | TODO |
| HUMAN-004 | Confirm the 68–72% post-remediation estimate and the seven-change scope. | Prevents 81% scope chasing. | TODO |
| HUMAN-005 | Confirm `REMEDIATION.md` as authoritative while the original evaluation reports are absent. | The eval inputs were not supplied. | TODO |

## Build Queue

The file column lists implementation targets. The red test counts toward the analyzer's three-file cap; if implementation plus test exceeds three files, the analyzer splits the task before writing `TASK.md`.

| ID | Workstream | Task | Files (max 3) | Red test | Depends | Priority | Status |
|---|---|---|---|---|---|---|---|
| VT-001 | verifier | RFC 6901 JSON pointer resolver | `src/PayShield.Verifier/JsonPointerResolver.cs`, `tests/PayShield.Tests/JsonPointerResolverTests.cs` | `Resolve_HandlesEscapedSegmentsAndMissingPaths` | B-001, B-002 | P0 | TODO |
| VT-002 | verifier | Gate 1 strict schema | `src/PayShield.Verifier/Gates/Gate1_Schema.cs`, `tests/PayShield.Tests/Gate1Tests.cs` | `Gate1_RejectsExtraField`, `Gate1_RejectsMissingField` | VT-001 | P0 | TODO |
| VT-003 | verifier | Gate 2 scope invariant | `src/PayShield.Verifier/Gates/Gate2_SecondHopPolicy.cs`, `tests/PayShield.Tests/Gate2_SecondHopPolicyTests.cs` | `Gate2_RejectsThreeHop`, `Gate2_RejectsDifferentIcoOnHop2` | VT-001 | P0 | TODO |
| VT-004 | verifier | Gate 3 OCR provenance | `src/PayShield.Verifier/Gates/Gate3_OcrProvenance.cs`, `tests/PayShield.Tests/Gate3Tests.cs` | `Gate3_RejectsLowOcrConfidence`, `Gate3_RejectsBoundingBoxOutOfRange` | VT-001 | P0 | TODO |
| VT-005 | verifier | Gate 4 arithmetic | `src/PayShield.Verifier/Gates/Gate4_Arithmetic.cs`, `tests/PayShield.Tests/Gate4Tests.cs` | `Gate4_RejectsArithmeticMismatch` | VT-001 | P0 | TODO |
| VT-006 | verifier | Gate 5 claim grounding | `src/PayShield.Verifier/Gates/Gate5_ClaimGrounding.cs`, `tests/PayShield.Tests/Gate5Tests.cs` | `Gate5_RejectsUngroundedClaim`, `Gate5_RejectsValueMismatch` | VT-001 | P0 | TODO |
| VT-007 | verifier | Pipeline, receipt hash, hero case | `src/PayShield.Verifier/VerifierPipeline.cs`, `tests/PayShield.Tests/HeroCaseTests.cs`, `tests/golden/verifier_hero_case.json` | `HeroCase_PassesAllFiveGates` | VT-002..006, HUMAN-001 | P0 | TODO |
| VT-008 | domain | Rule engine and aggregation | `src/PayShield.Domain/Rules/RuleEngine.cs`, `src/PayShield.Domain/Rules/FraudRules.cs`, `tests/PayShield.Tests/RuleEngineTests.cs` | `Rules_AggregateBlockOverEscalate` | VT-007 | P0 | TODO |
| VT-009 | domain | Decimal money math | `src/PayShield.Domain/Money/MoneyMath.cs`, `tests/PayShield.Tests/MoneyMathTests.cs` | `Money_SumsOrdersToGross` | — | P1 | TODO |
| VT-010 | infra | Fixture seeder 82/14/4 | `src/PayShield.Infrastructure/Data/Seed/FixtureSeeder.cs`, `tests/PayShield.Tests/SeederTests.cs` | `Seeder_Produces82_14_4` | VT-008, HUMAN-001 | P0 | TODO |
| VT-011 | verifier | Golden receipt snapshot | `tests/PayShield.Tests/ReceiptSnapshotTests.cs`, `tests/golden/receipt_hero_case.json` | `Receipt_MatchesGoldenSnapshot` | VT-007 | P0 | TODO |
| VT-012 | infra | ARES client with cache | `src/PayShield.Infrastructure/Ares/AresClient.cs`, `tests/PayShield.Tests/AresClientTests.cs` | `Ares_ReturnsCachedProfileOnTimeout` | HUMAN-001 | P0 | TODO |
| VT-013 | infra | Bedrock two-hop agent | `src/PayShield.Infrastructure/Bedrock/BedrockAgent.cs`, `tests/PayShield.Tests/BedrockAgentTests.cs` | `Agent_SecondHopRequiresContradiction` | HUMAN-002 | P0 | TODO |
| VT-014 | infra | Cassette fallback at 2.6s | `src/PayShield.Infrastructure/Bedrock/CassetteInterceptor.cs`, `tests/PayShield.Tests/CassetteTests.cs` | `Cassette_TriggersAt2600ms` | VT-013 | P0 | TODO |
| VT-015 | crypto | Server signer and signature verification | `src/PayShield.Infrastructure/Crypto/ServerSigner.cs`, `tests/PayShield.Tests/SignatureTests.cs` | `Signature_VerifiesForValidPayload`, `Signature_FailsForTamperedPayload` | — | P0 | TODO |
| VT-016 | audit | Hash-chained ledger | `src/PayShield.Infrastructure/Audit/AuditLedger.cs`, `tests/PayShield.Tests/AuditTests.cs` | `Audit_TamperedEventBreaksChain` | VT-015 | P0 | TODO |
| VT-017 | api | Health, queue, case detail | `src/PayShield.Api/Program.cs`, `src/PayShield.Api/Endpoints/CasesEndpoints.cs`, `tests/PayShield.Tests/ApiSmokeTests.cs` | `Api_Health_ReturnsOk` | VT-007, VT-010 | P0 | TODO |
| VT-018 | api | Triage and receipt endpoints | `src/PayShield.Api/Endpoints/VerifierEndpoints.cs`, `src/PayShield.Api/Endpoints/DemoEndpoints.cs`, `tests/PayShield.Tests/TriageEndpointTests.cs` | `Triage_HeroCase_ReturnsEscalate` | VT-017 | P0 | TODO |
| VT-019 | api | Approve, reject, audit, exposure | `src/PayShield.Api/Endpoints/AuditEndpoints.cs`, `tests/PayShield.Tests/ApprovalEndpointTests.cs` | `Approve_RejectsTamperedSignature` | VT-015, VT-016 | P0 | TODO |
| VT-020 | api | SignalR approvals hub | `src/PayShield.Api/Hubs/ApprovalsHub.cs`, `tests/PayShield.Tests/HubTests.cs` | `Hub_EmitsApprovalRequested` | VT-019 | P0 | TODO |
| VT-021 | api | Verifier recheck and OCR drop | `src/PayShield.Api/Endpoints/VerifierEndpoints.cs`, `tests/PayShield.Tests/RecheckEndpointTests.cs` | `Recheck_OcrDrop_FlipsGate3` | VT-018, VT-020 | P0 | TODO |
| VT-022 | web | Shell, typed API, mock mode | `apps/web/lib/api.ts`, `apps/web/lib/mock.ts`, `apps/web/package.json` | `api.test.ts` | B-003 | P0 | TODO |
| VT-023 | web | 21 FTE metric bar and alert queue | `apps/web/components/BatchTriageBar.tsx`, `apps/web/components/AlertQueueTable.tsx` | `BatchTriageBar.test.tsx` | VT-022, VT-010 | P0 | TODO |
| VT-024 | web | Case detail, regulatory clock, agent evidence | `apps/web/components/CaseDetailPane.tsx`, `apps/web/components/RegulatoryClockBadge.tsx`, `apps/web/components/AgentEvidencePanel.tsx` | `RegulatoryClockBadge.test.tsx` | VT-023 | P0 | TODO |
| VT-025 | web | Verifier gates and override banner | `apps/web/components/VerifierGatesPanel.tsx`, `apps/web/components/OverrideBanner.tsx` | `VerifierGatesPanel.test.tsx` | VT-024 | P0 | TODO |
| VT-026 | web | Invoice bounding-box overlay | `apps/web/components/PdfBoundingBoxOverlay.tsx`, `apps/web/lib/format.ts` | `PdfBoundingBoxOverlay.test.tsx` | VT-024, HUMAN-001 | P1 | TODO |
| VT-027 | web | Compact QR modal and F9 failover | `apps/web/components/QrSigningModal.tsx`, `tests/PayShield.Tests/QrContractTests.cs` | `Qr_CompactUriUnder68Bytes`, `F9_InjectsPreSignedSignature` | VT-025, VT-015 | P0 | TODO |
| VT-028 | mobile | Scan, sign, result; compact QR | `apps/mobile/app/index.tsx`, `apps/mobile/app/sign.tsx`, `apps/mobile/lib/qr.ts` | `Qr_CompactUriUnder68Bytes` | VT-015 | P0 | TODO |
| VT-029 | web | Audit chain, demo controls, polling fallback | `apps/web/components/AuditChainView.tsx`, `apps/web/components/DemoControls.tsx`, `apps/web/lib/signalr.ts` | `AuditChainView.test.tsx`, `signalr.test.ts` | VT-027, VT-021 | P0 | TODO |
| VT-030 | e2e | Hero case end-to-end | `tests/PayShield.Tests/E2ETests.cs`, `tests/golden/receipt_hero_case.json` | `E2E_HeroCase_EndToEnd` | VT-021, VT-027, VT-028 | P0 | TODO |
| VT-031 | release | Remediation verification and extended findings | `REMEDIATION_PLAN.md`, `EXTENDED_FINDINGS.md` | Seven change acceptances; full suite green | VT-003, VT-014, VT-023, VT-024, VT-027, VT-028 | P0 | TODO |
| VT-032 | release | Rehearsal hardening (bug fixes only) | Per bug | Existing tests only | VT-030, VT-031 | P0 | TODO |

## Remediation Mapping

The seven changes are not a second backlog. They are acceptance criteria on the tasks that own the files.

| Change | Owning task | Pre-staged docs |
|---|---|---|
| 1 — 21 FTE hook | VT-023 | `AGENTS.md`, `pitch/opening.md` |
| 2 — Gate 2 scope invariant | VT-003 | `AGENTS.md`, `.agents/QA_WAR_ROOM.md` |
| 3 — Regulatory clock badge | VT-024 (contract delta applied in B-000) | `AGENTS.md`, `contracts/README.md` |
| 4 — Q&A war room | none (docs) | `.agents/QA_WAR_ROOM.md` |
| 5 — Deployment story | none (docs) | `AGENTS.md`, `pitch/slide_2.md` |
| 6 — 180s throughput math | VT-023 | `AGENTS.md`, `pitch/throughput_math.md` |
| 7 — QR / F9 / cassette | VT-014, VT-027, VT-028 | `AGENTS.md` |
| Verification pass | VT-031 | `REMEDIATION.md` |

## Rules

- Pick the highest-priority `TODO` whose dependencies are `DONE` and whose workstream is unlocked.
- A task with `RED` status already has its failing test committed. Verify the commit and the red result before implementation.
- If a task needs more than three files, split it.
- No new feature tasks after H+20. VT-032 is bug-fix only.
- The H+14 cut list may mark tasks `CUT`; never delete their tests without a `DECISION.md`.
- The remediation changes are bounded. A new idea goes to `EXTENDED_FINDINGS.md`, not the backlog.
- No product code or contract files exist until B-000 starts. The current next action is B-000.

## Current

- Active: none. The repository is the environment; product code and contracts are absent.
- Next: B-000, then B-001 through B-006.
- Human blockers: HUMAN-001 (fixtures) before VT-007; HUMAN-002 (packages) before any restore; HUMAN-004/HUMAN-005 before VT-031.
- The original readiness line `dotnet test` expecting one failing test is restored by B-002, not by this environment bootstrap.
