# BLOCKED — Build Session 2026-10-19

The backend slice is green. The full demo is not built. These are the exact blockers.

## Blocker 1 — Frontend, Mobile, and Most API Endpoints Are Not Built

**Evidence**

- `src/PayShield.Api/Program.cs` contains only `/api/v1/health`.
- `apps/web` and `apps/mobile` do not exist.
- `dotnet build` is green; `npm run build` cannot run.
- No frontend/mobile packages are installed. The build prompt says “do not add packages,” and the environment package set was never approved in a `DECISION.md`.

**Why it stops this phase**

- Phase 0 requires `npm run build` in both apps. It cannot pass.
- Phases 4–9 require the API, cockpit, mobile signer, and E2E flow.

**Decision needed**

- Authorize B-003/B-004 and the planned Next.js/Expo package set, or explicitly accept a backend-only deliverable.

## Blocker 2 — Bedrock Invoke Credentials

**Evidence**

- `ai-hackathon-ReadOnly` is valid for S3 and Bedrock listing, but
  `bedrock-runtime.Converse` returns `AccessDeniedException` for `bedrock:InvokeModel`.
- The `ai-hackathon-TeamAdmin` token supplied in chat returns `InvalidClientTokenId`.
- Sonnet 4.5 is available as inference profile
  `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`.
- No latency, caching, tool-use, or two-hop result is claimed.

**Decision needed**

- Refresh the TeamAdmin SSO session with invoke permission, or provide another invoke-capable credential. See `WAITING_FOR_CREDENTIALS.md`.

## Blocker 3 — MCC Data Source

**Evidence**

- `CNB/transactions.csv` has 11 columns and no MCC.
- `CNB/clients.csv` has PEP and AML risk score, but no MCC.
- `CnbAmlMetadata.MccCode` is required by the frozen contract.
- No mapping exists in the official data.

**Decision needed**

- See `PROPOSAL.md`: map `MccCode = "UNKNOWN"` for ČNB rows (recommended, no contract change), or derive it from the Tapaya KYB extraction later.

## What Is Not Blocked

- `dotnet build` is green.
- `dotnet test` is green: 16 passed, 0 failed, 0 skipped.
- The five verifier gates and the PSR/AML rule engine are implemented.
- Official datasets are acquired in `datasets/`.
- Sonnet 4.5's profile is confirmed; only invoke permission is missing.

## Do Not

- Do not fabricate Bedrock latency.
- Do not commit the AWS tokens or the downloaded 36 MB CSV.
- Do not add frontend packages without the human decision above.
