# Topology Radar Report

## Implementation

- Domain math: `src/PayShield.Domain/Forensics/TopologyMath.cs`.
- API engine: `src/PayShield.Api/Forensics/TopologicalForensicsAnalyzer.cs`.
- Endpoints: `GET /api/v1/forensics/radar`; topology attached to `/cases`, `/cases/{id}`, `/deliverable/sample`.
- UI: `apps/web/components/domain/TopologicalRadarPanel.tsx` imported into `apps/web/app/page.tsx`.

## Distribution (45 cases)

| Forensic role | Count |
|---|---:|
| `MULE_AGGREGATOR` | 31 |
| `CAROUSEL_RING` | 4 |
| `COMPROMISED_VICTIM` | 2 |
| `ISOLATED_ANOMALY` | 8 |

The high mule count reflects the actual shared-counterparty density in this synthetic ČNB slice; it is not hardcoded.

## Top correlated pairs

| Pair | Score | Reason |
|---|---:|---|
| ALERT-007 ↔ ALERT-032 | 62 | temporal 100% · amount 70% · entity 100% |
| ALERT-027 ↔ ALERT-029 | 62 | temporal 100% · amount 100% |
| ALERT-003 ↔ ALERT-005 | 61 | temporal 100% · amount 100% |
| Other pairs | 35–60 | partial temporal / amount / entity match |

No pair in this dataset reached the 75+ crimson band; the UI therefore renders 50–74% amber edges. The synthetic test `AccountCorrelation_WhenSharedIbanAndTemporalSync_ReturnsScoreAbove75` proves the >75 path.

## Non-regression

- 11-column CSV header and 46-line contract unchanged.
- 4-eyes same-person: 400.
- `priority`/`priority_raw`/parity math untouched; topology is additive.
- Tests: **67/67 passed** (63 prior + 4 topology/correlation).
- `npm run build`: green.
- API and cockpit running.

## Honest notes

- The role distribution is data-driven, but the live graph is client/counterparty approximation from the ČNB flat file; it is not a full bank graph.
- No live Bedrock claim; current status remains snapshot.
- Radar angle is deterministically hashed from `alert_id` within its quadrant.
