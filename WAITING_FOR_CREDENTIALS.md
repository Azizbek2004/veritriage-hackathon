# Waiting for Credentials

## What Is Needed

A refreshed `ai-hackathon-TeamAdmin` SSO session in account **129898826668**.

Required permissions:

- `bedrock:InvokeModel`
- `bedrock:Converse`
- `bedrock:InvokeModelWithResponseStream` (optional)
- `textract:AnalyzeDocument`
- `s3:GetObject` on `s3://ai-hackathon-datasets-422928733782/*`

The shared `ai-hackathon-ReadOnly` role is valid for `s3:ListBucket`, `s3:GetObject`, `bedrock:ListFoundationModels`, and `bedrock:ListInferenceProfiles`. It is **not** sufficient for Converse.

## How to Refresh

SSO start URL: `https://identitycenter.amazonaws.com/ssoins-65082905651820f1`
SSO region: `eu-north-1`

On a machine with the AWS CLI:

```bash
aws configure sso --profile ai-hackathon-TeamAdmin
aws sso login --profile ai-hackathon-TeamAdmin
aws sts get-caller-identity --profile ai-hackathon-TeamAdmin --region eu-central-1
```

Then export fresh credentials or write a local, gitignored profile. Do not paste the session token into a tracked file.

## What Will Be Done Immediately After

1. `aws sts get-caller-identity` — record account ID.
2. `bedrock-runtime converse` with
   `eu.anthropic.claude-sonnet-4-5-20250929-v1:0` — measure wall-clock time.
3. Prompt-caching test — confirm `cacheReadInputTokens` on the second call.
4. Tool-use test — confirm a `toolUse` block for `get_ares_basic_profile`.
5. If the model fails, try the next available profile (Haiku 4.5, Sonnet 4, Nova Lite) and report the exact error. Do not invent a working model.

## No Secrets Here

No access key, session token, or secret is stored in this repository. `secrets/`, `datasets/`, and `tools/` are gitignored.
