using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record FauPostponementDeclaration(
    [property: JsonPropertyName("statutory_provision")] string StatutoryProvision,
    [property: JsonPropertyName("postponement_status")] string PostponementStatus,
    [property: JsonPropertyName("postponed_at")] DateTimeOffset PostponedAt,
    [property: JsonPropertyName("statutory_24h_expiry")] DateTimeOffset Statutory24hExpiry,
    [property: JsonPropertyName("statutory_72h_fau_expiry")] DateTimeOffset Statutory72hFauExpiry,
    [property: JsonPropertyName("amount_czk")] decimal AmountCzk,
    [property: JsonPropertyName("currency")] string Currency,
    [property: JsonPropertyName("holding_account_iban")] string HoldingAccountIban,
    [property: JsonPropertyName("asset_safeguard_measure")] string AssetSafeguardMeasure,
    [property: JsonPropertyName("non_tipping_off_acknowledged")] bool NonTippingOffAcknowledged);

public sealed record FauSubjectIdentification(
    [property: JsonPropertyName("client_id")] string ClientId,
    [property: JsonPropertyName("legal_name")] string LegalName,
    [property: JsonPropertyName("ico")] string? Ico,
    [property: JsonPropertyName("registered_address")] string RegisteredAddress,
    [property: JsonPropertyName("pep_flag")] bool PepFlag,
    [property: JsonPropertyName("kyc_risk_tier")] string KycRiskTier,
    [property: JsonPropertyName("statutory_director")] string? StatutoryDirector);

public sealed record FauTransactionParticulars(
    [property: JsonPropertyName("transaction_id")] string TransactionId,
    [property: JsonPropertyName("timestamp")] DateTimeOffset Timestamp,
    [property: JsonPropertyName("amount_czk")] decimal AmountCzk,
    [property: JsonPropertyName("source_iban")] string SourceIban,
    [property: JsonPropertyName("counterparty_iban")] string CounterpartyIban,
    [property: JsonPropertyName("payment_rail")] string PaymentRail,
    [property: JsonPropertyName("variable_symbol")] string? VariableSymbol,
    [property: JsonPropertyName("transaction_purpose")] string TransactionPurpose);

public sealed record FauDualOfficerSignoff(
    [property: JsonPropertyName("investigating_analyst")] string InvestigatingAnalyst,
    [property: JsonPropertyName("analyst_role")] string AnalystRole,
    [property: JsonPropertyName("signing_mlro")] string SigningMlro,
    [property: JsonPropertyName("mlro_designation")] string MlroDesignation,
    [property: JsonPropertyName("signed_at")] DateTimeOffset SignedAt,
    [property: JsonPropertyName("four_eyes_verified")] bool FourEyesVerified,
    [property: JsonPropertyName("receipt_sha256")] string ReceiptSha256);

