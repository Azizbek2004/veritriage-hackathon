# VeriTriage Runtime State Machine

The orchestrator's playbook. Read it top to bottom at the start of every turn. Determine the phase from artifacts, never from memory.

## Canonical Phase Contract

```
PHASE 1 — ANALYZE
  Orchestrator → Analyzer
  Gate: TASK.md exists and contains a failing test.
  If gate fails: escalate to human.

PHASE 2 — IMPLEMENT
  Orchestrator → Implementer
  Gate: `dotnet test` or `npm test` is green.
  If gate fails after 3 retries: escalate to human.

PHASE 3 — EVALUATE
  Orchestrator → Evaluator
  Gate: EVALUATION.md says PASS.
  If gate fails: return to PHASE 2 with feedback. Max 3 loops.

PHASE 4 — REVIEW
  Orchestrator → Reviewer
  Gate: REVIEW.md says APPROVE.
  If gate fails: return to PHASE 2 with feedback. Max 2 loops.

PHASE 5 — COMMIT
  Orchestrator commits with a message that includes the task ID and the test name.
  Orchestrator updates BACKLOG.md (mark task done).
  Orchestrator advances to next task.

PHASE 6 — HUMAN HANDOFF (if blocked)
  Orchestrator writes BLOCKED.md with:
    - The failing test
    - The last 3 diffs
    - The evaluator feedback
    - The reviewer feedback
  Orchestrator stops. Human must intervene.
```

## Phase 0 — Preflight (once per session)

1. `contracts/domain/` exists and `contracts/README.md` says `Frozen`. If either is missing, B-000 is incomplete. Stop and point the human to `BOOTSTRAP.md`. Do not write contract code.
2. `src/PayShield.sln` exists. If it is missing, the product is not bootstrapped. Stop and point the human to `BOOTSTRAP.md`. Do not create product code.
3. `git status --porcelain` is empty. If not, stop and ask the human.
4. `git log --oneline -10` shows the red test commit for the active task.
5. `dotnet --version` is 9.x, or `./.dotnet/dotnet --version` is 9.x.
6. `apps/web/node_modules` exists or `npm ci` succeeds.
7. `BLOCKED.md` is absent. If present, go to Phase 6.
8. Read `BACKLOG.md`, select the active task, and confirm its dependencies are `DONE`.

Do not start Phase 1 until preflight passes. The environment-only repository fails at the bootstrap gate by design, not because of a bug.

## Phase 1 — ANALYZE

**Owner:** analyzer.
**Input:** one `BACKLOG.md` row.
**Output:** `TASK.md`.

Steps:

1. Invoke the analyzer with the task ID and the one-line task.
2. The analyzer reads `AGENTS.md`, `contracts/`, `BACKLOG.md`, and only the relevant source.
3. The analyzer applies the `ponytail` skill and removes every file that is not required.
4. The analyzer writes `TASK.md` with:
   - Intent in one sentence.
   - At most three files, with the exact change per file.
   - The exact failing test code.
   - The exact red scaffold, if the test needs a signature to compile.
   - Acceptance criteria as binary checks.
   - The exact test command.
   - Ponytail deletions and rejected abstractions.
5. The orchestrator verifies the gate.

**Gate 1:** `TASK.md` exists, lists at most three files, contains a test that can fail for the intended reason, and contains no contract, fixture, or package change.

**Gate 1.5:** the red test is committed and fails. If the task status is already `RED`, verify the commit and the failure instead of recommitting.

If Gate 1 fails, escalate. Do not "fix" the analyzer's output yourself. If the task needs more than three files, the analyzer must split it into two tasks and stop.

**Immutability:** once the red test is committed, the test file is frozen for that task. The implementer may not edit it. If the test is wrong, the analyzer writes a new `TASK.md`, the orchestrator reverts the test commit, and the cycle restarts with counters intact.

## Phase 2 — IMPLEMENT

**Owner:** implementer.
**Input:** `TASK.md`, the committed red test, frozen contracts.
**Output:** working-tree diff, no commit.

Steps:

