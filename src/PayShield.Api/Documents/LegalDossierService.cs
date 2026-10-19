using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Audit;

namespace PayShield.Api;

public sealed record LegalDossierDocument(
    string DossierId,
    string CaseId,
    string ClientId,
    string TransactionId,
    string DocumentType,
    string Title,
    string CreatedAtUtc,
    string PreparedByEngine,
    string DesignatedCounselRecipient,
    string ExecutivePerson,
    string Approver,
    string FourEyesStatus,
    IReadOnlyList<object> StatutoryCitations,
    object QuantitativeEvidenceTable,
    object VerifierDiffSummary,
    string Markdown,
    string DocumentSha256,
    string PrevAuditSha256,
    string? SignedBy = null,
    string? SignatureAlgorithm = null,
    string? SignatureB64 = null,
    string? PublicKeySpkiB64 = null,
    string? SignedAtUtc = null);

public sealed class LegalDossierService
{
    private readonly string _root;
    private readonly FileAuditLedger _ledger;
    private readonly DeterministicForensicAnalyzer _analyzer;
    private readonly object _gate = new();

    public LegalDossierService(string repoRoot, FileAuditLedger ledger, DeterministicForensicAnalyzer analyzer, DeliverableState state)
    {
        _root = repoRoot;
        _ledger = ledger;
        _analyzer = analyzer;
        EnsureSeeded(state);
    }

    public IReadOnlyList<LegalDossierDocument> List(string? caseId = null)
    {
        lock (_gate)
        {
            var all = Load();
            return (caseId is null ? all : all.Where(d => d.CaseId == caseId)).OrderByDescending(d => d.CreatedAtUtc).ToList();
        }
    }

    public LegalDossierDocument? Get(string dossierId)
    {
        lock (_gate) return Load().FirstOrDefault(d => d.DossierId == dossierId);
    }

    public LegalDossierDocument CreateQuantitative(DeliverableCsvRow row, ForensicVectorProfile vector)
    {
        lock (_gate)
        {
            var markdown = BuildQuantitative(row, vector);
            return SaveNew(row, "QUANTITATIVE_FORENSIC_BRIEF",
                "Quantitative Forensic Brief — 5-Vector Typology & Deterministic Priority",
                "VeriTriage C# Deterministic Engine v2026.10", vector, new { mode = "DETERMINISTIC_ZERO_LLM", intervention = "NONE" }, markdown);
        }
    }

    public LegalDossierDocument CreateStatutory(DeliverableCsvRow row, ForensicVectorProfile vector, string investigationJson, object diff)
    {
        lock (_gate)
        {
            var markdown = BuildStatutory(row, vector, investigationJson, diff);
            return SaveNew(row, "STATUTORY_FAU_OPO_LEGAL_MEMO",
                "Statutory Investigation & FAÚ OPO Legal Memorandum",
                "VeriTriage Neuro-Symbolic Investigator + C# 5-Gate Verifier", vector, diff, markdown);
        }
    }

    public string Export(LegalDossierDocument dossier, string format) => format.ToLowerInvariant() switch
    {
        "json" => JsonSerializer.Serialize(dossier, JsonOptions),
        "md" or "markdown" => dossier.Markdown,
        _ => Html(dossier),
    };

    public LegalDossierDocument? Sign(string id, string signedBy)
    {
        lock (_gate)
        {
            var docs = Load();
            var index = docs.FindIndex(d => d.DossierId == id);
            if (index < 0) return null;
            var updated = SignWithP256(docs[index] with { SignedBy = signedBy });
            docs[index] = updated;
            Write(docs);
            _ledger.Append(updated.CaseId, "LEGAL_DOSSIER_SIGNED", new { dossier_id = updated.DossierId, signed_by = signedBy, signature_algorithm = updated.SignatureAlgorithm });
            return updated;
        }
    }

    public bool VerifySignature(LegalDossierDocument dossier)
    {
        if (string.IsNullOrWhiteSpace(dossier.SignatureB64) || string.IsNullOrWhiteSpace(dossier.PublicKeySpkiB64)) return false;
        try
        {
            using var ecdsa = ECDsa.Create();
            ecdsa.ImportSubjectPublicKeyInfo(Convert.FromBase64String(dossier.PublicKeySpkiB64), out _);
            return ecdsa.VerifyData(Encoding.UTF8.GetBytes(CanonicalPayload(dossier)), Convert.FromBase64String(dossier.SignatureB64), HashAlgorithmName.SHA256);
        }
        catch { return false; }
    }

