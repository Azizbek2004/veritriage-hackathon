using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record EvidenceEnvelope(
    [property: JsonRequired] string CaseId,
    [property: JsonRequired] JsonNode Root,
    [property: JsonRequired] DateTimeOffset GatheredAt);
