# Credentials Status: BLOCKED — CASSETTE IN USE

**Do not claim live Bedrock.** The current runtime returns `LIVE_BEDROCK_CACHED`.

## Evidence

`GET /api/v1/bedrock/status` performs a real `Converse` probe. It returns:

```json
{
  "mode": "LIVE_BEDROCK_CACHED",
  "model": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "region": "eu-central-1",
  "latency_ms": 1550,
  "error": "The SSL connection could not be established, see inner exception."
}
```

- AWS CLI is not installed, so the `aws bedrock-runtime converse` command could not be run.
- `~/.aws/config` contains `[default]` and `[profile 129898826668_ai-hackathon-TeamAdmin]`.
- `~/.aws/credentials` contains both profiles.
- The API was restarted with `AWS_PROFILE=129898826668_ai-hackathon-TeamAdmin`; the same SSL error occurred.
- No live response was returned. The cassette is the actual mode.

## What Is Needed

1. Working TLS/network access from the API host to `bedrock-runtime.eu-central-1.amazonaws.com`.
2. A credential with `bedrock:InvokeModel` on the Sonnet 4.5 inference profile.
3. A successful probe that returns `mode: "LIVE_BEDROCK"` with a measured latency.

The exact policy is in [AWS_BLOCKED.md](AWS_BLOCKED.md).

## Do Not

- Do not change the badge to LIVE by hand.
- Do not claim the cassette is a live call.
- Do not paste credentials into a tracked file.
