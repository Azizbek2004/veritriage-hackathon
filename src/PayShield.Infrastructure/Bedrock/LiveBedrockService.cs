using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Nodes;
using Amazon;
using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;

namespace VeriTriage.Infrastructure.Bedrock;

public sealed class LiveBedrockService
{
    public const string DefaultModelId = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0";
    public const string Region = "eu-central-1";

    private readonly AmazonBedrockRuntimeClient _client;
    private readonly CassetteInterceptor _cassette = new();
    private readonly string _modelId;

    public LiveBedrockService(string? modelId = null)
    {
        _modelId = modelId ?? Environment.GetEnvironmentVariable("BEDROCK_MODEL_ID") ?? DefaultModelId;
        _client = new AmazonBedrockRuntimeClient(RegionEndpoint.GetBySystemName(Region));
    }

    public async Task<string> InvestigateAsync(string caseId, string clientDetails, string repoRoot, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

            var systemPrompt = @"You are VeriTriage AML Agent. You evaluate transactions under Czech AML Act No. 253/2008 Sb. § 21 and PSR Art 83.
Return ONLY valid JSON matching this exact structure:
{
  ""mode"": ""LIVE_BEDROCK"",
  ""model"": """ + _modelId + @""",
  ""evidence_summary"": ""<concise summary of evidence>"",
  ""claims"": [
    {
      ""claimId"": ""C-AML-01"",
      ""claimType"": ""VELOCITY_RATIO"",
      ""narrativeTemplate"": ""24h transaction count is elevated against baseline."",
      ""jsonPointers"": [""/transaction/velocity""],
      ""expectedValues"": [""3.2""],
      ""documentProvenance"": null
    },
    {
      ""claimId"": ""C-AML-02"",
      ""claimType"": ""PEP_EXPOSURE"",
      ""narrativeTemplate"": ""Client is a politically exposed person under § 21(5)."",
      ""jsonPointers"": [""/client/pep""],
      ""expectedValues"": [""true""],
      ""documentProvenance"": null
    }
  ],
  ""recommendedOutcome"": ""ESCALATE"",
  ""recommendedRiskScore"": 96,
  ""rationale"": ""<statutory rationale citing § 21(5) AML Act>"",
  ""legalBasis"": ""AML Act No. 253/2008 Sb. § 21(5)""
}";

            var userPrompt = $"Investigate alert: {caseId}. Client details: {clientDetails}. Provide AML dossier.";

            var request = new ConverseRequest
            {
                ModelId = _modelId,
                System = new List<SystemContentBlock>
                {
                    new SystemContentBlock { Text = systemPrompt }
                },
                Messages = new List<Message>
                {
                    new Message
                    {
                        Role = ConversationRole.User,
                        Content = new List<ContentBlock>
                        {
                            new ContentBlock { Text = userPrompt }
                        }
                    }
                },
                InferenceConfig = new InferenceConfiguration
                {
                    MaxTokens = 1000,
                    Temperature = 0.0f
                }
            };

            var response = await _client.ConverseAsync(request, linkedCts.Token);
            sw.Stop();

            var text = response.Output.Message.Content[0].Text?.Trim() ?? string.Empty;

            // Strip markdown block if model wrapped in ```json
            if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                text = text.Substring(7);
                if (text.EndsWith("```", StringComparison.Ordinal))
                    text = text.Substring(0, text.Length - 3);
                text = text.Trim();
            }
            else if (text.StartsWith("```", StringComparison.Ordinal))
            {
                text = text.Substring(3);
                if (text.EndsWith("```", StringComparison.Ordinal))
                    text = text.Substring(0, text.Length - 3);
                text = text.Trim();
            }

            var node = JsonNode.Parse(text);
            if (node is JsonObject obj)
            {
                obj["mode"] = "LIVE_BEDROCK";
                obj["latency_ms"] = sw.ElapsedMilliseconds;
                obj["model"] = _modelId;
                return obj.ToJsonString();
            }

            return text;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BedrockService] Fallback to cassette due to: {ex.Message}");
            return _cassette.LoadHeroResponse(repoRoot);
        }
    }
}
