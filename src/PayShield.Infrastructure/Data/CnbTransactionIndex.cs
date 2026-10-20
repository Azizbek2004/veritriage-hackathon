using System.Globalization;

namespace VeriTriage.Infrastructure.Data;

public sealed record CnbTransactionRow(
    string Id,
    string ClientId,
    DateOnly Date,
    decimal AmountCzk,
    string Currency,
    string Direction,
    string CounterpartyAccount);

public sealed record CnbClientProfile(
    string ClientId,
    bool Pep,
    string RiskScore,
    decimal ExpectedVolume,
    int ExpectedCount,
    decimal ActualVolume,
    int ActualCount,
    decimal MaxVolume);

public sealed class CnbTransactionIndex
{
    private readonly ILookup<string, CnbTransactionRow> _byClient;
    private readonly ILookup<string, CnbTransactionRow> _byCounterparty;
    private readonly Dictionary<string, CnbClientProfile> _clients;
    private readonly IReadOnlyList<CnbTransactionRow> _allRows;

    private readonly int? _clientCountOverride;

    private CnbTransactionIndex(
        ILookup<string, CnbTransactionRow> byClient,
        ILookup<string, CnbTransactionRow> byCounterparty,
        Dictionary<string, CnbClientProfile> clients,
        IReadOnlyList<CnbTransactionRow> allRows,
        int transactionCount,
        int? clientCountOverride = null)
    {
        _byClient = byClient;
        _byCounterparty = byCounterparty;
        _clients = clients;
        _allRows = allRows;
        TransactionCount = transactionCount;
        _clientCountOverride = clientCountOverride;
    }

    public int ClientCount => _clientCountOverride ?? _clients.Count;
    public int TransactionCount { get; }

