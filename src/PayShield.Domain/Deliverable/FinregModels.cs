using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record CnbAlertInput(
    string AlertId,
    string ClientId,
    string ClientName,
    decimal AmountCzk,
    string Currency,
    int RiskScore,
    bool Pep,
    string MccCode,
    string ExecutivePerson,
    string Approver,
    decimal ExpectedVolume = 0m,
    decimal ActualVolume = 0m,
    int ExpectedCount = 0,
    int ActualCount = 0);

public sealed record PriorityInputs(
    [property: JsonPropertyName("base_tier")] string BaseTier,
    [property: JsonPropertyName("vol_ratio")] decimal VolRatio,
    [property: JsonPropertyName("count_ratio")] decimal CountRatio,
    [property: JsonPropertyName("is_pep")] bool IsPep,
    [property: JsonPropertyName("has_structuring")] bool HasStructuring,
    [property: JsonPropertyName("is_new_remote")] bool IsNewRemote,
    [property: JsonPropertyName("base_score")] int BaseScore,
    [property: JsonPropertyName("vol_score")] int VolScore,
    [property: JsonPropertyName("pep_score")] int PepScore,
    [property: JsonPropertyName("struct_score")] int StructScore,
    [property: JsonPropertyName("channel_score")] int ChannelScore);

public sealed record PriorityComponents(int Base, int Vol, int Pep, int Struct, int Channel);
public sealed record PriorityResult(int RawPriority, int DisplayPriority);
public sealed record ConfidenceEvidence(bool AresBasicFetched, bool AresIcoMatches, bool AresVrFetched, bool ActiveDirectorsResolved, decimal OcrConfidence, int CounterpartySiblingCount);

public sealed record PriorityBreakdown(
    int Base,
    int Vol,
    int Pep,
    int Struct,
    int Channel,
    bool Overridden = false);

public sealed record DeliverableCsvRow(
    string AlertId,
    string AlertType,
    string ClientId,
    string TransactionId,
    string Triage,
    int Priority,
    string ExecutiveRole,
    string ExecutivePerson,
    string Approver,
    string Reason,
    string Log,
    [property: JsonPropertyName("priority_breakdown")] PriorityBreakdown? Breakdown = null,
    [property: JsonPropertyName("priority_raw")] int PriorityRaw = 0,
    [property: JsonPropertyName("rank")] int Rank = 0,
    [property: JsonPropertyName("rank_total")] int RankTotal = 0,
    [property: JsonPropertyName("evidence_score")] int EvidenceScore = 0,
    [property: JsonPropertyName("confidence_score")] int ConfidenceScore = 0,
    [property: JsonPropertyName("inputs")] PriorityInputs? Inputs = null);

public sealed record FourEyesRequest(string Executive, string Approver);

public sealed record ApproveRequest(
    [property: JsonPropertyName("signature_b64")] string SignatureB64,
    [property: JsonPropertyName("approver_id")] string ApproverId);

public sealed record ApproveResponse(
    string Status,
    [property: JsonPropertyName("audit_hash")] string AuditHash);

public sealed record StressTestRequest([property: JsonPropertyName("sample_size")] int SampleSize);
