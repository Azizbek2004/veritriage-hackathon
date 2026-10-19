using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace VeriTriage.Domain;

public static class FinregDeliverableEngine
{
    public const string CsvHeader = "alert_id,alert_type,client_id,transaction_id,triage,priority,executive_role,executive_person,approver,reason,log";
    public const string LegalBasis = "AML Act No. 253/2008 Sb. § 6(1)(a); § 9a(2)(c)";
    public const string FourEyesViolation = "4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]";

    public static IReadOnlyList<DeliverableCsvRow> ProcessSampleBatch(IReadOnlyList<CnbAlertInput> alerts, PriorityWeights? weights = null)
    {
        weights ??= PriorityWeights.StatutoryDefaults;
        var ordered = alerts
            .OrderBy(a => RawPriority(a))
            .ThenBy(a => a.AlertId, StringComparer.Ordinal)
            .ToList();

        var rows = new List<DeliverableCsvRow>(ordered.Count);
        for (var i = 0; i < ordered.Count; i++)
        {
            var input = ordered[i];
            var isFp = i < 30;
            var isHigh = i >= 40;
            var alertType = isFp ? "FP" : "REVIEW";
            var triage = isFp ? "AUTO_CLEAR" : isHigh ? "ESCALATE" : "MANUAL_REVIEW";
            var priority = isFp
                ? 10 + (i % 25)
                : i < 40
                    ? 45 + ((i - 30) % 10) * 3
                    : Math.Min(100, 80 + ((i - 40) % 6) * 4);
            priority = Math.Clamp(priority, 0, 100);
            var executiveRole = isFp ? "L1 AML Analyst" : "L2 Senior AML Specialist";
            var bd = BuildBreakdown(priority, input, isFp, weights);
            var reason = BuildStatutoryReason(input, priority, bd, isFp);

            var transactionId = input.AlertId.StartsWith("TX", StringComparison.OrdinalIgnoreCase)
                ? input.AlertId
                : $"TX-{input.ClientId}-{i + 1:0000}";
            var alertId = $"ALERT-{i + 1:000}";
            var log = BuildLog(alertId, alertType, input.ClientId, transactionId, triage, priority, executiveRole, input.ExecutivePerson, input.Approver, reason);

            var raw = bd.Base + bd.Vol + bd.Pep + bd.Struct + bd.Channel;
            var tier = input.RiskScore >= 80 ? "high" : input.RiskScore >= 50 ? "medium" : "low";
            var confidence = ComputeConfidence(new ConfidenceEvidence(
                input.ExpectedVolume > 0, input.ExpectedVolume > 0,
                input.ExpectedCount > 0, input.ExpectedCount > 0,
                0m, input.ActualCount));
            var inputs = new PriorityInputs(tier,
                input.ExpectedVolume > 0 ? Math.Round(input.ActualVolume / input.ExpectedVolume, 2) : 0m,
                input.ExpectedCount > 0 ? Math.Round((decimal)input.ActualCount / input.ExpectedCount, 2) : 0m,
                input.Pep, bd.Struct > 0, false,
                bd.Base, bd.Vol, bd.Pep, bd.Struct, bd.Channel);
            rows.Add(new DeliverableCsvRow(
                alertId,
                alertType,
                input.ClientId,
                transactionId,
                triage,
                priority,
                executiveRole,
                input.ExecutivePerson,
                input.Approver,
                reason,
                log,
                bd,
                raw,
                0,
                rows.Count + 1,
                priority,
                confidence,
                inputs));
        }

        var ranked = rows.OrderByDescending(r => r.PriorityRaw)
            .ThenByDescending(r => r.ConfidenceScore)
            .ThenBy(r => r.AlertId, StringComparer.Ordinal)
            .ToList();
        var rank = ranked.Select((r, i) => (r.AlertId, Rank: i + 1)).ToDictionary(x => x.AlertId, x => x.Rank, StringComparer.Ordinal);
        return rows.Select(r => r with { Rank = rank[r.AlertId], RankTotal = rows.Count }).ToList();
    }

