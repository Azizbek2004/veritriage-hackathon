using System.Text.Json.Serialization;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Data;

namespace PayShield.Api;

public sealed record CorrelatedAccountDto(
    [property: JsonPropertyName("target_alert_id")] string TargetAlertId,
    [property: JsonPropertyName("target_client_id")] string TargetClientId,
    [property: JsonPropertyName("correlation_score")] int CorrelationScore,
    [property: JsonPropertyName("shared_iban_score")] int SharedIbanScore,
    [property: JsonPropertyName("temporal_sync_score")] int TemporalSyncScore,
    [property: JsonPropertyName("amount_mirror_score")] int AmountMirrorScore,
    [property: JsonPropertyName("entity_link_score")] int EntityLinkScore,
    [property: JsonPropertyName("correlation_reason")] string CorrelationReason);

public sealed record TopologyDto(
    [property: JsonPropertyName("topology_score")] int TopologyScore,
    [property: JsonPropertyName("radial_distance")] decimal RadialDistance,
    [property: JsonPropertyName("radar_angle_deg")] int RadarAngleDeg,
    [property: JsonPropertyName("radar_quadrant")] string RadarQuadrant,
    [property: JsonPropertyName("forensic_role")] string ForensicRole,
    [property: JsonPropertyName("forensic_role_label")] string ForensicRoleLabel,
    [property: JsonPropertyName("shared_counterparty_count")] int SharedCounterpartyCount,
    [property: JsonPropertyName("has_cyclic_flow")] bool HasCyclicFlow,
    [property: JsonPropertyName("pass_through_hours")] decimal PassThroughHours,
    [property: JsonPropertyName("in_out_ratio")] decimal InOutRatio,
    [property: JsonPropertyName("c_degree")] int CDegree,
    [property: JsonPropertyName("c_clustering")] int CClustering,
    [property: JsonPropertyName("c_diffusion")] int CDiffusion,
    [property: JsonPropertyName("statutory_basis")] string StatutoryBasis,
    [property: JsonPropertyName("correlated_accounts")] IReadOnlyList<CorrelatedAccountDto> CorrelatedAccounts);

public sealed record TopologyNodeDto(
    [property: JsonPropertyName("alert_id")] string AlertId,
    [property: JsonPropertyName("client_id")] string ClientId,
    [property: JsonPropertyName("priority")] int Priority,
    [property: JsonPropertyName("confidence_score")] int ConfidenceScore,
    [property: JsonPropertyName("radial_distance")] decimal RadialDistance,
    [property: JsonPropertyName("radar_angle_deg")] int RadarAngleDeg,
    [property: JsonPropertyName("radar_quadrant")] string RadarQuadrant,
    [property: JsonPropertyName("forensic_role")] string ForensicRole,
    [property: JsonPropertyName("topology_score")] int TopologyScore);

public sealed record RadarEdgeDto(
    [property: JsonPropertyName("source_alert_id")] string SourceAlertId,
    [property: JsonPropertyName("target_alert_id")] string TargetAlertId,
    [property: JsonPropertyName("correlation_score")] int CorrelationScore,
    [property: JsonPropertyName("correlation_reason")] string CorrelationReason);

public sealed record RadarSnapshot(
    [property: JsonPropertyName("summary")] object Summary,
    [property: JsonPropertyName("nodes")] IReadOnlyList<TopologyNodeDto> Nodes,
    [property: JsonPropertyName("edges")] IReadOnlyList<RadarEdgeDto> Edges);

public sealed class TopologicalForensicsAnalyzer
{
    private readonly CnbTransactionIndex _index;
    public TopologicalForensicsAnalyzer(CnbTransactionIndex index) => _index = index;

