# Contracts — Plan Only

This directory contains the contract **plan**, not the contract files. The product is intentionally unbuilt. The AI agent materializes the actual C# records, TypeScript mirror, and OpenAPI spec in bootstrap task **B-000** from `blueprint.md` and then freezes them.

If `contracts/domain/`, `contracts/types/`, or `contracts/api/` are missing, the product is not bootstrapped. Do not improvise contract code. Run `BOOTSTRAP.md`.

## Planned Inventory

| Path | Source | Purpose |
|---|---|---|
| `domain/EvidenceEnvelope.cs` | `blueprint.md` section 3 | Case id, canonical evidence root, gather time. |
| `domain/TextractProvenance.cs` | `blueprint.md` section 3 | OCR confidence and bounding box; includes `BoundingBox`. |
| `domain/ClaimAssertion.cs` | `blueprint.md` section 3 | Claim id, type, narrative, JSON pointers, expected values, provenance. |
| `domain/ProofStep.cs` | `blueprint.md` section 3 | One recomputation or constraint check. |
| `domain/VerificationResult.cs` | `blueprint.md` section 3 | Valid flag, engine counts, proof steps, receipt hash. |
| `domain/AlertQueueRow.cs` | `blueprint.md` section 3 | Queue row with tier, risk, tokens. |
| `domain/BatchTriageSummary.cs` | `blueprint.md` section 3 | 82/14/4 counters and showcase rows. |
| `domain/ServerAttestation.cs` | `blueprint.md` section 3 | Algorithm, thumbprint, custody label, signature. |
| `domain/CaseDetail.cs` | `blueprint.md` section 3 | Full case view and the alert/supplier/decision/approval DTOs. |
| `domain/PaymentSlip.cs` | `blueprint.md` section 3 | Human-readable payment instruction. |
| `types/api.d.ts` | `blueprint.md` sections 8–10, `project.md` section 10 | TypeScript mirror of the wire format. |
| `api/openapi.yaml` | `blueprint.md` section 8 | 12-endpoint HTTP contract plus health. |

The planned namespace is `VeriTriage.Domain`; the planned verifier namespace is `VeriTriage.Verifier`.

## Approved Post-Remediation Delta

The remediation brief approves exactly one contract change. It must be included when B-000 materializes the files:

- Field: optional `regulatory_clock` on the case detail payload.
- C#: `CaseDetail.RegulatoryClock`, `[JsonPropertyName("regulatory_clock")]`, nullable, default `"PRE_EXECUTION_FREEZE"`.
- TypeScript: `CaseDetail.regulatory_clock?: RegulatoryClock | null`.
- Allowed values: `PRE_EXECUTION_FREEZE`, `UNAUTHORIZED_REFUND`, `IMPERSONATION_DISPUTE`.
- OpenAPI: optional property, nullable enum, not in the schema's `required` list.

No other contract change is approved. Do not add fields for the demo, the pitch, or a "future" integration.

## Materialization Rules

1. Read `blueprint.md` section 3 for the C# records and sections 8–10 for the HTTP/TypeScript shapes.
2. Transcribe the records exactly, including `[JsonRequired]` and the namespace.
3. Apply the approved `regulatory_clock` delta.
4. Do not add validation, business logic, comments longer than one line, packages, or helpers.
5. Do not rename a type to make the UI easier. The contract is the coordination surface.
6. Compile the C# records before declaring B-000 done.
7. Commit the materialized files as one B-000 commit.

## Freeze Protocol

After B-000, these files are frozen.

- Agents may read them.
- Only a human may change them, after `PROPOSAL.md` and `DECISION.md`.
- A diff touching `contracts/` is an automatic reviewer rejection.
- A missing field is not a reason to edit the contract; it is a reason to stop and propose.
- The only pre-approved delta is `regulatory_clock`.

## Why It Is Empty Now

The environment bootstrap was intentionally scoped to process, not product. Writing the contracts would have been the first product task, and the user asked for the environment only. B-000 restores the original blueprint assumption that the contracts exist before the first feature task.