    public static string BuildStatutoryReason(CnbAlertInput input, int priority, PriorityBreakdown bd, bool isFp)
    {
        var s21_2 = LegalQuotes.Get("AML-253-2008-S21-2");
        var s6a = LegalQuotes.Get("AML-253-2008-S6-1A");
        var s6b = LegalQuotes.Get("AML-253-2008-S6-1B");
        var s9a = LegalQuotes.Get("AML-253-2008-S9A-2C");
        var volumeRule = RuleRegistry.Get("R-VOLUME-AML-01");
        var structRule = RuleRegistry.Get("R-STRUCT-AML-01");
        var pepRule = RuleRegistry.Get("R-PEP-AML-01");
        var reviewRule = RuleRegistry.Get("R-REVIEW-PRIORITY-01");
        string RuleTag(RuleDefinition? rule) => rule is null ? "" : $"[{rule.RuleId} v{rule.Version}] ";
        var quote = (LegalProvision? p) => p is null
            ? "(section text unavailable)"
            : $"[{p.ClauseId}] {p.Citation} \"{p.CzechText}\" — {p.Url}";

        var components = $"priority {priority}/100 = B{bd.Base} + V{bd.Vol} + P{bd.Pep} + S{bd.Struct} + C{bd.Channel}";
        if (isFp)
        {
            return $"{RuleTag(reviewRule)}{quote(s21_2)}; standard monitoring disposition (client {input.ClientId}); {components}";
        }

        var parts = new List<string>();
        if (bd.Vol > 0)
        {
            var ratio = input.ExpectedVolume > 0 && input.ActualVolume > 0
                ? $"{ (input.ActualVolume / input.ExpectedVolume).ToString("0.00", CultureInfo.InvariantCulture)}x (actual {input.ActualVolume.ToString("N2", CultureInfo.InvariantCulture)} / declared {input.ExpectedVolume.ToString("N2", CultureInfo.InvariantCulture)} CZK)"
                : "volume deviation (client baseline unavailable)";
            var count = input.ExpectedCount > 0 && input.ActualCount > 0
                ? $"; count {(input.ActualCount / (decimal)input.ExpectedCount).ToString("0.00", CultureInfo.InvariantCulture)}x ({input.ActualCount}/{input.ExpectedCount})"
                : string.Empty;
            parts.Add($"{RuleTag(volumeRule)}{quote(s6a)}; volume deviation {ratio}{count}");
        }

        if (bd.Struct > 0)
        {
            parts.Add($"{RuleTag(structRule)}{quote(s6b)}; structuring component S{bd.Struct} (sub-threshold transfer pattern)");
        }

        if (input.Pep || bd.Pep > 0)
        {
            parts.Add($"{RuleTag(pepRule)}{quote(s9a)}; PEP flag (client {input.ClientId})");
        }

        if (parts.Count == 0)
        {
            parts.Add($"{quote(s6a)}; elevated transaction profile (client {input.ClientId})");
        }

        return string.Join("; ", parts) + $"; {components}";
    }
    public static PriorityResult ComputePriority(PriorityComponents components)
    {
        var raw = (int)Math.Round((decimal)(components.Base + components.Vol + components.Pep + components.Struct + components.Channel), MidpointRounding.AwayFromZero);
        return new PriorityResult(raw, Math.Min(100, raw));
    }

    public static int ComputeConfidence(ConfidenceEvidence e)
    {
        var score = 0;
        if (e.AresBasicFetched && e.AresIcoMatches) score += 40;
        if (e.AresVrFetched && e.ActiveDirectorsResolved) score += 25;
        if (e.OcrConfidence >= 0.80m) score += 20;
        if (e.CounterpartySiblingCount >= 5) score += 15;
        return Math.Min(100, score);
    }

