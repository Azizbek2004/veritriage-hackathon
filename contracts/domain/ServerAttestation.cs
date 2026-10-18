using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record ServerAttestation(
    [property: JsonRequired] string Algorithm,
    [property: JsonRequired] string PublicKeyThumbprint,
    [property: JsonRequired] string KeyCustodyMode,
    [property: JsonRequired] string SignatureBase64);
