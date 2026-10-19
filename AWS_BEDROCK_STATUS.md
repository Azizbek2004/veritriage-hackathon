# AWS Bedrock Status — PROBE-DRIVEN (INTERMITTENT)

**Latest probe:** `LIVE_BEDROCK_CACHED` (SSL error). **Earlier probe:** `LIVE_BEDROCK` (1207ms; investigation 12706ms).

## Latest Evidence

```json
{
  "mode": "LIVE_BEDROCK_CACHED",
  "model": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "region": "eu-central-1",
  "latency_ms": 1229,
  "error": "The SSL connection could not be established, see inner exception."
}
```

## Earlier Live Evidence

- `/bedrock/status`: `LIVE_BEDROCK`, 1207ms.
- `/cases/ALERT-045/investigation`: `LIVE_BEDROCK`, 12706ms, 4 claims, § 21(5) legal basis.

The live path is not stable across restarts. The UI is wired to the probe and shows **CACHED** when the probe fails.

## Stage Rule

- If the badge is `LIVE · Sonnet 4.5` and the panel says `LIVE_BEDROCK`: say live.
- Otherwise: say cached, and use the labeled cassette.
- Do not force the badge.
