namespace VeriTriage.Domain;

public sealed record ProofStep(
    string? Claim, decimal? Computed, decimal? Baseline, decimal? Ratio,
    string? Constraint, string? Condition, bool? Satisfied,
    bool Valid, string? LegalRef);
