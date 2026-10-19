using VeriTriage.Domain;

namespace VeriTriage.Verifier;

public static class Gate1_Schema
{
    public static GateResult Check(EvidenceEnvelope envelope, ClaimAssertion[] claims)
    {
        var steps = new List<ProofStep>();
        var reason = string.Empty;

        void Field(string name, bool valid)
        {
            steps.Add(new ProofStep(name, null, null, null, null, name, valid, valid, null));
            if (!valid && reason.Length == 0) reason = $"schema: {name}";
        }

        Field("case_id", !string.IsNullOrWhiteSpace(envelope.CaseId));
        Field("root", envelope.Root is not null);
        Field("claims", claims is not null);

        if (claims is not null)
        {
            foreach (var claim in claims)
            {
                Field("claim_id", !string.IsNullOrWhiteSpace(claim.ClaimId));
                Field("claim_type", !string.IsNullOrWhiteSpace(claim.ClaimType));
                Field("narrative", !string.IsNullOrWhiteSpace(claim.NarrativeTemplate));
                Field("pointers", claim.JsonPointers is { Length: > 0 });
                Field("values", claim.ExpectedValues is { Length: > 0 });
                Field("pointer_value_lengths", claim.JsonPointers?.Length == claim.ExpectedValues?.Length);
            }
        }

        return new GateResult(reason.Length == 0, "schema", steps.Count, steps, reason.Length == 0 ? null : reason);
    }
}
