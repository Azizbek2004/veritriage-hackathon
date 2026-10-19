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
| Frontend | FINREG cockpit built; npm run build green |
| Mobile | Absent |
| Backend tests | 24 passed, 0 failed |
| AWS datasets | Acquired in `datasets/` |
| Bedrock invoke | Blocked |
| Demo | FINREG CSV + 4-eyes demo path; not rehearsed |

## Next Actions

1. Refresh the TeamAdmin SSO session and run the Sonnet 4.5 ping/caching/tool-use tests.
2. Authorize B-003/B-004 and the planned frontend/mobile package set.
3. Decide the MCC mapping (`PROPOSAL.md`).
4. Build the ČNB parser/endpoint, fixture seeder, API endpoints, and cockpit.


## Release Manager Pass — 2026-10-19

**Built**

- `FinregDeliverableEngine` with 45-row sample calibration, 11-column CSV, priority bands, 4-eyes status, and legal reasons.
- `GET /api/v1/deliverable/csv` and `/sample`; `POST /api/v1/cases/verify-4-eyes`; cached investigation endpoint.
- Next.js single-screen cockpit with CSV download, priority colors, 4-eyes drawer, red banner, QR placeholder/F9, cached investigation panel.
- `fixtures/bedrock_hero_response.json` and `CassetteInterceptor`.
- `METHODOLOGY.md` with the formula, matrix, and gate mapping.

**Verified**

- `dotnet test` 18/18.
- `npm run build` green.
- CSV: 45 rows, 11 columns, 30/10/5, one PEP high, exec != approver, legal reason present.
- 4-eyes endpoint: 400 with exact `4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]`.
- Cached investigation: `LIVE_BEDROCK_CACHED` JSON returns.
- `npm test` exits 0.

**Failed / unverified**

- Exact FINREG header order is unverified because the promised engine code was absent. See `PROPOSAL.md` P3.
- GitHub push still fails: no auth; deploy key not added.
- No live Bedrock.
- No real mobile signature, persistent audit chain, E2E, or 5-minute human rehearsal.

**Time elapsed:** ~35 minutes.

## Fixer Pass — 2026-10-19

**Built**

- `DeliverableCsvRow` with the exact 11 properties and header row:
  `alert_id,alert_type,client_id,transaction_id,triage,priority,executive_role,executive_person,approver,reason,log`.
- Per-row SHA-256 `log` JSON with `hash`, `ts`, and `rule_version`.
- `POST /api/v1/cases/{id}/approve` returning `APPROVED` + `audit_hash`.
- Cockpit updated to the exact 11 columns, green `APPROVED` row status, audit-hash toast, and cached legal citations.
- `REHEARSAL.md` and `rehearsal_output.csv`.

**Verified**

- `dotnet test` 18/18.
- `npm run build` green.
- CSV header exact; 45 rows; 30/10/5; exec != approver; legal reason; valid log JSON.
- 4-eyes exact 400; independent 200.
- Approve 200 with `audit_hash`.
- Automated backend rehearsal total 0.0279s.

**Failed / unverified**

- GitHub push blocked (invalid gh token, no token file, deploy key not added).
- No live Bedrock, real mobile signing, audit chain, or human 5-minute rehearsal.
- The exact FINREG engine values beyond headers are an interpretation; the promised code was absent.

## Stage Readiness Pass — 2026-10-19

- Added `AuditChainBuilder` and two endpoints: `/audit` and `/audit/verify`.
- Added the **Audit Chain** drawer tab, timeline, green checks, and **Verify Chain** status.
- Added `DEMO_SCRIPT.md`, `PRE_STAGE_CHECKLIST.md`, and `screenshots/` API proof.
- `dotnet test` 24/24; `npm run build` green.
- Playwright/Puppeteer unavailable; no visual screenshot captured.
- GitHub/AWS not attempted; human action remains.

## Integrity Repair Pass — 2026-10-19

**Contradictions found**

- `FINAL_REPORT.md` and `WAITING_FOR_CREDENTIALS.md` claimed Bedrock was CONNECTED & VERIFIED; the runtime returned `LIVE_BEDROCK_CACHED` with an SSL error.
- `README.md` and `AGENTS.md` said Bedrock was blocked. The documents contradicted each other.
- `FINAL_REPORT.md` said 20 tests; the suite had 22, then 24 after the approval policy tests.
- Port 3000 is occupied by a non-VeriTriage app; the cockpit had only been proven on 3100 with `--disable-web-security`.

**Fixes**

