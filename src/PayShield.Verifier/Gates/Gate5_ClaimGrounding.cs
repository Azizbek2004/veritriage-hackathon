using System.Text.Json.Nodes;
using VeriTriage.Domain;

namespace VeriTriage.Verifier;

public static class Gate5_ClaimGrounding
{
    public static GateResult Check(EvidenceEnvelope envelope, ClaimAssertion[] claims)
    {
        var steps = new List<ProofStep>();
        var count = 0;

        foreach (var claim in claims)
        {
            for (var i = 0; i < claim.JsonPointers.Length; i++)
            {
                count++;
                var pointer = claim.JsonPointers[i];
                var expected = claim.ExpectedValues[i];
                JsonNode? resolved = null;
                try
                {
                    resolved = JsonPointerResolver.Resolve(envelope.Root, pointer);
                }
                catch
                {
                    resolved = null;
                }
                var valid = resolved is not null && resolved.ToString() == expected;
                steps.Add(new ProofStep(claim.ClaimId, null, null, null, null, pointer, valid, valid, null));
                if (!valid)
                {
                    return new GateResult(false, "grounding", count, steps, $"pointer did not ground: {pointer}");
                }
            }
        }

        return new GateResult(true, "grounding", count, steps, null);
    }
}
