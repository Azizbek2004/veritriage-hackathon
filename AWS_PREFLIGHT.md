# AWS Preflight — 2026-10-19

No credentials are stored in this file. This is a capability check only.

## Identity

- Working credentials: the `ai-hackathon-ReadOnly` SSO role in account **422928733782**.
- Valid for `sts:GetCallerIdentity` in `eu-central-1` and `eu-north-1`.
- The `ai-hackathon-TeamAdmin` session token supplied in chat returned `InvalidClientTokenId` (expired or revoked). A refreshed token is required for `bedrock:InvokeModel` and `textract:AnalyzeDocument`.
- No AWS CLI on the machine. Preflight used Python 3.9 + boto3 1.35.99 installed locally under `tools/` (gitignored).

## S3

The ReadOnly role can list the datastore:

```
s3://ai-hackathon-datasets-422928733782/
```

Objects seen:

| Key | Bytes |
|---|---:|
| `CNB/transactions.csv` | 36,474,908 |
| `CNB/clients.csv` | 497,141 |
| `MerchantKYB/Merchant-Application-Form-A.pdf` | 404,635 |
| `MerchantKYB/Merchant-Application-Form-B.pdf` | 862,839 |
| `MerchantKYB/Merchant-Agreement-Short-Form.pdf` | 500,435 |
| `MerchantKYB/UBO-Declaration-Form.pdf` | 168,962 |
| `MerchantKYB/Partner-Application-Form.pdf` | 180,134 |
| `MerchantKYB/Required-Documents-Checklist.pdf` | 395,835 |
| `MerchantKYB/Cedric-Incomplete-UBO-Declaration.pdf` | 186,416 |
| `MerchantKYB/Michal-Incomplete-Partner-Application.pdf` | 210,468 |
| `MostlyRIght/MostlyRight_EU_financial_firm_licences_and_warnings_2026-10-18.csv` | 3,333,160 |

The objects were downloaded to `datasets/` (gitignored). They were not copied into committed fixtures.

## Bedrock Inventory

`bedrock:ListFoundationModels` and `bedrock:ListInferenceProfiles` are readable with the ReadOnly role.

- `eu-central-1`: 54 foundation models; 17 ON_DEMAND models.
- `eu-north-1`: 54 foundation models; 20 ON_DEMAND models.
- Sonnet 4.5 is present as an **inference profile**, not as an ON_DEMAND foundation model:
  - `eu.anthropic.claude-sonnet-4-5-20250929-v1:0` — ACTIVE — SYSTEM_DEFINED.
  - `global.anthropic.claude-sonnet-4-5-20250929-v1:0` — ACTIVE — SYSTEM_DEFINED.
- Other Claude profiles in `eu-central-1`: Sonnet 4, Sonnet 4.6, Sonnet 5, Sonnet 5.5, Haiku 4.5, Haiku 5.5, Opus 4.5–5.5.
- Anthropic is **not** in the ON_DEMAND list. The model ID must be the inference profile ID, not the underlying `anthropic.*` ID.

## Bedrock Runtime

Attempted with the ReadOnly role:

```
converse(modelId="eu.anthropic.claude-sonnet-4-5-20250929-v1:0", "ping")
```

Result:

```
AccessDeniedException: not authorized to perform bedrock:InvokeModel
```

The TeamAdmin token could not be used because it returned `InvalidClientTokenId`.

**No latency, prompt-caching, or tool-use result is claimed.** Phase 2 is blocked until an invoke-capable credential is supplied.

## What This Means

- Datasets are real and available.
- The Sonnet 4.5 profile exists in the target region.
- The hard gate is **invoke permission**, not model availability.
- A refreshed TeamAdmin SSO session should make Phase 2 testable.
