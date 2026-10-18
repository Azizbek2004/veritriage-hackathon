# VeriTriage — Technical Blueprint

> **Remediation note (pre-H+0):** The current positioning, Gate 2 scope invariant, three regulatory clocks, 180-second review, and Q&A live in `AGENTS.md`, `REMEDIATION.md`, and `.agents/QA_WAR_ROOM.md`. Where this historical blueprint conflicts — the old write-off hook, the second-hop heuristic, the fast-signature claim — the environment docs win.

**Status: FROZEN for build.** If it is not in this document, it does not go on stage. Any change requires a written `PROPOSAL.md` and both team members' agreement.

**Team**: Azizbek Khursanov (frontend, mobile, pitch) · Shohjahon Alijonov (backend, AI, infrastructure)
**Event**: $ hackathon_ · Enterprise category · Prague, 19–20 October 2026
**Win probability (honest)**: 55–60%
**Build budget**: 24 hours engineering + 6 hours rehearsal/sleep

---

## 1. Positioning (What We Are and Are Not)

**One-liner**: VeriTriage is the proof layer that makes agentic fraud triage deployable in a regulated bank. The agent proposes. The verifier proves. The human signs.

**What we are**: A decision-support system for PSPs facing PSR Article 83 monitoring obligations and Article 55/56 burden-of-proof deadlines. We assemble evidence, verify it deterministically, and produce a regulator-ready proof receipt bound to a human signature.

**What we are not**: Not a PSP. Not a payment initiator. Not a card issuer. Not a VoP provider. Not a real-time authorization system. We do not hold funds, do not initiate payments, and do not claim PSR Article 59 coverage for B2B transactions.

**The pitch hook** (verbatim, memorized):
> "Under PSR Articles 56 and 83, when a bank suspends a suspicious €48,000 payment or faces a dispute, it has 15 business days to prove counterparty fraud or eat the loss. VeriTriage auto-clears 82% of alerts deterministically and builds a ČNB-ready cryptographic dossier for the 4% that escalate."

---

## 2. Repo Structure (Frozen)

```
veritriage/
├── AGENTS.md                       # Agent context (source of truth for AI agents)
├── CLAUDE.md                       # "Read AGENTS.md"
├── README.md                       # 15 lines, human-facing
├── contracts/
│   ├── domain/                     # C# record types (frozen)
│   │   ├── EvidenceEnvelope.cs
│   │   ├── ClaimAssertion.cs
│   │   ├── TextractProvenance.cs
│   │   ├── VerificationResult.cs
│   │   ├── ProofStep.cs
│   │   ├── BatchTriageSummary.cs
│   │   ├── AlertQueueRow.cs
│   │   ├── ServerAttestation.cs
│   │   ├── CaseDetail.cs
│   │   └── PaymentSlip.cs
│   ├── types/
│   │   └── api.d.ts                # TypeScript mirror (frozen)
│   └── api/
│       └── openapi.yaml            # 12-endpoint spec (frozen)
├── fixtures/
│   ├── ares_basic_27074358.json
│   ├── ares_vr_27074358.json       # Synthetic, filtered active directors
│   ├── textract_invoice.json       # Pre-computed Textract blocks
│   ├── invoice_hero.png            # Static PNG for bounding-box overlay
│   ├── alert_hero.json             # Hero case envelope
│   ├── alerts_batch_100.json       # 100-alert seed population
│   ├── transaction_history.json    # 90-day ledger for hero supplier
│   └── tax_offices.json            # FÚ code → matrix lookup
├── tests/
│   ├── golden/
│   │   ├── verifier_hero_case.json
│   │   ├── seeder_batch_100.json
│   │   └── receipt_hero_case.json
│   └── contract/
│       └── CaseDetail.snapshot.json
├── src/
│   ├── PayShield.Api/
│   │   ├── Program.cs
│   │   ├── Endpoints/
│   │   │   ├── CasesEndpoints.cs
│   │   │   ├── VerifierEndpoints.cs
│   │   │   ├── DemoEndpoints.cs
│   │   │   └── AuditEndpoints.cs
│   │   ├── Hubs/
│   │   │   └── ApprovalsHub.cs
│   │   └── PayShield.Api.csproj
│   ├── PayShield.Domain/
│   │   ├── Rules/
│   │   │   ├── IRule.cs
│   │   │   ├── RuleEngine.cs
│   │   │   └── FraudRules.cs
│   │   ├── Money/
│   │   │   └── MoneyMath.cs
│   │   └── PayShield.Domain.csproj
│   ├── PayShield.Verifier/
│   │   ├── VerifierPipeline.cs
│   │   ├── Gates/
│   │   │   ├── Gate1_Schema.cs
│   │   │   ├── Gate2_SecondHopPolicy.cs
│   │   │   ├── Gate3_OcrProvenance.cs
│   │   │   ├── Gate4_Arithmetic.cs
│   │   │   └── Gate5_ClaimGrounding.cs
│   │   ├── JsonPointerResolver.cs
│   │   └── PayShield.Verifier.csproj
│   ├── PayShield.Infrastructure/
│   │   ├── Ares/
│   │   │   └── AresClient.cs
│   │   ├── Bedrock/
│   │   │   ├── BedrockAgent.cs
│   │   │   └── CassetteInterceptor.cs
│   │   ├── Audit/
│   │   │   └── AuditLedger.cs
│   │   ├── Crypto/
│   │   │   └── ServerSigner.cs
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs
│   │   │   └── Seed/
│   │   │       └── FixtureSeeder.cs
│   │   └── PayShield.Infrastructure.csproj
│   └── PayShield.sln
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Single-screen cockpit
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── BatchTriageBar.tsx
│   │   │   ├── AlertQueueTable.tsx
│   │   │   ├── CaseDetailPane.tsx
│   │   │   ├── AgentEvidencePanel.tsx
│   │   │   ├── VerifierGatesPanel.tsx
│   │   │   ├── ProofReceiptPanel.tsx
│   │   │   ├── OverrideBanner.tsx
│   │   │   ├── PdfBoundingBoxOverlay.tsx
│   │   │   ├── QrSigningModal.tsx
│   │   │   ├── AuditChainView.tsx
│   │   │   └── DemoControls.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── signalr.ts
│   │   │   ├── mock.ts
│   │   │   └── format.ts
│   │   ├── package.json
│   │   └── tailwind.config.ts
│   └── mobile/
│       ├── app/
│       │   ├── index.tsx             # QR scanner entry
│       │   ├── sign.tsx              # Signing screen
│       │   └── result.tsx            # Response QR
│       ├── lib/
│       │   ├── keys.ts
│       │   ├── signing.ts
│       │   └── qr.ts
│       ├── app.json
│       └── package.json
├── docker-compose.yml                # Postgres 16 only
└── .github/workflows/ci.yml          # dotnet test on push
```