- Real Bedrock probe (`IBedrockService.ProbeAsync`) with measured latency and error. Status is `LIVE_BEDROCK_CACHED`; UI badge is yellow CACHED.
- `/approve` now looks up the case and rejects the same person with the exact 4-eyes 400. Independent approver returns 200.
- `/audit` returns `mode: "DEMO_STATIC"`; UI shows the demo-chain label.
- CORS allows localhost/127.0.0.1 on 3000/3100. Normal Chrome on 3100 loads the table, no security flags.
- Bedrock live attempt failed with SSL; `AWS_BEDROCK_STATUS.md` records the exact error and policy.
- Docs aligned to 24 tests and the cached state.

**Verified**

- `dotnet test` 24/24.
- `npm run build` green.
- Status: `LIVE_BEDROCK_CACHED`, 1550ms, SSL error.
- 4-eyes same: 400 exact body; independent: 200.
- Audit: `DEMO_STATIC`, 5/5.
- CORS: `Access-Control-Allow-Origin: http://localhost:3100`.
- Screenshot: `screenshots/cockpit_light.png`.

**Not changed:** CSV headers, priority formula, 4-eyes verification response, contracts, fixtures.

## Frontend Advance + Live Bedrock — 2026-10-19

- Rebuilt the cockpit around the existing light Scandinavian design system: KPI strip, filter/search, PEP badge, decision cards, claim cards, audit export, copy-hash, and live/cached mode.
- Removed the external Google Fonts `@import` so the table renders without network access.
- Fitted all 11 FINREG columns into the 1440px shell.
- Bedrock became live during this pass: probe `LIVE_BEDROCK` 1207ms; investigation `LIVE_BEDROCK` 12706ms, 4 claims, § 21(5) legal basis.
- Screenshot: `screenshots/cockpit_light.png`; normal Chrome on 3100, no security flags.
- Tests remain 24/24; web build green.


## Data Cockpit + Audit Crash Fix — 2026-10-19

- Added `/api/v1/deliverable/stats` and `/api/v1/deliverable/reprocess`.
- Loader now scans all 397,853 transactions and 5,493 clients; stats report 36,972,049 bytes and ~37–49ms.
- Added data strip + Reprocess button; removed duplicate footer; compacted all 11 columns.
- Audit tab now normalizes array/object responses, handles errors with Retry, and has a Next.js error boundary.
- Deep link `?case=ALERT-045&tab=audit` verifies the audit timeline without a crash: `screenshots/audit_chain.png`.
- Bedrock is probe-driven; latest probe cached, earlier live. UI follows the probe.
- `dotnet test` 24/24; `npm run build` green.


## Forensic UI Sprint — 2026-10-19

- Added priority breakdown JSON/pills; all 45 sums match.
- Added CNB transaction index, client cluster endpoint, baseline bars, sibling ledger, structuring pattern, shared counterparty.
- Added verifier diff endpoint/table with OVERRIDDEN and FAIL_CLOSED rows.
- Added file-backed audit ledger (`data/audit_ledger.json`); 5→6 after approve; `FILE_CHAIN`.
- Removed debug labels from UI; dual ENGINE/BEDROCK badges.
- Added live deep-trace button/endpoint with 2.5s snapshot fallback.
- 24/24 tests; build green; screenshots `forensic_drawer.png`, `audit_chain.png`.


## Legal Grounding Sprint — 2026-10-19

- Added 12-section human-approved Czech AML/ČNB/FAU corpus (`fixtures/legal_corpus_cnb_aml.json`).
- Added `LegalCorpus`, `lookup_statutory_provision`/`search_legal_text` endpoints, and deterministic legal excerpt injection in `LiveBedrockService`.
- `BuildStatutoryReason` now embeds exact quoted Czech clauses and actual 1.71x volume/count ratios.
- Added `tests/golden/verifier_hero_case.json` and golden test; suite 25/25.
- Updated `SOLUTION_2PAGE.md`, `DEMO_SCRIPT.md`, `.agents/QA_WAR_ROOM.md`, and `LEGAL_GROUNDING_REPORT.md`.


## Deterministic Logic & Legal Document Sprint — 2026-10-19

- Added 5 versioned rules and `ExplanationSnapshot`; determinism endpoint and drawer rule list.
- Added `ICaseRepository`, `IDeepAnalysisService`, file-backed document persistence, sign/bundle/verify endpoints.
- Deep Analysis tab in the drawer; Markdown-only (no PDF package).
- Added curated FATF references and bundle section.
- Tests 26/26; build green; CSV/4-eyes/audit intact.
