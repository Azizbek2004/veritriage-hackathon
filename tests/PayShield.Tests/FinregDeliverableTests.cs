using System.Text;
using System.Text.Json;
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
                $"TX{i:000000}",
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
        var csv = FinregDeliverableEngine.SerializeToCsv(rows);
        var parsed = ParseCsv(csv);

        Assert.Equal(46, parsed.Count);
        Assert.Equal(
            new[] { "alert_id", "alert_type", "client_id", "transaction_id", "triage", "priority", "executive_role", "executive_person", "approver", "reason", "log" },
            parsed[0]);

        foreach (var columns in parsed.Skip(1))
        {
            Assert.Equal(11, columns.Count);
            Assert.True(columns[1] is "FP" or "REVIEW");
            Assert.False(string.IsNullOrWhiteSpace(columns[2]));
            Assert.False(string.IsNullOrWhiteSpace(columns[3]));
            Assert.False(string.IsNullOrWhiteSpace(columns[4]));
            Assert.True(int.TryParse(columns[5], out var priority));
            Assert.InRange(priority, 0, 100);
            Assert.False(string.IsNullOrWhiteSpace(columns[6]));
            Assert.False(string.IsNullOrWhiteSpace(columns[7]));
            Assert.False(string.IsNullOrWhiteSpace(columns[8]));
            Assert.NotEqual(columns[7], columns[8]);
            Assert.True(columns[9].Contains("§ 6(1)(a)") || columns[9].Contains("§ 21(5)"));

            using var log = JsonDocument.Parse(columns[10]);
            Assert.StartsWith("sha256:", log.RootElement.GetProperty("hash").GetString());
            Assert.Equal("v1", log.RootElement.GetProperty("rule_version").GetString());
            Assert.True(DateTimeOffset.TryParse(log.RootElement.GetProperty("ts").GetString(), out _));
        }

        Assert.Equal(30, rows.Count(r => r.AlertType == "FP" && r.Priority < 40));
        Assert.Equal(10, rows.Count(r => r.AlertType == "REVIEW" && r.Priority is >= 40 and < 75));
        Assert.Equal(5, rows.Count(r => r.AlertType == "REVIEW" && r.Priority >= 75));
        Assert.Contains(rows, r => r.Priority >= 75 && r.Reason.Contains("§ 21(5)"));
    }

    [Fact]
    public void FourEyes_RejectsSamePerson()
    {
        Assert.False(FinregDeliverableEngine.IsFourEyesIndependent("Ing. Jan Novák", "Ing. Jan Novák"));
        Assert.True(FinregDeliverableEngine.IsFourEyesIndependent("Ing. Jan Novák", "Ing. Jana Dvořáková"));
    }

    private static List<List<string>> ParseCsv(string csv)
    {
        var rows = new List<List<string>>();
        var row = new List<string>();
        var field = new StringBuilder();
        var quoted = false;

        for (var i = 0; i < csv.Length; i++)
        {
            var c = csv[i];
            if (quoted)
            {
                if (c == '"')
                {
                    if (i + 1 < csv.Length && csv[i + 1] == '"') { field.Append('"'); i++; }
                    else quoted = false;
                }
                else field.Append(c);
            }
            else if (c == '"') quoted = true;
            else if (c == ',') { row.Add(field.ToString()); field.Clear(); }
            else if (c == '\n')
            {
                row.Add(field.ToString()); field.Clear(); rows.Add(row); row = new List<string>();
            }
            else if (c != '\r') field.Append(c);
        }

        if (field.Length > 0 || row.Count > 0)
        {
            row.Add(field.ToString());
            rows.Add(row);
        }

        return rows;
    }
}