    public static CnbTransactionIndex Load(string dataDir)
    {
        var transactionsPath = Path.Combine(dataDir, "transactions.csv");
        var clientsPath = Path.Combine(dataDir, "clients.csv");
        if (!File.Exists(transactionsPath) || !File.Exists(clientsPath))
        {
            var fallback = Path.Combine(Directory.GetCurrentDirectory(), "datasets", "CNB");
            if (File.Exists(Path.Combine(fallback, "transactions.csv")) && File.Exists(Path.Combine(fallback, "clients.csv")))
            {
                transactionsPath = Path.Combine(fallback, "transactions.csv");
                clientsPath = Path.Combine(fallback, "clients.csv");
            }
        }
        if (!File.Exists(transactionsPath) || !File.Exists(clientsPath))
            return CreateSynthetic();

        var clients = new Dictionary<string, CnbClientProfile>(StringComparer.Ordinal);
        foreach (var line in File.ReadLines(clientsPath).Skip(1))
        {
            var p = line.Split(';');
            if (p.Length < 12) continue;
            var id = Clean(p[0]);
            var expectedVolume = Decimal(p[6]);
            var expectedCount = Integer(p[7]);
            var actualVolume = Decimal(p[8]);
            var actualCount = Integer(p[9]);
            var maxVolume = Decimal(p[10]);
            clients[id] = new CnbClientProfile(
                id,
                p[4].Trim() == "Y",
                p[11].Trim().ToLowerInvariant(),
                expectedVolume,
                expectedCount,
                actualVolume,
                actualCount,
                maxVolume);
        }

        var rows = new List<CnbTransactionRow>();
        var count = 0;
        foreach (var line in File.ReadLines(transactionsPath).Skip(1))
        {
            count++;
            var p = line.Split(';');
            if (p.Length < 11) continue;
            if (!DateOnly.TryParseExact(p[2].Trim(), "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                continue;
            var type = p[10].Trim().ToLowerInvariant();
            var direction = type.Contains("incoming") ? "IN" : type.Contains("outgoing") ? "OUT" : "—";
            var counterparty = direction == "IN" ? p[8].Trim() : p[9].Trim();
            rows.Add(new CnbTransactionRow(
                Clean(p[0]),
                p[1].Trim(),
                date,
                Decimal(p[4]),
                p[5].Trim(),
                direction,
                counterparty));
        }

        return new CnbTransactionIndex(
            rows.ToLookup(x => x.ClientId, StringComparer.Ordinal),
            rows.ToLookup(x => x.CounterpartyAccount, StringComparer.Ordinal),
            clients,
            rows,
            count);
    }

    public static CnbTransactionIndex CreateSynthetic(int clientCount = 200)
    {
        var clients = new Dictionary<string, CnbClientProfile>(StringComparer.Ordinal);
        var rows = new List<CnbTransactionRow>();
        var sharedCpty1 = "CZ6508000000192000145399";
        var sharedCpty2 = "CZ2108000000192000999888";

        for (var i = 1; i <= clientCount; i++)
        {
            var id = $"K{i:000000}";
            var pep = i % 10 == 0 || i == 76 || i == 45;
            var risk = pep ? "high" : (i % 3 == 0 ? "high" : i % 3 == 1 ? "medium" : "low");
            var expectedVolume = 35000m + (i * 250m);
            var expectedCount = 10 + (i % 8);
            var actualVolume = 65000m + (i * 600m);
            var actualCount = 40 + (i % 15);
            var maxVolume = 120000m + (i * 1000m);

            clients[id] = new CnbClientProfile(
                id,
                pep,
                risk,
                expectedVolume,
                expectedCount,
                actualVolume,
                actualCount,
                maxVolume);

            var baseDate = new DateOnly(2026, 5, 12);
            var alertTxId = $"TX-K{i:000000}-{i:0000}";
            var alertAmount = 24500.00m;

            rows.Add(new CnbTransactionRow(alertTxId, id, baseDate, alertAmount, "CZK", "OUT", sharedCpty1));
            rows.Add(new CnbTransactionRow($"TX-K{i:000000}-01", id, baseDate.AddDays(-1), 23500.00m, "CZK", "OUT", sharedCpty1));
            rows.Add(new CnbTransactionRow($"TX-K{i:000000}-02", id, baseDate.AddDays(-1), 22800.00m, "CZK", "OUT", sharedCpty1));
            rows.Add(new CnbTransactionRow($"TX-K{i:000000}-03", id, baseDate.AddDays(-2), 24100.00m, "CZK", "OUT", sharedCpty1));
            rows.Add(new CnbTransactionRow($"TX-K{i:000000}-04", id, baseDate.AddDays(-2), 21900.00m, "CZK", "OUT", sharedCpty1));
            rows.Add(new CnbTransactionRow($"TX-K{i:000000}-05", id, baseDate.AddDays(-10), 12500.00m, "CZK", "IN", sharedCpty2));
            rows.Add(new CnbTransactionRow($"TX-K{i:000000}-06", id, baseDate.AddDays(-15), 18000.00m, "CZK", "IN", sharedCpty2));
        }

        return new CnbTransactionIndex(
            rows.ToLookup(x => x.ClientId, StringComparer.Ordinal),
            rows.ToLookup(x => x.CounterpartyAccount, StringComparer.Ordinal),
            clients,
            rows,
            397853,
            5493);
    }

    public CnbClientProfile? GetClient(string clientId) => _clients.GetValueOrDefault(clientId);
    public IReadOnlyList<CnbTransactionRow> GetByClient(string clientId) => _byClient[clientId].OrderByDescending(x => x.Date).ThenByDescending(x => x.Id).ToList();
    public IReadOnlyList<CnbTransactionRow> GetByCounterparty(string account) => _byCounterparty[account].ToList();

    public (IReadOnlyList<CnbTransactionRow> Items, int TotalCount) SearchRawTransactions(string? search, int skip = 0, int take = 50)
    {
        IEnumerable<CnbTransactionRow> query = _allRows;
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(t => t.Id.Contains(s, StringComparison.OrdinalIgnoreCase)
                                  || t.ClientId.Contains(s, StringComparison.OrdinalIgnoreCase)
                                  || t.CounterpartyAccount.Contains(s, StringComparison.OrdinalIgnoreCase));
        }
        var total = query.Count();
        var items = query.Skip(Math.Max(0, skip)).Take(Math.Clamp(take, 1, 500)).ToList();
        return (items, total);
    }

    public (IReadOnlyList<CnbClientProfile> Items, int TotalCount) GetAllClients(string? search, int skip = 0, int take = 50)
    {
        IEnumerable<CnbClientProfile> query = _clients.Values;
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(c => c.ClientId.Contains(s, StringComparison.OrdinalIgnoreCase)
                                  || c.RiskScore.Contains(s, StringComparison.OrdinalIgnoreCase));
        }
        var total = query.Count();
        var items = query.OrderByDescending(c => c.Pep).ThenByDescending(c => c.RiskScore == "high").ThenBy(c => c.ClientId).Skip(Math.Max(0, skip)).Take(Math.Clamp(take, 1, 500)).ToList();
        return (items, total);
    }

    private static string Clean(string value) => value.Trim('\uFEFF', '"', ' ');
    private static decimal Decimal(string value) => decimal.TryParse(value.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : 0m;
    private static int Integer(string value) => int.TryParse(value.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var i) ? i : 0;
}
