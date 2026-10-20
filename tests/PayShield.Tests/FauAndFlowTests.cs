using System.Text.Json;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Audit;
using VeriTriage.Infrastructure.Data;
using VeriTriage.Infrastructure.Fau;
using VeriTriage.Infrastructure.Forensics;
using Xunit;

namespace PayShield.Tests;

public sealed class FauAndFlowTests
{
    private static CnbTransactionIndex GetIndex() => CnbTransactionIndex.CreateSynthetic(50);
    private static FileAuditLedger GetAudit() => new FileAuditLedger(Path.GetTempPath());

    private static DeliverableCsvRow CreateTestRow(string alertId = "ALERT-045", string clientId = "K000045")
    {
        return new DeliverableCsvRow(
            alertId,
            "REVIEW",
            clientId,
            "TX-K000045-0045",
            "ESCALATE",
            92,
            "L1 AML Analyst",
            "Ing. Jan Novák",
            "Marie Svobodová (MLRO)",
            "§ 6(1)(a) volume deviation 3.20x; § 6(1)(b) structuring",
            "log-sha256");
    }

    [Fact]
    public void FauPostponement_Calculates24hAnd72hStatutoryWindows()
    {
        var index = GetIndex();
        var audit = GetAudit();
        var service = new FauReportingService(index, audit);

        var row = CreateTestRow();
        var packet = service.PostponeAndGenerateReport(row, "Ing. Jan Novák", "L1 AML Analyst", "Marie Svobodová");

        Assert.Equal("POSTPONED_24H", packet.Postponement.PostponementStatus);
        Assert.True(packet.Postponement.Statutory24hExpiry > packet.Postponement.PostponedAt);
        var diff24 = packet.Postponement.Statutory24hExpiry - packet.Postponement.PostponedAt;
        Assert.Equal(24, Math.Round(diff24.TotalHours));

        var diff72 = packet.Postponement.Statutory72hFauExpiry - packet.Postponement.PostponedAt;
        Assert.Equal(72, Math.Round(diff72.TotalHours));

        Assert.True(packet.Postponement.NonTippingOffAcknowledged);
        Assert.True(packet.Signoff.FourEyesVerified);
        Assert.NotEmpty(packet.Signoff.ReceiptSha256);
    }

    [Fact]
    public void FauOfficialXml_ContainsMandatoryStatutoryTags()
    {
        var index = GetIndex();
        var audit = GetAudit();
        var service = new FauReportingService(index, audit);

        var row = CreateTestRow();
        var packet = service.PostponeAndGenerateReport(row, "Ing. Jan Novák", "L1 AML Analyst", "Marie Svobodová");
        var xml = packet.ToOfficialXml();

        Assert.Contains("<OznámeníPodezřeléhoObchodu", xml);
        Assert.Contains("<OdloženíSplněníPříkazu", xml);
        Assert.Contains("<Lhůta24h", xml);
        Assert.Contains("<Lhůta72hFAÚ", xml);
        Assert.Contains("<KontrolaČtyřOčí", xml);
        Assert.Contains("<OtiskStvrzenky Algoritmus=\"SHA-256\">", xml);
        Assert.Contains("Zákon č. 253/2008 Sb.", xml);
    }

    [Fact]
    public void MoneyFlowAnalyzer_ConstructsValidDirectedGraph()
    {
        var index = GetIndex();
        var analyzer = new MoneyFlowAnalyzer(index);

        var graph = analyzer.Analyze("ALERT-045", "K000045");

        Assert.Equal("ALERT-045", graph.AlertId);
        Assert.Equal("K000045", graph.ClientId);
        Assert.NotEmpty(graph.Nodes);
        Assert.NotEmpty(graph.Edges);
        Assert.Contains(graph.Nodes, n => n.Type == "ORIGIN_CLIENT");
        Assert.True(graph.AggregateOutflowCzk > 0);
        Assert.True(graph.StructuringFanOutDegree >= 0);
    }

    [Fact]
    public void MoneyFlowAnalyzer_DetectsMuleHubsAndDownstreamCashout()
    {
        var index = GetIndex();
        var analyzer = new MoneyFlowAnalyzer(index);

        var graph = analyzer.Analyze("ALERT-045", "K000045");

        // Synthetic index links all accounts to shared mule hub CZ6508000000192000145399
        var hasMuleHop = graph.Nodes.Any(n => n.Type == "MULE_HOP" || n.Type == "COUNTERPARTY_CLUSTER");
        Assert.True(hasMuleHop);

        var hasDownstream = graph.Edges.Any(e => e.HopIndex >= 1);
        Assert.True(hasDownstream);
    }

    [Fact]
    public void RawTransactionSearch_ReturnsPaginatedResults()
    {
        var index = GetIndex();
        var (items, total) = index.SearchRawTransactions("K000001", skip: 0, take: 5);

        Assert.True(total > 0);
        Assert.InRange(items.Count, 1, 5);
        Assert.All(items, t => Assert.Contains("K000001", t.ClientId));
    }
}
