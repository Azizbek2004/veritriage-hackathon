using System.IO.Compression;
using System.Security.Cryptography;
using System.Globalization;
using System.Text;
using System.Text.Json;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Audit;
using VeriTriage.Infrastructure.Data;
using VeriTriage.Infrastructure.Legal;

namespace PayShield.Api;

public sealed record AnalysisDocument(
    string Id,
    string CaseId,
    string FilePath,
    string Format,
    string EvidenceHash,
    string DocumentHash,
    DateTimeOffset GeneratedAt,
    string GeneratedBy,
    string? SignedBy = null,
    string? SignatureHash = null);

public sealed record DocumentSignRequest(string SignedBy);

public interface IDeepAnalysisService
{
    AnalysisDocument Generate(DeliverableCsvRow row, string generatedBy);
    IReadOnlyList<AnalysisDocument> List(string caseId);
    AnalysisDocument? Get(string id);
    bool Verify(AnalysisDocument document);
    AnalysisDocument? Sign(string id, string signedBy);
    byte[] Bundle(AnalysisDocument doc, DeliverableCsvRow row);
}

public sealed class DeepAnalysisService : IDeepAnalysisService
{
    private readonly string _root;
    private readonly CnbTransactionIndex _index;
    private readonly FileAuditLedger _ledger;
    private readonly FatfCorpus _fatf;
    private readonly DeterministicForensicAnalyzer _analyzer;
    private readonly object _gate = new();

    public DeepAnalysisService(string repoRoot, CnbTransactionIndex index, FileAuditLedger ledger, FatfCorpus fatf, DeterministicForensicAnalyzer analyzer)
    {
        _root = repoRoot;
        _index = index;
        _ledger = ledger;
        _fatf = fatf;
        _analyzer = analyzer;
    }

