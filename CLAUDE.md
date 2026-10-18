# Claude Code

Read `AGENTS.md` first. It is the canonical source of truth.

This repository is the agent environment, not the product. Do not create product code until the human points you to `BOOTSTRAP.md`.

Do not run `npm install`, `dotnet add package`, or any package install. The human owns packages and fixtures.

Do not edit `contracts/` (the README is the plan) or `fixtures/`. B-000 materializes the contract files. Do not edit `tests/golden/`.

After the product scaffold and the remediation baseline are green, follow `.agents/orchestrator.md` and `.agents/remediation.md` exactly. The orchestrator starts only after `BOOTSTRAP.md` is complete.

Use the skills in `.skills/` when the active phase names them.
