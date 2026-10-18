# Slide 2 — Deployment

## Headline

Sidecar to the case management system. Zero ledger changes.

## Paragraph

> "VeriTriage deploys as a containerized service alongside the bank's existing case management system. It consumes alerts via webhook or batch export from Actimize, NICE, or Fiserv, and writes the proof receipt back to the case management audit log. No changes to the core ledger. No PISP licence. No funds held."

## Architecture Line

> "Deployment: sidecar to case management. Consumes alerts via webhook. Writes receipts to audit log. Zero ledger changes."

## Diagram

```
Actimize / NICE / Fiserv
          │  webhook or batch export
          ▼
   VeriTriage sidecar
   ├─ Bedrock agent (evidence)
   ├─ deterministic verifier (proof)
   ├─ rule engine (decision)
   └─ audit chain (receipt)
          │  proof receipt + audit event
          ▼
Bank case management audit log
          │
          ▼
Human signature (ECDSA P-256)
```

## Boundaries

- Not a PSP. Not a payment initiator. Not a card issuer.
- No funds held. No PISP licence. No ledger write.
- The bank's core system remains the system of record.
- The proof receipt is written back to the bank's audit log; it is not a new ledger.

## What Not to Add

- No Mastercard MCC label.
- No virtual card hook.
- No "we replace the case management system" claim.
- No new deployment architecture beyond the sidecar story.
