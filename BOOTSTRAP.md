# Product Bootstrap — Run Once Before the Orchestrator

This repository is the agent environment. Product code is intentionally absent. This file is the only place where the AI agent creates product shells. It creates structure, not features.

Run this after the human has installed .NET 9, Node 20, and approved the package set.

## Preconditions

- .NET 9 SDK is on `PATH` (`dotnet --version` starts with `9.`).
- Node 20 and npm are on `PATH`.
- `contracts/` is present and frozen. Do not edit it.
- The human has approved the NuGet and npm packages from `blueprint.md`.
- `git status` is clean.

If any is false, stop and write `BLOCKED.md`. Do not install packages or SDKs yourself.

## Step 1 — Create the .NET Solution

Create the four projects from `blueprint.md` section 2 under `src/`:

```bash
dotnet new sln -n PayShield --output src
dotnet new classlib -n PayShield.Domain -o src/PayShield.Domain -f net9.0
dotnet new classlib -n PayShield.Verifier -o src/PayShield.Verifier -f net9.0
dotnet new classlib -n PayShield.Infrastructure -o src/PayShield.Infrastructure -f net9.0
dotnet new web -n PayShield.Api -o src/PayShield.Api -f net9.0
dotnet sln src/PayShield.sln add src/PayShield.Domain/PayShield.Domain.csproj src/PayShield.Verifier/PayShield.Verifier.csproj src/PayShield.Infrastructure/PayShield.Infrastructure.csproj src/PayShield.Api/PayShield.Api.csproj
```

Link the frozen contracts into `PayShield.Domain`:

```xml
<ItemGroup>
  <Compile Include="../../contracts/domain/*.cs" Link="Contracts/%(Filename)%(Extension)" />
</ItemGroup>
```

Add the project references from the blueprint:

- `PayShield.Verifier` → `PayShield.Domain`
- `PayShield.Infrastructure` → `PayShield.Domain`
- `PayShield.Api` → `PayShield.Domain`, `PayShield.Verifier`, `PayShield.Infrastructure`

Add empty files only where the blueprint names them. Do not implement gates, rules, endpoints, clients, or persistence. A file that throws `NotImplementedException("VT-###")` is a valid shell. A file with business logic is not.

## Step 2 — Create the Test Harness and the First Red Test

Create `tests/PayShield.Tests/PayShield.Tests.csproj` with the approved xUnit test packages. Add project references to Domain and Verifier. Create exactly one test:

```csharp
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
```

Create the red scaffold in `src/PayShield.Verifier/JsonPointerResolver.cs`:

```csharp
using System.Text.Json.Nodes;

namespace VeriTriage.Verifier;

public static class JsonPointerResolver
{
    public static JsonNode? Resolve(JsonNode root, string pointer)
        => throw new NotImplementedException("VT-001");
}
```

The expected baseline is **exactly one failing test**. This is VT-001, not a broken environment.

Do not add `HeroCase_PassesAllFiveGates` yet. It is added red at VT-007, after the five gate tests exist.

## Step 3 — Create the Web Shell

Under `apps/web/`, create the Next.js 15 / React 19 / TypeScript shell:

- `package.json` with `dev`, `build`, `start`, and `test` scripts.
- `tsconfig.json`, `next.config.ts`, `next-env.d.ts`.
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
- `lib/` placeholder only when the task needs it. Do not create empty files.

The page may render the post-remediation top-bar metric card and the 82/14/4 counters. It must not implement the cockpit components yet.

`npm test` must pass with zero tests at bootstrap. `npm run build` must pass.

The human runs `npm install` and commits `package-lock.json`. The agent does not run package installs.

## Step 4 — Create the Mobile Shell

Under `apps/mobile/`, create the Expo SDK 53 shell:

- `package.json`, `app.json`.
- `app/index.tsx`, `app/sign.tsx`, `app/result.tsx` as placeholders.
- `lib/keys.ts`, `lib/signing.ts`, `lib/qr.ts` only when the task needs them.

No signing logic at bootstrap. The human runs `npm install`.

## Step 5 — Populate Fixtures (Human Only)

The human fills `fixtures/` using `fixtures/README.md`. The agent must not invent ARES, Textract, invoice, or batch data. VT-001 through VT-006 do not need fixtures; VT-007 does.

## Step 6 — Prove the Baseline

```bash
dotnet test src/PayShield.sln --configuration Release
cd apps/web && npm ci && npm test
cd apps/web && npm run build
```

Expected:

- `dotnet test`: exactly 1 failed test, `JsonPointerResolverTests.Resolve_HandlesEscapedSegmentsAndMissingPaths`.
- `npm test`: exit 0, zero tests.
- `npm run build`: exit 0.

If the backend failure count is not exactly 1, stop and fix the bootstrap. If the web suite fails, stop and fix the shell.

## Step 7 — Commit and Launch

```bash
git add -A
git commit -m "bootstrap: product shells and VT-001 red test"
git status --porcelain
```

Then launch:

```
Read .agents/orchestrator.md and begin Phase 1.
```

## Acceptance

- [ ] Four .NET projects and a solution exist under `src/`.
- [ ] `PayShield.Domain` compiles the frozen contracts from `contracts/domain/`.
- [ ] `tests/PayShield.Tests` contains exactly one test and it fails for VT-001.
- [ ] `apps/web` builds and its test script passes.
- [ ] `apps/mobile` is a valid Expo shell.
- [ ] No gate, rule, endpoint, or component logic is implemented.
- [ ] No package outside the human-approved set is present.
- [ ] `contracts/` and `fixtures/` are unchanged.
- [ ] `git status --porcelain` is empty.
- [ ] The human confirms the baseline.

## Baseline vs Remediation Baseline

- **Bootstrap baseline** (this file): one intentional failure, VT-001.
- **Remediation baseline** (`REMEDIATION.md`): the full verifier and hero case are green, `npm test` is green, and the working tree is clean. The remediation agent refuses to start before this.

Do not confuse the two. The first failing test is the start of the build, not a broken environment.
