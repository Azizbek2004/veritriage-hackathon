# Night Audit — H+0 Readiness

**Date:** 2026-10-19
**Scope:** active environment docs, contract plan, task queue, bootstrap templates, pitch/Q&A. Historical `blueprint.md` and `project.md` audited separately.
**Rule:** audit only. No product code, no fixtures, no package changes.

## 1. Path-Reference Audit

### Resolves cleanly

These active references all resolve to existing files:

- `AGENTS.md`, `CLAUDE.md`, `README.md`, `BACKLOG.md`, `BOOTSTRAP.md`, `REMEDIATION.md`
- `.agents/orchestrator.md`, `.agents/analyzer.md`, `.agents/implementer.md`, `.agents/evaluator.md`, `.agents/reviewer.md`, `.agents/state-machine.md`, `.agents/human-handoff.md`, `.agents/remediation.md`, `.agents/QA_WAR_ROOM.md`
- `.skills/ponytail/SKILL.md`, `.skills/test-first/SKILL.md`, `.skills/no-slop-verifier/SKILL.md`, `.skills/scope-guard/SKILL.md`, `.skills/signalr-checklist/SKILL.md`
- `contracts/README.md`, `fixtures/README.md`, `tests/golden/README.md`, `evaluation/README.md`
- `pitch/opening.md`, `pitch/slide_2.md`, `pitch/throughput_math.md`
- `.github/workflows/ci.yml`
- `blueprint.md`, `project.md`

### Absent by design — expected, not broken

| Referenced path | Referenced from | Expected creator |
|---|---|---|
| `contracts/domain/*.cs` | `AGENTS.md`, `BOOTSTRAP.md`, `REMEDIATION.md`, `.agents/*`, `.skills/scope-guard` | **B-000** |
| `contracts/types/api.d.ts` | same | **B-000** |
| `contracts/api/openapi.yaml` | same | **B-000** |
| `src/PayShield.sln`, `src/PayShield.*` | `AGENTS.md`, `README.md`, `BACKLOG.md`, `REMEDIATION.md` | **B-001** |
| `tests/PayShield.Tests/*` | `AGENTS.md`, `BACKLOG.md`, `REMEDIATION.md` | **B-002** |
| `apps/web/*`, `apps/mobile/*` | `AGENTS.md`, `README.md`, `BACKLOG.md`, `REMEDIATION.md` | **B-003/B-004** |
| `fixtures/*` | `AGENTS.md`, `BACKLOG.md`, `.skills`, `REMEDIATION.md` | **HUMAN-001 / B-005** |
| `tests/golden/*.json` | `AGENTS.md`, `BACKLOG.md` | **VT-007 / VT-011** |
| `package.json`, `package-lock.json` | `AGENTS.md`, `BOOTSTRAP.md` | **B-003/B-004 + HUMAN-002** |
| `TASK.md`, `EVALUATION.md`, `REVIEW.md`, `PONYTAIL_REPORT.md` | `AGENTS.md`, `.agents/*` | Runtime working files, gitignored |
| `BLOCKED.md`, `DECISION.md`, `PROPOSAL.md` | `.agents/human-handoff.md`, `AGENTS.md` | Runtime escalation files |
| `REMEDIATION_PLAN.md`, `EXTENDED_FINDINGS.md` | `REMEDIATION.md`, `BACKLOG.md` | **VT-031** |
| `MORNING_BRIEF.md`, `MORNING_COMMANDS.md`, `AUDIT_NIGHT.md`, `NIGHT_OPS_REPORT.md` | This Night Ops run | Created tonight |

### Missing inputs — documented

| Missing input | Where it is expected | Status |
|---|---|---|
| `evaluation/EVAL_REPORT.md` | `REMEDIATION.md`, `evaluation/README.md` | Not supplied. `REMEDIATION.md` is authoritative. |
| `evaluation/HONEST_AMENDMENTS.md` | `REMEDIATION.md`, `evaluation/README.md` | Not supplied. Documented in `evaluation/README.md`. |
| `fixtures/pre_signed_mobile_signature.json` | `AGENTS.md`, `REMEDIATION.md`, `fixtures/README.md` | Not supplied. Rehearsal-generated, not fabricated. |