1. Confirm the test commit exists and the focused test fails for the intended reason.
2. Confirm the working tree is clean apart from the test commit.
3. Implement only what the test requires, only in the files listed.
4. Run the focused test until green.
5. Run the full suite. The only allowed failure is a known red test from another active task, and only if that task's red commit names it. At H+2 the only known red is the active task.
6. Report files changed, commands, exact output, and residual risk.

**Gate 2:** focused test green; full suite green except the active task's own red test, which must now be green; no file outside `TASK.md` changed.

**Retry:** after an evaluation failure, the implementer gets structured feedback. Maximum three evaluation attempts per task. A third failure goes to Phase 6.

Forbidden in this phase: editing tests, adding packages, editing contracts/fixtures, touching `BACKLOG.md`, `git commit`, disabling analyzers, suppressing warnings, adding TODO comments, leaving commented-out code, or changing more than the task requires.

## Phase 3 — EVALUATE

**Owner:** evaluator.
**Input:** the implementation diff, `TASK.md`, the test commit.
**Output:** `EVALUATION.md` with `PASS` or `FAIL`.

Steps:

1. Snapshot the diff: `git diff > /tmp/vt-<task>.patch`.
2. Create a clean worktree at the test commit: `git worktree add --detach /tmp/vt-eval-<task> <test-sha>`.
3. Apply the patch in the clean worktree.
4. Remove `bin/` and `obj/`; run `npm ci` if web changed.
5. Run `dotnet test` and `npm test` yourself. Capture exit codes and the exact failure.
6. Run the golden comparison. A non-empty diff is `FAIL`.
7. Run the suite twice for any demo-critical test. A flaky result is `FAIL`.
8. Write `EVALUATION.md` with command, commit, counts, duration, exact failing assertion, and environment versions.
9. Remove the worktree.

**Gate 3:** `EVALUATION.md` says `PASS`, the clean worktree exit code is 0, no new skips, and no golden diff.

**On fail:** return to Phase 2 with the exact assertion and the allowed file list. Increment the evaluation attempt counter. At 3, go to Phase 6.

The evaluator does not trust the implementer's transcript, does not accept "it compiles," and does not edit code. If the environment cannot run the tests (missing SDK, network failure), the result is `FAIL (infrastructure)`, not `PASS`.

## Phase 4 — REVIEW

**Owner:** reviewer.
**Input:** the diff, `EVALUATION.md`, `TASK.md`, frozen contracts.
**Output:** `REVIEW.md` with `APPROVE` or `REJECT`.

Steps:

1. Read `AGENTS.md`, `contracts/`, and `TASK.md` before looking at the diff.
2. Read `git diff --stat` and the full diff. Start from the diff, not the narrative.
3. Apply every `scope-guard` rejection trigger.
4. Apply `ponytail` to the diff.
5. Check tests: no edits, no skips, no weakened assertions, no deleted cases.
6. Check the diff is no larger than the task requires. More than 200 added lines with fewer than 20 deleted lines is a `REJECT`.
7. Write `REVIEW.md` with one line per finding and a verdict.
8. Do not fix anything. Do not commit.

**Gate 4:** `REVIEW.md` says `APPROVE` with zero findings.

**On reject:** return to Phase 2 with one-line findings. Increment the review loop counter. At 2, go to Phase 6. A review rejection does not reset the evaluation attempt counter.

## Phase 5 — COMMIT

**Owner:** orchestrator.
**Input:** `PASS` evaluation, `APPROVE` review, clean diff.

Steps:

1. Confirm the working tree contains only the task files.
2. Confirm `contracts/`, `fixtures/`, package files, CI, `.agents/`, and skills are untouched.
3. Run the full suite one final time in the working tree. It must be green.
4. Commit: `VT-###: <imperative summary> (test: <test name>)`.
5. Mark the task `DONE` in `BACKLOG.md` and commit that update with the same task ID.
6. Delete `TASK.md`, `EVALUATION.md`, and `REVIEW.md`.
7. Reset the task counters. Verify `git status --porcelain` is empty.
8. Select the next task in the next turn.

