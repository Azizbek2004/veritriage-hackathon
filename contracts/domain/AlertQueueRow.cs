using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record AlertQueueRow(
    [property: JsonRequired] string CaseId,
    [property: JsonRequired] string Supplier,
    [property: JsonRequired] decimal Amount,
    [property: JsonRequired] string Currency,
    [property: JsonRequired] int Tier,
    [property: JsonRequired] int RiskScore,
    [property: JsonRequired] int LlmTokens);
