# UI/UX & Forensic Calculation Audit

## Issues found and fixed

1. **Graph edge provenance bug** — `Radar()` paired dictionary values with `rows.ElementAt(i)`, which could label an edge with the wrong source alert if dictionary ordering drifted. It now uses the explicit `pair.Key` alert id.
2. **Amount-mirror calculation** — the 20% correlation signal used the aggregate velocity ratio, not actual amounts. It now compares actual outgoing CZK volume and applies the 5% / 15% / 35% bands.
3. **Drawer/background contention** — clicking a radar node opened the drawer while the radar inspector remained in the blurred background. The drawer now:
   - locks body scroll;
   - uses an opaque, blurred backdrop;
   - is a true `role="dialog"` with `aria-modal`;
   - closes on Escape;
   - focuses the close control;
   - carries a **Network topology** card with role, R, topology score, shared hub, pass-through, in/out, cyclic flag, links, and degree/clustering/diffusion bars.
4. **Crowded radar** — selected/hover states, accessible `<title>` tooltips, role glyphs, an arc legend, and reduced-motion support.
5. **Card system** — KPI cards gained accent rails and hover elevation; role cards and table rows have quiet hover/selected states; drawer tabs scroll horizontally instead of clipping.
6. **Arc calibration** — crimson for `>=58`, amber `45–57`, and Show All renders only `>=55`; this makes the live 60 edges crimson instead of forcing fake 75+ edges.

## Role distribution after calibration

`8 MULE_AGGREGATOR / 8 CAROUSEL_RING / 15 COMPROMISED_VICTIM / 14 ISOLATED_ANOMALY`.

## Final pitch polish (light + full ledger)

- Radar restyled to the same light surface/outline/inspector system as the cockpit; no dark island.
- View selector moved above the radar: **Deliverable Benchmark (45) / All Scanned Alerts / Raw Transactions Stream (397,853)**. Default is the full raw ledger; **Jump to full ledger ↓** scrolls to it. Server pagination is 100/page across 397,853 rows; all rows are queryable, not capped at 45.
- **Reprocess fixed**: it now re-fetches `/deliverable/stats`, `/dataset/stats`, the active row set, and raw page after reprocessing. The cards and table update in place instead of showing stale data.
- The graph is intentionally light, not a dark overlay; role colors use red / rose / amber / slate against the cockpit surface.

## Design direction

- Kept the existing light Scandinavian cockpit, with one dark forensic canvas for the radar.
- No new runtime packages: Next 15 / React 19, semantic HTML, SVG, CSS custom properties, focus states, and `prefers-reduced-motion`. This avoids freeze-week dependency risk.
- Data-dense but calm: tabular alignment, one accent per role, compact mono labels, no decorative gradients outside the radar.
- Screens checked: header/engine badges, KPI cards, data strip, filters, sensitivity panel, radar role strip, SVG radar, inspector, triage table, drawer tabs, topology card, transaction cluster, verifier diff, AI panel, audit/deep/dossier tabs, stress modal.

## Remaining honest limitations

- `has_cyclic_flow` still uses the shared-primary-hub approximation; it is not a full directed cycle proof over the flat ČNB file.
- Temporal sync is date-level because the transaction index discards the time column; 120-minute Δt is modeled in the pure math but not exercised live.
- Confidence is 80 on the hero because OCR/ARES evidence is absent from this dataset; it is not 100.
- Pass-through hours are day-level. Do not overstate minute precision.
- Bedrock remains snapshot due the host .NET/AppleCrypto TLS failure.

## Verification

- `dotnet test`: **72/72 passed**
- `npm run build`: green
- CSV: 46 lines / 11 columns
- 4-eyes: 400
- Topology: 8/8/15/14
- Hero: MULE_AGGREGATOR, R 0.20
- UI: 200
