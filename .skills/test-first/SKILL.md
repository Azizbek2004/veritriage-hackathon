# Test-First — The Gate That Makes Parallel Work Safe

## When to Use

- Every task, before any implementation.
- The analyzer, when writing `TASK.md`.
- The orchestrator, when committing the red test.
- The implementer, when deciding whether a line is allowed.
- The reviewer, when checking whether a diff is justified.

## The Rule

**Write the failing test before the implementation. Commit the test before writing the implementation. Never write implementation code that is not required by a test.**

No exceptions for "small" changes, "obvious" fixes, "just wiring," or "the test would be trivial." A task without a red test is not a task. It is a guess.

## The Cycle

1. **Red.** Write one test for one behavior. Run it. It must fail for the intended reason. Commit it.
2. **Green.** Write the minimum implementation that makes it pass. Run the focused test. Run the full suite.
3. **Refactor.** Remove duplication and slop while the test stays green. No new behavior.
4. **Commit.** The orchestrator commits only after the evaluator and reviewer pass.
5. **Repeat.** One behavior at a time. Do not batch three tests into one commit.

## What a Good Red Test Looks Like

- It is named `Method_Scenario_Expected`.
- It asserts observable behavior, not implementation details.
- It is deterministic: no wall clock, no random, no sleeps, no live network.
- It uses the smallest input that proves the behavior.
- It fails because the behavior is missing, not because the file is missing or the test has a typo.
- It is fast enough to run on every save (< 1 second for a unit test).
- It is committed separately from the implementation.
- It is not skipped, ignored, or conditionally compiled.

## What a Bad Red Test Looks Like

- It passes before the implementation. That is not a red test; that is a regression test for existing behavior. Move it or delete it.
- It fails with a compile error because the type does not exist, and no red scaffold was specified. The test cannot prove anything until it compiles.
- It fails because a fixture is missing. The fixture is a prerequisite, not a red test.
- It asserts a private method, a log line, a mock call order, or a framework detail.
- It requires a live ARES, Bedrock, Textract, database, or phone. Those are demos, not unit tests.
- It has three behaviors and six assertions. Split it.
- It was written after the implementation and is being used to "cover" it.

## The Red Scaffold Exception

If a test needs a type that does not exist, the analyzer may specify a **red scaffold**: the minimum public signature with a body that throws `NotImplementedException("VT-###")`.

The scaffold is not implementation. It contains:

- The type name.
- The method signature.
- A throwing body.
- Nothing else. No fields, no helpers, no validation, no comments beyond one line.

The orchestrator commits the test and the scaffold together, then proves the test fails with the intended `NotImplementedException`. The implementer replaces the throw with the minimum logic. The implementer never edits the test.

## If the Test Is Hard to Write

A hard-to-test design is a wrong design. Stop and escalate. Do not add a mock framework, an integration harness, or a test-only seam to avoid the design problem.

Common causes and fixes:

| Symptom | Cause | Fix |
|---|---|---|
| The test needs 10 mocks. | The unit has too many collaborators. | Split the unit; use a pure function. |
| The test needs a database. | The logic is mixed with persistence. | Extract the pure decision; test it directly. |
| The test needs the clock. | Time is read inside the logic. | Pass `DateTimeOffset` in. |
| The test needs the network. | I/O is inside the rule. | Test the rule; test the client separately with a fake. |
| The test needs a private method. | The behavior is not exposed. | Extract a public pure function or test through the public surface. |
| The test is flaky. | Time, order, or randomness. | Remove the source of nondeterminism. |
| The test takes minutes. | It is an integration test. | Keep it out of the unit suite; add a separate E2E task. |

If the fix would exceed three files, split the task. Do not write a "temporary" testable seam and leave it in production.

## What the Implementer May Do

- Read the committed test.
- Run the committed test.
- Write the minimum production code to pass it.
- Run the full suite.
- Remove code that the test does not require.
- Ask the analyzer for a split if the task exceeds three files.

## What the Implementer May Not Do

- Add a test, edit a test, rename a test, or delete a test.
- Change an assertion to match the output.
- Add `Skip`, `Ignore`, `[Trait("Category","Skip")]`, or conditional compilation.
- Add a package to make the test run.
- Add a mock that hides a missing behavior.
- Weaken the assertion to `Assert.NotNull`.
- Test a different behavior than the one in `TASK.md`.
- Mark the task done because the focused test passes while the full suite is red.

## Commands

```bash
# .NET focused red/green
dotnet test src/PayShield.sln --filter "FullyQualifiedName~<test name>"

# .NET full suite
dotnet test src/PayShield.sln --configuration Release

# Web
cd apps/web && npm test -- <pattern>
cd apps/web && npm test
```

The final proof is always the full suite, not the focused command.

## Commit Discipline

The red test commit contains:

- The test file.
- The red scaffold, if required.
- Nothing else.

The green commit contains:

- The minimum implementation.
- No test changes.
- No package changes.
- No contract or fixture changes.

If the red test commit and the implementation commit are squashed, the test-first evidence is lost. Do not squash.

## The Contract Is the Test

For a distributed team of agents, the test is the coordination mechanism. The analyzer writes the test, the orchestrator commits it, the implementer reads it, the evaluator runs it, and the reviewer checks that the diff does not change it.

If two agents disagree about behavior, the test decides. If the test is wrong, the analyzer changes it before the implementer starts. If the contract is wrong, the human changes it before the test is written.

## Checklist

- [ ] One behavior per test.
- [ ] The test fails for the intended reason before implementation.
- [ ] The test is committed before implementation.
- [ ] The test is deterministic and fast.
- [ ] The test asserts observable behavior.
- [ ] The implementation is the minimum that passes.
- [ ] No test was edited, skipped, or deleted to go green.
- [ ] The full suite is green.
- [ ] The red commit and green commit are separate.

If you cannot check every box, the task is not test-first.
