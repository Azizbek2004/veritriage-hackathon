# Compliance & Data Policy

## AWS Hackathon Terms Alignment (signed 19 Oct 2026)

- **Point 5 (no personal data uploaded)**: All demo evidence payloads fed to Bedrock are synthetic or from the official hackathon datasets (ČNB, Tapaya). No real customer data, no real payment information, no real personal data.
- **Point 9 (temporary account)**: The cassette fallback (VT-014) ensures the demo runs even if AWS credentials expire. Rehearsed 3× before stage.
- **Point 13 (no confidential info in submission)**: Every visual artifact (video, screenshots, deck, receipt export) contains only synthetic data.

## Data Sources

| Source | License / Terms | Usage in Demo |
|---|---|---|
| ARES (Czech Ministry of Finance) | Open data, published under CC-BY 4.0 | Live connectivity check at build time. Response discarded. Demo uses synthetic fixture. |
| ČNB 400k Synthetic Transactions | Official hackathon dataset, provided by organizers | Primary batch input. Used as-is. |
| Tapaya KYB Forms | Official hackathon dataset, anonymized | Primary document input. Textract extraction. |
| Apify Web-Footprint | USD 100 credit, offline generation only | Synthetic fixture built offline. Not called live in demo. |

## Acquisition 2026-10-19

Official data was downloaded from `s3://ai-hackathon-datasets-422928733782/` into `datasets/` (gitignored):

| File | Rows | Classification |
|---|---:|---|
| `CNB/transactions.csv` | 397,853 | Official |
| `CNB/clients.csv` | 5,493 | Official |
| `MerchantKYB/*.pdf` | 8 files | Official, anonymized |
| `MostlyRIght/...csv` | 10,542 | Official |

No real personal data is committed. The 36 MB transaction CSV stays out of git. The two filled Tapaya forms have not been mapped from the `MerchantKYB` bucket yet.

## Synthetic Data Rule

Every synthetic fixture file must contain `"_synthetic": true` in its JSON, or a `// SYNTHETIC` header comment if it's not JSON. Official datasets are labeled "Official dataset" instead. Every UI component that displays fixture data must show a "Synthetic" or "Official dataset" badge in the footer.

## Responsible AI Alignment

- The LLM is advisory only. It never authorises a decision.
- The deterministic C# verifier recomputes every number and fails closed.
- The human signs with ECDSA P-256.
- Every step is hash-chained and auditable.
- This is aligned with the AWS Responsible AI Policy as a design constraint, not a policy checkbox.