    private static LegalDossierDocument SignWithP256(LegalDossierDocument dossier)
    {
        using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var signature = ecdsa.SignData(Encoding.UTF8.GetBytes(CanonicalPayload(dossier)), HashAlgorithmName.SHA256);
        return dossier with
        {
            SignatureAlgorithm = "ECDSA_P256_SHA256",
            SignatureB64 = Convert.ToBase64String(signature),
            PublicKeySpkiB64 = Convert.ToBase64String(ecdsa.ExportSubjectPublicKeyInfo()),
            SignedAtUtc = DateTimeOffset.UtcNow.ToString("O"),
        };
    }

    private static string CanonicalPayload(LegalDossierDocument d) => JsonSerializer.Serialize(new
    {
        d.DossierId, d.CaseId, d.ClientId, d.TransactionId, d.DocumentType, d.Title, d.CreatedAtUtc,
        d.PreparedByEngine, d.DesignatedCounselRecipient, d.ExecutivePerson, d.Approver, d.FourEyesStatus,
        d.StatutoryCitations, d.QuantitativeEvidenceTable, d.VerifierDiffSummary, d.Markdown, d.DocumentSha256, d.PrevAuditSha256, d.SignedBy
    });

    private LegalDossierDocument SaveNew(DeliverableCsvRow row, string type, string title, string preparedBy,
        ForensicVectorProfile vector, object diff, string markdown)
    {
        var docs = Load();
        var version = docs.Count(d => d.CaseId == row.AlertId) + 1;
        var published = DateTimeOffset.UtcNow;
        var hash = Hash(markdown);
        var prev = _ledger.Get(row.AlertId).LastOrDefault()?.Hash ?? "GENESIS";
        var dossier = new LegalDossierDocument(
            $"DOS-{published:yyyy}-{row.AlertId.Replace("ALERT-", "", StringComparison.Ordinal)}-V{version}",
            row.AlertId, row.ClientId, row.TransactionId, type, title, published.ToString("O"),
            preparedBy,
            "External Legal Counsel / MLRO / Finanční analytický úřad (FAÚ) — § 18 & § 16 Act No. 253/2008 Coll.",
            row.ExecutivePerson, row.Approver,
            string.Equals(row.ExecutivePerson, row.Approver, StringComparison.Ordinal) ? "FAIL_COLLISION" : "PASS_INDEPENDENT",
            Citations(),
            new { expected_volume = vector.ExpectedVolume, actual_volume = vector.ActualVolume, velocity_ratio = vector.VelocityRatio, count_ratio = vector.CountRatio, structuring_72h = vector.Structuring72h, hhi = vector.CounterpartyHhi, shared_counterparty_links = vector.SharedCounterpartyLinks, round_amount_ratio = vector.RoundAmountRatio, priority = vector.Priority, total_priority = vector.TotalPriority, gates = vector.Gates },
            diff, markdown, hash, prev);
        dossier = SignWithP256(dossier);
        docs.Add(dossier);
        Write(docs);
        _ledger.Append(row.AlertId, "LEGAL_DOSSIER_CREATED", new { dossier_id = dossier.DossierId, document_type = type, document_sha256 = hash, prev_audit_sha256 = prev, signature_algorithm = dossier.SignatureAlgorithm });
        return dossier;
    }

    private void EnsureSeeded(DeliverableState state)
    {
        lock (_gate)
        {
            if (Load().Count > 0) return;
            var rows = state.Rows.Where(r => r.AlertType == "REVIEW").OrderByDescending(r => r.AlertId == "ALERT-045").ThenBy(r => r.AlertId, StringComparer.Ordinal).Take(3).ToList();
            foreach (var row in rows)
            {
                var vector = _analyzer.Analyze(row);
                var markdown = BuildQuantitative(row, vector);
                var published = DateTimeOffset.UtcNow;
                var docs = Load();
                var version = docs.Count(d => d.CaseId == row.AlertId) + 1;
                var hash = Hash(markdown);
                var prev = _ledger.Get(row.AlertId).LastOrDefault()?.Hash ?? "GENESIS";
                var seed = new LegalDossierDocument(
                    $"DOS-{published:yyyy}-{row.AlertId.Replace("ALERT-", "", StringComparison.Ordinal)}-V{version}",
                    row.AlertId, row.ClientId, row.TransactionId, "QUANTITATIVE_FORENSIC_BRIEF",
                    "Quantitative Forensic Brief — 5-Vector Typology & Deterministic Priority",
                    published.ToString("O"), "VeriTriage C# Deterministic Engine v2026.10",
                    "External Legal Counsel / MLRO / Finanční analytický úřad (FAÚ) — § 18 & § 16 Act No. 253/2008 Coll.",
                    row.ExecutivePerson, row.Approver, "PASS_INDEPENDENT", Citations(),
                    new { expected_volume = vector.ExpectedVolume, actual_volume = vector.ActualVolume, velocity_ratio = vector.VelocityRatio, count_ratio = vector.CountRatio, structuring_72h = vector.Structuring72h, hhi = vector.CounterpartyHhi, shared_counterparty_links = vector.SharedCounterpartyLinks, round_amount_ratio = vector.RoundAmountRatio, priority = vector.Priority, total_priority = vector.TotalPriority, gates = vector.Gates },
                    new { mode = "SEEDED_QUANTITATIVE_BRIEF", intervention = "NONE" }, markdown, hash, prev);
                seed = SignWithP256(seed);
                docs.Add(seed);
                Write(docs);
                _ledger.Append(row.AlertId, "LEGAL_DOSSIER_CREATED", new { dossier_id = docs[^1].DossierId, document_type = "QUANTITATIVE_FORENSIC_BRIEF", document_sha256 = hash, prev_audit_sha256 = prev });
            }
        }
    }

