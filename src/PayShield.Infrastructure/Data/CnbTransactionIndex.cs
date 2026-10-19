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

    private CnbTransactionIndex(
        ILookup<string, CnbTransactionRow> byClient,
        ILookup<string, CnbTransactionRow> byCounterparty,
        Dictionary<string, CnbClientProfile> clients,
        int transactionCount)
    {
        _byClient = byClient;
        _byCounterparty = byCounterparty;
        _clients = clients;
        TransactionCount = transactionCount;
    }

    public int ClientCount => _clients.Count;
    public int TransactionCount { get; }

    public static CnbTransactionIndex Load(string dataDir)
    {
        var transactionsPath = Path.Combine(dataDir, "transactions.csv");
        var clientsPath = Path.Combine(dataDir, "clients.csv");
        if (!File.Exists(transactionsPath) || !File.Exists(clientsPath))
            return new CnbTransactionIndex(Array.Empty<CnbTransactionRow>().ToLookup(x => x.ClientId),
                Array.Empty<CnbTransactionRow>().ToLookup(x => x.CounterpartyAccount),
                new Dictionary<string, CnbClientProfile>(), 0);

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
            count);
    }

    public CnbClientProfile? GetClient(string clientId) => _clients.GetValueOrDefault(clientId);
    public IReadOnlyList<CnbTransactionRow> GetByClient(string clientId) => _byClient[clientId].OrderByDescending(x => x.Date).ThenByDescending(x => x.Id).ToList();
    public IReadOnlyList<CnbTransactionRow> GetByCounterparty(string account) => _byCounterparty[account].ToList();

    private static string Clean(string value) => value.Trim('\uFEFF', '"', ' ');
    private static decimal Decimal(string value) => decimal.TryParse(value.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : 0m;
    private static int Integer(string value) => int.TryParse(value.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var i) ? i : 0;
}
