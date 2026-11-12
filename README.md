# HAI Exchange

A security-conscious engineering demonstration of a HAI/ETH on-chain order book. Next.js and TypeScript provide the trading terminal; Solidity contracts hold deposits and settle full-fill limit orders on Ethereum Sepolia. **Unaudited testnet software, not a production exchange or investment product.**

[Live demo](https://hai-exchange-v1.serenecrown8.chatgpt.site) · [Project guide](docs/PROJECT_GUIDE.md) · [Engineering audit](docs/ENGINEERING_AUDIT.md) · [Capability status](docs/ENGINEERING_STATUS.md)

## What it actually does

- Read a bounded order book and confirmed-fill chart without a wallet.
- Connect a Sepolia wallet, approve/deposit HAI or deposit ETH, create/fill/cancel orders, and withdraw available deposits.
- Settle at immutable order amounts with a 0.25% taker fee in the requested asset.
- Display real seeded testnet activity. No market-price oracle, automatic matching, partial fills or reserved liquidity.

The hosted website and contracts work independently of a local server. The existing live demo is a previously published release; local engineering changes are not automatically deployed by a Git push. Public deployment evidence lives in [`deployments/`](deployments/).

## Architecture

```text
Static Next.js client → wallet-signed writes → Sepolia Exchange + HAI
                    → public RPC reads → bounded book/history → OHLCV chart
```

[Canonical Mermaid diagrams](docs/ARCHITECTURE.md) cover context, components, deposits, limit orders, fills, cancellation, withdrawals and trust boundaries. The current backend is on-chain. An indexer, PostgreSQL, TypeScript API and L2 deployment are **NOT IMPLEMENTED**.

## Engineering challenges and evidence

| Challenge | Evidence |
| --- | --- |
| Asset/fee accounting and failed settlement | Unequal-direction regressions; deterministic 40-step custody conservation trace |
| External-transfer threats | Adversarial reentrant/rejecting ETH receiver, fee/false/no-return token fixtures |
| Approval and submission races | Synchronous transaction gate; account/chain/revision recheck after approval; helper tests |
| Sparse/large historical data | UTC OHLCV tests, capped/chunked read policy, experimental event replay benchmark |
| Recovery and reproducibility | Seed checkpoint/retry/idempotency test, deterministic local EVM and isolated benchmark processes |

These are scoped test results, not exhaustive proofs. [Audit inventory](docs/ENGINEERING_AUDIT.md) distinguishes implementation, assertions and gaps.

## Security model

Wallets retain keys; contracts validate writes regardless of UI/RPC state. The deployed market admits one immutable standard HAI token. Checked arithmetic, SafeERC20 and reentrancy guards protect specific paths. Default checks and benchmarks do not read operator keys.

[STRIDE threat model](docs/SECURITY_THREAT_MODEL.md) assesses 17 threat classes. [Security status](docs/SECURITY.md) records historical credential exposure and unresolved dependency alerts. No independent audit, full reorg-safe indexing, browser wallet suite or mainnet-readiness claim exists. Slither and browser Web Vitals were unavailable in the current environment; limitations are recorded explicitly.

## Performance evidence

Deterministic local benchmarks measure transaction `gasUsed`, event replay, OHLCV, bounded read orchestration, the actual production table's Node server rendering, isolated Next.js builds and loopback static HTTP. No live Sepolia performance is claimed.

See [methodology and measured results](docs/PERFORMANCE.md) and [machine-readable JSON](benchmarks/results/). These are hardware-specific baselines, not speedup claims or CI latency targets. Browser FCP/LCP/CLS/INP remain unmeasured.

## Run locally

Use Node.js **22.13 or newer**, npm and Git:

```bash
git clone https://github.com/Ahaif/Exchange_Market.git
cd Exchange_Market
npm ci
npm run dev
```

Open **http://localhost:3000**. No private key, local fork or environment file is needed to read the default Sepolia market. Trading requires a Sepolia wallet, test ETH and operator-distributed HAI. Local/hosted UIs share chain state. Stop with **Ctrl+C**.

## Test and reproduce

```bash
npm test
npm run typecheck
npm run build
npm run security:check
npm run docs:validate
npm run docs:check
npm run benchmark          # full local suite; no public-chain transactions
npm run benchmark:smoke    # shorter CI execution check, no latency threshold
```

Individual scripts: `benchmark:contracts`, `benchmark:data`, `benchmark:frontend`, `benchmark:build`. Tests/benchmarks use synthetic local accounts, not `.env.local`. `npm run build` exports `out/`; `npm start` is not used for this static export. [Exact command results](docs/VERIFICATION.md), [operator instructions](docs/OPERATIONS.md), [chart attribution](THIRD_PARTY_NOTICES.md).

## Limits and next engineering milestones

The live view is capped at 100 orders and 50,000 historical blocks; reads are not block-pinned or reorg-safe. Orders do not reserve funds. Outgoing transfer-tax tokens are not generally supported. Wallet/browser tests, static analysis, stateful property coverage, dependency triage and independent review remain outstanding.

The [six engineering gates](docs/ENGINEERING_STATUS.md#engineering-roadmap--separate-from-historical-demo-milestones) are documentation/reproducibility → security/invariants → measured optimization → indexing/persistence → L2 testnet validation → independent review/readiness assessment. CI passing does not authorize a production release.

## HAI and Outfbox: long-term direction

Outfbox is an early-stage conditional-remittance product. HAI Exchange is currently an **independent engineering demonstration**. Integrating HAI with Outfbox is a proposed future direction, not established production functionality. No equity, company-asset redemption, reserves, profit-sharing, investment rights or appreciation guarantees are established here. No tokenomics, staking, new token supply or public trading infrastructure is introduced by this engineering work.

## Keep evidence current

Update relevant docs and `docs/roadmap.json`, then run `npm run docs:update`. CI checks the generated source snapshot, local links/diagram structure, tests, types, build and benchmark smoke. Full Mermaid rendering and browser measurements require additional tooling. Start with [PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) when returning after a break.