---

## 3. Domain Model (Frozen Contracts)

Every type below is committed in `contracts/domain/`. The worker agents deserialize with `UnmappedMemberHandling.Disallow` and `JsonNumberHandling.Strict`. Every property has `[JsonRequired]`.

```csharp
namespace VeriTriage.Domain;

public sealed record EvidenceEnvelope(
    [property: JsonRequired] string CaseId,
    [property: JsonRequired] JsonNode Root,
    [property: JsonRequired] DateTimeOffset GatheredAt);

public sealed record TextractProvenance(
    [property: JsonRequired] string DocumentId,
    [property: JsonRequired] int PageNumber,
    [property: JsonRequired] decimal OcrConfidence,
    [property: JsonRequired] BoundingBox Box,
    [property: JsonRequired] string RawExtractedText);

public sealed record BoundingBox(decimal Left, decimal Top, decimal Width, decimal Height);

public sealed record ClaimAssertion(
    [property: JsonRequired] string ClaimId,
    [property: JsonRequired] string ClaimType,
    [property: JsonRequired] string NarrativeTemplate,
    [property: JsonRequired] string[] JsonPointers,
    [property: JsonRequired] string[] ExpectedValues,
    TextractProvenance? DocumentProvenance);

public sealed record ProofStep(
    string? Claim, decimal? Computed, decimal? Baseline, decimal? Ratio,
    string? Constraint, string? Condition, bool? Satisfied,
    bool Valid, string? LegalRef);

public sealed record VerificationResult(
    [property: JsonRequired] bool Valid,
    [property: JsonRequired] Dictionary<string, int> Engines,
    [property: JsonRequired] List<ProofStep> ProofSteps,
    [property: JsonRequired] string ReceiptHash,
    string? FailureReason);

public sealed record AlertQueueRow(
    [property: JsonRequired] string CaseId,
    [property: JsonRequired] string Supplier,
    [property: JsonRequired] decimal Amount,
    [property: JsonRequired] string Currency,
    [property: JsonRequired] int Tier,
    [property: JsonRequired] int RiskScore,
    [property: JsonRequired] int LlmTokens);

public sealed record BatchTriageSummary(
    [property: JsonRequired] int TotalProcessed,
    [property: JsonRequired] int Tier1AutoCleared,
    [property: JsonRequired] int Tier2StepUpHold,
    [property: JsonRequired] int Tier3Escalated,
    [property: JsonRequired] double ElapsedMilliseconds,
    [property: JsonRequired] int LlmTokensConsumedByTier1And2,
    [property: JsonRequired] IReadOnlyList<AlertQueueRow> ShowcaseRows);

public sealed record ServerAttestation(
    [property: JsonRequired] string Algorithm,
    [property: JsonRequired] string PublicKeyThumbprint,
    [property: JsonRequired] string KeyCustodyMode,
    [property: JsonRequired] string SignatureBase64);

public sealed record CaseDetail(
    [property: JsonRequired] string Id,
    [property: JsonRequired] string Status,
    [property: JsonRequired] AlertDto Alert,
    [property: JsonRequired] SupplierDto Supplier,
    [property: JsonRequired] Dictionary<string, JsonNode> Evidence,
    [property: JsonRequired] VerificationResult Verification,
    [property: JsonRequired] DecisionDto Decision,
    [property: JsonRequired] ApprovalDto Approval);

public sealed record AlertDto(string Type, decimal Amount, string Currency, string TransactionId);
public sealed record SupplierDto(
    string Name, string Ico, string Dic, string Country, int AgeDays,
    bool UnreliablePayer, string[] PublishedAccounts);
public sealed record DecisionDto(
    string Outcome, int RiskScore, string RulesVersion,
    string AgentRecommendation, bool OverriddenByVerifier,
    List<RuleHitDto> Reasons);
public sealed record RuleHitDto(
    string RuleId, int Severity, string LegalRef, string Title, string Detail);
public sealed record ApprovalDto(bool Required, bool SignatureVerified, string? SignatureB64, string? PayloadHash);

public sealed record PaymentSlip(
    string Beneficiary, string Account, string Amount,
    string? Vs, string? Ss, string? Ks, string? Message, string LegalRef);
```

**The rule for the worker agents**: do not modify any file in `contracts/`. If a type is wrong, write `PROPOSAL.md`, explain why, wait for human approval. The frozen contract is the invariant that lets two agents work in parallel.

---

## 4. Database Schema

Postgres 16. Migrations run at startup for demo convenience. Every table has `created_at timestamptz default now()`.

