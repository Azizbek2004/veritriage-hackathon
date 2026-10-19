using System.Text.Json.Nodes;
using VeriTriage.Infrastructure.Bedrock;
using Xunit;

namespace PayShield.Tests;

public sealed class BedrockServiceTests
{
    [Fact]
    public void CassetteFallback_LoadsValidJsonWhenOffline()
    {
        var cassette = new CassetteInterceptor();
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
        var json = cassette.LoadHeroResponse(repoRoot);

        var node = JsonNode.Parse(json);
        Assert.NotNull(node);
        Assert.Equal("LIVE_BEDROCK_CACHED", node["mode"]?.ToString());
    }

    [Fact]
    public async Task LiveBedrockService_ReturnsJsonDossier()
    {
        var service = new LiveBedrockService();
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
        var result = await service.InvestigateAsync("ALERT-045", "Client K005397 (PEP)", repoRoot);

        var node = JsonNode.Parse(result);
        Assert.NotNull(node);
        var mode = node["mode"]?.ToString();
        Assert.True(mode == "LIVE_BEDROCK" || mode == "LIVE_BEDROCK_CACHED");
        Assert.NotNull(node["claims"]);
        Assert.NotNull(node["legalBasis"]);
    }

    [Fact]
    public async Task LiveBedrockService_ProbeAsync_DoesNotThrow()
    {
        var service = new LiveBedrockService();
        var probe = await service.ProbeAsync();
        Assert.NotNull(probe);
    }
}
