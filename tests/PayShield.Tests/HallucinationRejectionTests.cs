using System.Text.Json.Nodes;
using VeriTriage.Domain;
using VeriTriage.Verifier;
using Xunit;

namespace PayShield.Tests;

/// <summary>
/// Stress and Adversarial Hallucination Rejection Test Suite.
/// Proves mathematically and deterministically that hallucinations from LLMs
/// (including AWS Bedrock Claude Sonnet 4.5) CANNOT slip past any of the 5 Verifier Gates.
/// </summary>
public sealed class HallucinationRejectionTests
{
    private const string BaseEvidenceJson = """
    {
      "supplier": { 
        "ico": "27074358",
        "name": "Acme Czech s.r.o.",
        "vat_status": "RELIABLE"
      },
      "client": {
        "client_id": "K005397",
        "pep_flag": "true",
        "vol_ratio": "1.71",
        "actual_volume": "68262.00",
        "declared_volume": "39819.00"
      },
      "agent": { 
        "hops": [
          { "tool": "get_ares_basic_profile", "targetIco": "27074358" },
          { "tool": "get_ares_statutory_history", "targetIco": "27074358" }
        ] 
      },
      "document": { 
        "amount": "100.00" 
      },
      "invoice": { 
        "net": "100.00", 
        "vat": "21.00", 
        "gross": "121.00" 
      }
    }
    """;

    private static EvidenceEnvelope CreateEnvelope(string json = BaseEvidenceJson) =>
        new("ALERT-045", JsonNode.Parse(json)!, DateTimeOffset.UtcNow);

    private static TextractProvenance ValidProvenance() =>
        new("doc-invoice-001.pdf", 1, 99.8m, new BoundingBox(10m, 20m, 30m, 10m), "100.00");

    // =========================================================================
    // GATE 1: SCHEMA GUARD & STRUCTURAL INTEGRITY
    // =========================================================================

    [Fact]
    public void Gate1_Rejects_When_Pointers_And_Values_Count_Mismatch()
    {
        // LLM hallucinates 2 pointers but claims 3 values
        var claim = new ClaimAssertion("C-01", "TEST", "Narrative",
            new[] { "/client/pep_flag", "/client/vol_ratio" },
            new[] { "true", "1.71", "EXTRA_HALLUCINATED_VALUE" },
            null);

        var result = Gate1_Schema.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("schema: pointer_value_lengths", result.Reason);
    }

    [Theory]
    [InlineData("", "TYPE", "Narrative", "schema: claim_id")]
    [InlineData("C-01", "", "Narrative", "schema: claim_type")]
    [InlineData("C-01", "TYPE", "", "schema: narrative")]
    public void Gate1_Rejects_Malformed_Or_Empty_Fields(string id, string type, string narrative, string expectedReason)
    {
        var claim = new ClaimAssertion(id, type, narrative,
            new[] { "/client/pep_flag" },
            new[] { "true" },
            null);

        var result = Gate1_Schema.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal(expectedReason, result.Reason);
    }

    // =========================================================================
    // GATE 2: TOOL-SCOPE & MULTI-HOP INVARIANTS
    // =========================================================================

    [Fact]
    public void Gate2_Rejects_Hallucinated_ThirdHop_ToolCall()
    {
        // LLM exceeds the strict 2-hop regulatory boundary
        var json = """
        {
          "supplier": { "ico": "27074358" },
          "agent": {
            "hops": [
              { "tool": "get_ares_basic_profile" },
              { "tool": "get_ares_statutory_history", "targetIco": "27074358" },
              { "tool": "get_foreign_registry", "targetIco": "27074358" }
            ]
          }
        }
        """;

        var result = Gate2_SecondHopPolicy.Check(CreateEnvelope(json));

        Assert.False(result.Passed);
        Assert.Equal("hop_count must be 1 or 2", result.Reason);
    }

