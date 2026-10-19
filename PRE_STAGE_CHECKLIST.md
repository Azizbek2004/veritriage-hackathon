# Pre-Stage Checklist (Human Only)

Run this in order. Do not let the AI agent retry GitHub or AWS; those are human-authentication tasks.

## 1. GitHub (Critical)

```bash
gh auth login -h github.com
gh auth setup-git
git push -u origin main
```

Verify the repo is public (or add the judges as collaborators):

```bash
curl -s https://api.github.com/repos/Azizbek2004/veritriage-hackathon | grep '"private"'
```

A public repo returns `"private": false`. If it returns `true`, make it public in GitHub Settings or add the judges.

**Local commit:** `git log -1 --oneline` should show the final fixer commit. Do not force-push.

## 2. Bedrock (If Possible)

```bash
aws sso login --profile hackathon
aws bedrock-runtime converse \
  --region eu-central-1 \
  --model-id eu.anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --messages '[{"role":"user","content":[{"text":"ping"}]}]' \
  --inference-config '{"maxTokens":10}'
```

- **If it succeeds:** `/api/v1/bedrock/status` must return `mode: "LIVE_BEDROCK"`; the UI badge is already driven by that probe. Pre-warm the ALERT-045 investigation.
- **If it fails:** keep the cassette and the `LIVE_BEDROCK_CACHED` label. Do not fake a live call.

The build is probe-driven; the drawer displays the actual `LIVE_BEDROCK` or `LIVE_BEDROCK_CACHED` mode from the response. Use the script path that matches the badge.

## 3. Browser Rehearsal

Terminal 1:

```bash
dotnet run --project src/PayShield.Api --configuration Release
```

Terminal 2:

```bash
cd apps/web && npm run dev -- -p 3100
```

Open `http://localhost:3100`.

Walk through [DEMO_SCRIPT.md](DEMO_SCRIPT.md) with a timer. Aim for **4:30**. Do it **3 times**.

Check each time:

- CSV downloads with the exact 11-column header.
- FP row priority 18 opens.
- PEP row priority 96 opens.
- Same-person approver shows the red 4-eyes banner.
- Independent approver enables **Sign & Approve**.
- Green **APPROVED** pill + audit-hash toast.
- **Audit Chain** tab shows 5 events.
- **Verify Chain** shows `Chain Verified: 5/5 events`.
- **Investigate** shows `LIVE_BEDROCK` and the legal citations (or `SNAPSHOT` if the network falls back).

## 4. Backup Video

Record a 5-minute screen capture of the browser rehearsal. Save it as:

```
backup_video.mp4
```

If the demo fails on stage, play the video. Do not improvise a live claim.

## 5. Final Pre-Stage Check

```bash
dotnet test src/PayShield.sln --configuration Release
cd apps/web && npm run build
```

Expected: `26 passed, 0 failed`; web build green.

Have these open on the desktop:

- [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- [REHEARSAL.md](REHEARSAL.md)
- [FINAL_REPORT.md](FINAL_REPORT.md)
- [rehearsal_output.csv](rehearsal_output.csv)

## Do Not

- Do not attempt to fix GitHub or AWS from the cockpit.
- Do not say “live Bedrock” unless the badge is LIVE and the panel says LIVE_BEDROCK.
- Do not say “real mobile signature.”
- Do not add a new feature after this checklist.
