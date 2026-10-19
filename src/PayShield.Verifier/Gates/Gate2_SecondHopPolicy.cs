using System.Text.Json.Nodes;
using VeriTriage.Domain;

namespace VeriTriage.Verifier;

public static class Gate2_SecondHopPolicy
{
    public static GateResult Check(EvidenceEnvelope envelope)
    {
        var steps = new List<ProofStep>();
        var hops = envelope.Root?["agent"]?["hops"] as JsonArray;
        var count = hops?.Count ?? 0;

        if (count is < 1 or > 2)
        {
            return new GateResult(false, "second_hop", count, steps, "hop_count must be 1 or 2");
        }

        foreach (var hop in hops!)
        {
            steps.Add(new ProofStep(null, null, null, null, null, "hop", true, true, null));
        }

        var envelopeIco = envelope.Root?["supplier"]?["ico"]?.ToString();
        var hop2Ico = hops[1]?["targetIco"]?.ToString();
        var sameIco = !string.IsNullOrWhiteSpace(envelopeIco) && envelopeIco == hop2Ico;
        steps.Add(new ProofStep(null, null, null, null, "scope_invariant: hop_count <= 2 AND hop2.ico == hop1.ico", null, sameIco, sameIco, null));

        if (!sameIco)
        {
            return new GateResult(false, "second_hop", count, steps, "hop2.ico != envelope.ico");
        }

        return new GateResult(true, "second_hop", count, steps, null);
    }
}