```sql
create table cases (
  id uuid primary key,
  company_id uuid not null,
  alert_type text not null,              -- VOP_NO_MATCH | VELOCITY | BEHAVIOURAL
  transaction_id text,
  supplier_ico char(8),
  supplier_name text,
  amount numeric(18,2),
  currency char(3),
  status text not null default 'NEW',    -- NEW | EVIDENCE_GATHERED | VERIFIED | ESCALATED | APPROVED | REJECTED | CLOSED
  created_at timestamptz default now());

create table evidence (
  id uuid primary key,
  case_id uuid references cases(id),
  source text not null,                  -- ARES_BASIC | ARES_VR | TRANSACTION_HISTORY | DEVICE | DOCUMENT
  payload jsonb not null,
  gathered_at timestamptz default now());

create table verifications (
  id uuid primary key,
  case_id uuid references cases(id),
  engines jsonb not null,
  proof_steps jsonb not null,
  valid boolean not null,
  receipt_hash text not null,
  created_at timestamptz default now());

create table decisions (
  id uuid primary key,
  case_id uuid references cases(id),
  outcome text not null,                 -- AUTO_CLEAR | ESCALATE | BLOCK
  risk_score int not null,
  rules_version text not null,
  reasons jsonb not null,
  agent_recommendation text,
  overridden_by_verifier boolean default false,
  created_at timestamptz default now());

create table approvals (
  id uuid primary key,
  case_id uuid references cases(id),
  requested_at timestamptz,
  decided_at timestamptz,
  decision text,
  signature_b64 text,
  public_key_b64 text,
  payload_hash text,
  verified boolean default false);

create table audit_events (
  seq bigserial primary key,
  case_id uuid,
  event_type text not null,
  payload jsonb not null,
  prev_hash text,
  hash text not null,
  created_at timestamptz default now());

create table tax_offices (
  code text primary key,
  name text,
  matrix text,
  bank_code text default '0710');
```

**Money rules**: `numeric(18,2)` in Postgres, `decimal` in C#, never `double`. Rounding is `MidpointRounding.AwayFromZero` at order level. Assert `Σ orders == gross` (±0.01).

---

## 5. The Verifier (The Product)

A pure C# library. No I/O. No LLM. Deterministic. Testable in isolation.

### 5.1 Entry Point

```csharp
namespace VeriTriage.Verifier;

public sealed class VerifierPipeline
{
    public VerificationResult Evaluate(EvidenceEnvelope envelope, ClaimAssertion[] claims)
    {
        var engines = new Dictionary<string, int>();
        var steps = new List<ProofStep>();

        var g1 = Gate1_Schema.Check(envelope, claims);
        if (!g1.Passed) return Fail("schema", g1.Reason);

        var g2 = Gate2_SecondHopPolicy.Check(envelope);
        if (!g2.Passed) return Fail("second_hop", g2.Reason);

        var g3 = Gate3_OcrProvenance.Check(envelope, claims);
        if (!g3.Passed) return Fail("ocr", g3.Reason);

        var g4 = Gate4_Arithmetic.Check(envelope);
        if (!g4.Passed) return Fail("arithmetic", g4.Reason);

        var g5 = Gate5_ClaimGrounding.Check(envelope, claims);
        if (!g5.Passed) return Fail("grounding", g5.Reason);

        engines["schema"] = g1.Count;
        engines["second_hop"] = g2.Count;
        engines["ocr"] = g3.Count;
        engines["arithmetic"] = g4.Count;
        engines["grounding"] = g5.Count;
        steps.AddRange(g1.Steps.Concat(g2.Steps).Concat(g3.Steps).Concat(g4.Steps).Concat(g5.Steps));

        var hash = ComputeReceiptHash(envelope, engines, steps);
        return new VerificationResult(true, engines, steps, hash, null);
    }

    private static string ComputeReceiptHash(
        EvidenceEnvelope e, Dictionary<string, int> engines, List<ProofStep> steps)
    {
        var canonical = JsonSerializer.Serialize(new { e.CaseId, engines, steps },
            new JsonSerializerOptions { WriteIndented = false });
        return "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
    }
}
```

### 5.2 Gate 1 — Schema

Deserializes the agent payload with `UnmappedMemberHandling.Disallow`. Any extra field, missing `[JsonRequired]` property, or type mismatch throws → fail-closed.

**Steps emitted**: one per field validated. `Count` = number of fields.

### 5.3 Gate 2 — Second-Hop Policy Consistency

Reads `envelope.Root["agent"]["hops"]`. For each hop beyond the first, verifies a corresponding justification exists in the preceding hop's evidence:

| Second hop tool | Required justification in Hop 1 |
|---|---|
| `get_ares_statutory_history` | `document.signatory_name != null` OR `iban_country != "CZ"` |
| `get_transaction_history` | `alert.type == "VELOCITY"` |
| `extract_document` | `envelope.Root["alert"]["has_attachment"] == true` |

**Steps emitted**: one per hop. `Count` = number of hops validated.

### 5.4 Gate 3 — OCR Provenance

For every claim whose `JsonPointers` reference `/document/*`, verifies:

1. `DocumentProvenance != null`
2. `OcrConfidence >= 99.0m`
3. `decimal.Parse(DocumentProvenance.RawExtractedText) == decimal.Parse(resolved value)`
4. `Box.Left`, `Box.Top`, `Box.Width`, `Box.Height` are all within `[0, 100]`

Fail-closed if any fails.

**Steps emitted**: one per document-sourced claim. `Count` = number of document claims.

### 5.5 Gate 4 — Arithmetic

Recomputes in `System.Decimal`:

