# Bedrock Credentials Status: INTERMITTENT

The code probes Bedrock on every status request; the label is never hardcoded.

- Earlier: `LIVE_BEDROCK` (1207ms probe, 12706ms investigation).
- Latest: `LIVE_BEDROCK_CACHED` with an SSL error.
- The cassette is the honest fallback.

## Stage Rule

Use whichever mode the badge and panel show. If cached, say “cached for demo stability.” Do not claim live.

See [AWS_BEDROCK_STATUS.md](AWS_BEDROCK_STATUS.md).