    public AnalysisDocument Generate(DeliverableCsvRow row, string generatedBy)
    {
        lock (_gate)
        {
            var id = $"doc-{Guid.NewGuid():N}";
            var dir = Path.Combine(_root, "documents", row.AlertId);
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, $"{id}.md");
            var text = BuildMarkdown(row, generatedBy);
            File.WriteAllText(path, text);
            var hash = Hash(text);
            var doc = new AnalysisDocument(id, row.AlertId, path, "markdown", Hash($"{row.AlertId}|{row.ClientId}|{row.TransactionId}|{row.Priority}"), hash, DateTimeOffset.UtcNow, generatedBy);
            Save(doc);
            _ledger.Append(row.AlertId, "DEEP_ANALYSIS_GENERATED", new { document_id = id, document_hash = hash, evidence_hash = doc.EvidenceHash });
            return doc;
        }
    }

    public IReadOnlyList<AnalysisDocument> List(string caseId)
    {
        lock (_gate) return Load().Where(d => d.CaseId == caseId).OrderByDescending(d => d.GeneratedAt).ToList();
    }

    public AnalysisDocument? Get(string id)
    {
        lock (_gate) return Load().FirstOrDefault(d => d.Id == id);
    }

    public bool Verify(AnalysisDocument document)
    {
        try { return File.Exists(document.FilePath) && Hash(File.ReadAllText(document.FilePath)) == document.DocumentHash; }
        catch { return false; }
    }

    public AnalysisDocument? Sign(string id, string signedBy)
    {
        lock (_gate)
        {
            var docs = Load();
            var index = docs.FindIndex(d => d.Id == id);
            if (index < 0) return null;
            var doc = docs[index];
            var signature = Hash($"{doc.DocumentHash}|{signedBy}|{DateTimeOffset.UtcNow:O}");
            docs[index] = doc with { SignedBy = signedBy, SignatureHash = signature };
            Write(docs);
            _ledger.Append(doc.CaseId, "DEEP_ANALYSIS_SIGNED", new { document_id = id, signature_hash = signature, signed_by = signedBy });
            return docs[index];
        }
    }

    public byte[] Bundle(AnalysisDocument doc, DeliverableCsvRow row)
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            Add(zip, "analysis.md", File.ReadAllText(doc.FilePath));
            Add(zip, "evidence.json", JsonSerializer.Serialize(new { row, document_hash = doc.DocumentHash, evidence_hash = doc.EvidenceHash }, JsonOptions));
            Add(zip, "audit_chain.json", JsonSerializer.Serialize(_ledger.Get(doc.CaseId), JsonOptions));
            Add(zip, "rule_registry.json", JsonSerializer.Serialize(RuleRegistry.All, JsonOptions));
            Add(zip, "fatf_references.json", JsonSerializer.Serialize(_fatf.All, JsonOptions));
            Add(zip, "signatures.json", JsonSerializer.Serialize(new { document_id = doc.Id, signed_by = doc.SignedBy, signature_hash = doc.SignatureHash }, JsonOptions));
        }
        return ms.ToArray();
    }

    private string BuildMarkdown(DeliverableCsvRow row, string generatedBy)
    {
        var explanation = ExplanationBuilder.Build(row);
        var client = _index.GetClient(row.ClientId);
        var siblings = _index.GetByClient(row.ClientId).Take(12).ToList();
        var audit = _ledger.Get(row.AlertId);
        var vector = _analyzer.Analyze(row);
        var sb = new StringBuilder();

        sb.AppendLine($"# ČNB / FAÚ AML Compliance Dossier — {row.AlertId}");
        sb.AppendLine();
        sb.AppendLine("> [!IMPORTANT]");
        sb.AppendLine($"> **Case:** `{row.AlertId}` | **Client:** `{row.ClientId}` | **Transaction:** `{row.TransactionId}` | **Priority:** **{row.Priority}/100** ({row.Triage})");
        sb.AppendLine($"> **Generated:** `{DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss} UTC` by `{generatedBy}` | **Legal Basis:** Czech AML Act No. 253/2008 Sb. § 6, § 21");
        sb.AppendLine();
        sb.AppendLine("## 1. Executive Summary & Statutory Grounds");
        sb.AppendLine();
        sb.AppendLine(row.Reason);
        sb.AppendLine();
        sb.AppendLine("### Case Classification Metadata");
        sb.AppendLine("| Parameter | Value | Reference / Notes |");
        sb.AppendLine("|---|---|---|");
        sb.AppendLine($"| **Alert ID** | `{row.AlertId}` | Track 5 AML FINREG |");
        sb.AppendLine($"| **Client ID** | `{row.ClientId}` | {(client?.Pep == true ? "⚠️ Politically Exposed Person (§ 9a(2)(c))" : "Standard Client")} |");
        sb.AppendLine($"| **Transaction ID** | `{row.TransactionId}` | ČNB Transaction Index |");
        sb.AppendLine($"| **Triage Outcome** | **{row.Triage}** | Priority score: {row.Priority}/100 |");
        if (row.Breakdown is { } bd)
        {
            sb.AppendLine($"| **Priority Formula** | `B{bd.Base} + V{bd.Vol} + P{bd.Pep} + S{bd.Struct} + C{bd.Channel}` | Base {bd.Base}, Vol {bd.Vol}, PEP {bd.Pep}, Struct {bd.Struct}, Channel {bd.Channel} |");
        }
        sb.AppendLine();
        sb.AppendLine("## 2. Quantitative Forensic Typology Vectors");
        sb.AppendLine();
        sb.AppendLine("| Typology Metric | Measured Value | Statutory / Behavioral Significance |");
        sb.AppendLine("|---|---:|---|");
        sb.AppendLine($"| **Volume Deviation** | **{vector.VelocityRatio:0.00}x** | Actual {vector.ActualVolume:N0} CZK vs Declared Expected {vector.ExpectedVolume:N0} CZK (§ 6(1)(a)) |");
        sb.AppendLine($"| **Transaction Count Ratio** | **{vector.CountRatio:0.00}x** | Actual {vector.ActualCount} tx vs Declared Expected {vector.ExpectedCount} tx |");
        sb.AppendLine($"| **72h Sub-Threshold Cluster** | **{vector.Structuring72h.Count} tx** ({vector.Structuring72h.SumCzk:N0} CZK) | Structuring below reporting threshold within window (§ 6(1)(b)) |");
        sb.AppendLine($"| **Counterparty Concentration (HHI)** | **{vector.CounterpartyHhi:0}** | Outbound distribution index (0-10,000 scale) |");
        sb.AppendLine($"| **Shared Counterparty Links** | **{vector.SharedCounterpartyLinks} peers** | Other clients transacting with same IBAN: `{vector.PrimaryCounterparty ?? "N/A"}` |");
        sb.AppendLine($"| **Round Amount Frequency** | **{vector.RoundAmountRatio:0.0}%** | Ratio of round-sum transfers (% 1,000 CZK) |");
        sb.AppendLine($"| **In / Out Ratio** | **{vector.InOutRatio:0.0000}** | Inbound vs outbound turnover velocity |");
        sb.AppendLine();
        sb.AppendLine("### Typology Assessment");
        sb.AppendLine(vector.FraudNarrative);
        sb.AppendLine();
        sb.AppendLine("## 3. Deterministic C# Verifier Gate Checks (0-Token Local Prover)");
        sb.AppendLine();
        sb.AppendLine("| Gate Check | Status | Verification Detail | Legal / Technical Standard |");
        sb.AppendLine("|---|:---:|---|---|");
        foreach (var gate in vector.Gates)
        {
            var statusBadge = gate.Pass ? "✅ **PASS**" : "❌ **FAIL**";
            var standard = gate.Gate switch
            {
                "SCHEMA" => "Act 253/2008 Sb. § 20",
                "FOUR_EYES_SEPARATION" => "Decree 67/2018 § 12 (4-eyes)",
                "DECIMAL_RECOMPUTATION" => "System.Decimal Invariant (±0.01 CZK)",
                "THRESHOLD_CONSISTENCY" => "Track 5 Scoring Engine Invariant",
                "STATUTORY_POINTER" => "Corpus Grounding (§ 6, § 21)",
                _ => "Deterministic Verification Gate"
            };
            sb.AppendLine($"| **{gate.Gate}** | {statusBadge} | {gate.Detail} | {standard} |");
        }
        sb.AppendLine();
        sb.AppendLine("## 4. Transaction Sibling Cluster (Client Account Evidence)");
        sb.AppendLine();
        sb.AppendLine("| Date | Transaction ID | Amount (CZK) | Direction | Counterparty Account | Status |");
        sb.AppendLine("|---|---|---:|:---:|---|:---:|");
        foreach (var tx in siblings)
        {
            var isAlert = tx.Id == row.TransactionId;
            sb.AppendLine($"| {tx.Date:yyyy-MM-dd} | `{tx.Id}` | **{tx.AmountCzk:N2}** | {tx.Direction} | `{tx.CounterpartyAccount}` | {(isAlert ? "🔴 **THIS ALERT**" : "Normal")} |");
        }
        sb.AppendLine();
        sb.AppendLine("## 5. Evaluated Rules & Deterministic Traces");
        sb.AppendLine();
        sb.AppendLine("| Rule ID | Version | Operator | Threshold | Observed Input | Contribution | Status |");
        sb.AppendLine("|---|---|:---:|---|---|---:|:---:|");
        foreach (var rule in explanation.RulesFired)
            sb.AppendLine($"| **{rule.RuleId}** | v{rule.Version} | `{rule.Operator}` | `{rule.Threshold}` | `{rule.InputValue}` | +{rule.Contribution} | **FIRED** |");
        foreach (var rule in explanation.RulesCheckedNotFired)
            sb.AppendLine($"| {rule.RuleId} | v{rule.Version} | `{rule.Operator}` | `{rule.Threshold}` | `{rule.InputValue}` | 0 | Not Fired |");
        sb.AppendLine();
        sb.AppendLine("## 6. Four-Eyes Governance & Sign-Off Record");
        sb.AppendLine();
        sb.AppendLine("| Role | Designated Official | Status / Independent Separation |");
        sb.AppendLine("|---|---|---|");
        sb.AppendLine($"| **Executive Officer** | {row.ExecutivePerson} ({row.ExecutiveRole}) | Initial Review & Triage |");
        sb.AppendLine($"| **Approver (MLRO)** | {row.Approver} | Independent Sign-Off |");
        var independent = !string.Equals(row.ExecutivePerson, row.Approver, StringComparison.Ordinal);
        sb.AppendLine($"| **4-Eyes Separation** | **{(independent ? "COMPLIANT" : "VIOLATION")}** | § 21 AML Act / § 12 Decree 67/2018 |");
        sb.AppendLine();
        sb.AppendLine("## 7. Cryptographic Audit Chain Excerpt");
        sb.AppendLine();
        sb.AppendLine("| Timestamp | Event Name | Event SHA-256 Digest |");
        sb.AppendLine("|---|---|---|");
        foreach (var ev in audit.TakeLast(6))
            sb.AppendLine($"| `{ev.Timestamp}` | **{ev.Event}** | `{ev.Hash}` |");
        sb.AppendLine();
        sb.AppendLine("## 8. Relevant FATF Typologies & Guidance");
        sb.AppendLine();
        foreach (var reference in _fatf.All)
            sb.AppendLine($"- **{reference.ReferenceId}**: [{reference.Title}]({reference.Url})");
        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine("*Legal Disclaimer: This dossier is generated by VeriTriage for compliance officer decision-support under Czech AML Act No. 253/2008 Sb. The human sign-off creates the legal record.*");
        return sb.ToString();
    }

    private static string Hash(string value) =>
        "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private List<AnalysisDocument> Load()
    {
        var path = Path.Combine(_root, "data", "documents.json");
        if (!File.Exists(path)) return new List<AnalysisDocument>();
        try { return JsonSerializer.Deserialize<List<AnalysisDocument>>(File.ReadAllText(path)) ?? new(); }
        catch { return new(); }
    }

    private void Save(AnalysisDocument doc)
    {
        var docs = Load();
        docs.Add(doc);
        Write(docs);
    }

    private void Write(List<AnalysisDocument> docs)
    {
        var dir = Path.Combine(_root, "data");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, "documents.json");
        var temp = path + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(docs, JsonOptions));
        File.Move(temp, path, true);
    }

    private static void Add(ZipArchive zip, string name, string content)
    {
        var entry = zip.CreateEntry(name);
        using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
        writer.Write(content);
    }
}
