# Scope-Guard — The Frozen Contract Is the Coordination Mechanism

## When to Use

- The reviewer, before every `APPROVE`.
- The analyzer, before writing `TASK.md`.
- The orchestrator, before every commit.
- CI, on every pull request.

The contract is what lets two humans and four agents work in parallel without a meeting. If the contract drifts, the parallelism collapses. Scope-guard exists to make drift impossible to approve silently.

## The Rule

**Read `contracts/` and `AGENTS.md` before every review. Reject any diff that modifies `contracts/`. Reject any diff that adds a package. Reject any diff that implements a feature not listed in `BACKLOG.md`. Reject any diff that writes a comment longer than one line.**

No exceptions. No "small" contract fix. No "temporary" package. No "the backlog implied it." No "the comment explains a hard line."

## Pre-Review Read

1. `AGENTS.md` — frozen architecture and rules.
2. `contracts/domain/`, `contracts/types/api.d.ts`, `contracts/api/openapi.yaml` — materialized in B-000.
3. The active `BACKLOG.md` row and `TASK.md`.
4. `git diff --stat` and the full diff.

If `contracts/` contains only `README.md`, the product is not bootstrapped. Stop; do not review a diff against an unmaterialized contract.

If you have not read the contract, you cannot approve a diff that claims to conform to it.

## Rejection Triggers

### 1. Contract Modification

```bash
git diff --name-only -- contracts/
```

Any output is `REJECT`. This includes formatting, comments, nullability annotations, and "just a typo." A contract change requires `PROPOSAL.md` and a human `DECISION.md`.

### 2. Fixture Modification

```bash
git diff --name-only -- fixtures/
```

Any output is `REJECT` unless a human decision explicitly approves the exact fixture. Synthetic data is never invented by an agent.

### 3. Package Addition

```bash
git diff -- '*.csproj' '*.props' '*.targets' package.json package-lock.json
```

Any added or changed `PackageReference`, `PackageVersion`, `dependencies`, `devDependencies`, or lockfile entry is `REJECT` unless `DECISION.md` names the exact package and version.

### 4. Out-of-Backlog Feature

```bash
git diff --name-only
```

Compare every changed file and every new public method to the active `TASK.md` and `BACKLOG.md`. A feature not listed is `REJECT`, even if it is small, useful, or "obviously needed." If it is needed, it gets a backlog row and a red test.

### 5. Comment Longer Than One Line

```bash
git diff --unified=0 | grep -nE '^\+.*(/\*|//|<!--|-->|///)' || true
```

A one-line comment is allowed only when the code cannot express the reason. A multi-line block comment, three consecutive `//` lines, or an XML doc block is `REJECT`.

### 6. Test Weakening

```bash
git diff --name-only -- tests/
```

Any test change in the implementation diff is `REJECT`. Check for deleted tests, skipped tests, weakened assertions, removed `[Fact]`, loosened tolerances, and changed golden files.

### 7. Scope Creep

- New endpoint not in the contract.
- New UI control not in `TASK.md`.
- New config flag not required by a test.
- New error path not exercised by a test.
- New abstraction with fewer than three call sites.
- Drive-by refactor or formatting-only change.
- Renamed file.
- New logging, metrics, or telemetry.

Any of these is `REJECT`.

### 8. Protected-Surface Drift

```bash
git diff --name-only -- .github/ .agents/ .skills/ AGENTS.md BACKLOG.md
```

Only the orchestrator may change `BACKLOG.md`. Only a human may change `AGENTS.md`, `.agents/`, `.skills/`, or CI. An implementer diff touching any of these is `REJECT`.

### 9. Diff Size

```bash
git diff --numstat
```

More than 200 added lines with fewer than 20 deleted is `REJECT` (ponytail CI gate). More than 600 lines is `REJECT (split the task)`. Generated files and lockfiles are not exempt unless a human decision says so.

### 10. Secrets and Environment Drift

Any `.env`, key, token, connection string, private key, certificate, or credential file is `REJECT` and must be rotated.

## The Contract Is Not a Suggestion

- If the contract is wrong, the correct output is `PROPOSAL.md`, not a patch.
- If the test needs a new field, the human adds it to the contract first.
- If the implementation needs a package, the human approves it first.
- If the backlog does not list the feature, it does not ship.
- If the comment does not fit on one line, rewrite the code or delete the comment.

"Small" is how contracts drift. A nullable annotation here, a renamed field there, and the mobile signer is verifying a different payload than the server. The judge will not see the drift until the demo fails.

## `REVIEW.md` Scope Section

```markdown
## Checks
- Contracts: clean
- Fixtures: clean
- Packages: clean
- Backlog scope: matches VT-###
- Tests: clean
- Comments: clean
- Protected surfaces: clean
- Diff size: +42/-6
- Verdict: APPROVE
```

Every line is evidence. If a line says `clean`, you ran the command. If you did not run it, the verdict is `REJECT`.

## Approval Checklist

- [ ] Read `AGENTS.md` and `contracts/` before the diff.
- [ ] `git diff --name-only -- contracts fixtures` is empty.
- [ ] No package file changed.
- [ ] Every changed file is in `TASK.md`.
- [ ] Every behavior is in `BACKLOG.md`.
- [ ] No comment longer than one line.
- [ ] No test changed in the implementation diff.
- [ ] No protected surface changed.
- [ ] Diff is under 200 added lines or has 20+ deletions.
- [ ] No secrets.
- [ ] The diff is the minimum that passes.

If any box is unchecked, `REJECT` with one line per finding. Do not approve with a note. Do not "file a follow-up." The follow-up is how the demo breaks.

## Escalation

A contract or package conflict is not a review finding. It is a `BLOCKED.md`:

- The exact file and line.
- Why the contract cannot satisfy the task.
- The smallest proposed change.
- The risk of not changing it.
- One yes/no question.

The human decides in 30 seconds. The reviewer does not negotiate with the implementer. The contract is the contract.