| Claim type | Verification |
|---|---|
| `INVOICE_TOTAL_CZK` | `net + vat == gross` (±0.01) |
| `VAT_CALCULATION` | `net × vat_rate == vat` (±0.01); `vat_rate ∈ {0, 12, 21}` |
| `FX_CONVERSION` | `amount_eur × cnb_rate == amount_czk` (±0.01) |
| `VELOCITY_RATIO` | `count(transactions_24h) / baseline == ratio` (±0.01) |
| `DIRECTOR_TENURE_HOURS` | `(duzp - appointment_date).TotalHours == claimed` (±0.5) |

**Steps emitted**: one per recomputation. `Count` = number of recomputations.

### 5.6 Gate 5 — Claim Grounding

For every `ClaimAssertion`:

1. For each `JsonPointers[i]`, resolve against `envelope.Root`.
2. Compare resolved value to `ExpectedValues[i]` (exact string match after `ToString()`).
3. If any pointer fails to resolve or any value mismatches → fail-closed.

**Steps emitted**: one per (claim, pointer) pair. `Count` = number of pointer resolutions.

### 5.7 The JSON Pointer Resolver

Standard RFC 6901. Handles `~0`, `~1`, array indices, and nested objects. Returns `JsonNode?`. Does not throw on missing paths — returns null and the caller handles the failure.

```csharp
public static class JsonPointerResolver
{
    public static JsonNode? Resolve(JsonNode root, string pointer)
    {
        if (string.IsNullOrEmpty(pointer)) return root;
        if (!pointer.StartsWith('/')) throw new ArgumentException($"Invalid pointer: {pointer}");

        var segments = pointer[1..].Split('/')
            .Select(s => s.Replace("~1", "/").Replace("~0", "~"))
            .ToArray();

        JsonNode? current = root;
        foreach (var seg in segments)
        {
            if (current is null) return null;
            if (current is JsonArray arr && int.TryParse(seg, out var idx))
            {
                if (idx < 0 || idx >= arr.Count) return null;
                current = arr[idx];
            }
            else if (current is JsonObject obj)
            {
                current = obj.TryGetPropertyValue(seg, out var val) ? val : null;
            }
            else return null;
        }
        return current;
    }
}
```

---

## 6. Rule Engine

Deterministic C#. Pure functions. Versioned. Every rule carries a `LegalRef`.

| ID | Condition | Outcome | Severity | Legal Ref |
|---|---|---|---|---|
| `R-ICO-01` | IČO checksum invalid | BLOCK | 100 | — |
| `R-IBAN-01` | IBAN mod-97 invalid | BLOCK | 100 | — |
| `R-MATH-01` | `net + vat ≠ gross` (±0.01) | BLOCK | 100 | — |
| `R-SANCTIONS-01` | Sanctions hit on entity or beneficial owner | BLOCK | 100 | PSR Art. 59 |
| `R-VOP-01` | VoP `NO_MATCH` | ESCALATE | 90 | PSR Art. 59 |
| `R-BEC-01` | Supplier IBAN differs from last paid IBAN | ESCALATE | 90 | — |
| `R-VELOCITY-01` | Transaction count in 24h ≥ 3× baseline | ESCALATE | 80 | — |
| `R-AGE-01` | Entity age < 30 days AND amount > 50,000 CZK | ESCALATE | 75 | — |
| `R-VOP-02` | VoP `CLOSE_MATCH` AND IBAN ∈ published accounts | AUTO_CLEAR | — | — |
| `R-VERIFY-01` | Any verifier engine fails | ESCALATE (fail-closed) | 95 | AI Act Art. 14 |

**Aggregation**: any BLOCK → BLOCK; else any ESCALATE → ESCALATE; else any REVIEW → REVIEW; else AUTO_CLEAR. Risk score = `min(100, Σ severity)`. If `verification.Valid == false`, force ESCALATE and set `overridden_by_verifier = true`.

---

## 7. Bedrock Agent

### 7.1 Tool Configuration

```
Model: anthropic.claude-3-5-sonnet-20241022-v2:0
Region: eu-central-1
Max tokens: 600
Temperature: 0.0
Tools:
  - get_ares_basic_profile(ico: string) -> AresBasicProfile
  - get_ares_statutory_history(ico: string) -> AresStatutoryHistory
  - get_transaction_history(account_id: string, days: int) -> Transaction[]
  - extract_document(file_ref: string, schema: string) -> ExtractionResult
```

### 7.2 Output Schema

The agent's final message must conform to:

```json
{
  "evidence_summary": "string (max 240 chars)",
  "claims": [
    {
      "claimId": "string",
      "claimType": "DIRECTOR_TENURE_HOURS | INVOICE_TOTAL_CZK | VELOCITY_RATIO | ...",
      "narrativeTemplate": "string",
      "jsonPointers": ["/ares_vr/activeDirectors/0/datumZapisu"],
      "expectedValues": ["2026-10-17"],
      "documentProvenance": null
    }
  ],
  "recommendedOutcome": "AUTO_CLEAR | ESCALATE | BLOCK",
  "recommendedRiskScore": 0,
  "rationale": "string (max 240 chars)"
}
```

**Enforced via** Bedrock's `outputConfig.textFormat = json_schema` with `additionalProperties: false`. **Plus** Gate 1's C# boundary check. This is defense in depth — the API constrains the token sampler, the C# gate constrains the deserializer.

### 7.3 The Two-Hop Loop

The agent's Turn 1 is always `get_ares_basic_profile`. If Hop 1 reveals a contradiction (signatory name mismatch, cross-border IBAN, NACE mismatch between invoice description and registered activity), Turn 2 is `get_ares_statutory_history`. The Gate 2 verifier enforces that the second hop was justified.

### 7.4 Cassette Fallback

`CassetteInterceptor` wraps the Bedrock `Converse` call. If latency exceeds **3,500ms** (`CancellationTokenSource` with timeout), the interceptor returns a pre-recorded cassette keyed by request hash. The cassette is labeled `"LIVE_BEDROCK_CACHED"` in the response metadata, so the demo can be honest about which mode it is in.

