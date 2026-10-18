# VeriTriage — Agent Environment

This repository is the self-organizing engineering environment for VeriTriage. It is **not** the product build. Product code is intentionally absent so the AI agent can create it from a clean, frozen starting point.

## What Is Here

| Path | Purpose |
|---|---|
| `AGENTS.md` | Canonical source of truth: product, frozen rules, post-remediation positioning, time gates. |
| `BOOTSTRAP.md` | The one-time product scaffold instructions. Run this before the orchestrator. |
| `.agents/` | Orchestrator, analyzer, implementer, evaluator, reviewer, state machine, human handoff, remediation, Q&A war room. |
| `.skills/` | `ponytail`, `test-first`, `no-slop-verifier`, `scope-guard`, `signalr-checklist`. |
| `contracts/` | Frozen C# domain records, TypeScript mirror, OpenAPI spec. |
| `BACKLOG.md` | Ordered build tasks and the bootstrap phase. |
| `REMEDIATION.md` | Bounded seven-change post-baseline delta plan. |
| `pitch/` | Post-remediation opening, deployment slide, throughput math. |
| `evaluation/` | Evaluation-input status. No fabricated report. |
| `fixtures/` | Fixture inventory and acquisition checklist. Data is pending. |
| `.github/workflows/ci.yml` | Test + ponytail gate. Inactive until the product scaffold exists. |

## What Is Intentionally Absent

- `src/`, `apps/`, and `tests/PayShield.Tests` — created by `BOOTSTRAP.md`.
- `fixtures/` data — human-owned; agents must not invent ARES or Textract data.
- `tests/golden/` snapshots — created after the verifier is implemented and approved.
- Installed packages, `node_modules`, build outputs, SDKs.

No product test baseline is included. The product scaffold and its generated build outputs were removed so the AI agent starts clean. The original "expect one failing test" readiness line is superseded by the environment-only scope. The first failing test is created by `BOOTSTRAP.md`, not by this setup.

## Start Order

1. **Human:** read `contracts/README.md`, `fixtures/README.md`, `evaluation/README.md`, and `REMEDIATION.md`. Populate fixtures. Approve the package set. Confirm the 68–72% post-remediation estimate, not 81%.
2. **AI agent:** read `AGENTS.md`, then execute `BOOTSTRAP.md`. Create the .NET 9 solution, web/mobile shells, test harness, and the VT-001 red test. Commit.
3. **AI agent:** prove the baseline: `dotnet test` exactly one intended failure; `npm test` and `npm run build` green. Then launch the orchestrator with `Read .agents/orchestrator.md and begin Phase 1.`
4. **AI agent:** as the owning tasks land, fold in the seven remediation deltas from `REMEDIATION.md`. After all seven are green, run the remediation verification pass and write `EXTENDED_FINDINGS.md`.
5. **Humans:** rehearse the OCR drop and QR sign. No new scope after H+20.

## The One Rule That Matters

The agent proposes. The verifier proves. The human signs. Every task ends with a test. Every commit is gated by an independent evaluator and a diff-first reviewer. No contract drift, no package drift, no scope creep.

## Key Documents

- Frozen rules: `AGENTS.md`
- Product scaffold: `BOOTSTRAP.md`
- Remediation delta: `REMEDIATION.md`
- Q&A drill: `.agents/QA_WAR_ROOM.md`
- Human escalation: `.agents/human-handoff.md`
- Original blueprint: `blueprint.md`
- Original narrative: `project.md`
