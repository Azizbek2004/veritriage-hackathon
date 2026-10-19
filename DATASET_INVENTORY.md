# Dataset Inventory — 2026-10-19

All files are official hackathon data, downloaded from `s3://ai-hackathon-datasets-422928733782/` and stored in `datasets/` (gitignored). No real personal data is committed.

## ČNB

| File | Bytes | Data rows | Format |
|---|---:|---:|---|
| `CNB/transactions.csv` | 36,474,908 | **397,853** | UTF-8 BOM, semicolon-separated, 11 columns |
| `CNB/clients.csv` | 497,141 | **5,493** | UTF-8 BOM, semicolon-separated, 12 columns |

### Transaction columns

```
transaction ID;client ID;date;time;volume;currency;country of payer;
country of payee;account of payer;account of payee;type of transaction
```

Example:

```
TX000000001;K003797;01.07.2026;00:00:43;1485.62;CZK;CZ;CZ;K003797;ACZ00172;outgoing payment
```

### Client columns

```
client ID;country of client;date of contract;contract concluded;PEP;type of client;
expected volume ...;expected number ...;real volume ...;real number ...;
maximal volume ...;AML risk score
```

The client file provides PEP and AML risk score. The transaction file provides no MCC, no PEP flag, and no risk rating. Any `CnbAmlMetadata` row must join the two files; `MccCode` has no source in these two CSVs.

## Tapaya / Merchant KYB

Eight PDFs were downloaded under `datasets/MerchantKYB/`:

- `Merchant-Application-Form-A.pdf`
- `Merchant-Application-Form-B.pdf`
- `Merchant-Agreement-Short-Form.pdf`
- `UBO-Declaration-Form.pdf`
- `Partner-Application-Form.pdf`
- `Required-Documents-Checklist.pdf`
- `Cedric-Incomplete-UBO-Declaration.pdf`
- `Michal-Incomplete-Partner-Application.pdf`

`file` confirms all eight are PDF 1.6/1.7. The bucket labels them `MerchantKYB`, not `Tapaya`; the mapping to the two “Tapaya filled forms” named in the pivot brief is **not established**. Do not rename them without confirming the official mapping.

## MostlyRight

`MostlyRight/MostlyRight_EU_financial_firm_licences_and_warnings_2026-10-18.csv` — 3,333,160 bytes, **10,542** data rows, comma-separated. It is a licence/warning list, not a transaction ledger.

## Copy Status

No file was copied into `fixtures/`. The official data remains in `datasets/`; the build can reference it without committing 36 MB to git. `fixtures/README.md` is updated to reflect acquisition and the pending copy/mapping.
