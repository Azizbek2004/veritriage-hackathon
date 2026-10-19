# BLOCKED — Fixer Pass 2026-10-19

The FINREG CSV header, 4-eyes gate, mock signing, and frontend are implemented and verified. These are the remaining blockers.

## 1. GitHub Push

`gh` is installed but its token is invalid. `secrets/github_token.txt` is absent. The deploy key is not added. Both pushes fail:

- SSH: `Permission denied (publickey)`.
- HTTPS: `could not read Username`.

**Human action:**

```bash
gh auth login -h github.com
git push -u origin main
```

Or add `secrets/github_deploy_key.pub` as a write deploy key and run:

```bash
git remote set-url origin git@github.com:Azizbek2004/veritriage-hackathon.git
git push -u origin main
```

## 2. Live Bedrock

The `TeamAdmin` token is invalid; ReadOnly cannot `InvokeModel`. The demo uses the `LIVE_BEDROCK_CACHED` cassette. Refresh the SSO session to test live. See `WAITING_FOR_CREDENTIALS.md`.

## 3. Human Rehearsal

The backend curl rehearsal is 0.0279s. The 5-minute human browser presentation has not been run. See `REHEARSAL.md`.

## 4. Missing Demo Pieces

- Real mobile ECDSA signing and server verification.
- Persistent audit storage (the visible chain is a deterministic mock).
- Live Bedrock two-hop agent.
- E2E test.

## What Is Not Blocked

- Exact 11-column CSV header and 45-row deliverable.
- Visible 5-event audit chain with `Chain Verified: 5/5 events`.
- 4-eyes 400 with exact body.
- Mock sign/approve with audit hash.
- Next.js cockpit build.
- `dotnet test` 18/18.

## Legal Grounding Sprint — APPROVED & COMPLETED

The prior file-mapping blocker is cleared. The 12-section corpus, deterministic legal lookup, quoted CSV reasons, golden test, and pitch artifacts are implemented. See `LEGAL_GROUNDING_REPORT.md`.

## Deterministic Logic & Legal Document Sprint — 2026-10-19

**Status:** BLOCKED before Part 1. No rule registry, determinism endpoint, explanation snapshot, deep-analysis document, PDF, or bundle was created.

### Missing files and capabilities

- `apps/web/components/domain/CaseDetailDrawer.tsx` — the drawer is implemented inline in `apps/web/app/page.tsx`; there is no separate component.
- `src/PayShield.Api/ICaseRepository.cs` — no repository abstraction exists; endpoints read from `DeliverableState`.
- `src/PayShield.Api/IDeepAnalysisService.cs` — missing; no document generator exists.
- No PDF library is present in `src/` or `apps/web/package.json` (no QuestPDF, PdfSharp, iText, or HTML-to-PDF). The sprint requires PDF + Markdown and a ZIP bundle.
- No `AnalysisDocument` entity, document persistence, `/documents/*` endpoints, or document audit events exist.

### What was completed before this block

- Legal grounding corpus (12/12), deterministic `lookup_statutory_provision`, quoted CSV reasons, golden test, pitch artifacts.
- Committed and pushed: `f2aa94d`.
- `dotnet test`: 25/25; `npm run build`: green; CSV header and 4-eyes intact.

### Why stopped

The sprint's hard rule: *“If any file is missing, write BLOCKED.md and stop.”* The missing `CaseDetailDrawer.tsx` is a read-first file; the repository and PDF package are also absent. Implementing a PDF claim without a PDF engine would be fabricated.

### Needed approval

1. Map `CaseDetailDrawer` to the inline drawer in `apps/web/app/page.tsx`, or create the component.
2. Approve a PDF package (QuestPDF/PdfSharp) or explicitly allow Markdown-only output; the sprint's acceptance requires PDF.
3. Allow the `ICaseRepository`/`IDeepAnalysisService` abstractions and `AnalysisDocument` entity to be created.

No statutory text or legal conclusion was fabricated in this block.