**Gate 5:** commit exists, backlog updated, worktree clean, full suite green.

Never commit a red test, a failing suite, a skipped test, a generated artifact, a secret, or a file outside `TASK.md`.

## Phase 6 — HUMAN HANDOFF

**Owner:** orchestrator.
**Trigger:** any circuit breaker, contract conflict, package request, two-writer conflict, missing fixture, or unreadable environment.

Steps:

1. Stop all subagents.
2. Write `BLOCKED.md` exactly per `.agents/human-handoff.md`.
3. Do not commit anything after writing `BLOCKED.md`.
4. Stop.

The human writes `DECISION.md`. On the next turn:

1. Read `DECISION.md`.
2. Apply exactly one of: `FIX_CONTRACT`, `APPROVE_PACKAGE`, `CUT_FEATURE`, `CHANGE_APPROACH`, `STOP`.
3. Delete `BLOCKED.md` and `DECISION.md`.
4. Resume at the phase named in the decision, with counters preserved unless `CHANGE_APPROACH` explicitly resets them.
5. If the human does not respond within 30 seconds, execute the default: `CUT_FEATURE`.

## Phase 7 — REMEDIATION (post-baseline)

**Owner:** remediation agent (`.agents/remediation.md`).
**Trigger:** the product baseline is green (VT-003, VT-014, VT-023, VT-024, VT-027, VT-028 are `DONE`), the full suite is green, and `REMEDIATION.md` has been read.
**Output:** the seven acceptances verified, `REMEDIATION_PLAN.md`, `EXTENDED_FINDINGS.md`.

Steps:

1. Confirm the remediation baseline is green: `dotnet test`, `npm test`, `npm run build`, `git status` clean. If red, Phase 6.
2. Write `REMEDIATION_PLAN.md` with every file and acceptance. Do not proceed without it.
3. Verify acceptances in order: 4, 5, 1, 6, 2, 3, 7.
4. For each acceptance: run the test/build, record the exact output, update the plan. If the delta is missing, return it to the owning task or apply a bounded fix only with a human `DECISION.md`.
5. After change 7: run the full suite and three timed rehearsals.
6. Write `EXTENDED_FINDINGS.md`. Stop. Do not apply its proposals without human approval.

This phase is bounded. It is not a second backlog. No sixth gate, no new tool, no Mastercard UI, no package, no pitch-deck rewrite.

**Gate 7:** all seven acceptances `VERIFIED`; no unlisted file touched; `REMEDIATION_PLAN.md` complete; `EXTENDED_FINDINGS.md` written; no demo run over five in a row.

## Phase 8 — REHEARSAL

**Owner:** orchestrator + humans.
**Trigger:** Phase 7 complete.

Steps:

1. Run the 90-second demo three times. All three must finish under 88 seconds.
2. Rehearse the OCR drop 10 times and the QR sign 10 times.
3. Rehearse the F9 failover 5 times.
4. Write `REHEARSAL.md` with the commands, timings, and failures.
5. No code changes unless a rehearsal blocker is proven. Then it is a bug fix, not a feature.

The build stops here. The remaining win probability comes from rehearsal discipline, not code.

## Transition Table

| From | Event | To |
|---|---|---|
| Preflight | clean, task selected | Analyze |
| Analyze | `TASK.md` valid, red test committed and failing | Implement |
| Analyze | gate fails | Handoff |
| Implement | focused + full suite green | Evaluate |
| Implement | 3rd evaluation attempt fails | Handoff |
| Evaluate | `PASS` | Review |
| Evaluate | `FAIL` and attempts < 3 | Implement |
| Evaluate | `FAIL` and attempts = 3 | Handoff |
| Review | `APPROVE` | Commit |
| Review | `REJECT` and loops < 2 | Implement |
| Review | `REJECT` and loops = 2 | Handoff |
| Commit | commit + backlog updated + clean | Next task / Stop |
| Commit | all seven owning tasks green and full suite green | Remediation |
| Remediation | all seven changes green | Rehearsal |
| Remediation | acceptance fails or 1.5× estimate exceeded | Handoff |
| Rehearsal | 3/3 under 88 seconds | Stop |
| Rehearsal | repeated failure | Bug-fix task, then Handoff |
| Any | contract, fixture, or package request | Handoff |
| Any | `DECISION.md` present | Apply decision, resume |

