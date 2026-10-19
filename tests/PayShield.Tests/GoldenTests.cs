using System.Text.Json;
using VeriTriage.Domain;
using Xunit;

namespace PayShield.Tests;

public sealed class GoldenTests
{
    [Fact]
    public void HeroCase_GoldenSnapshot_DoesNotRegress()
    {
        var rows = FinregDeliverableEngine.ProcessSampleBatch(Inputs());
        var hero = rows.Single(r => r.AlertId == "ALERT-045");
        var path = Path.Combine(AppContext.BaseDirectory, "golden", "verifier_hero_case.json");
        using var golden = JsonDocument.Parse(File.ReadAllText(path));
        var root = golden.RootElement;

        Assert.Equal(root.GetProperty("alert_id").GetString(), hero.AlertId);
        Assert.Equal(root.GetProperty("priority").GetInt32(), hero.Priority);
        Assert.Equal(root.GetProperty("executive_person").GetString(), hero.ExecutivePerson);
        Assert.Equal(root.GetProperty("approver").GetString(), hero.Approver);
        Assert.Equal(root.GetProperty("four_eyes_independent").GetBoolean(),
            FinregDeliverableEngine.IsFourEyesIndependent(hero.ExecutivePerson, hero.Approver));
        Assert.Contains(root.GetProperty("quoted_phrase").GetString()!, hero.Reason);

        foreach (var id in root.GetProperty("legal_clause_ids").EnumerateArray())
            Assert.Contains(id.GetString()!, hero.Reason);
    }

    private static IReadOnlyList<CnbAlertInput> Inputs()
    {
        var list = new List<CnbAlertInput>();
        for (var i = 1; i <= 45; i++)
        {
            list.Add(new CnbAlertInput(
                $"TX{i:000000}",
                $"K{i:000000}",
                $"Client {i:000}",
                1_000m + i * 1_500m,
                "CZK",
                20 + (i % 60),
                i == 45,
                i % 10 == 0 ? "7995" : "UNKNOWN",
                "Ing. Jan Novák",
                "Ing. Jana Dvořáková",
                1_000m,
                1_710m,
                10,
                17));
        }
        return list;
    }
}
