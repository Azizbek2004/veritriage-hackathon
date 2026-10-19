using System.Security.Cryptography;
using System.Text;
using PayShield.Api;
using VeriTriage.Domain;
using VeriTriage.Infrastructure.Bedrock;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options => options.AddPolicy("cockpit", policy =>
    policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors("cockpit");

var repoRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", ".."));
var rows = FinregDeliverableEngine.ProcessSampleBatch(FinregSampleLoader.Load(repoRoot));

var bedrock = new LiveBedrockService();

app.MapGet("/api/v1/health", () => Results.Ok(new { status = "ok", mode = "finreg" }));

app.MapGet("/api/v1/bedrock/status", () => Results.Ok(new
{
    status = "connected",
    model = LiveBedrockService.DefaultModelId,
    region = LiveBedrockService.Region
}));

app.MapGet("/api/v1/deliverable/sample", () => Results.Ok(rows));

app.MapGet("/api/v1/deliverable/csv", () =>
    Results.Text(FinregDeliverableEngine.SerializeToCsv(rows), "text/csv", Encoding.UTF8));

app.MapGet("/api/v1/cases/{id}/investigation", async (string id) =>
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
    Results.Ok(AuditChainBuilder.Build(id)));

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
    });
});

app.MapPost("/api/v1/cases/{id}/approve", (string id, ApproveRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.ApproverId) || request.SignatureB64 is null || !request.SignatureB64.StartsWith("mock_sig_", StringComparison.Ordinal))
    {
        return Results.BadRequest(new { error = "signature_b64 must start with mock_sig_ and approver_id is required" });
    }

    var ts = DateTimeOffset.UtcNow.ToString("O");
    var digest = SHA256.HashData(Encoding.UTF8.GetBytes($"{id}|{request.SignatureB64}|{request.ApproverId}|{ts}"));
    return Results.Ok(new ApproveResponse("APPROVED", "sha256:" + Convert.ToHexString(digest).ToLowerInvariant()));
});

app.Run();
