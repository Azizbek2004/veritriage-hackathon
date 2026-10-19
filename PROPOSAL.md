# PROPOSAL — Two Build Decisions

Status: **open**. These are proposals, not applied contract or package changes.

## P1 — MCC Mapping for ČNB Rows

`CnbAmlMetadata.MccCode` is required. The official data has no MCC:

- `CNB/transactions.csv` — no MCC column.
- `CNB/clients.csv` — PEP and AML risk score, no MCC.
- `MerchantKYB` forms are PDFs and are not extracted yet.

Options:

| Option | Change | Risk |
|---|---|---|
| A. `MccCode = "UNKNOWN"` for ČNB rows | None; R-MCC-01 stays inactive until a real MCC exists | Honest, but the AML MCC rule is not demonstrated on ČNB rows |
| B. Extract MCC from Tapaya/Merchant KYB | Product work in VT-034; mapping table required | More work; the forms may not contain MCC |
| C. Make `MccCode` optional | Contract change; requires `DECISION.md` | Violates the frozen contract for a demo convenience |

**Recommendation:** A now, B after the Tapaya extraction. Do not invent MCC values.

## P2 — Test Harness Packages

The test project uses the planned blueprint harness:

- `Microsoft.NET.Test.Sdk` 17.8.0
- `xunit` 2.5.3
- `xunit.runner.visualstudio` 2.5.3
- `coverlet.collector` 6.0.0

The build prompt says “do not add packages.” These were already specified in `BOOTSTRAP.md` as the approved xUnit harness and are cached locally. No other package was added.

**Decision needed:** approve these four versions retroactively, or replace the test harness. The backend tests cannot run without a test adapter.

## What Is Not Proposed

- No rename of `supplier`, `net`, `vat`, `gross`, or `ico`.
- No change to the verifier gates or the `CnbAmlMetadata` shape.
- No frontend package set approval; that remains a separate blocker.
