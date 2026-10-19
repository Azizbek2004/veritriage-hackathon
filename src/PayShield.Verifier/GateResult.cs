using VeriTriage.Domain;

namespace VeriTriage.Verifier;

public sealed record GateResult(bool Passed, string Engine, int Count, List<ProofStep> Steps, string? Reason);
