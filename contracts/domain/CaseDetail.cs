using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record CaseDetail(
    [property: JsonRequired] string Id,
    [property: JsonRequired] string Status,
    [property: JsonRequired] AlertDto Alert,
    [property: JsonRequired] SupplierDto Supplier,
    [property: JsonRequired] Dictionary<string, JsonNode> Evidence,
    [property: JsonRequired] VerificationResult Verification,
    [property: JsonRequired] DecisionDto Decision,
    [property: JsonRequired] ApprovalDto Approval,
    [property: JsonPropertyName("regulatory_clock")] string? RegulatoryClock = "PRE_EXECUTION_FREEZE")
{
    public CnbAmlMetadata? CnbAml { get; init; }
}

public sealed record AlertDto(string Type, decimal Amount, string Currency, string TransactionId);

public sealed record SupplierDto(
    string Name, string Ico, string Dic, string Country, int AgeDays,
    bool UnreliablePayer, string[] PublishedAccounts);

public sealed record DecisionDto(
    string Outcome, int RiskScore, string RulesVersion,
    string AgentRecommendation, bool OverriddenByVerifier,
    List<RuleHitDto> Reasons);

public sealed record RuleHitDto(
    string RuleId, int Severity, string LegalRef, string Title, string Detail);

public sealed record ApprovalDto(
    bool Required, bool SignatureVerified, string? SignatureB64, string? PayloadHash);
