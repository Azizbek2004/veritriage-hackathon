# Build Log — 2026-10-19

This is the honest phase log. It records what was built, what was verified, what failed, and what is blocked.

## Phase 0 — Environment Verification

**What was built**

- Materialized the contracts in `contracts/domain/` (11 records, including `CnbAmlMetadata`, `regulatory_clock`, and `CnbAml`).
- Restored `contracts/types/api.d.ts` and `contracts/api/openapi.yaml`; added the `CnbAmlMetadata` schema and `cnbAml` fields.
- Created the .NET 9 solution, four project shells, and the xUnit test project.
- Added the VT-001 red test and the `JsonPointerResolver` scaffold.

**What was verified**

- `dotnet build src/PayShield.sln --configuration Release` — **PASS**, 0 warnings, 0 errors.
- `dotnet test src/PayShield.sln --configuration Release` — **PASS**, 16 passed, 0 failed, 0 skipped.
- `git status` was clean before the build started.
- `contracts/README.md` says `Frozen`.

**What failed**

- `npm run build` was **not run**: `apps/web` and `apps/mobile` do not exist yet. Phase 0 is therefore **partial**, not complete.
- The initial VT-001 test was red as expected; it is now green because the resolver and verifier were implemented.

**Blocked**

- The frontend/mobile shell and the package installs are not done. See `BLOCKED.md`.

**Time elapsed:** ~45 minutes.

## Phase 1 — Dataset Acquisition

**What was built**

- Downloaded the official S3 objects to `datasets/` (gitignored).
- No dataset was copied into committed fixtures.

**What was verified**

- `CNB/transactions.csv`: 397,853 data rows, 11 semicolon-separated columns.
- `CNB/clients.csv`: 5,493 data rows, 12 columns.
- `MostlyRight` licence/warning CSV: 10,542 data rows.
- Eight Merchant KYB PDFs, all valid PDF 1.6/1.7.
- Bucket and full inventory: `DATASET_INVENTORY.md`.

**What failed**

- The bucket contains `MerchantKYB` forms, not files labeled `Tapaya`. The mapping to the two “Tapaya filled forms” is not established.
- The transaction CSV has no MCC. `CnbAmlMetadata.MccCode` cannot be populated from transactions + clients alone. See `PROPOSAL.md`.

**Blocked**

- Textract extraction is not run (Phase 3.5).

**Time elapsed:** ~15 minutes.

## Phase 2 — Bedrock Sonnet 4.5 Connection

**What was verified**

- `ai-hackathon-ReadOnly` credentials are valid in account 422928733782.
- S3 dataset access works.
- Bedrock model inventory is readable in `eu-central-1`.
- Sonnet 4.5 inference profile exists and is ACTIVE:
  `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`.
- Claude is available only via inference profiles, not ON_DEMAND.

**What failed**

- ReadOnly `bedrock-runtime.Converse` returned `AccessDeniedException` for `bedrock:InvokeModel`.
- The `ai-hackathon-TeamAdmin` token from the chat returned `InvalidClientTokenId`.
- No latency, prompt-caching, or tool-use test was possible. **No success is claimed.**

**Blocked**

- Phase 2 is blocked on a refreshed invoke-capable SSO session. See `WAITING_FOR_CREDENTIALS.md`.
- Full details: `AWS_PREFLIGHT.md`.

**Time elapsed:** ~10 minutes.

## Phase 3.1 — Verifier Pipeline

**What was built**

- `JsonPointerResolver` with RFC 6901 escaping and array indices.
- `Gate1_Schema`, `Gate2_SecondHopPolicy`, `Gate3_OcrProvenance`, `Gate4_Arithmetic`, `Gate5_ClaimGrounding`.
- `VerifierPipeline` with engine counts, proof steps, fail-closed behavior, and a SHA-256 receipt hash.

**What was verified**

- The resolver test passes.
- Each gate has at least one negative test and the pipeline has a positive grounded-claim test.
- Full suite: 16 passed (includes rule engine).

**What failed / is thin**

- Gate 1 is a field validator, not a strict `JsonSerializer` boundary. The strict deserialization test (`Gate1_RejectsExtraField`) is not implemented yet.
- Gate 2 uses the pivot's scope invariant (`HopCount <= 2 AND Hop2TargetIco == envelope.Supplier.Ico`). It does not yet read a separate “Hop 1 evidence” object.
- Gate 4 covers invoice, VAT, FX, and velocity. Director-tenure arithmetic is not implemented.
- The pipeline test uses an inline envelope, not the official hero fixture.

**Time elapsed:** ~35 minutes.

## Phase 3.2 — Rule Engine

**What was built**

- `RuleInput`, `RuleHit`, `RuleDecision`, `FraudRules`, `RuleEngine`.
- PSR rules: IČO, IBAN, math, sanctions, VoP, BEC, velocity, age, verifier failure.
- AML rules: `R-PEP-01`, `R-MCC-01`.
- Aggregation: BLOCK over ESCALATE over AUTO_CLEAR; risk capped at 100.

**What was verified**

- Four rule tests pass:
  - block over escalate,
  - verifier failure escalates,
  - PEP + MCC escalate,
  - clean case auto-clears.

**Time elapsed:** ~15 minutes.

## Phases 3.3–3.6

**Not built.** No fixture seeder, no ČNB endpoint, no Textract extraction, no Apify fixture. The data exists in `datasets/`; the product code does not.

## Phases 4–9

**Not built.** No 12-endpoint API, no SignalR hub, no audit ledger, no server signer, no Bedrock two-hop agent, no cockpit, no mobile signer, no E2E test, no rehearsal report.

## Current Build State

| Area | State |
|---|---|
| Contracts | Frozen; C#/TS/OpenAPI materialized |
| Domain | Rule engine implemented, tests green |
| Verifier | Five gates implemented, tests green |
| Infrastructure | Empty project; no Ares/Bedrock/Audit/Crypto |
| API | Health endpoint only |
| Frontend | Absent |
| Mobile | Absent |
| Backend tests | 16 passed, 0 failed |
| AWS datasets | Acquired in `datasets/` |
| Bedrock invoke | Blocked |
| Demo | Not runnable |

## Next Actions

1. Refresh the TeamAdmin SSO session and run the Sonnet 4.5 ping/caching/tool-use tests.
2. Authorize B-003/B-004 and the planned frontend/mobile package set.
3. Decide the MCC mapping (`PROPOSAL.md`).
4. Build the ČNB parser/endpoint, fixture seeder, API endpoints, and cockpit.