### Reference findings

| # | Finding | Severity |
|---|---|---|
| R1 | The Night Ops input list names `contracts/domain/CaseDetail.cs`, `contracts/types/api.d.ts`, and `contracts/api/openapi.yaml`. These are intentionally absent after the last change; B-000 materializes them at H+0. | Expected |
| R2 | The Night Ops brief refers to `.agents/AGENTS.md` in the remediation context. The canonical path is root `AGENTS.md`; the remediation agent normalizes it. | Resolved |
| R3 | `REMEDIATION.md` still names `tests/Gate2_SecondHopPolicyTests.cs` as the upstream path and `tests/PayShield.Tests/Gate2_SecondHopPolicyTests.cs` as the normalized path. The normalized path is authoritative. | Resolved |
| R4 | `blueprint.md` and `project.md` contain stale pre-remediation references and legal lines under superseded banners. They are historical, not active. | Expected |
| R5 | `pitch/opening.md` line 15 puts `PSR Art. 59` on the phone for the B2B hero. See `NARRATIVE_FIX.md`. | Narrative fix |
| R6 | No git remote is configured (`git remote -v` is empty). A second laptop cannot clone or push until a remote is added. | Operational |

## 2. Task-ID Audit

The queue contains **B-000 through B-006** and **VT-001 through VT-032**. The Night Ops brief listed B-001 through B-006; B-000 is the new contract-materialization task.

### Bootstrap tasks

