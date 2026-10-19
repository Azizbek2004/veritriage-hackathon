using VeriTriage.Domain;
using Xunit;

namespace PayShield.Tests;

public sealed class DeterministicLogicTests
{
    [Fact]
    public void Determinism_SameInputsProduceSameOutput()
    {
        var rows = FinregDeliverableEngine.ProcessSampleBatch(Inputs());
        var hero = rows.Single(r => r.AlertId == "ALERT-045");
        Assert.True(ExplanationBuilder.IsDeterministic(hero));
        Assert.Equal(5, RuleRegistry.All.Count);
        Assert.All(RuleRegistry.All, rule => Assert.Equal("1.0.0", rule.Version));
    }

    private static IReadOnlyList<CnbAlertInput> Inputs()
    {
        var list = new List<CnbAlertInput>();
        for (var i = 1; i <= 45; i++)
        {
            list.Add(new CnbAlertInput(
                $"TX{i:000000}", $"K{i:000000}", $"Client {i:000}",
                1_000m + i * 1_500m, "CZK", 20 + (i % 60), i == 45,
                i % 10 == 0 ? "7995" : "UNKNOWN", "Ing. Jan Novák", "Ing. Jana Dvořáková"));
        }
        return list;
    }
}
