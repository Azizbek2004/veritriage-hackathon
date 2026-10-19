using System.Globalization;
using VeriTriage.Domain;

namespace VeriTriage.Verifier;

public static class Gate3_OcrProvenance
{
    public static GateResult Check(EvidenceEnvelope envelope, ClaimAssertion[] claims)
    {
        var steps = new List<ProofStep>();
        var documentClaims = claims.Where(c => c.JsonPointers.Any(p => p.StartsWith("/document/", StringComparison.Ordinal))).ToList();

        foreach (var claim in documentClaims)
        {
            var valid = true;
            var reason = string.Empty;
            var provenance = claim.DocumentProvenance;

            if (provenance is null)
            {
                valid = false;
                reason = "missing provenance";
            }
            else
            {
                if (provenance.OcrConfidence < 99.0m) { valid = false; reason = "ocr_confidence < 99"; }
                var box = provenance.Box;
                if (box is null || box.Left < 0 || box.Left > 100 || box.Top < 0 || box.Top > 100 ||
                    box.Width < 0 || box.Width > 100 || box.Height < 0 || box.Height > 100)
                {
                    valid = false;
                    if (reason.Length == 0) reason = "bounding_box_out_of_range";
                }

                var pointer = claim.JsonPointers.First(p => p.StartsWith("/document/", StringComparison.Ordinal));
                var resolved = JsonPointerResolver.Resolve(envelope.Root, pointer)?.ToString();
                if (!decimal.TryParse(provenance.RawExtractedText, NumberStyles.Number, CultureInfo.InvariantCulture, out var extracted) ||
                    !decimal.TryParse(resolved, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ||
                    extracted != value)
                {
                    valid = false;
                    if (reason.Length == 0) reason = "ocr_text_mismatch";
                }
            }

            steps.Add(new ProofStep(claim.ClaimId, null, null, null, null, "ocr_confidence>=99 AND text_match AND box_in_range", valid, valid, null));
            if (!valid)
            {
                return new GateResult(false, "ocr", documentClaims.Count, steps, reason);
            }
        }

        return new GateResult(true, "ocr", documentClaims.Count, steps, null);
    }
}
