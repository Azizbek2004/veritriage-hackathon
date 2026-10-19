# Production Hardening Cutoff

- **Started:** 2026-10-19T16:08:18+02:00 (Europe/Prague)
- **Agent cutoff:** **2026-10-20T02:08:18+02:00** (10 hours)
- **Human rehearsal cutoff:** 2 hours before the actual pitch slot. The pitch time is not in the repo; the human must enforce this separately.

If the current time exceeds the agent cutoff, stop all code changes, commit only green work, and write `STOPPED.md`.

The demo path must remain intact:
CSV download → REVIEW row → 4-eyes violation → independent approval → audit tab, in a normal browser on port 3100.
