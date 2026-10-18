# Golden Files — Policy Only

No golden files exist yet. This directory holds the approved snapshots that the evaluator compares byte-for-byte.

## Rules

- The verifier's hero output becomes `verifier_hero_case.json` only after the five gates are green and a human approves the snapshot.
- The seeder's output becomes `seeder_batch_100.json` only after `Seeder_Produces82_14_4` is green and a human approves the snapshot.
- The receipt becomes `receipt_hero_case.json` only after `Receipt_MatchesGoldenSnapshot` is green and a human approves the snapshot.
- Tests never rewrite these files. A test that writes to `tests/golden/` is a review rejection.
- A golden diff is a failure, not an update. If the output legitimately changes, the human approves a new snapshot via `DECISION.md` and the change is committed separately.
- Key order, whitespace, number formatting, casing, and line endings all matter.

## Bootstrap

The golden files are created by the verifier tasks, not by the environment bootstrap. Until then, this README is the only file in the directory.
