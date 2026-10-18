# Human Handoff Protocol

The agents are allowed to be wrong. They are not allowed to be stuck silently.

This is the only escalation channel. No chat messages, no verbal decisions, no "I'll take a look later." A decision that is not in `DECISION.md` did not happen.

## When to Escalate

Escalate immediately when any of these is true:

| Trigger | Why it stops the build |
|---|---|
| 3 failed evaluation loops on one task | The same failure survived three hypotheses. More attempts will burn the clock. |
| 2 failed review loops on one task | The implementer and reviewer disagree on scope or quality. |
| A contract or fixture is wrong | Only a human may change frozen files. |
| A package is required | Only a human may approve dependencies. |
| A task needs more than three files and cannot be split | The task is mis-scoped. |
| Two active tasks need the same file | Parallel writers will corrupt the diff. |
| A required fixture is missing or synthetic data would be invented | The demo's honesty rule forbids guessing. |
| The evaluator cannot run in a clean environment | A broken gate cannot certify anything. |
| The remediation baseline is red | Do not remediate on a red baseline. |
| A remediation acceptance fails or exceeds 1.5× its estimate | The seven-change plan is bounded; do not silently overrun. |
| The clock hits a cut-list threshold | The pre-agreed cut executes; no renegotiation. |
| An agent wants to add a feature after H+20 | Feature freeze. |

Do not escalate for difficulty, uncertainty, or a test that is merely slow to write. Split the task, narrow it, or cut it.

## The 30-Second Rule

The human must answer a `BLOCKED.md` within **30 seconds** of seeing it.

- If the human cannot decide in 30 seconds, the feature is cut.
- If the human does not respond within 30 seconds, the orchestrator writes `DECISION.md` with `CUT_FEATURE` and `decided_by: timeout`, commits both files, marks the task `CUT`, and resumes.
- No agent waits more than 30 seconds for a human. The build does not stop for indecision.

The rule exists because a 30-minute debate about a non-critical feature is how a 30-hour build loses its rehearsal window. Cut first. Add back only if the demo path proves it matters.

## `BLOCKED.md` Template

The orchestrator writes this at the repo root and commits it before stopping.

```markdown
# BLOCKED — VT-###

**Written:** 2026-10-19T21:15:00+02:00
**Task:** VT-### <one line>
**Phase:** 2 | 3 | 4
**Attempts:** evaluation <n>/3, review <n>/2
**Workstream:** verifier | domain | infra | api | web | mobile | e2e
**Files in scope:** `<path>`, `<path>`

## Failing test
```
<test name>
<exact command>
<exact last 20 lines>
```

## Last 3 diffs
### Attempt 1 — `<sha or working tree>` — +<n>/-<n>
```
<diff --stat and the changed hunks, or a patch path>
```
### Attempt 2 — `<sha or working tree>` — +<n>/-<n>
```
<diff --stat and the changed hunks, or a patch path>
```
### Attempt 3 — `<sha or working tree>` — +<n>/-<n>
```
<diff --stat and the changed hunks, or a patch path>
```

Patches larger than 120 lines live in `.agents/handoffs/VT-###-attempt-<n>.patch`.

## Evaluator feedback
```
<verbatim EVALUATION.md verdict, failing assertion, command, exit code>
```

## Reviewer feedback
```
<verbatim REVIEW.md findings, one line each>
```

## The question
<One sentence with two or three concrete options. The human must be able to answer yes/no or A/B/C in 30 seconds.>

## Options
- A — `FIX_CONTRACT`: <exact change, files, risk>
- B — `APPROVE_PACKAGE`: <exact package and version, risk>
- C — `CUT_FEATURE`: <what is removed, what still ships>

## Default
`CUT_FEATURE` at the 30-second mark.
```

Keep it under 120 lines. The human has 30 seconds, not 30 minutes. If the diff is too large to fit, attach patches and link them.

## What the Human Does

1. Read `BLOCKED.md`. Do not read the whole repo.
2. Pick one option. Write `DECISION.md` at the repo root.
3. Commit `BLOCKED.md` and `DECISION.md` together.
4. Return to the orchestrator.

The human may edit `contracts/`, `fixtures/`, package files, or CI. Agents may not.

## `DECISION.md` Template

```markdown
# DECISION — VT-###

**Decision:** FIX_CONTRACT | APPROVE_PACKAGE | CUT_FEATURE | CHANGE_APPROACH | STOP
**Decided by:** <initials>
**Decided at:** 2026-10-19T21:15:30+02:00
**Scope:** <the exact files, package versions, or feature cut>
**Constraints:** <what the fix may not touch>
**Resume at:** analyze | implement | evaluate | review
**Counters:** keep | reset
**Rationale:** <one line>
```

A decision without `Scope`, `Resume at`, and `Counters` is invalid. The orchestrator sends it back as `BLOCKED (decision incomplete)`.

## Decision Semantics

### `FIX_CONTRACT`

The human edits `contracts/` or `fixtures/`, commits the change, and names the exact files. The orchestrator deletes the old red test commit, re-runs the analyzer, and starts Phase 1 with the new contract. Counters reset only if `Counters: reset`.

### `APPROVE_PACKAGE`

The human adds the exact package and version, runs the restore or install, commits the package files, and records the versions in `DECISION.md`. The orchestrator resumes Phase 2. The implementer may use only the approved package.

### `CUT_FEATURE`

The human names the feature and the tasks to cut. The orchestrator:

1. Marks the tasks `CUT` in `BACKLOG.md`.
2. Reverts the red test commit for the cut task.
3. Removes any partial implementation.
4. Commits `VT-###: cut <feature> (test: none)`.
5. Continues with the next task.

Cut is not failure. Cut is how the demo ships.

### `CHANGE_APPROACH`

The human writes the new approach in `DECISION.md` and names the analyzer task. The orchestrator resets the task artifacts, invokes the analyzer, and starts Phase 1. Counters reset only if explicitly stated.

### `STOP`

The orchestrator stops all subagents, makes no commit, and writes no further files. The human owns the repo. Use this only when the build is being abandoned or handed to a different process.

## Resume Rules

The orchestrator, on the next turn:

1. If `BLOCKED.md` exists and `DECISION.md` does not, wait 30 seconds. If still absent, write the timeout decision and execute `CUT_FEATURE`.
2. If both exist, read `DECISION.md` and validate it.
3. Apply the decision exactly. Do not reinterpret, expand, or "improve" it.
4. Commit the fix together with the removal of `BLOCKED.md` and `DECISION.md`. The git history keeps the audit.
5. Resume at the phase named in the decision.
6. Preserve counters unless the decision says `reset`.

A second `BLOCKED.md` for the same task after a decision means the decision was wrong or incomplete. The human must decide again, but the default flips to `CUT_FEATURE` immediately.

## What the Human Must Not Do

- Do not edit `src/`, `apps/`, or `tests/` to "help" the implementer. That breaks ownership and the evaluator's diff.
- Do not approve a package without a version.
- Do not approve a contract change without naming the exact files.
- Do not extend the 30-second rule.
- Do not ask the agents to "try harder." Change the scope, the contract, or the feature.
- Do not renegotiate the H+14 cut list at H+14.
- Do not let a `BLOCKED.md` sit overnight. Cut it, fix it, or stop.

## Escalation Is a Feature

A blocked agent that stops is cheaper than an agent that guesses. The handoff exists to protect the frozen contract and the rehearsal window. Use it early, decide in 30 seconds, and keep moving.
