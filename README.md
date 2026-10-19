# VeriTriage — Agent Environment

This repository is the VeriTriage agent environment plus a green backend verifier/rules slice. The frontend, mobile app, most API endpoints, and live Bedrock call are not built. See `FINAL_REPORT.md` and `BUILD_LOG.md` for the exact state.

## What Is Here

| Path | Purpose |
|---|---|
| `AGENTS.md` | Canonical source of truth: product, frozen rules, post-remediation positioning, time gates. |
| `BOOTSTRAP.md` | The one-time product scaffold instructions. Run this before the orchestrator. |
| `.agents/` | Orchestrator, analyzer, implementer, evaluator, reviewer, state machine, human handoff, remediation, Q&A war room. |
| `.skills/` | `ponytail`, `test-first`, `no-slop-verifier`, `scope-guard`, `signalr-checklist`. |
| `contracts/` | Frozen C#/TS/OpenAPI contracts; materialized 2026-10-19. |
| `BACKLOG.md` | Ordered build tasks and the bootstrap phase. |
| `REMEDIATION.md` | Bounded seven-change post-baseline delta plan. |
| `pitch/` | Post-remediation opening, deployment slide, throughput math. |
| `evaluation/` | Evaluation-input status. No fabricated report. |
| `fixtures/` | Fixture inventory. Official data is acquired in `datasets/` (gitignored). |
| `.github/workflows/ci.yml` | Backend test + ponytail gate; web steps run when `apps/web` exists. |

## What Is Intentionally Absent

- `apps/web` and `apps/mobile` — not built.
- API endpoints beyond `/api/v1/health` — not built.
- `fixtures/` committed data — official data stays in `datasets/` (gitignored).
- `tests/golden/` snapshots — not created yet.
- `node_modules`, build outputs, SDKs.

Backend baseline: `dotnet build` green, `dotnet test` 16/16. Frontend/mobile are not built. See `BUILD_LOG.md` and `FINAL_REPORT.md`.

## Start Order

1. **Human:** read `contracts/README.md`, `fixtures/README.md`, `evaluation/README.md`, and `REMEDIATION.md`. Populate fixtures. Approve the package set. Confirm the 68–72% post-remediation estimate, not 81%.
2. **Build state:** B-000/B-001/B-002 are complete. Next: B-003/B-004 (web/mobile shells), then API/cockpit/mobile. See `BUILD_LOG.md`.
3. **Bedrock:** blocked on refreshed TeamAdmin invoke credentials; see `WAITING_FOR_CREDENTIALS.md`.
4. **Datasets:** official data is in `datasets/`; see `DATASET_INVENTORY.md`.
5. **Humans:** approve the frontend/mobile package set and decide the MCC mapping in `PROPOSAL.md`.

## The One Rule That Matters

The agent proposes. The verifier proves. The human signs. Every task ends with a test. Every commit is gated by an independent evaluator and a diff-first reviewer. No contract drift once the contracts are materialized, no package drift, no scope creep.

## Key Documents

- Frozen rules: `AGENTS.md`
- Contract plan: `contracts/README.md`
- Product scaffold: `BOOTSTRAP.md`
- Remediation delta: `REMEDIATION.md`
- Q&A drill: `.agents/QA_WAR_ROOM.md`
- Human escalation: `.agents/human-handoff.md`
- Original blueprint: `blueprint.md`
- Original narrative: `project.md`
