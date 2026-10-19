# Contracts — Frozen

These files are the coordination mechanism for the agent team. They were materialized from `blueprint.md` in B-000 on 2026-10-19 and are now frozen. Only a human may change them, after `PROPOSAL.md` plus `DECISION.md`.

## Inventory

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
| `domain/CnbAmlMetadata.cs` | Track 5 pivot | ČNB/AML additive metadata for the case and queue row. |
| `domain/PaymentSlip.cs` | `blueprint.md` section 3 | Human-readable payment instruction. |
| `types/api.d.ts` | `blueprint.md` sections 8–10, `project.md` section 10 | TypeScript mirror of the wire format. |
| `api/openapi.yaml` | `blueprint.md` section 8 | 12-endpoint HTTP contract plus health. |

The namespace is `VeriTriage.Domain`; the verifier namespace is `VeriTriage.Verifier`.

## Approved Additive Deltas

Two additive deltas are approved. Both must be included when B-000 materializes the files. Neither renames an existing field.

### Delta A — `regulatory_clock` (remediation)

- Field: optional `regulatory_clock` on the case detail payload.
- C#: `CaseDetail.RegulatoryClock`, `[JsonPropertyName("regulatory_clock")]`, nullable, default `"PRE_EXECUTION_FREEZE"`.
- TypeScript: `CaseDetail.regulatory_clock?: RegulatoryClock | null`.
- Allowed values: `PRE_EXECUTION_FREEZE`, `UNAUTHORIZED_REFUND`, `IMPERSONATION_DISPUTE`.
- OpenAPI: optional property, nullable enum, not in the schema's `required` list.

### Delta B — `CnbAmlMetadata` (Track 5 AML pivot)

Add `domain/CnbAmlMetadata.cs`:

```csharp
public sealed record CnbAmlMetadata(
    [property: JsonRequired] string CnbTransactionId,
    [property: JsonRequired] string ClientId,
    [property: JsonRequired] string MccCode,
    [property: JsonRequired] bool PepFlag,
    [property: JsonRequired] string AmlRiskRating,
    [property: JsonRequired] string RegulatoryPath);
```

Add the nullable field to `CaseDetail` and `AlertQueueRow` without changing their positional constructors:

```csharp
public CnbAmlMetadata? CnbAml { get; init; }
```

TypeScript mirror:

```ts
export interface CnbAmlMetadata {
  cnbTransactionId: string;
  clientId: string;
  mccCode: string;
  pepFlag: boolean;
  amlRiskRating: "HIGH" | "MEDIUM" | "LOW";
  regulatoryPath: "PSR_ART83_AND_CZECH_AML_S20";
}

// add to CaseDetail and AlertQueueRow
cnbAml?: CnbAmlMetadata | null;
```

OpenAPI: add a `CnbAmlMetadata` schema with all six fields required, then add an optional `cnbAml` property to `CaseDetail` and `AlertQueueRow`:

```yaml
cnbAml:
  allOf:
    - $ref: "#/components/schemas/CnbAmlMetadata"
  nullable: true
```

Rules:

- `amlRiskRating` is one of `HIGH`, `MEDIUM`, `LOW`.
- `regulatoryPath` is `PSR_ART83_AND_CZECH_AML_S20`.
- The ČNB merchant stays in the existing `supplier` field. Do not rename it.
- `net`, `vat`, `gross`, and `ico` stay unchanged.
- Existing tests must still compile; runtime population of `cnbAml` is a product task.

No other contract change is approved. Do not add fields for the demo, the pitch, or a "future" integration.

## Materialization Rules

1. Read `blueprint.md` section 3 for the C# records and sections 8–10 for the HTTP/TypeScript shapes.
2. Transcribe the records exactly, including `[JsonRequired]` and the namespace.
3. Apply Delta A (`regulatory_clock`) and Delta B (`CnbAmlMetadata`).
4. Do not add validation, business logic, comments longer than one line, packages, or helpers.
5. Do not rename a type or an existing field to make the UI easier. The contract is the coordination surface.
6. Compile the C# records before declaring B-000 done.
7. Commit the materialized files as one B-000 commit.

## Freeze Protocol

After B-000, these files are frozen.

- Agents may read them.
- Only a human may change them, after `PROPOSAL.md` and `DECISION.md`.
- A diff touching `contracts/` is an automatic reviewer rejection.
- A missing field is not a reason to edit the contract; it is a reason to stop and propose.
- The pre-approved deltas are `regulatory_clock` and `CnbAmlMetadata`.

## Materialized

B-000 materialized the C# records, TypeScript mirror, and OpenAPI spec on 2026-10-19. The approved additive deltas (`regulatory_clock`, `CnbAmlMetadata`) are included. The files are frozen from this point.
