# Frozen Contracts

These files are the coordination mechanism for the agent team. Agents may read them. Only a human may change them, and only after `PROPOSAL.md` plus `DECISION.md`.

## Contents

| Path | What it is |
|---|---|
| `domain/*.cs` | The frozen C# records, namespace `VeriTriage.Domain`. |
| `types/api.d.ts` | The TypeScript mirror of the wire format (camelCase, except `regulatory_clock`). |
| `api/openapi.yaml` | The HTTP contract: paths, method names, request bodies, response schemas. |

## Approved Post-Remediation Delta

The remediation brief approves exactly one contract change: an optional `regulatory_clock` field on the case detail payload, defaulting to `PRE_EXECUTION_FREEZE`.

- C#: `CaseDetail.RegulatoryClock`, `[JsonPropertyName("regulatory_clock")]`, nullable, default `"PRE_EXECUTION_FREEZE"`.
- TypeScript: `CaseDetail.regulatory_clock?: RegulatoryClock | null`.
- Allowed values: `PRE_EXECUTION_FREEZE`, `UNAUTHORIZED_REFUND`, `IMPERSONATION_DISPUTE`.

No other contract change is approved. Do not add fields for the demo, the pitch, or a "future" integration.

## Provenance

`contracts/domain/` is transcribed from `blueprint.md` section 3. `contracts/api/openapi.yaml` and `contracts/types/api.d.ts` are derived from `blueprint.md` sections 8–10 and `project.md` sections 5 and 10. If a derived detail conflicts with the blueprint, the blueprint wins and the derived file is wrong; write `PROPOSAL.md`.

## How to Change a Contract

1. Write `PROPOSAL.md` with the exact file, line, why the contract cannot satisfy the task, the smallest change, and the risk.
2. Stop. Do not edit the contract.
3. The human writes `DECISION.md` with `FIX_CONTRACT`, the exact scope, and the resume phase.
4. Apply only the approved lines. Commit with the decision reference.

A contract change without a `DECISION.md` is a review rejection and a rollback.
