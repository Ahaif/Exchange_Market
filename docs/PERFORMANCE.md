# Reproducible performance baseline

These are **measured local synthetic results**, not live Sepolia throughput, mainnet gas prices, browser Web Vitals or production SLAs. No previous comparable baseline exists, so no speedup is claimed. Raw [contracts](../benchmarks/results/contracts.json), [data](../benchmarks/results/data.json), [frontend](../benchmarks/results/frontend.json) and [build](../benchmarks/results/build.json) JSON preserve the environment and results.

## Reproduce

```sh
npm ci
npm run benchmark
# Or: benchmark:contracts, benchmark:data, benchmark:frontend, benchmark:build
npm run benchmark:smoke
```

Full suite runs each category in a separate sequential Node process. Smoke uses five samples and smaller datasets, excludes build/HTTP, writes ignored smoke-* JSON and checks execution only. No live RPC endpoint, wallet key or funding is required. The build category uses a fresh allowlisted checkout per run and excludes environment files and inherited credential variables; it removes only its own temporary directory. Benchmark commands do not run deployment/seed entry points.

## Environment

- Apple M5; 10 logical CPUs; 16 GiB memory; darwin 25.6.0; arm64.
- Node v25.8.1; Ganache 7.9.2; ethers 6.17.0; solc 0.8.30; Next 16.4.6; React 19.3.1.
- Contract source SHA-256: `6e03a88b9ca3f453fbc0a0c51dc5dea74e460e1c44b3501eee267561c46741f6`.
- Synthetic chain 31337, Shanghai, deterministic Ganache accounts, starting time 2026-01-01 UTC, one-second block timestamp increments; optimizer 200 runs and Shanghai bytecode target.
- Local Node is newer than the CI Node 22 line; do not compare timings across those environments. Ganache used its JavaScript fallback because the native µWS binary does not match this host's Node ABI.

## Sampling policy

Five warmups, then 100 repeated samples for gas/data/render work. Percentiles use nearest-rank order statistics: p50, p95, p99 are empirical, not confidence bounds; 100 samples provide only a coarse tail estimate. Fewer than 20 samples suppress p95; fewer than 100 suppress p99. Three fresh builds report min/median/max only. Fixtures and operation order are deterministic, wall-clock times are not. Reversed monotonic timestamps favor adaptive sort run detection; these inputs are not a worst-case sort workload. OS cache, JIT/GC, thermal conditions and background processes are uncontrolled; the initial full run overlapped briefly with a TypeScript check. Use an idle same-host environment for defensible comparisons.

## A. Contract gas

Transaction receipt `gasUsed`, **not estimated gas**, with 100 measured samples per operation. Both users have existing ETH/HAI deposits; fee and balance slots are warmed. The create-fill-cancel recipe and fresh IDs are in [contracts.mjs](../benchmarks/contracts.mjs). First-ever cold/zero-to-nonzero transitions can differ and are not represented by this warmed baseline. Token approval and deployment gas are outside this table.

| Operation | p50 gasUsed | p95 | p99 |
| --- | --- | --- | --- |
| depositEther | 31233 | 31233 | 31233 |
| withdrawEther | 38685 | 38685 | 38685 |
| depositToken | 55092 | 55092 | 55092 |
| withdrawToken | 47665 | 47665 | 47665 |
| makeOrder | 166876 | 166876 | 166876 |
| fillOrder | 95071 | 95071 | 95071 |
| cancelOrder | 51970 | 51970 | 51970 |

Local submit-to-receipt wall timings are retained in JSON but are in-process simulator timings, not real block latency or network throughput. No ETH/USD fees or L2 data-cost estimates are inferred.

## B. Data processing

Seed-42 LCG generates sizes of 1k/10k/100k orders and observations. Prices/quantities vary deterministically, fills are seven seconds apart, and observations are reversed. Event streams contain Order plus Trade/Cancel records (one stream/contract, no reorgs). The reducer is experimental, not the live book source.

| Orders / observations | Event records | Replay p50 / p95 / p99 ms | OHLCV p50 / p95 / p99 ms |
| --- | --- | --- | --- |
| 1000 | 1667 | 0.143 / 0.203 / 0.212 | 0.040 / 0.052 / 0.087 |
| 10000 | 16667 | 1.734 / 2.054 / 2.778 | 0.185 / 0.233 / 0.342 |
| 100000 | 166667 | 21.576 / 29.870 / 45.394 | 2.330 / 3.734 / 8.473 |

Bounded current reads select 100 records with at most 10 concurrent order callbacks: **300 per-order RPC method calls**, independent of historical count. The production refresh adds token identity, order count and fee (3 fixed calls), plus 4 balance calls when connected; provider chain-ID/transport batching and history calls are separate. These are method counts, not HTTP request counts. Historical policy emits at most 10 ranges of 5,000 blocks, plus a block-number read and unique fill-block header reads. Injected-reader latency in JSON has **zero network delay** and measures scheduling only. A fake provider cannot establish RPC availability, latency or response-size safety.

## C. Frontend and build

Actual [OrderTable](../app/components/OrderTable.mjs) rendered with React's production Node server renderer. Actions are static fixture strings. Larger tables intentionally exceed the application's 100-order cap; no claim is made that the live UI should display them.

| Rows | HTML bytes | Server render p50 / p95 / p99 ms |
| --- | --- | --- |
| 100 | 11641 | 0.084 / 0.200 / 0.264 |
| 1000 | 115973 | 0.749 / 1.159 / 2.480 |
| 10000 | 1168253 | 8.828 / 10.400 / 18.101 |

Three fresh isolated production builds: **4326.941 / 4403.258 / 6216.245 ms min / median / max**. Dependencies and OS caches are shared; each build gets a new .next/output directory. No build p95/p99 is reported.

Generated initial HTML: 12102 bytes, 8 external script tags. Loopback static HTTP, 100 samples after five warmups: header-arrival p50/p95/p99 **0.135 / 0.295 / 0.431 ms**; complete-response **0.152 / 0.335 / 0.475 ms**. This has no internet latency/TLS/CDN and does not request scripts or execute JavaScript; script count is markup evidence, not a measured resource waterfall.

**Browser metrics blocked:** CUA inventory returned “The browser access host is unavailable.” FCP, LCP, CLS, INP, hydration, chart canvas rendering, real interactions and wallet flows are not measured. SSR and loopback HTTP must not be presented as browser page-load performance.

## Bottlenecks and opportunities

1. Current per-order flag reads dominate method count even though display size is bounded. Block-pinned snapshots and canonicality-aware caching are the first measurable optimization.
2. Repeated history scans and block headers depend on provider limits. A durable reorg-aware indexer is a future architecture, not a benchmark-proven improvement.
3. Rendering above the 100-row cap grows with generated markup. Browser tracing is needed before deciding on virtualization or changing the cap.
4. Event replay sorting/dedup and OHLCV grouping allocate arrays/maps. Compare streaming/incremental alternatives on the same fixtures before claiming efficiency gains.
5. Replace legacy Ganache when validating another EVM implementation or L2 fee model. No simulation result establishes L2/mainnet behavior.

CI runs benchmark smoke without unstable latency thresholds. Checked-in full JSON is a point-in-time baseline; reruns overwrite it and should be reviewed with host/software/fixture differences.
