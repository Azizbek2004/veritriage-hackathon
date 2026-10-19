# Standards Alignment — Advanced Pass

| Standard | Requirement | VeriTriage Implementation | Status |
|---|---|---|---|
| SR 26-2 | Deterministic rules excluded from “model” definition | 5 versioned deterministic rules; 5-vector analyzer; no statistical theory | Aligned |
| Wolfsberg pillar 3 | Explainability of coverage and effectiveness | ExplanationSnapshot + vector cards + rule IDs in CSV reason | Aligned |
| FATF Rec 10 | Ongoing monitoring | 72h structuring, HHI, round-amount, in/out, velocity over 397,853 rows | Aligned |
| FATF Rec 11 | Auditable records | File-backed SHA-256 chain + dossier hashes + document verify | Aligned |
| FinCEN SAR guidance | Claim-to-transaction citation | Evidence table + rule/statute citations; no paragraph footnotes | Partial |
| EBA four-eyes | Separation of duties | Server-side 4-eyes `/approve` → 400 | Aligned |
| FATF references | Retrievable international references | Curated `fixtures/fatf_references.json` + export; not live MCP | Partial |
| Legal dossier | 10-year § 16 reconstruction | `data/legal_dossiers.json` + `FILE_CHAIN` + printable HTML | Aligned |
| PDF evidence | Lawyer-ready PDF | Markdown/HTML only; PDF deferred by approval | Partial |
| ISO 20022 | Structured remittance | N/A for Track 5 CSV | Not applicable |
