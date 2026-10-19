# Priority Hardening Report

## Fix 1 — Uncapped raw score + rank — COMPLETE

- `PriorityComponents` + `ComputePriority` return raw/display; synthetic max test proves **raw 125 → display 100**.
- `priority_raw` is exposed on every case; `priority` stays 0–100.
- Rank 1..45 with `confidence` tiebreaker and `AlertId` final tiebreaker.
- Live baseline: `ALERT-045` = priority 96, raw 96, rank 1/45, evidence 96, confidence 80.
- Test: `Priority_WhenAllComponentsMax_ReturnsRaw125AndDisplay100`.

## Fix 4 — Weight provenance — COMPLETE

- Weights externalized to `src/PayShield.Api/appsettings.json`.
- `PriorityWeights` has statutory defaults and source/rationale metadata.
- `GET /api/v1/priority/weights` returns snake_case values:
  `pep=25`, `volume.per_unit_ratio=10`, `max_raw=125`.
- Engine scoring reads `PriorityWeights`; no hardcoded base/pep/struct/channel weights in active scoring.

## Fix 2 — Two-axis scoring — COMPLETE

- `evidence_score = min(100, priority_raw)`; `confidence_score` 0–100.
- Confidence formula: ARES basic+ICO 40, VR+directors 25, OCR 20, siblings 15.
- Live `ALERT-045`: evidence 96, confidence 80.
- Tests: `Confidence_FullData_Returns100`, `Confidence_MissingAresBasic_Returns60`, `Confidence_MissingOcr_Returns80`.
- Inline table renders `confidence N`; drawer renders Evidence / Confidence / Raw cards.
- Rank tiebreak: raw ↓, confidence ↓, alert id ↑.

## Fix 5 — Client-side sensitivity — COMPLETE

- Sliders: PEP weight, Volume per-unit, Structuring weight, Volume cap.
- Parity check on load: **0 mismatches** across all 45 cases; banner reads `PARITY 0 MISMATCHES`.
- JS uses `roundHalfAwayFromZero`, clamps volume at 0, and mirrors the component inputs.
- 3-level tiebreak (raw, confidence, alert id); top-10 badges `◆ ROBUST`, `↑ NEW`, `↓ DROP`.
- Reset to statutory defaults restores baseline.
- Measured replay: **0ms** in the current build (under 10ms).
- Screenshot: `screenshots/priority_hardening.png`.

## Fix 3 — Legal citations — COMPLETE (one clause unverified)

- Fetched `zakonyprolidi.cz` with a browser UA; verified § 9a(2)(c) and § 21a.
- PEP citation now `Act 253/2008 § 9a(2)(c)`; old `§ 21(5)` has **zero active matches in `src/PayShield.Domain`**.
- `LEGAL_CITATIONS.md` records each verification status.
- `Decree 67/2018 § 6(3)(c)` was **not found** at the cited page; it is marked unverified and not used. Do not cite it as verified.
- All tests green after golden update.

## Fix 6 — POC graph roadmap — COMPLETE

- GitHub API: Kùzu `archived: true`.
- `METHODOLOGY.md` and `.agents/QA_WAR_ROOM.md` now use:
  1. In-memory C# adjacency graph (current).
  2. DuckDB.NET + DuckPGQ (bank POC).
  3. Memgraph/Neo4j + Kafka (enterprise).

## Fix 7 — Final verification — COMPLETE

- CSV header: exact 11 columns.
- CSV row count: 46 (header + 45).
- 4-eyes same-person: **400**.
- `/api/v1/cases[0]`: raw 96, rank 1, rank_total 45.
- `/api/v1/cases/ALERT-045`: evidence 96, confidence 80.
- `/api/v1/priority/weights`: pep 25, per-unit 10, max_raw 125.
- `grep 21(5) src/PayShield.Domain`: zero.
- `dotnet test`: **63/63 passed**.
- `npm run build`: green.
- UI: `http://127.0.0.1:3100` → 200.
- Demo path preserved: CSV → REVIEW → same-person 400 → independent approval → audit.

## Honest notes

- The 45-row CSV is unchanged; the table is the 45-row FINREG deliverable (the earlier 200-row browse queue is not the default stage table).
- Confidence is **80** on the hero because the demo has no OCR/ARES document fields; it is not a data-completeness 100.
- Bedrock remains `SNAPSHOT_FALLBACK` due the host .NET/AppleCrypto `bad certificate format`; do not claim live.
- The `§ 6(3)(c)` clause is unverified; use § 9a(2)(c) for PEP.
