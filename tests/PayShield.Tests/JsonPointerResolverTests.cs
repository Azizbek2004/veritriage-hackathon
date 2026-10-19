using System.Text.Json.Nodes;
using VeriTriage.Verifier;
using Xunit;

namespace PayShield.Tests;

public sealed class JsonPointerResolverTests
{
    [Fact]
    public void Resolve_HandlesEscapedSegmentsAndMissingPaths()
    {
        var root = JsonNode.Parse("""{"a/b":{"m~n":[10,20]}}""")!;

        Assert.Equal("20", JsonPointerResolver.Resolve(root, "/a~1b/m~0n/1")?.ToString());
        Assert.Null(JsonPointerResolver.Resolve(root, "/a~1b/missing"));
    }
}
