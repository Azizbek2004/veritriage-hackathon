# No-Slop Verifier — Deterministic Proof Only

## When to Use

- The evaluator, after every implementer turn.
- CI, on every push and pull request.
- The orchestrator, before every commit.
- Any time someone says "it works on my machine."

## The Rule

**Re-run the suite in a clean environment. Compare the actual output to the golden file. Fail if the diff is non-empty. Never accept "it compiles" as a proxy for "it passes."**

The implementer's report is a claim. The evaluator's clean run is evidence. Only evidence certifies a commit.

## Clean Environment

No cached results. No incremental build. No shared working tree. No `node_modules` from the dirty tree. No test output from a previous run.

```bash
# 1. Snapshot the exact implementation diff.
git diff --binary > /tmp/vt.patch

# 2. Create a detached worktree at the red test commit.
git worktree add --detach /tmp/vt-eval HEAD
cd /tmp/vt-eval

# 3. Apply the exact diff.
git apply --check /tmp/vt.patch
git apply /tmp/vt.patch

# 4. Remove caches and build outputs.
find . -type d \( -name bin -o -name obj \) -prune -exec rm -rf {} +
rm -rf apps/web/node_modules apps/web/.next

# 5. Restore and test.
dotnet test src/PayShield.sln --configuration Release
(cd apps/web && npm ci && npm test)
```

If the patch does not apply, `FAIL (stale diff)`. If the worktree cannot be created, `FAIL (infrastructure)`. If the SDK is missing, `FAIL (infrastructure)`, not `PASS`.

Do not use `--no-build`, `--no-restore`, or a pre-warmed `bin/` for the certification run. Those are development shortcuts, not proof.

## Golden Files

`tests/golden/` is the source of truth. It is committed. It is never rewritten by a test.

- The test compares actual JSON to the golden file byte-for-byte.
- Key order, whitespace, number formatting, and casing matter.
- A diff of one byte is a failure.
- If the golden file is wrong, the human approves a change via `DECISION.md`. The evaluator never updates it.
- The evaluator runs `git diff --exit-code -- tests/golden` after the suite. Non-empty is `FAIL (golden drift)`.

```bash
git diff --exit-code -- tests/golden
```

If the test writes an `actual.json` for diagnosis, that file is a temporary artifact. It is not a golden file and must not be committed.

## "It Compiles" Is Not "It Passes"

A build is necessary, not sufficient. The evaluator checks:

- The test process exits 0.
- Zero failed tests.
- Zero skipped tests.
- The expected number of tests ran (not a filtered subset).
- The golden diff is empty.
- The focused test passes twice.
- The test names in the output match the task.

A build with zero tests is a failure. A test run with all tests skipped is a failure. A test run filtered to one passing test is not proof.

## Determinism

Run the task's named test twice. Both runs must pass. For hero-path tests (`HeroCase`, `E2E`, `Receipt`, `Signature`, `Audit`), run the focused test twice and the full suite once.

A flaky test is a failure, even if the second run passes. Flakiness on stage is a failed demo.

Remove or fail on:

- Wall-clock dependencies.
- Random values without a fixed seed.
- Network calls in unit tests.
- Test order dependencies.
- Shared mutable static state.
- Timezone or culture dependencies.
- File system state outside the test's temp directory.
- Port collisions.
- Sleep-based synchronization.

## Exact Failure Reporting

A `FAIL` must include the exact failing assertion, file, and line. Not a summary. Not "the tests failed."

```
FAIL — Gate4_RejectsArithmeticMismatch
File: tests/PayShield.Tests/Gate4Tests.cs:31
Assertion: Assert.False() Failure
Expected: False
Actual: True
Command: dotnet test ... --filter "FullyQualifiedName~Gate4_RejectsArithmeticMismatch"
Exit: 1
```

If the failure is a crash, include the exception type and stack frame. If the failure is a timeout, include the duration and the last test that started. If the failure is infrastructure, say so explicitly and do not mark `PASS`.

## Report Template

```markdown
# EVALUATION VT-###

**Verdict:** PASS | FAIL
**Test commit:** <sha>
**Diff:** +<n> / -<n> across <n> files
**Environment:** .NET <version>, Node <version>, <os>

## Commands
```bash
<exact commands>
```

## Results
| Suite | Exit | Passed | Failed | Skipped | Duration |
|---|---:|---:|---:|---:|---:|
| dotnet | 0 | 42 | 0 | 0 | 1.8s |
| npm | 0 | 8 | 0 | 0 | 0.4s |

## Focused rerun
- Run 1: PASS
- Run 2: PASS

## Golden
- Diff: empty
- Frozen files: clean
- Packages: clean

## Failing assertion
None.

## Evidence
```
<last 20 lines>
```
```

## PASS Criteria

`PASS` only if all are true:

- Clean worktree.
- Exact diff applied.
- `dotnet test` exit 0.
- `npm test` exit 0 for web changes.
- Zero failed, zero skipped.
- Focused test twice.
- Golden diff empty.
- Contracts, fixtures, packages unchanged.
- Test commit named by the orchestrator.
- No file outside `TASK.md`.

There is no `PASS WITH NOTES`. There is no "probably fine." There is no "the failure is unrelated" without a clean run proving it.

## What Slop Looks Like

- The implementer says "all tests pass" without output.
- The focused test passes, so the full suite was not run.
- A test is skipped "temporarily."
- A golden file is updated to match the new output.
- A failing test is deleted or renamed.
- A test is weakened from `Assert.Equal` to `Assert.NotNull`.
- A test catches all exceptions and asserts nothing.
- The build is green because the test project failed to load.
- The test run is filtered to exclude the failure.
- The diff touches a frozen file to make a test compile.
- The test uses the live network and passes because the network happened to work.
- The run uses a stale `bin/` from before the diff.
- The result is `PASS` but the environment is broken.

## The Verifier's Verifier

The evaluator is the verifier's verifier. It does not write code, does not fix tests, and does not negotiate. It runs the commands, reads the output, and states the verdict.

If the evaluator cannot prove `PASS`, the answer is `FAIL`. The orchestrator can route a failure back to the implementer. It cannot route a false `PASS` back to reality.

## Final Check

Before writing `PASS`, ask:

1. Did I run this in a clean worktree?
2. Did I run the full suite?
3. Did I see zero failures and zero skips?
4. Did I check the golden diff?
5. Did I check the frozen files?
6. Did I run the focused test twice?
7. Can I quote the exact command and exit code?

If any answer is no, write `FAIL` and state what is missing. The demo depends on this gate.
