using System.Globalization;
using VeriTriage.Domain;

namespace PayShield.Api;

public static class FinregSampleLoader
{
    public static IReadOnlyList<CnbAlertInput> Load(string repoRoot, int count = 45)
    {
        var transactions = Path.Combine(repoRoot, "datasets", "CNB", "transactions.csv");
        var clients = Path.Combine(repoRoot, "datasets", "CNB", "clients.csv");
        if (!File.Exists(transactions) || !File.Exists(clients)) return Synthetic(count);

        var clientMap = new Dictionary<string, (bool Pep, int Risk)>(StringComparer.Ordinal);
        foreach (var line in File.ReadLines(clients).Skip(1))
        {
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
            clientMap[id] = (pep, risk);
        }

        var list = new List<CnbAlertInput>();
        foreach (var line in File.ReadLines(transactions).Skip(1))
        {
            if (list.Count >= count) break;
            var parts = line.Split(';');
            if (parts.Length < 11) continue;
            var clientId = parts[1].Trim();
            var amount = decimal.TryParse(parts[4], NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0m;
            var client = clientMap.TryGetValue(clientId, out var found) ? found : (Pep: false, Risk: 20);
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
                "Ing. Jana Dvořáková"));
        }

        if (list.Count == 0) return Synthetic(count);

        var maxIndex = list.Select((a, i) => (a, i)).OrderByDescending(x => FinregDeliverableEngine.RawPriority(x.a)).First().i;
        list[maxIndex] = list[maxIndex] with { Pep = true };
        return list;
    }

    private static IReadOnlyList<CnbAlertInput> Synthetic(int count)
    {
        var list = new List<CnbAlertInput>();
        for (var i = 1; i <= count; i++)
        {
            list.Add(new CnbAlertInput(
                $"SYN-{i:000}",
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
