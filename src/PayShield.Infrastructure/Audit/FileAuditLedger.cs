using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using VeriTriage.Domain;

namespace VeriTriage.Infrastructure.Audit;

public sealed class FileAuditLedger
{
    private readonly string _path;
    private readonly object _gate = new();

    public FileAuditLedger(string repoRoot)
    {
        var dir = Path.Combine(repoRoot, "data");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "audit_ledger.json");
        if (!File.Exists(_path)) Write(new List<LedgerEntry>());
    }

    public IReadOnlyList<AuditEvent> Get(string caseId)
    {
        lock (_gate)
        {
            EnsureSeeded(caseId);
            return Read()
                .Where(x => x.CaseId == caseId)
                .Select(x => new AuditEvent(x.Event, x.Timestamp, x.Hash))
                .ToList();
        }
    }

    public bool Verify(string caseId)
    {
        lock (_gate)
        {
            EnsureSeeded(caseId);
            var entries = Read().Where(x => x.CaseId == caseId).ToList();
            var previous = "GENESIS";
            foreach (var entry in entries)
            {
                var expected = Hash(previous, entry.Event, entry.Timestamp, entry.CaseId, entry.Payload);
                if (!string.Equals(expected, entry.Hash, StringComparison.Ordinal)) return false;
                previous = entry.Hash;
            }
            return entries.Count > 0;
        }
    }

    public void Append(string caseId, string eventType, object payload)
    {
        lock (_gate)
        {
            EnsureSeeded(caseId);
            var entries = Read();
            var previous = entries.Where(x => x.CaseId == caseId).Select(x => x.Hash).LastOrDefault() ?? "GENESIS";
            var timestamp = DateTimeOffset.UtcNow.ToString("O");
            var payloadJson = JsonSerializer.Serialize(payload);
            var hash = Hash(previous, eventType, timestamp, caseId, payloadJson);
            entries.Add(new LedgerEntry(caseId, eventType, timestamp, hash, payloadJson));
            Write(entries);
        }
    }

    private void EnsureSeeded(string caseId)
    {
        var entries = Read();
        if (entries.Any(x => x.CaseId == caseId)) return;
        var previous = "GENESIS";
        foreach (var seed in AuditChainBuilder.Build(caseId))
        {
            var hash = Hash(previous, seed.Event, seed.Timestamp, caseId, "{}");
            entries.Add(new LedgerEntry(caseId, seed.Event, seed.Timestamp, hash, "{}"));
            previous = hash;
        }
        Write(entries);
    }

    private List<LedgerEntry> Read()
    {
        try
        {
            return JsonSerializer.Deserialize<List<LedgerEntry>>(File.ReadAllText(_path)) ?? new List<LedgerEntry>();
        }
        catch
        {
            return new List<LedgerEntry>();
        }
    }

    private static string Hash(string previous, string eventType, string timestamp, string caseId, string payload)
    {
        var data = $"{eventType}|{timestamp}|{caseId}|{payload}";
        return "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(previous + data))).ToLowerInvariant();
    }

    private void Write(List<LedgerEntry> entries)
    {
        var temp = _path + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(entries, new JsonSerializerOptions { WriteIndented = true }));
        File.Move(temp, _path, true);
    }

    private sealed record LedgerEntry(string CaseId, string Event, string Timestamp, string Hash, string Payload);
}
