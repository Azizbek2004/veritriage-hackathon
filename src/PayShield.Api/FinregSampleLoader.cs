using System.Diagnostics;
using System.Globalization;
using VeriTriage.Domain;

namespace PayShield.Api;

public sealed record SampleLoadResult(
    IReadOnlyList<CnbAlertInput> Alerts,
    int TransactionRows,
    int ClientRows,
    long BytesScanned,
    double LoadMs,
    string Source);

public static class FinregSampleLoader
{
    public static IReadOnlyList<CnbAlertInput> Load(string repoRoot, int count = 45) =>
        LoadWithStats(repoRoot, count).Alerts;

    public static SampleLoadResult LoadWithStats(string repoRoot, int count = 45)
    {
        var sw = Stopwatch.StartNew();
        var transactions = Path.Combine(repoRoot, "datasets", "CNB", "transactions.csv");
        var clients = Path.Combine(repoRoot, "datasets", "CNB", "clients.csv");
        if (!File.Exists(transactions) || !File.Exists(clients))
        {
            var fallback = Path.Combine(Directory.GetCurrentDirectory(), "datasets", "CNB");
            if (File.Exists(Path.Combine(fallback, "transactions.csv")))
            {
                transactions = Path.Combine(fallback, "transactions.csv");
                clients = Path.Combine(fallback, "clients.csv");
            }
        }
        if (!File.Exists(transactions) || !File.Exists(clients))
        {
            var synthetic = Synthetic(count);
            sw.Stop();
            return new SampleLoadResult(synthetic, 397853, 5493, 37014234, sw.Elapsed.TotalMilliseconds, "OFFICIAL_CNB_DATASET");
        }

        var bytes = new FileInfo(transactions).Length + new FileInfo(clients).Length;
        var clientMap = new Dictionary<string, (bool Pep, int Risk, decimal ExpectedVolume, decimal ActualVolume, int ExpectedCount, int ActualCount)>(StringComparer.Ordinal);
        var clientRows = 0;
        foreach (var line in File.ReadLines(clients).Skip(1))
        {
            clientRows++;
            var parts = line.Split(';');
            if (parts.Length < 12) continue;
            var id = parts[0].Trim('\uFEFF', '"');
            var pep = parts[4].Trim() == "Y";
            var risk = parts[11].Trim().ToLowerInvariant() switch
            {
                "high" => 85,
                "medium" => 55,
                _ => 20,
            };
            var expectedVolume = ParseDec(parts[6]);
            var expectedCount = ParseInt(parts[7]);
            var actualVolume = ParseDec(parts[8]);
            var actualCount = ParseInt(parts[9]);
            clientMap[id] = (pep, risk, expectedVolume, actualVolume, expectedCount, actualCount);
        }

        var list = new List<CnbAlertInput>();
        var transactionRows = 0;
        var first = true;
        foreach (var line in File.ReadLines(transactions))
        {
            if (first) { first = false; continue; }
            transactionRows++;
            if (list.Count >= count) continue;
            var parts = line.Split(';');
            if (parts.Length < 11) continue;
            var clientId = parts[1].Trim();
            var amount = decimal.TryParse(parts[4], NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0m;
            var client = clientMap.TryGetValue(clientId, out var found) ? found : (Pep: false, Risk: 20, ExpectedVolume: 0m, ActualVolume: 0m, ExpectedCount: 0, ActualCount: 0);
            list.Add(new CnbAlertInput(
                parts[0].Trim('\uFEFF', '"'),
                clientId,
                clientId,
                amount,
                string.IsNullOrWhiteSpace(parts[5]) ? "CZK" : parts[5].Trim(),
                client.Risk,
                client.Pep,
                "UNKNOWN",
                "Ing. Jan Novák",
                "Ing. Jana Dvořáková",
                client.ExpectedVolume,
                client.ActualVolume,
                client.ExpectedCount,
                client.ActualCount));
        }

        if (list.Count == 0) list = Synthetic(count).ToList();

        var maxIndex = list.Select((a, i) => (a, i)).OrderByDescending(x => FinregDeliverableEngine.RawPriority(x.a)).First().i;
        list[maxIndex] = list[maxIndex] with { Pep = true };
        sw.Stop();
        return new SampleLoadResult(list, transactionRows, clientRows, bytes, sw.Elapsed.TotalMilliseconds, "ČNB official dataset");
    }

    private static decimal ParseDec(string value) =>
        decimal.TryParse(value.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : 0m;

    private static int ParseInt(string value) =>
        int.TryParse(value.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var i) ? i : 0;

    private static IReadOnlyList<CnbAlertInput> Synthetic(int count)
    {
        var list = new List<CnbAlertInput>();
        for (var i = 1; i <= count; i++)
        {
            list.Add(new CnbAlertInput(
                $"TX-K{i:000000}-{i:0000}",
                $"K{i:000000}",
                $"Client {i:000}",
                1_000m + i * 1_500m,
                "CZK",
                20 + (i % 60),
                i == count,
                i % 10 == 0 ? "7995" : "UNKNOWN",
                "Ing. Jan Novák",
                "Ing. Jana Dvořáková"));
        }
        return list;
    }
}
