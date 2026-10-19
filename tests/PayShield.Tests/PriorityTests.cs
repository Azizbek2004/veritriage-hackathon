using VeriTriage.Domain;
using Xunit;

namespace PayShield.Tests;

public sealed class PriorityTests
{
    [Fact]
    public void Priority_WhenAllComponentsMax_ReturnsRaw125AndDisplay100()
    {
        var result = FinregDeliverableEngine.ComputePriority(new PriorityComponents(40, 30, 25, 20, 10));
        Assert.Equal(125, result.RawPriority);
        Assert.Equal(100, result.DisplayPriority);
    }

    [Fact]
    public void Confidence_FullData_Returns100() =>
        Assert.Equal(100, FinregDeliverableEngine.ComputeConfidence(new ConfidenceEvidence(true, true, true, true, 0.95m, 5)));

    [Fact]
    public void Confidence_MissingAresBasic_Returns60() =>
        Assert.Equal(60, FinregDeliverableEngine.ComputeConfidence(new ConfidenceEvidence(false, false, true, true, 0.95m, 5)));

    [Fact]
    public void Confidence_MissingOcr_Returns80() =>
        Assert.Equal(80, FinregDeliverableEngine.ComputeConfidence(new ConfidenceEvidence(true, true, true, true, 0.50m, 5)));
}
