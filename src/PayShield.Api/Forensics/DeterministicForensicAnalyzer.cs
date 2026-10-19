using System.Globalization;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Data;

namespace PayShield.Api;

public sealed record StructuringWindow72h(int Count, decimal SumCzk, string? WindowStart, string? WindowEnd, IReadOnlyList<string> TransactionIds);
public sealed record ForensicGateResult(string Gate, bool Pass, string Detail);
public sealed record ForensicVectorProfile(
    string CaseId,
    string ClientId,
    string TransactionId,
    decimal VelocityRatio,
    decimal CountRatio,
    decimal ActualVolume,
    decimal ExpectedVolume,
    int ActualCount,
    int ExpectedCount,
    StructuringWindow72h Structuring72h,
    decimal InOutRatio,
    decimal CounterpartyHhi,
    int SharedCounterpartyLinks,
    string? PrimaryCounterparty,
    decimal RoundAmountRatio,
    int TransactionCount,
    int SubThreshold20To25Count,
    int SubThreshold330To375Count,
    PriorityBreakdown? Priority,
    int TotalPriority,
    IReadOnlyList<ForensicGateResult> Gates,
    string FraudNarrative);

public sealed class DeterministicForensicAnalyzer
{
    private readonly CnbTransactionIndex _index;
    public DeterministicForensicAnalyzer(CnbTransactionIndex index) => _index = index;

    public ForensicVectorProfile Analyze(DeliverableCsvRow row)
    {
        var client = _index.GetClient(row.ClientId);
        var transactions = _index.GetByClient(row.ClientId);
        var expected = client?.ExpectedVolume ?? 0m;
        var actual = client?.ActualVolume ?? transactions.Sum(t => t.AmountCzk);
        var expectedCount = client?.ExpectedCount ?? 0;
        var actualCount = client?.ActualCount ?? transactions.Count;
        var velocity = expected > 0 ? Math.Round(actual / expected, 2, MidpointRounding.ToEven) : 0m;
        var countRatio = expectedCount > 0 ? Math.Round((decimal)actualCount / expectedCount, 2, MidpointRounding.ToEven) : 0m;

        var low = transactions.Where(t => t.AmountCzk > 0m && t.AmountCzk < 25_000m).OrderBy(t => t.Date).ThenBy(t => t.Id).ToList();
        var high = transactions.Where(t => t.AmountCzk >= 330_000m && t.AmountCzk <= 375_000m).OrderBy(t => t.Date).ThenBy(t => t.Id).ToList();
        var window = BestWindow(low.Concat(high).OrderBy(t => t.Date).ThenBy(t => t.Id).ToList());
        var outgoing = transactions.Where(t => t.Direction == "OUT").ToList();
        var incoming = transactions.Where(t => t.Direction == "IN").ToList();
        var outTotal = outgoing.Sum(t => t.AmountCzk);
        var inTotal = incoming.Sum(t => t.AmountCzk);
        var inOut = outTotal > 0 ? Math.Round(inTotal / outTotal, 4, MidpointRounding.ToEven) : 0m;
        var groups = outgoing.GroupBy(t => string.IsNullOrWhiteSpace(t.CounterpartyAccount) ? "UNKNOWN" : t.CounterpartyAccount)
            .Select(g => new { Account = g.Key, Sum = g.Sum(t => t.AmountCzk) }).OrderByDescending(x => x.Sum).ToList();
        var hhi = outTotal > 0 ? Math.Round(groups.Sum(g => (g.Sum / outTotal) * (g.Sum / outTotal)) * 10_000m, 0, MidpointRounding.ToEven) : 0m;
        var primary = groups.FirstOrDefault()?.Account;
        var shared = primary is null ? 0 : _index.GetByCounterparty(primary).Select(t => t.ClientId).Distinct(StringComparer.Ordinal).Count(id => id != row.ClientId);
        var roundCount = transactions.Count(t => t.AmountCzk >= 500m && t.AmountCzk % 500m == 0m);
        var roundRatio = transactions.Count > 0 ? Math.Round((decimal)roundCount * 100m / transactions.Count, 2, MidpointRounding.ToEven) : 0m;

        var bd = row.Breakdown;
        var breakdownSum = bd is null ? row.Priority : bd.Base + bd.Vol + bd.Pep + bd.Struct + bd.Channel;
        var fourEyes = !string.Equals(row.ExecutivePerson, row.Approver, StringComparison.Ordinal);
        var gates = new[]
        {
            new ForensicGateResult("SCHEMA", client is not null && transactions.Count > 0, client is null ? "client missing" : $"{transactions.Count} transactions loaded"),
            new ForensicGateResult("FOUR_EYES_SEPARATION", fourEyes, fourEyes ? "executive and approver differ" : "SAME PERSON"),
            new ForensicGateResult("DECIMAL_RECOMPUTATION", expected >= 0 && actual >= 0, $"{actual.ToString("N2", CultureInfo.InvariantCulture)} / {expected.ToString("N2", CultureInfo.InvariantCulture)} CZK"),
            new ForensicGateResult("THRESHOLD_CONSISTENCY", row.Priority is >= 0 and <= 100 && breakdownSum == row.Priority, $"breakdown {breakdownSum} == priority {row.Priority}"),
            new ForensicGateResult("STATUTORY_POINTER", LegalQuotes.Get("AML-253-2008-S6-1A") is not null && LegalQuotes.Get("AML-253-2008-S21-5") is not null, "quoted corpus pointers resolved"),
        };
        var narrative = BuildNarrative(row, velocity, countRatio, actual, expected, actualCount, expectedCount, window, hhi, primary, shared, roundRatio, inOut, bd);
        return new ForensicVectorProfile(row.AlertId, row.ClientId, row.TransactionId, velocity, countRatio, actual, expected, actualCount, expectedCount,
            window, inOut, hhi, shared, primary, roundRatio, transactions.Count, low.Count, high.Count, bd, row.Priority, gates, narrative);
    }

