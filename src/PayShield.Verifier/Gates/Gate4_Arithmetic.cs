using System.Globalization;
using VeriTriage.Domain;

namespace VeriTriage.Verifier;

public static class Gate4_Arithmetic
{
    public static GateResult Check(EvidenceEnvelope envelope, ClaimAssertion[] claims)
    {
        var steps = new List<ProofStep>();
        var count = 0;

        foreach (var claim in claims)
        {
            var values = claim.ExpectedValues.Select(v => Parse(v)).ToArray();
            switch (claim.ClaimType)
            {
                case "INVOICE_TOTAL_CZK":
                {
                    if (values.Length >= 3)
                    {
                        if (values.Take(3).Any(v => !v.HasValue))
                            return new GateResult(false, "arithmetic", count, steps, "invalid invoice total parameters");
                        count++;
                        var valid = Math.Abs(values[0]!.Value + values[1]!.Value - values[2]!.Value) <= 0.01m;
                        steps.Add(new ProofStep(claim.ClaimId, values[0] + values[1], values[2], null, null, "net+vat=gross", valid, valid, null));
                        if (!valid) return new GateResult(false, "arithmetic", count, steps, "net + vat != gross");
                    }
                    else if (values.Length != 1 || !values[0].HasValue)
                    {
                        return new GateResult(false, "arithmetic", count, steps, "invalid invoice total parameters");
                    }
                    break;
                }
                case "VAT_CALCULATION":
                {
                    if (values.Length < 3 || values.Take(3).Any(v => !v.HasValue))
                        return new GateResult(false, "arithmetic", count, steps, "invalid vat calculation parameters");
                    count++;
                    var rate = values[1]!.Value;
                    var valid = (rate is 0 or 12 or 21) && Math.Abs(values[0]!.Value * rate / 100m - values[2]!.Value) <= 0.01m;
                    steps.Add(new ProofStep(claim.ClaimId, values[0] * rate / 100m, values[2], rate, null, "net*rate=vat", valid, valid, null));
                    if (!valid) return new GateResult(false, "arithmetic", count, steps, "vat calculation mismatch");
                    break;
                }
                case "FX_CONVERSION":
                {
                    if (values.Length < 3 || values.Take(3).Any(v => !v.HasValue))
                        return new GateResult(false, "arithmetic", count, steps, "invalid fx conversion parameters");
                    count++;
                    var valid = Math.Abs(values[0]!.Value * values[1]!.Value - values[2]!.Value) <= 0.01m;
                    steps.Add(new ProofStep(claim.ClaimId, values[0] * values[1], values[2], null, null, "eur*rate=czk", valid, valid, null));
                    if (!valid) return new GateResult(false, "arithmetic", count, steps, "fx conversion mismatch");
                    break;
                }
                case "VELOCITY_RATIO":
                {
                    if (values.Length < 3 || values.Take(3).Any(v => !v.HasValue))
                        return new GateResult(false, "arithmetic", count, steps, "invalid velocity ratio parameters");
                    count++;
                    var ratio = values[1]!.Value == 0 ? 0 : values[0]!.Value / values[1]!.Value;
                    var valid = values[1]!.Value != 0 && Math.Abs(ratio - values[2]!.Value) <= 0.01m;
                    steps.Add(new ProofStep(claim.ClaimId, ratio, values[2], ratio, null, "count/baseline=ratio", valid, valid, null));
                    if (!valid) return new GateResult(false, "arithmetic", count, steps, "velocity ratio mismatch");
                    break;
                }
            }
        }

        return new GateResult(true, "arithmetic", count, steps, null);
    }

    private static decimal? Parse(string value) =>
        decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var result) ? result : null;
}
