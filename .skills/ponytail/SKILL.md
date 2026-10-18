# Ponytail — Ruthless Scope Control

## When to Use

- The analyzer, before writing `TASK.md`.
- The reviewer, before writing `APPROVE`.
- CI, on every pull request over 200 added lines.
- Any moment a task starts to feel like a platform.

Ponytail is not a style preference. It is the mechanism that keeps a 30-hour build from becoming a 38-hour build.

## Doctrine

**Deletion is a feature.**

Every file you add is a file someone must test, review, secure, and maintain. The fastest code to ship is the code you do not write. The safest abstraction is the one with three real call sites.

For every proposed file, ask:

1. Can this file be deleted?
2. Can the behavior live in an existing file?
3. Can this abstraction be inlined?
4. Can this interface be a concrete type?
5. Can this helper be a single expression?
6. Can this config value be a constant?
7. Can this test use an existing fixture or builder?
8. Does the demo need this on stage?

If the answer to 1, 2, 3, 4, 5, 6, or 7 is "yes," delete or inline it. If the answer to 8 is "no," cut it or defer it. "It might be useful later" is not a reason.

## Rejection Rules

Reject any proposal or diff that contains:

| Rule | Example | Verdict |
|---|---|---|
| An abstraction used by fewer than 3 call sites. | `IEvidenceFormatter` with one formatter. | Reject. |
| An interface with a single implementation. | `IRuleEngine` implemented only by `RuleEngine`. | Reject. |
| A helper used once. | `FormatMoney()` called from one line. | Reject. |
| A factory that creates one type. | `RuleEngineFactory.Create()`. | Reject. |
| A base class with one subclass. | `GateBase` and one gate. | Reject. |
| An options object with one caller. | `VerifierOptions` used by one constructor. | Reject. |
| A new DTO that mirrors a frozen contract. | `EvidenceDto` next to `EvidenceEnvelope`. | Reject. |
| A file added for "future use." | `apps/web/lib/analytics.ts` with no caller. | Reject. |
| A new package for one function. | A date library for one format call. | Reject. |
| A comment longer than one line. | A five-line explanation above a method. | Reject. |

The only exceptions are frozen contracts, fixtures, tests, and the demo path. Protected code is not exempt from deletion if it is dead; it is exempt from casual rewriting.

## The Three-Call-Site Rule

Count call sites with evidence, not intuition:

```bash
rg -n "MyAbstraction|my_helper" src apps tests
```

- 3 or more real call sites: the abstraction may be justified.
- 2 call sites: inline it unless the duplication is expensive and tested.
- 1 call site: inline it.
- 0 call sites: delete it.

"Real" means production call sites or distinct tests that prove different behavior. A call site in a comment does not count. A call site in a deleted file does not count.

## What Not to Delete

- Frozen contracts and fixtures.
- A test that proves a required behavior.
- The fail-closed path in the verifier.
- The audit hash chain.
- The signature verification.
- The offline mock path.
- The demo's override moment.
- Security checks, input validation at the system boundary, and access control.

Ponytail is scope control, not sabotage. If deleting a line removes a guarantee the judge will test, keep the line and delete something else.

## Procedure

1. List every file in the proposal or diff.
2. For each, write one line: purpose, caller count, test coverage.
3. Mark `KEEP`, `INLINE`, `DELETE`, or `DEFER`.
4. For every abstraction, count call sites.
5. For every new file, check whether an existing file already owns the behavior.
6. For every new dependency, check whether the standard library does it.
7. Calculate lines saved.
8. Write `PONYTAIL_REPORT.md`.
9. Do not edit files unless the task explicitly asks for the deletions. The analyzer proposes; the implementer executes.

## `PONYTAIL_REPORT.md` Template

```markdown
# PONYTAIL REPORT — VT-###

**Scope:** analyzer proposal | reviewer diff | PR <n>
**Diff:** +<n> / -<n>
**Net:** <n> lines

## Deletions
| File | Lines | Reason | Confidence |
|---|---:|---|---|
| `src/Foo/Bar.cs` | 42 | No call sites; one implementation. | high |
| `apps/web/lib/format.ts` | 18 | One call site; inline. | high |

## Inlines
| Abstraction | Call sites | Action | Lines saved |
|---|---:|---|---:|
| `IRuleEngine` | 1 | Replace with `RuleEngine`. | 9 |
| `FormatMoney` | 1 | Inline expression. | 6 |

## Rejected from the proposal
- `<file>` — <reason>.
- `<package>` — <reason>.

## Kept
- `<file>` — <why it survives>.
- `<file>` — <why it survives>.

## Estimate
- Lines saved: <n>
- Confidence: high | medium | low
- Net-negative diff: yes | no
- If no, justification: <one line>
```

The estimate is a range when uncertain: `18–24 lines`. Do not invent precision.

## CI Gate

The PR check fails when the diff adds more than 200 lines and deletes fewer than 20. The check is:

```bash
added=$(git diff --numstat "$BASE"...HEAD | awk '{a+=$1} END {print a+0}')
deleted=$(git diff --numstat "$BASE"...HEAD | awk '{d+=$2} END {print d+0}')
[ "$added" -le 200 ] || [ "$deleted" -ge 20 ]
```

If the gate fails, the PR is rejected. Split the change or delete something. Generated files, lockfiles, and fixtures are excluded from the count only with a human decision.

## Reviewer Questions

- Is every new file forced by a test?
- Is every new interface implemented more than once?
- Is every helper called more than once?
- Is every config value ever different?
- Is every new dependency used by at least three call sites?
- Is the diff net-negative or justified?
- Could a smaller diff pass the same test?

If the diff could be smaller, `REJECT` and state the exact lines to remove.

## Anti-Patterns

- "It's cleaner this way." Cleaner is not a test.
- "We'll need it for the next task." Then add it in the next task.
- "It's only 40 lines." Forty lines is forty lines to review and test.
- "The architecture says so." The architecture is frozen, not expanded.
- "The agent suggested it." The agent is not the reviewer.

## Final Rule

If you cannot name the test that forces a file to exist, the file does not exist.

If you cannot name three call sites, the abstraction does not exist.

If you cannot name the demo moment it protects, the feature does not ship.