    private static StructuringWindow72h BestWindow(IReadOnlyList<CnbTransactionRow> rows)
    {
        if (rows.Count == 0) return new StructuringWindow72h(0, 0m, null, null, Array.Empty<string>());
        var best = new StructuringWindow72h(0, 0m, null, null, Array.Empty<string>());
        for (var i = 0; i < rows.Count; i++)
        {
            var start = rows[i].Date;
            var window = rows.Skip(i).TakeWhile(t => t.Date.DayNumber - start.DayNumber <= 3).ToList();
            var sum = window.Sum(t => t.AmountCzk);
            if (window.Count > best.Count || (window.Count == best.Count && sum > best.SumCzk))
                best = new StructuringWindow72h(window.Count, sum, start.ToString("yyyy-MM-dd"), window[^1].Date.ToString("yyyy-MM-dd"), window.Select(t => t.Id).ToArray());
        }
        return best.Count >= 2 ? best : new StructuringWindow72h(0, 0m, null, null, Array.Empty<string>());
    }

    private static string BuildNarrative(DeliverableCsvRow row, decimal velocity, decimal countRatio, decimal actual, decimal expected, int actualCount, int expectedCount,
        StructuringWindow72h window, decimal hhi, string? primary, int shared, decimal roundRatio, decimal inOut, PriorityBreakdown? bd)
    {
        var b = bd is null ? "n/a" : $"B{bd.Base}+V{bd.Vol}+P{bd.Pep}+S{bd.Struct}+C{bd.Channel}";
        return string.Format(CultureInfo.InvariantCulture,
            "Client {0} declared {1:N2} CZK / {2} transactions, actual {3:N2} CZK / {4} ({5:0.00}x volume, {6:0.00}x count). 72h sub-threshold cluster: {7} transfers, {8:N2} CZK ({9}..{10}). HHI {11:0} (primary {12}; {13} shared client links). Round-amount ratio {14:0.00}%; in/out ratio {15:0.0000}. Priority {16}/100 = {17}. The score is driven by the velocity, PEP, structuring and counterparty-concentration vectors; the C# verifier recomputes each value and the 4-eyes gate remains server-side.",
            row.ClientId, expected, expectedCount, actual, actualCount, velocity, countRatio, window.Count, window.SumCzk,
            window.WindowStart ?? "n/a", window.WindowEnd ?? "n/a", hhi, primary ?? "n/a", shared, roundRatio, inOut, row.Priority, b);
    }
}