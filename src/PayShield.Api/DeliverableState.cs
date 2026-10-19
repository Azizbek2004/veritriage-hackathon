using VeriTriage.Domain;

namespace PayShield.Api;

public sealed record DeliverableStats(
    int DeliverableRows,
    int TransactionRows,
    int ClientRows,
    long BytesScanned,
    double LoadMs,
    DateTimeOffset GeneratedAt,
    string Source);

public sealed class DeliverableState
{
    private readonly string _repoRoot;

    public DeliverableState(string repoRoot)
    {
        _repoRoot = repoRoot;
        Reload();
    }

    public IReadOnlyList<DeliverableCsvRow> Rows { get; private set; } = Array.Empty<DeliverableCsvRow>();
    public IReadOnlyList<DeliverableCsvRow> QueueRows { get; private set; } = Array.Empty<DeliverableCsvRow>();
    public DeliverableStats Stats { get; private set; } = new(0, 0, 0, 0, 0, DateTimeOffset.UtcNow, "not loaded");

    public void Reload()
    {
        var load = FinregSampleLoader.LoadWithStats(_repoRoot, 45);
        Rows = FinregDeliverableEngine.ProcessSampleBatch(load.Alerts);
        var queueLoad = FinregSampleLoader.LoadWithStats(_repoRoot, 200);
        var extras = FinregDeliverableEngine.ProcessSampleBatch(queueLoad.Alerts.Skip(45).ToList())
            .Select((row, i) => row with { AlertId = $"ALERT-{46 + i:000}" })
            .ToList();
        QueueRows = Rows.Concat(extras).ToList();
        Stats = new DeliverableStats(
            Rows.Count,
            load.TransactionRows,
            load.ClientRows,
            load.BytesScanned,
            Math.Round(load.LoadMs, 1),
            DateTimeOffset.UtcNow,
            load.Source);
    }
}
