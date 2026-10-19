using System.Security.Cryptography;
using System.Text;
using PayShield.Api;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Bedrock;
using VeriTriage.Infrastructure.Data;
using VeriTriage.Infrastructure.Audit;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options => options.AddPolicy("cockpit", policy =>
    policy.WithOrigins(
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3100",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3100"
    ).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddSingleton<IBedrockService>(_ => new LiveBedrockService());
var repoRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", ".."));
builder.Services.AddSingleton(_ => new DeliverableState(repoRoot));
builder.Services.AddSingleton(_ => CnbTransactionIndex.Load(Path.Combine(repoRoot, "datasets", "CNB")));
builder.Services.AddSingleton(_ => new FileAuditLedger(repoRoot));

var app = builder.Build();
app.UseCors("cockpit");
app.Services.GetRequiredService<CnbTransactionIndex>();

app.MapGet("/api/v1/health", () => Results.Ok(new { status = "ok", mode = "finreg" }));

app.MapGet("/api/v1/bedrock/status", async (IBedrockService bedrock) =>
{
    try
    {
        var result = await bedrock.ProbeAsync();
        return Results.Ok(new
        {
            mode = result.Success ? "LIVE_BEDROCK" : "LIVE_BEDROCK_CACHED",
            model = LiveBedrockService.DefaultModelId,
            region = LiveBedrockService.Region,
            latency_ms = result.LatencyMs,
            error = result.Error
        });
    }
    catch (Exception ex)
    {
        return Results.Ok(new
        {
            mode = "LIVE_BEDROCK_CACHED",
            model = LiveBedrockService.DefaultModelId,
            region = LiveBedrockService.Region,
            error = ex.Message
        });
    }
});

app.MapGet("/api/v1/deliverable/sample", (DeliverableState state) => Results.Ok(state.Rows));

app.MapGet("/api/v1/deliverable/stats", (DeliverableState state) => Results.Ok(state.Stats));

app.MapPost("/api/v1/deliverable/reprocess", (DeliverableState state) =>
{
    state.Reload();
    return Results.Ok(new { summary = state.Stats, rows = state.Rows });
});

app.MapGet("/api/v1/deliverable/csv", (DeliverableState state) =>
    Results.Text(FinregDeliverableEngine.SerializeToCsv(state.Rows), "text/csv", Encoding.UTF8));

app.MapGet("/api/v1/cases/{id}/investigation", async (string id, IBedrockService bedrock, DeliverableState state) =>
{
    var matching = state.Rows.FirstOrDefault(r => r.AlertId.Equals(id, StringComparison.OrdinalIgnoreCase));
    var clientDetails = matching != null
        ? $"Client {matching.ClientId}, Alert Type: {matching.AlertType}, Reason: {matching.Reason}"
        : $"Alert {id}";
    var json = await bedrock.InvestigateAsync(id, clientDetails, repoRoot);
    return Results.Text(json, "application/json");
});

app.MapPost("/api/v1/cases/verify-4-eyes", (FourEyesRequest request) =>
    FinregDeliverableEngine.IsFourEyesIndependent(request.Executive, request.Approver)
        ? Results.Ok(new { status = "ok" })
        : Results.Json(new { error = FinregDeliverableEngine.FourEyesViolation }, statusCode: 400));

app.MapGet("/api/v1/cases/{id}/audit", (string id, FileAuditLedger ledger) =>
{
    var events = ledger.Get(id);
    var valid = ledger.Verify(id);
    return Results.Ok(new
    {
        events,
        chain_valid = valid,
        ledger_mode = "FILE_CHAIN",
        verified_events = valid ? events.Count : 0,
        total_events = events.Count,
    });
});

app.MapGet("/api/v1/cases/{id}/audit/verify", (string id, FileAuditLedger ledger) =>
{
    var events = ledger.Get(id);
    var valid = ledger.Verify(id);
    return Results.Ok(new
    {
        chain_valid = valid,
        verified_events = valid ? events.Count : 0,
        total_events = events.Count,
        events,
        ledger_mode = "FILE_CHAIN",
    });
});

app.MapGet("/api/v1/clients/{clientId}/cluster", (string clientId, string? transactionId, CnbTransactionIndex index) =>
{
    var payload = ForensicBuilder.Cluster(clientId, transactionId, index);
    return payload is null ? Results.NotFound() : Results.Ok(payload);
});

app.MapPost("/api/v1/cases/{id}/investigate-live", async (string id, IBedrockService bedrock, DeliverableState state) =>
{
    var matching = state.Rows.FirstOrDefault(r => r.AlertId.Equals(id, StringComparison.OrdinalIgnoreCase));
    var clientDetails = matching is null ? $"Alert {id}" : $"Client {matching.ClientId}, Alert Type: {matching.AlertType}, Reason: {matching.Reason}";
    using var timeout = new CancellationTokenSource(TimeSpan.FromMilliseconds(2500));
    var json = await bedrock.InvestigateAsync(id, clientDetails, repoRoot, timeout.Token);
    return Results.Text(json, "application/json");
});

app.MapGet("/api/v1/cases/{id}/diff", (string id, DeliverableState state, CnbTransactionIndex index) =>
{
    var row = state.Rows.FirstOrDefault(r => r.AlertId.Equals(id, StringComparison.OrdinalIgnoreCase));
    if (row is null) return Results.NotFound();
    return Results.Ok(ForensicBuilder.Diff(id, row, index));
});

app.MapPost("/api/v1/cases/{id}/approve", (string id, ApproveRequest request, DeliverableState state) =>
{
    var matching = state.Rows.FirstOrDefault(r => r.AlertId.Equals(id, StringComparison.OrdinalIgnoreCase));
    if (matching is null) return Results.NotFound();

    var validation = ApprovalPolicy.Validate(matching.ExecutivePerson, request.ApproverId);
    if (validation is not null)
    {
        return Results.Json(new
        {
            error = validation,
            detail = validation == FinregDeliverableEngine.FourEyesViolation
                ? "Approver must be independent of the executive person."
                : null,
        }, statusCode: 400);
    }

    if (string.IsNullOrWhiteSpace(request.SignatureB64))
    {
        return Results.BadRequest(new { error = "signature_b64 is required" });
    }

    var ts = DateTimeOffset.UtcNow.ToString("O");
    var digest = SHA256.HashData(Encoding.UTF8.GetBytes($"{id}|{request.SignatureB64}|{request.ApproverId}|{ts}"));
    var auditHash = "sha256:" + Convert.ToHexString(digest).ToLowerInvariant();
    var ledger = app.Services.GetRequiredService<FileAuditLedger>();
    ledger.Append(id, "APPROVED", new { approver = request.ApproverId, audit_hash = auditHash });
    return Results.Ok(new ApproveResponse("APPROVED", auditHash));
});

app.Run();
