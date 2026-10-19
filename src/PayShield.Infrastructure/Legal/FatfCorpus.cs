using System.Text.Json;

namespace VeriTriage.Infrastructure.Legal;

public sealed record FatfReference(string ReferenceId, string Title, string Url, string Summary, string Source, string RetrievedAt);

public sealed class FatfCorpus
{
    private readonly Dictionary<string, FatfReference> _byId;
    private FatfCorpus(Dictionary<string, FatfReference> byId) => _byId = byId;

    public static FatfCorpus Load(string path)
    {
        if (!File.Exists(path)) return new FatfCorpus(new Dictionary<string, FatfReference>(StringComparer.Ordinal));
        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var map = new Dictionary<string, FatfReference>(StringComparer.Ordinal);
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            var reference = new FatfReference(
                item.GetProperty("reference_id").GetString() ?? "",
                item.GetProperty("title").GetString() ?? "",
                item.GetProperty("url").GetString() ?? "",
                item.GetProperty("summary").GetString() ?? "",
                item.GetProperty("source").GetString() ?? "",
                item.GetProperty("retrieved_at").GetString() ?? "");
            if (!string.IsNullOrWhiteSpace(reference.ReferenceId)) map[reference.ReferenceId] = reference;
        }
        return new FatfCorpus(map);
    }

    public FatfReference? Lookup(string id) => _byId.GetValueOrDefault(id);
    public IReadOnlyList<FatfReference> All => _byId.Values.ToList();
}
