# Architectural & Dependency Decisions (DECISION.md)

## DECISION-2026-10-20-01: Modern Graph Visualization Libraries (d3 & lucide-react)

- **Date:** 2026-10-20
- **Status:** APPROVED (Requested by User)
- **Context:**
  The user explicitly requested: *"further redesign and advacne the graph following the current design logic; use more modern libraries needed ;"*.
- **Approved Packages in `apps/web`:**
  1. `d3` (^7.9.0) & `@types/d3` (^7.4.3): Pure, lightweight industry standard for force-directed network simulation, smooth bezier link curves, zooming, panning, and particle animation.
  2. `lucide-react` (^1.16.0): Modern, consistent iconography for forensic actions (network, shield-alert, zoom, download, clock, coins).
- **Compliance Guardrails:**
  - Zero server-side runtime dependency (installed solely in `apps/web`).
  - No change to frozen contracts in `contracts/domain/`, `contracts/types/`, or verifier rules.
  - Fully compatible with Next.js 15 and React 19.
