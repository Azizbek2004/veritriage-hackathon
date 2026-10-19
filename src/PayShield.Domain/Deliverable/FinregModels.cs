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
    string Approver);

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
    string Log);

public sealed record FourEyesRequest(string Executive, string Approver);

public sealed record ApproveRequest(
    [property: JsonPropertyName("signature_b64")] string SignatureB64,
    [property: JsonPropertyName("approver_id")] string ApproverId);

public sealed record ApproveResponse(
    string Status,
    [property: JsonPropertyName("audit_hash")] string AuditHash);
