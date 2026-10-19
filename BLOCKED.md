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