---

## 8. API Surface

Base path `/api/v1`. Errors use `application/problem+json`. Auth is a hard-coded demo JWT.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness (`{ status, mode, deps }`) |
| `GET` | `/cases?status=` | Queue |
| `GET` | `/cases/{id}` | Full detail (`CaseDetail`) |
| `POST` | `/cases/{id}/triage` | Run agent + verifier + rules (idempotent) |
| `POST` | `/cases/{id}/approve` | Verify signature, close case |
| `POST` | `/cases/{id}/reject` | Reason required |
| `GET` | `/cases/{id}/receipt` | Proof receipt JSON |
| `GET` | `/cases/{id}/audit` | Hash chain + `valid: true\|false` |
| `GET` | `/exposure` | Aggregate exposure (verified) |
| `POST` | `/devices/register` | `{ publicKeyB64, deviceId }` |
| `POST` | `/verifier/recheck` | Re-run verifier with modified evidence (OCR drop toggle) |
| `POST` | `/demo/reset` | Reset seed |
| `POST` | `/cases/batch` | Run 100-alert seeder |

SignalR hub at `/hubs/approvals`. Server → client: `ApprovalRequested`, `InvoiceUpdated`, `PipelineProgress`. Client → server: `JoinCompany`, `Ack`.

---

## 9. Frontend — Single-Screen Cockpit

**One route. One viewport. One narrative.**

Layout at 1920×1080:

```
┌─────────────────────────────────────────────────────────────────────┐
│  VeriTriage    [82 / 14 / 4]    [Run 100-Alert Batch]    [Demo ▾]   │
├─────────────────────────────────┬───────────────────────────────────┤
│                                 │                                   │
│  AlertQueueTable                │  CaseDetailPane                   │
│  (4 rows visible, scrollable)   │  ┌─────────────────────────────┐  │
│                                 │  │ Agent Evidence              │  │
│  ┌────────────────────────────┐ │  │ • ARES: 12 days old         │  │
│  │ INV-004  Kovoslužby        │ │  │ • VoP: NO_MATCH             │  │
│  │ €48,000  ESCALATE    ⚠     │ │  │ • Director: 48h ago         │  │
│  ├────────────────────────────┤ │  │ Recommendation: AUTO_CLEAR  │  │
│  │ INV-003  Stavby Praha      │ │  │ ⛔ Overridden               │  │
│  │ €181,500 BLOCK       ⛔    │ │  ├─────────────────────────────┤  │
│  ├────────────────────────────┤ │  │ Verifier Gates              │  │
│  │ INV-002  Alza.cz           │ │  │ ✓ Schema       12/12        │  │
│  │ €54,450  AUTO_CLEAR  ✓     │ │  │ ✓ Second-hop    1/1         │  │
│  ├────────────────────────────┤ │  │ ✓ OCR           2/2         │  │
│  │ INV-001  Severočeské       │ │  │ ✓ Arithmetic    6/6         │  │
│  │ €101,640 AUTO_CLEAR  ✓     │ │  │ ✓ Grounding     3/3         │  │
│  └────────────────────────────┘ │  ├─────────────────────────────┤  │
│                                 │  │ [QR Sign Modal]             │  │
│                                 │  │ [Audit Chain]               │  │
│                                 │  └─────────────────────────────┘  │
├─────────────────────────────────┴───────────────────────────────────┤
│  Not a payment institution. Payment files and proof receipts only.  │
└─────────────────────────────────────────────────────────────────────┘
```

### Components (11 total, all listed in repo structure)

- **`BatchTriageBar`** — the 82/14/4 counters, the "Run 100-Alert Batch" button, the elapsed time
- **`AlertQueueTable`** — 4 rows, decision badges, verified shield icons
- **`CaseDetailPane`** — split into evidence (left) and verification (right)
- **`AgentEvidencePanel`** — what the AI found, with the agent's recommendation and the override badge
- **`VerifierGatesPanel`** — 5 gates, each with pass/fail, count, and proof steps expandable
- **`ProofReceiptPanel`** — JSON receipt viewer, download button
- **`OverrideBanner`** — red banner when `overridden_by_verifier: true`, showing the legal reference
- **`PdfBoundingBoxOverlay`** — static PNG + absolute-positioned CSS divs from `textract_invoice.json`
- **`QrSigningModal`** — displays the QR for the mobile signer, shows the verified badge when signed
- **`AuditChainView`** — events with hash chips, `valid: true` badge
- **`DemoControls`** — floating panel (bottom-right, only when `NEXT_PUBLIC_DEMO=1`): reset seed, run batch, open hero case, toggle OCR drop, replay BEC, kill network

### Design Tokens

```css
--bg:#0B1220; --surface:#111A2E; --surface-2:#16233D; --border:#1F2A44;
--text:#E6EDF7; --muted:#8A9BB8; --faint:#5A6B87;
--accent:#2DD4BF; --accent-2:#60A5FA; --warn:#F59E0B; --danger:#EF4444; --ok:#22C55E;
--font: Inter, system-ui; --mono: "JetBrains Mono", monospace;
```

**Projector rule**: minimum 14px body, 16px table, contrast ≥ 4.5:1. Test at 1920×1080 from 5 meters.

### Data Layer

- `lib/api.ts` — typed fetchers, 3s timeout with `AbortController`
- `lib/mock.ts` — same DTOs from `fixtures/`, selected by `NEXT_PUBLIC_USE_MOCK=1`
- `lib/signalr.ts` — `@microsoft/signalr` with 2s polling fallback on disconnect

**`NEXT_PUBLIC_USE_MOCK=1` must render the full demo from fixtures.** This is a hard requirement — it is the offline safety net.

---

## 10. Mobile Signing

