# Pivot Plan — Track 5 AML Partial Alignment

**Date:** 2026-10-19
**Decision:** register under Track 5 AML (FINREG Partners Challenge), keep PSR Article 83 as the primary hook, add Czech AML Act No. 253/2008 Sb. § 20/§ 22/§ 25 as the second hook, ingest the ČNB 400k dataset and Tapaya KYB forms, keep Apify offline, use the Additive Adapter pattern.

## Files and Status

| Change | Files | Status | Note |
|---|---|---|---|
| 1 — `CnbAmlMetadata` contract | `contracts/README.md` | `DOCUMENTED` / `DEFERRED TO B-000` | Contract files are intentionally absent. The exact C# record, `CnbAml` field, TS mirror, and OpenAPI schema are in the README for B-000. No product scaffolding. |
| 2 — AGENTS positioning | `AGENTS.md` | `DONE` | Two-regime section, Track 5 registration, hard rule 15, contract table updated. |
| 3 — AML Q&A answers | `.agents/QA_WAR_ROOM.md` | `DONE` | Four AML answers and three NEVER SAY lines. |
| 4 — VC judge answer | `.agents/QA_WAR_ROOM.md` | `DONE` | Verbatim answer and Q&A-only quarantine. |
| 5 — Pitch opening | `pitch/opening.md` | `DONE` | Two-regime primary and PSR-only 21 FTE fallback. Old write-off hook not reintroduced. |
| 6 — Cut list | `AGENTS.md` | `DONE` | VT-033/034/035 protected; VT-025 protected; stale IDs reconciled. |
| 7 — AML backlog | `BACKLOG.md` | `DONE` | VT-033, VT-034, VT-035, VT-036. |
| 8 — Compliance | `COMPLIANCE.md` | `DONE` | AWS terms, data sources, synthetic rule, Responsible AI. |
| 9 — Morning commands | `MORNING_COMMANDS.md`, `MORNING_BRIEF.md` | `DONE` | Track 5 registration at the top; brief updated for coherence. |
| 10 — Fixtures README | `fixtures/README.md` | `DONE` | New Track 5 inventory and synthetic-label rule. |

## Required Output

The prompt asks for `PIVOT_ALIGNMENT_REPORT.md` with the same content as the output block. See [PIVOT_ALIGNMENT_REPORT.md](PIVOT_ALIGNMENT_REPORT.md).

## Deviations and Why

1. **Change 1 is documented, not applied.** The repo intentionally has `contracts/README.md` only; the domain files are created in B-000. Materializing them tonight would be product scaffolding and would conflict with the environment-only state. The exact additive delta is in [contracts/README.md](contracts/README.md), ready for B-000.
2. **`dotnet build` is not run.** There is no `src/PayShield.sln` until B-001. A build cannot be green in an environment with no solution. The acceptance is deferred to B-000/B-001.
3. **The cut list is reconciled.** The Pivot brief again used stale IDs: VT-025 is the verifier gates/override panel, not a drawer; VT-014 is cassette; VT-028 is mobile; VT-031 is verification. The active list protects VT-025 and correctly labels VT-013/VT-014/VT-030/VT-031.
4. **The fallback opening is 21 FTE, not the old write-off hook.** The brief's fallback reinstated the forbidden hook. The fallback now uses the approved 21 FTE PSR-only line.
5. **`MORNING_BRIEF.md` was updated** so the Track 5 registration is first for Person B. It is the document the team reads on wake; leaving it PSR-only would have hidden the time-sensitive action.
6. **No product code, parser, Textract run, Apify fixture, package, or golden file was touched.** VT-033/034/035 are queued, not implemented.
7. **`REMEDIATION.md` was edited for consistency.** Its pre-pivot "only approved contract change" and "no contracts change except regulatory_clock" lines would have made the remediation agent reject `CnbAmlMetadata`. The two lines now allow both additive deltas. This is a documentation consistency edit, not a new scope.
8. **`COMPLIANCE.md` uses VT-014 for the cassette**, not the Pivot brief's stale VT-028. The cassette is VT-014 in this backlog.
9. **The old write-off hook was not restored.** The Pivot brief's fallback opening contained it; the active fallback is the 21 FTE PSR-only line.
10. **`BOOTSTRAP.md` and `MORNING_COMMANDS.md` were updated to apply both additive deltas.** Without this, B-000 would materialize only `regulatory_clock` and the AML metadata would be missing from the contract.
11. **`PIVOT_ALIGNMENT_REPORT.md` states the build is deferred.** `dotnet build` cannot run without B-000/B-001; claiming a green build would be false.

## Verification Performed

- `grep "Track 5" AGENTS.md` returns the registration line.
- `grep "Two, Not One" AGENTS.md` returns the section.
- `grep` confirms four AML answers, the VC answer, and the three new NEVER SAY lines in `.agents/QA_WAR_ROOM.md`.
- `pitch/opening.md` has both openings and no old write-off hook.
- `BACKLOG.md` has VT-033 through VT-036.
- `fixtures/README.md` has the six new Track 5 fixture rows.
- `COMPLIANCE.md` exists with all four sections.
- `MORNING_COMMANDS.md` has the Track 5 registration section at the top.
- `git status` is clean after the pivot commit.

## Status

**Environment alignment complete. B-000/B-001/B-002 are done; backend verifier/rules are green (16/16). The full product build is blocked on frontend/mobile and Bedrock invoke. See `BUILD_LOG.md` and `FINAL_REPORT.md`.**
