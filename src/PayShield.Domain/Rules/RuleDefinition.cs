using System.Security.Cryptography;
using System.Text;

namespace VeriTriage.Domain;

public sealed record RuleDefinition(
    string RuleId,
    string Version,
    DateOnly EffectiveFrom,
    string StatutoryBasis,
    string Description,
    string Threshold,
    string Operator,
    decimal Value);

public static class RuleRegistry
{
    public static readonly IReadOnlyList<RuleDefinition> All = new[]
    {
        new RuleDefinition("R-VOLUME-AML-01", "1.0.0", new DateOnly(2026, 1, 1), "§ 6(1)(a)",
            "Volume deviation exceeds the configured baseline threshold.", "vol_ratio", ">=", 1.5m),
        new RuleDefinition("R-STRUCT-AML-01", "1.0.0", new DateOnly(2026, 1, 1), "§ 6(1)(b)",
            "Structuring component is present in the deterministic breakdown.", "structuring_component", ">=", 3m),
        new RuleDefinition("R-PEP-AML-01", "1.0.0", new DateOnly(2026, 1, 1), "§ 9a(2)(c)",
            "Politically exposed person flag is set.", "pep_flag", "==", 25m),
        new RuleDefinition("R-REVIEW-PRIORITY-01", "1.0.0", new DateOnly(2026, 1, 1), "§ 21(2)",
            "Priority reaches the manual-review threshold.", "priority", ">=", 40m),
        new RuleDefinition("R-4EYES-AML-01", "1.0.0", new DateOnly(2026, 1, 1), "Decree 67/2018 § 12",
            "Executive and approver must be different people.", "independent_approver", "==", 1m),
    };

    public static RuleDefinition? Get(string ruleId) => All.FirstOrDefault(x => x.RuleId == ruleId);
}

public sealed record RuleEvaluation(
    string RuleId,
    string Version,
    string StatutoryBasis,
    decimal InputValue,
    decimal Threshold,
    string Operator,
    bool Fired,
    decimal Contribution);

public sealed record ExplanationSnapshot(
    string CaseId,
    string Decision,
    int Priority,
    PriorityBreakdown? PriorityBreakdown,
    IReadOnlyList<RuleEvaluation> RulesFired,
    IReadOnlyList<RuleEvaluation> RulesCheckedNotFired,
    IReadOnlyDictionary<string, string> RuleVersions,
    string EvidenceHash,
    string DecisionHash,
    DateTimeOffset Timestamp);

public static class ExplanationBuilder
{
    public static ExplanationSnapshot Build(DeliverableCsvRow row)
    {
        var bd = row.Breakdown;
        var volume = new RuleEvaluation("R-VOLUME-AML-01", "1.0.0", "§ 6(1)(a)", bd?.Vol ?? 0, 1.5m, ">=", (bd?.Vol ?? 0) > 0, bd?.Vol ?? 0);
        var structure = new RuleEvaluation("R-STRUCT-AML-01", "1.0.0", "§ 6(1)(b)", bd?.Struct ?? 0, 3m, ">=", (bd?.Struct ?? 0) >= 3, bd?.Struct ?? 0);
        var pep = new RuleEvaluation("R-PEP-AML-01", "1.0.0", "§ 9a(2)(c)", bd?.Pep ?? 0, 25m, "==", (bd?.Pep ?? 0) > 0, bd?.Pep ?? 0);
        var priority = new RuleEvaluation("R-REVIEW-PRIORITY-01", "1.0.0", "§ 21(2)", row.Priority, 40m, ">=", row.Priority >= 40, 0);
        var fourEyes = new RuleEvaluation("R-4EYES-AML-01", "1.0.0", "Decree 67/2018 § 12",
            string.Equals(row.ExecutivePerson, row.Approver, StringComparison.Ordinal) ? 0 : 1, 1m, "==",
            !string.Equals(row.ExecutivePerson, row.Approver, StringComparison.Ordinal), 0);
        var all = new[] { volume, structure, pep, priority, fourEyes };
        var fired = all.Where(x => x.Fired).ToList();
        var notFired = all.Where(x => !x.Fired).ToList();
        var versions = RuleRegistry.All.ToDictionary(x => x.RuleId, x => x.Version);
        var evidence = Hash($"{row.AlertId}|{row.ClientId}|{row.TransactionId}|{row.Priority}|{row.Reason}");
        var decision = Hash(string.Join("|", fired.Select(x => $"{x.RuleId}:{x.Fired}:{x.Contribution}")) + "|" + row.Priority);
        return new ExplanationSnapshot(row.AlertId, row.Triage, row.Priority, bd, fired, notFired, versions, evidence, decision, DateTimeOffset.UtcNow);
    }

    public static bool IsDeterministic(DeliverableCsvRow row)
    {
        var a = Build(row);
        var b = Build(row);
        return a.EvidenceHash == b.EvidenceHash && a.DecisionHash == b.DecisionHash;
    }

    private static string Hash(string value) =>
        "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}
