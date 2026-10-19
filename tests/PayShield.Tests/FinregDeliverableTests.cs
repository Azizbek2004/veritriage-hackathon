using VeriTriage.Domain;
using Xunit;

namespace PayShield.Tests;

public sealed class FinregDeliverableTests
{
    private static IReadOnlyList<CnbAlertInput> Inputs()
    {
        var list = new List<CnbAlertInput>();
        for (var i = 1; i <= 45; i++)
        {
            list.Add(new CnbAlertInput(
                $"ALT-{i:000}",
                $"K{i:000000}",
                $"Client {i:000}",
                1_000m + i * 1_500m,
                "CZK",
                20 + (i % 60),
                i == 45,
                i % 10 == 0 ? "7995" : "UNKNOWN",
                "Ing. Jan Novák",
                "Ing. Jana Dvořáková"));
        }
        return list;
    }

    [Fact]
    public void FinregCsv_PassesStatutoryValidation()
    {
        var rows = FinregDeliverableEngine.ProcessSampleBatch(Inputs());
        var csv = FinregDeliverableEngine.ToCsv(rows);
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(l => l.TrimEnd('\r')).ToList();

        Assert.Equal(46, lines.Count);
        Assert.Equal(11, lines[0].Split(',').Length);

        foreach (var line in lines.Skip(1))
        {
            var columns = line.Split(',');
            Assert.Equal(11, columns.Length);
            Assert.True(int.TryParse(columns[4], out var priority));
            Assert.InRange(priority, 0, 100);
            Assert.NotEqual(columns[6], columns[7]);
            Assert.True(columns[10].Contains("§ 6(1)(a)") || columns[10].Contains("§ 21(5)"));
        }

        Assert.Equal(30, rows.Count(r => r.Triage == "FP" && r.Priority < 40));
        Assert.Equal(10, rows.Count(r => r.Triage == "REVIEW" && r.Priority is >= 40 and < 75));
        Assert.Equal(5, rows.Count(r => r.Triage == "REVIEW" && r.Priority >= 75));
        Assert.Contains(rows, r => r.Priority >= 75 && r.Reason.Contains("§ 21(5)"));
    }

    [Fact]
    public void FourEyes_RejectsSamePerson()
    {
        Assert.False(FinregDeliverableEngine.IsFourEyesIndependent("Ing. Jan Novák", "Ing. Jan Novák"));
        Assert.True(FinregDeliverableEngine.IsFourEyesIndependent("Ing. Jan Novák", "Ing. Jana Dvořáková"));
    }
}
