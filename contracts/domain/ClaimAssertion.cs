using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record ClaimAssertion(
    [property: JsonRequired] string ClaimId,
    [property: JsonRequired] string ClaimType,
    [property: JsonRequired] string NarrativeTemplate,
    [property: JsonRequired] string[] JsonPointers,
    [property: JsonRequired] string[] ExpectedValues,
    TextractProvenance? DocumentProvenance);