Two screens. QR scan → sign → QR response. Zero network dependency at the signing moment.

### 10.1 Screens

**Screen 1 — Scan**: `expo-camera` barcode scanner. Scans the QR displayed on the laptop. QR contains the canonical payload (see below).

**Screen 2 — Sign**: Displays the parsed payload: case ID, amount, decision, receipt hash (first 16 chars). Shows a "Sign with FaceID" button. On tap: `LocalAuthentication.authenticateAsync` → sign with SecureStore-held P-256 key → display response QR.

**Screen 3 — Result**: Green checkmark, "Signature verified server-side" (once the laptop reads the response QR and posts to `/approve`).

### 10.2 Canonical Payload

The QR encodes a JSON string with **keys sorted ordinal, no whitespace**:

```json
{"amount":"48000.00","caseId":"<uuid>","decision":"ESCALATE","nonce":"<uuid>","receiptHash":"sha256:...","ts":"2026-10-19T21:15:00Z"}
```

Rules:
- Build the string **manually** in that exact key order (do not rely on `JSON.stringify` of an object)
- `ts` = `new Date().toISOString().replace(/\.\d{3}Z$/, "Z")`
- `amount` = 2-decimal string in invoice currency

### 10.3 Signing

```typescript
// lib/signing.ts
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { utf8ToBytes } from "@noble/hashes/utils";

export async function signApproval(
  canonical: string, priv: Uint8Array
): Promise<{ sigB64: string; hashHex: string }> {
  const hash = sha256(utf8ToBytes(canonical));
  const sig = p256.sign(hash, priv).toCompactRawBytes(); // 64 bytes r||s
  return {
    sigB64: Buffer.from(sig).toString("base64"),
    hashHex: Buffer.from(hash).toString("hex"),
  };
}
```

### 10.4 Server Verification

```csharp
public static bool VerifySignature(string canonical, string sigB64, byte[] pubKey)
{
    using var ecdsa = ECDsa.Create(new ECParameters {
        Curve = ECCurve.NamedCurves.nistP256,
        Q = new ECPoint { X = pubKey[1..33], Y = pubKey[33..65] } // pub = 0x04||X||Y
    });
    var hash = SHA256.HashData(Encoding.UTF8.GetBytes(canonical));
    return ecdsa.VerifyHash(hash, Convert.FromBase64String(sigB64));
}
```

**Checks**: signature valid `AND` nonce not used `AND` `|now - ts| <= 120s` `AND` receipt hash matches current verifier output.

---

## 11. Audit Chain

Every event appended to `audit_events` with `prev_hash + canonical_json(event) → hash`. Events:

- `AlertIngested`
- `EvidenceGathered` (one per tool call)
- `VerificationPassed` / `VerificationFailed`
- `DecisionMade`
- `ApprovalRequested`
- `ApprovalSigned`
- `CaseClosed`

`GET /audit/{caseId}` recomputes the chain. Returns `{ events, valid: true|false }`. If any hash mismatches, `valid: false`. **The UI shows this badge. Do not fake it.**

---

## 12. Fixtures

Every fixture is committed. Every fixture has a header comment if JSON, or a companion `.md` if binary. Every fixture is used in the demo.

| File | Source | Purpose | Label |
|---|---|---|---|
| `ares_basic_27074358.json` | Real curl on 19 Oct | Baseline evidence for Alza.cz | Live cached |
| `ares_vr_27074358.json` | Real curl + `datumVymazu == null` filter | Statutory history, reveals director 48h ago | **Synthetic** (labeled) |
| `textract_invoice.json` | Real Textract output on demo invoice | Bounding boxes, confidence | Real, cached |
| `invoice_hero.png` | Rendered from demo PDF | Static image for overlay | Demo asset |
| `alert_hero.json` | Constructed | Hero case envelope | **Synthetic** |
| `alerts_batch_100.json` | Constructed | 82/14/4 seed population | **Synthetic** (labeled) |
| `transaction_history.json` | Constructed | Velocity + 90-day history | **Synthetic** |
| `tax_offices.json` | GFŘ published list | FÚ code → matrix lookup | Real |

**Honesty rule**: any fixture that is synthetic has a `"_synthetic": true` field in its JSON, and the UI labels it. The judge must never be surprised.

---

## 13. Tests (Minimum)

Every gate has a unit test. Every golden file has a snapshot test. The E2E test runs the full pipeline against the hero case.

| Test | Asserts |
|---|---|
| `Gate1_RejectsExtraField` | `JsonException` on unmapped property |
| `Gate1_RejectsMissingField` | `JsonException` on missing `[JsonRequired]` |
| `Gate2_RejectsUnjustifiedSecondHop` | Fail-closed when Hop 2 called without justification |
| `Gate3_RejectsLowOcrConfidence` | Fail-closed on `OcrConfidence < 99.0` |
| `Gate3_RejectsBoundingBoxOutOfRange` | Fail-closed on `Box.Left > 100` |
| `Gate4_RejectsArithmeticMismatch` | Fail-closed on `net + vat ≠ gross` |
| `Gate5_RejectsUngroundedClaim` | Fail-closed on pointer not resolving |
| `Gate5_RejectsValueMismatch` | Fail-closed on pointer resolving to different value |
| `HeroCase_PassesAllFiveGates` | `Valid == true`, all engine counts match golden |
| `Seeder_Produces82_14_4` | `Tier1 == 82, Tier2 == 14, Tier3 == 4`, `Elapsed < 100ms`, `LlmTokens == 0` |
| `Receipt_MatchesGoldenSnapshot` | JSON snapshot equality |
| `Signature_VerifiesForValidPayload` | Round-trip |
| `Signature_FailsForTamperedPayload` | Tamper test |
| `Audit_TamperedEventBreaksChain` | Chain validation returns `valid: false` |
| `E2E_HeroCase_EndToEnd` | Full pipeline: alert → evidence → verifier → decision → sign → audit |