    public IReadOnlyDictionary<string, TopologyDto> Analyze(IReadOnlyList<DeliverableCsvRow> rows)
    {
        var txs = rows.ToDictionary(r => r.AlertId, r => (IReadOnlyList<CnbTransactionRow>)_index.GetByClient(r.ClientId).ToList(), StringComparer.Ordinal);
        var primary = rows.ToDictionary(r => r.AlertId, r => PrimaryCounterparty(txs[r.AlertId]), StringComparer.Ordinal);
        var shared = rows.ToDictionary(r => r.AlertId, r => SharedCount(rows, r, primary[r.AlertId], txs), StringComparer.Ordinal);
        var cycle = rows.ToDictionary(r => r.AlertId, r => HasCycle(rows, r, primary, txs), StringComparer.Ordinal);
        var scoreRows = rows.Select(r =>
        {
            var clustering = cycle[r.AlertId] ? 100 : shared[r.AlertId] >= 2 ? 60 : shared[r.AlertId] >= 1 ? 35 : 0;
            var inOut = InOut(txs[r.AlertId]);
            var pass = PassHours(txs[r.AlertId]);
            var diffusion = Diffusion(r, inOut, pass);
            var t = TopologyMath.ComputeTopology(Math.Min(100, shared[r.AlertId] * 25), clustering, diffusion);
            return (Row: r, Degree: Math.Min(100, shared[r.AlertId] * 25), Clustering: clustering, Diffusion: diffusion, InOut: inOut, Pass: pass, Topology: t);
        }).ToList();
        var muleHubAccounts = scoreRows.Where(x => TopologyMath.ClassifyRole(
                shared[x.Row.AlertId], cycle[x.Row.AlertId], x.Clustering, x.Topology.TopologyScore,
                x.Pass, x.Row.Inputs?.BaseTier ?? "low", x.Row.Inputs?.VolRatio ?? 0m,
                x.Row.Inputs?.IsNewRemote ?? false, false) == "MULE_AGGREGATOR")
            .Select(x => primary[x.Row.AlertId]).Where(x => x is not null).ToHashSet(StringComparer.Ordinal);

        var classifiedRoles = scoreRows.ToDictionary(
            x => x.Row.AlertId,
            x =>
            {
                var linked = txs[x.Row.AlertId].Any(t => !string.IsNullOrWhiteSpace(t.CounterpartyAccount) && muleHubAccounts.Contains(t.CounterpartyAccount));
                return TopologyMath.ClassifyRole(shared[x.Row.AlertId], cycle[x.Row.AlertId], x.Clustering, x.Topology.TopologyScore,
                    x.Pass, x.Row.Inputs?.BaseTier ?? "low", x.Row.Inputs?.VolRatio ?? 0m, x.Row.Inputs?.IsNewRemote ?? false, linked);
            },
            StringComparer.Ordinal);

        var distributedAngles = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var roleGroup in scoreRows.GroupBy(x => classifiedRoles[x.Row.AlertId]))
        {
            var list = roleGroup.OrderBy(x => x.Row.AlertId).ToList();
            var baseAngle = roleGroup.Key switch
            {
                "CAROUSEL_RING" => 0,
                "MULE_AGGREGATOR" => 90,
                "COMPROMISED_VICTIM" => 180,
                _ => 270,
            };
            var count = list.Count;
            for (var i = 0; i < count; i++)
            {
                var span = count > 1 ? (74 * i) / (count - 1) : 45;
                distributedAngles[list[i].Row.AlertId] = (baseAngle + 8 + span) % 360;
            }
        }