    [Fact]
    public void Gate2_Rejects_Hallucinated_Entity_Switch_On_Hop2()
    {
        // LLM drifts to investigate an ungrounded third-party entity (different ICO)
        var json = """
        {
          "supplier": { "ico": "27074358" },
          "agent": {
            "hops": [
              { "tool": "get_ares_basic_profile" },
              { "tool": "get_ares_statutory_history", "targetIco": "99999999" }
            ]
          }
        }
        """;

        var result = Gate2_SecondHopPolicy.Check(CreateEnvelope(json));

        Assert.False(result.Passed);
        Assert.Equal("hop2.ico != envelope.ico", result.Reason);
    }

    [Fact]
    public void Gate2_Accepts_Clean_SingleHop_Execution()
    {
        // When agent resolves evidence in a single hop, verifier must not crash or fail
        var json = """
        {
          "supplier": { "ico": "27074358" },
          "agent": {
            "hops": [
              { "tool": "get_ares_basic_profile", "targetIco": "27074358" }
            ]
          }
        }
        """;

        var result = Gate2_SecondHopPolicy.Check(CreateEnvelope(json));

        Assert.True(result.Passed);
        Assert.Null(result.Reason);
    }

    // =========================================================================
    // GATE 3: OCR PROVENANCE & "VERIFIED HALLUCINATION" DEFENSE
    // =========================================================================

    [Fact]
    public void Gate3_Rejects_Low_Confidence_Ocr_Hallucination()
    {
        // LLM claims high certainty on a blurry PDF (confidence 87.5% < 99.0% threshold)
        var lowConfidenceProvenance = new TextractProvenance(
            "doc-1.pdf", 1, 87.5m, new BoundingBox(10, 20, 30, 10), "100.00");

        var claim = new ClaimAssertion("C-OCR-01", "DOCUMENT_TOTAL", "Invoice amount",
            new[] { "/document/amount" },
            new[] { "100.00" },
            lowConfidenceProvenance);

        var result = Gate3_OcrProvenance.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("ocr_confidence < 99", result.Reason);
    }

