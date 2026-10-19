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

## P3 — Exact FINREG Engine Code Missing

The Release Manager brief says the exact `FinregDeliverableEngine.cs` is “provided below”, but no code block or attachment was present. The implemented engine is an interpretation of the stated constraints:

- 11 columns;
- priority 0–100;
- 30/10/5 distribution;
- `executive_person != approver`;
- `reason` contains `§ 6(1)(a)` or `§ 21(5)`;
- exact 4-eyes 400 body.

The header names are:

```
alert_id,client_id,client_name,triage,priority,role,
executive_person,approver,four_eyes_status,legal_basis,reason
```

**Risk:** if FINREG's template uses different names or order, the 85% CSV score is at risk. The human must compare this header to the organizer's template before submission. No contract change is proposed; only the CSV writer may need a header-order fix.

### P3 update — 2026-10-19

The release prompt supplied the exact 11 headers, and they are now implemented:

```
alert_id,alert_type,client_id,transaction_id,triage,priority,
executive_role,executive_person,approver,reason,log
```

The exact `FinregDeliverableEngine.cs` values/formula still were not supplied. `alert_type`, `triage`, and `executive_role` are our documented interpretation. If FINREG requires different value vocabularies, only the mapping changes; the header row is exact.
