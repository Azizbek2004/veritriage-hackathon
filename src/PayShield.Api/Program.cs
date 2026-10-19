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

app.MapGet("/api/v1/health", () => Results.Ok(new { status = "ok", mode = "finreg" }));

app.MapGet("/api/v1/deliverable/sample", () => Results.Ok(rows));

app.MapGet("/api/v1/deliverable/csv", () =>
    Results.Text(FinregDeliverableEngine.SerializeToCsv(rows), "text/csv", Encoding.UTF8));

app.MapGet("/api/v1/cases/{id}/investigation", (string id) =>
{
    var json = new CassetteInterceptor().LoadHeroResponse(repoRoot);
    return Results.Text(json, "application/json");
});

app.MapPost("/api/v1/cases/verify-4-eyes", (FourEyesRequest request) =>
    FinregDeliverableEngine.IsFourEyesIndependent(request.Executive, request.Approver)
        ? Results.Ok(new { status = "ok" })
        : Results.Json(new { error = FinregDeliverableEngine.FourEyesViolation }, statusCode: 400));

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
