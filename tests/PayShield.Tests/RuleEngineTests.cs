using VeriTriage.Domain;
using Xunit;

namespace PayShield.Tests;

public sealed class RuleEngineTests
{
    [Fact]
    public void Rules_AggregateBlockOverEscalate()
    {
        var decision = new RuleEngine().Evaluate(new RuleInput
        {
            IcoValid = false,
            VopStatus = "NO_MATCH",
        });

        Assert.Equal(FraudRules.Block, decision.Outcome);
        Assert.Equal(100, decision.RiskScore);
        Assert.Contains(decision.Hits, h => h.RuleId == "R-ICO-01");
        Assert.Contains(decision.Hits, h => h.RuleId == "R-VOP-01");
    }

    [Fact]
    public void Rules_VerifierFailureEscalates()
    {
        var decision = new RuleEngine().Evaluate(new RuleInput { VerifierValid = false });
        Assert.Equal(FraudRules.Escalate, decision.Outcome);
        Assert.Equal(95, decision.RiskScore);
    }

    [Fact]
    public void Rules_AmlPepAndMccEscalate()
    {
        var decision = new RuleEngine().Evaluate(new RuleInput { PepFlag = true, MccCode = "7995" });
        Assert.Equal(FraudRules.Escalate, decision.Outcome);
        Assert.Contains(decision.Hits, h => h.RuleId == "R-PEP-01");
        Assert.Contains(decision.Hits, h => h.RuleId == "R-MCC-01");
    }

    [Fact]
    public void Rules_CleanCaseAutoClears()
    {
        var decision = new RuleEngine().Evaluate(new RuleInput
        {
            Net = 100m, Vat = 21m, Gross = 121m, VopStatus = "MATCH",
        });
        Assert.Equal(FraudRules.AutoClear, decision.Outcome);
        Assert.Equal(0, decision.RiskScore);
    }
}
