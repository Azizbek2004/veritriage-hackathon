namespace VeriTriage.Domain;

public sealed class RuleEngine
{
    public RuleDecision Evaluate(RuleInput input)
    {
        var hits = new List<RuleHit>();

        if (!input.IcoValid) hits.Add(new("R-ICO-01", 100, FraudRules.Block, "", "Invalid IČO checksum"));
        if (!input.IbanValid) hits.Add(new("R-IBAN-01", 100, FraudRules.Block, "", "Invalid IBAN mod-97"));
        if (Math.Abs(input.Net + input.Vat - input.Gross) > 0.01m) hits.Add(new("R-MATH-01", 100, FraudRules.Block, "", "Invoice arithmetic mismatch"));
        if (input.SanctionsHit) hits.Add(new("R-SANCTIONS-01", 100, FraudRules.Block, "PSR Art. 59", "Sanctions hit"));
        if (input.VopStatus == "NO_MATCH") hits.Add(new("R-VOP-01", 90, FraudRules.Escalate, "PSR Art. 59", "VoP no match"));
        if (input.IbanChanged) hits.Add(new("R-BEC-01", 90, FraudRules.Escalate, "", "Supplier IBAN changed"));
        if (input.VelocityBaseline > 0 && input.TransactionCount24h >= 3 * input.VelocityBaseline)
            hits.Add(new("R-VELOCITY-01", 80, FraudRules.Escalate, "", "Velocity 3x baseline"));
        if (input.EntityAgeDays < 30 && input.AmountCzk > 50000)
            hits.Add(new("R-AGE-01", 75, FraudRules.Escalate, "", "New entity with high amount"));
        if (input.VopStatus == "CLOSE_MATCH" && input.IbanInPublishedAccounts)
            hits.Add(new("R-VOP-02", 0, FraudRules.AutoClear, "", "Close match on published account"));
        if (!input.VerifierValid) hits.Add(new("R-VERIFY-01", 95, FraudRules.Escalate, "AI Act Art. 14", "Verifier failed closed"));
        if (input.PepFlag) hits.Add(new("R-PEP-01", 90, FraudRules.Escalate, "AML Act 253/2008 Sb. § 20/§ 22", "PEP flag"));
        if (input.MccCode is "7995" or "5967")
            hits.Add(new("R-MCC-01", 85, FraudRules.Escalate, "AML Act 253/2008 Sb. § 20", "High-risk MCC"));

        var outcome = hits.Any(h => h.Outcome == FraudRules.Block) ? FraudRules.Block
            : hits.Any(h => h.Outcome == FraudRules.Escalate) ? FraudRules.Escalate
            : FraudRules.AutoClear;
        var score = Math.Min(100, hits.Sum(h => h.Severity));
        return new RuleDecision(outcome, score, hits);
    }
}
