namespace VeriTriage.Domain;

public sealed record PaymentSlip(
    string Beneficiary, string Account, string Amount,
    string? Vs, string? Ss, string? Ks, string? Message, string LegalRef);
