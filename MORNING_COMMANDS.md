# Morning Commands — H+0

Read [MORNING_BRIEF.md](MORNING_BRIEF.md) first. Run these in order.

**Hard rules for the morning**

- Only **Person A** launches the orchestrator. A second orchestrator in the same checkout creates two committers.
- **One laptop is the safe default.** A second laptop needs a git remote first (`git remote -v` is currently empty).
- Do not run `npm install` until HUMAN-002 approves the package set.
- Do not invent fixtures. Synthetic fixtures are marked TODO; the real ARES and Textract commands are provided.
- Person A commits. Person B does not commit while Person A holds the orchestrator.

Set the repo root once:

```bash
cd /Users/azizbek/Desktop/Hackaton
git status --porcelain
```

Expect no output. If there is output, stop and inspect it.

---

## Person A — Backend, Contracts, ARES, Fixtures

### A0. Approve the package set (HUMAN-002)

```bash
# Decide and write DECISION.md before installing anything.
# Minimum backend set: xUnit, Microsoft.NET.Test.Sdk, coverlet.collector, AWS SDK for Bedrock Runtime.
# Minimum web set: Next.js 15, React 19, TypeScript, @microsoft/signalr, @noble/curves, @noble/hashes.
# Minimum mobile set: Expo SDK 53, expo-camera, expo-local-authentication, expo-secure-store, expo-router.
```

Do not add a package that is not in the approved decision.

### A1. Verify the SDK

```bash
# Should print 9.x
dotnet --version
```

If it prints 8.x, install the .NET 9 SDK or use the `./.dotnet/dotnet` path from the old bootstrap. Do not downgrade the target framework.

### A2. Materialize the contracts (B-000)

This is editor work, not a shell one-liner. Open [BOOTSTRAP.md](BOOTSTRAP.md) Step 0 and transcribe the ten C# records from `blueprint.md` section 3, plus the TypeScript mirror and OpenAPI spec. Apply the `regulatory_clock` delta from [contracts/README.md](contracts/README.md).

Ask the agent exactly this:

```text
Read BOOTSTRAP.md Step 0 and materialize the contracts from blueprint.md.
Do not invent fields. Apply the regulatory_clock delta. Stop after B-000.
```

Then:

```bash
# Inspect before committing
git status --short
git diff --stat

git add contracts
git commit -m "contracts: materialize frozen records (B-000)"
```

### A3. Create the .NET solution (B-001)

```bash
dotnet new sln -n PayShield --output src
dotnet new classlib -n PayShield.Domain -o src/PayShield.Domain -f net9.0
dotnet new classlib -n PayShield.Verifier -o src/PayShield.Verifier -f net9.0
dotnet new classlib -n PayShield.Infrastructure -o src/PayShield.Infrastructure -f net9.0
dotnet new web -n PayShield.Api -o src/PayShield.Api -f net9.0
dotnet sln src/PayShield.sln add src/PayShield.Domain/PayShield.Domain.csproj src/PayShield.Verifier/PayShield.Verifier.csproj src/PayShield.Infrastructure/PayShield.Infrastructure.csproj src/PayShield.Api/PayShield.Api.csproj
```

Edit `src/PayShield.Domain/PayShield.Domain.csproj` and add:

```xml
<ItemGroup>
  <Compile Include="../../contracts/domain/*.cs" Link="Contracts/%(Filename)%(Extension)" />
</ItemGroup>
```

Add the references:

```bash
dotnet add src/PayShield.Verifier/PayShield.Verifier.csproj reference src/PayShield.Domain/PayShield.Domain.csproj
dotnet add src/PayShield.Infrastructure/PayShield.Infrastructure.csproj reference src/PayShield.Domain/PayShield.Domain.csproj
dotnet add src/PayShield.Api/PayShield.Api.csproj reference src/PayShield.Domain/PayShield.Domain.csproj
dotnet add src/PayShield.Api/PayShield.Api.csproj reference src/PayShield.Verifier/PayShield.Verifier.csproj
dotnet add src/PayShield.Api/PayShield.Api.csproj reference src/PayShield.Infrastructure/PayShield.Infrastructure.csproj
```