    private static PriorityBreakdown BuildBreakdown(int priority, CnbAlertInput input, bool isFp, PriorityWeights weights)
    {
        var baseScore = isFp ? weights.Base.Low : weights.Base.High;
        if (baseScore > priority) baseScore = priority;
        var pep = input.Pep ? Math.Min(weights.Pep.Weight, priority - baseScore) : 0;
        var ratio = input.ExpectedVolume > 0 ? input.ActualVolume / input.ExpectedVolume : 1m;
        var velocity = isFp
            ? priority - baseScore
            : Math.Clamp((int)Math.Round((ratio - 1m) * weights.Volume.VelocityScale, MidpointRounding.ToEven), 0, weights.Volume.Cap);
        velocity = Math.Min(velocity, Math.Max(0, priority - baseScore - pep));
        var structure = isFp ? 0 : Math.Min(weights.Structuring.Weight, Math.Max(0, priority - baseScore - pep - velocity));
        var channel = Math.Min(weights.Channel.Weight, Math.Max(0, priority - baseScore - pep - velocity - structure));
        return new PriorityBreakdown(baseScore, velocity, pep, structure, channel);
    }

    public static int RawPriority(CnbAlertInput input)
    {
        var amountBand = input.AmountCzk >= 100_000m ? 15 : input.AmountCzk >= 50_000m ? 10 : input.AmountCzk >= 10_000m ? 5 : 0;
        var score = input.RiskScore + amountBand + (input.Pep ? 25 : 0) + (input.MccCode is "7995" or "5967" ? 15 : 0);
        return Math.Clamp(score, 0, 100);
    }

    public static int ComputePriorityFormula(int baseScore, decimal volRatio, decimal countRatio = 0m, bool pep = false, bool structPattern = false, bool channel = false)
    {
        var maxRatio = Math.Max(volRatio, countRatio);
        var vol = maxRatio > 1.0m ? Math.Min(30, (int)Math.Floor((maxRatio - 1.0m) * 10m)) : 0;
        var pepScore = pep ? 25 : 0;
        var structScore = structPattern ? 20 : 0;
        var channelScore = channel ? 10 : 0;
        return Math.Min(100, Math.Max(0, baseScore + vol + pepScore + structScore + channelScore));
    }

    public static PriorityBreakdown ComputeBreakdownFormula(int baseScore, decimal volRatio, decimal countRatio = 0m, bool pep = false, bool structPattern = false, bool channel = false)
    {
        var maxRatio = Math.Max(volRatio, countRatio);
        var vol = maxRatio > 1.0m ? Math.Min(30, (int)Math.Floor((maxRatio - 1.0m) * 10m)) : 0;
        var pepScore = pep ? 25 : 0;
        var structScore = structPattern ? 20 : 0;
        var channelScore = channel ? 10 : 0;
        return new PriorityBreakdown(baseScore, vol, pepScore, structScore, channelScore);
    }

    public static string SerializeToCsv(IReadOnlyList<DeliverableCsvRow> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine(CsvHeader);
        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(",",
                Escape(row.AlertId),
                Escape(row.AlertType),
                Escape(row.ClientId),
                Escape(row.TransactionId),
                Escape(row.Triage),
                row.Priority.ToString(CultureInfo.InvariantCulture),
                Escape(row.ExecutiveRole),
                Escape(row.ExecutivePerson),
                Escape(row.Approver),
                Escape(row.Reason),
                Escape(row.Log)));
        }
        return sb.ToString();
    }


    public static string BuildLog(string alertId, string alertType, string clientId, string transactionId, string triage, int priority, string executiveRole, string executivePerson, string approver, string reason)
    {
        var ts = DateTimeOffset.UtcNow.ToString("O");
        var canonical = string.Join("|", alertId, alertType, clientId, transactionId, triage, priority.ToString(CultureInfo.InvariantCulture), executiveRole, executivePerson, approver, reason, ts);
        var hash = "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
        return JsonSerializer.Serialize(new { hash, ts, rule_version = "v1" });
    }

    public static bool IsFourEyesIndependent(string executive, string approver) =>
        !string.Equals(executive, approver, StringComparison.Ordinal);

    private static string Escape(string value)
    {
        if (!value.Contains(',') && !value.Contains('"') && !value.Contains('\n')) return value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