CI runs `dotnet test` on every push. Green = commit. Red = the agent iterates.

---

## 14. Build Schedule (24h engineering + 6h rehearsal)

| Window | Dev A (Backend, AI, Infra) | Dev B (Frontend, Mobile, Pitch) | Checkpoint |
|---|---|---|---|
| **H+0–H+2** | Bootstrap agent runs. `curl` ARES VR. Generate P-256 key. | Confirm time limit. Agree on cut list (screenshot). Run `openssl ecparam`. | **Bootstrap complete** |
| **H+2–H+4** | Implement VerifierPipeline (5 gates) + JsonPointerResolver | Cockpit shell, BatchTriageBar, AlertQueueTable | `HeroCase_PassesAllFiveGates` green |
| **H+4–H+6** | FixtureSeeder (100 alerts) + Golden snapshots | CaseDetailPane, AgentEvidencePanel, VerifierGatesPanel | `Seeder_Produces82_14_4` green |
| **H+6–H+8** | AresClient (real HTTP + cache) + BedrockAgent (two-hop) + cassette | PdfBoundingBoxOverlay, DemoControls panel | **H+8: ARES VR pivot check** |
| **H+8–H+11** | ServerSigner (local P-256), AuditLedger, `/api/v1/audit` endpoint | QrSigningModal, AuditChainView, slide 1 draft | Signature round-trip; audit `valid: true` |
| **H+11–H+14** | API endpoints per OpenAPI spec (12 total) | Mobile app: scan → sign → response. Slide 2–3 draft | **H+14: CUT LIST DECISION** |
| **H+14–H+17** | SignalR hub + `/verifier/recheck` + OCR drop toggle endpoint | OverrideBanner wired to recheck. Slide 4. **Pitch deck by H+18.** | Override works end-to-end |
| **H+17–H+20** | Integration polish. Fix failing tests. | Polish transitions, projector contrast, dark mode | **H+20: FEATURE FREEZE** |
| **H+20–H+24** | Bug fixes only. No new features. | Bug fixes only. No new features. | All tests green. Demo runs 3× |
| **H+24–H+28** | **Sleep 4 hours. Non-negotiable.** | **Sleep 4 hours. Non-negotiable.** | Rest |
| **H+28–H+30** | 6–8 timed rehearsals. Opening 30s rehearsed 15×. OCR drop 10×. QR sign 10×. | Same. | **Stage ready** |

**H+14 cut list:** the active, protected list is in `AGENTS.md` under "H+14 Cut List (Protected)". It supersedes this historical list. The protected tasks are Gate 2, the Bedrock two-hop, the cassette, the 21 FTE metric, QR signing, the E2E test, and the remediation verification pass.

**No renegotiation at H+14.** Whichever threshold is hit, the cut executes.

---

## 15. Demo Runbook (90 seconds)

**Preloaded**: 100-alert batch already run; hero case triaged; phone paired; cassettes warm; backup video on second laptop.

| Time | Action | Narration |
|---|---|---|
| **0:00** | Cockpit loads. Tier matrix visible. | "Under PSR Articles 56 and 83, a PSP has 15 business days to refund or justify a refused payment. This is what that deadline looks like on a Monday morning." |
| **0:10** | Click "Run 100-Alert Batch." Counters climb to 82/14/4 over 1 second. `14.2ms` displayed. | "82% of these never touch an LLM. The verifier clears them in 14 milliseconds. Let me show you the 4% that escalate." |
| **0:25** | Click hero case. Bedrock two-hop runs live (Wi-Fi ON). Bounding boxes highlight on the invoice PNG. | "The agent reads the invoice, spots the contradiction — IT micro-entity billing €48k for steel, director appointed 48 hours ago, Lithuanian IBAN." |
| **0:45** | All 5 gates green. Click "Simulate Degraded Scan (OCR: 94.2%)." | "Now watch what happens when the scan degrades." Gate 3 flips red. Decision flips ESCALATE. | "The AI recommended auto-clear. The verifier caught it. `GATE 3 FAILED → FAIL-CLOSED`." |
| **1:05** | Phone buzzes. Open app. Show verified evidence, override reason, PSR Article 59 reference. | "The analyst sees what the agent found, what the verifier proved, and why it escalated." |
| **1:15** | FaceID. Sign. Green checkmark on laptop. | "ECDSA P-256, bound to the receipt hash. If the receipt changes, the signature fails." |
| **1:25** | Audit tab. `valid: true`. Click "Tamper." Chain red. | "Every step is hash-chained. This is what you show the Czech National Bank." |
| **1:30** | Close. | "AI speed for evidence. Deterministic proof for compliance. A human signs the decision." |

**Fallback**: if any live call exceeds 3.5s, the cassette interceptor takes over with a `"LIVE_BEDROCK_CACHED"` label. The presenter says: *"Degraded — cached, still auditable."* No dead air.

**If the demo fails entirely**: switch to the second laptop with the recorded video. Continue the pitch.

---

## 16. Q&A War Room

Answer in ≤3 sentences. One voice per domain (Azizbek = business + law; Shohjahon = technical). Never improvise law.