```bash
# Should build with zero errors
dotnet build src/PayShield.sln
```

Add only the empty files named in the blueprint. Do not implement gates, rules, endpoints, clients, or persistence.

### A4. Create the test harness and the VT-001 red test (B-002)

```bash
dotnet new xunit -n PayShield.Tests -o tests/PayShield.Tests -f net9.0
rm -f tests/PayShield.Tests/UnitTest1.cs
dotnet add tests/PayShield.Tests/PayShield.Tests.csproj reference src/PayShield.Domain/PayShield.Domain.csproj
dotnet add tests/PayShield.Tests/PayShield.Tests.csproj reference src/PayShield.Verifier/PayShield.Verifier.csproj
dotnet sln src/PayShield.sln add tests/PayShield.Tests/PayShield.Tests.csproj
```

Create the test:

```bash
cat > tests/PayShield.Tests/JsonPointerResolverTests.cs <<'EOF'
using System.Text.Json.Nodes;
using VeriTriage.Verifier;
using Xunit;

namespace PayShield.Tests;

public sealed class JsonPointerResolverTests
{
    [Fact]
    public void Resolve_HandlesEscapedSegmentsAndMissingPaths()
    {
        var root = JsonNode.Parse("""{"a/b":{"m~n":[10,20]}}""")!;

        Assert.Equal("20", JsonPointerResolver.Resolve(root, "/a~1b/m~0n/1")?.ToString());
        Assert.Null(JsonPointerResolver.Resolve(root, "/a~1b/missing"));
    }
}
EOF
```

Create the red scaffold:

```bash
cat > src/PayShield.Verifier/JsonPointerResolver.cs <<'EOF'
using System.Text.Json.Nodes;

namespace VeriTriage.Verifier;

public static class JsonPointerResolver
{
    public static JsonNode? Resolve(JsonNode root, string pointer)
        => throw new NotImplementedException("VT-001");
}
EOF
```

```bash
# Expect exactly one failure: VT-001
dotnet test src/PayShield.sln --configuration Release
```

### A5. Acquire the real ARES fixtures

```bash
mkdir -p fixtures

# Real ARES basic profile for Alza.cz
curl -fsS "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/27074358" \
  -o fixtures/ares_basic_27074358.json

# Real ARES VR raw response
curl -fsS "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-vr/27074358" \
  -o fixtures/ares_vr_raw_27074358.json

# Confirm jq exists
jq --version
```

Inspect the raw VR shape before filtering. Then filter active records:

```bash
jq '[.. | objects | select(has("datumVymazu") and .datumVymazu == null)]' \
  fixtures/ares_vr_raw_27074358.json \
  > fixtures/ares_vr_27074358.json
```

If the API wraps records under a different key, adjust the path. Do not commit the raw response as the filtered fixture. Add the synthetic label manually if the filtered file is constructed rather than a direct API shape.

### A6. Generate the server P-256 key

```bash
openssl ecparam -name prime256v1 -genkey -noout -out server_p256.pem

cd src/PayShield.Api
dotnet user-secrets init
dotnet user-secrets set "Crypto:ServerP256Pem" "$(cat ../../server_p256.pem)"
cd ../..

rm server_p256.pem
```

The key must not be committed. The `user-secrets` store is local.

### A7. Textract invoice extraction

This requires AWS credentials and the invoice PDF in S3. Fill [MORNING_SECRETS.txt](MORNING_SECRETS.txt) locally, source it, run, then delete the file.

```bash
set -a
source MORNING_SECRETS.txt
set +a

aws --version

aws textract analyze-document \
  --document "{\"S3Object\":{\"Bucket\":\"$TEXTRACT_S3_BUCKET\",\"Name\":\"$TEXTRACT_S3_KEY\"}}" \
  --feature-types TABLES FORMS \
  --region "$AWS_REGION" \
  > fixtures/textract_invoice.json
```

If the CLI is unavailable, use the Textract console: Analyze Document → Tables/Forms → export the JSON response. Save it as `fixtures/textract_invoice.json`.

### A8. Final backend baseline

