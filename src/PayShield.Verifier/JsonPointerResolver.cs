using System.Text.Json.Nodes;

namespace VeriTriage.Verifier;

public static class JsonPointerResolver
{
    public static JsonNode? Resolve(JsonNode root, string pointer)
    {
        if (string.IsNullOrEmpty(pointer)) return root;
        if (!pointer.StartsWith('/')) throw new ArgumentException($"Invalid pointer: {pointer}");

        var segments = pointer[1..].Split('/')
            .Select(s => s.Replace("~1", "/").Replace("~0", "~"))
            .ToArray();

        JsonNode? current = root;
        foreach (var segment in segments)
        {
            if (current is null) return null;
            if (current is JsonArray array && int.TryParse(segment, out var index))
            {
                if (index < 0 || index >= array.Count) return null;
                current = array[index];
            }
            else if (current is JsonObject obj)
            {
                current = obj.TryGetPropertyValue(segment, out var value) ? value : null;
            }
            else
            {
                return null;
            }
        }
        return current;
    }
}
