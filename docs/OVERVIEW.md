# HAI Exchange: architecture and development overview

For the complete walkthrough, read [PROJECT_GUIDE.md](PROJECT_GUIDE.md). Start with [live development progress](PROGRESS.md), then [the delivery roadmap](ROADMAP.md). The current demo runs on Ethereum Sepolia (L1 testnet). An Ethereum L2 application is the next target, not the current deployment.

## What exists now

A fixed-supply HAI token and a fully on-chain HAI/ETH order book. A user deposits assets into the exchange contract, creates an order, and another wallet fills the whole order. A taker pays a 0.25% fee. Users sign transactions in their own wallets; contracts enforce accounting and custody deposited assets. The web operator does not execute visitor trades.

The public site and local development use the same Sepolia contracts and therefore share orders, trades and deposited balances. Seeded demo transactions are real testnet activity, not fake prices or external market data. The market can be read without connecting a wallet; connecting is required for deposits and trading.

See the canonical [current, sequence and future architecture diagrams](ARCHITECTURE.md).

## Stack and ownership

| Layer             | Current choice                                          | Responsibility / source                                                                                     |
| ----------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| UI                | Next.js App Router, React, TypeScript, CSS              | `app/`; responsive order book, balances, forms and transaction feedback                                     |
| Web output        | Static export                                           | `next.config.mjs`; `out/`; hosted on Sites                                                                  |
| Charts            | TradingView Lightweight Charts + OHLCV aggregation      | `app/components/MarketChart.tsx`, `lib/candles.mjs`; real fills, UTC buckets, candlestick/area/volume views |
| Chain access      | ethers v6                                               | `lib/contracts.ts`, `app/page.tsx`; public reads and wallet signing                                         |
| Token             | Solidity + OpenZeppelin ERC20                           | `src/contracts/Token.sol`; 1,000,000 HAI, no public mint                                                    |
| Exchange          | Solidity + SafeERC20 + ReentrancyGuard                  | `src/contracts/Exchange.sol`; immutable token and fee configuration                                         |
| Compilation       | solc-js 0.8.30, Shanghai EVM target, optimizer 200 runs | `scripts/compile.mjs`; `artifacts/` is generated                                                            |
| Deployment        | Node + ethers                                           | `scripts/deploy.mjs`; resumable public transaction records                                                  |
| Demo data         | Node + two signers                                      | `scripts/seed-exchange.mjs`; saved transaction checkpoints                                                  |
| Tests             | Node test runner + Ganache                              | `test/v1/`; Ganache is a legacy local test dependency, not an L2 node                                       |
| CI                | GitHub Actions                                          | Tests, build and documentation freshness                                                                    |
| Off-chain backend | Not implemented                                         | No API, database, auth service or indexer today                                                             |

Exact installed versions are generated from the lockfile into [PROGRESS.md](PROGRESS.md).

## How a trade connects end to end

1. Browser reads the configured deployment and public RPC. It reads the latest 100 orders and their filled/cancelled flags. Balances are wallet-specific and loaded after connection.
2. Wallet connection checks chain 11155111 and resets the session when the account or network changes.
3. ETH deposits call `depositEther`. HAI deposits first approve the exchange for the exact amount, wait for confirmation, then call `depositToken`.
4. Order values use bigint fixed-point arithmetic, not floating-point transaction amounts. Orders do not reserve funds, so multiple open orders can compete for the same balance.
5. A different wallet calls `fillOrder`. The contract rechecks maker funds, taker funds including fees, and order status. It moves ledger balances and emits `Trade` atomically.
6. The browser waits for confirmation, refreshes balances/orders, and links to the transaction explorer. A withdrawal updates the ledger before transferring the asset out.

## Data and credential boundaries

- **Chain is authoritative:** contract balances, orders, cancellation/fill flags and emitted events.
- **Repository is deployment evidence:** `deployments/11155111.json` and `.seed.json` contain only public addresses, receipts and step metadata. They are snapshots, not a live index.
- **Browser configuration is public:** `NEXT_PUBLIC_*` values can appear in the shipped JavaScript. The tracked Sepolia deployment is the default; explicit environment variables override it.
- **Credentials stay local:** deployer key in `.env.local`; generated demo taker key in `.env.demo.local`. Back up the latter locally if you want to retain control of its deposited test assets. No keys are sent in the website bundle.
- **Hosted source is sanitized:** publish only current app/source/docs and public deployment files. Exclude old environment files, legacy code and old Git history.

## Proposed full-stack L2 architecture

Base Sepolia is the proposed first L2 test environment, followed by Base mainnet only after readiness gates. This is a project recommendation, not an implemented chain switch. Base Sepolia uses chain 84532; see the [Base network documentation](https://docs.base.org/base-chain/quickstart/connecting-to-base).

See the canonical [current, sequence and future architecture diagrams](ARCHITECTURE.md).

Use a dedicated long-running worker for historical backfill, checkpoints and reorg recovery. Do not run indexing inside short-lived page requests. The API serves order history, chart candles and account activity; it does not hold trading keys or replace contract validation. PostgreSQL is a rebuildable read model keyed by chain ID, contract address, transaction hash and log index. Wallet signatures remain responsible for writes.

A production backend requires a server deployment separate from today's static export, or a deliberate migration to a server-capable Next.js deployment. A suggested layout is `apps/web`, `services/api`, `services/indexer`, and `packages/contracts`; do not restructure before those services are needed.

L2 inclusion, L1 settlement, and bridge withdrawal completion are different states. Account for sequencer outages and reorgs; do not call a sequencer receipt final settlement. See [Ethereum's optimistic rollup explanation](https://ethereum.org/developers/docs/scaling/optimistic-rollups/).

## Known limits and decisions still open

Latest 100 orders only; periodic polling; no pagination, complete historical index or external market-price feed. Chart history scans at most 50,000 blocks in 5,000-block chunks and resolves fill block timestamps; resolved fills are cached. Candles use UTC buckets, omit empty intervals and aggregate real HAI volume. Sample change/volume statistics are explicitly labeled; they are not 24-hour metrics. Prices are demo maker quotes. No public token faucet, partial fills, expiry, matching engine, reservations, API authentication or independent audit. Contracts are immutable; a changed implementation needs a fresh deployment and explicit migration plan. L2 deployment does not move L1 token balances or orders automatically. Choose a new L2 demo supply first; defer bridges and cross-chain asset claims until there is a concrete requirement.

## Trading terminal

The dark terminal arranges a candlestick/area chart and volume pane beside a price-sorted order book and limit order form. Clicking a quote populates the form. Recent activity and wallet/exchange balances sit below. Chart display numbers use floating point; submitted amounts retain bigint arithmetic. Visible TradingView attribution is retained. See `THIRD_PARTY_NOTICES.md`.

Engineering review: [audit](ENGINEERING_AUDIT.md), [architecture](ARCHITECTURE.md), [STRIDE model](SECURITY_THREAT_MODEL.md), [performance](PERFORMANCE.md) and [capability status](ENGINEERING_STATUS.md).