```bash
# Still exactly one failure: VT-001
dotnet test src/PayShield.sln --configuration Release

# Review before the combined bootstrap commit
git status --short
git diff --stat
```

Do not commit yet if Person B is still writing `apps/`.

### A8.5. Combined bootstrap commit

After Person B reports the web build green and the fixture status:

```bash
git add -A
git commit -m "bootstrap: .NET solution, web/mobile shells, VT-001 red test"
git status --porcelain
```

`git status` must be clean. If it is not, stop and inspect the diff.

### A9. Launch the orchestrator (Person A only)

After Person B reports the web build is green and the combined bootstrap commit is made:

```text
Read .agents/orchestrator.md and begin Phase 1.
```

Do not launch a second orchestrator from Person B's laptop.

---

## Person B — Web, Mobile, PNG, Fixtures

### B0. Approve the package set (HUMAN-002)

Use the same decision as Person A. Do not run `npm install` before it exists.

### B1. Verify Node

```bash
# Should print v20 or newer
node --version
npm --version
```

### B2. Create the web shell (B-003)

Create `apps/web` per [BOOTSTRAP.md](BOOTSTRAP.md) Step 3:

- `package.json` with `dev`, `build`, `start`, `test`.
- `tsconfig.json`, `next.config.ts`, `next-env.d.ts`.
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
- Do not create cockpit components yet.

Do not use `create-next-app` unless the human approves the exact version it pulls.

```bash
cd apps/web
npm install
npm run build
cd ../..
```

### B3. Create the mobile shell (B-004)

Create `apps/mobile` per `BOOTSTRAP.md` Step 4:

- `package.json`, `app.json`.
- `app/index.tsx`, `app/sign.tsx`, `app/result.tsx` placeholders.
- Do not add signing logic yet.

```bash
cd apps/mobile
npm install
cd ../..
```

### B4. Render the invoice PNG

Place the source PDF at `invoice.pdf` first.

```bash
# Check the source exists
test -f invoice.pdf || echo "TODO: place the demo invoice PDF at invoice.pdf"

# Prefer poppler; fall back to macOS sips
if command -v pdftoppm >/dev/null 2>&1; then
  pdftoppm -png -r 150 -singlefile invoice.pdf fixtures/invoice_hero
else
  sips -s format png invoice.pdf --out fixtures/invoice_hero.png
fi
```

The PNG must match the same invoice as `fixtures/textract_invoice.json`; otherwise Gate 3's boxes point at the wrong pixels.

### B5. Construct the synthetic hero fixture (HUMAN-001)

Do not paste an agent-invented supplier, IČO, IBAN, or amount. Use the hero fields in `blueprint.md` section 12 and the contract in `contracts/README.md`.

```bash
# TODO (HUMAN-001): create fixtures/alert_hero.json.
# Required top-level fields: caseId, alert, supplier, evidence, claims.
# Mark it with "_synthetic": true.
# Use the real ARES basic + filtered VR files, not invented registry data.
```

### B6. Construct the 100-alert seed (HUMAN-001)

Do not generate 100 fake alerts from an unapproved script.

```bash
# TODO (HUMAN-001): create fixtures/alerts_batch_100.json.
# Required distribution: 82 AUTO_CLEAR / 14 STEP_UP / 4 ESCALATE.
# Mark it with "_synthetic": true.
# The seeder test VT-010 must prove 82/14/4 from this file.
```

### B7. Validate every JSON fixture

```bash
ls fixtures/*.json

for f in fixtures/*.json; do
  jq empty "$f" || { echo "BAD JSON: $f"; exit 1; }
done
```

JSON syntax is not schema proof. Schema validation is the test suite's job.

### B8. Report to Person A

Do not commit. Do not launch a second orchestrator. Report:

- `npm run build` exit code
- `npm test` exit code
- fixture files created vs still TODO
- any package approval change

Person A commits the combined bootstrap and launches the orchestrator.

---

## Secrets

[MORNING_SECRETS.txt](MORNING_SECRETS.txt) is a placeholder template. Fill it locally only for the Textract step. Delete it after use. Never commit real AWS keys.
