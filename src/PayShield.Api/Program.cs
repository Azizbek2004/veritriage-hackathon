using System.Security.Cryptography;
using System.Text;
using PayShield.Api;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Bedrock;

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

var app = builder.Build();
app.UseCors("cockpit");

var repoRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", ".."));
var rows = FinregDeliverableEngine.ProcessSampleBatch(FinregSampleLoader.Load(repoRoot));

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

app.MapGet("/api/v1/deliverable/sample", () => Results.Ok(rows));

app.MapGet("/api/v1/deliverable/csv", () =>
    Results.Text(FinregDeliverableEngine.SerializeToCsv(rows), "text/csv", Encoding.UTF8));

app.MapGet("/api/v1/cases/{id}/investigation", async (string id, IBedrockService bedrock) =>
{
    var matching = rows.FirstOrDefault(r => r.AlertId.Equals(id, StringComparison.OrdinalIgnoreCase));
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

app.MapGet("/api/v1/cases/{id}/audit", (string id) =>
{
    var events = AuditChainBuilder.Build(id);
    return Results.Ok(new
    {
        events,
        chain_valid = AuditChainBuilder.Verify(id, events),
        mode = "DEMO_STATIC",
    });
});

app.MapGet("/api/v1/cases/{id}/audit/verify", (string id) =>
{
    var events = AuditChainBuilder.Build(id);
    var valid = AuditChainBuilder.Verify(id, events);
    return Results.Ok(new
    {
        chain_valid = valid,
        verified_events = valid ? events.Count : 0,
        total_events = events.Count,
        events,
        mode = "DEMO_STATIC",
    });
});

app.MapPost("/api/v1/cases/{id}/approve", (string id, ApproveRequest request) =>
{
    var matching = rows.FirstOrDefault(r => r.AlertId.Equals(id, StringComparison.OrdinalIgnoreCase));
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
    return Results.Ok(new ApproveResponse("APPROVED", "sha256:" + Convert.ToHexString(digest).ToLowerInvariant()));
});

app.Run();
