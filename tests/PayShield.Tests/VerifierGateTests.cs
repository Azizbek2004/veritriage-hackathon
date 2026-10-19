using System.Text.Json.Nodes;
using VeriTriage.Domain;
using VeriTriage.Verifier;
using Xunit;

namespace PayShield.Tests;

public sealed class VerifierGateTests
{
    private const string RootJson = """
    {
      "supplier": { "ico": "27074358" },
      "agent": { "hops": [
        { "tool": "get_ares_basic_profile" },
        { "tool": "get_ares_statutory_history", "targetIco": "27074358" }
      ] },
      "document": { "amount": "100.00" },
      "invoice": { "net": "100.00", "vat": "21.00", "gross": "121.00" }
    }
    """;

    private static EvidenceEnvelope Envelope(string json = RootJson) =>
        new("case-1", JsonNode.Parse(json)!, DateTimeOffset.UnixEpoch);

    private static ClaimAssertion Claim(
        string type = "INVOICE_TOTAL_CZK",
        string[]? pointers = null,
        string[]? values = null,
        TextractProvenance? provenance = null) =>
        new("claim-1", type, "narrative", pointers ?? new[] { "/invoice/net", "/invoice/vat", "/invoice/gross" },
            values ?? new[] { "100.00", "21.00", "121.00" }, provenance);

    private static TextractProvenance Provenance(decimal confidence = 99.5m, decimal left = 1m) =>
        new("doc-1", 1, confidence, new BoundingBox(left, 1, 2, 2), "100.00");

    [Fact]
    public void Gate1_RejectsPointerValueLengthMismatch()
    {
        var claim = new ClaimAssertion("c", "T", "n", new[] { "/supplier/ico" }, new[] { "a", "b" }, null);
        var result = Gate1_Schema.Check(Envelope(), new[] { claim });
        Assert.False(result.Passed);
    }

    [Fact]
    public void Gate1_AcceptsValidEnvelope()
    {
        var result = Gate1_Schema.Check(Envelope(), new[] { Claim() });
        Assert.True(result.Passed);
        Assert.Equal(5, result.Engine is "schema" ? 5 : 0);
    }

    [Fact]
    public void Gate2_RejectsThreeHop()
    {
        var root = JsonNode.Parse("""{"supplier":{"ico":"1"},"agent":{"hops":[{},{},{}]}}""")!;
        var result = Gate2_SecondHopPolicy.Check(new EvidenceEnvelope("c", root, DateTimeOffset.UnixEpoch));
        Assert.False(result.Passed);
    }

    [Fact]
    public void Gate2_RejectsDifferentIcoOnHop2()
    {
        var root = JsonNode.Parse("""{"supplier":{"ico":"1"},"agent":{"hops":[{},{"targetIco":"2"}]}}""")!;
        var result = Gate2_SecondHopPolicy.Check(new EvidenceEnvelope("c", root, DateTimeOffset.UnixEpoch));
        Assert.False(result.Passed);
    }

    [Fact]
    public void Gate3_RejectsLowOcrConfidence()
    {
        var claim = Claim("INVOICE_TOTAL_CZK", new[] { "/document/amount" }, new[] { "100.00" }, Provenance(98.9m));
        var result = Gate3_OcrProvenance.Check(Envelope(), new[] { claim });
        Assert.False(result.Passed);
    }

    [Fact]
    public void Gate3_RejectsBoundingBoxOutOfRange()
    {
        var claim = Claim("INVOICE_TOTAL_CZK", new[] { "/document/amount" }, new[] { "100.00" }, Provenance(99.5m, 101m));
        var result = Gate3_OcrProvenance.Check(Envelope(), new[] { claim });
        Assert.False(result.Passed);
    }

    [Fact]
    public void Gate4_RejectsArithmeticMismatch()
    {
        var claim = Claim(values: new[] { "100.00", "21.00", "120.00" });
        var result = Gate4_Arithmetic.Check(Envelope(), new[] { claim });
        Assert.False(result.Passed);
    }

    [Fact]
    public void Gate4_AcceptsExactInvoice()
    {
        var result = Gate4_Arithmetic.Check(Envelope(), new[] { Claim() });
        Assert.True(result.Passed);
        Assert.Equal(1, result.Count);
    }

    [Fact]
    public void Gate5_RejectsUngroundedClaim()
    {
        var claim = Claim("X", new[] { "/supplier/missing" }, new[] { "x" });
        var result = Gate5_ClaimGrounding.Check(Envelope(), new[] { claim });
        Assert.False(result.Passed);
    }

    [Fact]
    public void Gate5_RejectsValueMismatch()
    {
        var claim = Claim("X", new[] { "/supplier/ico" }, new[] { "999" });
        var result = Gate5_ClaimGrounding.Check(Envelope(), new[] { claim });
        Assert.False(result.Passed);
    }

    [Fact]
    public void Pipeline_PassesGroundedDocumentClaim()
    {
        var claim = Claim("INVOICE_TOTAL_CZK", new[] { "/document/amount" }, new[] { "100.00" }, Provenance());
        var result = new VerifierPipeline().Evaluate(Envelope(), new[] { claim });
        Assert.True(result.Valid, result.FailureReason);
        Assert.Equal(5, result.Engines.Count);
        Assert.StartsWith("sha256:", result.ReceiptHash);
    }
}