        var result = new Dictionary<string, TopologyDto>(StringComparer.Ordinal);
        foreach (var item in scoreRows)
        {
            var role = classifiedRoles[item.Row.AlertId];
            var quadrant = TopologyMath.Quadrant(role, item.Topology.RadialDistance);
            var angle = distributedAngles.GetValueOrDefault(item.Row.AlertId, TopologyMath.RadarAngle(item.Row.AlertId, role));
            var correlations = new List<CorrelatedAccountDto>();
            foreach (var other in rows.Where(x => x.AlertId != item.Row.AlertId))
            {
                var iban = IbanOverlap(txs[item.Row.AlertId], txs[other.AlertId]);
                var temporal = TemporalSync(txs[item.Row.AlertId], txs[other.AlertId]);
                var amount = AmountMirror(item.Row, other, txs[item.Row.AlertId], txs[other.AlertId]);
                var entity = EntityLink(item.Row, other, primary[item.Row.AlertId], primary[other.AlertId]);
                var score = TopologyMath.CorrelationScore(iban, temporal, amount, entity);
                if (score < 35) continue;
                var reason = $"{iban switch { >= 80 => "shared counterparty cluster", >= 35 => "partial counterparty overlap", _ => "no IBAN overlap" }} · temporal {temporal}% · amount mirror {amount}% · entity link {entity}%";
                correlations.Add(new CorrelatedAccountDto(other.AlertId, other.ClientId, score, iban, temporal, amount, entity, reason));
            }
            result[item.Row.AlertId] = new TopologyDto(item.Topology.TopologyScore, item.Topology.RadialDistance, angle, quadrant, role,
                TopologyMath.RoleLabel(role), shared[item.Row.AlertId], cycle[item.Row.AlertId], item.Pass, item.InOut,
                item.Degree, item.Clustering, item.Diffusion, TopologyMath.StaticBasis,
                correlations.OrderByDescending(x => x.CorrelationScore).ThenBy(x => x.TargetAlertId).Take(5).ToList());
        }
        return result;
    }

    public RadarSnapshot Radar(IReadOnlyList<DeliverableCsvRow> rows)
    {
        var topology = Analyze(rows);
        var nodes = rows.Select(r => new TopologyNodeDto(r.AlertId, r.ClientId, r.Priority, r.ConfidenceScore,
            topology[r.AlertId].RadialDistance, topology[r.AlertId].RadarAngleDeg, topology[r.AlertId].RadarQuadrant,
            topology[r.AlertId].ForensicRole, topology[r.AlertId].TopologyScore)).ToList();
        var edges = topology.SelectMany(pair => pair.Value.CorrelatedAccounts
            .Select(c => new RadarEdgeDto(pair.Key, c.TargetAlertId, c.CorrelationScore, c.CorrelationReason))).ToList();
        var summary = new
        {
            mule_aggregators = topology.Values.Count(x => x.ForensicRole == "MULE_AGGREGATOR"),
            carousel_rings = topology.Values.Count(x => x.ForensicRole == "CAROUSEL_RING"),
            compromised_victims = topology.Values.Count(x => x.ForensicRole == "COMPROMISED_VICTIM"),
            isolated_anomalies = topology.Values.Count(x => x.ForensicRole == "ISOLATED_ANOMALY"),
        };
        return new RadarSnapshot(summary, nodes, edges);
    }


    private static string? PrimaryCounterparty(IReadOnlyList<CnbTransactionRow> txs) =>
        txs.Where(t => t.Direction == "OUT" && !string.IsNullOrWhiteSpace(t.CounterpartyAccount))
            .GroupBy(t => t.CounterpartyAccount).OrderByDescending(g => g.Sum(x => x.AmountCzk)).Select(g => g.Key).FirstOrDefault();

    private static int SharedCount(IReadOnlyList<DeliverableCsvRow> rows, DeliverableCsvRow row, string? primary, Dictionary<string, IReadOnlyList<CnbTransactionRow>> txs)
    {
        if (string.IsNullOrWhiteSpace(primary)) return 0;
        return rows.Where(x => x.ClientId != row.ClientId && txs[x.AlertId].Any(t => t.CounterpartyAccount == primary)).Select(x => x.ClientId).Distinct(StringComparer.Ordinal).Count();
    }

    private static bool HasCycle(IReadOnlyList<DeliverableCsvRow> rows, DeliverableCsvRow row, Dictionary<string,string?> primary, Dictionary<string,IReadOnlyList<CnbTransactionRow>> txs)
    {
        var a = primary[row.AlertId];
        if (a is null) return false;
        foreach (var other in rows.Where(x => x.ClientId != row.ClientId))
        {
            var b = primary[other.AlertId];
            if (b == a && txs[row.AlertId].Any(t => t.CounterpartyAccount == b))
                return true;
        }
        return false;
    }

    private static decimal InOut(IReadOnlyList<CnbTransactionRow> txs)
    {
        var incoming = txs.Where(t => t.Direction == "IN").Sum(t => t.AmountCzk);
        var outgoing = txs.Where(t => t.Direction == "OUT").Sum(t => t.AmountCzk);
        return outgoing > 0 ? Math.Round(incoming / outgoing, 4, MidpointRounding.AwayFromZero) : 0m;
    }

    private static decimal PassHours(IReadOnlyList<CnbTransactionRow> txs)
    {
        if (txs.Count < 2) return 24m;
        var days = Math.Max(1, txs.Max(t => t.Date).DayNumber - txs.Min(t => t.Date).DayNumber);
        return Math.Round(Math.Min(72m, days * 24m / Math.Max(1, txs.Count - 1)), 1);
    }

    private static int Diffusion(DeliverableCsvRow row, decimal inOut, decimal pass)
    {
        var passThrough = inOut is >= 0.80m and <= 1.10m && pass <= 6m;
        if (passThrough) return 90;
        if (row.Inputs?.IsPep == true) return 75;
        if (inOut > 0m) return 40;
        return 0;
    }

    private static int IbanOverlap(IReadOnlyList<CnbTransactionRow> a, IReadOnlyList<CnbTransactionRow> b)
    {
        var sa = a.Select(t => t.CounterpartyAccount).Where(x => !string.IsNullOrWhiteSpace(x)).ToHashSet(StringComparer.Ordinal);
        var sb = b.Select(t => t.CounterpartyAccount).Where(x => !string.IsNullOrWhiteSpace(x)).ToHashSet(StringComparer.Ordinal);
        if (sa.Count == 0 || sb.Count == 0) return 0;
        var overlap = sa.Intersect(sb, StringComparer.Ordinal).Count();
        return (int)Math.Round(100m * overlap / Math.Max(1, sa.Union(sb, StringComparer.Ordinal).Count()), MidpointRounding.AwayFromZero);
    }

    private static int TemporalSync(IReadOnlyList<CnbTransactionRow> a, IReadOnlyList<CnbTransactionRow> b)
    {
        var da = a.Select(t => t.Date).ToHashSet();
        var db = b.Select(t => t.Date).ToHashSet();
        if (da.Overlaps(db)) return 100;
        if (da.Any(x => db.Any(y => Math.Abs(x.DayNumber - y.DayNumber) <= 1))) return 60;
        if (da.Any(x => db.Any(y => Math.Abs(x.DayNumber - y.DayNumber) <= 7))) return 25;
        return 0;
    }

    private static int AmountMirror(DeliverableCsvRow a, DeliverableCsvRow b, IReadOnlyList<CnbTransactionRow> ta, IReadOnlyList<CnbTransactionRow> tb)
    {
        var va = ta.Where(t => t.Direction == "OUT").Sum(t => t.AmountCzk);
        var vb = tb.Where(t => t.Direction == "OUT").Sum(t => t.AmountCzk);
        if (va <= 0m || vb <= 0m) return 0;
        var diff = Math.Abs(va - vb) / Math.Max(va, vb);
        return diff <= 0.05m ? 100 : diff <= 0.15m ? 70 : diff <= 0.35m ? 40 : 0;
    }

    private static int EntityLink(DeliverableCsvRow a, DeliverableCsvRow b, string? pa, string? pb)
    {
        if (!string.IsNullOrWhiteSpace(pa) && pa == pb) return 100;
        if (a.Inputs?.IsPep == true && b.Inputs?.IsPep == true) return 60;
        if (a.Inputs?.BaseTier == b.Inputs?.BaseTier) return 40;
        return 0;
    }
}
