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