| ID | References | Status |
|---|---|---|
| B-000 | `contracts/domain/*.cs`, `contracts/types/api.d.ts`, `contracts/api/openapi.yaml` | These files do not exist yet; B-000 creates them. Expected. |
| B-001 | `src/PayShield.sln`, four csproj files, `contracts/domain/*.cs` | Depends on B-000. Expected. |
| B-002 | test csproj, VT-001 test, `JsonPointerResolver.cs` | Creates them. Expected. |
| B-003 | `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `app/*` | Creates them; needs HUMAN-002 packages. Expected. |
| B-004 | `apps/mobile/package.json`, `app.json`, `app/*` | Creates them; needs HUMAN-002 packages. Expected. |
| B-005 | `fixtures/*` | Human-owned; no fixture is present. Expected. |
| B-006 | none | Baseline proof. Expected. |

### Build tasks

Status legend: `OK` = files are created by this or a prior task. `HUMAN` = fixture or package approval needed. `SELF` = task creates its own golden/report. `FINDING` = issue to resolve.

| ID | References | Status |
|---|---|---|
| VT-001 | `JsonPointerResolver.cs`, `JsonPointerResolverTests.cs` | OK after B-002 |
| VT-002 | `Gate1_Schema.cs`, `Gate1Tests.cs` | OK |
| VT-003 | `Gate2_SecondHopPolicy.cs`, `Gate2_SecondHopPolicyTests.cs` | OK; Gate 2 scope invariant is the protected spec |
| VT-004 | `Gate3_OcrProvenance.cs`, `Gate3Tests.cs` | OK |
| VT-005 | `Gate4_Arithmetic.cs`, `Gate4Tests.cs` | OK |
| VT-006 | `Gate5_ClaimGrounding.cs`, `Gate5Tests.cs` | OK |
| VT-007 | `VerifierPipeline.cs`, `HeroCaseTests.cs`, `tests/golden/verifier_hero_case.json` | HUMAN fixtures; SELF golden |
| VT-008 | `RuleEngine.cs`, `FraudRules.cs`, `RuleEngineTests.cs` | OK |
| VT-009 | `MoneyMath.cs`, `MoneyMathTests.cs` | OK |
| VT-010 | `FixtureSeeder.cs`, `SeederTests.cs` | HUMAN fixtures |
| VT-011 | `ReceiptSnapshotTests.cs`, `tests/golden/receipt_hero_case.json` | SELF golden after VT-007 |
| VT-012 | `AresClient.cs`, `AresClientTests.cs` | HUMAN fixtures; ARES live/cached |
| VT-013 | `BedrockAgent.cs`, `BedrockAgentTests.cs` | HUMAN packages (AWS SDK) |
| VT-014 | `CassetteInterceptor.cs`, `CassetteTests.cs` | HUMAN packages; protected cassette |
| VT-015 | `ServerSigner.cs`, `SignatureTests.cs` | OK |
| VT-016 | `AuditLedger.cs`, `AuditTests.cs` | OK |
| VT-017 | `Program.cs`, `CasesEndpoints.cs`, `ApiSmokeTests.cs` | OK after VT-007/VT-010 |
| VT-018 | `VerifierEndpoints.cs`, `DemoEndpoints.cs`, `TriageEndpointTests.cs` | OK |
| VT-019 | `AuditEndpoints.cs`, `ApprovalEndpointTests.cs` | OK |
| VT-020 | `ApprovalsHub.cs`, `HubTests.cs` | OK; SignalR is framework-provided |
| VT-021 | `VerifierEndpoints.cs`, `RecheckEndpointTests.cs` | OK; shares a file with VT-018, so serialize them |
| VT-022 | `lib/api.ts`, `lib/mock.ts`, `package.json` | HUMAN packages; B-003 shell |
| VT-023 | `BatchTriageBar.tsx`, `AlertQueueTable.tsx` | HUMAN packages; protected 21 FTE metric |
| VT-024 | `CaseDetailPane.tsx`, `RegulatoryClockBadge.tsx`, `AgentEvidencePanel.tsx` | HUMAN packages; Q&A-only, cuttable |
| VT-025 | `VerifierGatesPanel.tsx`, `OverrideBanner.tsx` | HUMAN packages; **do not cut** (demo override) |
| VT-026 | `PdfBoundingBoxOverlay.tsx`, `lib/format.ts` | HUMAN fixtures/packages; cuttable |
| VT-027 | `QrSigningModal.tsx`, `QrContractTests.cs` | HUMAN packages; needs `fixtures/pre_signed_mobile_signature.json`; protected |
| VT-028 | `app/index.tsx`, `app/sign.tsx`, `lib/qr.ts` | HUMAN packages; mobile ceremony cuttable at 4h |
| VT-029 | `AuditChainView.tsx`, `DemoControls.tsx`, `lib/signalr.ts` | HUMAN packages; audit chain is demo-critical |
| VT-030 | `E2ETests.cs`, `tests/golden/receipt_hero_case.json` | SELF golden; protected E2E |
| VT-031 | `REMEDIATION_PLAN.md`, `EXTENDED_FINDINGS.md` | SELF reports; protected verification |
| VT-032 | per bug | OK; bug fixes only |

### Task-ID findings

| # | Finding | Impact |
|---|---|---|
| T1 | The Night Ops cut list named VT-025 as "multi-case drawer navigation" and VT-026 as "polish transitions". In this repo VT-025 is the verifier gates panel and VT-026 is the PDF overlay. Copying the brief literally would cut the demo's override panel. | Resolved in `AGENTS.md` cut list: VT-025 is protected, VT-026 is cuttable. |
| T2 | The brief starred VT-014 as Bedrock and VT-028 as cassette. In this repo VT-013 is Bedrock, VT-014 is cassette, VT-028 is mobile, VT-030 is E2E, VT-031 is remediation verification. | Resolved in the reconciled cut list. |
| T3 | VT-027 depends on `fixtures/pre_signed_mobile_signature.json`, which is not in the original eight-fixture list. It is now listed in `fixtures/README.md` as a rehearsal fixture. | Pending HUMAN-001/rehearsal. |
| T4 | VT-028's red test `Qr_CompactUriUnder68Bytes` has no test path in the backlog row. The analyzer must choose one and keep the three-file cap. | Minor; handle in TASK.md. |
| T5 | VT-018 and VT-021 share `VerifierEndpoints.cs`. They are not parallel-safe. | Serialize; workstream rule already covers it. |

## 3. Fixture Audit

`fixtures/README.md` lists nine files. None are present. Each is explicitly pending; no file is incorrectly marked as present.

| Fixture | Status | Source / note |
|---|---|---|
| `ares_basic_27074358.json` | PENDING | Real ARES call; human acquires |
| `ares_vr_27074358.json` | PENDING | Real ARES VR + active-director filter; **synthetic label** |
| `textract_invoice.json` | PENDING | Real Textract output; human acquires |
| `invoice_hero.png` | PENDING | Rendered from the demo PDF; human |
| `alert_hero.json` | PENDING | Constructed; **synthetic label**; human approves |
| `alerts_batch_100.json` | PENDING | Constructed 82/14/4; **synthetic label**; human approves |
| `transaction_history.json` | PENDING | Constructed 90-day ledger; **synthetic label** |
| `tax_offices.json` | PENDING | GFŘ published list; human |
| `pre_signed_mobile_signature.json` | PENDING | Rehearsal-generated failover; human/rehearsal |

**Conclusion:** no fabricated fixture. The commands in `MORNING_COMMANDS.md` leave the synthetic fixtures as explicit TODOs. The real ARES and Textract commands are provided; the human must run them and label the outputs.

## 4. Package Audit

`BOOTSTRAP.md` contains no `.csproj` or `package.json` template. It names the stack and the test harness but not exact package IDs or versions.

| Package area | Referenced where | Approved list? |
|---|---|---|
| .NET 9 SDK | `BOOTSTRAP.md`, `AGENTS.md` | Yes, framework |
| xUnit / Microsoft.NET.Test.Sdk / coverlet | `BOOTSTRAP.md` "approved xUnit test packages" | **No explicit versions in AGENTS.md**; HUMAN-002 |
| AWS SDK for Bedrock/Textract | `blueprint.md` section 13, VT-013/VT-014 | **No explicit IDs/versions**; HUMAN-002 |
| Next.js 15 / React 19 / TypeScript | `AGENTS.md`, `BOOTSTRAP.md`, `blueprint.md` | Names yes; versions no; HUMAN-002 |
| Expo SDK 53 and packages | `AGENTS.md`, `BOOTSTRAP.md`, `blueprint.md` | Names yes; versions no; HUMAN-002 |
| `jq`, `curl`, `openssl`, AWS CLI, `pdftoppm` | `MORNING_COMMANDS.md` | Human tooling; not app packages |

**Finding P1:** AGENTS.md has no explicit approved package list or version pins. HUMAN-002 must approve the exact NuGet/npm set before B-002/B-003. No package was added by this audit.

## 5. Operational Findings

| # | Finding | Impact |
|---|---|---|
| O1 | The Night Ops brief tells Person B to launch a second orchestrator. Two orchestrators in one checkout would create two committers and conflict with the single-writer rule. | Corrected in `MORNING_COMMANDS.md`: only Person A launches the orchestrator. |
| O2 | No git remote is configured. A second laptop cannot sync the repo until a remote is added. | Person B works on the same laptop, or the team adds a remote before H+0. |
| O3 | The active H+14 cut list was only in the historical `blueprint.md`, with stale tasks. | N2 added the protected list to `AGENTS.md`; the blueprint now points to it. |
| O4 | The Night Ops input list cannot read the contract files because they are intentionally absent. | B-000 is the first H+0 step; no guessing. |
| O5 | `pitch/opening.md` line 15 uses Art. 59 for a B2B hero. | Documented in `NARRATIVE_FIX.md`; do not apply without approval. |
| O6 | CI skips `dotnet test` and `npm test` until the scaffold and lockfile exist. | Expected for the environment-only repo; activates at B-006. |

## 6. Summary

**Environment is ready for H+0. No code blockers.**

Planned gates, all documented in `MORNING_BRIEF.md`:

1. **B-000** materializes the contracts.
2. **HUMAN-001** supplies the fixtures; no agent invents them.
3. **HUMAN-002** approves the package set and versions.
4. **One orchestrator only**, and one laptop until a git remote exists.
5. **One narrative fix** at `pitch/opening.md:15`; do not apply without approval.

The team can start H+0 on wake with B-000. The first 90 minutes are in `MORNING_BRIEF.md`; the commands are in `MORNING_COMMANDS.md`.
