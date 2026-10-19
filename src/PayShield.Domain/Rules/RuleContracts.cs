namespace VeriTriage.Domain;

public sealed record RuleInput
{
    public bool IcoValid { get; init; } = true;
    public bool IbanValid { get; init; } = true;
    public bool IbanInPublishedAccounts { get; init; }
    public decimal Net { get; init; }
    public decimal Vat { get; init; }
    public decimal Gross { get; init; }
    public bool SanctionsHit { get; init; }
    public string VopStatus { get; init; } = "MATCH";
    public bool IbanChanged { get; init; }
    public int TransactionCount24h { get; init; }
    public int VelocityBaseline { get; init; }
    public int EntityAgeDays { get; init; } = 365;
    public decimal AmountCzk { get; init; }
    public bool VerifierValid { get; init; } = true;
    public bool PepFlag { get; init; }
    public string MccCode { get; init; } = string.Empty;
}

public sealed record RuleHit(string RuleId, int Severity, string Outcome, string LegalRef, string Title);

public sealed record RuleDecision(string Outcome, int RiskScore, IReadOnlyList<RuleHit> Hits);
