# AWS Bedrock Status — PROBE-DRIVEN (ACTIVE)

**Latest probe:** `LIVE_BEDROCK` (1611ms, Claude Sonnet 4.5 in `eu-central-1`).

## Latest Evidence

```json
{
  "mode": "LIVE_BEDROCK",
  "model": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "region": "eu-central-1",
  "latency_ms": 1611,
  "error": null
}
```

## Live Investigation Evidence

- `/bedrock/status`: `LIVE_BEDROCK`, 1611ms.
- `/cases/ALERT-001/investigation`: `LIVE_BEDROCK`, live Claude Sonnet 4.5 output generated in ~10s.

When the backend process runs with AWS environment variables sourced (`secrets/aws_credentials.env`), `ProbeAsync` connects directly to Bedrock. If credentials expire or network fails, it gracefully falls back to `LIVE_BEDROCK_CACHED`.

## Stage Rule

- If the badge is `LIVE · Sonnet 4.5` and the panel says `LIVE_BEDROCK`: say live.
- Otherwise: say cached, and use the labeled cassette.
- Do not force the badge.
