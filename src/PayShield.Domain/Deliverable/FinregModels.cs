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

public sealed record FinregDeliverableRow(
    string AlertId,
    string ClientId,
    string ClientName,
    string Triage,
    int Priority,
    string Role,
    string ExecutivePerson,
    string Approver,
    string FourEyesStatus,
    string LegalBasis,
    string Reason);

public sealed record FourEyesRequest(string Executive, string Approver);
