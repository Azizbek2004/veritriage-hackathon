# Screenshot / Proof Status

Playwright and Puppeteer are **not installed**. `npx --no-install playwright` fails with a missing-package error, and `puppeteer` is absent. No package was added.

Per the stage-readiness brief, API proof was captured with `curl`:

- `4_eyes_violation_headers.txt` — HTTP headers (expect 400).
- `4_eyes_violation_body.txt` — exact violation body.
- `audit_chain_verify.json` — five events, `chain_valid: true`, `verified_events: 5`.
- `csv_header.txt` — the exact 11-column header.

There is no `4_eyes_violation.png` because no browser automation was available. A real visual screenshot would require the human to run the app and capture it, or to install Playwright (out of scope).
