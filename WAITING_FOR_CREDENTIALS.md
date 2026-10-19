# Bedrock Credentials Status: LIVE

The live Bedrock path is working as of 2026-10-19.

## Verified

- `/api/v1/bedrock/status` → `mode: "LIVE_BEDROCK"`, **1207ms** probe.
- `/api/v1/cases/ALERT-045/investigation` → `mode: "LIVE_BEDROCK"`, **12706ms**, 4 claims, § 21(5) legal basis.
- Model: `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`, region `eu-central-1`.

## Fallback

If credentials or TLS fail, the service returns `LIVE_BEDROCK_CACHED` and the UI
shows the yellow CACHED badge. Do not force the LIVE label.

## Stage Note

The live call takes ~12.7s. Pre-warm it before the 5-minute timer or use the
cassette fallback. See [AWS_BEDROCK_STATUS.md](AWS_BEDROCK_STATUS.md).
