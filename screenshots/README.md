# Screenshot / Proof Status

Visual screenshot:

- `cockpit_fixed.png` — normal Chrome (no `--disable-web-security`) on `http://127.0.0.1:3100`, showing the **CACHED · Bedrock offline** badge and the 11-column table.

API proof (no 4-eyes PNG; Playwright/Puppeteer are not installed):

- `4_eyes_violation_headers.txt` — HTTP 400 from `/approve` with the same person.
- `4_eyes_violation_body.txt` — exact 4-eyes body.
- `audit_chain_verify.json` — 5/5, `mode: DEMO_STATIC`.
- `csv_header.txt` — the exact 11-column header.

The fixed screenshot is the visual proof that CORS and the honest badge work in a normal browser.
