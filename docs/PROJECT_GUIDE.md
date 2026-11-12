# HAI Exchange — complete project guide

This is the starting point for understanding the project again after a break. It describes what is implemented today, where it runs, how the parts connect, and what remains planned.

**Last deployment check: 12 November 2026.** The public site was active, both Sepolia contracts had deployed code, and the exchange contained 10 orders. Live counts can change.

[Public demo](https://hai-exchange-v1.serenecrown8.chatgpt.site) · [GitHub repository](https://github.com/Ahaif/Exchange_Market) · [Current progress](PROGRESS.md) · [Roadmap](ROADMAP.md)

## 1. Clear project description

HAI Exchange is a cryptocurrency exchange learning project for the **HAI / ETH** pair. It began as a CRA/Redux/Truffle bootcamp exercise and has been rebuilt with Next.js, TypeScript and safer Solidity contracts.

A participant deposits test assets into an exchange contract, creates a limit order, and a different participant fills that order. The contract checks balances, settles the trade and charges a fee. The browser provides the trading interface; the blockchain holds the authoritative balances and orders.

The current version is a **testnet decentralized application with a static web frontend and an on-chain backend**. It does not yet have an off-chain application API, PostgreSQL database or durable event indexer. Those are the next full-stack stages. The proposed L2 target is Base Sepolia, followed by a separately reviewed production decision. Current contracts are on Ethereum Sepolia, not on an L2.

## 2. Where it runs and what stays available

| Part | Where it runs | Does your laptop need to stay on? | What persists? |
| --- | --- | --- | --- |
| Public website | Sites: [hai-exchange-v1.serenecrown8.chatgpt.site](https://hai-exchange-v1.serenecrown8.chatgpt.site) | No | Published HTML, CSS and JavaScript |
| Local development UI | Your machine at `http://localhost:3000` | Yes, while using localhost | Source files; temporary UI state is not durable |
| Token and exchange | Ethereum Sepolia, chain ID `11155111` | No | Contract code, balances, orders and events |
| Source and documentation | [GitHub](https://github.com/Ahaif/Exchange_Market) | No, after changes are pushed | Committed source and public deployment records |
| Deployment/seed scripts | Your machine when you deliberately run them | Only while a script is executing | Public transaction checkpoints in `deployments/` |
| Local automated test chain | Temporary Ganache instance started by the tests | Yes, during tests | Nothing after the test run; separate from Sepolia |
| Private credentials | Ignored local environment files | Not relevant to hosting uptime | Only your local copies/backups; not GitHub |

**The public demo does not stop when you close your editor, stop `npm run dev`, or switch off your laptop.** Its availability still depends on hosting, the RPC provider and the testnet; there is no promise of uninterrupted or permanent availability. No local server or seeding process must run continuously.

**The deployed contracts do not need a continuously running process on your machine.** They store state on Sepolia and execute when a transaction calls them. Reading state does not need a signed transaction. Writes need a wallet signature and Sepolia ETH for gas. There is no recurring deployment gas payment simply to keep the contract stored.

These contracts have no owner upgrade, reset or deletion function. Editing Solidity locally does not update deployed code. A new implementation requires a fresh deployment and an explicit migration plan. Testnets can eventually be retired; Sepolia is not a promise of permanent production storage. See [Ethereum smart contracts](https://ethereum.org/developers/docs/smart-contracts/) and [Ethereum networks](https://ethereum.org/developers/docs/networks/).

### Current public deployment

| Contract | Address |
| --- | --- |
| HAI token | [0xDE92DBfbb6338E5e883596d4BeA582ca7E525e2a](https://sepolia.etherscan.io/address/0xDE92DBfbb6338E5e883596d4BeA582ca7E525e2a) |
| Exchange | [0x60dB75e1304F1b618F90DB444F3F4ef0ab15ef05](https://sepolia.etherscan.io/address/0x60dB75e1304F1b618F90DB444F3F4ef0ab15ef05) |

Website release evidence: [website.json](../deployments/website.json). Contract transactions and deployment block: [11155111.json](../deployments/11155111.json). Seed transactions: [11155111.seed.json](../deployments/11155111.seed.json).

## 3. Architecture

See the canonical [current, sequence and future architecture diagrams](ARCHITECTURE.md).

The wallet signs; RPC nodes transport requests; contracts validate state changes. The hosting service serves the interface and does not hold visitor trading keys. Assets deposited into the exchange are held by the contract, not merely displayed in a browser balance.

## 4. Stack used

| Layer | Technology | Why it is used |
| --- | --- | --- |
| Web app | Next.js App Router, React, TypeScript | Component-based UI, typed integration and static production builds |
| Design | Responsive CSS | Desktop trading terminal and smaller-screen layouts |
| Charts | TradingView Lightweight Charts | Interactive candlesticks, area view, volume, crosshair and zoom |
| Chain integration | ethers v6 | RPC reads, wallet providers, contract calls, transaction receipts and unit conversion |
| Contracts | Solidity | Token ownership, custody accounting, orders and trade settlement |
| Contract libraries | OpenZeppelin ERC20, SafeERC20, ReentrancyGuard | Standard token behavior, token-transfer handling and guarded external-transfer paths |
| Compiler | solc-js `0.8.30` | Optimized bytecode; Shanghai EVM target; optimizer set to 200 runs |
| Tests | Node test runner + Ganache | Isolated contract, seed recovery and candle-aggregation tests |
| Dependency management | npm + committed lockfile | Reproducible dependency installation with `npm ci` |
| Automation | GitHub Actions | Tracked-file credential check, documentation freshness, tests and build |
| Hosting | Sites static deployment | Public access independent of a local development server |

Exact locked versions are generated into [PROGRESS.md](PROGRESS.md). Ganache is a legacy local test dependency with known advisories; see [SECURITY.md](SECURITY.md).

## 5. File structure and where to look

```text
Exchange_Market/
├── app/
│   ├── page.tsx                    Trading terminal, wallet lifecycle and user actions
│   ├── layout.tsx                  Root document and page metadata
│   ├── globals.css                 Terminal design and responsive layouts
│   └── components/                 MarketChart plus shared production OrderTable
├── lib/
│   ├── contracts.ts                Public network settings, addresses and human-readable ABIs
│   ├── trades.ts                   Bounded Trade-event reads and execution timestamps
│   └── candles.mjs                 Pure UTC OHLCV aggregation
├── src/contracts/
│   ├── Token.sol                   Fixed-supply HAI ERC-20
│   ├── Exchange.sol                Custody, order lifecycle, settlement and fees
│   └── Migrations.sol              Historical Truffle helper; not compiled/deployed by v1 scripts
├── scripts/
│   ├── compile.mjs                 Compile Token and Exchange into artifacts/
│   ├── deploy.mjs                  Resumable contract deployment
│   ├── seed-exchange.mjs           Resumable two-trader demo seeding
│   ├── update-progress.mjs         Generate/check the development snapshot
│   └── check-boundaries.mjs        Limited tracked-file credential checks
├── benchmarks/                     Isolated local suites and measured JSON baselines
├── test/v1/
│   ├── contracts.test.mjs          Token, settlement, fee and failure-path regressions
│   ├── seed.test.mjs               Seed interruption/retry/rerun behavior
│   └── candles.test.mjs            Candle ordering, OHLCV and invalid inputs
├── deployments/                    Public contract, website and seed transaction records
├── docs/                           This guide, architecture, operations, security and roadmap
├── legacy/                         Archived CRA/Redux/Truffle implementation; not used by v1
├── licenses/                       Chart library license
├── .github/workflows/ci.yml        CI validation steps
├── .openai/hosting.json            Public Site identity and static output directory
├── .env.example                   Public template; no actual private keys
├── package.json / package-lock.json Commands and locked dependencies
├── next.config.mjs                 Static export configuration
└── AGENTS.md                       Instructions to keep code and documentation synchronized
```

Generated or private directories/files are ignored: `node_modules/`, `.next/`, `out/`, `artifacts/`, `.env.local`, `.env.demo.local`. There is no need to restore the old `src/abis/` layout: the v1 browser uses the ABIs in `lib/contracts.ts`; deployment uses generated `artifacts/`.

## 6. Domain and app components

| Concept / component | Meaning and responsibility |
| --- | --- |
| HAI | Fixed-supply ERC-20 token: 1,000,000 tokens, 18 decimals; initially assigned to the deployer |
| ETH | Native Sepolia test asset; represented by the zero address in exchange accounting |
| Wallet balance | Assets held directly by a participant's wallet |
| Exchange balance | Assets deposited into contract custody and available for trades or withdrawal |
| Maker | The participant creating an order |
| Taker | A different participant filling an existing order |
| Order | Maker, requested asset/amount, offered asset/amount, ID and creation timestamp |
| Order state | Open, filled or cancelled; separate flags track terminal states |
| Fee account | Immutable fee recipient; fee rate is 25 basis points (0.25%) in this deployment |
| Order book | Client view of open bids and asks, sorted by price; depth bars show cumulative displayed HAI quantity |
| Trade ticket | Limit price and HAI amount inputs; submits a new order, not an automatic market match |
| Activity table | Open, filled and connected-wallet orders; exposes fill/cancel actions where allowed |
| Assets panel | Wallet/exchange balances and deposit/withdraw actions |
| Chart | Price and HAI volume derived from confirmed fills, with UTC time buckets |

**There is no automatic matching engine.** A user chooses an order and submits `fillOrder`. Clicking a quote in the book only populates the limit-price input. Orders are all-or-nothing and do not reserve assets, so an open order can become unfillable after a maker withdrawal or another fill.

## 7. Communication and integration flows

### Reading the market

1. `lib/contracts.ts` selects the Sepolia deployment by default, with optional public environment overrides.
2. The page creates a public JSON-RPC provider without requesting a wallet connection.
3. It reads the contract's token setting, fee, order count and latest 100 order records/status flags.
4. Open bids/asks are derived locally. Connected-wallet balances are read only when an account is available.
5. Missing fill history is read through `lib/trades.ts`; event block timestamps become execution times for chart observations.
6. React updates the tables and statistics; `MarketChart.tsx` sends aggregated data to Lightweight Charts.

Reads refresh every 15 seconds while the page is mounted. Polling does not create trades or spend gas. There is no background matching or seeding service.

### Depositing HAI

See the canonical [current, sequence and future architecture diagrams](ARCHITECTURE.md).

ETH deposits use `depositEther` with a transaction value and need no ERC-20 approval. Withdrawals debit exchange balances and transfer the requested asset back to the wallet.

### Placing and filling an order

The browser converts decimal inputs with `parseEther`, calculates total ETH using bigint arithmetic, and asks the wallet to call `makeOrder`. The contract validates the pair, nonzero quantities and maker balance. A different participant later calls `fillOrder`; contract checks and settlement are the authority, even if a browser view is stale. Confirmation triggers a refresh. Wallet account/network changes clear the session and require reconnection.

## 8. Business logic and algorithms

### Settlement and fees

For an order, let `amountGet` be what the maker wants and `amountGive` what the maker offers:

```text
fee = floor(amountGet × feeBps / 10,000)

Taker requested-asset balance -= amountGet + fee
Maker requested-asset balance += amountGet
Fee account requested-asset balance += fee
Maker offered-asset balance -= amountGive
Taker offered-asset balance += amountGive
```

The contract checks both balances first and marks the order filled. The updates are atomic: a revert undoes the transaction's state changes. Solidity checked arithmetic rejects overflow/underflow. Mapping-based settlement uses a fixed number of balance/order operations rather than searching the full order book.

Example: a maker buys 100 HAI for 0.0001 ETH. The taker supplies 100.25 HAI, the maker receives 100 HAI, 0.25 HAI goes to the fee account, and the taker receives 0.0001 ETH. The fee is in HAI in this example, not ETH. If the maker is also the fee recipient, that wallet's net HAI credit includes the fee too.

### Price calculations and order-book sorting

- Submitted quantity and price are parsed into 18-decimal integers. Total ETH is `quantity × unitPrice / 10^18`, rounded down to wei; zero-value results are rejected.
- Displayed order price is derived from the actual offered/requested ratio. Bids sort highest first; asks sort lowest first. Sorting is approximately `O(n log n)` for the bounded client list.
- Depth bars accumulate displayed HAI quantities on each side; they visualize quotes, not locked or guaranteed liquidity.
- No AMM, liquidity pool, external price oracle, automatic crossing or partial-fill algorithm is implemented.

### Candles and volume

`lib/candles.mjs` sorts confirmed observations by execution timestamp, then order ID for a deterministic same-time tie-break. For the selected 1-minute, 5-minute or 1-hour interval:

```text
bucket start = floor(executionTimestamp / intervalSeconds) × intervalSeconds
open  = first trade price in bucket
high  = highest trade price in bucket
low   = lowest trade price in bucket
close = last trade price in bucket
volume = sum of traded HAI quantities in bucket
```

A map groups buckets after sorting: approximately `O(t log t)` time plus `O(t)` grouping work. Empty intervals are not filled with invented observations. Invalid nonpositive/nonfinite observations are excluded. Floating-point numbers are used for chart rendering and display estimates only; submitted transaction amounts retain bigint arithmetic.

Chart scans cover at most the last 50,000 blocks, in 5,000-block RPC ranges, for fills belonging to the latest 100 orders. Trade events identify the order; block headers provide fill timestamps. Loaded fill observations are cached in the browser. Statistics are labeled as a loaded sample, not complete 24-hour volume/change. An older seed may eventually fall outside a fresh browser's history window while still existing on-chain.

### Deployment and seed recovery

Scripts save transaction hashes before waiting for confirmation. A rerun reads the saved checkpoint instead of submitting completed steps again. Seeding uses two different wallets because self fills are rejected. Rejected stale gas estimates may be retried before submission; the signers' nonce managers are reset after such rejection. An uncertain broadcast is not automatically retried. A local lock prevents two seed runners from writing the same checkpoint concurrently.

## 9. Deployment model

There are **two separate deployments**:

1. **Contracts:** `compile.mjs` builds bytecode; `deploy.mjs` sends signed creation transactions, waits for receipts and records addresses. Contracts stay on Sepolia independently of hosting.
2. **Website:** `npm run build` produces a static `out/` directory. Publishing uploads that client bundle to Sites. This neither changes Solidity nor creates new contract addresses.

Deploying a website update does not automatically deploy new contracts. Pushing to GitHub runs the configured validation workflow; the repository has **no GitHub-to-Sites automatic deployment step**. Website publication remains a separate operation.

The hosted source package is sanitized: no local environment files/private keys, old Git history or archived legacy implementation. The public contract addresses are deliberately visible. `RPC_URL` is an operator setting; `NEXT_PUBLIC_RPC_URL` is browser-visible read configuration. Wallet writes use the wallet's own provider.

## 10. How to run and test

### View the public demo

Open [the public website](https://hai-exchange-v1.serenecrown8.chatgpt.site). No install, fork or wallet is required to read its market. Trading requires a Sepolia wallet and test assets.

### Run locally against the existing contracts

Use Node.js 22.13 or newer:

```bash
git clone https://github.com/Ahaif/Exchange_Market.git
cd Exchange_Market
npm ci
npm run dev
```

Open **http://localhost:3000**. No `.env.local` is needed for the default read-only Sepolia view. Local and hosted UIs share the same chain state. Stop the local server with **Ctrl+C**.

### Run automated validation

```bash
npm test
npm run typecheck
npm run build
npm run security:check
npm run docs:check
```

`npm test` starts an isolated test EVM and compiles the contracts. It does not need production/operator credentials and does not send Sepolia transactions. `npm run build` creates the static export; do not use `npm start` to serve this export.

### Try the wallet flow manually

1. Select Ethereum Sepolia in your browser wallet and connect.
2. Obtain Sepolia ETH for gas and HAI from the demo operator. Add the HAI token address as a custom token if needed; it has 18 decimals.
3. Deposit an asset; for HAI confirm both approval and deposit transactions.
4. Place an order, then use a separate wallet with enough deposited assets to fill it.
5. Verify balances, fee settlement and filled status; cancel another order and try a withdrawal.
6. Check transaction receipts on the explorer. A rejected/failed transaction should not be presented as a successful trade.

### Operator-only commands

Use existing ignored `.env.local` credentials, or create that file from `.env.example` if it does not already exist. Never paste private keys into chat or overwrite an existing key file.

```bash
npm run contracts:compile
npm run contracts:deploy   # intentional deployment/resume, not needed to view the demo
npm run contracts:seed     # intentional testnet funding/orders, not a permanent service
npm run chain              # optional local chain; not required for Sepolia
```

The seed recipe creates 10 orders: 6 open, 3 filled and 1 cancelled at initial verification. Its rerun reuses saved transactions; it does not replenish every order after visitors trade. Detailed funding, key handling and recovery instructions: [OPERATIONS.md](OPERATIONS.md).

## 11. Performance, testing and security work

| Area | Implemented actions | Remaining limits |
| --- | --- | --- |
| Web delivery | Static prebuilt assets; no always-on application server needed | Hosting availability and browser/RPC connectivity still matter |
| Market reads | Latest 100 orders; batched concurrent reads; 15-second polling; overlapping poll prevention | Not a full event index; RPC calls increase with loaded order count |
| UI consistency | Request/session guards reject stale read results after account/provider changes | Browser wallet automation has not been completed |
| History | Bounded log ranges; unique block timestamp requests; resolved fill cache | Old trades outside the window are absent from a fresh chart |
| Computation | Local sorting and map-based candle aggregation; bigint transaction arithmetic | Display/plot values are rounded; depth is not reserved liquidity |
| Contract operations | Optimized compilation, direct mapping lookups, standard libraries | No claim of measured production gas optimality |
| Regression tests | 20 test cases covering allowances, both trade directions, fees, insufficient funds, order validation, cancellation, withdrawals, seed interruption/retry/idempotency and candle aggregation | No complete adversarial-token suite, invariant/fuzz suite or independent audit |
| CI | Tracked credential patterns, progress freshness, tests and typed production build | Local successful checks are distinct from a particular remote Actions run |
| Token/custody security | OpenZeppelin ERC20/SafeERC20, checked arithmetic, balance validation and guarded withdrawals | Contracts hold deposits; a contract bug remains a custody risk |
| Secrets | Ignored private environment files; public/private settings separated; tracked-file checks | Pattern checks are incomplete; original Git history contained credential material |
| Dependency review | Point-in-time audit findings documented | Local audit found Ganache-subtree advisories; GitHub separately reported 66 repository vulnerabilities pending triage. Maintained test-runner migration is planned |

The last implementation validation passed all 20 tests, the production build, TypeScript and documentation/credential checks. Automated visual/browser interaction verification was unavailable. See [SECURITY.md](SECURITY.md) for exact limits and audit findings. No feature in this guide should be read as an independent security certification.

## 12. Key learning outcomes

1. **A dApp has separate lifecycles:** source, web hosting, wallet session, RPC access and on-chain state are different systems. Stopping one does not automatically erase the others.
2. **Standards matter:** ERC-20 allowance ownership and transfer semantics are safer to inherit from reviewed libraries than to invent casually.
3. **Accounting is the core exchange logic:** the correct asset mapping, fee base and existing balance credits matter more than a polished trading screen.
4. **Test failures, not only happy paths:** unequal quantities and both trade directions exposed problems that superficially passing tests could miss.
5. **Transactions have stages:** approval, submission, inclusion and confirmation are different; interruptions and rejected estimates need deliberate recovery and nonce handling.
6. **Numbers have different requirements:** money-like contract values use fixed-point integers; chart numbers are presentation values with explicit precision limits.
7. **Events are not an instant database:** reconstructing trading history requires event IDs, block timestamps, bounded reads and eventually durable indexing/reorg handling.
8. **Charts must tell the truth:** three confirmed demo fills are not a liquid 24-hour market. Sparse data and sample limits must be visible.
9. **Public code requires credential discipline:** deleting a current file does not remove historical exposure; source publication and runtime configuration need separate boundaries.
10. **Progress needs evidence:** architecture notes, milestone status, test coverage and public deployment records should change with the implementation.

## 13. Resume development without losing the thread

Use this reading order:

1. **This guide:** what the project is and how it works.
2. **[PROGRESS.md](PROGRESS.md):** generated stack/deployment snapshot and current milestone evidence.
3. **[ROADMAP.md](ROADMAP.md):** next delivery gates; M1–M3 are complete, M4 is in progress, M5–M7 are planned.
4. **[SECURITY.md](SECURITY.md):** known risks before modifying deployment or credentials.
5. **[OPERATIONS.md](OPERATIONS.md):** deployment, funding and seed recovery details.

After changing code, update relevant explanations and `docs/roadmap.json`, then run:

```bash
npm run docs:update
npm run docs:check
```

CI rejects a stale generated snapshot; it does not infer that a planned feature is finished or validate every sentence of prose. `AGENTS.md` asks future coding sessions to keep this documentation synchronized. Commit and push changes to retain them on GitHub. Ignored keys need separate private backups; never add them to Git to preserve progress.

The next technical stages are easier test-token onboarding and browser tests, then a reorg-aware event indexer, PostgreSQL, a paginated API, observability and a fresh Base Sepolia release. Mainnet is a later decision gated by security review and operational readiness. See [the L2 roadmap](ROADMAP.md).

For the current engineering evidence, use [ENGINEERING_AUDIT.md](ENGINEERING_AUDIT.md), [ENGINEERING_STATUS.md](ENGINEERING_STATUS.md) and [PERFORMANCE.md](PERFORMANCE.md). Older validation statements describe their historical release; the current command ledger is [VERIFICATION.md](VERIFICATION.md).
