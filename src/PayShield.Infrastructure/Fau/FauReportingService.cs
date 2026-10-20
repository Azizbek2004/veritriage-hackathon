using System.Security.Cryptography;
using System.Text;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Audit;
using VeriTriage.Infrastructure.Data;

namespace VeriTriage.Infrastructure.Fau;

public sealed class FauReportingService
{
    private readonly CnbTransactionIndex _index;
    private readonly FileAuditLedger _auditLedger;
    private readonly Dictionary<string, FauReportPacket> _postponedCases = new(StringComparer.Ordinal);

    public FauReportingService(CnbTransactionIndex index, FileAuditLedger auditLedger)
    {
        _index = index;
        _auditLedger = auditLedger;
    }

    public FauReportPacket PostponeAndGenerateReport(
        DeliverableCsvRow caseRow,
        string executiveUser,
        string executiveRole,
        string approverUser,
        string holdingIban = "CZ0000000000009999999999")
    {
        var client = _index.GetClient(caseRow.ClientId);
        var txs = _index.GetByClient(caseRow.ClientId);
        var targetTx = txs.FirstOrDefault(t => t.Id == caseRow.TransactionId) ?? txs.FirstOrDefault();

        var amount = targetTx?.AmountCzk ?? 24500.00m;
        var now = DateTimeOffset.UtcNow;
        var expiry24h = now.AddHours(24);
        var expiry72h = now.AddHours(72);

        var refNum = $"FAU-OPO-{now:yyyyMMdd}-{caseRow.AlertId}";

        var postponement = new FauPostponementDeclaration(
            "Zákon č. 253/2008 Sb. § 20 odst. 1 (Odložení splnění příkazu klienta)",
            "POSTPONED_24H",
            now,
            expiry24h,
            expiry72h,
            amount,
            "CZK",
            holdingIban,
            "Prostředky zajištěny na technickém účtu povinné osoby s blokací odchozích plateb do vyjádření FAÚ.",
            NonTippingOffAcknowledged: true);

        var subject = new FauSubjectIdentification(
            caseRow.ClientId,
            $"Subjekt {caseRow.ClientId} s.r.o.",
            "28492011",
            "Václavské náměstí 846/1, 110 00 Praha 1",
            client?.Pep ?? false,
            client?.RiskScore?.ToUpperInvariant() ?? "HIGH",
            "Ing. Petr Novotný");

        var particulars = new FauTransactionParticulars(
            caseRow.TransactionId,
            now.AddMinutes(-15),
            amount,
            "CZ5508000000192000888111",
            targetTx?.CounterpartyAccount ?? "CZ6508000000192000145399",
            "CERTIS / Okamžitá platba",
            "2026041901",
            "Odložený příkaz k úhradě vykazující znaky strukturování a legalizace výnosů");

        var typologies = new List<string>
        {
            "Zákon č. 253/2008 Sb. § 6 odst. 1 písm. a) — neobvyklý objem transakce neodpovídající profilu",
            "Zákon č. 253/2008 Sb. § 6 odst. 1 písm. b) — strukturování transakcí těsně pod limitem identifikace",
            "Zákon č. 253/2008 Sb. § 6 odst. 1 písm. g) — komplexní síťová vazba postrádající zřejmý ekonomický smysl",
            "ČNB vyhláška č. 67/2018 Sb. § 6 odst. 1 písm. b) — vysoká koncentrace převodů na neprověřené sběrné účty"
        };

        var receiptHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{caseRow.AlertId}:{amount}:{now:O}:{approverUser}"))).ToLowerInvariant();

        var signoff = new FauDualOfficerSignoff(
            executiveUser,
            executiveRole,
            approverUser,
            "Určená osoba (§ 22 zákona č. 253/2008 Sb. / MLRO)",
            now,
            FourEyesVerified: !string.Equals(executiveUser, approverUser, StringComparison.OrdinalIgnoreCase),
            receiptHash);

        var packet = new FauReportPacket(
            refNum,
            "0800",
            "Česká platební instituce a.s.",
            approverUser,
            now,
            postponement,
            subject,
            particulars,
            typologies,
            caseRow.Reason,
            signoff);

        _postponedCases[caseRow.AlertId] = packet;

        _auditLedger.Append(caseRow.AlertId, "FAU_POSTPONEMENT_FILED", new
        {
            fau_reference = refNum,
            statutory_ground = "Act 253/2008 § 20(1)",
            amount_czk = amount,
            expiry_24h = expiry24h,
            signoff_mlro = approverUser,
            executive_analyst = executiveUser,
            receipt_hash = receiptHash
        });

        return packet;
    }

    public FauReportPacket? GetReport(string alertId) =>
        _postponedCases.GetValueOrDefault(alertId);

    public IReadOnlyCollection<FauReportPacket> GetAllReports() =>
        _postponedCases.Values.ToList();
}
