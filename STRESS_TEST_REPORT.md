# Stress Test Fix Report

## Problem

The prior endpoint returned synthetic values:

- fixed `Task.Delay` instead of work;
- hard-coded p50/p95/p99 (`0.004 / 0.012 / 0.047 ms`);
- forced 82 / 14 / 4 distribution;
- throughput derived from the artificial delay.

That made the stress test a demo animation, not a benchmark.

## Fix

`CnbTransactionIndex.Benchmark(sampleSize)` now:

1. Iterates actual `CnbTransactionRow` records from the indexed ČNB data.
2. Runs a deterministic client-risk / amount / PEP / channel rule pass per row.
3. Times each row with `Stopwatch.GetTimestamp()`.
4. Sorts the real per-row latencies for p50/p95/p99.
5. Returns actual tier counts and total elapsed time.
6. Returns real throughput = sample / elapsed seconds.

No `Task.Delay`, no fixed percentiles, no forced 82/14/4 counts.

## Verified results

| Sample | Elapsed | p50 | p95 | p99 | Throughput | Auto / Step-up / Escalate |
|---:|---:|---:|---:|---:|---:|---:|
| 5,000 | 1.209 ms | 0.0001 ms | 0.0003 ms | 0.0006 ms | 4,136,334/s | 4,552 / 448 / 0 |
| 50,000 | 7.568 ms | 0.0001 ms | 0.0002 ms | 0.0003 ms | 6,606,940/s | 45,225 / 4,758 / 17 |
| 397,853 | 60.349 ms | 0.0001 ms | 0.0002 ms | 0.0003 ms | 6,592,548/s | 358,909 / 38,795 / 149 |

Latest full-ledger run (12:46): **397,853 rows / 115.65ms / 3,440,147 rows/s**. These are real loop measurements on the current synthetic ČNB slice, not a claim about production hardware; repeated runs vary with load/cache. The UI now formats elapsed to 3 decimals and percentile latency to 4 decimals.

## UI

- Stress modal still opens on `⚡ Stress Test`.
- Sample buttons 1k / 5k / 10k / 50k still work.
- Re-run uses the selected sample.
- Results show actual distribution, real latency, real throughput.
- Cost comparison uses the same sample size.

## Verification

- `dotnet build`: green.
- `npm run build`: green.
- `dotnet test`: 72/72.
- API `POST /api/v1/stress-test/run`: 200 for 5k, 50k and 397,853.

## Caveat

The per-row work is a compact deterministic score pass, not the full verifier/document pipeline. The number is a rules-layer throughput benchmark; label it that way on stage.
