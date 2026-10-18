# Throughput Math — 180-Second Cognitive Review

## The Claim

At 5,000 alerts/day, VeriTriage saves **21.1 FTE** and **€1.16M/year**, using a 180-second cognitive review per escalated case.

## The Arithmetic

```
5,000 alerts/day
× 82% auto-cleared      = 4,100 alerts, 0 human seconds
× 14% step-up           =   700 alerts, 85% self-service, 105 spillover
× 4%  direct escalation =   200 alerts
+ spillover             =   305 escalated cases
× 180s cognitive review = 15.25 hours/day
÷ 6.5 productive hours  = 2.35 FTEs
Manual baseline         = 23.46 FTEs (305 × 30 min ÷ 6.5h)
Savings                 = 21.1 FTEs × €55k = €1.16M/year
```

## Check

- 5,000 × 0.82 = 4,100.
- 5,000 × 0.14 = 700; 700 × 0.85 = 595 self-service; 105 spillover.
- 5,000 × 0.04 = 200; 200 + 105 = 305.
- 305 × 180 = 54,900 seconds = 15.25 hours.
- 15.25 ÷ 6.5 = 2.35 FTE.
- 305 × 30 minutes = 9,150 minutes = 152.5 hours; ÷ 6.5 = 23.46 FTE.
- 23.46 − 2.35 = 21.11 → 21.1 FTE.
- 21.1 × €55,000 = €1,160,500 → €1.16M.

## Assumptions

| Assumption | Value | Why |
|---|---|---|
| Daily alerts | 5,000 | Mid-size PSP scenario. |
| Auto-clear | 82% | Seed distribution, calibrated to production benchmarks. |
| Step-up self-service | 85% | The 14% tier does not need a human in most cases. |
| Direct escalation | 4% | Verifier failures and statutory escalations. |
| Cognitive review | 180 seconds | Production review of pointer-highlighted evidence. |
| Productive hours | 6.5/day | Real analyst capacity, not a 9-hour desk. |
| Loaded analyst cost | €55k/year | Conservative EU mid-market estimate. |

## What Not to Claim

- Do not use the signature time as the review time. The signature is a demo artifact; the review is the cognitive gate.
- Do not claim 81% win probability. The honest post-remediation estimate is 68–72%.
- Do not claim the 82% is a production measurement. It is a seeded distribution calibrated to production benchmarks; the verifier runs all 100 alerts live.
- Do not add a new tier or a new automation ratio to improve the math. The assumptions are the contract.

## Q&A Version

> "5,000 alerts a day. 82% auto-clear. 4% direct plus 14% step-up spillover is 305 escalated cases. At 180 seconds of real review, that's 2.35 analysts. The manual baseline is 23.46. We save 21.1 FTE, about €1.16 million a year."

## Sensitivity

If the review time is 120 seconds, the FTE need drops to 1.57 and savings rise. If it is 240 seconds, the FTE need rises to 3.13 and savings fall. The 180-second midpoint is the claim; do not cherry-pick the 120-second case.
