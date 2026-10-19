using System.Text.Json;

namespace VeriTriage.Infrastructure.Legal;

public sealed record LegalSection(
    string ClauseId,
    string Statute,
    string Section,
    string Title,
    string CzechText,
    string EnglishSummary,
    string Url,
    string RetrievedAt,
    string Source);

public sealed class LegalCorpus
{
    private readonly Dictionary<string, LegalSection> _byId;

    private LegalCorpus(Dictionary<string, LegalSection> byId) => _byId = byId;

    public static LegalCorpus Load(string path)
    {
        if (!File.Exists(path)) return new LegalCorpus(new Dictionary<string, LegalSection>(StringComparer.Ordinal));
        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var map = new Dictionary<string, LegalSection>(StringComparer.Ordinal);
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            var section = new LegalSection(
                item.GetProperty("clause_id").GetString() ?? "",
                item.GetProperty("statute").GetString() ?? "",
                item.GetProperty("section").GetString() ?? "",
                item.GetProperty("title").GetString() ?? "",
                item.GetProperty("text_cs").GetString() ?? "",
                item.GetProperty("text_en").GetString() ?? "",
                item.GetProperty("url").GetString() ?? "",
                item.GetProperty("retrieved_at").GetString() ?? "",
                item.GetProperty("source").GetString() ?? "");
            if (!string.IsNullOrWhiteSpace(section.ClauseId)) map[section.ClauseId] = section;
        }
        return new LegalCorpus(map);
    }

    public LegalSection? Lookup(string clauseId) => _byId.GetValueOrDefault(clauseId);

    public IReadOnlyList<LegalSection> Search(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return Array.Empty<LegalSection>();
        var needle = query.Trim();
        return _byId.Values
            .Where(x => x.Title.Contains(needle, StringComparison.OrdinalIgnoreCase)
                     || x.CzechText.Contains(needle, StringComparison.OrdinalIgnoreCase)
                     || x.Section.Contains(needle, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }
}
