using System.Text.Json.Serialization;

namespace VeriTriage.Domain;

public sealed record MoneyFlowNode(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("type")] string Type, // "ORIGIN_CLIENT", "MULE_HOP", "DESTINATION_ACCOUNT", "COUNTERPARTY_CLUSTER"
    [property: JsonPropertyName("total_in_czk")] decimal TotalInCzk,
    [property: JsonPropertyName("total_out_czk")] decimal TotalOutCzk,
    [property: JsonPropertyName("risk_tier")] string RiskTier,
    [property: JsonPropertyName("is_fau_postponed")] bool IsFauPostponed);

public sealed record MoneyFlowEdge(
    [property: JsonPropertyName("source_id")] string SourceId,
    [property: JsonPropertyName("target_id")] string TargetId,
    [property: JsonPropertyName("amount_czk")] decimal AmountCzk,
    [property: JsonPropertyName("currency")] string Currency,
    [property: JsonPropertyName("timestamp")] DateTimeOffset Timestamp,
    [property: JsonPropertyName("transaction_id")] string TransactionId,
    [property: JsonPropertyName("hop_index")] int HopIndex,
    [property: JsonPropertyName("transit_delta_hours")] decimal TransitDeltaHours,
    [property: JsonPropertyName("is_sub_threshold")] bool IsSubThreshold);

public sealed record MoneyFlowPath(
    [property: JsonPropertyName("path_id")] string PathId,
    [property: JsonPropertyName("hops")] IReadOnlyList<string> Hops,
    [property: JsonPropertyName("total_volume_czk")] decimal TotalVolumeCzk,
    [property: JsonPropertyName("duration_hours")] decimal DurationHours,
    [property: JsonPropertyName("preservation_ratio")] decimal PreservationRatio,
    [property: JsonPropertyName("typology")] string Typology);

public sealed record MoneyFlowGraph(
    [property: JsonPropertyName("alert_id")] string AlertId,
    [property: JsonPropertyName("client_id")] string ClientId,
    [property: JsonPropertyName("nodes")] IReadOnlyList<MoneyFlowNode> Nodes,
    [property: JsonPropertyName("edges")] IReadOnlyList<MoneyFlowEdge> Edges,
    [property: JsonPropertyName("paths")] IReadOnlyList<MoneyFlowPath> Paths,
    [property: JsonPropertyName("aggregate_outflow_czk")] decimal AggregateOutflowCzk,
    [property: JsonPropertyName("aggregate_inflow_czk")] decimal AggregateInflowCzk,
    [property: JsonPropertyName("flow_conservation_ratio")] decimal FlowConservationRatio,
    [property: JsonPropertyName("structuring_fan_out_degree")] int StructuringFanOutDegree,
    [property: JsonPropertyName("is_layering_detected")] bool IsLayeringDetected);
