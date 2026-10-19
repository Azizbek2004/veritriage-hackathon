namespace VeriTriage.Infrastructure.Bedrock;

public sealed class CassetteInterceptor
{
    public const string Label = "LIVE_BEDROCK_CACHED";

    public string LoadHeroResponse(string repoRoot)
    {
        var path = Path.Combine(repoRoot, "fixtures", "bedrock_hero_response.json");
        return File.Exists(path)
            ? File.ReadAllText(path)
            : "{\"mode\":\"LIVE_BEDROCK_CACHED\",\"rationale\":\"§ 21(5) AML Act — cached demo rationale.\"}";
    }
}
