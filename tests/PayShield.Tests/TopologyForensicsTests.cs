using VeriTriage.Domain;
using Xunit;

namespace PayShield.Tests;

public sealed class TopologyForensicsTests
{
    [Fact]
    public void RadialDistance_WhenTopologyScoreIs88_Returns0Point12()
    {
        var result = TopologyMath.ComputeTopology(100, 100, 52);
        Assert.Equal(88, result.TopologyScore);
        Assert.Equal(0.12m, result.RadialDistance);
        Assert.Equal(0.12m, TopologyMath.RadialDistance(88));
    }

    [Fact]
    public void ForensicRole_WhenHighFanInAndFastPassThrough_ClassifiesAsMuleAggregator() =>
        Assert.Equal("MULE_AGGREGATOR", TopologyMath.ClassifyRole(4, true, 100, 95, 2m, "high", 1.5m, false, true));

    [Fact]
    public void ForensicRole_WhenLowTierClientDrainsToMuleHub_ClassifiesAsCompromisedVictim() =>
        Assert.Equal("COMPROMISED_VICTIM", TopologyMath.ClassifyRole(1, false, 35, 58, 18m, "low", 3.2m, true, true));

    [Fact]
    public void AccountCorrelation_WhenSharedIbanAndTemporalSync_ReturnsScoreAbove75()
    {
        var score = TopologyMath.CorrelationScore(100, 100, 80, 60);
        Assert.True(score > 75);
        Assert.Equal(90, score);
    }
}
