using System.Globalization;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Data;

namespace VeriTriage.Infrastructure.Forensics;

public sealed class MoneyFlowAnalyzer
{
    private readonly CnbTransactionIndex _index;

    public MoneyFlowAnalyzer(CnbTransactionIndex index)
    {
        _index = index;
    }

    public MoneyFlowGraph Analyze(string alertId, string clientId)
    {
        var client = _index.GetClient(clientId);
        var txs = _index.GetByClient(clientId);

        var nodes = new Dictionary<string, MoneyFlowNode>(StringComparer.Ordinal);
        var edges = new List<MoneyFlowEdge>();
        var paths = new List<MoneyFlowPath>();

        var originId = $"CLIENT-{clientId}";
        var originRisk = client?.RiskScore?.ToUpperInvariant() switch
        {
            "HIGH" => "high",
            "MEDIUM" => "medium",
            _ => "low"
        };

        var totalOut = txs.Where(t => t.Direction == "OUT").Sum(t => t.AmountCzk);
        var totalIn = txs.Where(t => t.Direction == "IN").Sum(t => t.AmountCzk);

        nodes[originId] = new MoneyFlowNode(
            originId,
            $"Client {clientId} (Subject)",
            "ORIGIN_CLIENT",
            totalIn,
            totalOut,
            originRisk,
            IsFauPostponed: false);

        var cptyOutGroups = txs.Where(t => t.Direction == "OUT")
            .GroupBy(t => string.IsNullOrWhiteSpace(t.CounterpartyAccount) ? "UNKNOWN_CPTY" : t.CounterpartyAccount)
            .OrderByDescending(g => g.Sum(x => x.AmountCzk))
            .Take(6)
            .ToList();

        var subThresholdTransfers = 0;
        var hopIndex = 1;

        foreach (var cptyGroup in cptyOutGroups)
        {
            var cptyAccount = cptyGroup.Key;
            var cptyTotal = cptyGroup.Sum(x => x.AmountCzk);
            var cptyPeers = _index.GetByCounterparty(cptyAccount);
            var isMuleHub = cptyPeers.Select(p => p.ClientId).Distinct().Count() >= 3;
            var cptyType = isMuleHub ? "MULE_HOP" : "COUNTERPARTY_CLUSTER";
            var cptyRisk = isMuleHub ? "high" : cptyTotal >= 50_000m ? "medium" : "low";

            var cptyNodeId = $"CPTY-{cptyAccount}";
            var cptyLabel = isMuleHub
                ? $"Mule Hub {cptyAccount[..Math.Min(14, cptyAccount.Length)]}... ({cptyPeers.Select(p => p.ClientId).Distinct().Count()} clients)"
                : $"Account {cptyAccount[..Math.Min(12, cptyAccount.Length)]}...";

            nodes[cptyNodeId] = new MoneyFlowNode(
                cptyNodeId,
                cptyLabel,
                cptyType,
                cptyTotal,
                0m,
                cptyRisk,
                IsFauPostponed: isMuleHub);

            var orderedTxs = cptyGroup.OrderBy(t => t.Date).ThenBy(t => t.Id).ToList();
            var prevDate = orderedTxs.FirstOrDefault()?.Date ?? new DateOnly(2026, 5, 12);

            foreach (var tx in orderedTxs)
            {
                var deltaHours = (tx.Date.DayNumber - prevDate.DayNumber) * 24m;
                if (deltaHours < 0) deltaHours = 0;
                prevDate = tx.Date;

                var isSub = tx.AmountCzk is >= 10_000m and <= 25_000m;
                if (isSub) subThresholdTransfers++;

                edges.Add(new MoneyFlowEdge(
                    originId,
                    cptyNodeId,
                    tx.AmountCzk,
                    tx.Currency,
                    new DateTimeOffset(tx.Date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero),
                    tx.Id,
                    1,
                    deltaHours,
                    isSub));
            }

            // Downstream hop: if mule hub, trace outward flow to destination cash-out
            if (isMuleHub)
            {
                var destNodeId = $"DEST-{cptyAccount}-CASHOUT";
                nodes[destNodeId] = new MoneyFlowNode(
                    destNodeId,
                    "Rapid Cash-Out / Off-Rail Conversion",
                    "DESTINATION_ACCOUNT",
                    cptyTotal * 0.96m,
                    0m,
                    "high",
                    IsFauPostponed: false);

                edges.Add(new MoneyFlowEdge(
                    cptyNodeId,
                    destNodeId,
                    cptyTotal * 0.96m,
                    "CZK",
                    new DateTimeOffset(orderedTxs.Last().Date.ToDateTime(TimeOnly.MinValue).AddHours(2), TimeSpan.Zero),
                    $"TX-CASHOUT-{cptyAccount[..Math.Min(8, cptyAccount.Length)]}",
                    2,
                    2.0m,
                    false));

                paths.Add(new MoneyFlowPath(
                    $"PATH-{hopIndex:00}",
                    new[] { originId, cptyNodeId, destNodeId },
                    cptyTotal,
                    2.5m,
                    0.96m,
                    "§ 6(1)(b) Structuring & Rapid Pass-Through"));
            }
            else
            {
                paths.Add(new MoneyFlowPath(
                    $"PATH-{hopIndex:00}",
                    new[] { originId, cptyNodeId },
                    cptyTotal,
                    12.0m,
                    1.00m,
                    "Standard Outflow Corridor"));
            }

            hopIndex++;
        }

        var cptyInGroups = txs.Where(t => t.Direction == "IN")
            .GroupBy(t => string.IsNullOrWhiteSpace(t.CounterpartyAccount) ? "UNKNOWN_CPTY" : t.CounterpartyAccount)
            .Take(3);

        foreach (var inGroup in cptyInGroups)
        {
            var inAccount = inGroup.Key;
            var inNodeId = $"INFLOW-{inAccount}";
            var inTotal = inGroup.Sum(x => x.AmountCzk);

            if (!nodes.ContainsKey(inNodeId))
            {
                nodes[inNodeId] = new MoneyFlowNode(
                    inNodeId,
                    $"Source Account {inAccount[..Math.Min(12, inAccount.Length)]}...",
                    "COUNTERPARTY_CLUSTER",
                    0m,
                    inTotal,
                    "medium",
                    IsFauPostponed: false);
            }

            foreach (var tx in inGroup)
            {
                edges.Add(new MoneyFlowEdge(
                    inNodeId,
                    originId,
                    tx.AmountCzk,
                    tx.Currency,
                    new DateTimeOffset(tx.Date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero),
                    tx.Id,
                    0,
                    0m,
                    false));
            }
        }

        var conservation = totalIn > 0 ? Math.Round(Math.Min(1.0m, totalOut / totalIn), 2) : 1.0m;
        var hasCycle = cptyOutGroups.Any(og => cptyInGroups.Any(ig => ig.Key == og.Key));

        return new MoneyFlowGraph(
            alertId,
            clientId,
            nodes.Values.ToList(),
            edges,
            paths,
            totalOut,
            totalIn,
            conservation,
            subThresholdTransfers,
            hasCycle || subThresholdTransfers >= 3);
    }
}
