# AWS Bedrock Blocker

**Status:** CASSETTE — no live `Converse` response.

## Exact Error

`GET /api/v1/bedrock/status` (real probe, 2026-10-19):

```json
{
  "mode": "LIVE_BEDROCK_CACHED",
  "model": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "region": "eu-central-1",
  "latency_ms": 1550,
  "error": "The SSL connection could not be established, see inner exception."
}
```

`aws` CLI is not installed. The API was also restarted with
`AWS_PROFILE=129898826668_ai-hackathon-TeamAdmin`; it returned the same SSL error.

## What Was Tried

- Real `Converse` probe with the default credential chain.
- Real `Converse` probe with the TeamAdmin profile.
- No live response. No fabricated latency.

## What Is Needed

The host needs TLS access to `bedrock-runtime.eu-central-1.amazonaws.com`, and the credential needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:eu-central-1:129898826668:inference-profile/eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"
      ]
    }
  ]
}
```

Also allow the standard `bedrock:Converse` runtime call; the resource is the inference profile above.

## Human Action

```text
Fix TLS/proxy access to bedrock-runtime.eu-central-1.amazonaws.com.
Confirm the TeamAdmin role can bedrock:InvokeModel on the Sonnet 4.5 inference profile.
Run the API and call /api/v1/bedrock/status.
Only if it returns mode=LIVE_BEDROCK should the badge say LIVE.
```

## Do Not

- Do not fake a live call.
- Do not edit the badge.
- Do not modify the CSV or 4-eyes logic to work around this.
