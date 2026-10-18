using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record VerificationResult(
    [property: JsonRequired] bool Valid,
    [property: JsonRequired] Dictionary<string, int> Engines,
    [property: JsonRequired] List<ProofStep> ProofSteps,
    [property: JsonRequired] string ReceiptHash,
    string? FailureReason);
