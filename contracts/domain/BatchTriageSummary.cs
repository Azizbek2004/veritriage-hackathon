using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record BatchTriageSummary(
    [property: JsonRequired] int TotalProcessed,
    [property: JsonRequired] int Tier1AutoCleared,
    [property: JsonRequired] int Tier2StepUpHold,
    [property: JsonRequired] int Tier3Escalated,
    [property: JsonRequired] double ElapsedMilliseconds,
    [property: JsonRequired] int LlmTokensConsumedByTier1And2,
    [property: JsonRequired] IReadOnlyList<AlertQueueRow> ShowcaseRows);