## Circuit Breaker

| Condition | Action |
|---|---|
| Same task fails evaluation 3 times | `BLOCKED.md`, stop. |
| Same task fails review 2 times | `BLOCKED.md`, stop. |
| Same failure repeated twice | Re-run the analyzer before a third implementer attempt. |
| Two agents need the same file | Serialize; the lower-priority task waits. |
| Contract or fixture appears wrong | `PROPOSAL.md`, then `BLOCKED.md`, stop. |
| Package needed | `BLOCKED.md`, ask for approval. |
| Evaluator cannot reproduce the environment | `BLOCKED.md`, do not mark `PASS`. |
| Product scaffold is missing before Phase 1 | Stop; point to `BOOTSTRAP.md`. Do not write product code. |
| Remediation baseline is red | `BLOCKED.md`; do not remediate on a red baseline. |
| Remediation change misses acceptance or exceeds 1.5× estimate | `BLOCKED.md`; do not proceed to the next change. |
| Clock hits H+20 with feature work | Stop feature work. Bug fixes only. |
| Clock hits H+14 with a cut-list threshold hit | Execute the cut. No renegotiation. |

No infinite loops. The maximum work per task is:

```
3 analyzer attempts + 3 implementer attempts + 3 evaluator runs + 2 reviewer runs
```

After that, a human decides. The environment exists to stop the agent, not to keep it busy.

## Parallel Execution

| Rule | Value |
|---|---|
| Max active tasks | 3 |
| Active tasks per workstream | 1 |
| Shared file between active tasks | Forbidden |
| Concurrent analyzers | Allowed |
| Concurrent implementers | Allowed only across workstreams |
| Concurrent evaluators | Allowed; use separate worktrees |
| Concurrent commits | Forbidden; serialized by the orchestrator |

The analyzer may decompose several tasks in parallel. Implementation starts only after the red test for that task is committed. If two tasks collide on a file, the lower-priority task waits, even if its analyzer already ran.

## Artifacts

| File | Owner | Committed? |
|---|---|---|
| `TASK.md` | analyzer | No; working file |
| `EVALUATION.md` | evaluator | No; working file |
| `REVIEW.md` | reviewer | No; working file |
| `PONYTAIL_REPORT.md` | analyzer/reviewer | No; working file |
| `BLOCKED.md` | orchestrator | Yes; escalation record |
| `DECISION.md` | human | Yes; decision record |
| `PROPOSAL.md` | any agent | Yes; contract/package request |
| `BACKLOG.md` | orchestrator | Yes |
| `REMEDIATION_PLAN.md` | remediation agent | Yes; delta checklist |
| `EXTENDED_FINDINGS.md` | remediation agent | Yes; proposal only |
| `REHEARSAL.md` | orchestrator | Yes; final state |

Working files are deleted after the task commits. `BLOCKED.md` and `DECISION.md` are committed by the human before resuming. A working file must never be the only place a decision exists.

## Time Gates

| Checkpoint | Transition |
|---|---|
| Pre-H+0 | Environment installed; no product code. |
| H+0–H+2 | `BOOTSTRAP.md` complete; VT-001 red. |
| H+2–H+4 | Hero test green or cut Gate 2/5 depth. |
| H+4–H+17 | Build features; fold the seven remediation deltas into their owning tasks. |
| H+8 | ARES VR pivot check. |
| H+14 | Execute cut list. No renegotiation. |
| H+17–H+19 | VT-031 verification pass; `EXTENDED_FINDINGS.md`; pitch/Q&A locked. |
| H+18 | Deck frozen. |
| H+20 | Feature freeze; transition to bug-fix mode. |
| H+24 | Stop coding; humans sleep. |
| H+28 | Rehearsal; no code changes without a proven blocker. |
| H+30 | Stage. |
