using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using VeriTriage.Domain;

namespace VeriTriage.Verifier;

public sealed class VerifierPipeline
{
    public VerificationResult Evaluate(EvidenceEnvelope envelope, ClaimAssertion[] claims)
    {
        var engines = new Dictionary<string, int>();
        var steps = new List<ProofStep>();

        var g1 = Gate1_Schema.Check(envelope, claims);
        engines["schema"] = g1.Count;
        steps.AddRange(g1.Steps);
        if (!g1.Passed) return Fail(envelope, engines, steps, "schema");

        var g2 = Gate2_SecondHopPolicy.Check(envelope);
        engines["second_hop"] = g2.Count;
        steps.AddRange(g2.Steps);
        if (!g2.Passed) return Fail(envelope, engines, steps, "second_hop");

        var g3 = Gate3_OcrProvenance.Check(envelope, claims);
        engines["ocr"] = g3.Count;
        steps.AddRange(g3.Steps);
        if (!g3.Passed) return Fail(envelope, engines, steps, "ocr");

        var g4 = Gate4_Arithmetic.Check(envelope, claims);
        engines["arithmetic"] = g4.Count;
        steps.AddRange(g4.Steps);
        if (!g4.Passed) return Fail(envelope, engines, steps, "arithmetic");

        var g5 = Gate5_ClaimGrounding.Check(envelope, claims);
        engines["grounding"] = g5.Count;
        steps.AddRange(g5.Steps);
        if (!g5.Passed) return Fail(envelope, engines, steps, "grounding");

        return new VerificationResult(true, engines, steps, ComputeReceiptHash(envelope, engines, steps), null);
    }

    private static VerificationResult Fail(EvidenceEnvelope envelope, Dictionary<string, int> engines, List<ProofStep> steps, string reason)
    {
        foreach (var gate in new[] { "schema", "second_hop", "ocr", "arithmetic", "grounding" })
        {
            engines.TryAdd(gate, 0);
        }
        return new VerificationResult(false, engines, steps, ComputeReceiptHash(envelope, engines, steps), reason);
    }

    private static string ComputeReceiptHash(EvidenceEnvelope envelope, Dictionary<string, int> engines, List<ProofStep> steps)
    {
        var canonical = JsonSerializer.Serialize(new { envelope.CaseId, engines, steps },
            new JsonSerializerOptions { WriteIndented = false });
        return "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
    }
}
