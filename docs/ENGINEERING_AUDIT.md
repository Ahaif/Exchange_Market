# Engineering audit and evidence inventory

Scope: current working tree, active v1 source, tests, scripts, deployment records and CI. This is an engineering review, **not an independent contract audit**. Archived `legacy/` is historical reference, not an active implementation. Existing public addresses and contract source are preserved. No live-chain transactions or real private keys are used by this work.

## Evidence rules

Code establishes implementation; executable assertions establish the tested scenarios. A diagram, seeded transaction record, passing build or generated milestone label does not prove security or production readiness. Verification exit codes are recorded in [VERIFICATION.md](VERIFICATION.md). Synthetic benchmark output is separate from live network behavior.

## Critical-path inventory

| Capability | Implementation evidence | Executable evidence | Assessment / limit |
| --- | --- | --- | --- |
| Wallet connection | `app/page.tsx`: `connect`, account/chain event cleanup, `transact` | `test/v1/read-model.test.mjs`: session/gate unit checks | Implemented; no wallet/browser end-to-end test |
| ERC-20 approval | `funds`: allowance read, exact-amount `approve`, receipt wait, session recheck before deposit | `contracts.test.mjs`: allowance ownership; `read-model.test.mjs`: changed session rejects | Implemented; real wallet simulation not tested |
| Deposits | `Exchange.depositEther`, `depositToken`; `funds` | Contract regressions; adversarial fee/false/no-return fixtures | Tested for listed paths; immutable HAI only in deployed market |
| Order creation | `createOrder`, bigint total; `Exchange.makeOrder` | Pair, zero amount, balance and self-fill regressions | Full-fill orders, unreserved funds; no matching engine |
| Settlement | `Exchange.fillOrder` and balance mappings | Both unequal-asset directions; mined replay rejection; deterministic conservation trace | Tested; no formal proof or exhaustive fuzzing |
| Cancellation | `Exchange.cancelOrder`; `orderAction` | Unauthorized cancel, cancelled fill, filled-order cancel | Tested; race is resolved by transaction ordering |
| Withdrawals | `withdrawEther`, `withdrawToken`; `funds` | Excess balance, rejecting receiver rollback, reentrant receiver | Tested; no guarantee for every malicious token |
| Market reads | `readLatestOrders` in `lib/read-model.mjs`; page reader callback | Bound, concurrency, empty and invalid-bound assertions | Latest 100; three calls/order; not block-pinned |
| Event reads | `loadConfirmedTrades`; `historyRanges` | Range-policy tests; live RPC adapter not integration-tested | Last 50k blocks; no reorg invalidation; block/RPC failures propagate |
| OHLCV | `lib/candles.mjs`: `buildCandles` | Sorting, same-time IDs, gaps, invalid observations, interval checks | Tested aggregation; floating-point display values; no synthetic candles |
| Chart / table | `MarketChart.tsx`, `OrderTable.mjs` | Typecheck/build; actual table SSR benchmark | Implemented; visual performance and wallet automation blocked |
| Deploy / seed | `scripts/deploy.mjs`, `seed-exchange.mjs` | Seed interruption, nonce retry and idempotency test | Seed recovery tested; uncertain broadcast and failed saved transaction need manual recovery |
| Event replay read model | `aggregateOrderEvents` | Ordering, deduplication, missing-history test; synthetic benchmark | Experimental; **not used by live book**, no reorg handling |
| Off-chain services / L2 | No API/indexer/database/L2 deployment implementation found | None | Planned only |

Source links: [page](../app/page.tsx), [contracts](../src/contracts/Exchange.sol), [token](../src/contracts/Token.sol), [reads](../lib/read-model.mjs), [history](../lib/trades.ts), [candles](../lib/candles.mjs), [tests](../test/v1/), [CI](../.github/workflows/ci.yml).

## Changes made from the evidence

1. Extract bounded-read policy into the actual production path, retaining the 100-order / 10-concurrent-reader limits and public `loadConfirmedTrades` signature.
2. Add a synchronous transaction gate: React `busy` state alone is not an atomic exclusion mechanism. Revalidate account/revision/chain between token approval and deposit. Unit coverage proves the helper logic, not a complete wallet journey.
3. Extract the existing table into a shared component so rendering benchmarks exercise production markup instead of a look-alike fixture.
4. Add local adversarial receiver/token tests and a deterministic custody trace without changing deployed contract bytecode/source.
5. Make default boundary checks pattern-only, so security verification does not read operator credentials. Optional local-value matching remains available via `--include-local-values`, but was not used here.

## Priority-ranked findings

| Priority | Finding | Action / evidence |
| --- | --- | --- |
| P0 before any sensitive use | Historical credential exposure and untriaged repository dependency alerts | Rotate genuine historical credentials outside this task; triage [SECURITY.md](SECURITY.md). Current-tree scanning cannot erase history. |
| P1 | Approval continuation / overlapping submissions were insufficiently isolated | Gate and session helper added; browser integration coverage still required. |
| P1 | Reorgs and non-block-pinned reads can produce stale/inconsistent views | Add block-tagged snapshots and invalidate cached fills on canonical changes; independent of contract settlement. |
| P1 | Immutable token trust assumption is important | Incoming tax/false returns reject; outgoing tax is a demonstrated limitation for future tokens. Preserve deployed HAI-only configuration. |
| P1 | No exhaustive custody invariant or independent review | Added deterministic trace; next add stateful property testing and independent assessment. |
| P2 | Page still owns wallet, RPC and UI orchestration | Minimal adapters added; further service extraction should follow tested failure scenarios, not an architectural rewrite. |
| P2 | RPC work is bounded but expensive and polling is repetitive | Measure method count; use a block-consistent cache and eventual indexer. No unmeasured speedup claimed. |
| P2 | Browser metrics unavailable | Node SSR and local static transport measured; FCP/LCP/INP/CLS remain unmeasured. |
| P3 | Documentation duplicated current/future diagrams | Canonical diagrams now in [ARCHITECTURE.md](ARCHITECTURE.md); older entry points link there. |

## Existing documentation

[PROJECT_GUIDE](PROJECT_GUIDE.md) is the beginner walkthrough; [OVERVIEW](OVERVIEW.md) is the short entry point; [PROGRESS](PROGRESS.md) is a generated legacy milestone/source snapshot; [OPERATIONS](OPERATIONS.md) is the operator runbook. New [ENGINEERING_STATUS](ENGINEERING_STATUS.md) provides capability-level evidence and explicitly distinguishes implementation from testing.
