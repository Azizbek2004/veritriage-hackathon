using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record TextractProvenance(
    [property: JsonRequired] string DocumentId,
    [property: JsonRequired] int PageNumber,
    [property: JsonRequired] decimal OcrConfidence,
    [property: JsonRequired] BoundingBox Box,
    [property: JsonRequired] string RawExtractedText);

public sealed record BoundingBox(decimal Left, decimal Top, decimal Width, decimal Height);