| Question | Answer |
|---|---|
| "PSD3 makes you liable for missed fraud?" | "The liability lives in the PSR, not PSD3. Articles 55/56 reverse the burden of proof; Article 83 requires monitoring. We address the evidentiary layer, not the payment authorization itself." |
| "Why not Step Functions?" | "Static DAGs can't resolve unindexed semantic links. Our agent reads a contract PDF, spots a signatory mismatch, and decides to query the Commercial Register — a bounded second hop from a closed tool set. Step Functions can't make that call." |
| "What if the LLM misreads the PDF?" | "The verifier enforces Textract provenance at 99% confidence. If OCR confidence drops or Textract and Bedrock disagree, it fails closed. Recomputing wrong numbers is still wrong — we verify the input, not just the arithmetic." |
| "Who verifies the verifier?" | "The verifier is deterministic C# with a public test suite. It doesn't guess; it recomputes. A FINREG auditor can read the proof steps and re-run the arithmetic on paper." |
| "Isn't this just INETCO / Socratix?" | "They recommend. We prove. The agentic triage pattern is becoming commoditized — the differentiator is the deterministic proof receipt bound to a human signature. No incumbent has that." |
| "Why won't the bank build this?" | "They might build the agent. They won't build the cross-system verifier plus proof receipt plus signed audit chain that sits between the agent and their case management system. That's our lane." |
| "Teams with live payment rails?" | "Moving a test payment is a 20-line SDK call. Under PSR, the unsolved problem is proving *why* you refused a payment within 15 business days when the burden of proof is reversed onto the PSP. We built the proof layer above the rail." |
| "82% auto-clear — where does that come from?" | "Seed population calibrated to production benchmarks: WorkFusion reports 60%, INETCO 95%. We ran 100 alerts through the real verifier live on stage in 14ms — 82 passed all 5 gates with zero LLM tokens." |
| "What's mocked?" | "ARES is live. Bedrock is live. Textract is pre-computed and labeled. VoP is fixture — it's PSP-only with QWAC mTLS. The card issuer is not used. Every mock is labeled on screen." |
| "What kills you?" | "Supplier refusal at scale for the CMR-Clear pivot, or the ARES VR endpoint breaking on stage. Both are pilot-testable in 30 days — that's what a €65k pre-seed buys." |

**Red-flag phrases**: if the presenter is about to say them, stop.
- ~~"540,000 CZK"~~ (repealed, wrong project)
- ~~"PSD3 makes you liable"~~ (it's the PSR)
- ~~"100% of liability"~~ (overstated)
- ~~"42ms"~~ (unsourced)
- ~~"Like Stripe for..."~~ (signals you haven't found the wedge)
- ~~"Banks can't do batch VoP"~~ (they can)

---

## 17. Risk Register

| Risk | Prob | Impact | Mitigation |
|---|---|---|---|
| ARES VR endpoint returns unexpected schema | Med | High | **H+8 checkpoint.** Pivot to CMR-Clear if it fails. |
| Bedrock latency > 3.5s on stage | Med | Med | Cassette interceptor. Label `"LIVE_BEDROCK_CACHED"`. |
| OCR drop toggle doesn't render cleanly | Med | High | Rehearse 10×. If it stutters once in rehearsal, use pre-baked failed-verification case. |
| Mobile signing depends on Wi-Fi | Low | High | Air-gapped QR flow. No network needed at signing moment. |
| Canonical serialization drift | Med | High | Backend computes canonical bytes once, sends hash. FE does not re-serialize. |
| Venue Wi-Fi dies | High | Med | Offline mode (`NEXT_PUBLIC_USE_MOCK=1`). Hotspot fallback. Backup video. |
| Scope creep after H+20 | High | High | Feature freeze at H+20. Rule written in `AGENTS.md`. |
| Agent modifies frozen contract | Med | High | Reject commit. Revert. Write `PROPOSAL.md`. |
| Team fatigue | High | High | 4h sleep on night two. Non-negotiable. |
| PSR narrative confuses judge | Med | Med | Rehearse opening 30s 15×. Memorize the €48k write-off sentence. |

---

## 18. Judging Alignment

| Judge | What they reward | Where it lives |
|---|---|---|
| **Deloitte** | Regulatory accuracy, auditability, defensible decisions | PSR Art. 83/55/56/59 references; proof receipt; hash-chained audit; AI Act Art. 14 human oversight |
| **AWS** | Bedrock used for real reasoning | Two-hop `toolConfig` with 4 tools, structured output, cassette fallback |
| **Mastercard** | Credible fraud workflow | Tiered autonomy, realistic alert queue, human-in-the-loop |
| **FINREG** | Human oversight, knows the boundaries | "Agent never authorises; human signs" line, fail-closed verifier, no PISP claim |
| **FinTechers / VC** | Wedge → expansion | Fraud triage → onboarding → compliance; CZ beachhead → EU |

**Track**: Track 01 (Agentic payments & money movement) primary. Track 06 (Finance ops & back-office AI) fallback. Read both challenge lists at check-in and register under the one the demo answers literally.

---

## 19. The Final Rules (Non-Negotiable)

1. **Do not modify `contracts/` or `fixtures/` without human approval.** Write `PROPOSAL.md`, wait.
2. **Do not add NuGet or npm packages without approval.** The bootstrap chose the package set deliberately.
3. **Every task ends with `dotnet test` or `npm test`.** Green = commit. Red = iterate.
4. **No new features after H+20.** Only bug fixes.
5. **No renegotiation at H+14.** Execute the cut list.
6. **Sleep 4 hours on night two.** Non-negotiable.
7. **Rehearse the opening 30 seconds 15 times.** Rehearse the OCR drop 10 times. Rehearse the QR sign 10 times. The two fragile moments must be boring.
8. **The pitch deck is frozen by H+18.** No slide editing after that.
9. **One voice per domain in Q&A.** Azizbek = business + law. Shohjahon = technical. No ping-pong.
10. **Answer in ≤3 sentences.** Silence is leverage.

---

**This blueprint is frozen. Paste the bootstrap prompt. Start the clock.**

The bottleneck is no longer design. It is execution discipline. The plan is here. The architecture is proven. The team has the skills. What remains is whether you can build what you have planned without adding scope.

Build it.