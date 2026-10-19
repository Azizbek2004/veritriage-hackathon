# Standards Alignment

| Standard | Requirement | VeriTriage Implementation | Status |
|---|---|---|---|
| SR 26-2 | Deterministic rules excluded from “model” definition | `RuleRegistry` with 5 versioned deterministic rules; no statistical theory | Aligned |
| Wolfsberg pillar 3 | Explainability of coverage and effectiveness | `ExplanationSnapshot` endpoint + drawer rule list with fired/not-fired rules | Aligned |
| FATF Rec 10 | Ongoing monitoring | Deterministic verifier over 397,853 transactions | Aligned |
| FATF Rec 11 | Auditable records | File-backed SHA-256 audit ledger + document hashes | Aligned |
| FinCEN SAR guidance | Claim-to-transaction citation | Evidence table and rule/statute citations in deep-analysis Markdown | Partial — no paragraph-level footnote numbering |
| EBA four-eyes | Separation of duties | Server-side 4-eyes on `/approve` | Aligned |
| FATF / EBA references | Retrievable international references | Curated `fixtures/fatf_references.json`, endpoint, bundle section | Partial — curated links/summaries, not live MCP fetch |
| ISO 20022 | Structured remittance | N/A for Track 5 CSV | Not applicable |
| PDF evidence | Lawyer-ready PDF | Markdown-only approved for this sprint; no PDF package added | Partial |