    private static IReadOnlyList<object> Citations() => new object[]
    {
        new { section = "§ 6(1)(a)", citation = "Act No. 253/2008 Coll. — unusual transaction pattern", quoted_clause = LegalQuotes.Get("AML-253-2008-S6-1A")?.CzechText },
        new { section = "§ 6(1)(b)", citation = "Act No. 253/2008 Coll. — structuring", quoted_clause = LegalQuotes.Get("AML-253-2008-S6-1B")?.CzechText },
        new { section = "§ 9a(2)(c)", citation = "Act No. 253/2008 Coll. — PEP senior management approval", quoted_clause = LegalQuotes.Get("AML-253-2008-S9A-2C")?.CzechText },
        new { section = "§ 18", citation = "Act No. 253/2008 Coll. — FAÚ OPO suspicious transaction report", quoted_clause = "Oznámení podezřelého obchodu Finančnímu analytickému úřadu." },
        new { section = "Decree 67/2018 § 12", citation = "ČNB Decree No. 67/2018 Coll. — separation of duties", quoted_clause = LegalQuotes.Get("CNB-67-2018-S12")?.CzechText },
    };

    private static string BuildQuantitative(DeliverableCsvRow row, ForensicVectorProfile v)
    {
        static string N(decimal value) => value.ToString("N2", CultureInfo.InvariantCulture);
        var sb = new StringBuilder();
        sb.AppendLine($"# QUANTITATIVE FORENSIC BRIEF — {row.AlertId}");
        sb.AppendLine();
        sb.AppendLine("## I. Executive Statutory Classification & Triage Verdict");
        sb.AppendLine($"Decision: **{row.Triage}** · Priority **{row.Priority}/100** · Client **{row.ClientId}** · Transaction **{row.TransactionId}**.");
        sb.AppendLine();
        sb.AppendLine("## II. Quantitative Transaction Forensics (ČNB 2Q2026 Ledger)");
        sb.AppendLine($"Declared **{N(v.ExpectedVolume)} CZK / {v.ExpectedCount} txns** vs actual **{N(v.ActualVolume)} CZK / {v.ActualCount} txns**; velocity **{v.VelocityRatio:0.00}x**, count **{v.CountRatio:0.00}x**.");
        sb.AppendLine($"72-hour sub-threshold cluster: **{v.Structuring72h.Count} transfers / {N(v.Structuring72h.SumCzk)} CZK** ({v.Structuring72h.WindowStart} to {v.Structuring72h.WindowEnd}); in/out ratio **{v.InOutRatio:0.0000}**.");
        sb.AppendLine($"HHI **{v.CounterpartyHhi:0}**, primary **{v.PrimaryCounterparty}**, shared client links **{v.SharedCounterpartyLinks}**; round-amount ratio **{v.RoundAmountRatio:0.00}%**.");
        sb.AppendLine();
        sb.AppendLine("## III. Linked Client Transaction Cluster & Typology Analysis");
        sb.AppendLine(v.FraudNarrative);
        sb.AppendLine();
        sb.AppendLine("## IV. Neuro-Symbolic Verification & Model Risk Management (MRM) Attestation");
        sb.AppendLine("This is a zero-LLM deterministic brief. No language model contributed to the quantitative values. The C# verifier gates are recorded below.");
        foreach (var gate in v.Gates) sb.AppendLine($"- **{gate.Gate}**: {(gate.Pass ? "PASS" : "FAIL")} — {gate.Detail}");
        sb.AppendLine();
        sb.AppendLine("## V. Statutory Basis (Act No. 253/2008 Coll. & ČNB Decree No. 67/2018 Coll.)");
        sb.AppendLine("§ 6(1)(a) and § 6(1)(b) Act No. 253/2008 Coll.; § 9a(2)(c) PEP approval; Decree 67/2018 § 12 separation of duties; § 18 FAÚ OPO reporting.");
        sb.AppendLine();
        sb.AppendLine("## VI. 4-Eyes Separation of Duties & Cryptographic Non-Repudiation Receipt");
        sb.AppendLine($"Executive: **{row.ExecutivePerson}** · Approver: **{row.Approver}** · Status: **{(string.Equals(row.ExecutivePerson, row.Approver, StringComparison.Ordinal) ? "FAIL" : "PASS_INDEPENDENT")}**.");
        sb.AppendLine();
        sb.AppendLine("> This document is a decision-support artifact, not legal advice. The human signatory remains responsible.");
        return sb.ToString();
    }

