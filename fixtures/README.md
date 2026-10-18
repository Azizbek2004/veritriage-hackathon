# Fixtures — Pending Human Bootstrap

The fixture directory is empty by design. Agents must not fabricate ARES, Textract, invoice, transaction, or batch data. Every fixture is frozen once committed and used in the demo.

## Required Inventory

| File | Source | Label | Used by |
|---|---|---|---|
| `ares_basic_27074358.json` | Real ARES call on 19 Oct | Live cached | Agent Hop 1, evidence panel |
| `ares_vr_27074358.json` | Real ARES VR call, filtered `datumVymazu == null` | **Synthetic** (`_synthetic: true`) | Hop 2, director tenure |
| `textract_invoice.json` | Real Textract output on the demo invoice | Real, cached | Gate 3, bounding-box overlay |
| `invoice_hero.png` | Rendered from the demo PDF | Demo asset | PDF overlay |
| `alert_hero.json` | Constructed hero envelope | **Synthetic** (`_synthetic: true`) | Hero case |
| `alerts_batch_100.json` | Constructed 82/14/4 population | **Synthetic** (`_synthetic: true`) | Batch seeder |
| `transaction_history.json` | Constructed 90-day ledger | **Synthetic** (`_synthetic: true`) | Velocity rule |
| `tax_offices.json` | GFŘ published list | Real | FÚ matrix lookup |
| `pre_signed_mobile_signature.json` | Produced during rehearsal | Demo failover | F9 injection |

## Rules

- Every synthetic JSON fixture carries `"_synthetic": true` and the UI labels it.
- Record the exact retrieval command, timestamp, and endpoint in a companion note when the file is added. Do not include secrets.
- The PNG is a demo asset. It must match `textract_invoice.json`; if it does not, Gate 3's bounding boxes point at the wrong pixels.
- A fixture change requires `PROPOSAL.md` and a human `DECISION.md`.
- Do not use live network calls in tests. Read the fixture.
- Do not add a fixture that no demo moment uses. Ponytail applies to fixtures too.

## Acquisition Checklist

- [ ] Human confirms the ARES endpoints and captures both JSON files.
- [ ] Human confirms the Textract output and the invoice image come from the same document.
- [ ] The hero case fields match the 21 FTE narrative: 82/14/4, high-value escalation, Lithuanian IBAN, IT micro-entity, director 48h.
- [ ] `_synthetic` labels are present on every constructed file.
- [ ] No real customer data, secrets, or credentials are committed.
- [ ] `git status` is clean after the fixtures are committed.

Until this checklist is complete, VT-007 and later fixture-dependent tasks are blocked. VT-001 through VT-006 do not need fixtures.
