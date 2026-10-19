using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record CnbAmlMetadata(
    [property: JsonRequired] string CnbTransactionId,
    [property: JsonRequired] string ClientId,
    [property: JsonRequired] string MccCode,
    [property: JsonRequired] bool PepFlag,
    [property: JsonRequired] string AmlRiskRating,
    [property: JsonRequired] string RegulatoryPath);