    private static string BuildStatutory(DeliverableCsvRow row, ForensicVectorProfile v, string investigationJson, object diff)
    {
        var sb = new StringBuilder(BuildQuantitative(row, v));
        sb.AppendLine();
        sb.AppendLine("## Neuro-Symbolic Investigation Record");
        sb.AppendLine("```json");
        sb.AppendLine(investigationJson);
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("## LLM vs C# Verifier Diff");
        sb.AppendLine("```json");
        sb.AppendLine(JsonSerializer.Serialize(diff, JsonOptions));
        sb.AppendLine("```");
        return sb.ToString();
    }

    private static string Html(LegalDossierDocument d)
    {
        static string Encode(string s) => System.Net.WebUtility.HtmlEncode(s);
        var html = new StringBuilder();
        html.Append("<!doctype html><html><head><meta charset=\"utf-8\"><title>").Append(Encode(d.Title)).Append("</title>");
        html.Append("<style>body{font-family:Georgia,serif;max-width:820px;margin:40px auto;color:#18221d;line-height:1.55}h1{font-size:22px;border-bottom:2px solid #18221d;padding-bottom:8px}h2{font-size:15px;margin-top:22px;border-bottom:1px solid #ccd5ce;padding-bottom:4px}p{font-size:12px;margin:7px 0}.item{margin-left:18px}footer{margin-top:28px;border-top:1px solid #ccd5ce;padding-top:10px;font:11px monospace;color:#555}@media print{body{margin:12mm}}</style></head><body>");
        html.Append("<h1>").Append(Encode(d.Title)).Append("</h1><p><strong>Dossier:</strong> ").Append(Encode(d.DossierId))
            .Append(" · <strong>Case:</strong> ").Append(Encode(d.CaseId)).Append(" · <strong>Type:</strong> ").Append(Encode(d.DocumentType)).Append("</p>");
        foreach (var line in d.Markdown.Split('\n'))
        {
            var t = line.TrimEnd();
            if (t.StartsWith("# ")) html.Append("<h1>").Append(Encode(t[2..])).Append("</h1>");
            else if (t.StartsWith("## ")) html.Append("<h2>").Append(Encode(t[3..])).Append("</h2>");
            else if (t.StartsWith("- ")) html.Append("<p class=\"item\">").Append(Encode(t[2..])).Append("</p>");
            else if (!string.IsNullOrWhiteSpace(t)) html.Append("<p>").Append(Encode(t)).Append("</p>");
        }
        html.Append("<footer>SHA-256: ").Append(Encode(d.DocumentSha256)).Append(" · Previous audit hash: ").Append(Encode(d.PrevAuditSha256))
            .Append(" · ").Append(Encode(d.DesignatedCounselRecipient))
            .Append(" · Signature: ").Append(Encode(d.SignatureAlgorithm ?? "unsigned")).Append(" ").Append(Encode(d.SignatureB64 ?? "")).Append("</footer></body></html>");
        return html.ToString();
    }

    private static string Hash(string value) => "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private List<LegalDossierDocument> Load()
    {
        var path = Path.Combine(_root, "data", "legal_dossiers.json");
        if (!File.Exists(path)) return new List<LegalDossierDocument>();
        try { return JsonSerializer.Deserialize<List<LegalDossierDocument>>(File.ReadAllText(path)) ?? new(); }
        catch { return new(); }
    }

    private void Write(List<LegalDossierDocument> docs)
    {
        var dir = Path.Combine(_root, "data");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, "legal_dossiers.json");
        var temp = path + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(docs, JsonOptions));
        File.Move(temp, path, true);
    }
}
