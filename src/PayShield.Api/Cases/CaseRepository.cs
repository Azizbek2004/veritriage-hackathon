using VeriTriage.Domain;

namespace PayShield.Api;

public interface ICaseRepository
{
    DeliverableCsvRow? Get(string caseId);
    IReadOnlyList<DeliverableCsvRow> All { get; }
}

public sealed class CaseRepository : ICaseRepository
{
    private readonly DeliverableState _state;
    public CaseRepository(DeliverableState state) => _state = state;
    public DeliverableCsvRow? Get(string caseId) =>
        _state.Rows.FirstOrDefault(r => r.AlertId.Equals(caseId, StringComparison.OrdinalIgnoreCase));
    public IReadOnlyList<DeliverableCsvRow> All => _state.Rows;
}
