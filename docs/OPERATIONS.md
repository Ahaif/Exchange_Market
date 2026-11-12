# HAI Exchange operator guide

A Next.js / TypeScript HAI–ETH exchange with persistent contracts on **Ethereum Sepolia**. Real testnet orders and trades; no local fork required. The original CRA/Redux/Truffle learning implementation is archived in `legacy/`.

**[Public demo](https://hai-exchange-v1.serenecrown8.chatgpt.site)** · **[Development progress](PROGRESS.md)** · **[Architecture and stack](OVERVIEW.md)** · **[L2 roadmap](ROADMAP.md)**

The demo includes intentionally seeded testnet activity. Visitors can read the market without a wallet. Trading needs a Sepolia wallet, test ETH for gas, and HAI distributed by the operator. This is unaudited demo software; test assets have no monetary value.

## Run locally against the deployed Sepolia contracts

Use Node 22 LTS (22.13 or newer):

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The tracked deployment below is used by default. Local and public clients share the same blockchain state; stopping your laptop does not delete orders. No environment file is needed just to view the Sepolia market.

| Deployment              | Value                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Network / chain ID      | Ethereum Sepolia / `11155111`                                                                                                 |
| HAI token               | [0xDE92DBfbb6338E5e883596d4BeA582ca7E525e2a](https://sepolia.etherscan.io/address/0xDE92DBfbb6338E5e883596d4BeA582ca7E525e2a) |
| Exchange                | [0x60dB75e1304F1b618F90DB444F3F4ef0ab15ef05](https://sepolia.etherscan.io/address/0x60dB75e1304F1b618F90DB444F3F4ef0ab15ef05) |
| Token supply / decimals | 1,000,000 HAI / 18                                                                                                            |
| Taker fee               | 25 basis points / 0.25%                                                                                                       |
| Deployment records      | [deployments/11155111.json](../deployments/11155111.json)                                                                     |

To override configuration, create `.env.local` from `.env.example` **only if it does not already exist**. Never overwrite your existing keys. `NEXT_PUBLIC_CHAIN_ID`, token/exchange addresses and `NEXT_PUBLIC_RPC_URL` are public browser settings. The default public read RPC is `https://ethereum-sepolia-rpc.publicnode.com`; writes use the connected wallet's provider. Use a dedicated public read provider if traffic outgrows the shared endpoint.

## Tests and build

```sh
npm test                 # contract regressions + seed integration; isolated local EVM
npm run typecheck
npm run build            # typed static production export in out/
npm run docs:update      # refresh tracked development snapshot after source changes
npm run docs:check       # fail if snapshot is stale; also enforced by CI
```

The automated tests do not spend Sepolia ETH or need `.env.local`. On newer Node versions Ganache may print a native-module fallback warning and use its JavaScript implementation. Do not use `npm start` for this static export; deploy `out/` to a static host. The development UI runs with `npm run dev`.

## Seed the exchange

The included demo recipe funds a separate trader, deposits assets, creates buy/sell quotes, fills three orders with the second trader, and cancels one. Orders have different prices and quantities so each state is visible.

| Seeded activity  | Count |
| ---------------- | ----- |
| Open buy orders  | 3     |
| Open sell orders | 3     |
| Filled orders    | 3     |
| Cancelled orders | 1     |

To run or resume the same recipe:

1. Set `RPC_URL` to a Sepolia HTTPS endpoint and `DEPLOYER_PRIVATE_KEY` to the wallet that owns demo HAI in `.env.local`. Never share or commit the key.
2. Keep at least 0.005 Sepolia ETH available before the initial run. The recipe transfers 0.002 ETH to the demo taker and deposits 0.002 ETH from the maker, plus transaction gas. The taker deposits 0.001 ETH of its allocation; the remainder covers gas.
3. Run:

```sh
npm run contracts:seed
npm run docs:update
```

The script transfers 1,000 HAI to the taker, deposits 2,000 maker HAI and 800 taker HAI, and records each submitted transaction before waiting for confirmation. Public progress is saved in [deployments/11155111.seed.json](../deployments/11155111.seed.json). Reruns reuse confirmed steps rather than create more orders. If interrupted, inspect the last transaction and rerun; do not delete checkpoints. A leftover `.seed.lock` after a killed process should only be removed after confirming no seed process is still running.

A fresh demo taker key is created in ignored `.env.demo.local` with restrictive file permissions. Back it up locally if you want control of the taker's test balances. Never publish it. Import that key into a dedicated test wallet locally if you want to demonstrate the second trader in the UI. Seed data is genuine chain state and may change when someone fills or cancels an order; the recorded summary is a snapshot.

## Walk through the demo

1. Open the public site or localhost. The order book loads without a wallet. Select **Filled orders** to see seeded trades.
2. Connect your Sepolia wallet. Add the HAI contract above as a custom token (18 decimals) if needed.
3. Select **My orders** to see orders belonging to the connected wallet, including closed ones.
4. Use **Move funds** to deposit HAI or ETH. HAI requires an approval transaction, then the deposit transaction.
5. Place an order. Switch to a different wallet with deposited assets to fill it; self fills are blocked.
6. Cancel your own open order, or withdraw available deposited assets. Keep wallet ETH for gas.

All-or-nothing orders do not reserve balances. A maker withdrawing funds can leave an open but unfillable order. Filling rechecks both parties' balances; fees are paid in the asset the taker sends. The client reads the latest 100 orders every 15 seconds. Price displays are rounded; submitted amounts use bigint fixed-point arithmetic.

## Deploy contracts intentionally

For a fresh local chain, run `npm run chain` (chain 31337). For Sepolia, use a dedicated wallet funded with testnet ETH. Existing demo users should use the deployed contracts rather than redeploy.

```sh
# Set RPC_URL, DEPLOYER_PRIVATE_KEY and optional FEE_ACCOUNT in .env.local first.
npm run contracts:deploy
```

The script compiles with solc, checks the supported chain, deploys Token and Exchange, and saves transaction checkpoints in `deployments/<chainId>.json`. Rerunning resumes the saved deployment. After a new deployment, set the public chain/address settings and restart/rebuild. Old learning contracts and v1 ABIs are incompatible; there is no automatic balance/order migration. No L2 chain is currently enabled in deployment scripts.

## Website publication

`npm run build` writes `out/`. The hosted static bundle uses public deployment defaults, and contains no private keys or server RPC credentials. Updating the website never redeploys the contracts. The public Site ID is in `.openai/hosting.json`; public release metadata is recorded in `deployments/website.json`.

Publish a sanitized source checkout: current app, contracts, scripts, tests, docs, public deployment records and dependency/configuration files. Exclude `.env*` except `.env.example`, `node_modules`, old Git history, `legacy/`, and local caches. The original repository had tracked credentials; removing them from the current tree does not remove old Git history. Rotate any real credentials previously committed.

## Keep development progress current

[PROGRESS.md](PROGRESS.md) is generated from source fingerprints, the lockfile, the milestone plan and public deployment/seed records. Update [roadmap.json](roadmap.json) with honest statuses and evidence, update the architecture/readme when behavior changes, then run `npm run docs:update`. CI runs `docs:check` so source changes require a matching progress snapshot. This workflow also lives in [AGENTS.md](../AGENTS.md) for future coding sessions.

The next delivery target is a full-stack Ethereum L2 application: onboarding and browser tests, a reorg-aware event indexer, PostgreSQL, a paginated TypeScript API, then a fresh Base Sepolia deployment and a production review. Base is a proposed target, not an existing deployment. See the detailed [roadmap and completion gates](ROADMAP.md).
