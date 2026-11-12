# Engineering status and acceptance criteria

Vocabulary: **Implemented** = code exists but full path not verified; **Tested** = explicit executable scenarios pass, with limits; **Experimental** = prototype/measurement not production-integrated; **Planned** = no implementation; **Blocked** = measurement/tooling unavailable here. These labels are not security certifications. Source/test links are relative to the repository root via `../`.

| Capability | Status | Description and source evidence | Test evidence | Known limit | Next acceptance criterion |
| --- | --- | --- | --- | --- | --- |
| Fixed-supply token | Tested | [Token.sol](../src/contracts/Token.sol), standard ERC-20 | [contracts tests](../test/v1/contracts.test.mjs) allowance/supply | No exhaustive standards conformance suite | Add transfer/allowance edge-case matrix |
| Custody / settlement | Tested | [Exchange.sol](../src/contracts/Exchange.sol), atomic ledger and fees | [adversarial tests](../test/v1/adversarial.test.mjs), unequal-direction regressions | Finite invariant trace; no formal audit | Stateful randomized properties across all actions |
| Reentrancy / transfer failure | Tested | Guarded debit-before-call withdrawals | Receiver guard-selector and rollback assertions | Token callbacks not exhaustive; outgoing tax limitation | Cross-function/token callback matrix |
| Approval / wallet lifecycle | Implemented | [page](../app/page.tsx), [session gate](../lib/transaction-session.mjs) | Helper tests in [read-model tests](../test/v1/read-model.test.mjs) | No complete wallet/browser test | Assert exact payloads and account/chain changes end to end |
| Bounded current reads | Tested | [read-model](../lib/read-model.mjs), production callback adapter | Cap/concurrency/range tests | Mixed-block snapshots possible | Pin to a block and test lag/reorg scenarios |
| Live trade history | Implemented | [trades.ts](../lib/trades.ts), event and block reads | Policy tested, full adapter not integration-tested | Window/cache not reorg-safe | Mock-provider and canonicality tests |
| OHLCV | Tested | [candles](../lib/candles.mjs) | [candle tests](../test/v1/candles.test.mjs) | Display precision and bounded observations | Test extreme magnitudes and malformed identities |
| Chart / trading screen | Implemented | [chart](../app/components/MarketChart.tsx), [table](../app/components/OrderTable.mjs) | Typed build and table SSR benchmark | No visual/interaction guarantee | Browser/wallet smoke and accessibility tests |
| Event replay | Experimental | `aggregateOrderEvents` in [read-model](../lib/read-model.mjs) | Replay ordering/dedup/missing-history tests | Not live source; no canonical rollback | Single-chain stream properties, then durable indexer |
| Local performance suite | Tested | [benchmarks](../benchmarks/), JSON outputs | Actual run evidence in [PERFORMANCE](PERFORMANCE.md) | Hardware/JIT/local EVM; not live-chain performance | Same-host repeated baselines after targeted optimization |
| Browser FCP/LCP/CLS/INP | Blocked | No browser measurements fabricated | Browser host unavailable | SSR/HTTP are not substitute Web Vitals | Run browser instrumentation in controlled environment |
| Static contract analysis | Blocked | Slither command unavailable | Exit 127 recorded | No analysis findings or success claim | Install isolated compatible Slither/native-solc and triage |
| Documentation / CI | Tested | [workflow](../.github/workflows/ci.yml), source freshness/link checks | [VERIFICATION](VERIFICATION.md) | Structural Mermaid checks, not full renderer parsing | Render diagrams in browser-enabled documentation CI |
| Durable indexer / database / API | Planned | [future architecture](ARCHITECTURE.md#future-architecture--all-components-below-not-implemented) | None | No PostgreSQL, API or worker deployed | Reorg-aware replay/backfill with migration and API contract tests |
| L2 release | Planned | Base Sepolia proposal only | None | Existing allowlists still local/Sepolia | Chain registry, isolated L2 gas/read tests and deliberate test release |
| Outfbox / token integration | Planned | README direction supplied by project owner | None | No product/token integration, backing or legal rights established | Written requirements, legal assessment and separately reviewed technical design |

## Engineering roadmap — separate from historical demo milestones

The older 7-item [PROGRESS.md](PROGRESS.md) measures delivery of the demo and remains historical implementation evidence. The six gates below measure the engineering work required next; they must not be converted into a misleading readiness percentage.

| Milestone | Current state | Acceptance gate |
| --- | --- | --- |
| 1. Engineering documentation and reproducibility | Implemented; validation evidence recorded | Trace source/tests, canonical diagrams/threat model, clean install, runnable local benchmark commands and honest limitations |
| 2. Security hardening and invariant testing | In progress | Triage dependency alerts, verify credential rotation outside repo, extend stateful invariants and token callbacks, execute static analysis, add wallet payload tests |
| 3. Performance optimization | Baseline measured; optimization planned | Use same-host baselines, block-consistent read/cache strategy, compare real request counts and browser traces without noisy CI latency gates |
| 4. Off-chain indexing and persistence | Planned | Canonical log identity, durable cursor/backfill, reorg rollback, PostgreSQL migrations, paginated API and recovery tests |
| 5. L2 testnet validation | Planned | Confirm chain choice, fresh isolated test contracts, execution/data-cost checks, verified source and two-wallet integration evidence |
| 6. Independent review and mainnet-readiness assessment | Planned | Independent security findings triaged, operational incident/backup/recovery drills, explicit release decision; not automatic deployment |

Recommended next milestone: finish milestone 2 before expanding token/network scope. Benchmark smoke in CI validates executability, not a performance SLA.
