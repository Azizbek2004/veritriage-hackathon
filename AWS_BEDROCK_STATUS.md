# AWS Bedrock Status — LIVE

**Status:** `LIVE_BEDROCK` verified on 2026-10-19.

## Measured Evidence

Real probe (`GET /api/v1/bedrock/status`):

```json
{
  "mode": "LIVE_BEDROCK",
  "model": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "region": "eu-central-1",
  "latency_ms": 1207,
  "error": null
}
```

Real investigation (`GET /api/v1/cases/ALERT-045/investigation`):

- `mode`: `LIVE_BEDROCK`
- `model`: `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `latency_ms`: **12706**
- 4 claims returned
- legal basis: `AML Act No. 253/2008 Sb. § 21(5); Payment Services Regulation (EU) 2015/847 Article 83`

No cassette fallback was used on these calls.

## Earlier Failure (Resolved)

The earlier probe returned `LIVE_BEDROCK_CACHED` with
`The SSL connection could not be established, see inner exception.`
After the network/credential state changed, the same code path returned live.
The cassette remains available as a fallback and is labeled `LIVE_BEDROCK_CACHED`.

## Stage Note

The live investigation took ~12.7s. Pre-warm it before the timer, or use the
cached fallback if the venue network is slow. Do not show a LIVE badge if the
response mode is `LIVE_BEDROCK_CACHED`.
