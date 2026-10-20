using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace VeriTriage.Domain;

public sealed record TopologyScoreResult(decimal RawTopology, int TopologyScore, decimal RadialDistance);

public static class TopologyMath
{
    public static TopologyScoreResult ComputeTopology(int cDegree, int cClustering, int cDiffusion)
    {
        var raw = (0.40m * cDegree) + (0.35m * cClustering) + (0.25m * cDiffusion);
        var score = (int)Math.Clamp(Math.Round(raw, MidpointRounding.AwayFromZero), 0m, 100m);
        var radial = Math.Round(1.00m - (score / 100.0m), 2, MidpointRounding.AwayFromZero);
        return new TopologyScoreResult(raw, score, radial);
    }

    public static decimal RadialDistance(int topologyScore) =>
        Math.Round(1.00m - (Math.Clamp(topologyScore, 0, 100) / 100.0m), 2, MidpointRounding.AwayFromZero);

    public static string ClassifyRole(int sharedCounterpartyCount, bool hasCyclicFlow, int cClustering,
        int topologyScore, decimal passThroughHours, string baseTier, decimal volRatio, bool isNewRemote, bool linkedToMuleHub)
    {
        // Calibrated: only a true high-tier/high-score hub or a top collector hub is a mule.
        if (baseTier == "high" && topologyScore >= 78 && sharedCounterpartyCount >= 3)
            return "MULE_AGGREGATOR";
        // Cycles and tight shared-hub pairs are carousel/ring nodes before generic hubs.
        if (hasCyclicFlow || (cClustering >= 60 && sharedCounterpartyCount == 2))
            return "CAROUSEL_RING";
        if (sharedCounterpartyCount >= 12)
            return "MULE_AGGREGATOR";
        var established = baseTier is "low" or "medium";
        if (established && (volRatio >= 2.5m || isNewRemote) && (sharedCounterpartyCount >= 8 || (linkedToMuleHub && sharedCounterpartyCount >= 1 && topologyScore >= 55 && isNewRemote)))
            return "COMPROMISED_VICTIM";
        return "ISOLATED_ANOMALY";
    }

    public static string RoleLabel(string role) => role switch
    {
        "MULE_AGGREGATOR" => "Mule Aggregator Hub",
        "CAROUSEL_RING" => "Carousel / Layering Ring",
        "COMPROMISED_VICTIM" => "Compromised / Taken Client",
        _ => "Isolated Periphery",
    };

    public static string Quadrant(string role, decimal radialDistance) => role switch
    {
        "MULE_AGGREGATOR" => "MULE_VELOCITY",
        "CAROUSEL_RING" => "STRUCTURING_RING",
        "COMPROMISED_VICTIM" => "PEP_CORRIDOR",
        _ => "VOLUME_OUTLIER",
    };

    public static int RadarAngle(string alertId, string role)
    {
        var quadrant = Quadrant(role, 0.5m);
        var baseAngle = quadrant switch
        {
            "STRUCTURING_RING" => 0,
            "MULE_VELOCITY" => 90,
            "PEP_CORRIDOR" => 180,
            _ => 270,
        };
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(alertId));
        var offset = (int)(BitConverter.ToUInt32(hash, 0) % 90);
        return (baseAngle + offset) % 360;
    }

    public static int CorrelationScore(int iban, int temporal, int amount, int entity) =>
        (int)Math.Round(0.35m * iban + 0.30m * temporal + 0.20m * amount + 0.15m * entity, MidpointRounding.AwayFromZero);

    public static string StaticBasis => "Act 253/2008 § 6(1)(g) & ČNB Decree 67/2018 § 6(1)(b)";
}
