# Screenshot / Proof Status

Visual screenshot:

- `cockpit_light.png` — normal Chrome (no `--disable-web-security`) on `http://127.0.0.1:3100`, showing the LIVE · Sonnet 4.5 badge, KPI strip, filters, and all 11 FINREG columns.

API proof (no 4-eyes PNG; Playwright/Puppeteer are not installed):

- `4_eyes_violation_headers.txt` — HTTP 400 from `/approve` with the same person.
- `4_eyes_violation_body.txt` — exact 4-eyes body.
- `audit_chain_verify.json` — 5/5, `mode: DEMO_STATIC`.
- `csv_header.txt` — the exact 11-column header.

The light screenshot is the visual proof that CORS, the probe-driven badge, the data strip, and the 11-column table work in a normal browser.

Audit view:

- `audit_chain.png` — deep link `?case=ALERT-045&tab=audit`; five-event timeline, DEMO_STATIC label, no crash.


Forensic views:

- `forensic_drawer.png` — client cluster (1.71x actual), sibling ledger with `THIS ALERT`, structuring pattern, shared counterparty, and the 5-row verifier diff.
- `audit_chain.png` — file-backed ledger `6/6` after approval; no `DEMO_STATIC`.

- `deep_analysis.png` — drawer Deep Analysis tab with dual actions, 5-vector cards, and document history.
- `dossiers.png` — Legal Dossiers & History tab with seeded counsel archive and printable HTML links.

- `METHODOLOGY_2PAGER.pdf` — two-page FINREG methodology (formula, vectors, 4-eyes, dual-mode).

- `priority_hardening.png` — 45-row priority table with confidence, V11/S20 breakdown, and 0-mismatch sensitivity panel.

- `topology_radar.png` — concentric AML radar with role strip, correlation inspector, and 45 client nodes.

- `case_drawer_topology.png` — selected case drawer with the topology context card, role, R distance, and shared-hub facts.

- `pitch_full_ledger.png` — light-mode cockpit with the full-ledger selector and 397,853-row stream active.

- `pitch_minimal.png` — minimal banking cockpit with green palette and full-ledger selector.

- `transaction_flow_light.png` — light Money Flow DAG and transaction brief.