public sealed record FauReportPacket(
    [property: JsonPropertyName("fau_reference_number")] string FauReferenceNumber,
    [property: JsonPropertyName("obliged_entity_code")] string ObligedEntityCode,
    [property: JsonPropertyName("obliged_entity_name")] string ObligedEntityName,
    [property: JsonPropertyName("designated_contact_person")] string DesignatedContactPerson,
    [property: JsonPropertyName("filing_timestamp")] DateTimeOffset FilingTimestamp,
    [property: JsonPropertyName("postponement")] FauPostponementDeclaration Postponement,
    [property: JsonPropertyName("subject")] FauSubjectIdentification Subject,
    [property: JsonPropertyName("transaction")] FauTransactionParticulars Transaction,
    [property: JsonPropertyName("statutory_typologies")] IReadOnlyList<string> StatutoryTypologies,
    [property: JsonPropertyName("forensic_evidence_summary")] string ForensicEvidenceSummary,
    [property: JsonPropertyName("signoff")] FauDualOfficerSignoff Signoff)
{
    public string ToOfficialXml()
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<OznámeníPodezřeléhoObchodu xmlns=\"http://fau.gov.cz/aml/opo/2026/v1\">");
        sb.AppendLine($"  <Záhlaví Reference=\"{FauReferenceNumber}\" DatumPodání=\"{FilingTimestamp:yyyy-MM-ddTHH:mm:ssZ}\">");
        sb.AppendLine($"    <PovinnáOsoba Kód=\"{ObligedEntityCode}\" Název=\"{ObligedEntityName}\" UrčenáOsoba=\"{DesignatedContactPerson}\" />");
        sb.AppendLine("  </Záhlaví>");
        sb.AppendLine("  <OdloženíSplněníPříkazu Ustanovení=\"Zákon č. 253/2008 Sb. § 20 odst. 1\">");
        sb.AppendLine($"    <Stav>{Postponement.PostponementStatus}</Stav>");
        sb.AppendLine($"    <Částka Měna=\"{Postponement.Currency}\">{Postponement.AmountCzk:F2}</Částka>");
        sb.AppendLine($"    <ZajišťovacíÚčet>{Postponement.HoldingAccountIban}</ZajišťovacíÚčet>");
        sb.AppendLine($"    <Lhůta24h Vypršení=\"{Postponement.Statutory24hExpiry:yyyy-MM-ddTHH:mm:ssZ}\" />");
        sb.AppendLine($"    <Lhůta72hFAÚ Vypršení=\"{Postponement.Statutory72hFauExpiry:yyyy-MM-ddTHH:mm:ssZ}\" />");
        sb.AppendLine($"    <ZajištěníMajetku>{Postponement.AssetSafeguardMeasure}</ZajištěníMajetku>");
        sb.AppendLine("  </OdloženíSplněníPříkazu>");
        sb.AppendLine("  <Subjekt>");
        sb.AppendLine($"    <Klient Identifikátor=\"{Subject.ClientId}\" Název=\"{Subject.LegalName}\" IČO=\"{Subject.Ico ?? "N/A"}\" PEP=\"{Subject.PepFlag}\" Riziko=\"{Subject.KycRiskTier}\" />");
        sb.AppendLine($"    <Sídlo>{Subject.RegisteredAddress}</Sídlo>");
        if (!string.IsNullOrWhiteSpace(Subject.StatutoryDirector))
            sb.AppendLine($"    <StatutárníOrgán>{Subject.StatutoryDirector}</StatutárníOrgán>");
        sb.AppendLine("  </Subjekt>");
        sb.AppendLine("  <Transakce>");
        sb.AppendLine($"    <Obchod ID=\"{Transaction.TransactionId}\" Datum=\"{Transaction.Timestamp:yyyy-MM-ddTHH:mm:ssZ}\" Částka=\"{Transaction.AmountCzk:F2}\" />");
        sb.AppendLine($"    <ZdrojovýÚčet>{Transaction.SourceIban}</ZdrojovýÚčet>");
        sb.AppendLine($"    <Protiúčet>{Transaction.CounterpartyIban}</Protiúčet>");
        sb.AppendLine($"    <PlatebníSystém>{Transaction.PaymentRail}</PlatebníSystém>");
        sb.AppendLine($"    <ÚčelPlatby>{Transaction.TransactionPurpose}</ÚčelPlatby>");
        sb.AppendLine("  </Transakce>");
        sb.AppendLine("  <ZnakyPodezřelosti>");
        foreach (var typo in StatutoryTypologies)
            sb.AppendLine($"    <Znak>{typo}</Znak>");
        sb.AppendLine($"    <ForenzníDůkaz>{ForensicEvidenceSummary}</ForenzníDůkaz>");
        sb.AppendLine("  </ZnakyPodezřelosti>");
        sb.AppendLine("  <KontrolaČtyřOčí>");
        sb.AppendLine($"    <VyšetřujícíAnalytik Jméno=\"{Signoff.InvestigatingAnalyst}\" Role=\"{Signoff.AnalystRole}\" />");
        sb.AppendLine($"    <SchvalujícíMLRO Jméno=\"{Signoff.SigningMlro}\" Funkce=\"{Signoff.MlroDesignation}\" Datum=\"{Signoff.SignedAt:yyyy-MM-ddTHH:mm:ssZ}\" />");
        sb.AppendLine($"    <KontrolaOvěřena>{Signoff.FourEyesVerified}</KontrolaOvěřena>");
        sb.AppendLine($"    <OtiskStvrzenky Algoritmus=\"SHA-256\">{Signoff.ReceiptSha256}</OtiskStvrzenky>");
        sb.AppendLine("  </KontrolaČtyřOčí>");
        sb.AppendLine("</OznámeníPodezřeléhoObchodu>");
        return sb.ToString();
    }
}
