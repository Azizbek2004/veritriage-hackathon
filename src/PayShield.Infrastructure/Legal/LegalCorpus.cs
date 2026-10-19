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
    string Source,
    bool Unavailable = false);

public sealed class LegalCorpus
{
    private readonly Dictionary<string, LegalSection> _byId;

    private LegalCorpus(Dictionary<string, LegalSection> byId) => _byId = byId;

    public int Count => _byId.Count;
    public IReadOnlyCollection<LegalSection> All => _byId.Values;

    public static LegalCorpus Load(string path)
    {
        var map = new Dictionary<string, LegalSection>(StringComparer.Ordinal);
        if (Directory.Exists(path))
        {
            foreach (var file in Directory.EnumerateFiles(path, "*.json"))
            {
                try
                {
                    using var doc = JsonDocument.Parse(File.ReadAllText(file));
                    ParseElement(doc.RootElement, map);
                }
                catch { }
            }
        }
        else if (File.Exists(path))
        {
            try
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(path));
                ParseElement(doc.RootElement, map);
            }
            catch { }
        }
        return new LegalCorpus(map);
    }

    private static void ParseElement(JsonElement root, Dictionary<string, LegalSection> map)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
            {
                var s = ParseSection(item);
                if (!string.IsNullOrWhiteSpace(s.ClauseId)) map[s.ClauseId] = s;
            }
        }
        else if (root.ValueKind == JsonValueKind.Object)
        {
            var s = ParseSection(root);
            if (!string.IsNullOrWhiteSpace(s.ClauseId)) map[s.ClauseId] = s;
        }
    }

    private static LegalSection ParseSection(JsonElement item)
    {
        var unavailable = item.TryGetProperty("unavailable", out var unav) && unav.GetBoolean();
        return new LegalSection(
            item.TryGetProperty("clause_id", out var cid) ? cid.GetString() ?? "" : "",
            item.TryGetProperty("statute", out var st) ? st.GetString() ?? "" : "",
            item.TryGetProperty("section", out var sc) ? sc.GetString() ?? "" : "",
            item.TryGetProperty("title", out var ti) ? ti.GetString() ?? "" : "",
            item.TryGetProperty("text_cs", out var tc) ? tc.GetString() ?? "" : "",
            item.TryGetProperty("text_en", out var te) ? te.GetString() ?? "" : "",
            item.TryGetProperty("url", out var ur) ? ur.GetString() ?? "" : "",
            item.TryGetProperty("retrieved_at", out var ra) ? ra.GetString() ?? "" : "",
            item.TryGetProperty("source", out var sr) ? sr.GetString() ?? "" : "",
            unavailable);
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
