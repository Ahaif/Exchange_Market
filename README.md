# HAI Exchange

A full-stack learning project evolving into an Ethereum L2 exchange. Today it runs as a **Next.js trading terminal backed by Solidity contracts on Ethereum Sepolia**.

[Live demo](https://hai-exchange-v1.serenecrown8.chatgpt.site) · [Architecture](docs/OVERVIEW.md) · [Progress](docs/PROGRESS.md) · [L2 roadmap](docs/ROADMAP.md)

## Run the project

You need **Node.js 22.13 or newer**, npm, and Git.

```bash
git clone https://github.com/Ahaif/Exchange_Market.git
cd Exchange_Market
npm ci
npm run dev
```

Open **http://localhost:3000**. That's enough to view the live order book and chart. You do **not** need Ganache, a local fork, a private key or an environment file to explore the UI. The deployed Sepolia contracts are configured by default. Press **Ctrl+C** to stop the app.

## Try a trade

1. Switch your browser wallet to **Ethereum Sepolia**, then click **Connect wallet**.
2. Get Sepolia test ETH for gas. Ask the demo operator for HAI test tokens; there is no public faucet yet.
3. Under **Assets**, deposit ETH or HAI. HAI requires an approval transaction followed by a deposit transaction.
4. Enter a limit price and amount, or click an order-book price to populate it. Place your order.
5. Use a second wallet with deposited assets to fill the order. Self-trades are blocked.
6. View the result under **Filled orders**, cancel your own open orders, or withdraw available assets.

The demo was seeded with **6 open orders, 3 fills and 1 cancellation**. Actual counts change as visitors trade. Candles and volume use confirmed trade execution times, not order creation times. The chart reads a bounded sample (latest 100 orders / last 50,000 blocks); it is **not a global price feed or a complete 24-hour market history**. Sparse history is shown honestly, without invented candles.

## Validate changes

```bash
npm test                 # contract, seed recovery and OHLCV aggregation tests
npm run typecheck        # TypeScript checks
npm run build            # production static export in out/
npm run docs:update      # regenerate development progress after changing source
npm run docs:check       # fail if development snapshot is stale
npm run security:check   # check tracked environment files / recognized credentials
```

Tests run against an isolated local EVM. They do not need private keys or spend Sepolia funds. GitHub Actions runs tracked-file credential checks, documentation checks, tests and the production build on pushes and pull requests. Ganache can print a native-module fallback warning on newer Node versions; it then uses its JavaScript implementation.

## What's inside

| Area           | Stack                                                            |
| -------------- | ---------------------------------------------------------------- |
| Trading UI     | Next.js App Router, React, TypeScript, responsive CSS            |
| Chart          | TradingView Lightweight Charts; confirmed-fill OHLCV aggregation |
| Wallet and RPC | ethers v6; public read access, wallet-signed writes              |
| Contracts      | Solidity, OpenZeppelin ERC20, SafeERC20, ReentrancyGuard         |
| Tooling        | solc-js, Node test runner, Ganache, GitHub Actions               |
| Hosting        | Static export on Sites                                           |
| Next stage     | Event indexer, PostgreSQL, TypeScript API, Base Sepolia          |

Today the chain is the backend. An off-chain API/database and L2 deployment are planned, not implemented. See [architecture and connections](docs/OVERVIEW.md) for the diagrams and [roadmap](docs/ROADMAP.md) for acceptance criteria.

## Best practices demonstrated

- **Standard contracts:** OpenZeppelin ERC-20 behavior instead of custom allowance logic; fixed token supply and immutable exchange configuration.
- **Checked settlement:** validate balances and order status, charge fees in the correct asset, and use checks before external transfers with a reentrancy guard.
- **Precise transaction values:** bigint/fixed-point arithmetic for submitted amounts; floating point is limited to charting and display estimates.
- **Clear transaction lifecycle:** wait for approval and transaction receipts, handle rejected signatures, and reset wallet state after account/network changes.
- **Recoverable operations:** save deployment and seed transaction checkpoints before waiting; rerunning reuses completed steps.
- **Bounded data access:** cap market reads, avoid overlapping polling, cache resolved fills, and distinguish sample statistics from full-history metrics.
- **Reproducible verification:** committed lockfile, meaningful regression tests, typed production builds and CI checks.
- **Honest progress:** milestone evidence, generated source fingerprints and a CI freshness check keep the roadmap tied to development.

See [security status and known tooling advisories](docs/SECURITY.md). These practices do not replace an independent security review. The current test suite does not prove complete protection against every adversarial token or reentrancy scenario.

## What I learned building this

- How a React interface connects wallet signatures, RPC calls, transaction receipts and contract events.
- How ERC-20 balances and allowances differ from balances held inside an exchange.
- Why unchecked accounting and a wrong asset mapping can break settlement even when a basic happy-path test passes.
- How to test failure paths, unequal trade quantities, duplicate fills and interrupted deployment/seeding operations.
- How event timestamps become deterministic candles and volume bars, and why sparse data must not be presented as a liquid market.
- How to modernize a legacy CRA/Redux/Truffle project while preserving the learning history under `legacy/`.
- How L2 execution, indexing, persistence and Ethereum settlement fit into the next full-stack architecture.

## Configuration and operator commands

**Only operators need private configuration.** If `.env.local` does not exist, copy `.env.example` to it. Never overwrite an existing environment file containing keys.

- `NEXT_PUBLIC_*`: browser-visible chain, address and public read RPC settings. Never put secrets here.
- `RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `FEE_ACCOUNT`: local deployment/seeding configuration.
- `.env.demo.local`: generated local demo-trader key; never commit or publish it.

```bash
npm run contracts:compile
npm run contracts:deploy   # intentional deployment/resume; spends testnet gas
npm run contracts:seed     # intentional demo transactions/resume; spends testnet gas
npm run chain              # optional local chain, not needed for the Sepolia demo
```

Detailed setup, seed funding, checkpoint recovery and publication instructions are in [the operator guide](docs/OPERATIONS.md). Deploy the static `out/` directory after building; `npm start` is not used for this export.

## Public contracts and security boundaries

| Contract  | Ethereum Sepolia                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| HAI token | [0xDE92DBfbb6338E5e883596d4BeA582ca7E525e2a](https://sepolia.etherscan.io/address/0xDE92DBfbb6338E5e883596d4BeA582ca7E525e2a) |
| Exchange  | [0x60dB75e1304F1b618F90DB444F3F4ef0ab15ef05](https://sepolia.etherscan.io/address/0x60dB75e1304F1b618F90DB444F3F4ef0ab15ef05) |

- Testnet demo only: test assets have no monetary value; contracts are unaudited.
- Only public deployment records belong in `deployments/`. Private keys, environment files, generated artifacts and local demo credentials stay ignored.
- The original repository contained tracked credentials. Removing current files does **not** erase Git history. Any real credentials previously committed must be rotated. Historical commits are not rewritten by this update.
- Visitors sign transactions in their wallets. The browser never receives an operator key. Deposited assets are held by the exchange contract.
- Orders fill in full and do not reserve funds. Maker withdrawals can leave unfillable orders; settlement rechecks balances. Takers pay 0.25% in the asset they send.

Chart attribution and licensing: [third-party notices](THIRD_PARTY_NOTICES.md).
