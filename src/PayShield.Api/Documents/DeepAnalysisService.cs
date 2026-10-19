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
        var sb = new StringBuilder();
        sb.AppendLine($"# Deep Analysis — {row.AlertId}");
        sb.AppendLine();
        sb.AppendLine($"- Case: `{row.AlertId}`");
        sb.AppendLine($"- Client: `{row.ClientId}`");
        sb.AppendLine($"- Transaction: `{row.TransactionId}`");
        sb.AppendLine($"- Generated: `{DateTimeOffset.UtcNow:O}` by `{generatedBy}`");
        sb.AppendLine($"- Rule versions: `{string.Join(", ", RuleRegistry.All.Select(r => $"{r.RuleId} v{r.Version}"))}`");
        sb.AppendLine();
        sb.AppendLine("## Executive summary");
        sb.AppendLine($"The deterministic engine classified this case as **{row.Triage}** with priority **{row.Priority}/100**. {row.Reason}");
        sb.AppendLine();
        sb.AppendLine("## Evidence — sibling transactions");
        sb.AppendLine("| Date | Amount | Direction | Counterparty | Flagged |");
        sb.AppendLine("|---|---:|---|---|---|");
        foreach (var tx in siblings)
            sb.AppendLine($"| {tx.Date:yyyy-MM-dd} | {tx.AmountCzk.ToString("N2", CultureInfo.InvariantCulture)} | {tx.Direction} | {tx.CounterpartyAccount} | {(tx.Id == row.TransactionId ? "THIS ALERT" : "")} |");
        sb.AppendLine();
        sb.AppendLine("## Priority breakdown");
        if (row.Breakdown is { } bd)
            sb.AppendLine($"`B{bd.Base} + V{bd.Vol} + P{bd.Pep} + S{bd.Struct} + C{bd.Channel} = {row.Priority.ToString(CultureInfo.InvariantCulture)}`");
        var vector = _analyzer.Analyze(row);
        sb.AppendLine();
        sb.AppendLine("## Quantitative typology vectors");
        sb.AppendLine($"- Velocity: **{vector.VelocityRatio:0.00}x**; count: **{vector.CountRatio:0.00}x**");
        sb.AppendLine($"- 72h sub-threshold cluster: **{vector.Structuring72h.Count} / {vector.Structuring72h.SumCzk.ToString("N2", CultureInfo.InvariantCulture)} CZK**");
        sb.AppendLine($"- HHI: **{vector.CounterpartyHhi:0}**; shared links: **{vector.SharedCounterpartyLinks}**; primary: `{vector.PrimaryCounterparty}`");
        sb.AppendLine($"- Round-amount ratio: **{vector.RoundAmountRatio:0.00}%**; in/out: **{vector.InOutRatio:0.0000}**");
        sb.AppendLine();
        sb.AppendLine("## Why the score is high");
        sb.AppendLine(vector.FraudNarrative);
        sb.AppendLine();
        sb.AppendLine("## Rules");
        foreach (var rule in explanation.RulesFired)
            sb.AppendLine($"- **{rule.RuleId} v{rule.Version}** ({rule.StatutoryBasis}): {rule.Operator} {rule.Threshold}; input {rule.InputValue}; **FIRED**, contribution {rule.Contribution}");
        foreach (var rule in explanation.RulesCheckedNotFired)
            sb.AppendLine($"- {rule.RuleId} v{rule.Version}: {rule.Operator} {rule.Threshold}; input {rule.InputValue}; not fired");
        sb.AppendLine();
        sb.AppendLine("## Verifier gates");
        sb.AppendLine("Gate 1–5: NOT_RE_RUN for this document generation; the CSV row is produced by the deterministic engine. The verifier pipeline remains the authority for evidence envelopes.");
        sb.AppendLine();
        sb.AppendLine("## 4-eyes record");
        sb.AppendLine($"- Executive: {row.ExecutivePerson}");
        sb.AppendLine($"- Approver: {row.Approver}");
        sb.AppendLine($"- Independent: {(!string.Equals(row.ExecutivePerson, row.Approver, StringComparison.Ordinal)).ToString().ToLowerInvariant()}");
        sb.AppendLine();
        sb.AppendLine("## Audit chain excerpt");
        foreach (var ev in audit.TakeLast(6))
            sb.AppendLine($"- `{ev.Timestamp}` {ev.Event} `{ev.Hash}`");
        sb.AppendLine();
        sb.AppendLine("## FATF references");
        foreach (var reference in _fatf.All)
            sb.AppendLine($"- {reference.ReferenceId}: {reference.Title} — {reference.Url}");
        sb.AppendLine();
        sb.AppendLine("## Legal disclaimer");
        sb.AppendLine("This document is a decision-support artifact. It does not constitute legal advice. The human signatory is responsible for the final decision.");
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
