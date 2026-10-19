# Pivot Alignment Report — Track 5 AML Partial Pivot

## Result

```text
PIVOT ALIGNMENT COMPLETE (ENVIRONMENT).

Changes applied: 1-10 at the environment level
Contracts: CnbAmlMetadata documented in contracts/README.md; applied in B-000
           (contract files are intentionally absent until then)
Q&A war room: four AML answers + VC judge verbatim answer
Pitch opening: two-regime primary + PSR-only 21 FTE fallback
Cut list: VT-033, VT-034, VT-035 protected
Backlog: four new AML tasks (VT-033 through VT-036)
Compliance: AWS terms + data sources + synthetic rule documented
Morning commands: Track 5 registration at the top

Build state: backend green — dotnet build PASS, dotnet test 20/20.
            Full product build remains blocked on frontend/mobile and Bedrock invoke.
Git state: clean.

Honest win probability:
- Baseline (PSR only): 55-60%
- Post-remediation (PSR): 68-72%
- Post-partial-pivot (PSR + AML): 72-78%
- Ceiling with all rehearsals clean: 78%

What the team must do first thing at H+0:
1. Register Track 5 AML (Person B, first 15 minutes)
2. Download ČNB CSV and Tapaya PDFs (Person B, next 15 minutes)
3. Talk to FINREG mentor about § 20(7) (both, next 15 minutes)
4. Start VT-033 (Person A, first 90 minutes after B-006)

Do not add scope. The remaining win probability is in rehearsal, not code.
```

## Build State (Updated 2026-10-19)

B-000/B-001/B-002 are complete. The contracts are materialized, `dotnet build` is green, and the backend suite is 16/16. The full demo is not green: `apps/web` and `apps/mobile` are absent, the API is only `/api/v1/health`, and Bedrock invoke is blocked. See [BUILD_LOG.md](BUILD_LOG.md).

## Changes Applied

| # | Change | Artifact |
|---|---|---|
| 1 | `CnbAmlMetadata` additive contract | [contracts/README.md](contracts/README.md) — exact C# record, `CnbAml` field, TS mirror, OpenAPI schema |
| 2 | Two-regime positioning and Track 5 registration | [AGENTS.md](AGENTS.md) |
| 3 | Four AML Q&A answers and three NEVER SAY lines | [.agents/QA_WAR_ROOM.md](.agents/QA_WAR_ROOM.md) |
| 4 | VC judge verbatim answer and Q&A-only quarantine | [.agents/QA_WAR_ROOM.md](.agents/QA_WAR_ROOM.md) |
| 5 | Two-regime primary and PSR-only fallback opening | [pitch/opening.md](pitch/opening.md) |
| 6 | Cut list with VT-033/034/035 protected | [AGENTS.md](AGENTS.md) |
| 7 | VT-033 through VT-036 | [BACKLOG.md](BACKLOG.md) |
| 8 | Compliance and data policy | [COMPLIANCE.md](COMPLIANCE.md) |
| 9 | Track 5 registration at the top of the morning | [MORNING_COMMANDS.md](MORNING_COMMANDS.md), [MORNING_BRIEF.md](MORNING_BRIEF.md) |
| 10 | Track 5 fixture inventory | [fixtures/README.md](fixtures/README.md) |

## Narrative Note Still Pending

The one-line Art. 59 fix in [NARRATIVE_FIX.md](NARRATIVE_FIX.md) is still unapplied. The Pivot brief did not authorize it; it remains a 1-minute morning fix. The active pitch has a new two-regime primary opening, but the timing table still says `PSR Art. 59` on the phone at 1:05. Do not use that line on stage until the fix is approved.

## What Was Deliberately Not Done

- No ČNB parser. That is VT-033.
- No Textract run on Tapaya forms. That is VT-034.
- No Apify fixture. That is VT-035.
- No DTO field renames. The Additive Adapter keeps `supplier`, `net`, `vat`, `gross`, and `ico`.
- No demo script rewrite; the ČNB column headers are not known yet.
- No verifier or rule-engine change. AML rules `R-PEP-01` and `R-MCC-01` are product work.
- No package, golden-file, or test change.
- No § 109 / CFO text in the demo, slides, or opening. It is quarantined in the VC Q&A section.

## Next Steps

1. Person B registers Track 5 and downloads the datasets before the deadline.
2. Person A starts B-000; the contract delta is already specified.
3. Both rehearse the AML and VC answers after the first build.
4. VT-033, VT-034, VT-035 start at H+2; the cut list protects them.

The pivot is bounded. Do not add a sixth subsystem.
