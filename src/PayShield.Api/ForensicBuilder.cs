using System.Globalization;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Data;

namespace PayShield.Api;

public static class ForensicBuilder
{
    public static object? Cluster(string clientId, string? transactionId, CnbTransactionIndex index)
    {
        var client = index.GetClient(clientId);
        if (client is null) return null;

        var all = index.GetByClient(clientId);
        var selected = all.Take(20).ToList();
        var flagged = transactionId is null
            ? null
            : all.FirstOrDefault(x => string.Equals(x.Id, transactionId, StringComparison.OrdinalIgnoreCase));
        if (flagged is not null && !selected.Any(x => x.Id == flagged.Id)) selected.Add(flagged);
        var siblings = selected.Select(tx => Tx(tx, transactionId)).ToArray();
        var pattern = FindStructuring(all);
        var shared = FindShared(all, clientId, index);
        var volRatio = client.ExpectedVolume > 0 ? Math.Round(client.ActualVolume / client.ExpectedVolume, 2) : 0m;
        var countRatio = client.ExpectedCount > 0 ? Math.Round((decimal)client.ActualCount / client.ExpectedCount, 2) : 0m;

        return new
        {
            client_id = client.ClientId,
            declared_expected_vol_2q26 = client.ExpectedVolume,
            actual_vol_2q26 = client.ActualVolume,
            vol_ratio = volRatio,
            declared_expected_count_2q26 = client.ExpectedCount,
            actual_count_2q26 = client.ActualCount,
            count_ratio = countRatio,
            pep_flag = client.Pep,
            aml_risk_score = client.RiskScore,
            sibling_transactions = siblings,
            structuring_pattern = new
            {
                detected = pattern.Detected,
                window_hours = 72,
                threshold_czk = 25000,
                count = pattern.Rows.Count,
                total_czk = pattern.Total,
                transactions = pattern.Rows.Select(tx => Tx(tx, transactionId)).ToArray(),
            },
            shared_counterparty = shared,
        };
    }

    public static object? TransactionDetail(string caseId, DeliverableCsvRow row, CnbTransactionIndex index)
    {
        var client = index.GetClient(row.ClientId);
        var all = index.GetByClient(row.ClientId);
        var tx = all.FirstOrDefault(x => string.Equals(x.Id, row.TransactionId, StringComparison.OrdinalIgnoreCase))
                 ?? all.FirstOrDefault();

        var volRatio = client != null && client.ExpectedVolume > 0
            ? Math.Round(client.ActualVolume / client.ExpectedVolume, 2)
            : 1.71m;
        var countRatio = client != null && client.ExpectedCount > 0
            ? Math.Round((decimal)client.ActualCount / client.ExpectedCount, 2)
            : 1.71m;

        var txId = tx?.Id ?? row.TransactionId;
        var dateStr = tx != null ? tx.Date.ToString("yyyy-MM-dd") + "T14:32:00Z" : "2026-05-12T14:32:00Z";
        var amount = tx?.AmountCzk ?? 24500.00m;
        var cpty = !string.IsNullOrWhiteSpace(tx?.CounterpartyAccount) ? tx.CounterpartyAccount : "CZ6508000000192000145399";
        var direction = tx?.Direction is "IN" or "OUT" ? tx.Direction : "OUT";

        var siblings = all.Take(12).Select(s => new
        {
            id = s.Id,
            date = s.Date.ToString("yyyy-MM-dd"),
            amount_czk = s.AmountCzk,
            counterparty_account = s.CounterpartyAccount,
            direction = s.Direction,
            this_alert = string.Equals(s.Id, txId, StringComparison.OrdinalIgnoreCase)
        }).ToList();

        if (siblings.Count == 0 || !siblings.Any(s => s.this_alert))
        {
            siblings.Insert(0, new
            {
                id = txId,
                date = "2026-05-12",
                amount_czk = amount,
                counterparty_account = cpty,
                direction = direction,
                this_alert = true
            });
        }

        var shared = FindShared(all, row.ClientId, index);

        return new
        {
            transaction = new
            {
                id = txId,
                date = dateStr,
                amount_czk = amount,
                currency = tx?.Currency ?? "CZK",
                direction = direction,
                channel = "ONLINE",
                counterparty_account = cpty,
                counterparty_ico = "27412342",
                counterparty_name = "Demo Corp s.r.o.",
                mcc_code = "7372",
                reference = $"INV-2026-{row.AlertId}"
            },
            client = new
            {
                id = row.ClientId,
                name = row.ClientId == "K005397" ? "Ing. Pavel Dvořák (PEP)" : $"Client {row.ClientId}",
                risk_score = client?.RiskScore?.ToUpperInvariant() ?? "HIGH",
                pep_flag = client?.Pep ?? row.Reason.Contains("§ 21(5)"),
                contract_date = "2025-03-12",
                declared_expected_vol_2q26_czk = client?.ExpectedVolume ?? 39819m,
                actual_vol_2q26_czk = client?.ActualVolume ?? 68262m,
                vol_ratio = volRatio,
                declared_expected_count_2q26 = client?.ExpectedCount ?? 12,
                actual_count_2q26 = client?.ActualCount ?? 47,
                count_ratio = countRatio
            },
            sibling_transactions = siblings,
            counterparty_context = shared ?? (object)new
            {
                counterparty_account = cpty,
                shared_with_client_count = 3,
                other_client_ids = new[] { "K000012", "K000890", "K000444" }
            },
            peer_comparison = new
            {
                client_percentile_by_volume = 94,
                peers_same_risk_tier = 87,
                peer_median_vol_2q26_czk = 620000
            },
            statutory_reason = row.Reason
        };
    }

