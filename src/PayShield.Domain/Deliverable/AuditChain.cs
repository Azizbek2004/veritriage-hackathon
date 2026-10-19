using System.Security.Cryptography;
using System.Text;

namespace VeriTriage.Domain;

public sealed record AuditEvent(string Event, string Timestamp, string Hash);

public static class AuditChainBuilder
{
    private static readonly (string Event, string Timestamp)[] Steps =
    {
        ("ALERT_INGESTED", "2026-10-19T10:00:00Z"),
        ("EVIDENCE_GATHERED", "2026-10-19T10:00:01Z"),
        ("PRIORITY_COMPUTED", "2026-10-19T10:00:02Z"),
        ("4_EYES_VERIFIED", "2026-10-19T10:00:03Z"),
        ("APPROVED", "2026-10-19T10:00:04Z"),
    };

    public static IReadOnlyList<AuditEvent> Build(string caseId)
    {
        var events = new List<AuditEvent>(Steps.Length);
        var previous = "GENESIS";
        foreach (var step in Steps)
        {
            var data = $"{step.Event}|{step.Timestamp}|{caseId}";
            var hash = "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(previous + data))).ToLowerInvariant();
            events.Add(new AuditEvent(step.Event, step.Timestamp, hash));
            previous = hash;
        }
        return events;
    }

    public static bool Verify(string caseId, IReadOnlyList<AuditEvent> events)
    {
        var expected = Build(caseId);
        if (expected.Count != events.Count) return false;
        for (var i = 0; i < expected.Count; i++)
        {
            if (expected[i] != events[i]) return false;
        }
        return true;
    }
}