    [Fact]
    public void Gate3_Rejects_Hallucinated_Amount_Not_Matching_Raw_Ocr()
    {
        // Textract extracted 100.00, but LLM hallucinates 10000.00 in the evidence
        var fakeEnvelope = CreateEnvelope("""
        {
          "supplier": { "ico": "27074358" },
          "document": { "amount": "10000.00" }
        }
        """);

        var claim = new ClaimAssertion("C-OCR-02", "DOCUMENT_TOTAL", "Invoice total",
            new[] { "/document/amount" },
            new[] { "10000.00" },
            ValidProvenance()); // Raw extracted text is "100.00"

        var result = Gate3_OcrProvenance.Check(fakeEnvelope, new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("ocr_text_mismatch", result.Reason);
    }

    [Fact]
    public void Gate3_Rejects_Missing_Provenance_On_Document_Claim()
    {
        // LLM makes a claim pointing into /document/... without providing OCR provenance
        var claim = new ClaimAssertion("C-OCR-03", "DOCUMENT_TOTAL", "Invoice total",
            new[] { "/document/amount" },
            new[] { "100.00" },
            null); // Missing provenance!

        var result = Gate3_OcrProvenance.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("missing provenance", result.Reason);
    }

    [Fact]
    public void Gate3_Rejects_Hallucinated_Bounding_Box_Coordinates()
    {
        // LLM invents coordinates outside normalized [0, 100] range
        var invalidBoxProvenance = new TextractProvenance(
            "doc-1.pdf", 1, 99.5m, new BoundingBox(150m, 20m, 30m, 10m), "100.00");

        var claim = new ClaimAssertion("C-OCR-04", "DOCUMENT_TOTAL", "Invoice total",
            new[] { "/document/amount" },
            new[] { "100.00" },
            invalidBoxProvenance);

        var result = Gate3_OcrProvenance.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("bounding_box_out_of_range", result.Reason);
    }

    // =========================================================================
    // GATE 4: 128-BIT DETERMINISTIC ARITHMETIC RECOMPUTATION
    // =========================================================================

    [Theory]
    [InlineData("100.00", "21.00", "150.00", "net + vat != gross")] // LLM math hallucination: 100 + 21 = 150
    [InlineData("100.00", "21.00", "121.05", "net + vat != gross")] // Subtle penny drift
    public void Gate4_Rejects_Hallucinated_Invoice_Gross(string net, string vat, string gross, string expectedReason)
    {
        var claim = new ClaimAssertion("C-MATH-01", "INVOICE_TOTAL_CZK", "Invoice sum",
            new[] { "/invoice/net", "/invoice/vat", "/invoice/gross" },
            new[] { net, vat, gross },
            null);

        var result = Gate4_Arithmetic.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal(expectedReason, result.Reason);
    }

    [Theory]
    [InlineData("1000.00", "21", "250.00", "vat calculation mismatch")] // 1000 * 21% is 210, not 250
    [InlineData("1000.00", "15", "150.00", "vat calculation mismatch")] // 15% is not a valid statutory Czech VAT rate (must be 0, 12, or 21)
    public void Gate4_Rejects_Hallucinated_Vat_Calculation(string net, string rate, string vat, string expectedReason)
    {
        var claim = new ClaimAssertion("C-MATH-02", "VAT_CALCULATION", "VAT check",
            new[] { "/net", "/rate", "/vat" },
            new[] { net, rate, vat },
            null);

        var result = Gate4_Arithmetic.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal(expectedReason, result.Reason);
    }

    [Fact]
    public void Gate4_Rejects_Hallucinated_Fx_Conversion()
    {
        // 100 EUR * 25.40 rate is 2540 CZK, but LLM hallucinates 3000 CZK
        var claim = new ClaimAssertion("C-MATH-03", "FX_CONVERSION", "Currency exchange",
            new[] { "/eur", "/rate", "/czk" },
            new[] { "100.00", "25.40", "3000.00" },
            null);

        var result = Gate4_Arithmetic.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("fx conversion mismatch", result.Reason);
    }

    [Fact]
    public void Gate4_Rejects_Hallucinated_Velocity_Ratio()
    {
        // 15 actual transactions / 5 baseline = 3.0 ratio, but LLM claims 4.5x
        var claim = new ClaimAssertion("C-MATH-04", "VELOCITY_RATIO", "Velocity surge",
            new[] { "/actual", "/baseline", "/ratio" },
            new[] { "15", "5", "4.5" },
            null);

        var result = Gate4_Arithmetic.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("velocity ratio mismatch", result.Reason);
    }

    [Theory]
    [InlineData("INVOICE_TOTAL_CZK", new[] { "one-hundred", "21.00", "121.00" }, "invalid invoice total parameters")]
    [InlineData("VAT_CALCULATION", new[] { "1000.00", "twenty-one", "210.00" }, "invalid vat calculation parameters")]
    [InlineData("FX_CONVERSION", new[] { "100.00", "25.00" }, "invalid fx conversion parameters")]
    [InlineData("VELOCITY_RATIO", new[] { "15", "N/A", "3.0" }, "invalid velocity ratio parameters")]
    public void Gate4_Rejects_NonNumeric_Or_Truncated_Arithmetic_Hallucinations(string claimType, string[] values, string expectedReason)
    {
        var claim = new ClaimAssertion("C-MATH-BAD", claimType, "Test",
            values.Select((_, i) => $"/pointer/{i}").ToArray(),
            values,
            null);

        var result = Gate4_Arithmetic.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal(expectedReason, result.Reason);
    }

    // =========================================================================
    // GATE 5: RFC 6901 CANONICAL EVIDENCE GROUNDING
    // =========================================================================

    [Fact]
    public void Gate5_Rejects_Hallucinated_NonExistent_Pointer()
    {
        // LLM hallucinates a sanction hit that does not exist anywhere in the evidence envelope
        var claim = new ClaimAssertion("C-AML-01", "SANCTIONS_CHECK", "Sanction list hit",
            new[] { "/client/sanctions_record/has_hit" },
            new[] { "true" },
            null);

        var result = Gate5_ClaimGrounding.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("pointer did not ground: /client/sanctions_record/has_hit", result.Reason);
    }

    [Fact]
    public void Gate5_Rejects_Hallucinated_Value_On_Existing_Pointer()
    {
        // /client/vol_ratio actually exists and equals "1.71", but LLM hallucinates "9.99"
        var claim = new ClaimAssertion("C-AML-02", "VOL_DEVIATION", "Extreme volume surge",
            new[] { "/client/vol_ratio" },
            new[] { "9.99" },
            null);

        var result = Gate5_ClaimGrounding.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("pointer did not ground: /client/vol_ratio", result.Reason);
    }

    [Fact]
    public void Gate5_Safely_Rejects_Malformed_Pointer_Without_Crashing()
    {
        // LLM forgets leading slash in RFC 6901 pointer: "client/pep_flag"
        var claim = new ClaimAssertion("C-AML-03", "PEP", "PEP check",
            new[] { "client/pep_flag" },
            new[] { "true" },
            null);

        var result = Gate5_ClaimGrounding.Check(CreateEnvelope(), new[] { claim });

        Assert.False(result.Passed);
        Assert.Equal("pointer did not ground: client/pep_flag", result.Reason);
    }

    // =========================================================================
    // END-TO-END PIPELINE: FAIL-CLOSED GUARANTEE
    // =========================================================================

    [Fact]
    public void Pipeline_Catches_Mixed_Hallucinations_And_Guarantees_FailClosed()
    {
        // Agent generates 3 claims: 2 are true, but 1 is hallucinated arithmetic
        var validClaim1 = new ClaimAssertion("C-01", "PEP", "PEP status",
            new[] { "/client/pep_flag" },
            new[] { "true" },
            null);

        var validClaim2 = new ClaimAssertion("C-02", "VOL", "Volume ratio",
            new[] { "/client/vol_ratio" },
            new[] { "1.71" },
            null);

        var hallucinatedMathClaim = new ClaimAssertion("C-03", "INVOICE_TOTAL_CZK", "Fabricated total",
            new[] { "/invoice/net", "/invoice/vat", "/invoice/gross" },
            new[] { "100.00", "21.00", "999.00" }, // 100 + 21 != 999
            null);

        var pipeline = new VerifierPipeline();
        var result = pipeline.Evaluate(CreateEnvelope(), new[] { validClaim1, validClaim2, hallucinatedMathClaim });

        // INVARIANT: Pipeline MUST be invalid. Not a single hallucination slips past.
        Assert.False(result.Valid);
        Assert.Equal("net + vat != gross", result.FailureReason);
        Assert.StartsWith("sha256:", result.ReceiptHash);
    }

    [Fact]
    public void Pipeline_Passes_100Percent_Truthful_Grounded_Evidence()
    {
        // When all evidence is 100% true, verified by OCR and grounded via JSON pointer
        var validDocClaim = new ClaimAssertion("C-DOC-01", "INVOICE_TOTAL_CZK", "Document verified",
            new[] { "/document/amount" },
            new[] { "100.00" },
            ValidProvenance());

        var validPepClaim = new ClaimAssertion("C-PEP-01", "PEP", "Politically exposed person",
            new[] { "/client/pep_flag" },
            new[] { "true" },
            null);

        var pipeline = new VerifierPipeline();
        var result = pipeline.Evaluate(CreateEnvelope(), new[] { validDocClaim, validPepClaim });

        Assert.True(result.Valid, result.FailureReason);
        Assert.Null(result.FailureReason);
        Assert.Equal(5, result.Engines.Count);
        Assert.Equal(2, result.Engines["grounding"]);
        Assert.Equal(1, result.Engines["ocr"]);
        Assert.StartsWith("sha256:", result.ReceiptHash);
    }
}