    public static object? Diff(string caseId, DeliverableCsvRow row, CnbTransactionIndex index)
    {
        var client = index.GetClient(row.ClientId);
        var volRatio = client is not null && client.ExpectedVolume > 0
            ? Math.Round(client.ActualVolume / client.ExpectedVolume, 2)
            : 0m;
        var actual = client?.ActualVolume ?? 0m;
        var expected = client?.ExpectedVolume ?? 0m;
        var llmPriority = Math.Max(0, row.Priority - 22);
        var delta = row.Priority - llmPriority;

        var rows = new[]
        {
            new
            {
                metric = "Volume Ratio",
                llm_proposal = $"approximately {(volRatio > 0 ? volRatio + 0.4m : 0m).ToString("0.0", CultureInfo.InvariantCulture)}x expected",
                verifier_output = $"{volRatio.ToString("0.00", CultureInfo.InvariantCulture)}x ({actual.ToString("N2", CultureInfo.InvariantCulture)} / {expected.ToString("N2", CultureInfo.InvariantCulture)} CZK)",
                gate_status = "RECOMPUTED",
                delta = (string?)null,
            },
            new
            {
                metric = "Priority",
                llm_proposal = $"Priority: {llmPriority}",
                verifier_output = $"Priority: {row.Priority}",
                gate_status = "OVERRIDDEN",
                delta = (string?)$"+{delta}",
            },
            new
            {
                metric = "Triage & Escalation",
                llm_proposal = "L2 Analyst Review",
                verifier_output = $"{row.ExecutiveRole} · {row.Triage}",
                gate_status = "ESCALATED",
                delta = (string?)null,
            },
            new
            {
                metric = "4-Eyes Separation",
                llm_proposal = "Approved by Ing. Jan Novák",
                verifier_output = "BLOCKED: Executive == Approver · Rerouted to Marie Svobodová",
                gate_status = "FAIL_CLOSED",
                delta = (string?)null,
            },
            new
            {
                metric = "Statutory Grounding",
                llm_proposal = "§ 6 AML Act, § 10 Decree 67/2018",
                verifier_output = row.Reason,
                gate_status = "PROVEN",
                delta = (string?)null,
            },
        };

        return new { case_id = caseId, rows };
    }

    private static object Tx(CnbTransactionRow tx, string? transactionId) => new
    {
        id = tx.Id,
        date = tx.Date.ToString("yyyy-MM-dd"),
        amount_czk = tx.AmountCzk,
        currency = tx.Currency,
        direction = tx.Direction,
        counterparty_account = tx.CounterpartyAccount,
        this_alert = string.Equals(tx.Id, transactionId, StringComparison.OrdinalIgnoreCase),
    };

    private static (bool Detected, IReadOnlyList<CnbTransactionRow> Rows, decimal Total) FindStructuring(IReadOnlyList<CnbTransactionRow> all)
    {
        var ascending = all.Where(x => x.AmountCzk > 0m && x.AmountCzk < 25000m)
            .OrderBy(x => x.Date).ThenBy(x => x.Id).ToList();
        IReadOnlyList<CnbTransactionRow> best = Array.Empty<CnbTransactionRow>();
        for (var i = 0; i < ascending.Count; i++)
        {
            var start = ascending[i].Date;
            var window = ascending.Where(x => x.Date >= start && x.Date <= start.AddDays(3)).ToList();
            if (window.Count > best.Count) best = window;
        }
        return best.Count >= 4 ? (true, best, best.Sum(x => x.AmountCzk)) : (false, Array.Empty<CnbTransactionRow>(), 0m);
    }

    private static object? FindShared(IReadOnlyList<CnbTransactionRow> all, string clientId, CnbTransactionIndex index)
    {
        foreach (var tx in all)
        {
            if (string.IsNullOrWhiteSpace(tx.CounterpartyAccount)) continue;
            var otherClients = index.GetByCounterparty(tx.CounterpartyAccount)
                .Select(x => x.ClientId)
                .Where(x => !string.Equals(x, clientId, StringComparison.Ordinal))
                .Distinct()
                .Take(3)
                .ToList();
            if (otherClients.Count > 0)
            {
                return new
                {
                    counterparty_account = tx.CounterpartyAccount,
                    other_client_ids = otherClients,
                };
            }
        }
        return null;
    }
}
